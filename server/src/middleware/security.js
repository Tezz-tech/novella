import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const securityHeaders = helmet({
  // The API is consumed from another origin (the storefront), so allow cross-origin reads.
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

/** CORS is limited to CLIENT_URL, with credentials so httpOnly auth cookies work. */
export const corsPolicy = cors({
  origin: env.CLIENT_URL,
  credentials: true,
});

/** Strips keys starting with `$` or containing `.` from body, params, query and headers. */
export const sanitize = mongoSanitize();

/** General API limiter. Stricter limiters for auth and checkout are added with those routes. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({ success: false, message: 'Too many requests, please slow down.' }),
});
