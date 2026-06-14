import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

type ScribbleVariant = 'underline' | 'circle' | 'strike';

interface SignatureScribbleProps {
  variant?: ScribbleVariant;
  /** Seconds before the draw-on starts once in view. */
  delay?: number;
  children: React.ReactNode;
  className?: string;
  strokeWidth?: number;
}

// Hand-drawn-feel paths, 100x20 (lines) / 100x50 (circle) boxes stretched to the word.
// Sizing/position are set via inline `style` (not Tailwind arbitrary classes like
// `h-[0.18em]`) on purpose: the Play-CDN JIT generates those arbitrary utilities
// inconsistently across pages, and when the height class is missing the SVG falls
// back to its viewBox intrinsic aspect ratio (a tall box) — which detaches the wave
// into two stray dots below the word. Inline styles always apply, so the underline
// renders identically on every page.
const PATHS: Record<ScribbleVariant, { d: string; viewBox: string; style: React.CSSProperties }> = {
  underline: {
    d: 'M2 12 C 18 16, 38 6, 58 10 C 72 13, 88 8, 98 12',
    viewBox: '0 0 100 20',
    // Sits just below the baseline so descenders (g/y/p) stay clear, while tight
    // headline leading (0.9) still doesn't collide with the next line.
    style: { left: '-0.1em', bottom: '-0.12em', width: 'calc(100% + 0.2em)', height: '0.18em' },
  },
  circle: {
    d: 'M62 6 C 30 2, 5 10, 4 22 C 3 36, 20 44, 45 46 C 70 48, 96 40, 97 25 C 98 12, 78 2, 50 4',
    viewBox: '0 0 100 50',
    style: { left: '-0.35em', top: '-0.18em', width: 'calc(100% + 0.7em)', height: 'calc(100% + 0.36em)' },
  },
  strike: {
    d: 'M2 11 C 30 7, 70 14, 98 9',
    viewBox: '0 0 100 20',
    style: { left: '-0.15em', top: '50%', width: 'calc(100% + 0.3em)', height: '0.5em', transform: 'translateY(-50%)' },
  },
};

/**
 * Gold signature-style scribble that draws itself on scroll (landonorris.com
 * signature pattern). Wraps the word(s) it decorates; SVG stroke only, so the
 * animation is pure pathLength — static full path under reduced motion.
 */
export const SignatureScribble: React.FC<SignatureScribbleProps> = ({
  variant = 'underline',
  delay = 0.3,
  children,
  className = '',
  strokeWidth = 3,
}) => {
  const reduceMotion = useReducedMotion();
  const { d, viewBox, style } = PATHS[variant];

  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        className="absolute pointer-events-none"
        style={style}
        viewBox={viewBox}
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <motion.path
          d={d}
          stroke="#FFCC00"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={reduceMotion ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, delay, ease: 'easeInOut' }}
        />
      </svg>
    </span>
  );
};
