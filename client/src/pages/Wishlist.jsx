import { Link } from 'react-router-dom';
import { useWishlist } from '../store/wishlist.js';
import Seo from '../components/seo/Seo.jsx';
import Button from '../components/ui/Button.jsx';
import { EmptyState } from '../components/ui/display.jsx';

/**
 * Saved items. Only names and images are stored here, never prices: the product page always
 * shows the server price.
 */
export default function Wishlist() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);

  return (
    <>
      <Seo title="Wishlist" path="/wishlist" />
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <h1 className="mb-8 text-4xl md:text-5xl">Wishlist</h1>
        {items.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            body="Tap the heart on any gadget to keep it here."
            action={
              <Button to="/shop" variant="secondary">
                Browse gadgets
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {items.map((i) => (
              <li
                key={i.productId}
                className="flex flex-col rounded-card border border-ink-700 bg-ink-800 p-3"
              >
                <Link to={`/product/${i.slug}`} className="block">
                  <img
                    src={i.image || '/placeholders/product.svg'}
                    alt=""
                    className="aspect-square w-full rounded-xl bg-ink-900 object-contain p-3"
                    loading="lazy"
                  />
                  <span className="mt-3 line-clamp-2 block text-sm text-rose-50 hover:text-rose-200">
                    {i.name}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(i.productId)}
                  className="mt-auto pt-3 text-left text-xs text-rose-50/60 underline underline-offset-4 hover:text-danger"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
