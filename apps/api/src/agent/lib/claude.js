/* ================================================================
   GroTap — Anthropic Claude SDK wrapper
   ================================================================ */

import Anthropic from '@anthropic-ai/sdk';
import logger from '../../api/lib/logger.js';
import { TRIAGE_PROMPT, PLAN_PROMPT } from './prompts.js';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
  client = new Anthropic({ apiKey });
  return client;
}

/**
 * Classify a case using Claude: determines area, severity, risk flags, reproducibility.
 * @param {object} caseData - The case record from Supabase
 * @returns {Promise<object>} Classification result
 */
export async function classifyCase(caseData) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: TRIAGE_PROMPT(caseData) }],
  });

  const text = message.content[0]?.text || '';

  try {
    // Strip markdown fences if Claude wraps in ```json ... ```
    const cleaned = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    logger.warn({ text: text.slice(0, 200) }, 'Failed to parse triage response as JSON');
    return {
      area: 'unknown',
      severity: 'medium',
      risk_flags: [],
      reproducibility: 'unknown',
      notes: text.slice(0, 500),
    };
  }
}

/**
 * Generate an implementation plan using Claude.
 * @param {object} caseData - The case record (with triage metadata)
 * @returns {Promise<object>} Plan with steps, files, criteria, risk assessment
 */
export async function generatePlan(caseData) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: PLAN_PROMPT(caseData) }],
  });

  const text = message.content[0]?.text || '';

  try {
    const cleaned = text.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned);
  } catch {
    logger.warn({ text: text.slice(0, 200) }, 'Failed to parse plan response as JSON');
    return {
      steps: [{ order: 1, description: text.slice(0, 1000), type: 'code' }],
      files_affected: [],
      acceptance_criteria: [],
      risk_assessment: { level: 'unknown', categories: [], notes: 'Could not parse structured plan' },
      estimated_complexity: 'unknown',
    };
  }
}

export { getClient };
