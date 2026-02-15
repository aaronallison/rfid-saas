-- Create org_members table
CREATE TABLE org_members (
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (org_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_role ON org_members(role);

-- Enable Row Level Security
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;