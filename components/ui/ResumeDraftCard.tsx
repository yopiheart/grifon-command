import React from 'react';
import { motion } from 'motion/react';
import { DUR, EASE } from './motionTokens';
import { Film, ArrowRight, X } from 'lucide-react';

interface ResumeDraftCardProps {
  currentStep: number;
  totalSteps: number;
  savedAt: number;
  brandName?: string;
  onResume: () => void;
  onDiscard: () => void;
  delay?: number;
}

const formatRelative = (ts: number): string => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

export const ResumeDraftCard: React.FC<ResumeDraftCardProps> = ({
  currentStep,
  totalSteps,
  savedAt,
  brandName,
  onResume,
  onDiscard,
  delay = 0,
}) => {
  const pct = Math.max(0, Math.min(1, currentStep / totalSteps));
  // Last step = the ad is done, not a draft. Same card, finished-ad copy.
  const finished = currentStep >= totalSteps;
  const progress = finished ? 'Ready to render' : `Step ${currentStep} of ${totalSteps}`;
  const subtitle = brandName ? `${brandName} · ${progress}` : progress;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, delay }}
      className="bg-[#FFCC00]/[0.06] rounded-2xl p-4 lg:p-5 relative overflow-hidden hover:bg-[#FFCC00]/[0.10] hover:shadow-[0_8px_40px_rgba(255,204,0,0.15)] transition-all duration-500 ease-out"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFCC00]/5 to-transparent pointer-events-none" />

      <button
        onClick={onDiscard}
        aria-label={finished ? 'Discard finished ad' : 'Discard draft'}
        className="absolute top-3 right-3 text-on-surface-sublabel hover:text-white transition-colors z-10 p-1 -m-1"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative z-10 flex items-center gap-3 pr-7">
        <div className="w-10 h-10 rounded-xl bg-[#FFCC00]/15 flex items-center justify-center flex-shrink-0">
          <Film className="w-5 h-5 text-[#FFCC00]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest mb-0.5">
            {finished ? '// FINISHED_AD — READY_TO_RENDER' : '// RESUME DRAFT'}
          </div>
          <div className="text-sm font-bold text-white truncate">Director</div>
          <div className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest truncate">
            {subtitle}
          </div>
          <div className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest truncate">
            saved {formatRelative(savedAt)}
          </div>
        </div>
        <button
          onClick={onResume}
          className="hidden sm:flex bg-[#FFCC00] text-black font-bold uppercase text-[11px] tracking-wide px-4 py-2 rounded-full hover:scale-105 active:scale-95 transition-all items-center gap-1.5 flex-shrink-0"
        >
          {finished ? 'Balikan ang ad mo' : 'Resume'}
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <button
        onClick={onResume}
        className="sm:hidden mt-3 w-full bg-[#FFCC00] text-black font-bold uppercase text-xs tracking-wide px-4 py-2.5 rounded-full active:scale-95 transition-all flex items-center justify-center gap-1.5 relative z-10"
      >
        {finished ? 'Balikan ang ad mo' : 'Resume Draft'}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>

      <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden relative z-10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: DUR.entrance, ease: EASE.out }}
          className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFD93D] shadow-[0_0_8px_rgba(255,204,0,0.6)]"
        />
      </div>
    </motion.div>
  );
};
