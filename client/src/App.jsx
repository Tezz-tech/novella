import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

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
const StyleGuide = lazy(() => import('./pages/StyleGuide.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Routes still waiting for their phase. Each is replaced as the phase is built.
const PENDING = [
  ['/checkout', 'Checkout'],
  ['/order/success', 'Order success'],
  ['/track', 'Track order'],
  ['/account', 'My account'],
  ['/login', 'Log in'],
  ['/register', 'Create account'],
  ['/forgot-password', 'Forgot password'],
  ['/reset-password/:token', 'Reset password'],
];

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/product/:slug" element={<Product />} />
        <Route path="/combos" element={<CombosPage />} />
        <Route path="/deals" element={<DealsPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/policies/returns" element={<Returns />} />
        <Route path="/policies/privacy" element={<Privacy />} />
        <Route path="/policies/terms" element={<Terms />} />
        {PENDING.map(([path, title]) => (
          <Route key={path} path={path} element={<ComingSoon title={title} />} />
        ))}
        {import.meta.env.DEV && <Route path="/styleguide" element={<StyleGuide />} />}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
