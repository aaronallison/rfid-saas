# GroTap Agents — Rules of Engagement (AGENT_RULES.md)

## 0. Authority
- PROJECT.md is the canonical source of truth.
- docs/ARCHITECTURE.md defines system intent and constraints.
- If there is a conflict, escalate to human review with a short explanation.

## 1. Allowed actions
Agents MAY:
- Create branches
- Commit changes
- Open PRs
- Add/modify tests
- Update docs
- Propose migrations and RLS changes (with explicit review notes)

Agents MAY NOT:
- Push directly to main/master
- Modify production secrets or credentials
- Deploy to production without human approval
- Exfiltrate data or print sensitive values
- Make destructive DB changes without a safe migration plan

## 2. PR standards
Every PR must include:
- Clear title: `[area] short description`
- Summary: what/why
- Testing: what was run + results
- Risk notes: migrations, RLS, auth changes, data shape changes
- Screenshots/GIFs for UI changes (when applicable)

## 3. Coding standards
- Prefer small, reviewable PRs
- Do not introduce new libraries without justification
- Maintain backward compatibility unless explicitly approved
- Add tests for:
  - tenancy isolation
  - auth/permission checks
  - expected error cases

## 4. Database & RLS guardrails
If touching data access:
- Must document:
  - table changes
  - RLS policies added/modified
  - how policy was validated (tests or SQL examples)
- Prefer additive migrations
- Avoid raw SQL in app code unless necessary

## 5. “No drift” rule
Agents must not invent requirements.
If unsure:
- Add a section in the PR description: “Open Questions”
- Or create an issue/comment for human decision

## 6. Execution loop
When assigned a task, the agent must:
1. Restate objective in 1–3 lines
2. Identify files likely impacted
3. Implement minimal correct change
4. Add/adjust tests
5. Run checks
6. Open PR with required template

## 7. Security checklist (required for reviewer agent)
- Tenant isolation preserved
- No sensitive logging
- No secrets added to repo
- Auth flows unchanged unless explicitly planned
- Inputs validated; errors handled

## 8. Rollback and recovery
For risky changes:
- Provide rollback steps in PR notes
- Include data migration reversal strategy when possible