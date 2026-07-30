import React from 'react';
import { ChevronLeft, Lock, Play, Sparkles } from 'lucide-react';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';

/**
 * The Free → paid CAC controller (Slice 3).
 *
 * Free renders 0 video ads (plan-only). Instead of a raw 402 wall, Free users
 * who finish a plan land here at the video hand-off: their OWN generated
 * thumbnail / first scene, blurred behind a lock + play button, with the upgrade
 * CTA. Seeing the finished ad one tap from coming alive is the highest-intent
 * upsell moment in the funnel (see workflows/pricing_unit_economics.md §5).
 *
 * This screen sells Starter ONLY. The ₱499 single-ad top-up is a PAID-MEMBER
 * perk behind the quota wall (Neil, 2026-07-30) — never a free-tier door, or the
 * subscription pitch competes with a one-off that undercuts it.
 *
 * Layout is side-by-side on desktop (teaser left, pitch right) so the whole
 * moment fits one viewport with no scroll; it stacks below `lg`, where a little
 * scrolling is fine.
 */

interface LockedVideoPreviewProps {
  onBack: () => void;
  onUpgrade: () => void;
  /** The user's generated thumbnail (preferred teaser). */
  thumbnailUrl?: string | null;
  /** Fallback teaser — the first storyboard scene image. */
  previewImageUrl?: string | null;
}

const LockedVideoPreview: React.FC<LockedVideoPreviewProps> = ({
  onBack,
  onUpgrade,
  thumbnailUrl,
  previewImageUrl,
}) => {
  const teaser = thumbnailUrl || previewImageUrl || null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col p-4 md:p-6">
      <div className="w-full max-w-5xl mx-auto flex flex-col flex-1">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors mb-4 mt-2 shrink-0"
        >
          <ChevronLeft className="w-4 h-4" /> COMMAND CENTER
        </button>

        <GlassPanel className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center gap-8">
          {/* Teaser: the user's own asset, blurred behind a lock + play button.
              Height-capped so the panel never outgrows the viewport on desktop. */}
          <div className="relative mx-auto w-full max-w-[240px] lg:max-w-none lg:mx-0 lg:h-[calc(100vh-13rem)] lg:max-h-[520px] lg:w-auto lg:shrink-0 aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
            {teaser ? (
              <img
                src={teaser}
                alt="Your ad preview"
                className="absolute inset-0 w-full h-full object-cover blur-md scale-110"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
            )}
            <div className="absolute inset-0 bg-zinc-950/40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_25px_rgba(255,204,0,0.5)]">
                <Play className="w-7 h-7 text-zinc-950 ml-1" fill="currentColor" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 uppercase tracking-widest">
                <Lock className="w-3 h-3" /> Locked
              </div>
            </div>
          </div>

          <div className="text-center lg:text-left min-w-0">
            <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-4">
              // YOUR_AD_IS_READY_TO_COME_ALIVE
            </p>

            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
              Turn your plan into a{' '}
              <span className="text-[#FFCC00]">real video ad</span>
            </h2>

            <p className="text-sm text-zinc-400 max-w-md mx-auto lg:mx-0 mb-8 leading-relaxed">
              Your free plan builds the whole ad — script, storyboard, avatar and
              thumbnail. Rendering it into a finished, ready-to-post video is a paid
              feature. Upgrade to <span className="text-white font-bold">Starter</span> to
              bring this one to life, or <span className="text-white font-bold">Pro</span> for
              8 finished ads a month plus the AI editor.
            </p>

            <GoldButton onClick={onUpgrade} className="px-8 py-3" glossy>
              <Sparkles className="w-4 h-4 mr-2 inline" />
              See plans &amp; unlock video
            </GoldButton>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default LockedVideoPreview;
