-- Migration 000008: Agentic pipeline tables
-- Creates: cases, case_events, plans, artifacts, approvals
-- All tables scoped by org_id with RLS using is_org_member()

-- ============================================================
-- 1. cases
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
  case_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(org_id),
  title         TEXT NOT NULL,
  description   TEXT,
  case_type     TEXT NOT NULL CHECK (case_type IN ('bug', 'enhancement', 'task')),
  severity      TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  area          TEXT,
  stage         TEXT NOT NULL DEFAULT 'intake' CHECK (stage IN (
    'intake', 'triage', 'plan', 'plan_review', 'execute',
    'fix_review', 'policy_review', 'change_review', 'promote_beta', 'close'
  )),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'blocked', 'needs_human', 'completed', 'failed', 'cancelled'
  )),
  risk_flags    JSONB DEFAULT '[]'::jsonb,
  metadata      JSONB DEFAULT '{}'::jsonb,
  branch_name   TEXT,
  pr_url        TEXT,
  submitted_by  UUID,
  assigned_to   TEXT DEFAULT 'agent',
  retry_count   INT DEFAULT 0,
  max_retries   INT DEFAULT 3,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_org_id ON cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(stage);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cases_org_isolation" ON cases
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ============================================================
-- 2. case_events (audit timeline)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_events (
  event_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES organizations(org_id),
  stage       TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'stage_enter', 'stage_exit', 'error', 'approval_request',
    'approval_granted', 'approval_rejected', 'escalation', 'note'
  )),
  actor       TEXT NOT NULL DEFAULT 'system',
  summary     TEXT,
  details     JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_events_case_id ON case_events(case_id);
CREATE INDEX IF NOT EXISTS idx_case_events_org_id ON case_events(org_id);

ALTER TABLE case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_events_org_isolation" ON case_events
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ============================================================
-- 3. plans
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  plan_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES organizations(org_id),
  version         INT NOT NULL DEFAULT 1,
  implementation  JSONB NOT NULL,
  risk_assessment JSONB DEFAULT '{}'::jsonb,
  review_status   TEXT DEFAULT 'pending' CHECK (review_status IN (
    'pending', 'approved', 'rejected', 'needs_revision'
  )),
  review_notes    TEXT,
  reviewed_by     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_case_id ON plans(case_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_case_version ON plans(case_id, version);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_org_isolation" ON plans
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ============================================================
-- 4. artifacts
-- ============================================================
CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(org_id),
  artifact_type TEXT NOT NULL CHECK (artifact_type IN (
    'pr_link', 'test_results', 'diff_summary', 'log', 'screenshot', 'review_report'
  )),
  content       JSONB NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_case_id ON artifacts(case_id);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "artifacts_org_isolation" ON artifacts
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));

-- ============================================================
-- 5. approvals
-- ============================================================
CREATE TABLE IF NOT EXISTS approvals (
  approval_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES cases(case_id) ON DELETE CASCADE,
  org_id        UUID NOT NULL REFERENCES organizations(org_id),
  stage         TEXT NOT NULL,
  gate_type     TEXT NOT NULL CHECK (gate_type IN (
    'plan_review', 'fix_review', 'policy_review', 'change_review', 'promote'
  )),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected'
  )),
  requested_at  TIMESTAMPTZ DEFAULT now(),
  decided_at    TIMESTAMPTZ,
  decided_by    TEXT,
  reason        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_case_id ON approvals(case_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvals_org_isolation" ON approvals
  FOR ALL
  USING (is_org_member(org_id))
  WITH CHECK (is_org_member(org_id));
