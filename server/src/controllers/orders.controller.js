import { asyncHandler } from '../middleware/asyncHandler.js';
import { User } from '../models/index.js';
import { SESSION_COOKIE, cookieOptions, register, signToken } from '../services/auth.service.js';
import {
  createOrder,
  retryPayment,
  trackOrder,
  confirmPayment,
  orderSummary,
  handlePaystackEvent,
} from '../services/checkout.service.js';
import { verifyWebhookSignature } from '../services/paystack.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * POST /api/orders. Prices are recomputed on the server. If the shopper asks for an account and
 * is a guest, the account is created and the session cookie is set on this response.
 */
export const postOrder = asyncHandler(async (req, res) => {
  const { createAccount, password, ...input } = req.body;
  let user = req.user ?? null;
  let newUser = null;

  if (!user && createAccount && password) {
    const exists = await User.exists({ email: input.customer.email });
    // An existing email is never linked automatically: that would let anyone attach an order to someone else's account.
    if (!exists) {
      newUser = await register({
        name: input.customer.name,
        email: input.customer.email,
        password,
        phone: input.customer.phone,
      });
      user = newUser;
    }
  }

  const data = await createOrder({ ...input, user });
  if (newUser) res.cookie(SESSION_COOKIE, signToken(newUser), cookieOptions());
  res.status(201).json({ success: true, data: { ...data, accountCreated: Boolean(newUser) } });
});

export const postTrack = asyncHandler(async (req, res) => {
  const data = await trackOrder(req.body.orderNumber, req.body.emailOrPhone);
  res.json({ success: true, data });
});

export const postRetryPayment = asyncHandler(async (req, res) => {
  const data = await retryPayment(req.params.orderNumber, req.body.email);
  res.status(201).json({ success: true, data });
});

/** GET /api/payments/verify/:reference: the success page calls this. It always asks Paystack. */
export const getVerify = asyncHandler(async (req, res) => {
  const { order, status } = await confirmPayment(req.params.reference, 'verify');
  res.json({ success: true, data: { status, order: orderSummary(order) } });
});

/**
 * POST /api/payments/paystack/webhook. Mounted with express.raw() BEFORE express.json() (app.js).
 * The signature is checked on the raw bytes. Processing is re-verified with Paystack's API.
 */
export const paystackWebhook = async (req, res) => {
  const raw = req.body;
  if (!verifyWebhookSignature(raw, req.get('x-paystack-signature'))) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, message: 'Malformed event' });
  }

  // Respond first in production so Paystack does not retry. Tests await the work to check it.
  const work = handlePaystackEvent(event).catch((err) =>
    logger.error('Webhook processing failed', err)
  );
  if (env.NODE_ENV === 'test') await work;
  return res.status(200).json({ success: true });
};
