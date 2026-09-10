import React, { useId } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';

const TRAILS = [
  'M 0 480 C 108 456 164 234 322 190 C 430 160 514 184 600 66',
  'M 8 489 C 126 450 187 267 340 222 C 452 189 524 204 600 103',
  'M 20 496 C 142 454 214 298 362 253 C 468 221 536 231 600 147',
];
const DUST = [[130, 417, 1.8], [178, 342, 1.2], [222, 320, 2], [304, 248, 1.4], [410, 201, 1.6], [498, 218, 1.2]];

export const HeroTrails: React.FC<{ progress: MotionValue<number> }> = ({ progress }) => {
  const id = useId();
  // Functional transforms keep the light on the film's measured scroll timeline.
  const opacity = useTransform(() => {
    const p = progress.get();
    return p <= 0.32 ? 0 : p < 0.45 ? (p - 0.32) / 0.13 : Math.max(0, (0.88 - p) / 0.43);
  });
  const leftX = useTransform(progress, [0.32, 0.88], ['4%', '-62%']);
  const rightX = useTransform(progress, [0.32, 0.88], ['-4%', '62%']);
  const y = useTransform(progress, [0.32, 0.88], ['6%', '-12%']);
  const dustOpacity = useTransform(() => Math.max(0, 1 - Math.abs(progress.get() - 0.54) / 0.2));

  return (
    <motion.div className="landing-hero-trails" aria-hidden="true" style={{ opacity }}>
      {(['left', 'right'] as const).map(side => (
        <motion.div key={side} className="landing-trail-wing" data-trail-wing={side}
          style={{ x: side === 'left' ? leftX : rightX, y }}>
          <svg viewBox="0 0 600 600" preserveAspectRatio="none" focusable="false">
            <defs>
              <linearGradient id={`${id}-${side}`} x1="0" y1="480" x2="600" y2="80" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFCC00" stopOpacity="0" />
                <stop offset="0.22" stopColor="#FFCC00" stopOpacity="0.5" />
                <stop offset="0.58" stopColor="#FFCC00" />
                <stop offset="1" stopColor="#FFCC00" stopOpacity="0" />
              </linearGradient>
            </defs>
            <g transform={side === 'left' ? 'translate(600 0) scale(-1 1)' : undefined}
              fill="none" stroke={`url(#${id}-${side})`} strokeLinecap="round">
              {TRAILS.map((d, index) => (
                <React.Fragment key={d}>
                  <path d={d} strokeWidth="9" opacity="0.055" vectorEffect="non-scaling-stroke" />
                  <path d={d} strokeWidth={index === 0 ? 1.6 : 0.9} opacity={1 - index * 0.22} vectorEffect="non-scaling-stroke" />
                </React.Fragment>
              ))}
              <motion.g style={{ opacity: dustOpacity }} fill="#FFCC00" stroke="none">
                {DUST.map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} opacity="0.65" />)}
              </motion.g>
            </g>
          </svg>
        </motion.div>
      ))}
    </motion.div>
  );
};
