# Novelle Tech — Project Rules

Single-vendor gadget store. Tagline: **"Smart Deals. Pretty Prices. ✨"**
Pillars: Affordable Phone Combos · Latest Smartphones · Reliable Support.

## Repo layout (monorepo, npm workspaces)

```
/client   React 18 + Vite storefront AND admin (/admin, lazy-loaded)
/server   Node 20 + Express API, Mongoose, Paystack, Cloudinary
/brand    Logo + design tokens (source of truth for colours)
/docs     Specs; read before changing behaviour
```

Root `package.json` scripts: `dev` (runs client + server with concurrently),
`build`, `test`, `lint`, `seed`.

## Code conventions

- JavaScript (ES modules) everywhere. No TypeScript.
- Client: function components and hooks; Tailwind using the tokens in
  `brand/tailwind.preset.cjs`; Framer Motion for animation; TanStack Query for
  server state; Zustand (persisted) for the cart and UI state; React Hook Form + Zod for forms.
- Server: `routes → controllers → services → models`; Zod validates every
  request body/query; one central error handler; `asyncHandler` wrapper;
  never put business logic in routes.
- Money is stored as **integers in the minor unit** (kobo for NGN). Format only
  for display with `Intl.NumberFormat`.
- Formatting with Prettier, linting with ESLint. Tests use Vitest (client)
  and Jest + Supertest + mongodb-memory-server (server).

## Non-negotiables

1. The server recomputes all prices, totals, delivery fees and coupons from
   the database. Ignore any amount the client sends.
2. Paid status only comes from Paystack verify or a webhook whose
   `x-paystack-signature` checks out. Processing must be idempotent.
3. Stock is decremented atomically (`findOneAndUpdate` with
   `stock: { $gte: qty }`) when payment is confirmed. Never let stock go below 0.
4. Admin routes require a JWT in an httpOnly cookie plus a role check. Write
   every admin change to the ActivityLog.
5. Security: helmet, CORS limited to `CLIENT_URL`, rate limiting on auth and
   checkout, express-mongo-sanitize, bcrypt (12 rounds), no secrets in the client bundle
   (only `VITE_PAYSTACK_PUBLIC_KEY` and `VITE_API_URL`).
6. Animations must respect `prefers-reduced-motion`, animate only
   transform/opacity where possible, and keep Lighthouse mobile performance ≥ 85.
7. Don't use Apple logos or Apple marketing images. Product images come from
   the admin's uploads (Cloudinary).
8. Accessibility: semantic HTML, focus rings in brand pink, keyboard-usable
   drawers/modals, alt text, colour contrast AA on text.

## Env vars (keep `.env.example` in sync)

Server: `PORT, NODE_ENV, MONGODB_URI, JWT_SECRET, JWT_EXPIRES_IN, CLIENT_URL,
PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, CURRENCY=NGN, CLOUDINARY_CLOUD_NAME,
CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASS, MAIL_FROM, ADMIN_NOTIFY_EMAIL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD`

Client: `VITE_API_URL, VITE_PAYSTACK_PUBLIC_KEY, VITE_CURRENCY=NGN,
VITE_WHATSAPP_NUMBER`
