-- Create batches table with proper constraints and metadata
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'syncing', 'synced', 'closed', 'archived')) DEFAULT 'draft',
    total_captures INTEGER NOT NULL DEFAULT 0,
    synced_captures INTEGER NOT NULL DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    
    -- Ensure synced captures never exceed total
    CONSTRAINT check_synced_captures_valid CHECK (synced_captures <= total_captures),
    -- Ensure closed batches have closure metadata
    CONSTRAINT check_closed_batch_metadata CHECK (
        (status != 'closed') OR 
        (status = 'closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_batches_org_id ON batches (org_id);
CREATE INDEX idx_batches_created_by ON batches (created_by);
CREATE INDEX idx_batches_status ON batches (status);
CREATE INDEX idx_batches_created_at ON batches (created_at DESC);
CREATE INDEX idx_batches_updated_at ON batches (updated_at DESC);
CREATE INDEX idx_batches_name ON batches (name);
CREATE INDEX idx_batches_org_status ON batches (org_id, status);

-- Create function to update timestamps and validate state transitions
CREATE OR REPLACE FUNCTION update_batch_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at := NOW();
    
    -- Handle status transitions
    CASE 
        WHEN OLD.status != 'closed' AND NEW.status = 'closed' THEN
            -- Set closure metadata when closing
            IF NEW.closed_at IS NULL THEN
                NEW.closed_at := NOW();
            END IF;
            -- closed_by must be set by the application
            
        WHEN OLD.status = 'closed' AND NEW.status != 'closed' THEN
            -- Clear closure metadata when reopening
            NEW.closed_at := NULL;
            NEW.closed_by := NULL;
            
        WHEN OLD.status != 'synced' AND NEW.status = 'synced' THEN
            -- Update sync timestamp when fully synced
            NEW.last_sync_at := NOW();
            NEW.sync_error := NULL;
            
        WHEN OLD.status != 'syncing' AND NEW.status = 'syncing' THEN
            -- Clear sync error when starting sync
            NEW.sync_error := NULL;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata updates
CREATE TRIGGER trigger_update_batch_metadata
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_metadata();

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE batches IS 'Data collection batches with sync status tracking';
COMMENT ON COLUMN batches.batch_id IS 'Primary key - UUID automatically generated';
COMMENT ON COLUMN batches.org_id IS 'Organization that owns this batch';
COMMENT ON COLUMN batches.created_by IS 'User who created this batch';
COMMENT ON COLUMN batches.name IS 'Human-readable batch name';
COMMENT ON COLUMN batches.status IS 'Current batch status for workflow management';
COMMENT ON COLUMN batches.total_captures IS 'Total number of RFID captures in this batch';
COMMENT ON COLUMN batches.synced_captures IS 'Number of captures successfully synced to cloud';
COMMENT ON COLUMN batches.last_sync_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN batches.sync_error IS 'Last sync error message (null if no error)';
COMMENT ON COLUMN batches.closed_at IS 'When the batch was closed (finalized)';
COMMENT ON COLUMN batches.closed_by IS 'Who closed the batch';