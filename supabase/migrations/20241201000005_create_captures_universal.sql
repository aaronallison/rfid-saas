-- Create captures_universal table
CREATE TABLE captures_universal (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cntid BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE, -- For backward compatibility
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_id UUID GENERATED ALWAYS AS (organization_id) STORED, -- For backward compatibility
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'data' CHECK (type IN ('data', 'metadata')) NOT NULL,
    f1 TEXT CHECK (length(f1) <= 500),
    f2 TEXT CHECK (length(f2) <= 500),
    f3 TEXT CHECK (length(f3) <= 500),
    f4 TEXT CHECK (length(f4) <= 500),
    f5 TEXT CHECK (length(f5) <= 500),
    f6 TEXT CHECK (length(f6) <= 500),
    f7 TEXT CHECK (length(f7) <= 500),
    f8 TEXT CHECK (length(f8) <= 500),
    f9 TEXT CHECK (length(f9) <= 500),
    f10 TEXT CHECK (length(f10) <= 500),
    f11 TEXT CHECK (length(f11) <= 500),
    f12 TEXT CHECK (length(f12) <= 500),
    f13 TEXT CHECK (length(f13) <= 500),
    f14 TEXT CHECK (length(f14) <= 500),
    f15 TEXT CHECK (length(f15) <= 500),
    f16 TEXT CHECK (length(f16) <= 500),
    f17 TEXT CHECK (length(f17) <= 500),
    f18 TEXT CHECK (length(f18) <= 500),
    f19 TEXT CHECK (length(f19) <= 500),
    f20 TEXT CHECK (length(f20) <= 500),
    f21 TEXT CHECK (length(f21) <= 500),
    f22 TEXT CHECK (length(f22) <= 500),
    f23 TEXT CHECK (length(f23) <= 500),
    f24 TEXT CHECK (length(f24) <= 500),
    f25 TEXT CHECK (length(f25) <= 500),
    rfid_tag TEXT CHECK (length(rfid_tag) <= 100),
    lat NUMERIC CHECK (lat >= -90 AND lat <= 90),
    lng NUMERIC CHECK (lng >= -180 AND lng <= 180),
    accuracy_m NUMERIC CHECK (accuracy_m >= 0),
    captured_at TIMESTAMPTZ NOT NULL,
    source_device_id TEXT CHECK (length(source_device_id) <= 100),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_captures_universal_organization_id ON captures_universal(organization_id);
CREATE INDEX idx_captures_universal_batch_id ON captures_universal(batch_id);
CREATE INDEX idx_captures_universal_rfid_tag ON captures_universal(rfid_tag);
CREATE INDEX idx_captures_universal_captured_at ON captures_universal(captured_at);
CREATE INDEX idx_captures_universal_synced_at ON captures_universal(synced_at);

-- Enable Row Level Security
ALTER TABLE captures_universal ENABLE ROW LEVEL SECURITY;