-- RLS Policies for all tables
-- 
-- Security Model:
-- - Organization members can view and create content within their organization
-- - Organization admins have elevated permissions for management operations
-- - Users can create new organizations and become the first admin
-- - Self-service operations (like leaving an organization) are allowed where appropriate
-- 
-- Dependencies:
-- - Requires is_org_member() helper function to be created first
-- - All tables must have RLS enabled
--

-- Organizations policies
CREATE POLICY "org_select_members_only" ON organizations
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "org_insert_authenticated_users" ON organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "org_update_admins_only" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = organizations.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "org_delete_admins_only" ON organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = organizations.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Org_members policies
CREATE POLICY "org_members_select_same_org" ON org_members
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "org_members_insert_admin_or_first_user" ON org_members
    FOR INSERT WITH CHECK (
        -- Allow if user is admin of the org, OR if this is the first member (org creator)
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
        OR 
        NOT EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id
        )
    );

CREATE POLICY "org_members_update_admins_only" ON org_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

CREATE POLICY "org_members_delete_admins_or_self" ON org_members
    FOR DELETE USING (
        -- Admins can delete any member, or users can remove themselves
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
        OR org_members.user_id = auth.uid()
    );

-- Batches policies
CREATE POLICY "batches_select_org_members" ON batches
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "batches_insert_org_members" ON batches
    FOR INSERT WITH CHECK (
        is_org_member(org_id) 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "batches_update_creator_or_admin" ON batches
    FOR UPDATE USING (
        is_org_member(org_id) 
        AND (
            created_by = auth.uid() 
            OR EXISTS (
                SELECT 1 FROM org_members 
                WHERE org_members.org_id = batches.org_id 
                AND org_members.user_id = auth.uid()
                AND org_members.role = 'admin'
            )
        )
    );

CREATE POLICY "batches_delete_admins_only" ON batches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batches.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Batch_schema policies
CREATE POLICY "batch_schema_select_org_members" ON batch_schema
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "batch_schema_insert_org_members" ON batch_schema
    FOR INSERT WITH CHECK (
        is_org_member(org_id) 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "batch_schema_update_org_members" ON batch_schema
    FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "batch_schema_delete_admins_only" ON batch_schema
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batch_schema.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Captures_universal policies
CREATE POLICY "captures_select_org_members" ON captures_universal
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "captures_insert_org_members" ON captures_universal
    FOR INSERT WITH CHECK (
        is_org_member(org_id) 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "captures_update_org_members" ON captures_universal
    FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "captures_delete_admins_only" ON captures_universal
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = captures_universal.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Billing_org policies
CREATE POLICY "billing_select_org_members" ON billing_org
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "billing_insert_admins_only" ON billing_org
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "billing_update_admins_only" ON billing_org
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "billing_delete_admins_only" ON billing_org
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );