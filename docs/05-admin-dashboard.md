# 05 — Admin Dashboard (`/admin`)

Lazy-loaded route group inside the client. Its own layout: collapsible
sidebar (logo at the top), top bar (global search, notifications bell, profile menu).
Responsive: the sidebar becomes a drawer on mobile, so the owner can manage orders from a phone.

`/admin/login` is a separate branded page (crown-N with a glint animation).
Customer accounts can't open admin routes.

## Screens

### 1. Overview `/admin`
- Date range picker (Today, 7d, 30d, 90d, custom)
- KPI cards (count-up animation): Revenue (paid), Orders, Average order value,
  Pending to ship, New customers, Refunds. Each with % change vs previous period
- Revenue line/area chart (Recharts) and orders-by-status donut
- Top 5 products (by revenue and units)
- **Low stock** list with inline "restock" quantity edit
- Recent orders table (live: refetch every 30s, with a toast + soft chime when a new paid order arrives)
- Orders by state (bar chart)

### 2. Products `/admin/products`
- Table: thumbnail, name, category, brand, condition, price range, total stock,
  status, updated. Search, filters, sort, pagination, bulk select
- **Inline edit** of price, compare-at price and stock per variant (expand row)
- Bulk actions: activate, archive, delete, tag, **update prices**
- **Bulk price update modal:** choose products (selected / by category /
  brand / all), mode (+/− %, +/− fixed amount, set to), field (price /
  compare-at), rounding (nearest ₦100 / ₦1,000). Shows a **preview table of
  old → new** before confirming. Logged
- Create/Edit page (`/admin/products/new`, `/:id`):
  - Basics, category, brand, condition, warranty, tags, status
  - Rich text description, specs (key/value list you can drag to reorder)
  - Images: drag and drop upload to Cloudinary, reorder, set cover, alt text
  - Options builder (e.g. Storage: 128GB, 256GB · Colour: Pink, Black) →
    automatically builds the variant grid; edit SKU, price, compare-at, stock per row
  - Combo builder (if type = combo): search and add child variants with qty,
    shows the sum of individual prices vs combo price = savings
  - SEO fields, a live "preview card" in brand style
  - Autosave draft every 10s, warn on leave with unsaved changes

### 3. Orders `/admin/orders`
- Tabs with counts: All · Pending payment · Paid (to process) · Processing ·
  Shipped · Delivered · Cancelled · Refunded
- Table: order #, date, customer, phone, state/city, items count, total,
  payment badge, status badge, channel
- Filters: date range, state, payment status, search. Export CSV
- **Order detail** `/admin/orders/:id`:
  - Customer card (name, email, phone with **Call** and **WhatsApp** buttons)
  - **Delivery address card** (full address, landmark, notes) with **Copy
    address** and **Open in Google Maps** buttons, and an edit-address action
  - Items with images, variants, unit price, qty, totals, delivery, discount
  - Payment card: reference, channel, paid at, amount, fees, card last 4,
    **Re-verify with Paystack**, **Refund**, owner-only **Mark paid manually**
  - Status stepper: move to next status, add a note, set courier + tracking on Shipped
  - Timeline (all status/payment events, who did them)
  - Internal notes
  - **Print packing slip / invoice** (branded print stylesheet, PDF via browser print)
- Bulk: mark selected as processing/shipped, print slips

### 4. Payments `/admin/payments`
- Totals: collected, Paystack fees, net, refunded (for the selected range)
- Table of payment events: reference, order #, amount, channel, status,
  source (verify/webhook/re-verify), date. Click → order
- Flags: amount mismatches, paid with stock issue, pending > 1h
- Refunds list with status

### 5. Customers `/admin/customers`
- List: name, email, phone, orders, lifetime spend, last order, registered/guest
- Detail: addresses, orders, wishlist

### 6. Catalogue setup
- Categories (drag to reorder, image, active), Brands (logo)

### 7. Delivery `/admin/delivery`
- Zones table (state, city or "whole state", fee, ETA, active). Bulk-set fee
  for many states. Free delivery threshold. Pickup address

### 8. Marketing
- Coupons CRUD with usage stats
- Homepage: hero slides (image, title, subtitle, CTA link), announcement bar,
  which categories/products are featured
- Newsletter subscribers (export)

### 9. Settings `/admin/settings` (owner)
- Store info, contacts, socials, WhatsApp number, policies and FAQ
  (rich text), feature flags, low-stock default
- Staff & roles (invite by email with a temporary password, disable, change role)
- Activity log viewer (filter by user/entity/date)

## Admin UX details
- Every destructive action uses a confirm dialog; deletes of products with
  orders become archive instead
- Optimistic updates with rollback on error (TanStack Query)
- Toasts for every save
- Empty states with the crown icon and a helpful action
- Prices are typed as Naira and shown with formatting; converted to kobo at the API boundary
