-- Create batch_schema table
CREATE TABLE batch_schema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id UUID GENERATED ALWAYS AS (id) STORED, -- For backward compatibility
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_id UUID GENERATED ALWAYS AS (organization_id) STORED, -- For backward compatibility
    col_1_name TEXT CHECK (length(trim(col_1_name)) <= 50),
    col_2_name TEXT CHECK (length(trim(col_2_name)) <= 50),
    col_3_name TEXT CHECK (length(trim(col_3_name)) <= 50),
    col_4_name TEXT CHECK (length(trim(col_4_name)) <= 50),
    col_5_name TEXT CHECK (length(trim(col_5_name)) <= 50),
    col_6_name TEXT CHECK (length(trim(col_6_name)) <= 50),
    col_7_name TEXT CHECK (length(trim(col_7_name)) <= 50),
    col_8_name TEXT CHECK (length(trim(col_8_name)) <= 50),
    col_9_name TEXT CHECK (length(trim(col_9_name)) <= 50),
    col_10_name TEXT CHECK (length(trim(col_10_name)) <= 50),
    col_11_name TEXT CHECK (length(trim(col_11_name)) <= 50),
    col_12_name TEXT CHECK (length(trim(col_12_name)) <= 50),
    col_13_name TEXT CHECK (length(trim(col_13_name)) <= 50),
    col_14_name TEXT CHECK (length(trim(col_14_name)) <= 50),
    col_15_name TEXT CHECK (length(trim(col_15_name)) <= 50),
    col_16_name TEXT CHECK (length(trim(col_16_name)) <= 50),
    col_17_name TEXT CHECK (length(trim(col_17_name)) <= 50),
    col_18_name TEXT CHECK (length(trim(col_18_name)) <= 50),
    col_19_name TEXT CHECK (length(trim(col_19_name)) <= 50),
    col_20_name TEXT CHECK (length(trim(col_20_name)) <= 50),
    col_21_name TEXT CHECK (length(trim(col_21_name)) <= 50),
    col_22_name TEXT CHECK (length(trim(col_22_name)) <= 50),
    col_23_name TEXT CHECK (length(trim(col_23_name)) <= 50),
    col_24_name TEXT CHECK (length(trim(col_24_name)) <= 50),
    col_25_name TEXT CHECK (length(trim(col_25_name)) <= 50),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create trigger for batch_schema table
CREATE TRIGGER update_batch_schema_updated_at
    BEFORE UPDATE ON batch_schema
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_batch_schema_batch_id ON batch_schema(batch_id);
CREATE INDEX idx_batch_schema_organization_id ON batch_schema(organization_id);

-- Enable Row Level Security
ALTER TABLE batch_schema ENABLE ROW LEVEL SECURITY;