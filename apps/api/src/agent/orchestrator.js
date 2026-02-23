/* ================================================================
   GroTap — Case Orchestrator (10-stage state machine)

   processCase(caseId, expectedStage) is the main entry point.
   It loads the case, validates state, runs the stage handler,
   then advances, gates, or retries based on the result.
   ================================================================ */

import { supabaseAdmin } from '../api/lib/supabase.js';
import { enqueueCase } from '../queue/queues.js';
import logger from '../api/lib/logger.js';

// Stage handler imports
import { handleIntake } from './stages/intake.js';
import { handleTriage } from './stages/triage.js';
import { handlePlan } from './stages/planner.js';
import { handlePlanReview } from './stages/planReview.js';
import { handleExecute } from './stages/executor.js';
import { handleFixReview } from './stages/fixReview.js';
import { handlePolicyReview } from './stages/policyReview.js';
import { handleChangeReview } from './stages/changeReview.js';
import { handlePromoteBeta } from './stages/promoteBeta.js';
import { handleClose } from './stages/close.js';

// ---------- Constants ----------

/** Ordered stage progression */
export const STAGES = [
  'intake',
  'triage',
  'plan',
  'plan_review',
  'execute',
  'fix_review',
  'policy_review',
  'change_review',
  'promote_beta',
  'close',
];

const STAGE_HANDLERS = {
  intake: handleIntake,
  triage: handleTriage,
  plan: handlePlan,
  plan_review: handlePlanReview,
  execute: handleExecute,
  fix_review: handleFixReview,
  policy_review: handlePolicyReview,
  change_review: handleChangeReview,
  promote_beta: handlePromoteBeta,
  close: handleClose,
};

/** Risk categories that ALWAYS require human approval at review gates */
const NEVER_AUTOPASS = ['auth', 'billing', 'security', 'rls'];

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled'];

// ---------- Pure helpers (exported for testing) ----------

export function getNextStage(currentStage) {
  const idx = STAGES.indexOf(currentStage);
  if (idx === -1 || idx >= STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export function isReviewStage(stage) {
  return ['plan_review', 'fix_review', 'policy_review', 'change_review'].includes(stage);
}

export function hasHighRiskFlags(riskFlags) {
  if (!Array.isArray(riskFlags)) return false;
  return riskFlags.some((flag) => NEVER_AUTOPASS.includes(flag));
}

// ---------- DB helpers ----------

export async function updateCase(caseId, updates) {
  const { error } = await supabaseAdmin
    .from('cases')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('case_id', caseId);
  if (error) logger.error({ error, caseId }, 'Failed to update case');
}

export async function recordEvent(caseId, orgId, stage, eventType, summary, details = {}) {
  const { error } = await supabaseAdmin.from('case_events').insert({
    case_id: caseId,
    org_id: orgId,
    stage,
    event_type: eventType,
    actor: 'system',
    summary,
    details,
  });
  if (error) logger.error({ error, caseId }, 'Failed to record event');
}

// ---------- Main orchestrator ----------

/**
 * Process a single case at a given stage.
 * Called by the BullMQ worker for each job.
 */
export async function processCase(caseId, expectedStage) {
  // 1. Load current case state
  const { data: caseData, error } = await supabaseAdmin
    .from('cases')
    .select('*')
    .eq('case_id', caseId)
    .single();

  if (error || !caseData) {
    logger.error({ caseId, error }, 'Case not found');
    return;
  }

  // 2. Guard: stage mismatch (prevents duplicate processing)
  if (caseData.stage !== expectedStage) {
    logger.warn(
      { caseId, expected: expectedStage, actual: caseData.stage },
      'Stage mismatch — skipping',
    );
    return;
  }

  // 3. Guard: terminal state
  if (TERMINAL_STATUSES.includes(caseData.status)) {
    logger.info({ caseId, status: caseData.status }, 'Case in terminal state — skipping');
    return;
  }

  // 4. Guard: awaiting human
  if (caseData.status === 'needs_human') {
    logger.info({ caseId }, 'Case awaiting human approval — skipping');
    return;
  }

  // 5. Mark in_progress
  await updateCase(caseId, { status: 'in_progress' });

  // 6. Get handler
  const handler = STAGE_HANDLERS[caseData.stage];
  if (!handler) {
    logger.error({ caseId, stage: caseData.stage }, 'No handler for stage');
    await updateCase(caseId, { status: 'failed' });
    return;
  }

  // 7. Run stage handler
  try {
    const result = await handler(caseData);

    // --- Error result ---
    if (result.error) {
      await recordEvent(caseId, caseData.org_id, caseData.stage, 'error', result.error);

      if (caseData.retry_count >= caseData.max_retries) {
        await updateCase(caseId, { status: 'failed' });
        await recordEvent(
          caseId, caseData.org_id, caseData.stage,
          'escalation', 'Max retries exceeded',
        );
        return;
      }

      // Increment retry count — BullMQ will also retry the job
      await updateCase(caseId, {
        retry_count: caseData.retry_count + 1,
        status: 'open',
      });
      return;
    }

    // --- Needs human ---
    if (result.needsHuman) {
      await updateCase(caseId, { status: 'needs_human' });
      await recordEvent(
        caseId, caseData.org_id, caseData.stage,
        'approval_request', 'Human approval required',
      );

      await supabaseAdmin.from('approvals').insert({
        case_id: caseId,
        org_id: caseData.org_id,
        stage: caseData.stage,
        gate_type: caseData.stage,
        status: 'pending',
      });
      return;
    }

    // --- Advance ---
    if (result.advance) {
      await recordEvent(
        caseId, caseData.org_id, caseData.stage,
        'stage_exit', result.summary || 'Stage completed',
      );

      const nextStage = getNextStage(caseData.stage);

      if (!nextStage) {
        // Final stage (close) completed
        await updateCase(caseId, { status: 'completed' });
        return;
      }

      // Check if next stage is a review gate AND case has high-risk flags
      const needsGate = isReviewStage(nextStage) && hasHighRiskFlags(caseData.risk_flags);

      await updateCase(caseId, {
        stage: nextStage,
        status: needsGate ? 'needs_human' : 'open',
        retry_count: 0,
      });

      await recordEvent(caseId, caseData.org_id, nextStage, 'stage_enter', `Entering ${nextStage}`);

      if (needsGate) {
        // Create approval record and wait for human
        await supabaseAdmin.from('approvals').insert({
          case_id: caseId,
          org_id: caseData.org_id,
          stage: nextStage,
          gate_type: nextStage,
          status: 'pending',
        });
      } else {
        // Enqueue next stage (graceful if Redis down)
        try {
          await enqueueCase(caseId, nextStage);
        } catch (queueErr) {
          logger.warn({ err: queueErr, caseId, nextStage }, 'Failed to enqueue next stage');
        }
      }
    }

    // If result.advance is false and no error/needsHuman, stage is terminal (e.g. close)
    if (!result.advance && !result.error && !result.needsHuman) {
      await updateCase(caseId, { status: 'completed' });
      await recordEvent(
        caseId, caseData.org_id, caseData.stage,
        'stage_exit', result.summary || 'Stage completed (terminal)',
      );
    }
  } catch (err) {
    logger.error({ err, caseId, stage: caseData.stage }, 'Stage handler threw unexpectedly');
    await updateCase(caseId, { status: 'failed' });
    await recordEvent(caseId, caseData.org_id, caseData.stage, 'error', err.message);
  }
}
