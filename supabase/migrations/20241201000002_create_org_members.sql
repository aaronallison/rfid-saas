-- Create org_members table
CREATE TABLE org_members (
    org_id UUID NOT NULL REFERENCES organizations(org_id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (org_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;