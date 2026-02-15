export interface Batch {
  id?: number;
  name: string;
  organization_id: string;
  schema_id: number;
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Schema {
  id?: number;
  name: string;
  organization_id: string;
  fields: SchemaField[];
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface SchemaField {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  required: boolean;
  label: string;
}

export interface Capture {
  id?: number;
  batch_id: number;
  rfid_tag: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  data: Record<string, any>;
  synced: boolean;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  organizations: Organization[];
}