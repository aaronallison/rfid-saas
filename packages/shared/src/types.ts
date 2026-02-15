// Shared type definitions
export interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface RfidCapture {
  id: string;
  batch_id: string;
  tag_id: string;
  location_lat?: number;
  location_lng?: number;
  timestamp: string;
  device_id: string;
}