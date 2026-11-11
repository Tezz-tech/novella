# Decisions

Choices made where the docs were ambiguous or contradictory. Newest first within each phase.
Items marked **OPEN** need the client's answer before the phase they belong to.

## Open questions

- **OPEN (Phase 6): "Mark paid manually" vs. non-negotiable rule 2.** `docs/03` and `docs/05` let the
  owner mark an order paid without Paystack. `CLAUDE.md` says paid status only comes from a Paystack
  verify or a signed webhook. Not built yet. Options: (a) drop the feature, (b) keep it as an
  owner-only, logged, reason-required exception that is flagged as `manual` and excluded from Paystack
  reconciliation, (c) allow it only for pickup/cash orders. Decide before Phase 6.

## Phase 0: scaffold

### Libraries and versions

- **Express 4** (not 5). `express-mongo-sanitize` writes to `req.query`, which Express 5 makes read-only.
- **Tailwind 3.4**. The brand preset is CommonJS and is consumed with `presets: [require(...)]`, which v3 supports directly.
- **React Router 6.30** (not 7). In this npm setup, v7 pulled in a second React 19 copy, which breaks hooks.
- **@testing-library/react 15** (not 16). v16 installs React 19 as a peer, which duplicates React in tests.
- **Exact pins** for React, React DOM and React Router to keep the runtime stable.
- `"type": "module"` at the root, because `eslint.config.js` is ESM.
- Libraries used by the docs but not in the stack list (helmet, cors, zod, express-rate-limit,
  express-mongo-sanitize, cookie-parser, dotenv, Jest/Supertest, Vitest, Testing Library) are added only
  when a phase needs them. Recharts, GSAP, nodemailer, node-cron, multer, react-helmet-async, nock and
  mongodb-memory-server are planned for later phases.

### Behaviour

- **Database outage does not stop the API.** It starts, retries the connection every 5s, and
  `/api/health` reports `db`. A missing `MONGODB_URI` is still a startup error.
- **Optional integrations** (Paystack, Cloudinary, SMTP) never block startup. They are listed as
  warnings in the log until keys are set.
- **Environment validation** uses zod in `server/src/config/env.js`. Empty strings in `.env` count as unset.
- **CORS** echoes `CLIENT_URL` only, with credentials, so httpOnly cookies will work.
- **Rate limit** on `/api` is a general 600 requests per 15 minutes. Auth and checkout get stricter limits
  when those routes exist.

### Brand and design

- **The brand image is not used as the OG image.** `brand/reference/original-brand-image.jpg` shows the
  Apple logo on the phone, which breaks rule 7. `client/public/og-image.png` is a neutral card made from
  the crown-N mark and the tagline.
- **Wordmark** is built in code (Cinzel metal text plus Montserrat "TECH" with pink rules), as specified.
- **Fonts** are self-hosted via `@fontsource`, so no runtime requests go to Google.
- **Tokens:** `brand/tokens.css` is imported as the source of truth. The Tailwind preset is used as-is.

### Environment variables

- **Client `.env` variables:** `VITE_API_URL` and `VITE_PAYSTACK_PUBLIC_KEY` are the two secrets-free
  essentials. `VITE_CURRENCY` and `VITE_WHATSAPP_NUMBER` are also non-secret, so they are allowed.
  Rule 5 is read as "no secrets in the client", not "exactly these two keys".
- `server/.env.example` and `client/.env.example` are kept in sync with `CLAUDE.md`.

## Phase 1: data and catalogue

### Money and queries

- **The API uses kobo everywhere, including query filters.** `minPrice` and `maxPrice` are kobo, not
  naira, so the URL, the API and the client all use one unit. Naira is converted only at input
  boundaries (`nairaToKobo` in the seed and, later, the admin forms).
- **Price filters use the lowest active variant price** (`priceMin`). A product is in a range when that
  price falls inside it.
- **Derived fields on Product:** `priceMin`, `priceMax` and `totalStock` are computed in a `pre('validate')`
  hook. **Writes must go through `save()`, not `findOneAndUpdate`**, or these fields go stale.
- **Combo stock** is stored in `totalStock` and computed from the child variants, as the number of full
  bundles they can supply. The seed sets it. **Phase 5 must refresh combo stock whenever a child
  variant's stock changes**; that is not done yet.
