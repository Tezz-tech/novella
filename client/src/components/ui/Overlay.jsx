import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { EASE } from '../../lib/motion.js';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog shell for Drawer and Modal: portal, Escape to close, body scroll lock,
 * focus moved inside on open (Tab cycles within), focus returned to the trigger on close.
 */
function Overlay({ open, onClose, label, side = 'center', className = '', children }) {
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    returnFocus.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE) ?? panel;
    first?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const variants =
    side === 'right'
      ? { hidden: { x: '100%' }, show: { x: 0 } }
      : side === 'bottom'
        ? { hidden: { y: '100%' }, show: { y: 0 } }
        : { hidden: { opacity: 0, scale: 0.97, y: 12 }, show: { opacity: 1, scale: 1, y: 0 } };

  const placement =
    side === 'right'
      ? 'ml-auto h-full w-full max-w-md'
      : side === 'bottom'
        ? 'mt-auto w-full max-h-[85vh] rounded-t-card'
        : 'm-auto w-[min(92vw,32rem)] rounded-card';

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex">
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={`glass relative flex flex-col border border-ink-700 shadow-glow outline-none ${placement} ${className}`}
            variants={reduce ? { hidden: { opacity: 0 }, show: { opacity: 1 } } : variants}
            initial="hidden"
            animate="show"
            exit="hidden"
            transition={{
              duration: reduce ? 0.2 : 0.5,
              ease: EASE,
              type: reduce ? 'tween' : 'spring',
              stiffness: 260,
              damping: 30,
            }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Right-side drawer (cart, filters, mobile menu). */
export function Drawer(props) {
  return <Overlay side={props.side ?? 'right'} {...props} />;
}

/** Centred modal. */
export function Modal(props) {
  return <Overlay side="center" {...props} />;
}

/** Bottom sheet for mobile filters. */
export function Sheet(props) {
  return <Overlay side="bottom" {...props} />;
}
