# AGENTIC_PLATFORM.md — GroTap Agentic Engineering Platform

## 0) Purpose

This document is the "binder" for GroTap's agentic engineering platform:

- How cases flow from intake → plan → PR → review → deploy
- What each agent is allowed to do (and not do)
- What data is stored, where, and why
- How to operate and troubleshoot the pipeline

**Authority:** PROJECT.md → docs/ARCHITECTURE.md → AGENT_RULES.md → docs/TECH-STACK.md → CLAUDE.md (root + scoped)

Related:

- Live implementation status: docs/AGENTIC_BUILD_STATUS.md
- Operations & recovery: docs/RUNBOOK.md
- Agent guardrails: AGENT_RULES.md
- Scoped agent rules: src/agent/CLAUDE.md

---

## 1) High-level system overview

### 1.1 What the platform does

GroTap's agentic pipeline turns app-submitted bug reports and enhancement requests into:

- a deterministic plan (via Claude AI)
- a scoped branch + PR (via Octokit)
- tests + smoke checks
- review + approval gates (human-in-the-loop for high-risk)
- merge + release notes

### 1.2 Repos and runtime

| Component | Repo | Hosting |
|-----------|------|---------|
| API + Dashboard + Pipeline | `aaronallison/grotap` (private) | Railway |
| Queue (Redis) | Railway Redis plugin | Railway |
| Database | Supabase (Postgres + Auth) | Supabase Cloud |
| AI | Anthropic Claude API | Anthropic |

**Branches:** `develop` → beta, `main` → production.

(See docs/AGENTIC_BUILD_STATUS.md for current deployment state.)

---

## 2) Roles and responsibilities

### 2.1 Human roles

- **Agent Manager (human):** approves plans at review gates, approves PR merges, blocks risky scope
- **Engineer:** can override/merge, handles complex incidents, improves guardrails

### 2.2 Automated agents (stage handlers)

Each stage in the pipeline is implemented as a handler function in `src/agent/stages/`:

| Agent | File | Status | What it does |
|-------|------|--------|-------------|
| Intake | `intake.js` | Live | Validates case data is complete (title, case_type) |
| Triage | `triage.js` | Live | Classifies area, severity, risk flags via Claude AI |
| Planner | `planner.js` | Live | Generates implementation plan with steps, files, criteria via Claude AI |
| Plan Review | `planReview.js` | Stub | Auto-passes low-risk cases; orchestrator gates high-risk |
| Executor | `executor.js` | Stub | Will create branch + implement changes via Claude + Octokit |
| Fix Review | `fixReview.js` | Stub | Will validate diff, tests, and risks |
| Policy Review | `policyReview.js` | Stub | Will check security, tenancy, compliance |
| Change Review | `changeReview.js` | Stub | Will check PR hygiene + rollback notes |
| Promote Beta | `promoteBeta.js` | Stub | Optional staging deploy path |
| Close | `close.js` | Live | Writes closing artifact, marks case complete |

Each agent must follow AGENT_RULES.md and CLAUDE.md.

**Stub stages** auto-pass and return `{ advance: true }`. They will be fully implemented as the platform matures.

---

## 3) Case lifecycle (state machine)

### 3.1 Stage progression

The orchestrator (`src/agent/orchestrator.js`) drives cases through 10 ordered stages:

```
intake → triage → plan → plan_review → execute → fix_review → policy_review → change_review → promote_beta → close
```

### 3.2 Stage details

