-- Create org_members table with proper constraints and cascade behavior
CREATE TABLE org_members (
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (org_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_org_members_user_id ON org_members (user_id);
CREATE INDEX idx_org_members_role ON org_members (role);
CREATE INDEX idx_org_members_created_at ON org_members (created_at);
CREATE INDEX idx_org_members_active ON org_members (is_active) WHERE is_active = true;
CREATE INDEX idx_org_members_invited_by ON org_members (invited_by);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_org_member_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    
    -- Set joined_at when user becomes active for the first time
    IF OLD.is_active = false AND NEW.is_active = true AND NEW.joined_at IS NULL THEN
        NEW.joined_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER trigger_update_org_member_timestamp
    BEFORE UPDATE ON org_members
    FOR EACH ROW
    EXECUTE FUNCTION update_org_member_timestamp();

-- Create unique constraint to ensure only one owner per organization
CREATE UNIQUE INDEX idx_org_members_single_owner 
ON org_members (org_id) 
WHERE role = 'owner' AND is_active = true;

-- Enable Row Level Security
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE org_members IS 'Organization membership with role-based access control';
COMMENT ON COLUMN org_members.org_id IS 'Reference to organizations table with cascade delete';
COMMENT ON COLUMN org_members.user_id IS 'Reference to auth.users with cascade delete';
COMMENT ON COLUMN org_members.role IS 'User role: owner, admin, member, or viewer';
COMMENT ON COLUMN org_members.invited_by IS 'Who invited this user (nullable for owners)';
COMMENT ON COLUMN org_members.invited_at IS 'When the invitation was sent';
COMMENT ON COLUMN org_members.joined_at IS 'When the user accepted and became active';
COMMENT ON COLUMN org_members.is_active IS 'Whether the membership is currently active';