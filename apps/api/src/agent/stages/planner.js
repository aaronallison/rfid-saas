/* ================================================================
   Stage 3 — Plan: generate implementation plan using Claude AI
   ================================================================ */

import { generatePlan } from '../lib/claude.js';
import { supabaseAdmin } from '../../api/lib/supabase.js';
import logger from '../../api/lib/logger.js';

export async function handlePlan(caseData) {
  try {
    const plan = await generatePlan(caseData);

    // Get current max version for this case
    const { data: existingPlans } = await supabaseAdmin
      .from('plans')
      .select('version')
      .eq('case_id', caseData.case_id)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = (existingPlans?.[0]?.version || 0) + 1;

    // Store the plan
    await supabaseAdmin.from('plans').insert({
      case_id: caseData.case_id,
      org_id: caseData.org_id,
      version: nextVersion,
      implementation: plan,
      risk_assessment: plan.risk_assessment || {},
      review_status: 'pending',
    });

    return {
      advance: true,
      needsHuman: false,
      error: null,
      summary: `Plan v${nextVersion} generated (${plan.steps?.length || 0} steps)`,
    };
  } catch (err) {
    logger.error({ err, caseId: caseData.case_id }, 'Plan generation failed');
    return { advance: false, needsHuman: false, error: `Plan generation failed: ${err.message}` };
  }
}