| # | Stage | Handler | Produces | Advances to |
|---|-------|---------|----------|-------------|
| 1 | `intake` | `handleIntake` | Validated case record | triage |
| 2 | `triage` | `handleTriage` | area, severity, risk_flags, reproducibility (written to `cases.metadata.triage`) | plan |
| 3 | `plan` | `handlePlan` | Versioned plan stored in `plans` table (steps, files_affected, acceptance_criteria, risk_assessment) | plan_review |
| 4 | `plan_review` | `handlePlanReview` | Approval gate — auto-passes low risk; orchestrator creates `approvals` record for high risk | execute |
| 5 | `execute` | `handleExecute` | Branch + code changes + tests (stub: auto-passes) | fix_review |
| 6 | `fix_review` | `handleFixReview` | Diff validation + test results (stub: auto-passes) | policy_review |
| 7 | `policy_review` | `handlePolicyReview` | Security + tenancy + compliance check (stub: auto-passes) | change_review |
| 8 | `change_review` | `handleChangeReview` | PR hygiene + rollback notes (stub: auto-passes) | promote_beta |
| 9 | `promote_beta` | `handlePromoteBeta` | Optional staging deploy (stub: auto-passes) | close |
| 10 | `close` | `handleClose` | Closing artifact in `artifacts` table (summary, pr_url, branch, closed_at) | — (terminal) |

### 3.3 Case statuses

Defined in the `cases.status` column:

| Status | Meaning |
|--------|---------|
| `open` | Ready for the next stage handler to pick up |
| `in_progress` | Currently being processed by a stage handler |
| `blocked` | Waiting on external dependency |
| `needs_human` | Approval gate — requires human action via `POST /api/tasks/:id/approve` |
| `completed` | All stages done (terminal) |
| `failed` | Max retries exceeded or unrecoverable error (terminal) |
| `cancelled` | Manually cancelled (terminal) |

### 3.4 Bounded loops and retries

- Each case has `retry_count` (current) and `max_retries` (default: 3)
- On stage handler error: `retry_count` increments, case returns to `open` for re-processing
- When `retry_count >= max_retries`: case status → `failed`, escalation event recorded
- BullMQ also has job-level retries: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Escalation:** failed cases require human review — query `cases WHERE status = 'failed'`

### 3.5 Review gates (human-in-the-loop)

The orchestrator checks risk flags before entering any review stage (`plan_review`, `fix_review`, `policy_review`, `change_review`):

- If `risk_flags` contains any of: `auth`, `billing`, `security`, `rls` → **always requires human approval**
- Otherwise → auto-passes to the next stage

When a gate is triggered:
1. Case status → `needs_human`
2. Approval record inserted into `approvals` table (status: `pending`)
3. Event recorded: `approval_request`
4. Processing stops until human calls `POST /api/tasks/:id/approve`
5. On approval: case status → `in_progress`, re-enqueued for the current stage

---

## 4) Trust and autopass policy

### 4.1 Never-autopass categories

The following risk flag values **always** require human approval at review gates:

```javascript
const NEVER_AUTOPASS = ['auth', 'billing', 'security', 'rls'];
```

These are defined in `src/agent/orchestrator.js` and checked via `hasHighRiskFlags()`.

### 4.2 Autopass conditions

A case can auto-pass through review gates when:
- `risk_flags` array is empty or contains only non-sensitive flags
- The stage handler returns `{ advance: true, needsHuman: false }`

### 4.3 Stop conditions

The orchestrator stops processing and waits for human intervention when:
- Stage handler returns `{ needsHuman: true }` — any stage can request this
- Stage handler returns `{ error: "..." }` and max retries exceeded
- Stage handler throws an unexpected exception
- Case enters a review gate with high-risk flags

### 4.4 Worker rate limiting

BullMQ worker settings (defined in `src/queue/worker.js`):
- Concurrency: 2 jobs in parallel
- Rate limit: max 5 jobs per 60 seconds
- This prevents runaway processing and API abuse

---

## 5) Data model (agentic tables)

The five core agentic tables are defined in `supabase/migrations/00002_agentic_tables.sql`. The `cobrowse_sessions` table is defined separately in `00003_cobrowse_sessions.sql` (see docs/COBROWSE.md). Every table has RLS enabled and is scoped by `org_id`.

### 5.1 cases

The primary record for each bug report or enhancement request.

