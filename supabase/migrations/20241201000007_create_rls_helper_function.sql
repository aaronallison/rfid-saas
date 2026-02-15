-- Create helper function to check if user is org member
-- This function is used extensively in RLS policies to determine
-- if the current authenticated user is a member of a given organization
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $
BEGIN
    -- Return early if no user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if the current user is a member of the specified organization
    RETURN EXISTS (
        SELECT 1 FROM org_members 
        WHERE org_id = p_org_id 
        AND user_id = auth.uid()
    );
END;
$ LANGUAGE plpgsql SECURITY DEFINER STABLE;