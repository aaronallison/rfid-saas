-- Create billing_org table
CREATE TABLE billing_org (
    org_id UUID PRIMARY KEY REFERENCES organizations(org_id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    billing_status TEXT CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_billing_org_stripe_customer ON billing_org(stripe_customer_id);
CREATE INDEX idx_billing_org_stripe_subscription ON billing_org(stripe_subscription_id);
CREATE INDEX idx_billing_org_status ON billing_org(billing_status);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_org_updated_at
    BEFORE UPDATE ON billing_org
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_org ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies for this table are defined in rls_policies.sql
-- - Users can view billing for organizations they belong to
-- - Organization admins can manage billing (insert, update, delete)