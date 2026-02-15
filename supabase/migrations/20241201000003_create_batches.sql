-- Create batches table
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('open', 'synced', 'closed')) DEFAULT 'open'
);

-- Create indexes for performance
CREATE INDEX idx_batches_org_id ON batches(org_id);
CREATE INDEX idx_batches_created_by ON batches(created_by);
CREATE INDEX idx_batches_status ON batches(status);

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;