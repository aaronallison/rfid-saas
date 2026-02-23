import { z } from 'zod';

export const createExportSchema = z.object({
  format: z.enum(['csv', 'json', 'xlsx']),
  batch_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  type: z.string().optional(),
  columns: z.array(z.string()).optional(),
});
