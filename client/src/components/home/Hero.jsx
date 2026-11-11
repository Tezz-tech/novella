import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useReducedMotion, useSpring, animate } from 'framer-motion';
import Button from '../ui/Button.jsx';
import SatinWave from '../motion/SatinWave.jsx';
import SparkleField from '../motion/SparkleField.jsx';
import MagneticButton from '../motion/MagneticButton.jsx';
import Logo from '../brand/Logo.jsx';

const HEADLINE = 'Smart Deals.';
const SECOND = 'Pretty Prices.';

/** Headline revealed letter by letter with the metal gradient. */
function Letters({ text, delay = 0 }) {
  const reduce = useReducedMotion();
  return (
    <span aria-label={text} className="inline-block">
      {text.split('').map((ch, i) => (
        <motion.span
          key={`${ch}-${i}`}
          aria-hidden="true"
          initial={reduce ? false : { opacity: 0, y: '0.4em', filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: delay + i * 0.035, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block whitespace-pre text-metal"
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

/** Tagline pill whose border draws itself on. */
function TaglinePill({ children }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative inline-block">
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 origin-left rounded-pill border border-rose-400 shadow-glow-sm"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      <p className="font-accent relative px-7 py-2.5 text-lg italic text-rose-100 sm:text-xl">
        {children}
      </p>
    </div>
  );
}

/** Soft pink glow that follows the pointer on desktop only. */
function CursorGlow({ containerRef }) {
  const x = useMotionValue(-300);
  const y = useMotionValue(-300);
  const sx = useSpring(x, { stiffness: 120, damping: 20 });
  const sy = useSpring(y, { stiffness: 120, damping: 20 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return undefined;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      x.set(e.clientX - r.left - 200);
      y.set(e.clientY - r.top - 200);
    };
    el.addEventListener('pointermove', move);
    return () => el.removeEventListener('pointermove', move);
  }, [containerRef, x, y]);
  return (
    <motion.div
      aria-hidden="true"
      style={{ x: sx, y: sy }}
      className="pointer-events-none absolute left-0 top-0 hidden h-[400px] w-[400px] rounded-full bg-rose-400/20 blur-3xl md:block"
    />
  );
}

/** Hero: animated headline, floating visual with a slow bob, satin wave and sparkles. */
export default function Hero({ visual }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const bob = useMotionValue(0);

  useEffect(() => {
    if (reduce) return undefined;
    const c = animate(0, 1, {
      duration: 6,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
      onUpdate: (v) => bob.set(v * -14),
    });
    return () => c.stop();
  }, [reduce, bob]);

  return (
    <section ref={ref} className="bg-glow-radial relative isolate overflow-hidden">
      <SparkleField className="opacity-70" />
      <CursorGlow containerRef={ref} />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-44 pt-12 md:grid-cols-2 md:gap-6 md:px-8 md:pb-56 md:pt-20">
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-4 text-xs uppercase tracking-label text-rose-300"
          >
            Affordable phone combos · Latest smartphones
          </motion.p>

          <h1 className="text-balance text-5xl leading-[1.05] md:text-7xl">
            <span className="block">
              <Letters text={HEADLINE} />
            </span>
            <span className="block">
              <Letters text={SECOND} delay={0.45} />
            </span>
          </h1>

          <div className="mt-7">
            <TaglinePill>
              Smart Deals. Pretty Prices. <span aria-hidden="true">✨</span>
            </TaglinePill>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <MagneticButton>
              <Button to="/shop" size="lg">
                Shop gadgets
              </Button>
            </MagneticButton>
            <Button to="/combos" variant="secondary" size="lg">
              See combos
            </Button>
          </div>
          <p className="mt-6 text-xs text-rose-50/55">
            Reliable support · Pay securely with Paystack
          </p>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center md:max-w-none">
          <motion.div style={reduce ? undefined : { y: bob }} className="relative w-full max-w-md">
            <div
              className="absolute inset-0 -z-10 rounded-full bg-rose-400/25 blur-[70px]"
              aria-hidden="true"
            />
            {visual ? (
              <img
                src={visual.image || '/placeholders/product.svg'}
                alt={visual.name}
                width="800"
                height="800"
                fetchPriority="high"
                decoding="async"
                className="mx-auto w-full object-contain drop-shadow-[0_0_40px_rgba(232,143,191,0.45)]"
              />
            ) : (
              <Logo className="mx-auto" />
            )}
          </motion.div>
        </div>
      </div>

      <SatinWave />
    </section>
  );
}
