/* ================================================================
   GroTap — Prompt templates for agentic pipeline
   ================================================================ */

/**
 * Triage prompt: classifies a case by area, severity, risk, reproducibility.
 * Expects Claude to return a JSON object.
 */
export function TRIAGE_PROMPT(caseData) {
  return `You are a triage agent for the GroTap platform (multi-tenant SaaS for RFID field data capture).

Classify this case and respond with ONLY a JSON object (no markdown fences, no explanation).

Case:
- Title: ${caseData.title}
- Type: ${caseData.case_type}
- Description: ${caseData.description || 'No description provided'}
- Submitted severity: ${caseData.severity || 'not specified'}
- Area hint: ${caseData.area || 'not specified'}

Respond with this exact JSON structure:
{
  "area": "api|dashboard|auth|billing|database|infrastructure|mobile|other",
  "severity": "critical|high|medium|low",
  "risk_flags": [],
  "reproducibility": "always|sometimes|unknown|not_applicable",
  "notes": "Brief assessment (1-2 sentences)"
}

Rules for risk_flags array — include a flag if the issue touches that area:
- "auth" — authentication, sessions, tokens, login
- "billing" — Stripe, payments, subscriptions
- "security" — data exposure, injection, XSS, CSRF
- "rls" — row-level security, tenant isolation, org_id scoping
- "data" — data migrations, schema changes, data integrity`;
}

/**
 * Plan prompt: generates an implementation plan for a triaged case.
 * Expects Claude to return a JSON object.
 */
export function PLAN_PROMPT(caseData) {
  const triage = caseData.metadata?.triage || {};

  return `You are a planning agent for the GroTap platform.

Stack: Express.js monolith (ES modules), vanilla HTML/CSS/JS dashboard, Supabase Postgres (with RLS), BullMQ/Redis queue.
Constraints: Multi-tenant (org_id on every query), PR-only workflow, all routes need auth middleware + Zod validation + tests.
Key directories: src/api/routes/, src/api/middleware/, src/api/validators/, src/dashboard/public/, tests/

Create an implementation plan for this case. Respond with ONLY a JSON object (no markdown fences, no explanation).

Case:
- Title: ${caseData.title}
- Type: ${caseData.case_type}
- Area: ${caseData.area || triage.area || 'unknown'}
- Severity: ${caseData.severity || 'medium'}
- Description: ${caseData.description || 'No description provided'}
- Triage notes: ${triage.notes || 'None'}
- Risk flags: ${JSON.stringify(caseData.risk_flags || [])}

Respond with:
{
  "steps": [
    { "order": 1, "description": "Step description", "type": "code|test|config|migration" }
  ],
  "files_affected": ["src/api/routes/example.js"],
  "acceptance_criteria": ["Criterion 1", "Criterion 2"],
  "risk_assessment": {
    "level": "low|medium|high",
    "categories": [],
    "notes": "Brief risk note"
  },
  "estimated_complexity": "trivial|simple|moderate|complex"
}`;
}
