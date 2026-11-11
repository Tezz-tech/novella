import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/** Thin pink progress bar at the top of the page while a route change settles. */
export default function RouteProgress() {
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (reduce) return undefined;
    setActive(true);
    const t = setTimeout(() => setActive(false), 650);
    return () => clearTimeout(t);
  }, [pathname, reduce]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="bar"
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-[98] h-0.5 origin-left bg-gradient-to-r from-rose-300 via-rose-400 to-rose-200 shadow-glow-sm"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </AnimatePresence>
  );
}
