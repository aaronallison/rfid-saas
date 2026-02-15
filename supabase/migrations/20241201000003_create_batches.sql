-- Create batches table
CREATE TABLE batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(org_id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('open', 'synced', 'closed')) DEFAULT 'open'
);

-- Enable Row Level Security
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;