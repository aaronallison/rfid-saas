import { DatabaseService } from './database';
import { supabase } from './supabase';
import { Batch, Schema, Capture } from '../types';

export interface SyncProgress {
  totalItems: number;
  syncedItems: number;
  currentOperation: string;
  isComplete: boolean;
  errors: string[];
}

export class SyncService {
  private static readonly CHUNK_SIZE = 200;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY = 1000; // 1 second

  static async syncToCloud(
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    const progress: SyncProgress = {
      totalItems: 0,
      syncedItems: 0,
      currentOperation: 'Preparing sync...',
      isComplete: false,
      errors: [],
    };

    try {
      // Get counts for progress tracking
      const [unsyncedBatches, unsyncedSchemas, unsyncedCaptures] = await Promise.all([
        DatabaseService.getUnsyncedBatches(10000), // Get all for counting
        DatabaseService.getUnsyncedSchemas(10000),
        DatabaseService.getUnsyncedCaptures(10000),
      ]);

      progress.totalItems = unsyncedBatches.length + unsyncedSchemas.length + unsyncedCaptures.length;
      onProgress?.(progress);

      // Sync schemas first (as batches depend on them)
      await this.syncSchemas(unsyncedSchemas, progress, onProgress);

      // Then sync batches
      await this.syncBatches(unsyncedBatches, progress, onProgress);

      // Finally sync captures
      await this.syncCaptures(unsyncedCaptures, progress, onProgress);

      progress.isComplete = true;
      progress.currentOperation = 'Sync complete!';
      onProgress?.(progress);
    } catch (error) {
      progress.errors.push(`Sync failed: ${error}`);
      onProgress?.(progress);
      throw error;
    }
  }

  private static async syncSchemas(
    schemas: Schema[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    progress.currentOperation = 'Syncing schemas...';
    onProgress?.(progress);

    for (let i = 0; i < schemas.length; i += this.CHUNK_SIZE) {
      const chunk = schemas.slice(i, i + this.CHUNK_SIZE);
      await this.syncSchemaChunk(chunk);
      progress.syncedItems += chunk.length;
      onProgress?.(progress);
    }
  }

  private static async syncSchemaChunk(schemas: Schema[]): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const { error } = await supabase
          .from('schemas')
          .upsert(schemas.map(schema => ({
            id: schema.id,
            name: schema.name,
            organization_id: schema.organization_id,
            fields: schema.fields,
            created_at: schema.created_at,
            updated_at: schema.updated_at,
          })));

        if (error) throw error;

        // Mark as synced in local database
        const schemaIds = schemas.map(s => s.id!).filter(id => id);
        if (schemaIds.length > 0) {
          await DatabaseService.markSchemasSynced(schemaIds);
        }
        return;
      } catch (error) {
        retries++;
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        await this.delay(this.BASE_DELAY * Math.pow(2, retries - 1));
      }
    }
  }

  private static async syncBatches(
    batches: Batch[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    progress.currentOperation = 'Syncing batches...';
    onProgress?.(progress);

    for (let i = 0; i < batches.length; i += this.CHUNK_SIZE) {
      const chunk = batches.slice(i, i + this.CHUNK_SIZE);
      await this.syncBatchChunk(chunk);
      progress.syncedItems += chunk.length;
      onProgress?.(progress);
    }
  }

  private static async syncBatchChunk(batches: Batch[]): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const { error } = await supabase
          .from('batches')
          .upsert(batches.map(batch => ({
            id: batch.id,
            name: batch.name,
            organization_id: batch.organization_id,
            schema_id: batch.schema_id,
            created_at: batch.created_at,
            updated_at: batch.updated_at,
          })));

        if (error) throw error;

        // Mark as synced in local database
        const batchIds = batches.map(b => b.id!).filter(id => id);
        if (batchIds.length > 0) {
          await DatabaseService.markBatchesSynced(batchIds);
        }
        return;
      } catch (error) {
        retries++;
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        await this.delay(this.BASE_DELAY * Math.pow(2, retries - 1));
      }
    }
  }

  private static async syncCaptures(
    captures: Capture[],
    progress: SyncProgress,
    onProgress?: (progress: SyncProgress) => void
  ): Promise<void> {
    progress.currentOperation = 'Syncing captures...';
    onProgress?.(progress);

    for (let i = 0; i < captures.length; i += this.CHUNK_SIZE) {
      const chunk = captures.slice(i, i + this.CHUNK_SIZE);
      await this.syncCaptureChunk(chunk);
      progress.syncedItems += chunk.length;
      onProgress?.(progress);
    }
  }

  private static async syncCaptureChunk(captures: Capture[]): Promise<void> {
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const { error } = await supabase
          .from('captures')
          .upsert(captures.map(capture => ({
            id: capture.id,
            batch_id: capture.batch_id,
            rfid_tag: capture.rfid_tag,
            field_data: capture.data, // Mobile 'data' maps to cloud 'field_data'
            latitude: capture.latitude,
            longitude: capture.longitude,
            captured_at: capture.timestamp, // Mobile 'timestamp' maps to cloud 'captured_at'
            source_device_id: null, // Could be derived from device info if available
          })));

        if (error) throw error;

        // Mark as synced in local database
        const captureIds = captures.map(c => c.id!).filter(id => id);
        if (captureIds.length > 0) {
          await DatabaseService.markCapturesSynced(captureIds);
        }
        return;
      } catch (error) {
        retries++;
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        await this.delay(this.BASE_DELAY * Math.pow(2, retries - 1));
      }
    }
  }

  static async manualResync(): Promise<void> {
    await DatabaseService.resetSyncStatus();
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async isOnline(): Promise<boolean> {
    try {
      const { data } = await supabase.from('organizations').select('count').limit(1);
      return true;
    } catch {
      return false;
    }
  }
}