/* ================================================================
   GroTap — Zod schemas for /api/tasks endpoints
   ================================================================ */

import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().max(5000).optional(),
  case_type: z.enum(['bug', 'enhancement', 'task']),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  area: z.string().max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const listTasksSchema = z.object({
  stage: z
    .enum([
      'intake', 'triage', 'plan', 'plan_review', 'execute',
      'fix_review', 'policy_review', 'change_review', 'promote_beta', 'close',
    ])
    .optional(),
  status: z
    .enum(['open', 'in_progress', 'blocked', 'needs_human', 'completed', 'failed', 'cancelled'])
    .optional(),
  case_type: z.enum(['bug', 'enhancement', 'task']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
