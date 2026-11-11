import { z } from 'zod';

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use at least one letter and one number');

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const registerBody = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80),
  email,
  password,
  phone: z.string().trim().max(20).optional(),
});

export const loginBody = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const forgotBody = z.object({ email });

export const resetBody = z.object({
  token: z.string().trim().min(32).max(200),
  password,
});
