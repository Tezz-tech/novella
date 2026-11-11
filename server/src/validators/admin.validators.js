import { z } from 'zod';
import { CONDITIONS, PRODUCT_TAGS, PRODUCT_STATUSES, PRODUCT_TYPES } from '../models/Product.js';
import { ORDER_STATUSES } from '../models/Order.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const str = (max) => z.string().trim().max(max);
const nonNeg = z.coerce.number().min(0).max(100_000_000);
const int = (min, max) => z.coerce.number().int().min(min).max(max);
const page = z.coerce.number().int().min(1).default(1);
const limit = (max = 100, def = 25) => z.coerce.number().int().min(1).max(max).default(def);
const optDate = z.string().trim().optional();
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

/* ----------------------------- Products ----------------------------- */

const variantInput = z.object({
  id: objectId.optional(),
  sku: str(60).optional(),
  optionValues: z.record(z.string().max(40), z.string().max(60)).default({}),
  price: nonNeg,
  compareAtPrice: nonNeg.nullable().optional(),
  stock: int(0, 100_000),
  lowStockThreshold: int(0, 10_000).optional(),
  image: str(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

const imageInput = z.object({
  url: z.string().trim().min(1).max(500),
  publicId: z.string().max(200).nullable().optional(),
  alt: str(200).optional(),
});

export const productBody = z.object({
  name: z.string().trim().min(2, 'Enter a product name').max(160),
  slug: str(160).optional(),
  type: z.enum(PRODUCT_TYPES).default('single'),
  brand: objectId,
  category: objectId,
  shortDescription: str(240).default(''),
  description: z.string().max(20_000).default(''),
  specs: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(200),
      })
    )
    .max(40)
    .default([]),
  images: z.array(imageInput).max(8).default([]),
  condition: z.enum(CONDITIONS).default('brand_new'),
  warranty: str(120).default(''),
  tags: z.array(z.enum(PRODUCT_TAGS)).default([]),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
  options: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        values: z.array(z.string().trim().min(1).max(60)).min(1).max(30),
      })
    )
    .max(4)
    .default([]),
  variants: z.array(variantInput).min(1, 'Add at least one variant').max(200),
  comboItems: z
    .array(z.object({ product: objectId, variant: objectId, qty: int(1, 99) }))
    .max(10)
    .default([]),
  seo: z.object({ title: str(70).optional(), description: str(160).optional() }).default({}),
  dealEndsAt: z.string().trim().nullable().optional(),
});

export const productStatusBody = z.object({ status: z.enum(PRODUCT_STATUSES) });

export const variantPatchBody = z
  .object({
    price: nonNeg.optional(),
    compareAtPrice: nonNeg.nullable().optional(),
    stock: int(0, 100_000).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

export const bulkPriceBody = z
  .object({
    ids: z.array(objectId).max(1000).optional(),
    filter: z.object({ category: objectId.optional(), brand: objectId.optional() }).optional(),
    mode: z.enum(['percent', 'fixed', 'set']),
    value: z.coerce.number().min(-95).max(100_000),
    field: z.enum(['price', 'compareAtPrice']).default('price'),
    round: z.enum(['none', 'nearest_100', 'nearest_1000']).default('none'),
  })
  .refine((v) => v.mode !== 'set' || v.value >= 0, 'A set price cannot be negative');

export const productListQuery = z.object({
  q: str(100).optional(),
  status: z.preprocess(emptyToUndefined, z.enum(PRODUCT_STATUSES).optional()),
  category: z.preprocess(emptyToUndefined, objectId.optional()),
  brand: z.preprocess(emptyToUndefined, objectId.optional()),
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(['updated', 'name', 'price_desc', 'price_asc', 'stock_asc']).default('updated')
  ),
  page,
  limit: limit(100, 25),
});

export const dryRunQuery = z.object({
  dryRun: z.preprocess((v) => v === 'true' || v === true, z.boolean()).default(false),
});

/* ----------------------------- Orders ----------------------------- */

export const orderListQuery = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(ORDER_STATUSES).optional()),
  paymentStatus: z.preprocess(
    emptyToUndefined,
    z.enum(['unpaid', 'paid', 'failed', 'refunded', 'partially_refunded']).optional()
  ),
  from: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  to: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  state: z.preprocess(emptyToUndefined, z.string().trim().max(60).optional()),
  q: z.preprocess(emptyToUndefined, str(100).optional()),
  page,
  limit: limit(100, 25),
  format: z.preprocess(emptyToUndefined, z.enum(['csv']).optional()),
});

export const orderStatusBody = z.object({
  status: z.enum(ORDER_STATUSES),
  note: str(300).optional(),
  courier: str(80).optional(),
  trackingNumber: str(80).optional(),
  trackingUrl: z.string().trim().url('Enter a full tracking link').max(500).optional(),
});

