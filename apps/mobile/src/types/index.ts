/**
 * Represents a batch of RFID captures
 * Local SQLite storage with Supabase synchronization support
 */
export interface Batch {
  /** Local SQLite auto-increment ID */
  id?: number;
  /** Supabase UUID - used for cloud synchronization */
  batch_id?: string;
  /** Human-readable batch name */
  name: string;
  /** Organization ID this batch belongs to (maps to org_id in Supabase) */
  organization_id: string;
  /** Reference to the schema used for this batch */
  schema_id: number;
  /** User ID who created the batch */
  created_by?: string;
  /** Batch status for workflow management */
  status?: 'open' | 'synced' | 'closed';
  /** ISO 8601 timestamp when batch was created */
  created_at: string;
  /** ISO 8601 timestamp when batch was last updated */
  updated_at: string;
  /** Whether this batch has been synced to cloud */
  synced: boolean;
}

/**
 * Represents a data schema that defines the structure of capture data
 * Supports both flexible field definitions and fixed column mapping for Supabase
 */
export interface Schema {
  /** Local SQLite auto-increment ID */
  id?: number;
  /** Supabase UUID - used for cloud synchronization */
  schema_id?: string;
  /** Associated batch ID for Supabase batch_schema table */
  batch_id?: string;
  /** Human-readable schema name */
  name: string;
  /** Organization ID this schema belongs to (maps to org_id in Supabase) */
  organization_id: string;
  /** Array of field definitions for flexible schema */
  fields: SchemaField[];
  /** Array of 25 column names for Supabase fixed column compatibility */
  column_names?: string[];
  /** ISO 8601 timestamp when schema was created */
  created_at: string;
  /** ISO 8601 timestamp when schema was last updated */
  updated_at?: string;
  /** Whether this schema has been synced to cloud */
  synced: boolean;
}

/**
 * Represents a single field in a schema definition
 */
export interface SchemaField {
  /** Internal field name (snake_case recommended) */
  name: string;
  /** Data type for validation and input rendering */
  type: 'text' | 'number' | 'boolean' | 'date';
  /** Whether this field is required for data entry */
  required: boolean;
  /** Human-readable field label for UI display */
  label: string;
  /** Field order for display and processing (0-based) */
  order?: number;
  /** Validation rules for the field */
  validation?: {
    /** Minimum string length */
    minLength?: number;
    /** Maximum string length */
    maxLength?: number;
    /** Minimum numeric value */
    min?: number;
    /** Maximum numeric value */
    max?: number;
    /** RegExp pattern string for validation */
    pattern?: string;
  };
}

/**
 * Represents a single RFID tag capture with associated data
 * Supports both flexible data structure and fixed field mapping for Supabase
 */
export interface Capture {
  /** Local SQLite auto-increment ID (maps to cntid in Supabase) */
  id?: number;
  /** Batch ID - can be local number or Supabase UUID */
  batch_id: number | string;
  /** RFID tag identifier (EPC) */
  rfid_tag: string;
  /** GPS latitude coordinate (maps to lat in Supabase) */
  latitude?: number;
  /** GPS longitude coordinate (maps to lng in Supabase) */
  longitude?: number;
  /** GPS accuracy in meters */
  accuracy_m?: number;
  /** ISO 8601 timestamp when captured (maps to captured_at in Supabase) */
  timestamp: string;
  /** Flexible key-value data structure for local storage */
  data: Record<string, any>;
  /** Array of 25 string values for Supabase fixed fields (f1-f25) */
  fixed_fields?: string[];
  /** Capture type for categorization (default: 'data') */
  type?: string;
  /** Device identifier for tracking capture source */
  source_device_id?: string;
  /** Whether this capture has been synced to cloud */
  synced: boolean;
  /** ISO 8601 timestamp when synced to cloud */
  synced_at?: string;
}

/**
 * Represents an organization that users belong to
 */
export interface Organization {
  /** Organization UUID */
  id: string;
  /** Organization display name */
  name: string;
  /** ISO 8601 timestamp when organization was created */
  created_at: string;
}

/**
 * Represents a user in the system
 */
export interface User {
  /** User UUID from authentication system */
  id: string;
  /** User's email address */
  email: string;
  /** Organizations this user has access to */
  organizations: Organization[];
  /** ISO 8601 timestamp when user account was created */
  created_at?: string;
  /** ISO 8601 timestamp of last sign in */
  last_sign_in_at?: string;
}

// =============================================================================
// SYNC AND STATUS TYPES
// =============================================================================

/**
 * Represents the current synchronization status
 */
export interface SyncStatus {
  /** ISO 8601 timestamp of last successful sync */
  last_sync_at?: string;
  /** Number of unsynced batches */
  pending_batches: number;
  /** Number of unsynced schemas */
  pending_schemas: number;
  /** Number of unsynced captures */
  pending_captures: number;
  /** Whether sync is currently in progress */
  sync_in_progress: boolean;
  /** Last sync error message if any */
  last_error?: string;
}

// =============================================================================
// LOCATION TYPES
// =============================================================================

/**
 * Represents GPS location data
 */
export interface LocationData {
  /** GPS latitude coordinate */
  latitude: number;
  /** GPS longitude coordinate */
  longitude: number;
  /** GPS accuracy in meters */
  accuracy: number;
  /** GPS altitude in meters */
  altitude?: number;
  /** GPS heading/bearing in degrees */
  heading?: number;
  /** GPS speed in m/s */
  speed?: number;
  /** ISO 8601 timestamp when location was captured */
  timestamp: string;
}

// =============================================================================
// VALIDATION TYPES
// =============================================================================

/**
 * Represents a single validation error
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;
  /** Human-readable error message */
  message: string;
  /** The value that failed validation */
  value?: any;
}

/**
 * Represents the result of a validation operation
 */
export interface ValidationResult {
  /** Whether all validations passed */
  isValid: boolean;
  /** Array of validation errors if any */
  errors: ValidationError[];
}

// =============================================================================
// DATABASE OPERATION TYPES
// =============================================================================

/**
 * Represents a database transaction for audit/sync purposes
 */
export interface DatabaseTransaction {
  /** Unique transaction identifier */
  id: string;
  /** Type of operation performed */
  type: 'create' | 'update' | 'delete';
  /** Table affected by the operation */
  table: 'batches' | 'schemas' | 'captures';
  /** ID of the affected record */
  record_id: number;
  /** ISO 8601 timestamp when operation occurred */
  timestamp: string;
  /** Whether this transaction has been synced */
  synced: boolean;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Utility type to make specific properties optional
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Utility type to make specific properties required
 */
export type Required<T, K extends keyof T> = T & { [P in K]-?: T[P] };

// =============================================================================
// CREATION TYPES (for database operations)
// =============================================================================

/**
 * Type for creating a new batch (omits auto-generated/optional fields)
 */
export type CreateBatch = Optional<Batch, 'id' | 'batch_id' | 'synced' | 'status' | 'created_by'>;

/**
 * Type for creating a new schema (omits auto-generated/optional fields)
 */
export type CreateSchema = Optional<Schema, 'id' | 'schema_id' | 'synced' | 'updated_at'>;

/**
 * Type for creating a new capture (omits auto-generated/optional fields)
 */
export type CreateCapture = Optional<Capture, 'id' | 'synced' | 'synced_at' | 'type' | 'source_device_id' | 'accuracy_m' | 'fixed_fields'>;