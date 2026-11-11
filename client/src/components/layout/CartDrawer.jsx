import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Drawer } from '../ui/Overlay.jsx';
import Button from '../ui/Button.jsx';
import { EmptyState, Price } from '../ui/display.jsx';
import { useCart } from '../../store/cart.js';
import { useUi } from '../../store/ui.js';
import { api } from '../../lib/api.js';
import { formatPrice } from '../../lib/format.js';
import { keys } from '../../lib/queries.js';

/**
 * Cart drawer. Lines are shown with server-computed prices from POST /cart/quote, never with
 * prices stored in the browser.
 */
export default function CartDrawer() {
  const open = useUi((s) => s.cartOpen);
  const setOpen = useUi((s) => s.setCartOpen);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const navigate = useNavigate();

  const lines = items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }));
  const {
    data: quote,
    isFetching,
    error,
  } = useQuery({
    queryKey: keys.quote(lines, null),
    queryFn: ({ signal }) => api('/cart/quote', { method: 'POST', body: { items: lines }, signal }),
    enabled: open && lines.length > 0,
    staleTime: 15_000,
  });

  const priced = new Map((quote?.lines ?? []).map((l) => [l.variantId, l]));
  const close = () => setOpen(false);

  return (
    <Drawer open={open} onClose={close} label="Shopping cart" className="!max-w-md">
      <div className="flex items-center justify-between border-b border-ink-700 px-5 py-4">
        <h2 className="text-lg text-rose-50">Your cart</h2>
        <button
          type="button"
          onClick={close}
          className="rounded-pill px-3 py-1.5 text-sm text-rose-100 hover:bg-rose-400/10"
        >
          Close
        </button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Your cart is empty"
          body="Find something pretty. Our combos are the best value."
          action={
            <Button to="/shop" variant="secondary" size="sm" onClick={close}>
              Browse gadgets
            </Button>
          }
        />
      ) : (
        <>
          <ul className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {items.map((i) => {
              const p = priced.get(i.variantId);
              return (
                <li
                  key={i.variantId}
                  className="flex gap-4 rounded-2xl border border-ink-700 bg-ink-800/60 p-3"
                >
                  <img
                    src={i.image || '/placeholders/product.svg'}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    loading="lazy"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Link
                      to={`/product/${i.slug}`}
                      onClick={close}
                      className="line-clamp-2 text-sm text-rose-50 hover:text-rose-200"
                    >
                      {i.name}
                    </Link>
                    <p className="text-xs text-rose-50/60">{i.label}</p>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div
                        className="inline-flex items-center rounded-pill border border-ink-700"
                        role="group"
                        aria-label={`Quantity for ${i.name}`}
                      >
                        <button
                          type="button"
                          className="h-8 w-8 rounded-pill text-rose-100 hover:bg-rose-400/10"
                          onClick={() => setQty(i.variantId, i.qty - 1)}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                          {i.qty}
                        </span>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-pill text-rose-100 hover:bg-rose-400/10"
                          onClick={() => setQty(i.variantId, i.qty + 1)}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      {p ? (
                        <Price amount={p.lineTotal} size="sm" />
                      ) : (
                        <span className="text-xs text-rose-50/50">
                          {isFetching ? 'Pricing…' : ''}
                        </span>
                      )}
                    </div>
                    {p?.warning && <p className="text-xs text-spark-400">{p.warning}</p>}
                    <button
                      type="button"
                      onClick={() => remove(i.variantId)}
                      className="self-start text-xs text-rose-50/50 underline underline-offset-4 hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-ink-700 bg-ink-900/80 px-5 py-5">
            {error && (
              <p role="alert" className="text-sm text-danger">
                Could not price your cart. {error.message}
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-rose-50/70">Subtotal</span>
              <span className="text-lg font-semibold tabular-nums text-rose-50">
                {quote ? formatPrice(quote.subtotal) : '—'}
              </span>
            </div>
            <p className="text-xs text-rose-50/55">Delivery is calculated at checkout.</p>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                close();
                navigate('/checkout');
              }}
            >
              Checkout
            </Button>
            <Link
              to="/cart"
              onClick={close}
              className="block text-center text-sm text-rose-200 underline underline-offset-4"
            >
              View full cart
            </Link>
          </div>
        </>
      )}
    </Drawer>
  );
}
