import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE, DUR } from '../ui/motionTokens';

type ScribbleVariant = 'underline' | 'circle' | 'strike';

interface SignatureScribbleProps {
  variant?: ScribbleVariant;
  /** Seconds before the draw-on starts once in view. */
  delay?: number;
  children: React.ReactNode;
  className?: string;
  strokeWidth?: number;
  /**
   * Draw on mount instead of on scroll-into-view. Use this when the scribble
   * lives in a container whose scroll/clip position makes `whileInView`
   * unreliable — e.g. an element inside a horizontally-scrolling, partially
   * clipped row (the pricing cards). With the default whileInView trigger, if
   * the viewport `amount` threshold is never met the path stays at pathLength 0
   * and the underline is invisible.
   */
  playOnMount?: boolean;
}

// Hand-drawn-feel paths, 100x20 (lines) / 100x50 (circle) boxes stretched to the word.
// Sizing is INLINE STYLE, not Tailwind arbitrary classes: the Play-CDN JIT has
// dropped utilities like h-[0.18em] on some pages, letting the SVG fall back to
// its tall viewBox aspect ratio and detach into stray dots (the recurring mobile
// breakage — see 40f849e). Inline styles cannot be un-generated.
const PATHS: Record<ScribbleVariant, { d: string; viewBox: string; svgStyle: React.CSSProperties }> = {
  underline: {
    d: 'M2 12 C 18 16, 38 6, 58 10 C 72 13, 88 8, 98 12',
    viewBox: '0 0 100 20',
    // Sits just below the baseline so descenders (g/y/p) stay clear, while tight
    // headline leading (0.9) still doesn't collide with the next line.
    svgStyle: { left: '-0.1em', bottom: '-0.12em', width: 'calc(100% + 0.2em)', height: '0.18em' },
  },
  circle: {
    d: 'M62 6 C 30 2, 5 10, 4 22 C 3 36, 20 44, 45 46 C 70 48, 96 40, 97 25 C 98 12, 78 2, 50 4',
    viewBox: '0 0 100 50',
    svgStyle: { left: '-0.35em', top: '-0.18em', width: 'calc(100% + 0.7em)', height: 'calc(100% + 0.36em)' },
  },
  strike: {
    d: 'M2 11 C 30 7, 70 14, 98 9',
    viewBox: '0 0 100 20',
    svgStyle: { left: '-0.15em', top: '50%', width: 'calc(100% + 0.3em)', height: '0.5em', transform: 'translateY(-50%)' },
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
  playOnMount = false,
}) => {
  const reduceMotion = useReducedMotion();
  const { d, viewBox, svgStyle } = PATHS[variant];

  // Reduced motion → static full path (no draw). Otherwise either draw on mount
  // (reliable anywhere) or draw once on scroll-into-view (the default delight).
  const drawProps = reduceMotion
    ? {}
    : playOnMount
      ? { animate: { pathLength: 1 } }
      : { whileInView: { pathLength: 1 }, viewport: { once: true, amount: 0.5 } as const };

  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      <svg
        className="absolute pointer-events-none"
        style={svgStyle}
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
          {...drawProps}
          transition={{ duration: DUR.expressive, delay, ease: EASE.inOut }}
        />
      </svg>
    </span>
  );
};
