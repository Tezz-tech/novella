import { motion, useReducedMotion } from 'framer-motion';
import Button from '../ui/Button.jsx';

/**
 * Home hero: headline and actions on the left, the device photograph on the right, and the
 * brand's satin photograph along the bottom edge. Fades in once; no looping motion.
 */
export default function Hero() {
  const reduce = useReducedMotion();
  const rise = (delay) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-10 pt-14 md:grid-cols-2 md:gap-12 md:px-8 md:pb-16 md:pt-24">
        <div className="flex flex-col gap-6 md:gap-8">
          <motion.p {...rise(0)} className="text-xs uppercase tracking-label text-rose-300">
            Phones · Combos · Accessories
          </motion.p>

          <motion.h1 {...rise(0.1)} className="max-w-xl text-5xl leading-[1.05] md:text-7xl">
            <span className="text-metal">Good phones,</span>
            <br />
            <span className="text-metal">fair prices.</span>
          </motion.h1>

          <motion.p {...rise(0.2)} className="max-w-xl text-base text-rose-50/70 md:text-lg">
            Brand new, UK used and open-box phones, with a bundle for every budget. The price you
            see is the price you pay.
          </motion.p>

          <motion.div {...rise(0.3)} className="flex flex-wrap gap-3">
            <Button to="/shop" size="lg">
              Shop phones
            </Button>
            <Button to="/combos" variant="secondary" size="lg">
              See combos
            </Button>
          </motion.div>
        </div>

        <motion.div {...rise(0.25)} className="relative mx-auto w-full max-w-md">
          <img
            src="/brand/hero-device.jpg"
            alt="Back of a light blue smartphone showing its camera module"
            width="744"
            height="536"
            fetchPriority="high"
            decoding="async"
            className="h-auto w-full rounded-card object-cover"
          />
        </motion.div>
      </div>

      <div className="relative h-44 md:h-72">
        <img
          src="/brand/hero-satin.jpg"
          alt=""
          width="2160"
          height="360"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink-950 to-transparent" />
      </div>
    </section>
  );
}
