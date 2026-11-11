import { useRef } from 'react';
import { Link } from 'react-router-dom';
import TiltCard from '../motion/TiltCard.jsx';
import ShineSweep from '../motion/ShineSweep.jsx';
import { Badge, Price, Rating } from '../ui/display.jsx';
import { CONDITION_LABELS, formatPrice } from '../../lib/format.js';
import { addToCart } from '../../lib/cartActions.js';
import { useWishlist } from '../../store/wishlist.js';
import { toast } from '../../store/toast.js';

/** Largest discount among the product's active variants, as a whole percent. */
export function discountPercent(product) {
  let best = 0;
  for (const v of product.variants ?? []) {
    if (v.compareAtPrice && v.compareAtPrice > v.price) {
      best = Math.max(best, Math.round(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100));
    }
  }
  return best;
}

function HeartIcon({ filled }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? '#E88FBF' : 'none'}
      stroke="#F5A8CC"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6.8 5.2 5.2 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z" />
    </svg>
  );
}

/**
 * Product tile: image on a soft glow, 3D tilt and shine on desktop, badges, price, wishlist heart
 * and a quick-add button. Multi-variant products send the shopper to the product page to choose.
 */
export default function ProductCard({ product }) {
  const imageRef = useRef(null);
  const wished = useWishlist((s) => s.has(product.id));
  const toggle = useWishlist((s) => s.toggle);

  const img = product.coverImage?.url || '/placeholders/product.svg';
  const off = discountPercent(product);
  const hasTag = (t) => product.tags?.includes(t);
  const single = product.variants?.length === 1;
  const soldOut = !product.inStock;

  const quickAdd = (e) => {
    e.preventDefault();
    if (soldOut) return;
    const v = product.variants[0];
    addToCart(
      {
        variantId: v.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: img,
        label: Object.values(v.optionValues ?? {}).join(' · ') || 'Standard',
      },
      { from: imageRef.current, image: img }
    );
  };

  return (
    <TiltCard className="group relative h-full">
      <article className="relative flex h-full flex-col overflow-hidden rounded-card border border-ink-700 bg-ink-800 transition-colors duration-300 hover:border-rose-400/60">
        <div className="relative">
          <Link
            to={`/product/${product.slug}`}
            className="relative block aspect-square overflow-hidden bg-ink-900"
          >
            <span aria-hidden="true" className="absolute inset-0 bg-glow-radial opacity-80" />
            <ShineSweep />
            <img
              ref={imageRef}
              src={img}
              alt={product.coverImage?.alt || product.name}
              loading="lazy"
              decoding="async"
              width="400"
              height="400"
              className="relative h-full w-full object-contain p-4 transition-transform duration-500 ease-brand group-hover:scale-105 motion-reduce:transform-none"
            />
          </Link>
          <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
            {hasTag('hot_deal') && <Badge tone="gold">Hot deal</Badge>}
            {hasTag('new_arrival') && <Badge>New</Badge>}
            {product.condition !== 'brand_new' && (
              <Badge tone="neutral">{CONDITION_LABELS[product.condition]}</Badge>
            )}
            {off > 0 && <Badge tone="success">−{off}%</Badge>}
            {soldOut && <Badge tone="danger">Sold out</Badge>}
          </div>
          <button
            type="button"
            onClick={() => {
              toggle({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                image: img,
              });
              toast.info(wished ? 'Removed from wishlist' : 'Saved to wishlist');
            }}
            aria-pressed={wished}
            aria-label={
              wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
            }
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-ink-700 bg-ink-950/70 transition-transform hover:scale-110"
          >
            <HeartIcon filled={wished} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4">
          <p className="text-[11px] uppercase tracking-label text-rose-300">
            {product.brand?.name}
          </p>
          <Link
            to={`/product/${product.slug}`}
            className="line-clamp-2 text-[15px] leading-snug text-rose-50 hover:text-rose-200"
          >
            {product.name}
          </Link>
          <Rating value={product.ratingAvg} count={product.ratingCount} />
          <div className="mt-auto flex items-end justify-between gap-3 pt-2">
            <div className="flex flex-col">
              <span className="text-[11px] text-rose-50/55">
                {product.priceMax > product.priceMin ? 'from' : ''}
              </span>
              <Price
                amount={product.priceMin}
                compareAt={
                  product.variants?.find((v) => v.price === product.priceMin)?.compareAtPrice
                }
                size="sm"
              />
            </div>
            {single && !soldOut ? (
              <button
                type="button"
                onClick={quickAdd}
                className="rounded-pill border border-rose-400 px-3.5 py-1.5 text-xs font-semibold text-rose-100 transition-colors hover:bg-rose-400 hover:text-ink-950 md:translate-y-1 md:opacity-0 md:transition-all md:group-hover:translate-y-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                Add
              </button>
            ) : (
              <Link
                to={`/product/${product.slug}`}
                className="text-xs text-rose-200 underline underline-offset-4"
              >
                {soldOut ? 'View' : 'Choose'}
              </Link>
            )}
          </div>
        </div>
      </article>
    </TiltCard>
  );
}

export { formatPrice };
