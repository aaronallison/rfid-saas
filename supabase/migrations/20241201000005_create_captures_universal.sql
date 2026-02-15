-- Create captures_universal table
CREATE TABLE captures_universal (
    cntid BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(batch_id) ON DELETE CASCADE,
    type TEXT DEFAULT 'data',
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
    lat NUMERIC,
    lng NUMERIC,
    accuracy_m NUMERIC,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_device_id TEXT,
    synced_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT captures_rfid_tag_not_empty CHECK (rfid_tag IS NULL OR LENGTH(TRIM(rfid_tag)) > 0),
    CONSTRAINT captures_valid_coordinates CHECK (
        (lat IS NULL AND lng IS NULL) OR 
        (lat IS NOT NULL AND lng IS NOT NULL AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180)
    ),
    CONSTRAINT captures_valid_accuracy CHECK (accuracy_m IS NULL OR accuracy_m >= 0)
);

-- Create indexes for performance
CREATE INDEX idx_captures_org_id ON captures_universal(org_id);
CREATE INDEX idx_captures_batch_id ON captures_universal(batch_id);
CREATE INDEX idx_captures_rfid_tag ON captures_universal(rfid_tag);
CREATE INDEX idx_captures_captured_at ON captures_universal(captured_at DESC);
CREATE INDEX idx_captures_source_device_id ON captures_universal(source_device_id);

-- Compound indexes for common queries
CREATE INDEX idx_captures_batch_captured_at ON captures_universal(batch_id, captured_at DESC);
CREATE INDEX idx_captures_org_captured_at ON captures_universal(org_id, captured_at DESC);

-- Enable Row Level Security
ALTER TABLE captures_universal ENABLE ROW LEVEL SECURITY;