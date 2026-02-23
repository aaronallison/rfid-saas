import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(200).optional(),
  invite_token: z.string().uuid().optional(),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});
