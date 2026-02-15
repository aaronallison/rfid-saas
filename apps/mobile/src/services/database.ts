import * as SQLite from 'expo-sqlite';
import { Batch, Schema, Capture } from '../types';

const db = SQLite.openDatabase('rfid_capture.db');

export class DatabaseService {
  static async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Create batches table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            schema_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
          );
        `);

        // Create schema table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS schemas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            organization_id TEXT NOT NULL,
            fields TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
          );
        `);

        // Create captures table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS captures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL,
            rfid_tag TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            timestamp TEXT NOT NULL,
            data TEXT NOT NULL,
            synced INTEGER DEFAULT 0,
            FOREIGN KEY (batch_id) REFERENCES batches (id)
          );
        `);

        // Create indexes for better performance
        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_batches_org ON batches(organization_id);
        `);
        
        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_captures_batch ON captures(batch_id);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_captures_synced ON captures(synced);
        `);
      }, reject, resolve);
    });
  }

  // Batch operations
  static async createBatch(batch: Omit<Batch, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO batches (name, organization_id, schema_id, created_at, updated_at, synced) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            batch.name,
            batch.organization_id,
            batch.schema_id,
            batch.created_at,
            batch.updated_at,
            batch.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getBatches(organizationId: string): Promise<Batch[]> {
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
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedBatches(limit: number = 200): Promise<Batch[]> {
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
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Schema operations
  static async createSchema(schema: Omit<Schema, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO schemas (name, organization_id, fields, created_at, updated_at, synced) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            schema.name,
            schema.organization_id,
            JSON.stringify(schema.fields),
            schema.created_at,
            schema.updated_at,
            schema.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getSchemas(organizationId: string): Promise<Schema[]> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM schemas WHERE organization_id = ? ORDER BY created_at DESC',
          [organizationId],
          (_, result) => {
            const schemas: Schema[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              schemas.push({
                ...row,
                fields: JSON.parse(row.fields),
                synced: row.synced === 1,
              });
            }
            resolve(schemas);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getSchemaById(id: number): Promise<Schema | null> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM schemas WHERE id = ?',
          [id],
          (_, result) => {
            if (result.rows.length === 0) {
              resolve(null);
              return;
            }
            const row = result.rows.item(0);
            resolve({
              ...row,
              fields: JSON.parse(row.fields),
              synced: row.synced === 1,
            });
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedSchemas(limit: number = 200): Promise<Schema[]> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM schemas WHERE synced = 0 LIMIT ?',
          [limit],
          (_, result) => {
            const schemas: Schema[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              schemas.push({
                ...row,
                fields: JSON.parse(row.fields),
                synced: false,
              });
            }
            resolve(schemas);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Capture operations
  static async createCapture(capture: Omit<Capture, 'id'>): Promise<number> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO captures (batch_id, rfid_tag, latitude, longitude, timestamp, data, synced) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            capture.batch_id,
            capture.rfid_tag,
            capture.latitude || null,
            capture.longitude || null,
            capture.timestamp,
            JSON.stringify(capture.data),
            capture.synced ? 1 : 0,
          ],
          (_, result) => resolve(result.insertId!),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getCapturesByBatch(batchId: number): Promise<Capture[]> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM captures WHERE batch_id = ? ORDER BY timestamp DESC',
          [batchId],
          (_, result) => {
            const captures: Capture[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              captures.push({
                ...row,
                data: JSON.parse(row.data),
                synced: row.synced === 1,
              });
            }
            resolve(captures);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async getUnsyncedCaptures(limit: number = 200): Promise<Capture[]> {
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
                data: JSON.parse(row.data),
                synced: false,
              });
            }
            resolve(captures);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // Mark records as synced
  static async markBatchesSynced(batchIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = batchIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE batches SET synced = 1 WHERE id IN (${placeholders})`,
          batchIds,
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async markSchemasSynced(schemaIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = schemaIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE schemas SET synced = 1 WHERE id IN (${placeholders})`,
          schemaIds,
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  static async markCapturesSynced(captureIds: number[]): Promise<void> {
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        const placeholders = captureIds.map(() => '?').join(',');
        tx.executeSql(
          `UPDATE captures SET synced = 1 WHERE id IN (${placeholders})`,
          captureIds,
          () => resolve(),
          (_, error) => {
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
      db.transaction(tx => {
        tx.executeSql('UPDATE batches SET synced = 0');
        tx.executeSql('UPDATE schemas SET synced = 0');
        tx.executeSql('UPDATE captures SET synced = 0');
      }, reject, resolve);
    });
  }
}