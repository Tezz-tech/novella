import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useUi } from '../../store/ui.js';
import Logo from '../brand/Logo.jsx';

const SEEN_KEY = 'novelle-intro-seen';
const MAX_MS = 1600;

const hasSeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked: the loader simply shows again next time */
  }
};

/**
 * First-visit intro (≤ 1.6 s, skippable on click). Crown-N fades in, a glint sweeps across it,
 * and sparkles burst. Skipped entirely for reduced motion and repeat visits in the same session.
 */
export default function IntroLoader() {
  const reduce = useReducedMotion();
  const introDone = useUi((s) => s.introDone);
  const setIntroDone = useUi((s) => s.setIntroDone);
  const [show, setShow] = useState(() => !hasSeen() && !reduce);

  useEffect(() => {
    if (!show) {
      setIntroDone(true);
      return undefined;
    }
    const finish = () => {
      markSeen();
      setShow(false);
      setIntroDone(true);
    };
    const t = setTimeout(finish, MAX_MS);
    return () => clearTimeout(t);
  }, [show, setIntroDone]);

  return (
    <AnimatePresence>
      {show && !introDone && (
        <motion.div
          key="intro"
          role="status"
          aria-label="Loading Novelle Tech"
          onClick={() => setShow(false)}
          className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-ink-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <motion.div
            className="relative overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <Logo variant="mark" className="h-24 w-auto" />
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-6 -skew-x-12 bg-gradient-to-r from-transparent via-rose-100/50 to-transparent"
              initial={{ left: '-20%' }}
              animate={{ left: '120%' }}
              transition={{ delay: 0.6, duration: 0.7, ease: 'easeInOut' }}
            />
          </motion.div>
          <p className="mt-4 text-xs uppercase tracking-brand text-rose-300">Novelle</p>
          <p className="mt-6 text-xs text-rose-50/40">Click to skip</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
