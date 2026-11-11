import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { checkoutLimiter } from '../../middleware/rateLimit.js';
import { optionalAuth } from '../../middleware/auth.js';
import {
  checkoutBody,
  trackBody,
  retryBody,
  orderNumberParam,
  referenceParam,
} from '../../validators/checkout.validators.js';
import {
  postOrder,
  postTrack,
  postRetryPayment,
  getVerify,
} from '../../controllers/orders.controller.js';

const orders = Router();
orders.post('/', checkoutLimiter, optionalAuth, validate(checkoutBody), postOrder);
orders.post('/track', checkoutLimiter, validate(trackBody), postTrack);
orders.post(
  '/:orderNumber/retry-payment',
  checkoutLimiter,
  validate(orderNumberParam, 'params'),
  validate(retryBody),
  postRetryPayment
);

const payments = Router();
payments.get('/verify/:reference', validate(referenceParam, 'params'), getVerify);

export { orders as ordersRoutes, payments as paymentsRoutes };
