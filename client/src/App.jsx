import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import SiteLayout from './components/layout/SiteLayout.jsx';
import ComingSoon from './pages/ComingSoon.jsx';

// Pages are lazy-loaded so each route only ships its own code (Phase 7 code splitting).
const StyleGuide = lazy(() => import('./pages/StyleGuide.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Storefront routes. Each is replaced by its real page in the phase that builds it.
const STOREFRONT = [
  ['/', 'Home'],
  ['/shop', 'Shop'],
  ['/category/:slug', 'Category'],
  ['/product/:slug', 'Product'],
  ['/combos', 'Combos'],
  ['/deals', 'Deals'],
  ['/cart', 'Cart'],
  ['/checkout', 'Checkout'],
  ['/order/success', 'Order success'],
  ['/track', 'Track order'],
  ['/account', 'My account'],
  ['/wishlist', 'Wishlist'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
  ['/faq', 'FAQ'],
  ['/policies/returns', 'Returns policy'],
  ['/policies/privacy', 'Privacy policy'],
  ['/policies/terms', 'Terms of sale'],
  ['/login', 'Log in'],
  ['/register', 'Create account'],
  ['/forgot-password', 'Forgot password'],
  ['/reset-password/:token', 'Reset password'],
];

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        {STOREFRONT.map(([path, title]) => (
          <Route key={path} path={path} element={<ComingSoon title={title} />} />
        ))}
        {import.meta.env.DEV && <Route path="/styleguide" element={<StyleGuide />} />}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
