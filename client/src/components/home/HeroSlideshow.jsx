import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const SLIDES = [
  {
    src: '/brand/slides/slide-device.jpg',
    alt: 'Back of a light blue smartphone showing its camera module',
    w: 372,
    h: 395,
  },
  {
    src: '/brand/slides/slide-pixel-9.png',
    alt: 'Hands-on look at a new smartphone',
    w: 1280,
    h: 720,
  },
  {
    src: '/brand/slides/slide-pixel-buds.jpg',
    alt: 'Orange wireless earbuds beside their charging case',
    w: 1280,
    h: 1280,
  },
  {
    src: '/brand/slides/slide-bose-earbuds.jpg',
    alt: 'Wireless earbuds on a plain background',
    w: 1280,
    h: 1280,
  },
  { src: '/brand/slides/slide-earbuds.jpg', alt: 'A pair of earbuds', w: 1280, h: 960 },
];

const INTERVAL_MS = 5000;

/** Hero slideshow: crossfades every 5 seconds, pauses on hover or focus, and stops moving for reduced motion. */
export default function HeroSlideshow() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return undefined;
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), INTERVAL_MS);
    return () => clearInterval(t);
  }, [reduce, paused]);

  const slide = SLIDES[index];
  const go = (n) => setIndex((n + SLIDES.length) % SLIDES.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative mx-auto w-full max-w-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-ink-700 bg-ink-900">
        <AnimatePresence initial={false}>
          <motion.img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            width={slide.w}
            height={slide.h}
            decoding="async"
            fetchPriority={index === 0 ? 'high' : 'low'}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div className="flex gap-2" role="group" aria-label="Choose slide">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-rose-300' : 'w-2.5 bg-rose-50/30 hover:bg-rose-50/60'}`}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="grid h-9 w-9 place-items-center rounded-pill border border-ink-700 text-rose-100 hover:border-rose-400/60"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="grid h-9 w-9 place-items-center rounded-pill border border-ink-700 text-rose-100 hover:border-rose-400/60"
          >
            ›
          </button>
        </div>
      </div>
    </section>
  );
}
