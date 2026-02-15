-- Create helper function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(p_organization_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_id = p_organization_id 
        AND user_id = auth.uid()
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create backward compatibility function
CREATE OR REPLACE FUNCTION is_org_member_legacy(p_org_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    RETURN is_org_member(p_org_id);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;