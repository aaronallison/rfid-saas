import { z } from 'zod';

export const createBatchSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(['open', 'closed', 'archived']).default('open'),
});

export const listBatchesSchema = z.object({
  status: z.enum(['open', 'closed', 'archived']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
