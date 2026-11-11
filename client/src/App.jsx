import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout.jsx';

// Pages are lazy-loaded so each route ships only its own code (Phase 7 code splitting).
const Home = lazy(() => import('./pages/Home.jsx'));
const ShopPage = lazy(() => import('./pages/Catalogue.jsx').then((m) => ({ default: m.ShopPage })));
const CategoryPage = lazy(() =>
  import('./pages/Catalogue.jsx').then((m) => ({ default: m.CategoryPage }))
);
const CombosPage = lazy(() =>
  import('./pages/Catalogue.jsx').then((m) => ({ default: m.CombosPage }))
);
const DealsPage = lazy(() =>
  import('./pages/Catalogue.jsx').then((m) => ({ default: m.DealsPage }))
);
const Product = lazy(() => import('./pages/Product.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'));
const About = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.About })));
const Contact = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.Contact })));
const FAQ = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.FAQ })));
const Returns = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.Returns })));
const Privacy = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Content.jsx').then((m) => ({ default: m.Terms })));
const AccountPage = lazy(() =>
  import('./pages/Account.jsx').then((m) => ({ default: m.AccountPage }))
);
const OrderDetailPage = lazy(() =>
  import('./pages/Account.jsx').then((m) => ({ default: m.OrderDetailPage }))
);
const LoginPage = lazy(() =>
  import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = lazy(() =>
  import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/AuthPages.jsx').then((m) => ({ default: m.ResetPasswordPage }))
);
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const AdminShell = lazy(() => import('./admin/AdminShell.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'));
const Track = lazy(() => import('./pages/Track.jsx'));
const StyleGuide = lazy(() => import('./pages/StyleGuide.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/login"
        element={
          <Suspense fallback={null}>
            <AdminLogin />
          </Suspense>
        }
      />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<p className="p-10 text-rose-50/60">Loading admin…</p>}>
            <AdminShell />
          </Suspense>
        }
      />
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<Product />} />
        <Route path="/combos" element={<CombosPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order/success" element={<OrderSuccess />} />
        <Route path="/track" element={<Track />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/policies/returns" element={<Returns />} />
        <Route path="/policies/privacy" element={<Privacy />} />
        <Route path="/policies/terms" element={<Terms />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/orders/:orderNumber" element={<OrderDetailPage />} />
        {import.meta.env.DEV && <Route path="/styleguide" element={<StyleGuide />} />}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
