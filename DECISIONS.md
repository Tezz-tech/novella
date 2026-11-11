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

## Planned for later phases (not built yet)

- **Phase 1, owner seed:** `npm run seed` creates one user with the `owner` role from `SEED_ADMIN_EMAIL`
  and `SEED_ADMIN_PASSWORD`, so owner-only screens can be tested. The prompt said "admin", but the docs
  need the owner role.
- **Phase 1, order numbers:** `NVT-YYMM-NNNNN`, with the sequence reset each month (one `Counter` per YYMM).
- **Phase 1, Hot Deals countdown:** the Product model gets an optional `dealEndsAt` field. The docs
  describe a countdown, but no model stores an end date.
- **Phase 1, seed images:** neutral generated SVG placeholders. Their `publicId` is `null`, and Cloudinary
  is used only for uploads made in the admin.
- **Phase 4, password hashing:** bcrypt with 12 rounds, as required. Use `bcryptjs` (same algorithm,
  pure JS, no native build) if the native `bcrypt` package fails to install on Windows.
- **Phase 5, payment references:** `Order.payment` keeps a history of references, because
  retry-payment creates a new one. `Payment` rows are unique on `(reference, eventId)`, not
  `(reference, source, status)`, so webhook events dedupe properly.
- **Phase 5, paid but out of stock:** the conditional decrement (`stock: { $gte: qty }`) fails. The order
  is still marked paid (never lose a paid order), no stock is decremented below 0, `stockIssue: true` is
  set, and the admin is alerted.
- **Phase 5, webhook:** the raw body is mounted before `express.json()`, for that path only.
