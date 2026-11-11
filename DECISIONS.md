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
