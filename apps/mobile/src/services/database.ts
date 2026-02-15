import * as SQLite from 'expo-sqlite';
import { Batch, Schema, Capture } from '../types';

// Database instance with proper error handling
let db: SQLite.SQLiteDatabase;

try {
  db = SQLite.openDatabase('rfid_capture.db');
} catch (error) {
  console.error('Failed to open SQLite database:', error);
  throw new Error('Database initialization failed');
}

export class DatabaseService {
  private static readonly DB_VERSION = 1;

  static async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          // Create batches table - aligned with cloud schema
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS batches (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              batch_id TEXT UNIQUE,
              name TEXT NOT NULL,
              organization_id TEXT NOT NULL,
              created_by TEXT,
              status TEXT CHECK (status IN ('open', 'synced', 'closed')) DEFAULT 'open',
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              synced INTEGER DEFAULT 0
            );
          `);

          // Create batch_schema table - aligned with cloud schema  
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS batch_schemas (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              schema_id TEXT UNIQUE,
              batch_id TEXT NOT NULL,
              organization_id TEXT NOT NULL,
              col_1_name TEXT,
              col_2_name TEXT,
              col_3_name TEXT,
              col_4_name TEXT,
              col_5_name TEXT,
              col_6_name TEXT,
              col_7_name TEXT,
              col_8_name TEXT,
              col_9_name TEXT,
              col_10_name TEXT,
              col_11_name TEXT,
              col_12_name TEXT,
              col_13_name TEXT,
              col_14_name TEXT,
              col_15_name TEXT,
              col_16_name TEXT,
              col_17_name TEXT,
              col_18_name TEXT,
              col_19_name TEXT,
              col_20_name TEXT,
              col_21_name TEXT,
              col_22_name TEXT,
              col_23_name TEXT,
              col_24_name TEXT,
              col_25_name TEXT,
              created_at TEXT NOT NULL,
              synced INTEGER DEFAULT 0,
              FOREIGN KEY (batch_id) REFERENCES batches (batch_id)
            );
          `);

          // Create captures table - aligned with captures_universal schema
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS captures (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              cntid INTEGER,
              organization_id TEXT NOT NULL,
              batch_id TEXT,
              type TEXT DEFAULT 'data',
              f1 TEXT, f2 TEXT, f3 TEXT, f4 TEXT, f5 TEXT,
              f6 TEXT, f7 TEXT, f8 TEXT, f9 TEXT, f10 TEXT,
              f11 TEXT, f12 TEXT, f13 TEXT, f14 TEXT, f15 TEXT,
              f16 TEXT, f17 TEXT, f18 TEXT, f19 TEXT, f20 TEXT,
              f21 TEXT, f22 TEXT, f23 TEXT, f24 TEXT, f25 TEXT,
              rfid_tag TEXT,
              lat REAL,
              lng REAL,
              accuracy_m REAL,
              captured_at TEXT NOT NULL,
              source_device_id TEXT,
              synced_at TEXT,
              synced INTEGER DEFAULT 0,
              FOREIGN KEY (batch_id) REFERENCES batches (batch_id)
            );
          `);

          // Create indexes for better performance
          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_batches_org ON batches(organization_id);
          `);
          
          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_batches_synced ON batches(synced);
          `);
          
          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_schemas_batch ON batch_schemas(batch_id);
          `);
          
          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_schemas_synced ON batch_schemas(synced);
          `);
          
          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_captures_batch ON captures(batch_id);
          `);

          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_captures_synced ON captures(synced);
          `);

          tx.executeSql(`
            CREATE INDEX IF NOT EXISTS idx_captures_rfid ON captures(rfid_tag);
          `);

          // Create a version table for future migrations
          tx.executeSql(`
            CREATE TABLE IF NOT EXISTS db_version (
              version INTEGER PRIMARY KEY
            );
          `);

          tx.executeSql(`
            INSERT OR IGNORE INTO db_version (version) VALUES (?);
          `, [this.DB_VERSION]);
        },
        error => {
          console.error('Database initialization failed:', error);
          reject(error);
        },
        () => {
          console.log('Database initialized successfully');
          resolve();
        }
      );
    });
  }

  // Batch operations
  static async createBatch(batch: Omit<Batch, 'id'>): Promise<number> {
    if (!batch.name?.trim()) {
      throw new Error('Batch name is required');
    }
    if (!batch.organization_id?.trim()) {
      throw new Error('Organization ID is required');
    }

    return new Promise((resolve, reject) => {
      const batchId = batch.batch_id || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO batches (batch_id, name, organization_id, created_by, status, created_at, updated_at, synced) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            batchId,
            batch.name.trim(),
            batch.organization_id,
            batch.created_by || null,
            batch.status || 'open',
            batch.created_at,
            batch.updated_at,
            batch.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            console.error('Failed to create batch:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getBatches(organizationId: string): Promise<Batch[]> {
    if (!organizationId?.trim()) {
      throw new Error('Organization ID is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batches WHERE organization_id = ? ORDER BY created_at DESC',
          [organizationId],
          (_, result) => {
            const batches: Batch[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              batches.push({
                ...row,
                synced: row.synced === 1,
              });
            }
            resolve(batches);
          },
          (_, error) => {
            console.error('Failed to get batches:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedBatches(limit: number = 200): Promise<Batch[]> {
    if (limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batches WHERE synced = 0 LIMIT ?',
          [limit],
          (_, result) => {
            const batches: Batch[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              batches.push({
                ...row,
                synced: false,
              });
            }
            resolve(batches);
          },
          (_, error) => {
            console.error('Failed to get unsynced batches:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Schema operations
  static async createSchema(schema: Omit<Schema, 'id'>): Promise<number> {
    if (!schema.batch_id?.trim()) {
      throw new Error('Batch ID is required');
    }
    if (!schema.organization_id?.trim()) {
      throw new Error('Organization ID is required');
    }

    return new Promise((resolve, reject) => {
      const schemaId = schema.schema_id || `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO batch_schemas (schema_id, batch_id, organization_id, 
           col_1_name, col_2_name, col_3_name, col_4_name, col_5_name,
           col_6_name, col_7_name, col_8_name, col_9_name, col_10_name,
           col_11_name, col_12_name, col_13_name, col_14_name, col_15_name,
           col_16_name, col_17_name, col_18_name, col_19_name, col_20_name,
           col_21_name, col_22_name, col_23_name, col_24_name, col_25_name,
           created_at, synced) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            schemaId,
            schema.batch_id,
            schema.organization_id,
            schema.col_1_name, schema.col_2_name, schema.col_3_name, schema.col_4_name, schema.col_5_name,
            schema.col_6_name, schema.col_7_name, schema.col_8_name, schema.col_9_name, schema.col_10_name,
            schema.col_11_name, schema.col_12_name, schema.col_13_name, schema.col_14_name, schema.col_15_name,
            schema.col_16_name, schema.col_17_name, schema.col_18_name, schema.col_19_name, schema.col_20_name,
            schema.col_21_name, schema.col_22_name, schema.col_23_name, schema.col_24_name, schema.col_25_name,
            schema.created_at,
            schema.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            console.error('Failed to create schema:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getSchemas(organizationId: string): Promise<Schema[]> {
    if (!organizationId?.trim()) {
      throw new Error('Organization ID is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batch_schemas WHERE organization_id = ? ORDER BY created_at DESC',
          [organizationId],
          (_, result) => {
            const schemas: Schema[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              schemas.push({
                ...row,
                synced: row.synced === 1,
              });
            }
            resolve(schemas);
          },
          (_, error) => {
            console.error('Failed to get schemas:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getSchemaById(id: number): Promise<Schema | null> {
    if (!id || id <= 0) {
      throw new Error('Valid schema ID is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batch_schemas WHERE id = ?',
          [id],
          (_, result) => {
            if (result.rows.length === 0) {
              resolve(null);
              return;
            }
            const row = result.rows.item(0);
            resolve({
              ...row,
              synced: row.synced === 1,
            });
          },
          (_, error) => {
            console.error('Failed to get schema by ID:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getSchemaByBatchId(batchId: string): Promise<Schema | null> {
    if (!batchId?.trim()) {
      throw new Error('Batch ID is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batch_schemas WHERE batch_id = ?',
          [batchId],
          (_, result) => {
            if (result.rows.length === 0) {
              resolve(null);
              return;
            }
            const row = result.rows.item(0);
            resolve({
              ...row,
              synced: row.synced === 1,
            });
          },
          (_, error) => {
            console.error('Failed to get schema by batch ID:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedSchemas(limit: number = 200): Promise<Schema[]> {
    if (limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM batch_schemas WHERE synced = 0 LIMIT ?',
          [limit],
          (_, result) => {
            const schemas: Schema[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              schemas.push({
                ...row,
                synced: false,
              });
            }
            resolve(schemas);
          },
          (_, error) => {
            console.error('Failed to get unsynced schemas:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Capture operations
  static async createCapture(capture: Omit<Capture, 'id'>): Promise<number> {
    if (!capture.organization_id?.trim()) {
      throw new Error('Organization ID is required');
    }
    if (!capture.batch_id?.trim()) {
      throw new Error('Batch ID is required');
    }
    if (!capture.captured_at?.trim()) {
      throw new Error('Captured timestamp is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO captures (
            organization_id, batch_id, type,
            f1, f2, f3, f4, f5, f6, f7, f8, f9, f10,
            f11, f12, f13, f14, f15, f16, f17, f18, f19, f20,
            f21, f22, f23, f24, f25,
            rfid_tag, lat, lng, accuracy_m, captured_at, source_device_id, synced
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            capture.organization_id,
            capture.batch_id,
            capture.type || 'data',
            capture.f1, capture.f2, capture.f3, capture.f4, capture.f5,
            capture.f6, capture.f7, capture.f8, capture.f9, capture.f10,
            capture.f11, capture.f12, capture.f13, capture.f14, capture.f15,
            capture.f16, capture.f17, capture.f18, capture.f19, capture.f20,
            capture.f21, capture.f22, capture.f23, capture.f24, capture.f25,
            capture.rfid_tag || null,
            capture.lat || null,
            capture.lng || null,
            capture.accuracy_m || null,
            capture.captured_at,
            capture.source_device_id || null,
            capture.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            console.error('Failed to create capture:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getCapturesByBatch(batchId: string): Promise<Capture[]> {
    if (!batchId?.trim()) {
      throw new Error('Batch ID is required');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM captures WHERE batch_id = ? ORDER BY captured_at DESC',
          [batchId],
          (_, result) => {
            const captures: Capture[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              captures.push({
                ...row,
                synced: row.synced === 1,
              });
            }
            resolve(captures);
          },
          (_, error) => {
            console.error('Failed to get captures by batch:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedCaptures(limit: number = 200): Promise<Capture[]> {
    if (limit <= 0) {
      throw new Error('Limit must be a positive number');
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM captures WHERE synced = 0 LIMIT ?',
          [limit],
          (_, result) => {
            const captures: Capture[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              captures.push({
                ...row,
                synced: false,
              });
            }
            resolve(captures);
          },
          (_, error) => {
            console.error('Failed to get unsynced captures:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Mark records as synced
  static async markBatchesSynced(batchIds: number[]): Promise<void> {
    if (!batchIds?.length) {
      return; // Nothing to update
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = batchIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE batches SET synced = 1, updated_at = datetime('now') WHERE id IN (${placeholders})`,
          batchIds,
          () => resolve(),
          (_, error) => {
            console.error('Failed to mark batches as synced:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async markSchemasSynced(schemaIds: number[]): Promise<void> {
    if (!schemaIds?.length) {
      return; // Nothing to update
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = schemaIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE batch_schemas SET synced = 1 WHERE id IN (${placeholders})`,
          schemaIds,
          () => resolve(),
          (_, error) => {
            console.error('Failed to mark schemas as synced:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async markCapturesSynced(captureIds: number[]): Promise<void> {
    if (!captureIds?.length) {
      return; // Nothing to update
    }

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = captureIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE captures SET synced = 1, synced_at = datetime('now') WHERE id IN (${placeholders})`,
          captureIds,
          () => resolve(),
          (_, error) => {
            console.error('Failed to mark captures as synced:', error);
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Reset sync status (for manual resync)
  static async resetSyncStatus(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          tx.executeSql('UPDATE batches SET synced = 0, updated_at = datetime(\'now\')');
          tx.executeSql('UPDATE batch_schemas SET synced = 0');
          tx.executeSql('UPDATE captures SET synced = 0, synced_at = NULL');
        },
        error => {
          console.error('Failed to reset sync status:', error);
          reject(error);
        },
        () => {
          console.log('Sync status reset successfully');
          resolve();
        }
      );
    });
  }

  // Utility methods for database maintenance
  static async getDatabaseStats(): Promise<{
    totalBatches: number;
    unsyncedBatches: number;
    totalSchemas: number;
    unsyncedSchemas: number;
    totalCaptures: number;
    unsyncedCaptures: number;
  }> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const stats = {
          totalBatches: 0,
          unsyncedBatches: 0,
          totalSchemas: 0,
          unsyncedSchemas: 0,
          totalCaptures: 0,
          unsyncedCaptures: 0,
        };

        let completedQueries = 0;
        const totalQueries = 6;

        const checkComplete = () => {
          completedQueries++;
          if (completedQueries === totalQueries) {
            resolve(stats);
          }
        };

        tx.executeSql('SELECT COUNT(*) as count FROM batches', [], (_, result) => {
          stats.totalBatches = result.rows.item(0).count;
          checkComplete();
        });

        tx.executeSql('SELECT COUNT(*) as count FROM batches WHERE synced = 0', [], (_, result) => {
          stats.unsyncedBatches = result.rows.item(0).count;
          checkComplete();
        });

        tx.executeSql('SELECT COUNT(*) as count FROM batch_schemas', [], (_, result) => {
          stats.totalSchemas = result.rows.item(0).count;
          checkComplete();
        });

        tx.executeSql('SELECT COUNT(*) as count FROM batch_schemas WHERE synced = 0', [], (_, result) => {
          stats.unsyncedSchemas = result.rows.item(0).count;
          checkComplete();
        });

        tx.executeSql('SELECT COUNT(*) as count FROM captures', [], (_, result) => {
          stats.totalCaptures = result.rows.item(0).count;
          checkComplete();
        });

        tx.executeSql('SELECT COUNT(*) as count FROM captures WHERE synced = 0', [], (_, result) => {
          stats.unsyncedCaptures = result.rows.item(0).count;
          checkComplete();
        });
      }, reject);
    });
  }

  // Clean up old synced data (optional, for storage management)
  static async cleanupSyncedData(olderThanDays: number = 30): Promise<void> {
    if (olderThanDays <= 0) {
      throw new Error('Days must be a positive number');
    }

    return new Promise((resolve, reject) => {
      db.transaction(
        tx => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
          const cutoffIso = cutoffDate.toISOString();

          // Only delete synced records older than the cutoff
          tx.executeSql(
            'DELETE FROM captures WHERE synced = 1 AND synced_at IS NOT NULL AND synced_at < ?',
            [cutoffIso]
          );

          // Note: We typically don't delete batches and schemas as they're needed for reference
          console.log(`Cleaned up synced captures older than ${olderThanDays} days`);
        },
        error => {
          console.error('Failed to cleanup synced data:', error);
          reject(error);
        },
        () => resolve()
      );
    });
  }
}