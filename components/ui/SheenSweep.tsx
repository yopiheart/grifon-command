import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE } from './motionTokens';

/**
 * Gold-hour light pass — a skewed highlight that sweeps across its parent on
 * hover (the studio-lot-sign moment). Parent must be a motion component with
 * `whileHover="hover"` and `relative overflow-hidden`; the variant label
 * propagates down to this span. Transform-only (GPU-composited), hover-only
 * (inert on touch devices), removed entirely under reduced motion.
 */
export const SheenSweep: React.FC<{ color?: string }> = ({ color = 'rgba(255,255,255,0.16)' }) => {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/2 z-10"
      style={{ background: `linear-gradient(105deg, transparent, ${color}, transparent)`, skewX: -15 }}
      initial={{ x: '-150%' }}
      variants={{ hover: { x: '250%' } }}
      transition={{ duration: DUR.entrance, ease: EASE.expressive }}
    />
  );
};
