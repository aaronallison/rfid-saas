// Shared database types
export interface Organization {
  org_id: string;
  name: string;
  created_at: string;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface Batch {
  batch_id: string;
  org_id: string;
  created_by?: string;
  created_at: string;
  status: 'open' | 'synced' | 'closed';
}

export interface BatchSchema {
  schema_id: string;
  batch_id: string;
  org_id: string;
  col_1_name?: string;
  col_2_name?: string;
  col_3_name?: string;
  col_4_name?: string;
  col_5_name?: string;
  col_6_name?: string;
  col_7_name?: string;
  col_8_name?: string;
  col_9_name?: string;
  col_10_name?: string;
  col_11_name?: string;
  col_12_name?: string;
  col_13_name?: string;
  col_14_name?: string;
  col_15_name?: string;
  col_16_name?: string;
  col_17_name?: string;
  col_18_name?: string;
  col_19_name?: string;
  col_20_name?: string;
  col_21_name?: string;
  col_22_name?: string;
  col_23_name?: string;
  col_24_name?: string;
  col_25_name?: string;
  created_at: string;
}

export interface CaptureUniversal {
  cntid: number;
  org_id: string;
  batch_id?: string;
  type: string;
  f1?: string;
  f2?: string;
  f3?: string;
  f4?: string;
  f5?: string;
  f6?: string;
  f7?: string;
  f8?: string;
  f9?: string;
  f10?: string;
  f11?: string;
  f12?: string;
  f13?: string;
  f14?: string;
  f15?: string;
  f16?: string;
  f17?: string;
  f18?: string;
  f19?: string;
  f20?: string;
  f21?: string;
  f22?: string;
  f23?: string;
  f24?: string;
  f25?: string;
  rfid_tag?: string;
  lat?: number;
  lng?: number;
  accuracy_m?: number;
  captured_at: string;
  source_device_id?: string;
  synced_at?: string;
}

export interface BillingOrg {
  org_id: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  billing_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  updated_at: string;
}