| Column | Type | Purpose |
|--------|------|---------|
| `case_id` | UUID (PK) | Auto-generated |
| `org_id` | UUID | Tenant scoping (RLS) |
| `title` | TEXT | Short description |
| `description` | TEXT | Full description |
| `case_type` | TEXT | `bug`, `enhancement`, or `task` |
| `severity` | TEXT | `critical`, `high`, `medium`, `low` (set by triage) |
| `area` | TEXT | Affected area (set by triage) |
| `stage` | TEXT | Current pipeline stage (see section 3.2) |
| `status` | TEXT | Current status (see section 3.3) |
| `risk_flags` | JSONB | Array of risk categories (e.g., `["auth", "rls"]`) |
| `metadata` | JSONB | Extensible — includes `triage` sub-object after triage stage |
| `branch_name` | TEXT | Git branch (set by executor) |
| `pr_url` | TEXT | Pull request URL (set by executor) |
| `submitted_by` | UUID | User who created the case |
| `assigned_to` | TEXT | Default: `agent` |
| `retry_count` | INT | Current retry count for the current stage |
| `max_retries` | INT | Default: 3 |

**Written by:** API (POST /api/tasks), orchestrator (stage transitions)
**Read by:** API (GET /api/tasks), orchestrator, dashboard (cases.html)

### 5.2 case_events

Audit timeline — every stage transition, error, and approval is logged.

| Column | Type | Purpose |
|--------|------|---------|
| `event_id` | UUID (PK) | Auto-generated |
| `case_id` | UUID (FK → cases) | Parent case |
| `org_id` | UUID | Tenant scoping |
| `stage` | TEXT | Stage where the event occurred |
| `event_type` | TEXT | `stage_enter`, `stage_exit`, `error`, `approval_request`, `approval_granted`, `approval_rejected`, `escalation`, `note` |
| `actor` | TEXT | `system` or user ID |
| `summary` | TEXT | Human-readable description |
| `details` | JSONB | Additional structured data |

**Written by:** orchestrator (every stage transition), API (approvals)
**Read by:** API (GET /api/tasks/:id), dashboard

### 5.3 plans

Versioned implementation plans generated by the planner stage.

| Column | Type | Purpose |
|--------|------|---------|
| `plan_id` | UUID (PK) | Auto-generated |
| `case_id` | UUID (FK → cases) | Parent case |
| `org_id` | UUID | Tenant scoping |
| `version` | INT | Incrementing version per case |
| `implementation` | JSONB | Steps, files_affected, acceptance_criteria |
| `risk_assessment` | JSONB | Level, categories, notes |
| `review_status` | TEXT | `pending`, `approved`, `rejected`, `needs_revision` |
| `review_notes` | TEXT | Human reviewer comments |
| `reviewed_by` | TEXT | Who approved/rejected |

**Written by:** planner stage handler
**Read by:** API (GET /api/tasks/:id), review stages

**Unique constraint:** `(case_id, version)` — prevents duplicate versions.

### 5.4 artifacts

Output artifacts from any stage (logs, diffs, test results, screenshots).

| Column | Type | Purpose |
|--------|------|---------|
| `artifact_id` | UUID (PK) | Auto-generated |
| `case_id` | UUID (FK → cases) | Parent case |
| `org_id` | UUID | Tenant scoping |
| `artifact_type` | TEXT | `pr_link`, `test_results`, `diff_summary`, `log`, `screenshot`, `review_report` |
| `content` | JSONB | Type-specific payload |

**Written by:** stage handlers (close stage writes the closing artifact)
**Read by:** API, dashboard

### 5.5 approvals

Human approval gates — created when high-risk cases enter review stages.

| Column | Type | Purpose |
|--------|------|---------|
| `approval_id` | UUID (PK) | Auto-generated |
| `case_id` | UUID (FK → cases) | Parent case |
| `org_id` | UUID | Tenant scoping |
| `stage` | TEXT | Stage requiring approval |
| `gate_type` | TEXT | `plan_review`, `fix_review`, `policy_review`, `change_review`, `promote` |
| `status` | TEXT | `pending`, `approved`, `rejected` |
| `requested_at` | TIMESTAMPTZ | When gate was created |
| `decided_at` | TIMESTAMPTZ | When human acted |
| `decided_by` | TEXT | User who approved/rejected |
| `reason` | TEXT | Optional justification |

