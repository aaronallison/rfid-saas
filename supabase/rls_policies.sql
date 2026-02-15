-- RLS Policies for all tables

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "Authenticated users can create organizations" ON organizations
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

-- Special policy for initial organization creator (when org is first created)
CREATE POLICY "Users can join as admin during org creation" ON org_members
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        AND role = 'admin'
        AND NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = org_members.org_id)
    );

-- Policy for admins to add other members
CREATE POLICY "Organization admins can add members" ON org_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members existing 
            WHERE existing.org_id = org_members.org_id 
            AND existing.user_id = auth.uid()
            AND existing.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can update member roles" ON org_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members existing 
            WHERE existing.org_id = org_members.org_id 
            AND existing.user_id = auth.uid()
            AND existing.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can remove members" ON org_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members existing 
            WHERE existing.org_id = org_members.org_id 
            AND existing.user_id = auth.uid()
            AND existing.role = 'admin'
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

CREATE POLICY "Organization admins can create batch schemas" ON batch_schema
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batch_schema.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can update batch schemas" ON batch_schema
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = batch_schema.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

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
CREATE POLICY "Organization admins can view billing" ON billing_org
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can create billing records" ON billing_org
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can update billing records" ON billing_org
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can delete billing records" ON billing_org
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM org_members 
            WHERE org_members.org_id = billing_org.org_id 
            AND org_members.user_id = auth.uid()
            AND org_members.role = 'admin'
        )
    );