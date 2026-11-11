import { NavLink } from 'react-router-dom';
import { useCart, selectCartCount } from '../../store/cart.js';
import { useUi } from '../../store/ui.js';

const ITEMS = [
  { to: '/', label: 'Home', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { to: '/shop', label: 'Shop', icon: 'M4 6h16M4 12h16M4 18h10' },
  {
    to: '/combos',
    label: 'Combos',
    icon: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zm0 0v18M4 7.5l8 4.5 8-4.5',
  },
  {
    to: '/wishlist',
    label: 'Wishlist',
    icon: 'M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6.8 5.2 5.2 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z',
  },
];

/** Thumb-reach bottom navigation on phones. Hidden from md up. */
export default function MobileNav() {
  const count = useCart(selectCartCount);
  const setCartOpen = useUi((s) => s.setCartOpen);

  return (
    <nav
      aria-label="Mobile"
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((i) => (
          <li key={i.to}>
            <NavLink
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${isActive ? 'text-rose-200' : 'text-rose-50/60'}`
              }
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d={i.icon} />
              </svg>
              {i.label}
            </NavLink>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11px] text-rose-50/60"
          >
            <span className="relative">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M5 7h14l-1.2 12.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9L5 7z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-pill bg-metal px-1 text-[10px] font-semibold text-ink-950">
                  {count}
                </span>
              )}
            </span>
            Cart
          </button>
        </li>
      </ul>
    </nav>
  );
}
