import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

export const securityHeaders = helmet({
  // The storefront reaches the API through its own domain (same origin), so no cross-origin reads are needed.
  crossOriginResourcePolicy: { policy: 'same-origin' },
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
