import { Router } from 'express';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { cancelStaleOrders } from '../services/checkout.service.js';

/**
 * Scheduled work for serverless hosting. Vercel cron calls these with
 * Authorization: Bearer <CRON_SECRET>. Without the secret they refuse.
 */
const router = Router();

const requireCronSecret = (req, _res, next) => {
  if (!env.CRON_SECRET || req.get('authorization') !== `Bearer ${env.CRON_SECRET}`) {
    return next(new HttpError(401, 'Not allowed'));
  }
  return next();
};

router.get(
  '/cancel-stale',
  requireCronSecret,
  asyncHandler(async (_req, res) => {
    const cancelled = await cancelStaleOrders();
    res.json({ success: true, data: { cancelled } });
  })
);

export default router;
