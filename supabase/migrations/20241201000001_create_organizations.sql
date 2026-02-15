-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID GENERATED ALWAYS AS (id) STORED, -- For backward compatibility
    name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 100),
    slug TEXT NOT NULL CHECK (length(trim(slug)) > 0 AND length(slug) <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(slug)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for organizations table
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index on slug for performance
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;