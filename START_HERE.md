# Novelle Tech — Claude Code Build Kit

Everything Claude Code needs to build the full Novelle Tech store in one go:
a React storefront with heavy animation, a Node/Express/MongoDB API, Paystack
payments and an admin dashboard.

## What's in here

| Path | What it is |
|---|---|
| `PROMPT.md` | **The prompt you paste into Claude Code.** |
| `CLAUDE.md` | Project rules Claude Code reads automatically on every turn. |
| `docs/01-product-spec.md` | What the store does: pages, flows, products, orders. |
| `docs/02-design-system.md` | Colours, fonts, components, every animation. |
| `docs/03-backend-api.md` | Folder layout, Mongo models, every API route. |
| `docs/04-paystack.md` | Exact Paystack payment flow, webhook and refunds. |
| `docs/05-admin-dashboard.md` | Every admin screen and what it can do. |
| `docs/06-build-plan.md` | Build phases with a checklist for each. |
| `brand/` | Logo cut out on a transparent background, icons, colour tokens. |

## How to use it

1. Make an empty project folder, e.g. `novelle-tech/`.
2. Copy **everything in this kit** into that folder (keep the structure, so
   `CLAUDE.md` sits at the root).
3. Open a terminal in the folder and run `claude`.
4. Paste the contents of `PROMPT.md`.
5. When Claude Code stops at the end of a phase, check it in the browser,
   then reply `continue`.

## What you'll need from the client (and put in `server/.env`)

- **Paystack keys** — test keys first (`sk_test_…`, `pk_test_…`) from
  dashboard.paystack.com → Settings → API Keys & Webhooks.
- **MongoDB Atlas** connection string (free tier is fine to start).
- **Cloudinary** account (free) for product images.
- An SMTP email account (Gmail app password, Resend, Brevo…) for order emails.
- Store details: WhatsApp number, phone, email, Instagram, pickup address,
  delivery fees per state/city, return policy.
- Real product photos. Don't use Apple's own marketing images or logos on the site.

## Decisions I made that you may want to change

- **Name:** the image says **NOVELLE TECH**, so that's what the kit uses.
  If it should be "Novella", search-and-replace before starting.
- **Currency:** Naira (NGN), since Paystack is mainly used in Nigeria/Ghana.
  It's one env var (`CURRENCY`) if the client is elsewhere.
- **Language:** JavaScript (not TypeScript), Vite + React, Tailwind, Framer Motion.
- **Admin** lives inside the same React app at `/admin` (lazy-loaded), so
  there's one frontend to deploy.
