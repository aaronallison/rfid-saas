-- Create batch_schema table
CREATE TABLE batch_schema (
    schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_batch_schema_batch_id ON batch_schema(batch_id);
CREATE INDEX idx_batch_schema_org_id ON batch_schema(org_id);

-- Enable Row Level Security
ALTER TABLE batch_schema ENABLE ROW LEVEL SECURITY;