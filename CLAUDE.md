# CLAUDE.md — RFID-SaaS Root Instructions

> Defines how Claude Code should behave in this monorepo.

---

## 0) Scope & Authority
When instructions conflict, follow this order:
1. **docs/ARCHITECTURE.md**
2. **AGENT_RULES.md**
3. This file (CLAUDE.md)
4. Scoped `CLAUDE.md` files in apps/

---

## 1) What this repo is
- **RFID Field Capture SaaS** — multi-tenant, monorepo (Turbo)
- `apps/web` — Next.js 14 dashboard (React, TypeScript, Tailwind)
- `apps/mobile` — Expo React Native (offline-first, RFID, GPS)
- `apps/api` — Express.js API + 10-stage agentic pipeline (BullMQ + Claude AI)
- Database: Supabase (Postgres + Auth + RLS)
- Deploy: Railway (API), CI via GitHub Actions

---

## 2) Operating Mode
**Default: careful engineer.**
- Reproduce → design → implement → test → summarize.
- Prefer small PRs with tight scope.
- Never modify auth, billing, or security-sensitive code without instruction.

**Approval gates:**
- Propose design before breaking changes.
- Ask before adding dependencies, workers, or DB migrations.

---

## 3) Safety & Guardrails
- No secrets in code or logs. Use env vars only.
- RLS must remain intact on Supabase tables. Never weaken org isolation.
- Do not bypass auth checks. Do not add admin backdoors.

---

## 4) Code Standards
- API: JavaScript (ES modules), Zod validation, Pino logging
- Web: TypeScript, React, Tailwind CSS
- Mobile: TypeScript, React Native, Expo
- Lint/tests must pass before proposing a PR.
- DB changes require migrations in `supabase/migrations/`.

---

## 5) Architecture Constraints
- Express.js API (apps/api) — no framework swaps without approval
- Next.js web (apps/web) — App Router, server components where appropriate
- Expo mobile (apps/mobile) — offline-first with SQLite sync
- Multi-tenant scoping via `org_id` on all data access
- All Supabase tables use RLS with `is_org_member()` helper

---

## 6) Agentic Pipeline (apps/api)
- Entry point: `POST /api/tasks`
- 10 stages: intake → triage → plan → plan_review → execute → fix_review → policy_review → change_review → promote_beta → close
- High-risk flags (auth, billing, security, rls) require human approval
- BullMQ queue with Redis for async processing

---

## 7) When to ask before acting
- Schema changes, auth flows, billing/Stripe, queue semantics, CI/CD changes
- Any change affecting multi-tenant data isolation

---

## 8) Key entry points
- Web pages: `apps/web/src/app/`
- Mobile screens: `apps/mobile/src/screens/`
- API routes: `apps/api/src/api/routes/`
- Orchestrator: `apps/api/src/agent/orchestrator.js`
- Queue: `apps/api/src/queue/`
- Migrations: `supabase/migrations/`
- Tests: `apps/api/tests/`
