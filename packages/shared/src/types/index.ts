// Common types shared across web and mobile apps

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'completed' | 'archived';
}

export interface RfidTag {
  id: string;
  epc: string;
  batch_id: string;
  captured_at: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}