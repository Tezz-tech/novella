import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import MobileNav from './MobileNav.jsx';
import WhatsAppFab from './WhatsAppFab.jsx';
import CartDrawer from './CartDrawer.jsx';
import SmoothScroll from './SmoothScroll.jsx';
import RouteProgress from './RouteProgress.jsx';
import IntroLoader from '../motion/IntroLoader.jsx';
import Toaster from '../ui/Toaster.jsx';
import { Skeleton } from '../ui/display.jsx';

function PageFallback() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-6 px-4 py-12 md:px-8"
      aria-busy="true"
      aria-label="Loading page"
    >
      <Skeleton className="h-10 w-1/3" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4]" />
        ))}
      </div>
    </div>
  );
}

/** Storefront shell: header, footer, mobile nav, floating WhatsApp, cart drawer, toasts and the route transition. */
export default function SiteLayout() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  return (
    <>
      <a href="#content" className="skip-link">
        Skip to content
      </a>
      <SmoothScroll />
      <IntroLoader />
      <RouteProgress />
      <Header />

      <main id="content" tabIndex={-1} className="min-h-[70vh] pb-24 outline-none md:pb-0">
        <motion.div
          key={pathname}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>

      <Footer />
      <MobileNav />
      <WhatsAppFab />
      <CartDrawer />
      <Toaster />
    </>
  );
}
