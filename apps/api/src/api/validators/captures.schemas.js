import { z } from 'zod';

const optionalStr = z.string().max(500).optional().nullable();

export const createCaptureSchema = z.object({
  batch_id: z.string().uuid().optional(),
  type: z.string().max(50).optional(),
  rfid_tag: z.string().max(200).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  accuracy_m: z.number().min(0).optional().nullable(),
  source_device_id: z.string().uuid().optional().nullable(),
  f1: optionalStr, f2: optionalStr, f3: optionalStr, f4: optionalStr, f5: optionalStr,
  f6: optionalStr, f7: optionalStr, f8: optionalStr, f9: optionalStr, f10: optionalStr,
  f11: optionalStr, f12: optionalStr, f13: optionalStr, f14: optionalStr, f15: optionalStr,
  f16: optionalStr, f17: optionalStr, f18: optionalStr, f19: optionalStr, f20: optionalStr,
  f21: optionalStr, f22: optionalStr, f23: optionalStr, f24: optionalStr, f25: optionalStr,
});

export const listCapturesSchema = z.object({
  batch_id: z.string().uuid().optional(),
  type: z.string().optional(),
  rfid_tag: z.string().optional(),
  status: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  sort: z.enum(['captured_at', 'synced_at', 'cntid']).default('captured_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
