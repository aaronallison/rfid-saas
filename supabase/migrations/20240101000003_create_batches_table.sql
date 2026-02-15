-- Create batches table for RFID capture sessions
CREATE TYPE batch_status AS ENUM ('draft', 'active', 'completed', 'archived');

CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status batch_status NOT NULL DEFAULT 'draft',
    schema_id UUID, -- Will reference batch_schema table
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Batch lifecycle timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Capture statistics
    total_captures INTEGER DEFAULT 0,
    unique_tags INTEGER DEFAULT 0,
    last_capture_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT batches_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT batches_completed_after_started CHECK (
        completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
    )
);

-- Create indexes for performance
CREATE INDEX idx_batches_organization_id ON batches(organization_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_by ON batches(created_by);
CREATE INDEX idx_batches_created_at ON batches(created_at);
CREATE INDEX idx_batches_schema_id ON batches(schema_id);

-- Create compound indexes for common queries
CREATE INDEX idx_batches_org_status ON batches(organization_id, status);
CREATE INDEX idx_batches_org_created_at ON batches(organization_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Users can view batches in their organizations" ON batches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batches.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
        )
    );

CREATE POLICY "Organization members can create batches" ON batches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batches.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
            AND org_members.role IN ('admin', 'member')
        )
    );

CREATE POLICY "Batch creators and org admins can update batches" ON batches
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batches.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
            AND org_members.status = 'active'
        )
    );

CREATE POLICY "Organization admins can delete batches" ON batches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = batches.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
            AND org_members.status = 'active'
        )
    );