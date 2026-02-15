-- Create billing_org table
CREATE TABLE billing_org (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    org_id UUID GENERATED ALWAYS AS (organization_id) STORED, -- For backward compatibility
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    billing_status TEXT CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')) DEFAULT 'trialing' NOT NULL,
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create trigger for billing_org table
CREATE TRIGGER update_billing_org_updated_at
    BEFORE UPDATE ON billing_org
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_billing_org_stripe_customer ON billing_org(stripe_customer_id);
CREATE INDEX idx_billing_org_stripe_subscription ON billing_org(stripe_subscription_id);
CREATE INDEX idx_billing_org_status ON billing_org(billing_status);

-- Enable Row Level Security
ALTER TABLE billing_org ENABLE ROW LEVEL SECURITY;