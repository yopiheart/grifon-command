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
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-6">
      <div className="w-full max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors mb-8 mt-4"
        >
          <ChevronLeft className="w-4 h-4" /> COMMAND CENTER
        </button>

        <GlassPanel className="p-6 md:p-10 text-center">
          <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-4">
            // YOUR_AD_IS_READY_TO_COME_ALIVE
          </p>

          {/* Teaser: the user's own asset, blurred behind a lock + play button. */}
          <div className="relative mx-auto mb-8 w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
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

          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
            Turn your plan into a{' '}
            <span className="text-[#FFCC00]">real video ad</span>
          </h2>

          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
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
        </GlassPanel>
      </div>
    </div>
  );
};

export default LockedVideoPreview;
