-- Create batches table
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('draft', 'open', 'synced', 'closed')) DEFAULT 'open'
);

-- Create indexes for better query performance
CREATE INDEX idx_batches_org_id ON batches(org_id);
CREATE INDEX idx_batches_created_by ON batches(created_by);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create function to automatically set created_by on insert
CREATE OR REPLACE FUNCTION set_created_by_on_insert()
RETURNS TRIGGER AS $
BEGIN
    -- Only set created_by if it's not already provided
    IF NEW.created_by IS NULL THEN
        NEW.created_by = auth.uid();
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update updated_at on row updates
CREATE TRIGGER update_batches_updated_at 
    BEFORE UPDATE ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically set created_by on insert
CREATE TRIGGER set_batches_created_by 
    BEFORE INSERT ON batches 
    FOR EACH ROW 
    EXECUTE FUNCTION set_created_by_on_insert();

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;