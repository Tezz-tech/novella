import { Link } from 'react-router-dom';
import { useBrands, useCategories, useProducts, useSettings } from '../../lib/queries.js';
import { Reveal, Stagger, StaggerItem } from '../motion/Reveal.jsx';
import ProductCard from '../product/ProductCard.jsx';
import { ProductGridSkeleton } from '../product/ProductGrid.jsx';
import Button from '../ui/Button.jsx';
import { Divider, Skeleton } from '../ui/display.jsx';
import Newsletter from './Newsletter.jsx';

const PILLARS = [
  {
    title: 'Affordable Phone Combos',
    body: 'A phone plus the accessories you actually need, bundled for less.',
    to: '/combos',
  },
  {
    title: 'Latest Smartphones',
    body: 'New arrivals, plus carefully checked UK used and open-box stock.',
    to: '/shop?tag=new_arrival',
  },
  {
    title: 'Reliable Support',
    body: 'Real people on WhatsApp before and after you buy.',
    to: '/contact',
  },
];

export function PillarStrip() {
  return (
    <section aria-label="What we stand for" className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <Stagger className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((p) => (
          <StaggerItem key={p.title}>
            <Link
              to={p.to}
              className="group relative block h-full overflow-hidden rounded-card border border-ink-700 bg-ink-800 p-6 transition-colors hover:border-rose-400/60"
            >
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-glow-radial transition-transform duration-500 group-hover:scale-150"
              />
              <h3 className="text-lg text-rose-50">{p.title}</h3>
              <p className="mt-2 text-sm text-rose-50/65">{p.body}</p>
              <span className="mt-4 inline-block text-xs uppercase tracking-label text-rose-300 group-hover:text-rose-100">
                Explore →
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function FeaturedCategories() {
  const { data: categories, isLoading } = useCategories();
  const shown = (categories ?? []).filter((c) => c.slug !== 'combos').slice(0, 6);
  return (
    <section aria-labelledby="cats-title" className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <Reveal className="mb-8">
        <h2 id="cats-title" className="text-3xl md:text-4xl">
          Shop by category
        </h2>
      </Reveal>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {shown.map((c) => (
            <StaggerItem key={c._id}>
              <Link
                to={`/category/${c.slug}`}
                className="group flex h-28 items-end overflow-hidden rounded-card border border-ink-700 bg-ink-800 p-5 transition-colors hover:border-rose-400/60"
              >
                <span
                  className="bg-glow-radial absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  aria-hidden="true"
                />
                <span className="relative text-lg text-rose-50 group-hover:text-rose-200">
                  {c.name}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

function Rail({ title, eyebrow, to, params }) {
  const { data, isLoading } = useProducts(params);
  if (!isLoading && !data?.items?.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 md:px-8">
      <Reveal className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-label text-rose-300">{eyebrow}</p>
          <h2 className="mt-2 text-3xl md:text-4xl">{title}</h2>
        </div>
        <Link
          to={to}
          className="hidden text-sm text-rose-200 underline underline-offset-4 md:inline"
        >
          View all
        </Link>
      </Reveal>
      {isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : (
        <Stagger className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {data.items.slice(0, 4).map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </Stagger>
      )}
      <div className="mt-8 text-center md:hidden">
        <Button to={to} variant="secondary">
          View all
        </Button>
      </div>
    </section>
  );
}

export function ComboRail() {
  return (
    <Rail
      eyebrow="Affordable phone combos"
      title="Bundles that save you more"
      to="/combos"
      params={{ type: 'combo', limit: 4 }}
    />
  );
}

export function NewArrivals() {
  return (
    <Rail
      eyebrow="Just in"
      title="New arrivals"
      to="/shop?tag=new_arrival"
      params={{ tag: 'new_arrival', sort: 'newest', limit: 4 }}
    />
  );
}

export function BrandMarquee() {
  const { data: brands = [] } = useBrands();
  const names = brands.map((b) => b.name);
  if (!names.length) return null;
  const loop = [...names, ...names];
  return (
    <section
      aria-label="Brands we sell"
      className="overflow-hidden border-y border-ink-700 bg-ink-900 py-6"
    >
      <ul className="animate-marquee flex w-max gap-12 whitespace-nowrap text-sm uppercase tracking-label text-rose-50/60 hover:[animation-play-state:paused]">
        {loop.map((n, i) => (
          <li
            key={`${n}-${i}`}
            aria-hidden={i >= names.length || undefined}
            className="flex items-center gap-12"
          >
            {n}
            <span aria-hidden="true" className="text-rose-400">
              •
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WhyBuy() {
  const items = [
    [
      'Server-checked prices',
      'The price you see is the price you pay. Totals are calculated on our side.',
    ],
    [
      'Clear condition labels',
      'Brand new, UK used, refurbished or open box, shown on every product.',
    ],
    [
      'Pay securely',
      'Card, bank transfer or USSD through Paystack. We never see your card details.',
    ],
    ['Track your order', 'Get updates by email, and track any order with its number.'],
  ];
  return (
    <section aria-labelledby="why-title" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <Reveal className="mb-10 text-center">
        <h2 id="why-title" className="text-3xl md:text-4xl">
          Why buy from Novelle Tech
        </h2>
      </Reveal>
      <Stagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([t, b]) => (
          <StaggerItem key={t} className="rounded-card border border-ink-700 bg-ink-800/60 p-6">
            <h3 className="text-base text-rose-100">{t}</h3>
            <p className="mt-2 text-sm text-rose-50/65">{b}</p>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function SocialCta() {
  const { data: settings } = useSettings();
  const number = (
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    settings?.contact?.whatsapp ||
    ''
  ).replace(/\D/g, '');
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <Reveal className="relative overflow-hidden rounded-card border border-rose-400/40 bg-ink-900 p-8 text-center md:p-12">
        <span aria-hidden="true" className="bg-glow-radial absolute inset-0 opacity-70" />
        <h2 id="cta-title" className="relative text-3xl md:text-4xl">
          Not sure what to pick?
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-rose-50/70">
          Message us on WhatsApp with your budget and we will help you choose.
        </p>
        <div className="relative mt-6 flex flex-wrap justify-center gap-3">
          {number && (
            <Button
              variant="primary"
              to={undefined}
              onClick={() =>
                window.open(`https://wa.me/${number}`, '_blank', 'noopener,noreferrer')
              }
            >
              Chat on WhatsApp
            </Button>
          )}
          {settings?.contact?.instagram && (
            <Button
              variant="secondary"
              onClick={() =>
                window.open(settings.contact.instagram, '_blank', 'noopener,noreferrer')
              }
            >
              Follow on Instagram
            </Button>
          )}
        </div>
      </Reveal>
      <Divider className="mt-14" />
      <div className="mx-auto max-w-2xl py-12">
        <Newsletter />
      </div>
    </section>
  );
}
