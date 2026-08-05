import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, EASE, reducedMotion } from '../theme/motionTokens';

// ===========================================================================
// Reveal — the ONE entrance animation in the funnel, and the only place
// motion/react is called from sections.
//
// Centralising it is what makes the "every animation passes through
// reducedMotion()" rule enforceable by reading one file instead of fifteen.
// ===========================================================================

interface RevealProps {
  children: React.ReactNode;
  /** Stagger index — multiplied by a fixed step, so lists cascade without ad-hoc numbers. */
  index?: number;
  className?: string;
}

const STEP = 0.06;

export const Reveal: React.FC<RevealProps> = ({ children, index = 0, className = '' }) => {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reducedMotion(reduce, {
        duration: DUR.entrance,
        ease: EASE.expressive,
        delay: index * STEP,
      })}
    >
      {children}
    </motion.div>
  );
};
