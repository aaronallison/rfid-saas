-- Create billing_org table
CREATE TABLE billing_org (
    org_id UUID PRIMARY KEY REFERENCES organizations(org_id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    billing_status TEXT CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled')) DEFAULT 'trialing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_billing_org_stripe_customer ON billing_org(stripe_customer_id);
CREATE INDEX idx_billing_org_status ON billing_org(billing_status);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_billing_org_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER billing_org_updated_at_trigger
    BEFORE UPDATE ON billing_org
    FOR EACH ROW
    EXECUTE FUNCTION update_billing_org_updated_at();

-- Enable Row Level Security
ALTER TABLE billing_org ENABLE ROW LEVEL SECURITY;