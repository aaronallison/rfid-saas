-- Create billing_org table
CREATE TABLE billing_org (
    org_id UUID PRIMARY KEY REFERENCES organizations(org_id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    billing_status TEXT CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled')) DEFAULT 'trialing',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT billing_stripe_customer_unique UNIQUE (stripe_customer_id),
    CONSTRAINT billing_stripe_subscription_unique UNIQUE (stripe_subscription_id)
);

-- Create indexes for performance
CREATE INDEX idx_billing_org_stripe_customer ON billing_org(stripe_customer_id);
CREATE INDEX idx_billing_org_stripe_subscription ON billing_org(stripe_subscription_id);
CREATE INDEX idx_billing_org_status ON billing_org(billing_status);

-- Create updated_at trigger
CREATE TRIGGER update_billing_org_updated_at 
    BEFORE UPDATE ON billing_org 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE billing_org ENABLE ROW LEVEL SECURITY;