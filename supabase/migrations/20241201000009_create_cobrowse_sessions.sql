-- Migration 000009: Cobrowse.io session audit log
-- Tracks co-browsing sessions for compliance and support history

CREATE TABLE IF NOT EXISTS cobrowse_sessions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         UUID NOT NULL REFERENCES organizations(org_id),
  user_id        UUID,
  user_email     TEXT,
  session_id     TEXT NOT NULL,
  session_state  TEXT NOT NULL DEFAULT 'pending'
    CHECK (session_state IN ('pending', 'authorizing', 'active', 'ended')),
  started_at     TIMESTAMPTZ DEFAULT now(),
  ended_at       TIMESTAMPTZ,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cobrowse_sessions_org ON cobrowse_sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_cobrowse_sessions_session ON cobrowse_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_cobrowse_sessions_state ON cobrowse_sessions(session_state);

ALTER TABLE cobrowse_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cobrowse_sessions_org_isolation" ON cobrowse_sessions
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- Updated-at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cobrowse_sessions_updated_at
  BEFORE UPDATE ON cobrowse_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