**Written by:** orchestrator (creates pending), API (updates on approve)
**Read by:** API (GET /api/tasks/:id), dashboard

### 5.6 RLS policy

All five tables use the same RLS pattern:

```sql
CREATE POLICY "<table>_org_isolation" ON <table>
  USING (org_id = auth.uid()::uuid)
  WITH CHECK (org_id = auth.uid()::uuid);
```

The API server uses `supabaseAdmin` (service role key, bypasses RLS) with explicit `.eq('org_id', req.orgId)` filters to enforce tenancy at the application level.

---

## 6) Security model (non-negotiables)

These rules are enforced by AGENT_RULES.md, CLAUDE.md, and the orchestrator:

1. **PR-only workflow** — agents never push to `main` or `develop` directly
2. **No secrets in logs** — Pino structured logging; no credential values in output
3. **No weakening RLS** — every agentic table has org_id scoping + RLS enabled
4. **Never-autopass for sensitive areas** — `auth`, `billing`, `security`, `rls` changes always require human approval
5. **Audit trail** — every stage transition, error, and approval is recorded in `case_events`
6. **Retry limits** — max 3 retries per stage, then escalate to human
7. **Rate limiting** — BullMQ worker limited to 5 jobs/minute, 2 concurrent
8. **Auth required** — all `/api/tasks` endpoints require `requireAuth` middleware

See also: AGENT_RULES.md section 7 (Security checklist for reviewer agent).

---

## 7) Interfaces

### 7.1 Product UI surface

The Cases page (`/cases`, served from `src/dashboard/public/cases.html`) provides:

- Case list with filtering by stage, status, type
- Case detail view with stage progress, events timeline, plans, and approvals
- Approve button for cases in `needs_human` status
- PR link display when available

### 7.2 API surface