export const orderNotesBody = z.object({ adminNotes: z.string().max(2000) });

export const orderAddressBody = z.object({
  line1: str(160).min(3),
  line2: str(160).optional(),
  landmark: str(160).optional(),
  city: str(80).min(2),
  state: str(60).min(2),
});

export const refundBody = z.object({
  amount: z.coerce.number().positive().optional(),
  reason: str(200).default(''),
  restock: z.boolean().default(false),
});

/* ----------------------------- Payments, customers, activity ----------------------------- */

export const referenceParam = z.object({
  reference: z
    .string()
    .trim()
    .min(4)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const paymentListQuery = z.object({
  status: z.preprocess(emptyToUndefined, str(30).optional()),
  source: z.preprocess(
    emptyToUndefined,
    z.enum(['verify', 'webhook', 'admin_reverify']).optional()
  ),
  from: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  to: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  page,
  limit: limit(100, 25),
});

export const customerListQuery = z.object({
  q: z.preprocess(emptyToUndefined, str(100).optional()),
  page,
  limit: limit(100, 25),
});

export const emailParam = z.object({ email: z.string().trim().toLowerCase().email() });

export const activityQuery = z.object({
  entity: z.preprocess(emptyToUndefined, str(40).optional()),
  entityId: z.preprocess(emptyToUndefined, str(80).optional()),
  actor: z.preprocess(emptyToUndefined, str(120).optional()),
  from: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  to: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  page,
  limit: limit(100, 50),
});

export const exportQuery = z.object({
  format: z.preprocess(emptyToUndefined, z.enum(['csv']).optional()),
});

/* ----------------------------- Store ----------------------------- */

export const zoneBody = z.object({
  state: str(60).min(2),
  city: str(80).default('*'),
  fee: nonNeg,
  etaText: str(60).default('1–3 days'),
  isActive: z.boolean().default(true),
});

export const zoneUpdateBody = zoneBody.partial();

export const bulkZoneBody = z.object({
  states: z.array(str(60).min(2)).min(1).max(40),
  feeNaira: nonNeg,
  etaText: str(60).optional(),
});

const couponBase = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only'),
  type: z.enum(['percent', 'fixed']),
  value: z.coerce.number().min(0),
  minSubtotalNaira: nonNeg.default(0),
  maxDiscountNaira: nonNeg.nullable().optional(),
  startsAt: z.string().trim().nullable().optional(),
  endsAt: z.string().trim().nullable().optional(),
  usageLimit: int(1, 1_000_000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const couponBody = couponBase.refine((c) => c.type !== 'percent' || c.value <= 100, {
  message: 'A percentage cannot be more than 100',
  path: ['value'],
});
export const couponUpdateBody = couponBase.partial();

export const settingsBody = z
  .object({
    storeName: str(80),
    tagline: str(120),
    contact: z
      .object({
        phone: str(30),
        whatsapp: str(30),
        email: str(120),
        instagram: str(200),
        tiktok: str(200),
        address: str(240),
      })
      .partial(),
    pickupAddress: str(300),
    freeDeliveryThresholdNaira: nonNeg,
    lowStockDefault: int(0, 1000),
    policies: z
      .object({
        returns: z.string().max(10_000),
        privacy: z.string().max(10_000),
        terms: z.string().max(10_000),
      })
      .partial(),
    faq: z
      .array(z.object({ question: str(200).min(3), answer: z.string().trim().min(3).max(2000) }))
      .max(50),
    features: z
      .object({
        reviews: z.boolean(),
        coupons: z.boolean(),
        newsletter: z.boolean(),
        notifyWhenBackInStock: z.boolean(),
      })
      .partial(),
  })
  .partial();

export const marketingBody = z.object({
  heroSlides: z
    .array(
      z.object({
        image: z.string().trim().max(500).nullable().optional(),
        title: str(120),
        subtitle: str(200),
        ctaLabel: str(40),
        ctaLink: str(300),
      })
    )
    .max(6),
  announcementBar: str(200),
});

export const staffInviteBody = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(['staff', 'admin', 'owner']),
});

export const staffUpdateBody = z
  .object({
    role: z.enum(['staff', 'admin', 'owner']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to change');

export const subscriberQuery = exportQuery;

export const catalogueBody = {
  category: z.object({
    name: z.string().trim().min(2).max(80),
    slug: str(80).optional(),
    description: str(500).optional(),
    image: str(500).nullable().optional(),
    sortOrder: int(-1000, 1000).optional(),
    isActive: z.boolean().optional(),
  }),
  brand: z.object({
    name: z.string().trim().min(2).max(80),
    slug: str(80).optional(),
    logo: str(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export { idParam, optDate };

/** Variant routes need both ids. (validate() replaces req.params, so this must list every param.) */
export const variantParams = z.object({ id: objectId, variantId: objectId });
