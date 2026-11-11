# 03 — Backend & API

## Server layout

```
server/
  src/
    app.js            express app (middleware, routes, error handler)
    server.js         connects DB, starts listening
    config/           env.js (Zod-validated env), db.js, cloudinary.js, mailer.js
    models/           Mongoose models (below)
    routes/           public/*.routes.js, admin/*.routes.js
    controllers/
    services/         paystack.service.js, order.service.js, pricing.service.js,
                      stock.service.js, email.service.js, upload.service.js
    middleware/       auth.js (requireAuth, requireRole), validate.js, rateLimit.js,
                      error.js, asyncHandler.js
    validators/       Zod schemas per resource
    jobs/             cancelStaleOrders.js (node-cron, every 30 min)
    emails/           HTML templates (branded: black/pink, logo)
    utils/            money.js, orderNumber.js, slugify.js, pagination.js
  seed/               seed.js + demo data
  tests/
```

## Models (Mongoose, all with timestamps)

**User**: name, email (unique, lowercase), phone, passwordHash, role
(`customer` | `staff` | `admin` | `owner`), addresses[{label, fullName, phone,
line1, line2, landmark, city, state, isDefault}], wishlist[productId],
isActive, lastLoginAt.

**Category**: name, slug, description, image, parent (optional), sortOrder, isActive.

**Brand**: name, slug, logo, isActive.

**Product**: name, slug (unique), type (`single` | `combo`), brand, category,
shortDescription, description, specs[{label, value}], images[{url, publicId,
alt}], condition, warranty, tags[], status, options[{name, values[]}],
variants[{_id, sku, optionValues{} (map), price, compareAtPrice, stock,
lowStockThreshold, image, isActive}], comboItems[{product, variant, qty}],
seo{title, description}, soldCount, ratingAvg, ratingCount.
Indexes: text index on name/brand/tags; category+status; `variants.sku` unique sparse.

**Order**: orderNumber (unique), user (optional), customer{name, email,
phone}, items[{product, variant, name, variantLabel, image, sku, unitPrice,
qty, lineTotal, comboItems snapshot}] (a **snapshot**, so later price changes
don't alter old orders), delivery{method, address{line1, line2, landmark, city,
state}, notes, zone, fee}, coupon{code, discount}, subtotal, deliveryFee,
discount, total, currency, status, paymentStatus, payment{provider:'paystack',
reference (unique), accessCode, channel, paidAt, amountPaid, fees,
gatewayResponse, customerCode, authorizationLast4, cardType}, fulfilment{courier,
trackingNumber, trackingUrl, shippedAt, deliveredAt}, timeline[{status, note,
by, at}], stockDeducted (bool), adminNotes, expiresAt.

**Payment** (one row for every Paystack event/attempt, for the admin Payments
screen): order, reference, amount, currency, status, channel, raw (selected
fields), source (`verify` | `webhook` | `admin_reverify`), eventId, createdAt.
Unique index on (reference, source, status) for idempotency.

**Refund**: order, payment reference, amount, reason, paystackRefundId, status, by.

**DeliveryZone**: state, city (optional; `*` = whole state), fee, etaText
("1–2 days"), isActive. Plus Settings.freeDeliveryThreshold.

**Coupon**: code, type (`percent` | `fixed`), value, minSubtotal, maxDiscount,
startsAt, endsAt, usageLimit, usedCount, isActive.

**Review** (flag): product, user, order, rating, title, body, status.

**Settings** (one document): storeName, tagline, logo, contact{phone,
whatsapp, email, instagram, tiktok, address}, pickupAddress, currency,
freeDeliveryThreshold, lowStockDefault, heroSlides[], announcementBar,
faq[], policies{returns, privacy, terms}, features{reviews, coupons, newsletter}.

**ActivityLog**: actor, action, entity, entityId, before, after, ip, at.

**Counter**: for order number sequence.

**Subscriber**: email, source, createdAt.

