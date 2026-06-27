import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';

/**
 * One-Shot Ad signature motion primitives. Pure CSS (keyframes live in
 * index.css, prefixed `osa-`), GPU-only, so a 45-min render never janks.
 * The "gold beam" through-line: aim (Launch) → current (Running) → spotlight
 * (First Cut). Build once here, reused across all three screens.
 */

/** Ambient drifting blurred gold orbs — "the machine is running". Decorative. */
export const DriftOrbs: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
    <div className="osa-orb-a absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[#FFCC00] opacity-[0.07] blur-3xl" />
    <div className="osa-orb-b absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-[#FFCC00] opacity-[0.06] blur-3xl" />
    <div className="osa-orb-a absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#FFCC00] opacity-[0.05] blur-3xl" />
  </div>
);

/** The hero "Make My Ad" / "Download" button — a gold sweep reads as charged. */
export const ShimmerButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }
> = ({ children, className = '', disabled, ...props }) => (
  <button
    disabled={disabled}
    className={`relative w-full rounded-full py-4 px-6 text-sm font-mono font-bold uppercase tracking-widest text-black transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
      disabled ? 'bg-zinc-700' : 'osa-shimmer shadow-[0_0_24px_rgba(255,204,0,0.4)] hover:shadow-[0_0_40px_rgba(255,204,0,0.6)]'
    } ${className}`}
    {...props}
  >
    {children}
  </button>
);

/** Skeleton → image reveal for a scene tile (render + reshoot). */
export const SceneReveal: React.FC<{
  imageUrl?: string;
  loading?: boolean;
  alt?: string;
  className?: string;
}> = ({ imageUrl, loading, alt = '', className = '' }) => {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt} className={`osa-reveal h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`h-full w-full ${className}`}>
      <div
        className={`h-full w-full bg-gradient-to-br from-zinc-800/80 to-zinc-900 ${loading ? 'animate-pulse' : ''}`}
      />
    </div>
  );
};

/** A node on the render-stage spine, with the gold current pulse when active. */
export const SpineNode: React.FC<{
  state: 'done' | 'active' | 'pending';
  last?: boolean;
  children: React.ReactNode;
}> = ({ state, last, children }) => (
  <div className="relative flex gap-4">
    {/* rail + node */}
    <div className="relative flex flex-col items-center">
      <div
        className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
          state === 'done'
            ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
            : state === 'active'
            ? 'border-[#FFCC00] bg-zinc-950 text-[#FFCC00] shadow-[0_0_16px_rgba(255,204,0,0.5)]'
            : 'border-white/15 bg-zinc-950 text-zinc-600'
        }`}
      >
        {state === 'done' ? (
          <Check className="h-4 w-4" />
        ) : state === 'active' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Circle className="h-3 w-3" />
        )}
      </div>
      {!last && (
        <div className="relative my-1 w-px flex-1 overflow-hidden bg-white/10">
          {state === 'done' && <div className="absolute inset-0 bg-[#FFCC00]" />}
          {state === 'active' && <div className="osa-flow absolute inset-x-[-1px] h-6 bg-[#FFCC00]" />}
        </div>
      )}
    </div>
    <div className={`pb-6 ${state === 'pending' ? 'opacity-50' : ''}`}>{children}</div>
  </div>
);