- **Search** is a case-insensitive match on name, short description, tags, and brand and category names.
  Brand and category are references, so the text index does not cover them. The text index is kept for
  later.
- **Facets** (brands, categories, conditions, storage, price range) are computed over the current filtered
  set, so the counts match what a shopper can still pick.
- **Limits:** page size defaults to 24 and caps at 50. Invalid query input returns 400 with a field list.

### Models and seed

- **Settings** is a singleton (`key: 'main'`) with defaults created on first read.
- **Delivery zones** are one row per state (`city: '*'`), 37 rows in total (36 states plus FCT). The fees
  are placeholders for the owner to replace: Lagos ₦2,000, South-West neighbours ₦2,800, FCT ₦2,500,
  everywhere else ₦3,500.
- **Hot Deals countdown:** `Product.dealEndsAt` (optional). The docs describe a countdown, but no model
  stored an end date before this.
- **Demo images** are a neutral SVG (`client/public/placeholders/product.svg`) with `publicId: null`.
  Cloudinary is used only for uploads made in the admin.
- **The seed is safe to re-run.** Records are matched by slug or key and updated in place. The owner is
  created only if it does not exist, so an existing password is never reset.
- **Owner seed:** `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` create one user with the `owner` role. The
  prompt said "admin", but the owner-only screens in the docs need the owner role.
- **Payments:** `Payment` has a partial unique index on `(reference, eventId)`, applied only where
  `eventId` is set. This lets a replayed webhook be stored once.
- **Orders:** `payment.references` keeps every reference from retry-payment. `payment.reference` is the
  latest one and is sparse-unique.
- **Public API:** `GET /api/settings/public` and `GET /api/delivery-zones` are included with the
  catalogue routes, because the docs list them as public and the checkout needs them.

### Tests

- 32 server tests run against a real in-memory MongoDB (`mongodb-memory-server`) with the full seed
  loaded. They cover every filter, sorting, pagination, facets, draft exclusion, combo savings, the
  kobo rule, and seed idempotency.
- The seed CLI and the live API were also run against a live in-memory database to confirm the end-to-end path.

## Planned for later phases (not built yet)

- **Phase 1, order numbers:** `NVT-YYMM-NNNNN`, with the sequence reset each month (one `Counter` per YYMM).
  Built with order creation in Phase 5, since no orders exist yet.
- **Phase 4, password hashing:** already in place. `bcryptjs` with 12 rounds (same algorithm as bcrypt,
  pure JS, so no native build on Windows). Used by the owner seed and reused for login.
- **Phase 5, payment references:** `Order.payment` keeps a history of references, because
  retry-payment creates a new one. `Payment` rows are unique on `(reference, eventId)`, not
  `(reference, source, status)`, so webhook events dedupe properly.
- **Phase 5, paid but out of stock:** the conditional decrement (`stock: { $gte: qty }`) fails. The order
  is still marked paid (never lose a paid order), no stock is decremented below 0, `stockIssue: true` is
  set, and the admin is alerted.
- **Phase 5, webhook:** the raw body is mounted before `express.json()`, for that path only.

## Phase 2 and 3: design system, storefront

- **No testimonials section.** The build plan asked for testimonials, but there are no real customer
  reviews yet. Showing invented quotes would break the rule against fabricated reviews, so the home
  page has a "Why buy from Novelle Tech" section instead. Real testimonials can be added through the admin later.
- **Cart prices come only from the server.** The browser stores only variant ids, quantities and
  display labels. The cart drawer, cart page and checkout all price through `POST /api/cart/quote`.
- **Quote rules:** duplicate lines merge and cap at 99. Out-of-stock or over-stock lines are flagged and
  left out of the subtotal, and `hasIssues` blocks checkout. Delivery comes from the zone table (a
  city-specific zone beats the whole-state zone). Free delivery applies at or above the store threshold.
  Pickup costs nothing. A state with no zone returns a clear 400. Coupons only apply when
  `features.coupons` is on, which it is not by default.
- **Hot deals** use a server flag, `hasDiscount`, set on save. The countdown uses the soonest `dealEndsAt`.
- **Price filter** uses fixed presets (under ₦100k, ₦100k–₦300k, ₦300k–₦600k, ₦600k and above), sent in kobo.
- **Shop filters live in the URL,** so filtered views can be shared and bookmarked.
- **Recently viewed and wishlist** store only names and images, never prices. The wishlist shows no price,
  to avoid showing a stale one.
