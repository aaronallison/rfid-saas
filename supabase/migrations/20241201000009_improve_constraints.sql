-- Improve foreign key constraints with proper CASCADE options

-- Drop existing foreign keys and recreate with CASCADE options
ALTER TABLE org_members DROP CONSTRAINT org_members_org_id_fkey;
ALTER TABLE org_members ADD CONSTRAINT org_members_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;

ALTER TABLE batches DROP CONSTRAINT batches_org_id_fkey;
ALTER TABLE batches ADD CONSTRAINT batches_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;

ALTER TABLE batch_schema DROP CONSTRAINT batch_schema_batch_id_fkey;
ALTER TABLE batch_schema ADD CONSTRAINT batch_schema_batch_id_fkey 
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE;

ALTER TABLE batch_schema DROP CONSTRAINT batch_schema_org_id_fkey;
ALTER TABLE batch_schema ADD CONSTRAINT batch_schema_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;

ALTER TABLE captures_universal DROP CONSTRAINT captures_universal_org_id_fkey;
ALTER TABLE captures_universal ADD CONSTRAINT captures_universal_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;

ALTER TABLE captures_universal DROP CONSTRAINT captures_universal_batch_id_fkey;
ALTER TABLE captures_universal ADD CONSTRAINT captures_universal_batch_id_fkey 
    FOREIGN KEY (batch_id) REFERENCES batches(batch_id) ON DELETE CASCADE;

ALTER TABLE billing_org DROP CONSTRAINT billing_org_org_id_fkey;
ALTER TABLE billing_org ADD CONSTRAINT billing_org_org_id_fkey 
    FOREIGN KEY (org_id) REFERENCES organizations(org_id) ON DELETE CASCADE;

-- Add unique constraint on batch_id for batch_schema (one schema per batch)
ALTER TABLE batch_schema ADD CONSTRAINT unique_batch_schema 
    UNIQUE (batch_id);