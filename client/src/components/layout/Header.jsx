import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Logo from '../brand/Logo.jsx';
import ShineSweep from '../motion/ShineSweep.jsx';
import { useCategories, useSuggest } from '../../lib/queries.js';
import { useDebounced } from '../../hooks/useDebounced.js';
import { useCart, selectCartCount } from '../../store/cart.js';
import { useWishlist } from '../../store/wishlist.js';
import { useUi } from '../../store/ui.js';
import { formatPrice } from '../../lib/format.js';

const NAV = [
  { to: '/shop', label: 'Shop' },
  { to: '/combos', label: 'Combos' },
  { to: '/deals', label: 'Deals' },
];

function Count({ value }) {
  const reduce = useReducedMotion();
  if (!value) return null;
  return (
    <motion.span
      key={value}
      initial={reduce ? false : { scale: 1.6 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 14 }}
      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-pill bg-metal px-1 text-[11px] font-semibold text-ink-950"
    >
      {value}
    </motion.span>
  );
}

function SearchBox({ onDone, autoFocus = false, className = '' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(q.trim(), 250);
  const { data, isFetching } = useSuggest(debounced);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
    onDone?.();
  };

  const showResults = open && debounced.length >= 2;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor="site-search" className="sr-only">
          Search gadgets
        </label>
        <input
          id="site-search"
          type="search"
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search iPhone, Galaxy, earbuds…"
          autoComplete="off"
          className="h-11 w-full rounded-pill border border-ink-700 bg-ink-800/80 pl-11 pr-4 text-sm text-rose-50 placeholder:text-rose-50/40 transition-[box-shadow,border-color] focus:border-rose-400 focus:outline-none focus:shadow-glow-sm"
        />
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#F5A8CC"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      </form>

      <AnimatePresence>
        {showResults && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-ink-700 shadow-glow-sm"
          >
            {isFetching && !data && <p className="px-4 py-3 text-sm text-rose-50/60">Searching…</p>}
            {data && data.length === 0 && (
              <p className="px-4 py-3 text-sm text-rose-50/60">No matches for “{debounced}”.</p>
            )}
            {data?.length > 0 && (
              <ul>
                {data.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={`/product/${p.slug}`}
                      onClick={() => {
                        setOpen(false);
                        setQ('');
                        onDone?.();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-rose-400/10"
                    >
                      <img
                        src={p.image || '/placeholders/product.svg'}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover"
                        loading="lazy"
                      />
                      <span className="flex-1 text-sm text-rose-50">{p.name}</span>
                      <span className="text-xs tabular-nums text-rose-200">
                        from {formatPrice(p.priceMin)}
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    to={`/shop?q=${encodeURIComponent(debounced)}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-center text-xs uppercase tracking-label text-rose-300 hover:bg-rose-400/10"
                  >
                    See all results
                  </Link>
                </li>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryMenu() {
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="category-menu"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        className="inline-flex h-10 items-center gap-1.5 rounded-pill px-3 text-sm text-rose-100 transition-colors hover:text-rose-50"
      >
        Categories
        <span
          aria-hidden="true"
          className={`text-[10px] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="category-menu"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass absolute left-0 top-full z-50 mt-2 w-[min(90vw,34rem)] rounded-card border border-ink-700 p-5 shadow-glow"
          >
            <ul className="grid grid-cols-2 gap-1">
              {categories.map((c) => (
                <li key={c._id}>
                  <Link
                    to={`/category/${c.slug}`}
                    className="block rounded-xl px-3 py-2.5 text-sm text-rose-50 hover:bg-rose-400/10 hover:text-rose-200"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const cartCount = useCart(selectCartCount);
  const wishCount = useWishlist((s) => s.items.length);
  const setCartOpen = useUi((s) => s.setCartOpen);
  const location = useLocation();

  useEffect(() => setSearchOpen(false), [location.pathname]);

  return (
    <header className="glass sticky top-0 z-40 border-b border-ink-700/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:h-20 md:px-8">
        <Link
          to="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Novelle Tech home"
        >
          <Logo variant="mark" className="h-9 w-auto" />
          <span className="hidden font-display text-metal text-lg font-semibold tracking-wide sm:inline md:text-xl">
            NOVELLE
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          <CategoryMenu />
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `relative inline-flex h-10 items-center rounded-pill px-3 text-sm transition-colors ${isActive ? 'text-rose-50' : 'text-rose-100 hover:text-rose-50'} after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-rose-400 after:transition-transform hover:after:scale-x-100`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden flex-1 justify-end md:flex lg:max-w-sm">
          <SearchBox className="w-full" />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-label="Search"
            aria-expanded={searchOpen}
            className="grid h-11 w-11 place-items-center rounded-pill text-rose-100 hover:bg-rose-400/10 md:hidden"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
          </button>

          <Link
            to="/wishlist"
            aria-label={`Wishlist, ${wishCount} items`}
            className="relative hidden h-11 w-11 place-items-center rounded-pill text-rose-100 hover:bg-rose-400/10 sm:grid"
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
              <path d="M12 21s-7-4.5-9.3-9A5.2 5.2 0 0 1 12 6.8 5.2 5.2 0 0 1 21.3 12c-2.3 4.5-9.3 9-9.3 9z" />
            </svg>
            <Count value={wishCount} />
          </Link>

          <Link
            to="/account"
            aria-label="My account"
            className="hidden h-11 w-11 place-items-center rounded-pill text-rose-100 hover:bg-rose-400/10 sm:grid"
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
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            id="cart-button"
            aria-label={`Open cart, ${cartCount} items`}
            className="group relative grid h-11 w-11 place-items-center overflow-hidden rounded-pill text-rose-50 hover:bg-rose-400/10"
          >
            <ShineSweep />
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M5 7h14l-1.2 12.1A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.9L5 7z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
            </svg>
            <Count value={cartCount} />
          </button>

          <Link
            to="/shop"
            className="ml-2 hidden rounded-pill border border-rose-400 px-4 py-2 text-sm text-rose-100 transition-colors hover:bg-rose-400/10 xl:inline-flex"
          >
            Shop now
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="mobile-search"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-visible px-4 pb-4 md:hidden"
          >
            <SearchBox autoFocus onDone={() => setSearchOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
