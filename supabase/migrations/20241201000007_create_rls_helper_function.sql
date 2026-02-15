-- Create helper function to check if user is org member
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    -- Return false if no authenticated user
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Return false if org_id is null
    IF p_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is a member of the organization
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_id = p_org_id 
        AND user_id = current_user_id
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current authenticated user ID
    current_user_id := auth.uid();
    
    -- Return false if no authenticated user
    IF current_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Return false if org_id is null
    IF p_org_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is an admin of the organization
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_id = p_org_id 
        AND user_id = current_user_id
        AND role = 'admin'
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER STABLE;