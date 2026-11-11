import { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/**
 * Counts a number up (or down) to `value`. Reduced motion jumps straight to the final value.
 * `format` turns the number into display text.
 */
export default function CountUp({
  value,
  duration = 0.9,
  format = (n) => Math.round(n).toLocaleString('en-NG'),
  className = '',
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const from = useRef(0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => {
        from.current = value;
      },
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={`tabular-nums ${className}`}>{format(display)}</span>;
}
