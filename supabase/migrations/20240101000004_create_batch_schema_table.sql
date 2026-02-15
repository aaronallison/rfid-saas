-- Create batch schema table for defining capture data structure
CREATE TABLE batch_schema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- Schema definition as JSON
    schema_definition JSONB NOT NULL,
    
    -- Schema metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT batch_schema_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT batch_schema_version_positive CHECK (version > 0),
    CONSTRAINT batch_schema_valid_json CHECK (jsonb_typeof(schema_definition) = 'object')
);

-- Create indexes for performance
CREATE INDEX idx_batch_schema_organization_id ON batch_schema(organization_id);
CREATE INDEX idx_batch_schema_is_active ON batch_schema(is_active);
CREATE INDEX idx_batch_schema_is_default ON batch_schema(is_default);
CREATE INDEX idx_batch_schema_created_by ON batch_schema(created_by);

-- Create compound indexes for common queries
CREATE INDEX idx_batch_schema_org_active ON batch_schema(organization_id, is_active);
CREATE UNIQUE INDEX idx_batch_schema_org_default ON batch_schema(organization_id) 
    WHERE is_default = true;

-- Add foreign key constraint to batches table
ALTER TABLE batches 
ADD CONSTRAINT fk_batches_schema_id 
FOREIGN KEY (schema_id) REFERENCES batch_schema(id);

-- Enable Row Level Security
ALTER TABLE batch_schema ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_batch_schema_updated_at 
    BEFORE UPDATE ON batch_schema 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Users can view schemas in their organizations" ON batch_schema
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batch_schema.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
        )
    );

CREATE POLICY "Organization admins can create schemas" ON batch_schema
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batch_schema.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Schema creators and org admins can update schemas" ON batch_schema
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batch_schema.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
            AND org_members.status = 'active'
        )
    );

CREATE POLICY "Organization admins can delete schemas" ON batch_schema
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batch_schema.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
            AND org_members.status = 'active'
        )
    );

-- Function to ensure only one default schema per organization
CREATE OR REPLACE FUNCTION ensure_single_default_schema()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a schema as default, unset all other defaults in the same org
    IF NEW.is_default = true THEN
        UPDATE batch_schema 
        SET is_default = false 
        WHERE organization_id = NEW.organization_id 
        AND id != NEW.id 
        AND is_default = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_schema_trigger
    BEFORE INSERT OR UPDATE ON batch_schema
    FOR EACH ROW
    WHEN (NEW.is_default = true)
    EXECUTE FUNCTION ensure_single_default_schema();