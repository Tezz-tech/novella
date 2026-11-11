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
- [ ] All models in `03-backend-api.md`
- [ ] Public catalogue routes (products with filters/facets, product detail, categories, brands, suggest)
- [ ] Seed script: categories, brands, ~30 demo products (phones with storage/colour
      variants, laptops, accessories, 4 combos), delivery zones for all 36 states + FCT
      (Lagos cheaper), settings, an owner user from env
- [ ] Tests for product listing filters

## Phase 2 — Design system & layout
- [ ] UI kit: Button (primary/secondary/ghost), Input, Select, Badge, Card,
      Drawer, Modal, Toast, Skeleton, Tabs, Price, Rating, Divider with crown
- [ ] Animated primitives: Reveal, Stagger, MagneticButton, TiltCard, ShineSweep,
      SparkleField, SatinWave, MetalText, CountUp, IntroLoader
- [ ] Header (glass, mega menu, instant search), mobile bottom nav, footer,
      floating WhatsApp button, route transitions, Lenis
- [ ] `/styleguide` dev-only route showing every component
- [ ] Reduced-motion handled

## Phase 3 — Storefront
- [ ] Home with every section from the spec and the signature hero
- [ ] Shop/category with filters, sorting, URL state, skeletons
- [ ] Product page with variant picker, gallery, WhatsApp enquiry, related, recently viewed
- [ ] Combos and Deals pages
- [ ] Cart store (Zustand persisted), cart drawer, fly-to-cart animation, cart page
      using `/cart/quote` for server prices
- [ ] Wishlist, content pages, 404
- [ ] SEO: react-helmet-async titles/meta/OG, sitemap.xml + robots.txt from server

## Phase 4 — Auth & account
- [ ] Register/login/logout, forgot/reset password, httpOnly cookie JWT
- [ ] Account: profile, addresses, my orders, wishlist sync

## Phase 5 — Checkout & Paystack
- [ ] Checkout steps, delivery zones, coupon, server quote
- [ ] Order creation + Paystack initialize, Popup with redirect fallback
- [ ] Verify endpoint, webhook with signature, shared idempotent `confirmPayment`
- [ ] Success page (sparkles/confetti), failure/retry, track order page
- [ ] Emails (order received, admin new order)
- [ ] Stale order cancel job
- [ ] All Paystack tests in `04-paystack.md` passing
- [ ] Manual test with Paystack test card works end to end

## Phase 6 — Admin
- [ ] Admin login, layout, role guards
- [ ] Overview with charts and KPIs
- [ ] Products list, inline edit, create/edit with variants, images, combos
- [ ] Bulk price update with preview
- [ ] Orders list + detail (address copy/maps, status flow, tracking, print slip)
- [ ] Payments screen, re-verify, refunds, mark paid manually (owner)
- [ ] Customers, categories/brands, delivery zones, coupons, homepage content,
      settings, staff, activity log
- [ ] New-order live toast

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
