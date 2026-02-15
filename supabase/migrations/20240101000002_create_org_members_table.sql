-- Create organization members table
CREATE TYPE member_role AS ENUM ('admin', 'member', 'viewer');
CREATE TYPE member_status AS ENUM ('active', 'invited', 'suspended');

CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    status member_status NOT NULL DEFAULT 'invited',
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique membership per org
    UNIQUE(organization_id, user_id),
    UNIQUE(organization_id, email)
);

-- Create indexes for performance
CREATE INDEX idx_org_members_organization_id ON org_members(organization_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_email ON org_members(email);
CREATE INDEX idx_org_members_status ON org_members(status);

-- Enable Row Level Security
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE TRIGGER update_org_members_updated_at 
    BEFORE UPDATE ON org_members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create RLS policies
CREATE POLICY "Users can view their own memberships" ON org_members
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organization admins can view all members" ON org_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.organization_id = org_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

CREATE POLICY "Organization admins can insert members" ON org_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.organization_id = org_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

CREATE POLICY "Organization admins can update members" ON org_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.organization_id = org_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
            AND om.status = 'active'
        )
    );

CREATE POLICY "Users can update their own membership status" ON org_members
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());