# GroTap Platform — Operations Runbook

This runbook defines **how to operate, troubleshoot, and recover** the GroTap platform in production and staging environments.

This is a human + agent reference for:

- Incident response
- Service health checks
- Break-glass procedures
- Recovery workflows

**Related docs:** PROJECT.md, docs/ARCHITECTURE.md, docs/AGENTIC_PLATFORM.md, docs/AGENTIC_BUILD_STATUS.md

---

## 1. Environments

| Environment | Branch    | URL                          | Hosting  |
|-------------|-----------|------------------------------|----------|
| Local       | any       | http://localhost:3000         | Dev machine |
| Beta        | develop   | https://beta.grotap.com      | Railway  |
| Production  | main      | https://app.grotap.com       | Railway  |
| Agent VPS   | —         | —                            | Hetzner CPX31 |

**Deployment flow:** push to branch → GitHub Actions CI (lint + test) → Railway auto-deploys.

---

## 2. System Health Checklist

### 2.1 API Health

- [ ] Railway service is running (green in dashboard)
- [ ] `/api/health` endpoint returns 200
- [ ] Supabase connectivity: `checks.supabase === "ok"`
- [ ] Auth middleware responding correctly
- [ ] No spike in 5xx errors

Quick check:

```bash
# Beta
curl https://beta.grotap.com/api/health

# Production
curl https://app.grotap.com/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "checks": { "api": "ok", "supabase": "ok" },
  "timestamp": "2026-02-22T..."
}
```

If `status` is `"degraded"`, check which `checks` value is not `"ok"`:
- `"ok"` — healthy
- `"error"` — Supabase reachable but query failed
- `"unreachable"` — Supabase connection attempt failed
- `"not_configured"` — `SUPABASE_URL` not set

### 2.2 Database Health (Supabase)

- [ ] Supabase dashboard shows project active
- [ ] Connection pool not exhausted
- [ ] RLS policies intact (no public access)
- [ ] No failed migrations pending

Check from Supabase dashboard → SQL Editor:

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

All application tables must show `rowsecurity = true`.

### 2.3 Redis / Queue Health

- [ ] Railway Redis plugin shows connected
- [ ] BullMQ worker is processing jobs
- [ ] No stuck jobs in failed state

The API server starts the BullMQ worker automatically via `src/queue/worker.js`. If Redis is unavailable, the server starts in degraded mode (API works, queue disabled).

**Worker settings:** concurrency 2, rate limit 5 jobs/minute, 3 retry attempts with exponential backoff (2s base). Queue name: `grotap-cases`. Full details in docs/AGENTIC_PLATFORM.md section 4.4.

Check logs for:

```
{"level":"info","msg":"Case worker started"}       ← healthy
{"level":"warn","msg":"Cannot start worker — Redis unavailable"}  ← degraded
```

### 2.4 CI Pipeline

- [ ] GitHub Actions passing on develop and main
- [ ] All 82+ tests green
- [ ] ESLint 0 errors

Check: https://github.com/aaronallison/grotap/actions

---

## 3. Common Operations

### 3.1 Deploy a New Release

```bash
# Feature work → develop → beta
git checkout develop
git merge feature/my-change
git push origin develop
# CI runs → Railway deploys to beta automatically

# Promote to production
git checkout main
git merge develop
git push origin main
# CI runs → Railway deploys to production automatically
```

### 3.2 Run Locally

```bash
# Prerequisites: Node 20, .env file with credentials
npm install
npm run dev        # Starts API server on port 3000

# Separate terminal (optional — for queue processing)
node src/queue/worker.js
```

### 3.3 Run Tests & Lint

```bash
npm test           # vitest — runs all 82+ tests
npm run lint       # eslint — must return 0 errors
```

### 3.4 Apply Supabase Migrations

Migrations live in `supabase/migrations/`. To apply:

```bash
# Using Supabase CLI (must be linked to your project)
supabase db push
```

Current migrations:

| File | Content | Status |
|------|---------|--------|
| `00002_agentic_tables.sql` | cases, case_events, plans, artifacts, approvals + RLS | Pending |
| `00003_cobrowse_sessions.sql` | cobrowse_sessions + RLS | Pending |

### 3.5 Add/Change Environment Variables

**Railway (beta/prod):**
1. Railway dashboard → select service → Variables tab
2. Add or update the variable
3. Railway auto-redeploys on variable change

**Locally:** Edit `.env` (never committed — see `.env.example` for reference).

---

## 4. Incident Response

### 4.1 Severity Levels

| Level | Description | Example | Response Time |
|-------|-------------|---------|---------------|
| **P1** | Service down, all users affected | API returns 503, Railway crash loop | Immediate |
| **P2** | Core feature broken | Auth failing, captures not saving | < 1 hour |
| **P3** | Non-critical feature broken | Cobrowse not loading, exports slow | < 4 hours |
| **P4** | Cosmetic / minor | Styling issue, log noise | Next session |

### 4.2 First Response Checklist

1. **Check `/api/health`** — is the API reachable?
2. **Check Railway dashboard** — is the service running? Any crash logs?
3. **Check Railway deploy logs** — did the last deploy fail?
4. **Check Supabase dashboard** — is the database reachable?
5. **Check GitHub Actions** — did CI pass on the last push?

