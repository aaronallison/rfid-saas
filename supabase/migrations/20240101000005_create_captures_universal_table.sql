-- Create captures_universal table for RFID capture data
CREATE TABLE captures_universal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- RFID tag information
    tag_id VARCHAR(255) NOT NULL,
    tag_type VARCHAR(100),
    rssi INTEGER, -- Signal strength
    
    -- Capture metadata
    capture_data JSONB DEFAULT '{}', -- Flexible data based on schema
    device_id VARCHAR(255),
    device_metadata JSONB DEFAULT '{}',
    
    -- Location and context
    location_data JSONB DEFAULT '{}', -- GPS, coordinates, etc.
    environmental_data JSONB DEFAULT '{}', -- Temperature, humidity, etc.
    
    -- Timing information
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Data quality and validation
    is_valid BOOLEAN DEFAULT true,
    validation_errors JSONB DEFAULT '[]',
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT captures_tag_id_not_empty CHECK (LENGTH(TRIM(tag_id)) > 0),
    CONSTRAINT captures_confidence_range CHECK (
        confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)
    ),
    CONSTRAINT captures_valid_json_arrays CHECK (
        jsonb_typeof(validation_errors) = 'array'
    )
);

-- Create indexes for performance
CREATE INDEX idx_captures_batch_id ON captures_universal(batch_id);
CREATE INDEX idx_captures_organization_id ON captures_universal(organization_id);
CREATE INDEX idx_captures_tag_id ON captures_universal(tag_id);
CREATE INDEX idx_captures_captured_at ON captures_universal(captured_at DESC);
CREATE INDEX idx_captures_device_id ON captures_universal(device_id);
CREATE INDEX idx_captures_is_valid ON captures_universal(is_valid);

-- Create compound indexes for common queries
CREATE INDEX idx_captures_batch_tag ON captures_universal(batch_id, tag_id);
CREATE INDEX idx_captures_batch_captured_at ON captures_universal(batch_id, captured_at DESC);
CREATE INDEX idx_captures_org_captured_at ON captures_universal(organization_id, captured_at DESC);

-- Create partial indexes for optimization
CREATE INDEX idx_captures_unprocessed ON captures_universal(batch_id, captured_at)
    WHERE processed_at IS NULL;
CREATE INDEX idx_captures_invalid ON captures_universal(batch_id, captured_at)
    WHERE is_valid = false;

-- Enable Row Level Security
ALTER TABLE captures_universal ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_captures_universal_updated_at 
    BEFORE UPDATE ON captures_universal 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Users can view captures in their organization batches" ON captures_universal
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = captures_universal.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
        )
    );

CREATE POLICY "Organization members can insert captures" ON captures_universal
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = captures_universal.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
            AND org_members.role IN ('admin', 'member')
        )
    );

CREATE POLICY "Organization members can update captures" ON captures_universal
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = captures_universal.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.status = 'active'
            AND org_members.role IN ('admin', 'member')
        )
    );

CREATE POLICY "Organization admins can delete captures" ON captures_universal
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.organization_id = captures_universal.organization_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
            AND org_members.status = 'active'
        )
    );

-- Function to update batch statistics when captures are added/updated
CREATE OR REPLACE FUNCTION update_batch_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update batch statistics
    UPDATE batches 
    SET 
        total_captures = (
            SELECT COUNT(*) 
            FROM captures_universal 
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        ),
        unique_tags = (
            SELECT COUNT(DISTINCT tag_id) 
            FROM captures_universal 
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        ),
        last_capture_at = (
            SELECT MAX(captured_at) 
            FROM captures_universal 
            WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update batch statistics
CREATE TRIGGER update_batch_stats_on_insert
    AFTER INSERT ON captures_universal
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_stats();

CREATE TRIGGER update_batch_stats_on_update
    AFTER UPDATE ON captures_universal
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_stats();

CREATE TRIGGER update_batch_stats_on_delete
    AFTER DELETE ON captures_universal
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_stats();