- **Fly-to-cart** uses the Web Animations API on transform and opacity only, and is skipped for reduced motion.
- **SEO:** each page sets its title, description, Open Graph and canonical tags. `/sitemap.xml` and
  `/robots.txt` are served from the API, outside `/api`. Admin, account, cart and checkout are disallowed.
- **Tests added:** 42 server tests (pricing and catalogue) and 14 client tests, run with `npm test`.
- **Not yet verified:** the visual look in a real browser, and a Lighthouse score. Both need a
  browser session, which this environment does not have.

## Phase 4: accounts

- **Session:** a JWT in an httpOnly cookie named `nvt_session`. It is `SameSite=Lax`, `Secure` in
  production, and lasts 7 days. The API accepts JSON only, and the cookie is never readable by scripts.
- **Login timing:** an unknown email still runs a bcrypt compare, so a response does not reveal whether an account exists.
- **Password reset:** the emailed token is random and 30 minutes long. Only its SHA-256 hash is stored,
  and it works once. The forgot-password response is the same whether or not the email exists.
- **Email without SMTP:** if `SMTP_HOST` is not set, the email is logged instead of sent. In development the
  reset link is also logged, so the flow can be tested. Production needs SMTP configured.
- **Rate limits:** auth routes allow 20 attempts per 15 minutes in production. The test environment
  uses a much higher limit so the suite can log in many times.
- **Wishlist sync:** on login, the guest list is merged into the account, and changes after that are
  saved with a short debounce. The stored items hold names and images only, never prices.
- **Order visibility:** customers only see their own orders. Someone else's order number returns a 404, not a 403.
- **Addresses:** up to 10 per customer, with exactly one default.
- **Tests:** 58 server tests now include the auth suite. Client tests: 14.

## Phase 5: checkout and Paystack

- **One place marks an order paid:** `confirmPayment`. The verify endpoint, the webhook, admin re-verify
  and the stale-order job all call it. It asks Paystack for the transaction, checks status, amount, currency
  and reference against the stored order, and only then moves the order to paid. A second call changes nothing.
- **Amount mismatch:** never fulfilled. The order is marked `failed`, the event is recorded, and the owner is
  flagged in the timeline. Stock is untouched.
- **Stock on payment:** taken with one conditional update per variant (`$elemMatch` on stock ≥ qty), so stock
  never goes below zero. If the stock has gone since checkout, the order is still kept as paid, flagged
  `stockIssue`, and the owner is alerted by email. Combos take stock from their child variants, and the combo's
  own stock is recalculated.
- **Webhook:** the raw body is read before JSON parsing, the HMAC-SHA512 signature is checked with a timing-safe
  compare, and the event is then verified again with Paystack's API. Duplicate events are recorded once
  (unique index on reference + event id). In production the webhook replies first and processes after.
  In tests it processes first so the test can check the result.
- **Retry:** each attempt gets its own reference, kept in `payment.references`. Retry needs the email used on
  the order, so an order number alone is not enough to pay for someone else's order.
- **Stale orders:** every 30 minutes, unpaid orders older than 24 hours are verified once with Paystack, then
  cancelled. This uses `setInterval` instead of node-cron, since it is one job.
- **Order numbers:** `NVT-YYMM-NNNNN`, from an atomic counter per month (see the Phase 1 note).
- **Account creation at checkout:** only for a new email. If the email already has an account, the order is not
  linked to it. Linking would let anyone attach orders to someone else's account.
- **Tracking and the success page** return status and timeline only, never the delivery address.
- **Email:** order received (customer) and new paid order (owner, if `ADMIN_NOTIFY_EMAIL` is set). Without SMTP
  they are logged.
- **Client:** the cart is cleared only after the success page confirms payment on the server. If the popup
  cannot open, the customer is sent to Paystack's hosted page.
- **Not yet done:** a manual end-to-end payment with Paystack test keys and test cards. That needs your keys.
  The tests mock Paystack with nock.

## Phase 6: admin

