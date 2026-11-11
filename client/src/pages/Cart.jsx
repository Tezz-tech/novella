import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { keys } from '../lib/queries.js';
import { formatPrice } from '../lib/format.js';
import { useCart } from '../store/cart.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { EmptyState, Price, Skeleton } from '../components/ui/display.jsx';

/** Full cart page. Every price comes from POST /cart/quote, so what the shopper sees is server-checked. */
export default function Cart() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const navigate = useNavigate();

  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  const {
    data: quote,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: keys.quote(lines, null),
    queryFn: ({ signal }) => api('/cart/quote', { method: 'POST', body: { items: lines }, signal }),
    enabled: lines.length > 0,
    staleTime: 15_000,
  });

  const priced = new Map((quote?.lines ?? []).map((l) => [l.variantId, l]));
  const hasIssues = quote?.hasIssues;

  return (
    <>
      <Seo title="Your cart" path="/cart" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <h1 className="mb-8 text-4xl md:text-5xl">Your cart</h1>

        {items.length === 0 ? (
          <EmptyState
            title="Your cart is empty"
            body="Our combos are the best way to get a phone and everything it needs."
            action={<Button to="/combos">Shop combos</Button>}
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
            <ul className="divide-y divide-ink-700 rounded-card border border-ink-700 bg-ink-800/50 px-5">
              {items.map((i) => {
                const p = priced.get(i.variantId);
                return (
                  <li key={i.variantId} className="flex gap-5 py-5">
                    <img
                      src={i.image || '/placeholders/product.svg'}
                      alt=""
                      className="h-24 w-24 shrink-0 rounded-xl object-contain bg-ink-900 p-2"
                      loading="lazy"
                    />
                    <div className="flex flex-1 flex-col gap-2">
                      <Link
                        to={`/product/${i.slug}`}
                        className="text-base text-rose-50 hover:text-rose-200"
                      >
                        {i.name}
                      </Link>
                      <p className="text-xs text-rose-50/60">{i.label}</p>
                      {p?.warning && (
                        <p role="alert" className="text-xs text-spark-400">
                          {p.warning}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-4">
                        <div
                          className="inline-flex items-center rounded-pill border border-ink-700"
                          role="group"
                          aria-label={`Quantity for ${i.name}`}
                        >
                          <button
                            type="button"
                            className="h-9 w-9 rounded-pill hover:bg-rose-400/10"
                            onClick={() => setQty(i.variantId, i.qty - 1)}
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="w-9 text-center tabular-nums" aria-live="polite">
                            {i.qty}
                          </span>
                          <button
                            type="button"
                            className="h-9 w-9 rounded-pill hover:bg-rose-400/10"
                            onClick={() => setQty(i.variantId, i.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(i.variantId)}
                          className="text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      {p ? (
                        <Price
                          amount={p.lineTotal}
                          compareAt={p.compareAtPrice && p.compareAtPrice * p.qty}
                          size="sm"
                        />
                      ) : (
                        <Skeleton className="h-5 w-24" />
                      )}
                      {p && p.qty > 1 && (
                        <p className="mt-1 text-xs text-rose-50/55">
                          {formatPrice(p.unitPrice)} each
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside
              aria-label="Order summary"
              className="h-fit space-y-4 rounded-card border border-ink-700 bg-ink-800 p-6 lg:sticky lg:top-28"
            >
              <h2 className="text-lg text-rose-50">Summary</h2>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  We could not price your cart. {error.message}
                </p>
              )}
              {isLoading && <Skeleton className="h-24 w-full" />}
              {quote && (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-rose-50/70">Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(quote.subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-rose-50/70">Delivery</dt>
                    <dd className="text-rose-50/80">Calculated at checkout</dd>
                  </div>
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <dt>Discount</dt>
                      <dd className="tabular-nums">−{formatPrice(quote.discount)}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-ink-700 pt-3 text-base">
                    <dt className="text-rose-50">Estimated total</dt>
                    <dd className="font-semibold tabular-nums text-rose-50">
                      {formatPrice(quote.subtotal - quote.discount)}
                    </dd>
                  </div>
                </dl>
              )}
              {quote?.freeDeliveryThreshold > 0 && quote.subtotal < quote.freeDeliveryThreshold && (
                <p className="text-xs text-rose-50/65">
                  Add {formatPrice(quote.freeDeliveryThreshold - quote.subtotal)} more for free
                  delivery.
                </p>
              )}
              {hasIssues && (
                <p className="text-xs text-spark-400">
                  Fix the items marked above to continue to checkout.
                </p>
              )}
              <Button
                className="w-full"
                size="lg"
                disabled={!quote || hasIssues || isFetching}
                onClick={() => navigate('/checkout')}
              >
                Checkout
              </Button>
              <Link
                to="/shop"
                className="block text-center text-sm text-rose-200 underline underline-offset-4"
              >
                Keep shopping
              </Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