### 4.3 Common Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| 503 on all endpoints | Server crash on startup | Check Railway logs — likely missing env var |
| Health returns `"supabase": "error"` | Supabase unreachable or key wrong | Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` |
| Health returns `"supabase": "not_configured"` | `SUPABASE_URL` not set | Add env var in Railway |
| Queue jobs not processing | Redis unavailable | Check Railway Redis plugin status |
| 401 on all API calls | `API_KEY` mismatch or auth middleware issue | Verify `API_KEY` env var matches client config |
| Rate limited (429) | More than 300 requests in 15 min from same IP | Expected behavior — wait or adjust limiter in `app.js` |
| Build fails on Railway | Missing dependency or Node version mismatch | Check `.nvmrc` (Node 20), run `npm ci` locally to reproduce |

---

## 5. Break-Glass Procedures

### 5.1 Rollback a Bad Deploy

Railway keeps previous deployments. To roll back:

1. Railway dashboard → select service → **Deployments** tab
2. Find the last known-good deployment
3. Click **Redeploy** on that deployment

### 5.2 Disable the Agentic Pipeline

If the pipeline is running amok (e.g., creating bad PRs, infinite retries):

1. **Quick stop:** Remove or blank the `REDIS_URL` variable in Railway → service redeploys without queue processing
2. **Targeted:** In Supabase SQL editor, set failing cases to cancelled:

```sql
UPDATE cases
SET status = 'cancelled', updated_at = now()
WHERE status IN ('open', 'in_progress')
  AND stage != 'close';
```

3. **Restore:** Re-add `REDIS_URL` and redeploy

### 5.3 Reset a Stuck Case

```sql
-- Find stuck cases
SELECT case_id, title, stage, status, retry_count, updated_at
FROM cases
WHERE status = 'in_progress'
  AND updated_at < now() - interval '1 hour';

-- Reset to re-process
UPDATE cases
SET status = 'open', retry_count = 0, updated_at = now()
WHERE case_id = '<case-id>';
```

Then re-enqueue via the API or wait for the worker to pick it up.

### 5.4 Emergency: RLS Compromise Suspected

If you suspect tenant data is leaking:

1. **Immediately** set the service to private (remove public domain in Railway)
2. Run the RLS audit query from section 2.2
3. Check `case_events` and audit logs for cross-org access patterns
4. Fix the policy, deploy, and verify before re-exposing

---

## 6. Monitoring & Logs

### 6.1 Where Logs Live

| Source | Location | Format |
|--------|----------|--------|
| API server | Railway → service → **Logs** tab | Pino structured JSON |
| CI pipeline | GitHub → Actions tab | Standard output |
| Database | Supabase dashboard → **Logs** | Postgres logs |
| Redis | Railway → Redis plugin → **Logs** | Redis logs |

### 6.2 Key Log Patterns to Watch

```
# Healthy operation
{"level":"info","msg":"GroTap API listening","port":3000}
{"level":"info","msg":"Redis connected"}
{"level":"info","msg":"Case worker started"}
{"level":"info","msg":"Case enqueued","caseId":"...","stage":"intake"}
{"level":"info","msg":"Job completed","jobId":"..."}

# Warning (degraded but functional)
{"level":"warn","msg":"REDIS_URL not set — queue functionality disabled"}
{"level":"warn","msg":"Failed to enqueue case"}

# Error (needs attention)
{"level":"error","msg":"Case processing failed","caseId":"..."}
{"level":"error","msg":"Redis: giving up after 5 retries"}
{"level":"error","msg":"Stage handler threw unexpectedly"}
```

### 6.3 When to Pause and Investigate

- Multiple `"Stage handler threw unexpectedly"` errors in a short window
- Any `"Max retries exceeded"` escalation event
- `"Redis: giving up after 5 retries"` — Redis may be down
- 5xx error rate exceeds 5% of requests over 5 minutes

---

## 7. Scheduled Maintenance

### 7.1 Regular Tasks

| Task | Frequency | How |
|------|-----------|-----|
| Review failed cases | Weekly | Query `cases WHERE status = 'failed'` |
| Check pending approvals | Daily | Query `approvals WHERE status = 'pending'` |
| Review Railway usage | Monthly | Railway dashboard → Usage tab |
| Update dependencies | Monthly | `npm outdated` → update + test |
| Rotate API keys | Quarterly | Generate new keys, update env vars, deploy |

### 7.2 Before Major Changes

1. Verify all tests pass locally
2. Push to develop first, verify on beta
3. Only merge to main after beta is confirmed stable
4. Keep the previous Railway deployment available for rollback

---

## 8. Environment Variables Reference

Full list in `.env.example`. Required for server startup:

| Variable | Purpose | Required |
|----------|---------|----------|
| `SUPABASE_URL` | Database connection | Yes |
| `SUPABASE_ANON_KEY` | Client-side Supabase key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase key (bypasses RLS) | Yes |
| `API_KEY` | Agent/machine-to-machine auth for `/api/tasks` | Yes |
| `REDIS_URL` | BullMQ queue connection (auto-injected by Railway Redis plugin) | No (degrades gracefully) |
| `ANTHROPIC_API_KEY` | Claude AI for triage + plan generation | Yes (for pipeline) |
| `GITHUB_TOKEN` | Octokit for branch/PR creation | Yes (for pipeline) |
| `GITHUB_REPO_URL` | Target repo for agent PRs | Yes (for pipeline) |
| `STRIPE_SECRET_KEY` | Payment processing | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Yes |
| `RESEND_API_KEY` | Transactional email | Yes |
| `COBROWSE_API_KEY` | RSA private key for agent JWT signing | No |
| `COBROWSE_API_TOKEN` | License key for client SDK | No |
