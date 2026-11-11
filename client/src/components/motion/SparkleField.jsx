import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

const MAX_PARTICLES = 40;

/**
 * Tiny twinkling four-point stars on a canvas. Capped at 40 particles, paused when off-screen
 * or the tab is hidden, and not rendered at all under reduced motion.
 */
export default function SparkleField({ className = '' }) {
  const canvasRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let running = true;
    let visible = true;
    let stars = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_PARTICLES, Math.round((width * height) / 22000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        s: 3 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
      }));
    };

    const draw = (t) => {
      if (!running) return;
      const { width, height } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      for (const st of stars) {
        const a = (Math.sin((t / 1000) * st.speed + st.phase) + 1) / 2;
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = a > 0.6 ? '#FFF0F6' : '#F5A8CC';
        ctx.beginPath();
        ctx.moveTo(st.x, st.y - st.s);
        ctx.quadraticCurveTo(st.x, st.y, st.x + st.s, st.y);
        ctx.quadraticCurveTo(st.x, st.y, st.x, st.y + st.s);
        ctx.quadraticCurveTo(st.x, st.y, st.x - st.s, st.y);
        ctx.quadraticCurveTo(st.x, st.y, st.x, st.y - st.s);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    start();

    return () => {
      running = false;
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
