import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useProduct } from '../lib/queries.js';
import { useSettings } from '../lib/queries.js';
import { formatPrice, CONDITION_LABELS } from '../lib/format.js';
import { addToCart } from '../lib/cartActions.js';
import { rememberProduct, readRecent } from '../lib/recent.js';
import { useCart } from '../store/cart.js';
import { useWishlist } from '../store/wishlist.js';
import { toast } from '../store/toast.js';
import Seo from '../components/seo/Seo.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import Button from '../components/ui/Button.jsx';
import Tabs from '../components/ui/Tabs.jsx';
import { Badge, Divider, Price, Rating, Skeleton, EmptyState } from '../components/ui/display.jsx';
import CountUp from '../components/motion/CountUp.jsx';
import { Reveal } from '../components/motion/Reveal.jsx';

const variantLabel = (ov) => Object.values(ov ?? {}).join(' · ') || 'Standard';

/** Picks the variant that matches every chosen option; falls back to the first that matches the last change. */
function findVariant(variants, selection) {
  return (
    variants.find((v) =>
      Object.entries(selection).every(([k, val]) => v.optionValues?.[k] === val)
    ) ?? variants[0]
  );
}

function Gallery({ images, name, activeIndex, onSelect, zoomOn }) {
  const [zoom, setZoom] = useState(null);
  const reduce = useReducedMotion();
  const main = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-4">
      <div
        className="bg-glow-radial relative aspect-square overflow-hidden rounded-card border border-ink-700 bg-ink-900"
        onPointerMove={(e) => {
          if (!zoomOn) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({
            x: ((e.clientX - r.left) / r.width) * 100,
            y: ((e.clientY - r.top) / r.height) * 100,
          });
        }}
        onPointerLeave={() => setZoom(null)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={main?.url}
            src={main?.url || '/placeholders/product.svg'}
            alt={main?.alt || name}
            width="800"
            height="800"
            decoding="async"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 h-full w-full object-contain p-6 transition-transform duration-300"
            style={
              zoom
                ? { transform: 'scale(1.9)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : undefined
            }
          />
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto pb-1" aria-label="Product photos">
          {images.map((img, i) => (
            <li key={img.url + i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-current={i === activeIndex}
                aria-label={`Show photo ${i + 1}`}
                className={`h-16 w-16 overflow-hidden rounded-xl border bg-ink-900 ${i === activeIndex ? 'border-rose-400 shadow-glow-sm' : 'border-ink-700'}`}
              >
                <img
                  src={img.url}
                  alt=""
                  className="h-full w-full object-contain p-1"
                  loading="lazy"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ComboBreakdown({ combo, bundlePrice }) {
  if (!combo) return null;
  return (
    <div className="space-y-4 rounded-card border border-rose-400/40 bg-ink-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg text-rose-50">What’s in the bundle</h2>
        {combo.saving > 0 && <Badge tone="gold">You save {formatPrice(combo.saving)}</Badge>}
      </div>
      <ul className="divide-y divide-ink-700">
        {combo.included.map((i) => (
          <li key={i.productSlug + i.variantLabel} className="flex items-center gap-3 py-3">
            <img
              src={i.image || '/placeholders/product.svg'}
              alt=""
              className="h-12 w-12 rounded-lg object-contain"
              loading="lazy"
            />
            <div className="flex-1 text-sm">
              <Link to={`/product/${i.productSlug}`} className="text-rose-50 hover:text-rose-200">
                {i.productName}
              </Link>
              <p className="text-xs text-rose-50/55">
                {i.variantLabel}
                {i.qty > 1 ? ` × ${i.qty}` : ''}
              </p>
            </div>
            <span className="text-sm tabular-nums text-rose-50/70">
              {formatPrice(i.unitPrice * i.qty)}
            </span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-rose-50/60">
          <span>Bought separately</span>
          <s className="tabular-nums">{formatPrice(combo.separatelyTotal)}</s>
        </div>
        <div className="flex justify-between text-rose-50">
          <span>Bundle price</span>
          <span className="font-semibold tabular-nums">{formatPrice(bundlePrice)}</span>
        </div>
      </div>
      {!combo.available && (
        <p className="text-sm text-danger">
          One or more items in this bundle are sold out right now.
        </p>
      )}
    </div>
  );
}

export default function Product() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useProduct(slug);
  const { data: settings } = useSettings();
  const product = data?.product;

  const [selection, setSelection] = useState({});
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const [recent, setRecent] = useState([]);
  const addRef = useRef(null);
  const wished = useWishlist((s) => (product ? s.has(product.id) : false));
  const toggleWish = useWishlist((s) => s.toggle);
  const reduce = useReducedMotion();

  // Start from the first variant's options whenever the product changes.
  useEffect(() => {
    if (product?.variants?.length) {
      setSelection({ ...(product.variants[0].optionValues ?? {}) });
      setActiveImage(0);
      setQty(1);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!product) return;
    rememberProduct(product);
    setRecent(readRecent().filter((r) => r.slug !== product.slug));
  }, [product]);

  const variant = useMemo(
    () => (product ? findVariant(product.variants, selection) : null),
    [product, selection]
  );

  if (isLoading) {
    return (
      <div
        className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 md:px-8"
        aria-busy="true"
      >
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        title={error?.status === 404 ? 'We could not find that product' : 'Something went wrong'}
        body="It may have been archived, or the link is out of date."
        action={
          <Button to="/shop" variant="secondary">
            Browse gadgets
          </Button>
        }
      />
    );
  }

  const images = product.images?.length
    ? product.images
    : [{ url: '/placeholders/product.svg', alt: product.name }];
  const img = variant?.image ?? images[activeImage]?.url ?? images[0].url;
  const label = variantLabel(variant?.optionValues);
  const inStock = (variant?.stock ?? 0) > 0;
  const maxQty = Math.min(variant?.stock ?? 0, 99);
  const off =
    variant?.compareAtPrice && variant.compareAtPrice > variant.price
      ? Math.round(((variant.compareAtPrice - variant.price) / variant.compareAtPrice) * 100)
      : 0;
  const whatsapp = (
    import.meta.env.VITE_WHATSAPP_NUMBER ||
    settings?.contact?.whatsapp ||
    ''
  ).replace(/\D/g, '');

  const choose = (option, value) => {
    const next = { ...selection, [option]: value };
    if (
      !product.variants.some((v) =>
        Object.entries(next).every(([k, val]) => v.optionValues?.[k] === val)
      )
    ) {
      // That exact combination does not exist: switch to a variant with this value.
      const fallback = product.variants.find((v) => v.optionValues?.[option] === value);
      setSelection({ ...(fallback?.optionValues ?? next) });
    } else {
      setSelection(next);
    }
    setQty(1);
  };

  const line = () => ({
    variantId: variant.id,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: img,
    label,
  });

  const buyNow = () => {
    if (!inStock) return;
    useCart.getState().add(line(), qty);
    navigate('/checkout');
  };

  const shipping = settings?.policies?.returns;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: images.map((i) => i.url),
    description: product.shortDescription,
    brand: product.brand ? { '@type': 'Brand', name: product.brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'NGN',
      price: (variant?.price ?? product.priceMin) / 100,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <Seo
        title={product.seo?.title || product.name}
        description={product.seo?.description || product.shortDescription}
        image={images[0].url}
        path={`/product/${product.slug}`}
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-rose-50/55">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-rose-200">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to={`/category/${product.category?.slug}`} className="hover:text-rose-200">
                {product.category?.name}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-rose-50/80" aria-current="page">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid gap-10 md:grid-cols-2 md:gap-14">
          <Gallery
            images={images}
            name={product.name}
            activeIndex={activeImage}
            onSelect={setActiveImage}
            zoomOn={!reduce}
          />

          <Reveal className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && <Badge tone="neutral">{product.brand.name}</Badge>}
              {product.condition !== 'brand_new' && (
                <Badge>{CONDITION_LABELS[product.condition]}</Badge>
              )}
              {product.tags?.includes('hot_deal') && <Badge tone="gold">Hot deal</Badge>}
              {off > 0 && <Badge tone="success">−{off}%</Badge>}
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl">{product.name}</h1>
              <p className="mt-2 text-sm text-rose-50/65">{product.shortDescription}</p>
            </div>

            <Rating value={product.ratingAvg} count={product.ratingCount} />

            <div aria-live="polite" className="flex items-baseline gap-4">
              <CountUp
                value={variant?.price ?? product.priceMin}
                format={(n) => formatPrice(n)}
                className="text-3xl font-semibold text-rose-50"
              />
              {variant?.compareAtPrice > variant?.price && (
                <s className="text-base text-rose-50/50">{formatPrice(variant.compareAtPrice)}</s>
              )}
            </div>

            {product.options?.map((opt) => (
              <fieldset key={opt.name} className="space-y-2.5">
                <legend className="text-xs font-semibold uppercase tracking-label text-rose-300">
                  {opt.name}:{' '}
                  <span className="font-normal normal-case tracking-normal text-rose-50">
                    {selection[opt.name]}
                  </span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {opt.values.map((val) => {
                    const active = selection[opt.name] === val;
                    const anyStock = product.variants.some(
                      (v) => v.optionValues?.[opt.name] === val && v.stock > 0
                    );
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => choose(opt.name, val)}
                        aria-pressed={active}
                        className={`rounded-pill border px-4 py-2 text-sm transition-colors ${
                          active
                            ? 'border-rose-400 bg-rose-400/15 text-rose-50 shadow-glow-sm'
                            : 'border-ink-700 text-rose-50/75 hover:border-rose-400/60'
                        } ${anyStock ? '' : 'line-through opacity-50'}`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <p className="text-sm" role="status">
              {!inStock && <span className="text-danger">Out of stock for this option</span>}
              {inStock && variant.stock <= (variant.lowStockThreshold ?? 3) && (
                <span className="text-spark-400">Only {variant.stock} left</span>
              )}
              {inStock && variant.stock > (variant.lowStockThreshold ?? 3) && (
                <span className="text-success">In stock</span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <div
                className="inline-flex items-center rounded-pill border border-ink-700"
                role="group"
                aria-label="Quantity"
              >
                <button
                  type="button"
                  className="h-11 w-11 rounded-pill text-lg hover:bg-rose-400/10"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-10 text-center tabular-nums" aria-live="polite">
                  {Math.min(qty, Math.max(maxQty, 1))}
                </span>
                <button
                  type="button"
                  className="h-11 w-11 rounded-pill text-lg hover:bg-rose-400/10"
                  onClick={() => setQty((q) => Math.min(maxQty || 1, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <span ref={addRef} className="inline-flex flex-1">
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!inStock}
                  onClick={() => addToCart(line(), { qty, from: addRef.current, image: img })}
                >
                  {inStock ? 'Add to cart' : 'Sold out'}
                </Button>
              </span>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                disabled={!inStock}
                onClick={buyNow}
              >
                Buy now
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => {
                  toggleWish({
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    image: images[0].url,
                  });
                  toast.info(wished ? 'Removed from wishlist' : 'Saved to wishlist');
                }}
                aria-pressed={wished}
                className="text-rose-200 underline underline-offset-4"
              >
                {wished ? 'Saved to wishlist' : 'Save to wishlist'}
              </button>
              {whatsapp && (
                <a
                  className="text-rose-200 underline underline-offset-4"
                  target="_blank"
                  rel="noopener noreferrer"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} (${label}). Is it available?`)}`}
                >
                  Chat on WhatsApp about this
                </a>
              )}
            </div>

            <ul className="grid gap-2 border-t border-ink-700 pt-5 text-sm text-rose-50/75">
              {product.warranty && <li>✓ {product.warranty}</li>}
              <li>✓ Price confirmed at checkout by our server</li>
              <li>✓ Secure payment through Paystack</li>
            </ul>
          </Reveal>
        </div>

        {product.type === 'combo' && (
          <div className="mt-14 md:max-w-xl">
            <ComboBreakdown combo={data.combo} bundlePrice={variant?.price ?? product.priceMin} />
          </div>
        )}

        <section className="mt-14" aria-label="Product details">
          <Tabs
            label="Product details"
            value={tab}
            onChange={setTab}
            items={[
              { value: 'description', label: 'Description' },
              { value: 'specs', label: 'Specs' },
              { value: 'shipping', label: 'Shipping & returns' },
            ]}
          />
          <div
            id="tab-panel"
            role="tabpanel"
            className="prose-invert max-w-3xl py-8 text-[15px] leading-relaxed text-rose-50/80"
          >
            {tab === 'description' && (
              <p className="whitespace-pre-line">
                {product.description || product.shortDescription}
              </p>
            )}
            {tab === 'specs' &&
              (product.specs?.length ? (
                <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {product.specs.map((s) => (
                    <div key={s.label} className="border-b border-ink-700 pb-3">
                      <dt className="text-xs uppercase tracking-label text-rose-300">{s.label}</dt>
                      <dd className="mt-1">{s.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Specifications will be added soon.</p>
              ))}
            {tab === 'shipping' && (
              <div className="space-y-3">
                <p>
                  Delivery fees are calculated for your state at checkout. Free delivery applies
                  above the store threshold.
                </p>
                <p>{shipping || 'Returns policy: see the Returns page.'}</p>
                <Link to="/policies/returns" className="text-rose-200 underline underline-offset-4">
                  Read the full returns policy
                </Link>
              </div>
            )}
          </div>
        </section>

        {recent.length > 0 && (
          <section className="mt-14" aria-labelledby="recent-title">
            <h2 id="recent-title" className="mb-4 text-lg text-rose-50">
              Recently viewed
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-2">
              {recent.slice(0, 6).map((r) => (
                <li key={r.slug} className="w-36 shrink-0">
                  <Link
                    to={`/product/${r.slug}`}
                    className="block rounded-xl border border-ink-700 bg-ink-800 p-2 hover:border-rose-400/60"
                  >
                    <img
                      src={r.image || '/placeholders/product.svg'}
                      alt=""
                      className="aspect-square w-full rounded-lg object-contain"
                      loading="lazy"
                    />
                    <span className="mt-2 line-clamp-2 block text-xs text-rose-50">{r.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {data.related?.length > 0 && (
          <section className="mt-14" aria-labelledby="related-title">
            <Divider className="mb-10" />
            <h2 id="related-title" className="mb-6 text-2xl md:text-3xl">
              You may also like
            </h2>
            <ProductGrid products={data.related.slice(0, 4)} />
          </section>
        )}
      </div>
    </>
  );
}

export { Price };
