-- Create organizations table with proper constraints and indexes
CREATE TABLE organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    slug TEXT UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for better query performance
CREATE INDEX idx_organizations_name ON organizations (name);
CREATE INDEX idx_organizations_slug ON organizations (slug);
CREATE INDEX idx_organizations_created_at ON organizations (created_at);
CREATE INDEX idx_organizations_active ON organizations (is_active) WHERE is_active = true;

-- Create function to automatically generate slug from name
CREATE OR REPLACE FUNCTION generate_org_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate slug from name if not provided
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := lower(trim(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')));
        -- Ensure slug uniqueness
        WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = NEW.slug AND org_id != COALESCE(NEW.org_id, gen_random_uuid())) LOOP
            NEW.slug := NEW.slug || '-' || substr(gen_random_uuid()::text, 1, 8);
        END LOOP;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for slug generation and timestamp updates
CREATE TRIGGER trigger_generate_org_slug
    BEFORE INSERT OR UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION generate_org_slug();

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON TABLE organizations IS 'Core organizations table with automatic slug generation';
COMMENT ON COLUMN organizations.org_id IS 'Primary key - UUID automatically generated';
COMMENT ON COLUMN organizations.name IS 'Organization display name - must not be empty';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier - auto-generated from name';
COMMENT ON COLUMN organizations.description IS 'Optional organization description';
COMMENT ON COLUMN organizations.is_active IS 'Soft delete flag - allows deactivation instead of deletion';