import { z } from 'zod';
import { MAX_LINES, MAX_QTY } from '../services/pricing.service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number');

export const checkoutBody = z
  .object({
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
    customer: z.object({
      name: z.string().trim().min(2, 'Enter your full name').max(80),
      email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
      phone,
    }),
    method: z.enum(['delivery', 'pickup']).default('delivery'),
    address: z
      .object({
        line1: z.string().trim().min(3, 'Enter the street address').max(160),
        line2: z.string().trim().max(160).optional(),
        landmark: z.string().trim().max(160).optional(),
        city: z.string().trim().min(2, 'Enter the city or LGA').max(80),
        state: z.string().trim().min(2, 'Choose a state').max(60),
      })
      .optional(),
    notes: z.string().trim().max(300).optional(),
    coupon: z.string().trim().max(40).optional(),
    createAccount: z.boolean().optional(),
    password: z
      .string()
      .min(8)
      .max(128)
      .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Use a letter and a number')
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.method === 'delivery' && !v.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Enter a delivery address' });
    }
    if (v.createAccount && !v.password) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'Choose a password for your account',
      });
    }
  });

export const trackBody = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^NVT-\d{4}-\d{5}$/, 'Invalid order number'),
  emailOrPhone: z.string().trim().min(3, 'Enter your email or phone').max(120),
});

export const retryBody = z.object({
  email: z.string().trim().toLowerCase().email('Enter the email used on the order'),
});

export const orderNumberParam = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^NVT-\d{4}-\d{5}$/, 'Invalid order number'),
});

export const referenceParam = z.object({
  reference: z
    .string()
    .trim()
    .min(4)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/, 'Invalid reference'),
});
