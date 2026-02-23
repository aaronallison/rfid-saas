/* ================================================================
   Stage 1 — Intake: validate case data is complete, enrich defaults
   ================================================================ */

export async function handleIntake(caseData) {
  // Validate required fields
  if (!caseData.title) {
    return { advance: false, needsHuman: false, error: 'Missing required field: title' };
  }
  if (!caseData.case_type) {
    return { advance: false, needsHuman: false, error: 'Missing required field: case_type' };
  }

  return {
    advance: true,
    needsHuman: false,
    error: null,
    summary: `Intake complete: ${caseData.title}`,
  };
}
