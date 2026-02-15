-- Create batch_schema table to define column names for data capture batches
-- Each batch can have a custom schema defining names for up to 25 data fields
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure batch and organization consistency
    CONSTRAINT batch_schema_org_consistency 
        CHECK (org_id = (SELECT org_id FROM batches WHERE batch_id = batch_schema.batch_id))
);

-- Add unique constraint to prevent multiple schemas per batch
ALTER TABLE batch_schema 
ADD CONSTRAINT batch_schema_unique_batch UNIQUE (batch_id);

-- Add indexes for performance
CREATE INDEX idx_batch_schema_batch_id ON batch_schema(batch_id);
CREATE INDEX idx_batch_schema_org_id ON batch_schema(org_id);
CREATE INDEX idx_batch_schema_created_at ON batch_schema(created_at);

-- Add comments for documentation
COMMENT ON TABLE batch_schema IS 'Defines custom column names for data fields in batches. Maps f1-f25 fields in captures_universal to human-readable names.';
COMMENT ON COLUMN batch_schema.schema_id IS 'Unique identifier for the schema definition';
COMMENT ON COLUMN batch_schema.batch_id IS 'Reference to the batch this schema applies to';
COMMENT ON COLUMN batch_schema.org_id IS 'Organization that owns this schema (must match batch organization)';
COMMENT ON COLUMN batch_schema.col_1_name IS 'Display name for data field f1 in captures_universal';
COMMENT ON COLUMN batch_schema.col_2_name IS 'Display name for data field f2 in captures_universal';
COMMENT ON COLUMN batch_schema.col_3_name IS 'Display name for data field f3 in captures_universal';
COMMENT ON COLUMN batch_schema.col_4_name IS 'Display name for data field f4 in captures_universal';
COMMENT ON COLUMN batch_schema.col_5_name IS 'Display name for data field f5 in captures_universal';
COMMENT ON COLUMN batch_schema.col_6_name IS 'Display name for data field f6 in captures_universal';
COMMENT ON COLUMN batch_schema.col_7_name IS 'Display name for data field f7 in captures_universal';
COMMENT ON COLUMN batch_schema.col_8_name IS 'Display name for data field f8 in captures_universal';
COMMENT ON COLUMN batch_schema.col_9_name IS 'Display name for data field f9 in captures_universal';
COMMENT ON COLUMN batch_schema.col_10_name IS 'Display name for data field f10 in captures_universal';
COMMENT ON COLUMN batch_schema.col_11_name IS 'Display name for data field f11 in captures_universal';
COMMENT ON COLUMN batch_schema.col_12_name IS 'Display name for data field f12 in captures_universal';
COMMENT ON COLUMN batch_schema.col_13_name IS 'Display name for data field f13 in captures_universal';
COMMENT ON COLUMN batch_schema.col_14_name IS 'Display name for data field f14 in captures_universal';
COMMENT ON COLUMN batch_schema.col_15_name IS 'Display name for data field f15 in captures_universal';
COMMENT ON COLUMN batch_schema.col_16_name IS 'Display name for data field f16 in captures_universal';
COMMENT ON COLUMN batch_schema.col_17_name IS 'Display name for data field f17 in captures_universal';
COMMENT ON COLUMN batch_schema.col_18_name IS 'Display name for data field f18 in captures_universal';
COMMENT ON COLUMN batch_schema.col_19_name IS 'Display name for data field f19 in captures_universal';
COMMENT ON COLUMN batch_schema.col_20_name IS 'Display name for data field f20 in captures_universal';
COMMENT ON COLUMN batch_schema.col_21_name IS 'Display name for data field f21 in captures_universal';
COMMENT ON COLUMN batch_schema.col_22_name IS 'Display name for data field f22 in captures_universal';
COMMENT ON COLUMN batch_schema.col_23_name IS 'Display name for data field f23 in captures_universal';
COMMENT ON COLUMN batch_schema.col_24_name IS 'Display name for data field f24 in captures_universal';
COMMENT ON COLUMN batch_schema.col_25_name IS 'Display name for data field f25 in captures_universal';
COMMENT ON COLUMN batch_schema.created_at IS 'Timestamp when the schema was created';

-- Enable Row Level Security
ALTER TABLE batch_schema ENABLE ROW LEVEL SECURITY;