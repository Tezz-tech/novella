# 01 — Product Spec

## Who uses it

- **Shoppers:** browse gadgets, compare variants, buy with Paystack, track orders.
  They can check out as a guest or with an account.
- **Admin (owner/staff):** manage products and prices, see and fulfil orders
  (with full delivery address), check and manage payments, run the store.

## Catalogue

Categories (seeded, admin can edit): **Phones**, **Laptops**, **Accessories**
(chargers, cases, earbuds, power banks, screen guards), **Combos**, **Smart Watches**,
**Tablets**, **Gaming**, **Others**.

Brands (seeded, admin can edit): Apple, Samsung, Google, Tecno, Infinix, Xiaomi,
Redmi, HP, Dell, Lenovo, Oraimo, JBL, Anker, Others.

### Product

- Name, slug, brand, category, short description, full description (rich text), specs (key/value list)
- Images (1–8, Cloudinary), first one is the cover
- **Condition:** `brand_new`, `uk_used` (foreign used), `refurbished`, `open_box`
- **Variants**: each has its own options (e.g. Storage 128GB/256GB, Colour,
  RAM), SKU, price, compare-at price (for showing "was" prices), stock count and an optional image
- Products with no options still get exactly one default variant
- Tags: `new_arrival`, `best_seller`, `hot_deal`, `featured`
- Warranty text (e.g. "6 months store warranty")
- Status: `draft`, `active`, `archived`
- Rating summary (from reviews, if enabled)

### Combos (the "Affordable Phone Combos" pillar)

A combo is a product with `type: "combo"` that lists child items
(`productId`, `variantId`, `qty`) and has its **own bundle price**. The page
shows what's included and how much you save compared with buying separately.
Buying a combo reduces stock on each child variant. If any child is out of
stock, the combo shows as out of stock.

## Storefront pages

| Route | Purpose |
|---|---|
| `/` | Home: animated hero, three-pillar strip, featured categories, Hot Deals carousel, Combos section, New Arrivals, brand marquee, why-buy-from-us, testimonials, Instagram/WhatsApp call to action, newsletter |
| `/shop` | All products: filters (category, brand, condition, price range, storage, in stock), sorting (newest, price ↑/↓, best selling), search, URL query state, infinite scroll or pagination |
| `/category/:slug` | Same as shop, pre-filtered |
| `/product/:slug` | Gallery (zoom, swipe), variant picker that updates price/stock/image, condition badge, warranty, quantity, Add to cart, Buy now, "Chat on WhatsApp about this", specs tabs, related products, recently viewed |
| `/combos` | All combos |
| `/deals` | Items with a compare-at price |
| `/cart` | Cart page (a cart drawer is also available everywhere) |
| `/checkout` | Contact → delivery → review → pay (Paystack) |
| `/order/success?reference=…` | Verifies payment, shows the order summary with confetti/sparkles |
| `/track` | Track an order by order number + email or phone |
| `/account` | Login/register, my orders, saved addresses, wishlist, profile |
| `/wishlist` | Saved items (local storage for guests, synced after login) |
| `/about`, `/contact`, `/faq`, `/policies/returns`, `/policies/privacy`, `/policies/terms` | Content pages (FAQ and policies editable in admin Settings) |
| `*` | Branded 404 |

Global: sticky glass header (logo, search with instant results, categories
mega menu, wishlist, account, cart with count badge), mobile bottom nav, a
floating WhatsApp button, footer with contacts and socials.

## Checkout flow

1. **Contact:** full name, email, phone (Nigerian format check, but allow
   international numbers).
2. **Delivery:** method `delivery` or `pickup`.
   - Delivery: address line 1, address line 2, landmark, city/LGA, state
     (dropdown of all 36 states + FCT), optional delivery notes.
   - The delivery fee comes from the admin's **DeliveryZone** table (by
     state, optionally by city), with a free-delivery threshold.
   - Pickup: shows the store pickup address, with no fee.
3. **Review:** items, subtotal, delivery, coupon field, discount, total.
4. **Pay:** the server creates the order (`pending_payment`), starts a
   Paystack transaction, and the client opens Paystack Popup (with redirect
   as a fallback). See `04-paystack.md`.
5. **Success page** verifies the payment and clears the cart. On failure or
   cancel, show "Retry payment" for that same order.

Logged-in users can save addresses and pick one. Guests can tick "create an
account with these details".

## Order lifecycle

```
pending_payment → paid → processing → shipped → delivered
        ↘ cancelled (unpaid, auto after 24h or by admin)
paid/processing → cancelled → refunded (via Paystack refund)
```

- The order number is human-readable: `NVT-2611-00042` (prefix, YYMM, sequence).
- Every status change adds a timeline entry (who, when, note) and emails the customer.
- Shipped status takes an optional courier name + tracking number/link.
- Payment status is separate: `unpaid`, `paid`, `failed`, `refunded`,
  `partially_refunded`.

## Notifications (email, via Nodemailer, branded HTML templates)

- Customer: order received (paid), status updates, shipped (with tracking), refund.
- Admin: new paid order (with address), low-stock alert (stock ≤ threshold).

## Nice to have (build if time allows, behind feature flags in Settings)

- Product reviews (only after delivery; admin approves them)
- Coupons (% or fixed, min spend, expiry, usage limit)
- Newsletter signups list (exportable CSV)
- "Notify me when back in stock"
