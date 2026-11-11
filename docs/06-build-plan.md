# 06 — Build Plan

Work through these phases in order. At the end of each one: run, test, lint,
tick the checklist, then stop and report what to check.

## Phase 0 — Scaffold
- [x] npm workspaces monorepo: `client` (Vite React JS) and `server` (Express)
- [x] ESLint + Prettier, `.editorconfig`, `.gitignore`, `.env.example` for both
- [x] Tailwind with `brand/tailwind.preset.cjs`, `brand/tokens.css` imported
- [x] Fonts via @fontsource (Cinzel, Playfair Display italic, Montserrat)
- [x] Copy brand assets into `client/public` (favicons, manifest, logo, OG image)
- [x] Server: env validation, Mongo connection, health route, error handler, security middleware
- [x] `npm run dev` starts both; client shows a placeholder page with the logo
- [x] `git init` and first commit

## Phase 1 — Data & catalogue API
- [x] All models in `03-backend-api.md`
- [x] Public catalogue routes (products with filters/facets, product detail, categories, brands, suggest)
- [x] Seed script: categories, brands, ~30 demo products (phones with storage/colour
      variants, laptops, accessories, 4 combos), delivery zones for all 36 states + FCT
      (Lagos cheaper), settings, an owner user from env
- [x] Tests for product listing filters

## Phase 2 — Design system & layout
- [x] UI kit: Button (primary/secondary/ghost), Input, Select, Badge, Card,
      Drawer, Modal, Toast, Skeleton, Tabs, Price, Rating, Divider with crown
- [x] Animated primitives: Reveal, Stagger, MagneticButton, TiltCard, ShineSweep,
      SparkleField, SatinWave, MetalText, CountUp, IntroLoader
- [x] Header (glass, mega menu, instant search), mobile bottom nav, footer,
      floating WhatsApp button, route transitions, Lenis
- [x] `/styleguide` dev-only route showing every component
- [x] Reduced-motion handled

## Phase 3 — Storefront
- [x] Home with every section from the spec and the signature hero
- [x] Shop/category with filters, sorting, URL state, skeletons
- [x] Product page with variant picker, gallery, WhatsApp enquiry, related, recently viewed
- [x] Combos and Deals pages
- [x] Cart store (Zustand persisted), cart drawer, fly-to-cart animation, cart page
      using `/cart/quote` for server prices
- [x] Wishlist, content pages, 404
- [x] SEO: react-helmet-async titles/meta/OG, sitemap.xml + robots.txt from server

## Phase 4 — Auth & account
- [x] Register/login/logout, forgot/reset password, httpOnly cookie JWT
- [x] Account: profile, addresses, my orders, wishlist sync

## Phase 5 — Checkout & Paystack
- [x] Checkout steps, delivery zones, coupon, server quote
- [x] Order creation + Paystack initialize, Popup with redirect fallback
- [x] Verify endpoint, webhook with signature, shared idempotent `confirmPayment`
- [x] Success page (sparkles/confetti), failure/retry, track order page
- [x] Emails (order received, admin new order)
- [x] Stale order cancel job
- [x] All Paystack tests in `04-paystack.md` passing
- [ ] Manual test with Paystack test card works end to end (needs your test keys)

## Phase 6 — Admin
- [x] Admin login, layout, role guards
- [x] Overview with charts and KPIs
- [x] Products list, inline edit, create/edit with variants, images, combos
- [x] Bulk price update with preview
- [x] Orders list + detail (address copy/maps, status flow, tracking, print slip)
- [x] Payments screen, re-verify, refunds, mark paid manually (owner)
- [x] Customers, categories/brands, delivery zones, coupons, homepage content,
      settings, staff, activity log
- [x] New-order live toast

## Phase 7 — Polish & ship
- [ ] Lighthouse mobile: performance ≥ 85, accessibility ≥ 95, SEO ≥ 95
- [ ] Image optimisation (Cloudinary `f_auto,q_auto`, responsive sizes, lazy loading)
- [ ] Code splitting (admin, heavy animation chunks)
- [ ] Error boundaries, offline toast, loading states everywhere
- [ ] Test on 360px, 768px, 1280px, 1920px widths
- [ ] README: setup, env, seeding, Paystack webhook setup with ngrok,
      deployment (client → Vercel/Netlify; server → Render/Railway; DB → Atlas),
      switching from test to live keys
- [ ] Final full test run, then commit
