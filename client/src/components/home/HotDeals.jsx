import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useProducts } from '../../lib/queries.js';
import ProductCard from '../product/ProductCard.jsx';
import { Skeleton } from '../ui/display.jsx';
import { Divider } from '../ui/display.jsx';
import { Reveal } from '../motion/Reveal.jsx';

/** One digit that flips when its value changes. */
function FlipDigit({ value }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-flex h-12 w-9 items-center justify-center overflow-hidden rounded-lg border border-ink-700 bg-ink-900 font-display text-2xl tabular-nums text-rose-50 shadow-glow-sm md:h-14 md:w-11 md:text-3xl">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={reduce ? false : { rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ transformPerspective: 200 }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Countdown with flip digits to the soonest deal end time. */
function Countdown({ target }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = Math.max(0, new Date(target).getTime() - now);
  const total = Math.floor(ms / 1000);
  const parts = [
    ['Days', Math.floor(total / 86400)],
    ['Hours', Math.floor((total % 86400) / 3600)],
    ['Mins', Math.floor((total % 3600) / 60)],
    ['Secs', total % 60],
  ];

  if (ms <= 0) return <p className="text-sm text-rose-50/60">This deal has ended.</p>;

  return (
    <div className="flex items-end gap-3" role="timer" aria-label="Time left on hot deals">
      {parts.map(([label, n]) => {
        const s = String(n).padStart(2, '0');
        return (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="flex gap-1">
              <FlipDigit value={s[0]} />
              <FlipDigit value={s[1]} />
            </div>
            <span className="text-[10px] uppercase tracking-label text-rose-50/55">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Hot Deals: products with a compare-at price, plus a countdown when a deal has an end time. */
export default function HotDeals() {
  const { data, isLoading } = useProducts({ deal: 'true', sort: 'best_selling', limit: 8 });
  const soonest = useMemo(() => {
    const ends = (data?.items ?? [])
      .map((p) => p.dealEndsAt)
      .filter(Boolean)
      .filter((d) => new Date(d) > new Date());
    return ends.sort((a, b) => new Date(a) - new Date(b))[0] ?? null;
  }, [data]);

  if (!isLoading && !data?.items?.length) return null;

  return (
    <section aria-labelledby="hot-deals-title" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <Reveal className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-label text-spark-400">Hot deals ✨</p>
          <h2 id="hot-deals-title" className="mt-2 text-3xl md:text-4xl">
            Prices that won’t last
          </h2>
        </div>
        {soonest && <Countdown target={soonest} />}
      </Reveal>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      ) : (
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
          {data.items.map((p) => (
            <li key={p.id} className="w-[70%] shrink-0 snap-start sm:w-[45%] md:w-auto">
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      )}
      <Divider className="mt-14" />
    </section>
  );
}
