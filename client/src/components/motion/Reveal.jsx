import { motion, useReducedMotion } from 'framer-motion';
import { EASE, fadeUp, fadeOnly, stagger } from '../../lib/motion.js';

/** Fades a block up into view once. Reduced motion: opacity only. */
export function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      variants={reduce ? fadeOnly : fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Container that staggers its direct `StaggerItem` children into view. */
export function Stagger({ delay = 0.08, className = '', children, as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag
      className={className}
      variants={reduce ? { hidden: {}, show: {} } : stagger(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
    >
      {children}
    </Tag>
  );
}

export function StaggerItem({ className = '', children, as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] ?? motion.div;
  return (
    <Tag className={className} variants={reduce ? fadeOnly : fadeUp}>
      {children}
    </Tag>
  );
}

export { EASE };
