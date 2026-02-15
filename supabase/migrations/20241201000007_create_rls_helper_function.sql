-- Create helper function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    -- Return false if user is not authenticated
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is a member of the organization
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_id = p_org_id 
        AND user_id = auth.uid()
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    -- Return false if user is not authenticated
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is an admin of the organization
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_id = p_org_id 
        AND user_id = auth.uid()
        AND role = 'admin'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER;