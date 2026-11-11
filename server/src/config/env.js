import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load server/.env (never the client bundle). Existing process env wins.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true });

// Empty strings in .env mean "not set".
const optionalString = z.preprocess(
  (v) => (v === '' || v === undefined ? undefined : v),
  z.string().optional()
);

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // One or more storefront origins, comma separated, e.g. http://localhost:5173,https://shop.example.com
  CLIENT_URL: z
    .string()
    .min(1, 'CLIENT_URL is required')
    .refine(
      (v) =>
        v.split(',').every((u) => {
          try {
            new URL(u.trim());
            return true;
          } catch {
            return false;
          }
        }),
      'CLIENT_URL must be full URLs, comma separated'
    ),
  CURRENCY: z.literal('NGN').default('NGN'),

  PAYSTACK_SECRET_KEY: optionalString,
  PAYSTACK_PUBLIC_KEY: optionalString,

  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,

  CRON_SECRET: optionalString,

  SEED_ADMIN_EMAIL: optionalString,
  SEED_ADMIN_PASSWORD: optionalString,
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  throw new Error(`Invalid server environment:\n${details.join('\n')}`);
}

export const env = Object.freeze(parsed.data);
export const isProd = env.NODE_ENV === 'production';

// Storefront origins without trailing slashes. The first one is used for links (emails, sitemap, payment return).
export const CLIENT_ORIGINS = env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''));

// Optional integrations that are not configured yet. Logged once at startup so
// the team sees what still needs keys. Nothing here blocks the server.
export const missingOptional = () => {
  const groups = {
    'Paystack (payments)': ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY'],
    'Cloudinary (images)': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
  };
  return Object.entries(groups)
    .filter(([, keys]) => keys.some((k) => !env[k]))
    .map(([name]) => name);
};
