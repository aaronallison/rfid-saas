-- Create batches table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID GENERATED ALWAYS AS (id) STORED, -- For backward compatibility
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_id UUID GENERATED ALWAYS AS (organization_id) STORED, -- For backward compatibility
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT CHECK (length(trim(name)) <= 100),
    description TEXT,
    status TEXT CHECK (status IN ('open', 'synced', 'closed')) DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMPTZ
);

-- Create trigger for batches table
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_batches_organization_id ON batches(organization_id);
CREATE INDEX idx_batches_created_by ON batches(created_by);
CREATE INDEX idx_batches_status ON batches(status);

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;