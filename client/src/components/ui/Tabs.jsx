import { useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * Accessible tabs (roles, arrow-key navigation). `items` = [{ value, label, count? }].
 * The active underline slides between tabs with a shared layout id.
 */
export default function Tabs({ items, value, onChange, label, className = '' }) {
  const id = useId();
  const refs = useRef([]);
  const reduce = useReducedMotion();

  const move = (index) => {
    const next = items[(index + items.length) % items.length];
    onChange(next.value);
    refs.current[items.findIndex((i) => i.value === next.value)]?.focus();
  };

  const onKey = (e, index) => {
    if (e.key === 'ArrowRight') move(index + 1);
    if (e.key === 'ArrowLeft') move(index - 1);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-1 overflow-x-auto border-b border-ink-700 ${className}`}
    >
      {items.map((item, index) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => (refs.current[index] = el)}
            type="button"
            role="tab"
            id={`${id}-${item.value}`}
            aria-selected={active}
            aria-controls={`${id}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => onKey(e, index)}
            className={`relative shrink-0 px-4 py-3 text-sm transition-colors ${
              active ? 'text-rose-50' : 'text-rose-50/60 hover:text-rose-100'
            }`}
          >
            {item.label}
            {item.count != null && (
              <span className="ml-1.5 text-xs text-rose-300">{item.count}</span>
            )}
            {active && (
              <motion.span
                layoutId={`${id}-underline`}
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-metal"
                transition={
                  reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 34 }
                }
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
