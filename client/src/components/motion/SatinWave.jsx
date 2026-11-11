import { motion, useReducedMotion } from 'framer-motion';

const PATHS = [
  'M0,160 C240,80 480,240 720,160 C960,80 1200,220 1440,140 L1440,320 L0,320 Z',
  'M0,190 C260,260 460,90 720,170 C980,250 1180,110 1440,190 L1440,320 L0,320 Z',
  'M0,140 C220,200 500,60 760,150 C1020,240 1220,120 1440,160 L1440,320 L0,320 Z',
];

/**
 * Satin wave at the bottom of the hero. Three wave shapes cross-fade in a slow loop, which reads
 * as a gently moving fabric. Reduced motion shows the first shape, still.
 */
export default function SatinWave({ className = '' }) {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full md:h-56 ${className}`}
    >
      <defs>
        <linearGradient id="satin" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3A0C1F" />
          <stop offset="35%" stopColor="#902F54" />
          <stop offset="60%" stopColor="#D884A8" />
          <stop offset="100%" stopColor="#902F54" />
        </linearGradient>
      </defs>
      {PATHS.map((d, i) =>
        reduce && i > 0 ? null : (
          <motion.path
            key={d}
            d={d}
            fill="url(#satin)"
            initial={{ opacity: i === 0 ? 1 : 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: [0, 1, 1, 0] }}
            transition={
              reduce
                ? undefined
                : {
                    duration: 14,
                    times: [0, 0.2, 0.8, 1],
                    repeat: Infinity,
                    delay: i * 4.67,
                    ease: 'easeInOut',
                  }
            }
          />
        )
      )}
    </svg>
  );
}
