/* ================================================================
   Stage 2 — Triage: classify area, severity, risk using Claude AI
   ================================================================ */

import { classifyCase } from '../lib/claude.js';
import { supabaseAdmin } from '../../api/lib/supabase.js';
import logger from '../../api/lib/logger.js';

export async function handleTriage(caseData) {
  try {
    const classification = await classifyCase(caseData);

    // Update case with triage results
    await supabaseAdmin
      .from('cases')
      .update({
        area: classification.area || caseData.area,
        severity: classification.severity || caseData.severity || 'medium',
        risk_flags: classification.risk_flags || [],
        metadata: {
          ...caseData.metadata,
          triage: {
            reproducibility: classification.reproducibility,
            notes: classification.notes,
            triaged_at: new Date().toISOString(),
          },
        },
      })
      .eq('case_id', caseData.case_id);

    return {
      advance: true,
      needsHuman: false,
      error: null,
      summary: `Triaged as ${classification.severity} ${classification.area} issue`,
    };
  } catch (err) {
    logger.error({ err, caseId: caseData.case_id }, 'Triage failed');
    return { advance: false, needsHuman: false, error: `Triage failed: ${err.message}` };
  }
}
