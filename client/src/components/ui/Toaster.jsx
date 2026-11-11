import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useToasts } from '../../store/toast.js';
import { useEffect } from 'react';

const TONE = {
  success: 'border-success/60 shadow-[0_0_24px_rgba(94,211,160,0.25)]',
  danger: 'border-danger/60 shadow-[0_0_24px_rgba(255,107,138,0.25)]',
  info: 'border-rose-400/60 shadow-glow-sm',
};

function ToastItem({ toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!toast.duration) return undefined;
    const t = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <motion.div
      layout
      role={toast.tone === 'danger' ? 'alert' : 'status'}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`glass flex w-full max-w-sm items-start gap-3 rounded-2xl border bg-ink-900 px-4 py-3 text-sm text-rose-50 ${TONE[toast.tone]}`}
    >
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        className="-m-1 rounded-full p-1 text-rose-50/60 hover:text-rose-50"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </motion.div>
  );
}

/** Bottom-centre on mobile, top-right on desktop. */
export default function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[95] flex flex-col items-center gap-2 md:inset-x-auto md:bottom-auto md:right-6 md:top-24 md:items-end"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full max-w-sm">
            <ToastItem toast={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
