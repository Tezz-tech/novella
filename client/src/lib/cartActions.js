import { useCart } from '../store/cart.js';
import { toast } from '../store/toast.js';
import { useUi } from '../store/ui.js';

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Thumbnail flies along a curve into the cart button, then the cart badge bounces (Header).
 * Transform and opacity only. Skipped for reduced motion.
 */
export function flyToCart(fromEl, imageUrl) {
  const target = document.getElementById('cart-button');
  if (!fromEl || !target || reducedMotion() || !imageUrl) return;

  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = '';
  Object.assign(img.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${Math.min(a.width, 96)}px`,
    height: `${Math.min(a.height, 96)}px`,
    borderRadius: '14px',
    objectFit: 'cover',
    zIndex: '200',
    pointerEvents: 'none',
    boxShadow: '0 0 24px rgba(232,143,191,.45)',
  });
  document.body.appendChild(img);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2) - 48;
  const dy = b.top + b.height / 2 - (a.top + a.height / 2) - 48;
  const anim = img.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      {
        transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 90}px) scale(0.75)`,
        opacity: 0.95,
        offset: 0.5,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0 },
    ],
    { duration: 700, easing: 'cubic-bezier(0.22,1,0.36,1)', fill: 'forwards' }
  );
  anim.onfinish = () => img.remove();
}

/**
 * Adds a variant to the cart. `line` needs productId, variantId, slug, name, image, label.
 * Pass the clicked element so the thumbnail can fly to the cart.
 */
export function addToCart(line, { qty = 1, from = null, image = null } = {}) {
  useCart.getState().add(line, qty);
  flyToCart(from, image ?? line.image);
  toast.success(`${line.name} added to your cart`, {
    action: { label: 'View cart', onClick: () => useUi.getState().setCartOpen(true) },
  });
}
