# Novelle Tech

Smart Deals. Pretty Prices. ✨

A single-vendor gadget store: phones, laptops, accessories, phone combos and smart watches.
It has a React storefront, an admin dashboard at `/admin`, a Node/Express API, MongoDB,
Paystack payments and Cloudinary images.

- Rules for the project: [CLAUDE.md](CLAUDE.md)
- Specs: [docs/](docs/)
- Decisions and open questions: [DECISIONS.md](DECISIONS.md)

## What is in here

| Path      | What it is                                                              |
| --------- | ----------------------------------------------------------------------- |
| `client/` | React 18 + Vite storefront and admin (admin is lazy-loaded at `/admin`) |
| `server/` | Express API: catalogue, cart pricing, checkout, Paystack, auth, admin   |
| `brand/`  | Logo, colour tokens, Tailwind preset (the source of truth for colours)  |
| `docs/`   | Product spec, design system, API, Paystack flow, admin, build plan      |

## Requirements

- Node.js 20 or later (tested on Node 26)
- A MongoDB database: a local instance, or a free MongoDB Atlas cluster
- Optional, for the full flow: Paystack keys, Cloudinary, and an SMTP account

## Setup

```bash
npm install                      # installs both workspaces
cp server/.env.example server/.env
cp client/.env.example client/.env
# edit both files (see "Environment" below)
npm run seed                     # demo products, delivery zones, settings, owner account
npm run dev                      # API on :5000, storefront on :5173
```

Open:

- Storefront: http://localhost:5173
- Admin: http://localhost:5173/admin/login (sign in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`)
- API health: http://localhost:5000/api/health

Change `SEED_ADMIN_PASSWORD` before you deploy, and use a real owner email.

## Environment

### `server/.env`

| Variable                                                               | Notes                                                                                  |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `PORT`                                                                 | API port, default 5000                                                                 |
| `NODE_ENV`                                                             | `development`, `test` or `production`                                                  |
| `MONGODB_URI`                                                          | Required. Atlas connection string or a local Mongo URL                                 |
| `JWT_SECRET`                                                           | Required. At least 32 random characters                                                |
| `JWT_EXPIRES_IN`                                                       | Session length, e.g. `7d`                                                              |
| `CLIENT_URL`                                                           | Storefront origin. CORS and Paystack redirects use it. Example `http://localhost:5173` |
| `CURRENCY`                                                             | `NGN`                                                                                  |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`                           | Test keys first (`sk_test_…`, `pk_test_…`)                                             |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Needed for admin photo uploads                                                         |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`        | Order and reset emails. Without SMTP, emails are logged instead                        |
| `ADMIN_NOTIFY_EMAIL`                                                   | Where new paid orders are announced                                                    |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                              | The owner account created by `npm run seed`                                            |

Missing optional keys never stop the server. It logs which integrations are not set up yet.

### `client/.env`

| Variable                   | Notes                                          |
| -------------------------- | ---------------------------------------------- |
| `VITE_API_URL`             | API base, e.g. `http://localhost:5000/api`     |
| `VITE_PAYSTACK_PUBLIC_KEY` | Public key only. Never put a secret key here   |
| `VITE_CURRENCY`            | `NGN`                                          |
| `VITE_WHATSAPP_NUMBER`     | Digits with country code, e.g. `2348012345678` |

Anything starting with `VITE_` is public and ships to the browser.

## Seeding

`npm run seed` is safe to run again. It updates the demo catalogue in place and creates the owner
only if it does not already exist, so an existing password is never reset. It creates 8 categories,
14 brands, 28 products, 4 combos, 37 delivery zones (36 states plus FCT), and the store settings.
Images are neutral placeholders, so upload real photos from the admin.

## Paystack: test payments locally

Paystack needs to reach your API to send webhooks, so for local testing expose the API with a tunnel.

1. Run a tunnel to port 5000, for example `ngrok http 5000`, or Cloudflare Tunnel.
2. In the Paystack dashboard (Settings → API Keys & Webhooks), set the webhook URL to
   `https://<your-tunnel-host>/api/payments/paystack/webhook`.
3. Use the test keys and Paystack's test cards to pay. The order is confirmed by a server check
   with Paystack, and by the webhook if it arrives.

The webhook checks the `x-paystack-signature` header against the raw request body on every call.
Requests that fail the check get a 401.

## Deployment

| Part                 | Where             | Notes                                                                                                                                                     |
| -------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storefront and admin | Vercel or Netlify | Build with `npm run build -w client`, output `client/dist`. Set `VITE_*` variables. Add an SPA rewrite so `/product/…` and `/admin/…` return `index.html` |
| API                  | Render or Railway | Start command `npm run start -w server`. Set all `server/.env` variables. Health check: `/api/health`                                                     |
| Database             | MongoDB Atlas     | Allow the API host in network access. Use a dedicated user                                                                                                |

After deploying:

- Point the storefront's `/sitemap.xml` at the API's `/sitemap.xml` with a rewrite. The storefront's
  `robots.txt` is in `client/public`.
- Set the Paystack webhook URL to the API domain (see above).
- Set `CLIENT_URL` on the API to the storefront's public origin. CORS and the payment redirect depend on it.

## Moving from test to live keys

1. Replace `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` with the live keys on the API and the storefront.
2. Replace the Paystack webhook URL with the production one, and confirm one small real payment.
3. Replace the placeholder delivery fees, pickup address, contact details and policies in the admin.
4. Re-run `npm run seed` only on a fresh database, or delete the demo products first.

## Scripts

| Command          | What it does                                         |
| ---------------- | ---------------------------------------------------- |
| `npm run dev`    | API and storefront together                          |
| `npm run build`  | Production build of the storefront and admin         |
| `npm test`       | Server (Jest, MongoDB in memory) and client (Vitest) |
| `npm run lint`   | ESLint for the whole repo                            |
| `npm run format` | Prettier                                             |
| `npm run seed`   | Seeds the database from `server/.env`                |

## Testing

- The server suite runs against a real MongoDB in memory. Paystack is mocked with `nock`, so no
  network or keys are needed.
- Covered: auth and roles, catalogue filters, cart pricing, checkout and payment confirmation
  (signature, idempotency, amount mismatch, stock), admin.
- The client suite covers the shared UI, the cart store, formatting and the admin variant grid.

## Notes

- Money is stored as whole kobo (NGN minor unit) and only formatted for display. The admin form
  takes naira and converts at the API boundary.
- The server recalculates every price, delivery fee and discount. The browser's amounts are ignored.
- A paid status is set only after a Paystack check or a signed webhook.
- Every admin change is written to the activity log with before and after values.
- "Mark paid manually" is not built. It conflicts with the rule above and is listed in DECISIONS.md
  for a decision.
