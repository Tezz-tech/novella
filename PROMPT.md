You are building **Novelle Tech**, a production-ready e-commerce website for a
gadget seller (iPhones and other smartphones, laptops, accessories, phone
combos and other gadgets). It is a single-vendor store: the client sells, customers buy.

Before writing any code, read these files fully. They are the source of truth:

- `CLAUDE.md` (project rules)
- `docs/01-product-spec.md`
- `docs/02-design-system.md`
- `docs/03-backend-api.md`
- `docs/04-paystack.md`
- `docs/05-admin-dashboard.md`
- `docs/06-build-plan.md`
- `brand/` (logo files, `tokens.css`, `palette.json`, `tailwind.preset.cjs`)

Stack: React 18 + Vite (JavaScript), Tailwind CSS, Framer Motion, Lenis,
React Router, TanStack Query, Zustand · Node.js + Express · MongoDB + Mongoose ·
Paystack · Cloudinary.

How to work:

1. After reading, reply with a short summary of what you'll build and list any
   real contradictions you found in the docs. Then start Phase 0 without waiting.
2. Build in the phase order in `docs/06-build-plan.md`. Use your task list to
   track phases and their checklist items.
3. At the end of **each phase**: run the app, run the tests and linter, fix
   anything broken, tick off that phase's checklist, then **stop and tell me**
   what to check in the browser and which commands to run. Wait for me to reply
   "continue" before starting the next phase.
4. Never hard-code secrets. Put every key in `.env` and keep `.env.example` up to date.
5. Prices, totals, delivery fees and discounts are **always computed on the
   server**. Never trust amounts sent by the browser.
6. Only mark an order as paid after verifying with Paystack's API or a webhook
   with a valid signature (see `docs/04-paystack.md`).
7. The site must look and feel premium: black and rose-pink satin, glowing
   pink metal, the crown-N logo, smooth and generous animation, fully
   responsive, mobile first. Follow `docs/02-design-system.md` closely and
   respect `prefers-reduced-motion`.
8. Seed the database with realistic demo products (no Apple-owned images; use
   neutral placeholders) and one admin user taken from env vars, so everything
   can be tested immediately.
9. If something in the docs is ambiguous, choose the sensible option, write it
   down in `DECISIONS.md`, and keep going.

Start now.