All endpoints require authentication (JWT or API key).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST /api/tasks` | Create a new case → enqueues to intake stage | Primary pipeline entry point |
| `GET /api/tasks` | List cases for the org (paginated, filterable by stage/status/type) | Dashboard list view |
| `GET /api/tasks/:id` | Single case with events, plans, and approvals | Dashboard detail view |
| `POST /api/tasks/:id/approve` | Human approval for a gate → re-enqueues case | Unblock `needs_human` cases |

**POST /api/tasks** request body:

```json
{
  "title": "Fix login redirect bug",
  "description": "After login, users are redirected to /home instead of /dashboard",
  "case_type": "bug",
  "severity": "high",
  "area": "auth",
  "metadata": {}
}
```

Required fields: `title`, `case_type`. All other fields are optional.

### 7.3 Queue interface

- Queue name: `grotap-cases`
- Job data: `{ caseId, stage, enqueuedAt }`
- Job ID format: `{caseId}-{stage}-{timestamp}`
- Default job options: 3 attempts, exponential backoff (2s base), retain last 1000 completed / 5000 failed

---

## 8) Operations (how to run it)

### 8.1 Required infrastructure

| Service | Purpose | Config |
|---------|---------|--------|
| Railway API Service | Hosts Express API + BullMQ worker | Watches `develop` or `main` branch |
| Railway Redis plugin | BullMQ job queue | Auto-injects `REDIS_URL` |
| Supabase | Database + Auth | Needs migrations applied |
| Anthropic API | Claude AI for triage + planning | `ANTHROPIC_API_KEY` |
| GitHub API | Branch/PR creation (when executor is live) | `GITHUB_TOKEN` + `GITHUB_REPO_URL` |

### 8.2 Standard run commands

**Local development:**

```bash
npm install                     # Install dependencies
npm run dev                     # Start API server (port 3000)
node src/queue/worker.js        # Start queue worker (separate terminal)
```

**Tests and lint:**

```bash
npm test                        # Run all tests (vitest)
npm run lint                    # ESLint check
```

**Supabase migrations:**

```bash
supabase db push                # Apply pending migrations
```

**Railway (production):**

Railway handles build and start automatically via `railway.toml`:
- Build: `npm ci --omit=dev`
- Start: `node src/api/server.js`
- Health check: `GET /api/health` (30s timeout)

### 8.3 Alerts and observability

**Logs:** Pino structured JSON, available in Railway → service → Logs tab.

**Key events to monitor:**

| Event | Log pattern | Severity |
|-------|-------------|----------|
| Worker started | `"Case worker started"` | Info |
| Case enqueued | `"Case enqueued"` | Info |
| Job completed | `"Job completed"` | Info |
| Job failed | `"Job failed"` | Error |
| Max retries exceeded | `"Max retries exceeded"` | Error — needs human |
| Redis connection lost | `"Redis: giving up after 5 retries"` | Error — queue down |
| Stage handler crash | `"Stage handler threw unexpectedly"` | Error — case failed |

**When to pause the pipeline:** See docs/RUNBOOK.md section 5.2.

---

## 9) Failure modes and escalation

| Failure | Detection | Impact | Recovery |
|---------|-----------|--------|----------|
| **Stage handler error** | `result.error` returned | Case retries (up to max_retries) | Automatic — check after 3 retries |
| **Stage handler crash** | `catch` block in orchestrator | Case status → `failed` | Manual: investigate logs, reset case |
| **Max retries exceeded** | `retry_count >= max_retries` | Case status → `failed`, escalation event | Manual: fix root cause, reset case (see RUNBOOK.md section 5.3) |
| **Redis unavailable** | `"Cannot start worker"` log | Queue disabled, API still works | Automatic recovery when Redis reconnects (retry strategy: 5 attempts, 500ms–3s backoff) |
| **Supabase unreachable** | Health check returns `"degraded"` | API returns 503 | Check Supabase status, verify env vars |
| **Missing env var** | Server crash on startup | Service down | Add env var in Railway, redeploy |
| **Stage mismatch** | `"Stage mismatch — skipping"` log | Duplicate job ignored | No action needed — guard prevents double-processing |
| **Anthropic API error** | Triage or plan stage returns error | Case retries | Check API key, check Anthropic status |
| **GitHub API error** | Executor stage returns error (when live) | Case retries | Check token permissions, check GitHub status |

**Golden rule:** When in doubt, stop and escalate. The orchestrator never silently swallows errors — every failure is logged and recorded in `case_events`.

---

## 10) Change management

### 10.1 Adding a new stage

1. Create the handler in `src/agent/stages/newStage.js` — export an async function matching the signature: `async function handleNewStage(caseData) → { advance, needsHuman, error, summary }`
2. Import the handler in `src/agent/orchestrator.js`
3. Add the stage name to the `STAGES` array at the correct position
4. Add the handler to the `STAGE_HANDLERS` map
5. Update the `cases.stage` CHECK constraint in a new migration
6. Add the gate_type to `approvals.gate_type` CHECK constraint if it's a review stage
7. Add tests for the new handler
8. Update this document (section 3.2)

### 10.2 Changing prompts

Prompts live in `src/agent/lib/prompts.js`. The triage and plan prompts are template functions that receive `caseData`.

To change safely:
1. Modify the prompt in `prompts.js`
2. Test with a sample case locally
3. Push to develop → verify on beta with a real case
4. Only merge to main after confirming output quality

### 10.3 Changing trust policy

The never-autopass list is defined in `src/agent/orchestrator.js`:

```javascript
const NEVER_AUTOPASS = ['auth', 'billing', 'security', 'rls'];
```

To add a category: add the string to the array. To remove: delete it (requires human approval per AGENT_RULES.md section 4).

### 10.4 Safe rollout checklist

1. All tests pass (`npm test`)
2. Lint clean (`npm run lint`)
3. Push to develop, verify on beta
4. Run at least one case end-to-end on beta
5. Merge to main only after beta confirmation
6. Monitor Railway logs for the first hour after production deploy
