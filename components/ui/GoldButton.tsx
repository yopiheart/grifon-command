import React, { useRef } from 'react';
import { toast } from 'sonner';
import { CheckCircle } from 'lucide-react';
import { playTick } from '../../services/uiSoundService';

interface GoldButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /**
   * Premium marketing variant: gold gradient + inset sheen + soft gold-glow + hover lift.
   * Opt-in so the 200+ in-app usages keep the flat default untouched. Use on marketing
   * primary CTAs only (hero, footer, pricing, pinned pill).
   */
  glossy?: boolean;
}

export const GoldButton: React.FC<GoldButtonProps> = ({ children, className = '', onClick, glossy = false, ...props }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTick();
    if (onClick) {
      onClick(e);
    }

    const text = buttonRef.current?.textContent?.toUpperCase() || '';
    const icon = <CheckCircle className="w-4 h-4 text-[#FFCC00]" />;

    if (text.includes('GENERATE') || text.includes('SYNTHESIZE') || text.includes('RENDER')) {
      toast('SYNTHESIS INITIATED...', { icon });
    } else if (text.includes('ANALYZE') || text.includes('OPTIMIZE') || text.includes('RESEARCH')) {
      toast('ANALYSIS STARTED...', { icon });
    } else if (text.includes('INITIATE')) {
      toast('PROCESS INITIATED...', { icon });
    }
  };

  const flatClass =
    'min-h-11 rounded-full bg-[#FFCC00] text-black font-sans font-semibold normal-case tracking-normal py-3 text-sm text-center leading-tight px-4 md:px-8 shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:shadow-[0_0_25px_rgba(255,204,0,0.5)] hover:scale-105 active:scale-95 transition-all duration-300';

  // Glossy: gold GRADIENT (tints of the same #FFCC00 — no new hue) for depth, inset top
  // highlight + soft gold halo for the light-source look, hover lift + press for tactility.
  const glossyClass =
    'relative overflow-hidden min-h-11 rounded-full bg-gradient-to-b from-[#FFD83D] via-[#FFCC00] to-[#E6B800] text-black font-sans font-semibold normal-case tracking-normal py-3 text-sm text-center leading-tight px-4 md:px-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_18px_rgba(255,204,0,0.35)] hover:-translate-y-0.5 hover:from-[#FFE266] hover:to-[#F0C200] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_0_28px_rgba(255,204,0,0.55)] active:translate-y-0 active:scale-[0.99] transition-all duration-300';

  return (
    <button
      ref={buttonRef}
      className={`${glossy ? glossyClass : flatClass} ${className}`}
      onClick={handleClick}
      {...props}
    >
      {glossy ? (
        <>
          {/* Top-half gloss sheen — sits behind the label */}
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/35 to-transparent" />
          <span className="relative z-10">{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
