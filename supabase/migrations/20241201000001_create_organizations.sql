-- Create organizations table
CREATE TABLE organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(name) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_organizations_name ON organizations(name);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;