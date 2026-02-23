\# GroTap Platform – System Architecture



This document defines the \*\*canonical architecture\*\* for the GroTap platform.

It is the source of truth for system boundaries, responsibilities, and constraints.



All implementations must conform to this architecture.



---



\## 1. System Overview



GroTap is a multi-tenant, agent-assisted SaaS platform for:



\- RFID capture ingestion

\- Inventory tracking

\- Batch processing

\- Data exports

\- Agent-driven self-healing workflows



---



\## 2. Core Components



\### 2.1 Frontend



\- Web dashboard (Vanilla HTML/CSS/JS)

\- Mobile scanner app (planned)

\- Authentication via Supabase Auth (JWT)



---



\### 2.2 Backend API



Responsibilities:



\- Capture ingestion

\- Batch processing

\- Org + user management

\- Export generation

\- Task intake for agentic workflows



Constraints:



\- All endpoints require auth middleware

\- All write endpoints require Zod validation

\- All sensitive operations require audit logging



---



\### 2.3 Agentic Platform

(Full reference: docs/AGENTIC_PLATFORM.md | Status: docs/AGENTIC_BUILD_STATUS.md)

The agentic system is a \*\*control plane\*\*, not the product API.



Responsibilities:



\- Read tasks from `/api/tasks`

\- Plan → Build → Review loops (10-stage orchestrator)

\- Propose changes via PRs

\- Never directly deploy to prod

\- Human approval gates for high-risk changes (auth, billing, security, rls)



---



\## 3. Security Model



\- JWT-based auth (Supabase)

\- Org-scoped access control

\- Role-based authorization (admin, member, agent)

\- Secrets stored only in environment variables

\- Zero secrets in repo



---



\## 4. Data Architecture



\- Primary DB: Postgres (Supabase)

\- Row-level security per org

\- Audit logs for sensitive actions

\- Export jobs are async + non-blocking



---



\## 5. Deployment Model



\- API + workers: Railway

\- Agent runtime: Hetzner VPS

\- CI/CD: GitHub Actions

\- Domain routing: Railway + DNS



---



\## 6. Operational Constraints



\- No agent deploys to production

\- All prod changes require human approval

\- All APIs must be backward compatible

\- All schema changes require migration plan



---



\## 7. Interfaces



\### 7.1 Product API



Defined in:

\- `src/api/API.md`



\### 7.2 Agent Task Interface



\- `/api/tasks` is the sole ingress point for agentic workflows



---



\## 8. Canonical Doc Chain (Agent Boot Context)



Agents must read in order:



1\. PROJECT.md  

2\. ARCHITECTURE.md  

3\. TECH-STACK.md  

4\. API.md  

5\. AGENT\_RULES.md  



This chain defines \*\*what to build, how to build it, and what is allowed\*\*.

