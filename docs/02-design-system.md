# 02 — Design System

The brand image (`brand/reference/original-brand-image.jpg`) is the mood:
**deep black, glowing rose-pink metal, flowing pink satin, small sparkles, a
crown.** Luxurious, feminine, confident. Not cartoonish. Not flat pink.

## Logo

- `brand/logo-mark.png`: crown-N, transparent background (cut out from the brand image).
- `brand/logo-mark-512.png`: same, square and padded.
- `brand/app-icon-512.png`, `apple-touch-icon.png`, `favicon.ico`,
  `favicon-32.png`, `favicon-64.png`: for the PWA manifest and HTML head.
- **Wordmark** is built in code, not as an image: "NOVELLE" in Cinzel 600 with
  the metallic gradient text effect, and "TECH" underneath in Montserrat 500,
  letter-spacing 0.6em, with thin pink lines on both sides (like the brand image).
- Header: logo mark (36–44px tall) + wordmark. Mobile: mark + "NOVELLE" only.
- The logo is never recoloured, stretched or placed on a light background without its dark backing.

## Colour (exact values in `brand/tokens.css`)

| Token | Hex | Use |
|---|---|---|
| `ink-950` | `#07040A` | Page background |
| `ink-900` | `#0E0910` | Section background |
| `ink-800` | `#171018` | Cards, inputs |
| `ink-700` | `#241A24` | Borders, hover surfaces |
| `rose-50` | `#FFF0F6` | Main text on dark |
| `rose-200` | `#FCD3E6` | Highlights, metallic shine |
| `rose-300` | `#F5A8CC` | Secondary accents |
| `rose-400` | `#E88FBF` | **Primary brand pink** (buttons, links, icons) |
| `rose-500` | `#D884A8` | Primary hover / metallic midtone |
| `rose-700` | `#902F54` | Satin shadow, deep accents |
| `rose-800` | `#601830` | Satin deep shadow |
| `rose-900` | `#3A0C1F` | Glow base, tinted backgrounds |
| `spark-400` | `#F5C451` | Sparkle accent only (✨ moments, "Hot Deal" star). Use sparingly |
| `success` | `#5ED3A0` · `warning` `#F5C451` · `danger` `#FF6B8A` | States |

Gradients:
- **Metal** (text and logo-like headings): `linear-gradient(180deg, #FCD3E6 0%, #E88FBF 45%, #B55A86 70%, #F5A8CC 100%)`, applied with `background-clip:text`.
- **Satin** (hero/footer waves): `#3A0C1F → #902F54 → #D884A8 → #902F54`.
- **Glow:** `box-shadow: 0 0 24px rgba(232,143,191,.35), 0 0 64px rgba(232,143,191,.15)`.

Muted text is `rose-50` at 65% opacity. Body text never uses pure white.

## Typography (Google Fonts, self-hosted via @fontsource)

- **Display:** Cinzel (600/700), for hero titles and section titles, often with the metal gradient
- **Accent serif italic:** Playfair Display Italic, for taglines like *"Smart Deals. Pretty Prices."*
- **UI/body:** Montserrat (400/500/600). Small-caps labels use letter-spacing 0.2em, uppercase
- **Prices:** Montserrat 600, tabular numbers

Scale (mobile → desktop): h1 40→72, h2 28→44, h3 20→28, body 15→16, small 13.

## Components

- **Buttons**
  - *Primary:* pill shape, metal gradient fill, ink text, glow on hover, a shine sweep runs across on hover
  - *Secondary:* pill outline (1px rose-400) like the tagline box in the brand image, with a pink tint fill on hover
  - *Ghost:* text only
  - Pressed state: scale .97. Loading: spinner + label
- **Product card:** ink-800, 1px border that brightens on hover, 20px radius.
  Image on a soft radial pink glow. Badges (Hot Deal, New, UK Used, −15%).
  Wishlist heart (like the outline heart in the brand image). Price + strike-through
  compare price. "Add" button appears on hover (desktop) or is always shown (mobile).
- **Badges:** small pill, uppercase, letter-spaced
- **Inputs:** ink-800, rose-400 focus ring with glow, floating labels
- **Drawer/modal:** glass panel (`backdrop-blur-xl`, ink-900 at 80%), spring entrance
- **Toasts:** bottom-centre on mobile, top-right on desktop, with a pink edge glow
- **Skeletons:** ink-800 with a pink shimmer sweep
- **Section divider:** thin line + centred small crown icon (SVG)
- **Admin UI:** same palette but calmer, with less glow, denser tables, and still pink accents and the logo

## Animation (Framer Motion + Lenis; GSAP allowed only for the hero timeline)

Global:
- Lenis smooth scroll (off for reduced motion)
- Route transitions: fade + 12px slide; a pink progress bar at top while loading
- Scroll reveals: sections fade up with staggered children (`whileInView`, once)
- Standard easing `[0.22, 1, 0.36, 1]`, durations 0.35–0.8s

Signature moments:
1. **Intro loader (first visit only, ≤ 1.6s):** the crown-N fades in, then a
   light glint sweeps across it, the crown drops slightly into place, and sparkles burst. Skippable on click.
2. **Hero:** animated satin wave at the bottom (SVG paths morphing, or a
   WebGL-free canvas gradient), floating product image with a slow parallax
   bob, cursor-follow pink glow on desktop, the headline revealing letter by
   letter with the metal gradient, and the tagline pill drawing its border on.
3. **Sparkle field:** a lightweight canvas/particles layer of tiny
   twinkling 4-point stars in hero and success pages (cap 40 particles; pause when off-screen).
4. **Product cards:** 3D tilt on hover (max 6°), shine sweep across the image,
   image scales 1.05.
5. **Add to cart:** the product thumbnail flies along a curve into the cart
   icon, the cart badge bounces, and the cart drawer springs in.
6. **Variant switch:** the price number animates (counts up/down) and the
   image crossfades.
7. **Brand marquee:** infinite scroll, pauses on hover.
8. **Hot Deals:** countdown timer with flip digits.
9. **Checkout:** step indicator with an animated progress line, and the
   cards slide between steps.
10. **Order success:** big animated check made of the crown, sparkle burst,
    pink confetti.
11. **Buttons/links:** magnetic hover on main CTAs (desktop), and an
    underline grows on links.
12. **Admin:** KPI numbers count up, charts animate in, table rows stagger
    in, status change badge morphs.

Rules: `useReducedMotion()` turns off loaders, particles, tilt, parallax and
marquee (fade only). Lazy-load heavy animation components. No layout shift.
Target 60fps on mid-range Android.

## Imagery

Product photos on transparent or dark backgrounds, sitting on a soft pink
radial glow. Use pink satin and wave textures as SVG/CSS (generated, not
copied from the brand image), except the brand image itself can be used as an
Open Graph/social share image.
