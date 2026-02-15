-- Create captures_universal table
CREATE TABLE captures_universal (
    cntid BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(batch_id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'data' CHECK (type IN ('data', 'metadata', 'error')),
    f1 TEXT,
    f2 TEXT,
    f3 TEXT,
    f4 TEXT,
    f5 TEXT,
    f6 TEXT,
    f7 TEXT,
    f8 TEXT,
    f9 TEXT,
    f10 TEXT,
    f11 TEXT,
    f12 TEXT,
    f13 TEXT,
    f14 TEXT,
    f15 TEXT,
    f16 TEXT,
    f17 TEXT,
    f18 TEXT,
    f19 TEXT,
    f20 TEXT,
    f21 TEXT,
    f22 TEXT,
    f23 TEXT,
    f24 TEXT,
    f25 TEXT,
    rfid_tag TEXT,
    lat NUMERIC(10,8), -- Better precision for latitude
    lng NUMERIC(11,8), -- Better precision for longitude  
    accuracy_m NUMERIC(8,2), -- Accuracy in meters with 2 decimal places
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_device_id TEXT,
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_captures_universal_org_id ON captures_universal(org_id);
CREATE INDEX idx_captures_universal_batch_id ON captures_universal(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_captures_universal_rfid_tag ON captures_universal(rfid_tag) WHERE rfid_tag IS NOT NULL;
CREATE INDEX idx_captures_universal_captured_at ON captures_universal(captured_at);
CREATE INDEX idx_captures_universal_synced_at ON captures_universal(synced_at) WHERE synced_at IS NULL;
CREATE INDEX idx_captures_universal_type ON captures_universal(type);

-- Create composite indexes for common query patterns
CREATE INDEX idx_captures_universal_org_batch ON captures_universal(org_id, batch_id);
CREATE INDEX idx_captures_universal_org_captured ON captures_universal(org_id, captured_at DESC);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_captures_universal_updated_at()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_captures_universal_updated_at
    BEFORE UPDATE ON captures_universal
    FOR EACH ROW
    EXECUTE FUNCTION update_captures_universal_updated_at();

-- Add comments for documentation
COMMENT ON TABLE captures_universal IS 'Universal table for storing RFID capture data with flexible schema';
COMMENT ON COLUMN captures_universal.cntid IS 'Auto-incrementing primary key for captures';
COMMENT ON COLUMN captures_universal.org_id IS 'Organization that owns this capture';
COMMENT ON COLUMN captures_universal.batch_id IS 'Optional batch this capture belongs to';
COMMENT ON COLUMN captures_universal.type IS 'Type of capture: data, metadata, or error';
COMMENT ON COLUMN captures_universal.f1 IS 'Flexible field 1 - meaning defined by batch schema';
COMMENT ON COLUMN captures_universal.f25 IS 'Flexible field 25 - meaning defined by batch schema';
COMMENT ON COLUMN captures_universal.rfid_tag IS 'RFID tag identifier that was read';
COMMENT ON COLUMN captures_universal.lat IS 'Latitude coordinate where capture was made';
COMMENT ON COLUMN captures_universal.lng IS 'Longitude coordinate where capture was made';
COMMENT ON COLUMN captures_universal.accuracy_m IS 'GPS accuracy in meters';
COMMENT ON COLUMN captures_universal.captured_at IS 'Timestamp when the RFID tag was captured';
COMMENT ON COLUMN captures_universal.source_device_id IS 'Identifier of the device that made the capture';
COMMENT ON COLUMN captures_universal.synced_at IS 'Timestamp when this record was synced to cloud';

-- Enable Row Level Security
ALTER TABLE captures_universal ENABLE ROW LEVEL SECURITY;