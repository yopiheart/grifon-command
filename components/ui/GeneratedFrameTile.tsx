import React from 'react';
import type { LucideIcon } from 'lucide-react';
import Loader from './Loader';

/**
 * A single generated-image tile: image + hover-action overlay + label badge,
 * with empty/loading states. This is the repeated atom underneath the inline
 * grids in CinematicSpecStudio, InfluencerForge, and ImageAdsGen — and the
 * building block for side-by-side variation/divergence galleries.
 *
 * It deliberately models ONE frame, not a whole card. Domain-specific chrome
 * (copy blocks, FB export, lightbox wiring) stays with the caller.
 */

export interface FrameAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Gold (primary) styling instead of the default translucent button. */
  primary?: boolean;
  /** Spin the icon while this action is in flight. */
  busy?: boolean;
}

export interface GeneratedFrameTileProps {
  imageUrl?: string | null;
  /** Dim + pulse the image in place (e.g. regenerating this frame). */
  busy?: boolean;
  /** Extra container classes, e.g. an aspect ratio like `aspect-[9/16]`. */
  className?: string;
  /** Top-left badge content; rendered inside the standard badge chrome. */
  label?: React.ReactNode;
  /** Hover overlay actions (regenerate / download / edit / select …). */
  actions?: FrameAction[];
  /** Click handler on the image itself (e.g. open a lightbox). */
  onImageClick?: () => void;
  /** Caption shown under the spinner in the empty/loading state. */
  loadingMessage?: string;
  /** Custom empty state (e.g. a "RENDER" CTA). Falls back to the loader. */
  emptyState?: React.ReactNode;
}

const GeneratedFrameTile: React.FC<GeneratedFrameTileProps> = ({
  imageUrl,
  busy = false,
  className = '',
  label,
  actions = [],
  onImageClick,
  loadingMessage = '',
  emptyState,
}) => {
  const isEmpty = !imageUrl;

  return (
    <div
      className={`relative group overflow-hidden border border-white/10 rounded-2xl bg-zinc-900 shadow-xl transition-all duration-500 ${
        isEmpty && !emptyState ? 'opacity-40 animate-pulse' : 'opacity-100'
      } ${className}`}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            onClick={onImageClick}
            className={`w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 ${
              onImageClick ? 'cursor-zoom-in' : ''
            } ${busy ? 'opacity-50 animate-pulse' : ''}`}
          />
          {actions.length > 0 && (
            <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 p-6 z-20">
              {actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <button
                    key={i}
                    onClick={a.onClick}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 transition-all text-[10px] font-bold uppercase rounded-xl ${
                      a.primary
                        ? 'bg-[#FFCC00] hover:bg-[#FFCC00]/90 text-black'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${a.busy ? 'animate-spin' : ''}`} /> {a.label}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : emptyState ? (
        emptyState
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <Loader message="" size="sm" />
          {loadingMessage && (
            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">{loadingMessage}</p>
          )}
        </div>
      )}

      {label && (
        <div className="absolute top-3 left-3 bg-zinc-950/80 backdrop-blur-md text-[#FFCC00] text-[10px] font-mono px-3 py-1 rounded-lg uppercase tracking-widest z-10 border border-white/10">
          {label}
        </div>
      )}
    </div>
  );
};

export default GeneratedFrameTile;