## Public API (`/api`)

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | |
| GET | `/settings/public` | Store info, socials, hero, policies |
| GET | `/categories` · `/brands` | |
| GET | `/products` | Query: `q, category, brand, condition, minPrice, maxPrice, inStock, tag, type, sort, page, limit`. Returns `{items, page, total, facets}` |
| GET | `/products/:slug` | Plus related products |
| GET | `/products/search/suggest?q=` | Top 6 for instant search |
| POST | `/cart/quote` | `{items:[{productId, variantId, qty}], state, city, method, coupon}` → server-priced lines, stock warnings, delivery fee, discount, total |
| GET | `/delivery-zones` | Active zones for the checkout dropdown |
| POST | `/orders` | Creates order from the cart payload (re-priced on server), returns `{orderNumber, reference, accessCode, authorizationUrl}` |
| POST | `/orders/:orderNumber/retry-payment` | New Paystack reference for an unpaid order |
| GET | `/payments/verify/:reference` | Calls Paystack verify, updates order, returns order summary |
| POST | `/payments/paystack/webhook` | **Raw body**, signature check. See 04 |
| POST | `/orders/track` | `{orderNumber, emailOrPhone}` → status + timeline (no full address) |
| POST | `/auth/register` · `/auth/login` · `/auth/logout` | httpOnly cookie JWT |
| GET | `/auth/me` | |
| POST | `/auth/forgot-password` · `/auth/reset-password` | Emailed token, 30 min |
| GET/PUT | `/me/profile` · `/me/addresses` · `/me/wishlist` | |
| GET | `/me/orders` · `/me/orders/:orderNumber` | |
| POST | `/newsletter` | |
| POST | `/products/:id/reviews` | Flag; needs a delivered order |

## Admin API (`/api/admin`, requireAuth + requireRole('staff','admin','owner'))

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard?range=7d\|30d\|90d\|custom` | KPIs, revenue series, orders by status, top products, low stock, recent orders |
| CRUD | `/products` | Includes variants, combo items, images |
| PATCH | `/products/:id/status` | |
| PATCH | `/products/bulk-price` | `{filter or ids, mode:'percent'\|'fixed'\|'set', value, field:'price'\|'compareAtPrice', round:'nearest_100'\|'nearest_1000'}` with **preview** (`?dryRun=true`) |
| PATCH | `/products/:id/variants/:variantId` | Quick inline edit price/stock |
| POST | `/uploads/image` · DELETE `/uploads/image/:publicId` | Cloudinary (multer memory, 5MB, jpg/png/webp) |
| CRUD | `/categories` · `/brands` | |
| GET | `/orders` | Filters: status, paymentStatus, date range, state, search (number, name, phone, email), pagination; CSV export `?format=csv` |
| GET | `/orders/:id` | Full detail incl. address and timeline |
| PATCH | `/orders/:id/status` | `{status, note, courier?, trackingNumber?, trackingUrl?}`; checks transitions; emails customer |
| PATCH | `/orders/:id/notes` | Internal notes |
| PATCH | `/orders/:id/address` | Fix delivery address (logged) |
| GET | `/payments` | All payment events; filters; totals |
| POST | `/payments/:reference/reverify` | Calls Paystack verify again and reconciles |
| POST | `/orders/:id/mark-paid-manually` | **owner only**, needs a note (bank transfer/cash on pickup); logged |
| POST | `/orders/:id/refund` | `{amount?, reason}` → Paystack refund API (owner/admin) |
| GET | `/customers` · `/customers/:id` | With order history and lifetime spend |
| CRUD | `/delivery-zones` · `/coupons` | |
| GET/PUT | `/settings` | |
| CRUD | `/staff` | owner only: invite/disable staff, set role |
| GET | `/activity` | ActivityLog with filters |
| GET | `/subscribers?format=csv` | |

## Role matrix

| | staff | admin | owner |
|---|---|---|---|
| View orders/products/customers | ✓ | ✓ | ✓ |
| Update order status, notes | ✓ | ✓ | ✓ |
| Edit products & prices, stock | ✓ | ✓ | ✓ |
| Bulk price update, coupons, delivery zones | | ✓ | ✓ |
| Refunds, re-verify payments | | ✓ | ✓ |
| Mark paid manually, staff management, settings | | | ✓ |

## Conventions

- Responses: `{ success: true, data }` / `{ success: false, message, errors? }`.
- Pagination: `page`, `limit` (max 50), with `total` and `pages` returned.
- Every admin write goes into ActivityLog with before/after diffs.
- `cancelStaleOrders` job: `pending_payment` older than 24h → `cancelled`
  (it first calls Paystack verify once, in case a webhook was missed).
