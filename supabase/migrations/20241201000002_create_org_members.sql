-- Create organization_members table (matching web app expectations)
CREATE TABLE organization_members (
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_id UUID GENERATED ALWAYS AS (organization_id) STORED, -- For backward compatibility  
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ GENERATED ALWAYS AS (joined_at) STORED, -- For backward compatibility
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (organization_id, user_id)
);

-- Create alias table for backward compatibility
CREATE VIEW org_members AS 
SELECT 
    org_id,
    user_id,
    CASE 
        WHEN role = 'owner' THEN 'admin'
        ELSE role 
    END as role,
    created_at
FROM organization_members;

-- Create function to update updated_at timestamp for organization_members
CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON organization_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_organization_id ON organization_members(organization_id);

-- Enable Row Level Security
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;