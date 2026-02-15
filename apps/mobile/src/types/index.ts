export interface Batch {
  id?: number;
  batch_id?: string;
  name: string;
  organization_id: string;
  created_by?: string;
  status?: 'open' | 'synced' | 'closed';
  created_at: string;
  updated_at: string;
  synced: boolean;
}

export interface Schema {
  id?: number;
  schema_id?: string;
  batch_id: string;
  organization_id: string;
  col_1_name?: string | null;
  col_2_name?: string | null;
  col_3_name?: string | null;
  col_4_name?: string | null;
  col_5_name?: string | null;
  col_6_name?: string | null;
  col_7_name?: string | null;
  col_8_name?: string | null;
  col_9_name?: string | null;
  col_10_name?: string | null;
  col_11_name?: string | null;
  col_12_name?: string | null;
  col_13_name?: string | null;
  col_14_name?: string | null;
  col_15_name?: string | null;
  col_16_name?: string | null;
  col_17_name?: string | null;
  col_18_name?: string | null;
  col_19_name?: string | null;
  col_20_name?: string | null;
  col_21_name?: string | null;
  col_22_name?: string | null;
  col_23_name?: string | null;
  col_24_name?: string | null;
  col_25_name?: string | null;
  created_at: string;
  synced: boolean;
}

// Keep the legacy Schema interface for backward compatibility
export interface LegacySchema {
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
  cntid?: number;
  organization_id: string;
  batch_id: string;
  type?: string;
  f1?: string | null;
  f2?: string | null;
  f3?: string | null;
  f4?: string | null;
  f5?: string | null;
  f6?: string | null;
  f7?: string | null;
  f8?: string | null;
  f9?: string | null;
  f10?: string | null;
  f11?: string | null;
  f12?: string | null;
  f13?: string | null;
  f14?: string | null;
  f15?: string | null;
  f16?: string | null;
  f17?: string | null;
  f18?: string | null;
  f19?: string | null;
  f20?: string | null;
  f21?: string | null;
  f22?: string | null;
  f23?: string | null;
  f24?: string | null;
  f25?: string | null;
  rfid_tag?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracy_m?: number | null;
  captured_at: string;
  source_device_id?: string | null;
  synced_at?: string | null;
  synced: boolean;
}

// Keep the legacy Capture interface for backward compatibility
export interface LegacyCapture {
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