-- Create captures table for mobile app compatibility
CREATE TABLE captures (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id UUID NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    rfid_tag TEXT NOT NULL,
    field_data JSONB NOT NULL DEFAULT '{}',
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    accuracy_m NUMERIC(8,2),
    location TEXT, -- For web app compatibility (derived from lat/lng)
    captured_at TIMESTAMPTZ NOT NULL,
    source_device_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_captures_batch_id ON captures(batch_id);
CREATE INDEX idx_captures_rfid_tag ON captures(rfid_tag);
CREATE INDEX idx_captures_captured_at ON captures(captured_at);
CREATE INDEX idx_captures_created_at ON captures(created_at DESC);

-- Create composite indexes for common query patterns
CREATE INDEX idx_captures_batch_captured ON captures(batch_id, captured_at DESC);

-- Add trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_captures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Auto-generate location string from lat/lng if provided
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location = NEW.latitude || ',' || NEW.longitude;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_captures_updated_at
    BEFORE UPDATE ON captures
    FOR EACH ROW
    EXECUTE FUNCTION update_captures_updated_at();

-- Add trigger to set location on insert
CREATE TRIGGER trigger_captures_insert_location
    BEFORE INSERT ON captures
    FOR EACH ROW
    EXECUTE FUNCTION update_captures_updated_at();

-- Add comments for documentation
COMMENT ON TABLE captures IS 'RFID capture data table for mobile/web app compatibility';
COMMENT ON COLUMN captures.id IS 'Auto-incrementing primary key';
COMMENT ON COLUMN captures.batch_id IS 'Batch this capture belongs to';
COMMENT ON COLUMN captures.rfid_tag IS 'RFID tag identifier that was read';
COMMENT ON COLUMN captures.field_data IS 'JSON object containing capture form data';
COMMENT ON COLUMN captures.latitude IS 'Latitude coordinate where capture was made';
COMMENT ON COLUMN captures.longitude IS 'Longitude coordinate where capture was made';
COMMENT ON COLUMN captures.accuracy_m IS 'GPS accuracy in meters';
COMMENT ON COLUMN captures.location IS 'Location string (lat,lng) for web app compatibility';
COMMENT ON COLUMN captures.captured_at IS 'Timestamp when the RFID tag was captured';
COMMENT ON COLUMN captures.source_device_id IS 'Identifier of the device that made the capture';

-- Enable Row Level Security
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;