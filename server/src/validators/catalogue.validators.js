import { z } from 'zod';
import { CONDITIONS, PRODUCT_TAGS, PRODUCT_TYPES } from '../models/Product.js';

// Query strings arrive as text. Empty strings count as "not set".
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const optionalString = (max = 100) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalInt = (min, max) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce
      .number()
      .int()
      .min(min)
      .max(max ?? Number.MAX_SAFE_INTEGER)
      .optional()
  );

// "brand_new,uk_used" -> ["brand_new", "uk_used"]
const csv = (item) =>
  z.preprocess(
    (v) =>
      typeof v === 'string' && v.trim()
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    z.array(item).optional()
  );

export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'best_selling', 'relevance'];

/** Money filters are integers in kobo, the same unit the API returns. */
export const productListQuery = z
  .object({
    q: optionalString(100),
    category: optionalString(120),
    brand: optionalString(120),
    condition: csv(z.enum(CONDITIONS)),
    minPrice: optionalInt(0),
    maxPrice: optionalInt(0),
    inStock: z.preprocess(
      emptyToUndefined,
      z
        .enum(['true', 'false'])
        .transform((v) => v === 'true')
        .optional()
    ),
    tag: z.preprocess(emptyToUndefined, z.enum(PRODUCT_TAGS).optional()),
    type: z.preprocess(emptyToUndefined, z.enum(PRODUCT_TYPES).optional()),
    storage: optionalString(40),
    deal: z.preprocess(
      emptyToUndefined,
      z
        .enum(['true'])
        .transform(() => true)
        .optional()
    ),
    sort: z.preprocess(emptyToUndefined, z.enum(SORT_OPTIONS).default('newest')),
    page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
    limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(50).default(24)),
  })
  .refine((q) => q.minPrice == null || q.maxPrice == null || q.minPrice <= q.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice'],
  });

export const suggestQuery = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(100)),
});

export const slugParams = z.object({
  slug: z.string().trim().min(1).max(200),
});
