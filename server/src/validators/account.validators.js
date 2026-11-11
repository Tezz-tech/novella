import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export const profileBody = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20),
  })
  .partial();

export const addressBody = z.object({
  label: z.string().trim().max(30).optional(),
  fullName: z.string().trim().min(2, 'Enter the recipient name').max(80),
  phone: z.string().trim().min(7, 'Enter a phone number').max(20),
  line1: z.string().trim().min(3, 'Enter the street address').max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, 'Enter the city or LGA').max(80),
  state: z.string().trim().min(2, 'Choose a state').max(60),
  isDefault: z.boolean().optional(),
});

export const addressUpdateBody = addressBody.partial();

export const wishlistBody = z.object({
  productIds: z.array(objectId).max(200),
});

export const idParam = z.object({ id: objectId });
export const orderParam = z.object({
  orderNumber: z
    .string()
    .trim()
    .regex(/^NVT-\d{4}-\d{5}$/, 'Invalid order number'),
});
