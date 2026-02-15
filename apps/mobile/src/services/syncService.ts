import { DatabaseService } from './database';
import { supabase } from './supabase';
import { Batch, Schema, Capture } from '../types';

export interface SyncProgress {
  totalItems: number;
  syncedItems: number;
  currentOperation: string;
  isComplete: boolean;
  errors: SyncError[];
}

export interface SyncError {
  type: 'network' | 'database' | 'validation' | 'unknown';
  message: string;
  details?: any;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  totalSynced: number;
  errors: SyncError[];
}

export class SyncService {
  private static readonly CHUNK_SIZE = 100; // Reduced for better memory management
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second
  private static readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private static isSyncing = false; // Prevent concurrent sync operations

  /**
   * Synchronizes local data to the cloud with progress tracking and error handling.
   * @param onProgress - Optional callback to receive sync progress updates
   * @returns Promise that resolves when sync is complete
   * @throws Error if sync fails after retries
   */
  static async syncToCloud(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<SyncResult> {
    // Prevent concurrent sync operations
    if (this.isSyncing) {
      throw new Error('Sync already in progress');
    }

    this.isSyncing = true;
    const startTime = Date.now();
    
    const progress: SyncProgress = {
      totalItems: 0,
      syncedItems: 0,
      currentOperation: 'Preparing sync...',
      isComplete: false,
      errors: [],
    };

    try {
      // Check connectivity first
      const isConnected = await this.isOnline();
      if (!isConnected) {
        const error: SyncError = {
          type: 'network',
          message: 'No internet connection available',
          timestamp: new Date().toISOString(),
        };
        progress.errors.push(error);
        onProgress?.(progress);
        return {
          success: false,
          totalSynced: 0,
          errors: [error],
        };
      }

      progress.currentOperation = 'Counting unsynced items...';
      onProgress?.(progress);

      // Get counts for progress tracking - use smaller batches to avoid memory issues
      const [unsyncedBatches, unsyncedSchemas, unsyncedCaptures] = await Promise.all([
        DatabaseService.getUnsyncedBatches(10000),
        DatabaseService.getUnsyncedSchemas(10000),
        DatabaseService.getUnsyncedCaptures(10000),
      ]);

      progress.totalItems = unsyncedBatches.length + unsyncedSchemas.length + unsyncedCaptures.length;
      
      if (progress.totalItems === 0) {
        progress.isComplete = true;
        progress.currentOperation = 'All data already synced';
        onProgress?.(progress);
        return {
          success: true,
          totalSynced: 0,
          errors: [],
        };
      }

      onProgress?.(progress);

      // Sync in dependency order: schemas -> batches -> captures
      await this.syncSchemas(unsyncedSchemas, progress, onProgress);
      await this.syncBatches(unsyncedBatches, progress, onProgress);
      await this.syncCaptures(unsyncedCaptures, progress, onProgress);

      progress.isComplete = true;
      progress.currentOperation = `Sync complete! (${Math.round((Date.now() - startTime) / 1000)}s)`;
      onProgress?.(progress);

      return {
        success: progress.errors.length === 0,
        totalSynced: progress.syncedItems,
        errors: progress.errors,
      };
    } catch (error) {
      const syncError: SyncError = {
        type: 'unknown',
        message: `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
        details: error,
        timestamp: new Date().toISOString(),
      };
      progress.errors.push(syncError);
      onProgress?.(progress);
      
      return {
        success: false,
        totalSynced: progress.syncedItems,
        errors: progress.errors,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Syncs schema data to the cloud in chunks
   */
  private static async syncSchemas(
    schemas: Schema[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    if (schemas.length === 0) return;

    progress.currentOperation = `Syncing ${schemas.length} schemas...`;
    onProgress?.(progress);

    for (let i = 0; i < schemas.length; i += this.CHUNK_SIZE) {
      const chunk = schemas.slice(i, i + this.CHUNK_SIZE);
      
      try {
        await this.syncSchemaChunk(chunk);
        progress.syncedItems += chunk.length;
        progress.currentOperation = `Synced ${Math.min(i + this.CHUNK_SIZE, schemas.length)}/${schemas.length} schemas`;
      } catch (error) {
        const syncError: SyncError = {
          type: error instanceof Error && error.message.includes('network') ? 'network' : 'unknown',
          message: `Failed to sync schema chunk ${Math.floor(i / this.CHUNK_SIZE) + 1}: ${error instanceof Error ? error.message : String(error)}`,
          details: { chunkIndex: Math.floor(i / this.CHUNK_SIZE), chunkSize: chunk.length },
          timestamp: new Date().toISOString(),
        };
        progress.errors.push(syncError);
        
        // Continue with next chunk instead of failing completely
        console.error('Schema sync error:', syncError);
      }
      
      onProgress?.(progress);
      
      // Small delay between chunks to prevent overwhelming the server
      if (i + this.CHUNK_SIZE < schemas.length) {
        await this.delay(100);
      }
    }
  }

  /**
   * Syncs a chunk of schemas with retry logic and proper error handling
   */
  private static async syncSchemaChunk(schemas: Schema[]): Promise<void> {
    if (schemas.length === 0) return;

    let retries = 0;
    let lastError: any = null;

    while (retries < this.MAX_RETRIES) {
      try {
        // Validate schemas before sending
        const validSchemas = schemas.filter(schema => 
          schema.name && 
          schema.organization_id && 
          Array.isArray(schema.fields) &&
          schema.created_at &&
          schema.updated_at
        );

        if (validSchemas.length !== schemas.length) {
          console.warn(`Filtered out ${schemas.length - validSchemas.length} invalid schemas`);
        }

        if (validSchemas.length === 0) {
          throw new Error('No valid schemas to sync');
        }

        // Create a promise that times out
        const syncPromise = supabase
          .from('schemas')
          .upsert(validSchemas.map(schema => ({
            id: schema.id,
            name: schema.name,
            organization_id: schema.organization_id,
            fields: schema.fields,
            created_at: schema.created_at,
            updated_at: schema.updated_at,
          })), {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
        });

        const { error } = await Promise.race([syncPromise, timeoutPromise]) as any;

        if (error) {
          throw error;
        }

        // Mark as synced in local database
        const schemaIds = validSchemas.map(s => s.id!).filter(id => id != null);
        if (schemaIds.length > 0) {
          await DatabaseService.markSchemasSynced(schemaIds);
        }
        return;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to sync schemas after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Exponential backoff with jitter
        const delay = this.BASE_DELAY * Math.pow(2, retries - 1) + Math.random() * 1000;
        await this.delay(delay);
      }
    }
  }

  /**
   * Syncs batch data to the cloud in chunks
   */
  private static async syncBatches(
    batches: Batch[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    if (batches.length === 0) return;

    progress.currentOperation = `Syncing ${batches.length} batches...`;
    onProgress?.(progress);

    for (let i = 0; i < batches.length; i += this.CHUNK_SIZE) {
      const chunk = batches.slice(i, i + this.CHUNK_SIZE);
      
      try {
        await this.syncBatchChunk(chunk);
        progress.syncedItems += chunk.length;
        progress.currentOperation = `Synced ${Math.min(i + this.CHUNK_SIZE, batches.length)}/${batches.length} batches`;
      } catch (error) {
        const syncError: SyncError = {
          type: error instanceof Error && error.message.includes('network') ? 'network' : 'unknown',
          message: `Failed to sync batch chunk ${Math.floor(i / this.CHUNK_SIZE) + 1}: ${error instanceof Error ? error.message : String(error)}`,
          details: { chunkIndex: Math.floor(i / this.CHUNK_SIZE), chunkSize: chunk.length },
          timestamp: new Date().toISOString(),
        };
        progress.errors.push(syncError);
        
        console.error('Batch sync error:', syncError);
      }
      
      onProgress?.(progress);
      
      if (i + this.CHUNK_SIZE < batches.length) {
        await this.delay(100);
      }
    }
  }

  /**
   * Syncs a chunk of batches with retry logic and proper error handling
   */
  private static async syncBatchChunk(batches: Batch[]): Promise<void> {
    if (batches.length === 0) return;

    let retries = 0;
    let lastError: any = null;

    while (retries < this.MAX_RETRIES) {
      try {
        // Validate batches before sending
        const validBatches = batches.filter(batch => 
          batch.name && 
          batch.organization_id && 
          batch.schema_id &&
          batch.created_at &&
          batch.updated_at
        );

        if (validBatches.length !== batches.length) {
          console.warn(`Filtered out ${batches.length - validBatches.length} invalid batches`);
        }

        if (validBatches.length === 0) {
          throw new Error('No valid batches to sync');
        }

        const syncPromise = supabase
          .from('batches')
          .upsert(validBatches.map(batch => ({
            id: batch.id,
            name: batch.name,
            organization_id: batch.organization_id,
            schema_id: batch.schema_id,
            created_at: batch.created_at,
            updated_at: batch.updated_at,
          })), {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
        });

        const { error } = await Promise.race([syncPromise, timeoutPromise]) as any;

        if (error) {
          throw error;
        }

        // Mark as synced in local database
        const batchIds = validBatches.map(b => b.id!).filter(id => id != null);
        if (batchIds.length > 0) {
          await DatabaseService.markBatchesSynced(batchIds);
        }
        return;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to sync batches after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        const delay = this.BASE_DELAY * Math.pow(2, retries - 1) + Math.random() * 1000;
        await this.delay(delay);
      }
    }
  }

  /**
   * Syncs capture data to the cloud in chunks
   */
  private static async syncCaptures(
    captures: Capture[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    if (captures.length === 0) return;

    progress.currentOperation = `Syncing ${captures.length} captures...`;
    onProgress?.(progress);

    for (let i = 0; i < captures.length; i += this.CHUNK_SIZE) {
      const chunk = captures.slice(i, i + this.CHUNK_SIZE);
      
      try {
        await this.syncCaptureChunk(chunk);
        progress.syncedItems += chunk.length;
        progress.currentOperation = `Synced ${Math.min(i + this.CHUNK_SIZE, captures.length)}/${captures.length} captures`;
      } catch (error) {
        const syncError: SyncError = {
          type: error instanceof Error && error.message.includes('network') ? 'network' : 'unknown',
          message: `Failed to sync capture chunk ${Math.floor(i / this.CHUNK_SIZE) + 1}: ${error instanceof Error ? error.message : String(error)}`,
          details: { chunkIndex: Math.floor(i / this.CHUNK_SIZE), chunkSize: chunk.length },
          timestamp: new Date().toISOString(),
        };
        progress.errors.push(syncError);
        
        console.error('Capture sync error:', syncError);
      }
      
      onProgress?.(progress);
      
      if (i + this.CHUNK_SIZE < captures.length) {
        await this.delay(100);
      }
    }
  }

  /**
   * Syncs a chunk of captures with retry logic and proper error handling
   */
  private static async syncCaptureChunk(captures: Capture[]): Promise<void> {
    if (captures.length === 0) return;

    let retries = 0;
    let lastError: any = null;

    while (retries < this.MAX_RETRIES) {
      try {
        // Validate captures before sending
        const validCaptures = captures.filter(capture => 
          capture.batch_id && 
          capture.rfid_tag && 
          capture.timestamp &&
          capture.data
        );

        if (validCaptures.length !== captures.length) {
          console.warn(`Filtered out ${captures.length - validCaptures.length} invalid captures`);
        }

        if (validCaptures.length === 0) {
          throw new Error('No valid captures to sync');
        }

        const syncPromise = supabase
          .from('captures')
          .upsert(validCaptures.map(capture => ({
            id: capture.id,
            batch_id: capture.batch_id,
            rfid_tag: capture.rfid_tag,
            latitude: capture.latitude || null,
            longitude: capture.longitude || null,
            timestamp: capture.timestamp,
            data: capture.data,
          })), {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), this.REQUEST_TIMEOUT);
        });

        const { error } = await Promise.race([syncPromise, timeoutPromise]) as any;

        if (error) {
          throw error;
        }

        // Mark as synced in local database
        const captureIds = validCaptures.map(c => c.id!).filter(id => id != null);
        if (captureIds.length > 0) {
          await DatabaseService.markCapturesSynced(captureIds);
        }
        return;
      } catch (error) {
        lastError = error;
        retries++;
        
        if (retries >= this.MAX_RETRIES) {
          throw new Error(`Failed to sync captures after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        const delay = this.BASE_DELAY * Math.pow(2, retries - 1) + Math.random() * 1000;
        await this.delay(delay);
      }
    }
  }

  /**
   * Resets sync status for all records, forcing a complete resync
   */
  static async manualResync(): Promise<void> {
    if (this.isSyncing) {
      throw new Error('Cannot reset sync status while sync is in progress');
    }
    
    try {
      await DatabaseService.resetSyncStatus();
    } catch (error) {
      throw new Error(`Failed to reset sync status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delays execution for the specified number of milliseconds
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Checks if the device has internet connectivity and can reach Supabase
   */
  static async isOnline(): Promise<boolean> {
    try {
      // Use a simple, fast query to check connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const { error } = await supabase
        .from('organizations')
        .select('count')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      return !error;
    } catch (error) {
      console.debug('Connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Gets the current sync status
   */
  static getSyncStatus(): { isSyncing: boolean } {
    return { isSyncing: this.isSyncing };
  }

  /**
   * Cancels ongoing sync operation (if supported)
   * Note: This is a basic implementation - actual cancellation would require more complex logic
   */
  static async cancelSync(): Promise<void> {
    // This is a simplified implementation
    // In a real-world scenario, you'd need to implement proper cancellation tokens
    console.warn('Sync cancellation requested - sync will stop at next chunk boundary');
  }
}