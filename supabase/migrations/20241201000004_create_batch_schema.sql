-- Create batch_schema table with improved design and validation
CREATE TABLE batch_schema (
    schema_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    schema_version INTEGER NOT NULL DEFAULT 1,
    column_definitions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Ensure valid JSON structure
    CONSTRAINT check_column_definitions_structure CHECK (
        jsonb_typeof(column_definitions) = 'object'
    )
);

-- Create legacy columns for backward compatibility (deprecated)
ALTER TABLE batch_schema ADD COLUMN col_1_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_2_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_3_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_4_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_5_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_6_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_7_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_8_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_9_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_10_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_11_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_12_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_13_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_14_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_15_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_16_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_17_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_18_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_19_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_20_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_21_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_22_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_23_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_24_name TEXT;
ALTER TABLE batch_schema ADD COLUMN col_25_name TEXT;

-- Create indexes for better query performance
CREATE INDEX idx_batch_schema_batch_id ON batch_schema (batch_id);
CREATE INDEX idx_batch_schema_org_id ON batch_schema (org_id);
CREATE INDEX idx_batch_schema_version ON batch_schema (batch_id, schema_version);
CREATE INDEX idx_batch_schema_created_by ON batch_schema (created_by);
CREATE INDEX idx_batch_schema_created_at ON batch_schema (created_at DESC);

-- Create GIN index for JSON column queries
CREATE INDEX idx_batch_schema_column_definitions ON batch_schema USING GIN (column_definitions);

-- Create unique constraint to ensure one schema per batch version
CREATE UNIQUE INDEX idx_batch_schema_unique_version ON batch_schema (batch_id, schema_version);

-- Create function to update timestamps and sync legacy columns
CREATE OR REPLACE FUNCTION update_batch_schema_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at := NOW();
    
    -- Sync JSONB to legacy columns for backward compatibility
    IF NEW.column_definitions IS NOT NULL THEN
        NEW.col_1_name := NEW.column_definitions->>'col_1';
        NEW.col_2_name := NEW.column_definitions->>'col_2';
        NEW.col_3_name := NEW.column_definitions->>'col_3';
        NEW.col_4_name := NEW.column_definitions->>'col_4';
        NEW.col_5_name := NEW.column_definitions->>'col_5';
        NEW.col_6_name := NEW.column_definitions->>'col_6';
        NEW.col_7_name := NEW.column_definitions->>'col_7';
        NEW.col_8_name := NEW.column_definitions->>'col_8';
        NEW.col_9_name := NEW.column_definitions->>'col_9';
        NEW.col_10_name := NEW.column_definitions->>'col_10';
        NEW.col_11_name := NEW.column_definitions->>'col_11';
        NEW.col_12_name := NEW.column_definitions->>'col_12';
        NEW.col_13_name := NEW.column_definitions->>'col_13';
        NEW.col_14_name := NEW.column_definitions->>'col_14';
        NEW.col_15_name := NEW.column_definitions->>'col_15';
        NEW.col_16_name := NEW.column_definitions->>'col_16';
        NEW.col_17_name := NEW.column_definitions->>'col_17';
        NEW.col_18_name := NEW.column_definitions->>'col_18';
        NEW.col_19_name := NEW.column_definitions->>'col_19';
        NEW.col_20_name := NEW.column_definitions->>'col_20';
        NEW.col_21_name := NEW.column_definitions->>'col_21';
        NEW.col_22_name := NEW.column_definitions->>'col_22';
        NEW.col_23_name := NEW.column_definitions->>'col_23';
        NEW.col_24_name := NEW.column_definitions->>'col_24';
        NEW.col_25_name := NEW.column_definitions->>'col_25';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata updates
CREATE TRIGGER trigger_update_batch_schema_metadata
    BEFORE INSERT OR UPDATE ON batch_schema
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_schema_metadata();

-- Enable Row Level Security
ALTER TABLE batch_schema ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE batch_schema IS 'Schema definitions for batch data collection with versioning support';
COMMENT ON COLUMN batch_schema.schema_id IS 'Primary key - UUID automatically generated';
COMMENT ON COLUMN batch_schema.batch_id IS 'Reference to the batch this schema belongs to';
COMMENT ON COLUMN batch_schema.org_id IS 'Organization that owns this schema';
COMMENT ON COLUMN batch_schema.schema_version IS 'Version number for schema evolution';
COMMENT ON COLUMN batch_schema.column_definitions IS 'JSONB object defining column names and types';
COMMENT ON COLUMN batch_schema.created_by IS 'User who created this schema version';
COMMENT ON COLUMN batch_schema.col_1_name IS 'DEPRECATED: Use column_definitions JSONB instead';

-- Create view for easier querying of current schema versions
CREATE VIEW current_batch_schemas AS
SELECT DISTINCT ON (batch_id) 
    schema_id,
    batch_id,
    org_id,
    schema_version,
    column_definitions,
    created_at,
    updated_at,
    created_by
FROM batch_schema
ORDER BY batch_id, schema_version DESC;

COMMENT ON VIEW current_batch_schemas IS 'View showing the latest schema version for each batch';