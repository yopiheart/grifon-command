import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SnapRailProps {
  /** The cards; caller sizes each one (e.g. snap-center flex-shrink-0 w-[Nvw]). */
  children: React.ReactNode;
  /** Extra classes for the scroll container. */
  className?: string;
  /** Accessible name for the paddle group, e.g. "modules" → "Previous modules" / "Next modules". */
  label: string;
  /** md+ classes applied to the scroll container so desktop can become a grid,
   *  e.g. "md:grid md:grid-cols-2 md:gap-6 md:overflow-visible". */
  desktopClassName?: string;
}

/**
 * Reusable horizontal scroll-snap rail (Apple gallery mechanics): cards peek from
 * the right edge, prev/next paddle arrows visible on mobile with disabled end-states,
 * a right-edge fade cue, and reduced-motion-safe scrollBy. On md+ the caller swaps
 * the scroll container into a grid via `desktopClassName`, at which point the paddles
 * + fade hide (md:hidden) since there's nothing to scroll. Native snap physics only —
 * no auto-advance, no dots, no carousel lib. Extends the `snap-x` idiom already used
 * in ProofGallery.tsx.
 */
export const SnapRail: React.FC<SnapRailProps> = ({
  children,
  className = '',
  label,
  desktopClassName = '',
}) => {
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  // In-flight paddle destination (card index). Rapid taps chain from this, not
  // from the interpolated scrollLeft — rounding a mid-animation position still
  // rounds to the starting index and under-advances.
  const pendingIndex = useRef<number | null>(null);

  const cardStep = (el: HTMLDivElement) => {
    const first = el.firstElementChild as HTMLElement | null;
    const second = first?.nextElementSibling as HTMLElement | null;
    // Distance between two cards = card width + gap; fall back to clientWidth.
    return first && second
      ? second.offsetLeft - first.offsetLeft
      : first?.offsetWidth ?? el.clientWidth * 0.85;
  };

  const update = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    // Once the smooth scroll settles on the pending target, release it.
    if (pendingIndex.current !== null) {
      const step = cardStep(el);
      if (step > 0 && Math.abs(el.scrollLeft - pendingIndex.current * step) < 2) {
        pendingIndex.current = null;
      }
    }
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  // Manual drag/wheel takes over — a stale pending target must not hijack the
  // next paddle tap.
  const clearPending = () => {
    pendingIndex.current = null;
  };

  const paddle = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = cardStep(el);
    if (step <= 0) return;
    const maxIndex = el.children.length - 1;
    const base = pendingIndex.current ?? Math.round(el.scrollLeft / step);
    const next = Math.min(Math.max(base + dir, 0), maxIndex);
    pendingIndex.current = next;
    el.scrollTo({ left: next * step, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div>
      <div className="relative">
        <style>{`.snaprail-scroll::-webkit-scrollbar { display: none; }`}</style>
        <div
          ref={scrollRef}
          onScroll={update}
          onPointerDown={clearPending}
          onWheel={clearPending}
          className={`snaprail-scroll flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-4 ${desktopClassName} ${className}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>

        {/* Right-edge fade cue — mobile only (rail becomes a grid on md+). */}
        <div className="md:hidden pointer-events-none absolute top-0 right-0 bottom-4 w-12 bg-gradient-to-l from-zinc-950 to-transparent" />
      </div>

      {/* Paddle arrows — visible on mobile, hidden once the rail becomes a grid. */}
      <div className="md:hidden flex justify-end gap-2 px-4">
        <button
          type="button"
          onClick={() => paddle(-1)}
          disabled={!canPrev}
          aria-label={`Previous ${label}`}
          className="h-9 w-9 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-xl flex items-center justify-center text-zinc-400 transition-all hover:text-[#FFCC00] hover:border-[#FFCC00]/40 disabled:opacity-30 disabled:cursor-default disabled:hover:text-zinc-400 disabled:hover:border-white/10"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => paddle(1)}
          disabled={!canNext}
          aria-label={`Next ${label}`}
          className="h-9 w-9 rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-xl flex items-center justify-center text-zinc-400 transition-all hover:text-[#FFCC00] hover:border-[#FFCC00]/40 disabled:opacity-30 disabled:cursor-default disabled:hover:text-zinc-400 disabled:hover:border-white/10"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SnapRail;
