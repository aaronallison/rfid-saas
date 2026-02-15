-- RLS Policies for all tables

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (is_org_member(id));

CREATE POLICY "Users can insert organizations" ON organizations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Organization admins can update their organization" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = organizations.id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Organization owners can delete their organization" ON organizations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = organizations.id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role = 'owner'
        )
    );

-- Organization_members policies  
CREATE POLICY "Users can view members of organizations they belong to" ON organization_members
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Organization admins can insert members" ON organization_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.organization_id = organization_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can join organizations with valid invitations" ON organization_members
    FOR INSERT WITH CHECK (
        -- This would be extended with invitation logic
        auth.uid() = user_id
    );

CREATE POLICY "Organization admins can update members" ON organization_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.organization_id = organization_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Organization admins can delete members" ON organization_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members om 
            WHERE om.organization_id = organization_members.organization_id 
            AND om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
        -- Allow users to remove themselves
        OR user_id = auth.uid()
    );

-- Batches policies
CREATE POLICY "Users can view batches in their organizations" ON batches
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Organization members can create batches" ON batches
    FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Organization members can update batches" ON batches
    FOR UPDATE USING (is_org_member(organization_id));

CREATE POLICY "Organization admins can delete batches" ON batches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = batches.organization_id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Batch_schema policies
CREATE POLICY "Users can view batch schemas in their organizations" ON batch_schema
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Organization members can create batch schemas" ON batch_schema
    FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Organization members can update batch schemas" ON batch_schema
    FOR UPDATE USING (is_org_member(organization_id));

CREATE POLICY "Organization admins can delete batch schemas" ON batch_schema
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = batch_schema.organization_id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Captures_universal policies
CREATE POLICY "Users can view captures in their organizations" ON captures_universal
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Organization members can insert captures" ON captures_universal
    FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY "Organization members can update captures" ON captures_universal
    FOR UPDATE USING (is_org_member(organization_id));

CREATE POLICY "Organization admins can delete captures" ON captures_universal
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = captures_universal.organization_id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );

-- Billing_org policies
CREATE POLICY "Users can view billing for their organizations" ON billing_org
    FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "Organization admins can manage billing" ON billing_org
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM organization_members 
            WHERE organization_members.organization_id = billing_org.organization_id 
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('owner', 'admin')
        )
    );