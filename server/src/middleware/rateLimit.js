import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const tooMany = (message) => (_req, res) => res.status(429).json({ success: false, message });

/**
 * Login, register and password reset. 20 attempts per 15 minutes per client in production.
 * The test environment gets a much higher limit so suites that log in many times still run.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10_000 : 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Too many attempts. Please wait a few minutes and try again.'),
});

/** Checkout initialise and quote calls. Generous for real shoppers, tight for scripts. */
export const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 10_000 : 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: tooMany('Too many checkout attempts. Please wait a moment.'),
});
