import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth.js';
import { useLogout } from '../pages/auth/AuthPages.jsx';
import { api } from '../lib/api.js';
import { toast } from '../store/toast.js';
import Logo from '../components/brand/Logo.jsx';
import Toaster from '../components/ui/Toaster.jsx';
import { Drawer } from '../components/ui/Overlay.jsx';
import { lazyPage } from './lazy.js';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { ROLE_LABELS } from './labels.js';

const Overview = lazyPage(() => import('./pages/Overview.jsx'), 'Overview');
const Products = lazyPage(() => import('./pages/Products.jsx'), 'Products');
const ProductForm = lazyPage(() => import('./pages/ProductForm.jsx'), 'ProductForm');
const Orders = lazyPage(() => import('./pages/Orders.jsx'), 'Orders');
const OrderDetail = lazyPage(() => import('./pages/OrderDetail.jsx'), 'OrderDetail');
const Payments = lazyPage(() => import('./pages/Payments.jsx'), 'Payments');
const Customers = lazyPage(() => import('./pages/Customers.jsx'), 'Customers');
const Catalogue = lazyPage(() => import('./pages/Catalogue.jsx'), 'Catalogue');
const Delivery = lazyPage(() => import('./pages/Delivery.jsx'), 'Delivery');
const Marketing = lazyPage(() => import('./pages/Marketing.jsx'), 'Marketing');
const Settings = lazyPage(() => import('./pages/Settings.jsx'), 'Settings');

/** Sidebar entries. `min` is the lowest role allowed to see the entry (mirrors the API). */
const NAV = [
  { to: '/admin', label: 'Overview', end: true, min: 'staff' },
  { to: '/admin/orders', label: 'Orders', min: 'staff' },
  { to: '/admin/products', label: 'Products', min: 'staff' },
  { to: '/admin/payments', label: 'Payments', min: 'staff' },
  { to: '/admin/customers', label: 'Customers', min: 'staff' },
  { to: '/admin/catalogue', label: 'Catalogue', min: 'staff' },
  { to: '/admin/delivery', label: 'Delivery', min: 'admin' },
  { to: '/admin/marketing', label: 'Marketing', min: 'admin' },
  { to: '/admin/settings', label: 'Settings & staff', min: 'owner' },
];

const RANK = { customer: 0, staff: 1, admin: 2, owner: 3 };
const allowed = (role, min) => RANK[role] >= RANK[min];

function NavItems({ role, onNavigate }) {
  return (
    <ul className="space-y-1">
      {NAV.filter((n) => allowed(role, n.min)).map((n) => (
        <li key={n.to}>
          <NavLink
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-rose-400/12 text-rose-50'
                  : 'text-rose-50/65 hover:bg-rose-400/8 hover:text-rose-50'
              }`
            }
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
            {n.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Polls the dashboard's recent orders; a new paid order gets a toast and a soft chime. */
function NewOrderWatch() {
  const seen = useRef(null);
  const { data } = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: () => api('/admin/dashboard?range=today'),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
  useEffect(() => {
    const recent = data?.recentOrders ?? [];
    const ids = new Set(recent.map((o) => o.orderNumber));
    if (seen.current === null) {
      seen.current = ids;
      return;
    }
    const fresh = recent.filter(
      (o) => !seen.current.has(o.orderNumber) && o.paymentStatus === 'paid'
    );
    seen.current = ids;
    if (fresh.length) {
      toast.success(`New paid order ${fresh[0].orderNumber} · ${fresh[0].customer.name}`, {
        duration: 6000,
      });
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch {
        /* audio blocked: the toast is enough */
      }
    }
  }, [data]);
  return null;
}

export default function AdminShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [drawer, setDrawer] = useState(false);
  const logout = useLogout();

  if (loading)
    return <div className="grid min-h-screen place-items-center text-rose-50/60">Loading…</div>;
  if (!user || RANK[user.role] < RANK.staff) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  const onLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-ink-950 text-rose-50 print:bg-white">
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-700 bg-ink-900 p-5 print:hidden lg:flex">
          <Link to="/admin" className="mb-8 flex items-center gap-3" aria-label="Admin home">
            <Logo variant="mark" className="h-10 w-auto" />
            <span className="font-display text-metal text-base font-semibold tracking-wide">
              NOVELLE
            </span>
          </Link>
          <nav aria-label="Admin">
            <NavItems role={user.role} />
          </nav>
          <div className="mt-auto space-y-3 border-t border-ink-700 pt-4 text-xs text-rose-50/60">
            <p>
              {user.name}
              <br />
              {ROLE_LABELS[user.role]}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="text-rose-200 underline underline-offset-4"
            >
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-700 bg-ink-950/90 px-4 py-3 backdrop-blur print:hidden lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-ink-700 lg:hidden"
                aria-label="Open menu"
              >
                <span aria-hidden="true">☰</span>
              </button>
              <p className="text-sm text-rose-50/60">Store admin</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-rose-50/60">
              <Link to="/" className="hover:text-rose-200">
                View store ↗
              </Link>
              <span className="hidden sm:inline">{user.email}</span>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 print:p-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ErrorBoundary>
                  <Routes>
                    <Route index element={<Overview />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="orders/:id" element={<OrderDetail />} />
                    <Route path="products" element={<Products />} />
                    <Route path="products/new" element={<ProductForm />} />
                    <Route path="products/:id" element={<ProductForm />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="customers" element={<Customers />} />
                    <Route path="catalogue" element={<Catalogue />} />
                    <Route path="delivery" element={<Delivery />} />
                    <Route path="marketing" element={<Marketing />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                  </Routes>
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} label="Admin menu" side="right">
        <div className="space-y-6 p-6">
          <p className="text-sm font-semibold text-rose-50">Menu</p>
          <NavItems role={user.role} onNavigate={() => setDrawer(false)} />
          <button
            type="button"
            onClick={onLogout}
            className="text-sm text-rose-200 underline underline-offset-4"
          >
            Log out
          </button>
        </div>
      </Drawer>

      <NewOrderWatch />
      <Toaster />
    </div>
  );
}
