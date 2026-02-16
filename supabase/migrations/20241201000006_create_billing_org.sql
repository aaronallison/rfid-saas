-- Create billing_org table
CREATE TABLE billing_org (
    org_id UUID PRIMARY KEY REFERENCES organizations(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    billing_status TEXT CHECK (billing_status IN ('trialing', 'active', 'past_due', 'canceled')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE billing_org ENABLE ROW LEVEL SECURITY;