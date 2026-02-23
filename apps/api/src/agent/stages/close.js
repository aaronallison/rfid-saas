/* ================================================================
   Stage 10 — Close: write summary artifact, mark case done
   ================================================================ */

import { supabaseAdmin } from '../../api/lib/supabase.js';

export async function handleClose(caseData) {
  // Write closing artifact
  await supabaseAdmin.from('artifacts').insert({
    case_id: caseData.case_id,
    org_id: caseData.org_id,
    artifact_type: 'log',
    content: {
      summary: `Case "${caseData.title}" completed all stages`,
      pr_url: caseData.pr_url || null,
      branch: caseData.branch_name || null,
      closed_at: new Date().toISOString(),
    },
  });

  // Terminal stage — don't advance further
  return {
    advance: false,
    needsHuman: false,
    error: null,
    summary: 'Case closed',
  };
}