- **Role matrix** is enforced on the server, not just hidden in the UI. Staff can view everything and edit
  orders, products, stock and prices. Admin adds bulk prices, refunds, re-verify, coupons, delivery zones,
  marketing, activity and subscribers. Owner adds store settings and staff. Every admin write is logged.
- **Prices in the admin API are naira.** The admin form types naira, so the server converts to kobo at the
  boundary (`nairaToKobo`). The public API stays in kobo. This is the one place money is in naira.
- **Mark paid manually: not built.** It conflicts with CLAUDE.md non-negotiable 2 (paid only from Paystack
  verify or a signed webhook). This needs your decision (see the open question at the top of this file).
- **Inline quick edit** of price, compare-at, stock and active flag lives on the product form, per variant.
  The product list does not expand rows inline, so this is a deliberate simplification.
- **Bulk prices** always show a dry-run preview first, then apply. Rounding is to the nearest ₦100 or ₦1,000.
  Prices never fall below zero. Compare-at prices that are not set are skipped.
- **Products with orders are archived, not deleted,** so order history keeps its links.
- **Refunds** go through Paystack. The Refund is `pending` until the webhook says it is processed or failed.
  Restocking happens at the time of the refund request.
- **Order cancellation** is allowed from unpaid, paid and processing. A paid order that is cancelled still
  needs a separate refund. The owner decides whether to refund.
- **Staff invites:** a random temporary password is emailed when SMTP is configured. It is also returned
  once, to the owner who sent the invite, so they can pass it on when no email is set up. It is never logged.
  A staff member cannot demote or disable their own account.
- **Customers** are built from their orders, so guests show up too. "Registered" means an account exists with
  the same email.
- **Dashboard** KPIs compare with the previous period of the same length. The order count change is shown as 0
  for now, since it has no previous-period comparison yet.
- **Charts** use Recharts, as the admin spec asks.
- **Catalogue routes** were checked and fixed (the first draft had built the path `/categorys`).
- **Admin code is lazy-loaded** (its own chunk), so storefront visitors never download it.
- **Tests:** 25 admin tests cover role gating, product creation and stock, combo stock refresh, bulk price
  preview and apply, the order state machine, refunds through mocked Paystack, owner-only settings, staff
  invites, and the activity log. Client: 17 tests, including the variant grid. Server total: 96.

## Phase 7: polish and ship

- **Lighthouse (mobile, throttled, cold profile), home page:** performance 60 (target 85, **not met**),
  accessibility 95 (target 95, met), best practices 96, SEO 100 (target 95, met).
  The main causes: a React bundle of about 125 KB that takes time to run on throttled CPUs, and the
  mandatory first-visit intro (up to 1.6 s), which covers the first paint on a cold profile. Returning
  visitors in the same session skip the intro. Closing the gap needs prerendering the home page or
  cutting hydration work. That is a larger change, so it is left for a decision.
- **Performance changes made:** blur and drop-shadow filters removed from the hero and cards, since they cost
  paint time on phones. The header's backdrop blur only applies at tablet width and up. On phones the
  headline reveals word by word rather than letter by letter (desktop keeps letters). No entrance fade
  on the first paint. The hero placeholder shows at once and the real product replaces it when loaded.
  The API origin is preconnected.
- **SEO:** a static `robots.txt` in `client/public`. The API serves `/sitemap.xml`, so the storefront
  domain needs a rewrite to it (see README).
- **Images:** Cloudinary uploads use `f_auto,q_auto`, and product images lazy-load. Responsive `srcset`
  sizes are not done yet.
- **Resilience:** an error boundary around the storefront and admin, a connection notice when the device
  goes offline, and skeletons while data loads.
- **Layout checks:** headless Chrome screenshots at 360, 390, 768 and 1280 px were reviewed. At 1920 px no
  horizontal overflow was found, but the screenshot was not reviewed. At tablet width the bottom bar now
  shows up to 1024 px, because the header links are hidden below that, so Combos and Deals stay reachable.
- **Shopper flow in a real browser:** product → add to cart → cart → checkout (contact step) ran with no
  runtime errors. No payment was made, since that needs live Paystack keys.
- **Not verified here:** a real Paystack payment, sent emails (no SMTP), Cloudinary uploads (no keys), and
  the production deploy.
- **Lint:** 0 errors and 7 fast-refresh warnings. These are files that export both a component and a helper.
