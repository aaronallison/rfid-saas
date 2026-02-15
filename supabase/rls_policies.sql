-- RLS Policies for all tables

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Authenticated users can insert organizations" ON organizations
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organization admins can update their organization" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = organizations.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can delete their organization" ON organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = organizations.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Org_members policies
CREATE POLICY "Users can view members of organizations they belong to" ON org_members
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Organization admins can insert members" ON org_members
    FOR INSERT WITH CHECK (
        -- Allow first admin to be added during organization creation
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM org_members om 
                WHERE om.org_id = org_members.org_id 
                AND om.user_id = auth.uid()
                AND om.role = 'admin'
            )
            OR NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = org_members.org_id)
        )
    );

CREATE POLICY "Organization admins can update members" ON org_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can delete members" ON org_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members om 
            WHERE om.org_id = org_members.org_id 
            AND om.user_id = auth.uid()
            AND om.role = 'admin'
        )
    );

-- Batches policies
CREATE POLICY "Users can view batches in their organizations" ON batches
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Organization members can create batches" ON batches
    FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "Organization members can update batches" ON batches
    FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "Organization admins can delete batches" ON batches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batches.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Batch_schema policies
CREATE POLICY "Users can view batch schemas in their organizations" ON batch_schema
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Organization members can create batch schemas" ON batch_schema
    FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "Organization members can update batch schemas" ON batch_schema
    FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "Organization admins can delete batch schemas" ON batch_schema
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batch_schema.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Captures_universal policies
CREATE POLICY "Users can view captures in their organizations" ON captures_universal
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Organization members can insert captures" ON captures_universal
    FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "Organization members can update captures" ON captures_universal
    FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "Organization admins can delete captures" ON captures_universal
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = captures_universal.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

-- Billing_org policies
CREATE POLICY "Users can view billing for their organizations" ON billing_org
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Organization admins can manage billing" ON billing_org
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );