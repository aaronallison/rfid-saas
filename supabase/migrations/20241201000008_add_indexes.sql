-- Add indexes for better query performance

-- Organizations indexes
CREATE INDEX idx_organizations_name ON organizations(name);

-- Org_members indexes
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_role ON org_members(role);

-- Batches indexes
CREATE INDEX idx_batches_org_id ON batches(org_id);
CREATE INDEX idx_batches_created_by ON batches(created_by);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_created_at ON batches(created_at);

-- Batch_schema indexes
CREATE INDEX idx_batch_schema_batch_id ON batch_schema(batch_id);
CREATE INDEX idx_batch_schema_org_id ON batch_schema(org_id);

-- Captures_universal indexes
CREATE INDEX idx_captures_org_id ON captures_universal(org_id);
CREATE INDEX idx_captures_batch_id ON captures_universal(batch_id);
CREATE INDEX idx_captures_rfid_tag ON captures_universal(rfid_tag);
CREATE INDEX idx_captures_captured_at ON captures_universal(captured_at);
CREATE INDEX idx_captures_synced_at ON captures_universal(synced_at);
CREATE INDEX idx_captures_source_device ON captures_universal(source_device_id);

-- Billing_org indexes (primary key already indexed)
CREATE INDEX idx_billing_status ON billing_org(billing_status);