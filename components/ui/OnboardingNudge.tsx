import React from 'react';
import { motion } from 'motion/react';
import { DUR, EASE } from './motionTokens';
import { Sparkles, ArrowDown, X } from 'lucide-react';

interface OnboardingNudgeProps {
  onStart: () => void;
  onDismiss: () => void;
  delay?: number;
}

export const OnboardingNudge: React.FC<OnboardingNudgeProps> = ({ onStart, onDismiss, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, delay }}
      className="bg-gradient-to-r from-[#FFCC00]/10 via-[#FFCC00]/15 to-[#FFCC00]/10 rounded-2xl p-4 lg:p-5 relative overflow-hidden"
    >
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: DUR.ambient.breathe, repeat: Infinity, ease: EASE.inOut }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFCC00]/5 to-transparent pointer-events-none"
      />

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 relative z-10 pr-8">
        <div className="w-9 h-9 rounded-xl bg-[#FFCC00]/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-[#FFCC00]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest mb-1">
            // FIRST AD?
          </div>
          <p className="text-sm text-white font-semibold mb-2">
            Start with <span className="text-[#FFCC00]">Director</span> — the 8-step guided workflow.
          </p>
          <p className="text-xs text-zinc-400 mb-3">
            Or pick any module below para mag-explore. Lahat ng AI tools ready na.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onStart}
              className="bg-[#FFCC00] text-black font-bold uppercase text-xs tracking-wide px-4 py-2 rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Start with Director
            </button>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest hidden sm:flex items-center gap-1">
              <ArrowDown className="w-3 h-3" />
              or scroll
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
