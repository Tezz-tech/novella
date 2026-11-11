import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/asyncHandler.js';
import { subscribe } from '../../services/newsletter.service.js';

const router = Router();

const body = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  source: z.enum(['footer', 'home', 'checkout']).default('footer'),
});

router.post(
  '/',
  validate(body, 'body'),
  asyncHandler(async (req, res) => {
    await subscribe(req.body.email, req.body.source);
    res.status(201).json({ success: true, data: { subscribed: true } });
  })
);

export default router;
