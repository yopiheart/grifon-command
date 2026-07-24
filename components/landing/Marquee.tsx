import React from 'react';

interface MarqueeProps {
  items: string[];
  /** 'serif' = big editorial strip (alternating serif italic gold / sans). 'mono' = small technical strip. */
  variant?: 'serif' | 'mono';
  /** Seconds per full loop. */
  duration?: number;
  reverse?: boolean;
  className?: string;
  /** Gold text with a travelling light-sweep glint (mono variant only — footer publish strip). */
  shine?: boolean;
}

/**
 * Infinite kinetic text strip (landing only). Content is rendered exactly twice
 * inside a w-max track so the CSS `marquee` keyframe (-50%) loops seamlessly.
 * Animation is pure CSS transform — paused entirely under prefers-reduced-motion.
 */
export const Marquee: React.FC<MarqueeProps> = ({
  items,
  variant = 'serif',
  duration = 30,
  reverse = false,
  className = '',
  shine = false,
}) => {
  const renderItems = (ariaHidden: boolean) => (
    <div aria-hidden={ariaHidden} className="flex items-baseline shrink-0">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <span
            className={
              variant === 'serif'
                ? i % 2 === 0
                  ? 'font-serif italic text-[#FFCC00] text-3xl md:text-5xl whitespace-nowrap'
                  : 'font-sans font-black uppercase tracking-tighter text-zinc-200 text-3xl md:text-5xl whitespace-nowrap'
                : `font-mono uppercase tracking-widest text-xs whitespace-nowrap ${shine ? 'marquee-glint font-bold' : 'text-on-surface-sublabel'}`
            }
          >
            {item}
          </span>
          <span
            className={
              variant === 'serif'
                ? 'text-[#FFCC00]/40 text-2xl md:text-4xl px-5 md:px-8'
                : `text-xs px-4 ${shine ? 'text-[#FFCC00]/40' : 'text-on-surface-sublabel'}`
            }
          >
            ◆
          </span>
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={`overflow-hidden border-y border-white/5 ${variant === 'serif' ? 'py-5 md:py-8' : 'py-3'} ${className}`}>
      <div
        className={`flex w-max animate-marquee ${reverse ? 'marquee-reverse' : ''}`}
        style={{ '--marquee-duration': `${duration}s` } as React.CSSProperties}
      >
        {renderItems(false)}
        {renderItems(true)}
      </div>
    </div>
  );
};
