import { z } from 'zod';
import { MAX_LINES, MAX_QTY } from '../services/pricing.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const cartQuoteBody = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        variantId: objectId,
        qty: z.coerce.number().int().min(1).max(MAX_QTY),
      })
    )
    .min(1, 'Your cart is empty')
    .max(MAX_LINES),
  state: z.string().trim().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  method: z.enum(['delivery', 'pickup']).default('delivery'),
  coupon: z.string().trim().max(40).optional(),
});
