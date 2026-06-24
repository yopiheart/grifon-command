import React from 'react';
import { ChevronLeft, PenLine, Clapperboard } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';

// ===========================================================================
// Expert Mode — "Director's Cut" (bring-your-own-script door in Director AI).
//
// Additive sibling to One-Shot + the 8-step wizard: the expert brings their own
// script and controls each storyboard scene, on Grifon's guardrails. v1 is
// dev-unlock gated (grifon_dev_unlock / ?admin=on) — see App.tsx.
//
// SLICE 2: door + shell stub. Slices 3–5 fill in the slim intake, Script Studio,
// and per-scene direction. PRESENTATIONAL — wizard state stays in App.tsx.
// ===========================================================================

export interface ExpertModeProps {
  onBack: () => void;
}

const ExpertMode: React.FC<ExpertModeProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 text-white">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">BACK TO ONE-SHOT</span>
            <span className="md:hidden">BACK</span>
          </button>
          <div className="flex flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500 uppercase tracking-tight">
                Director&apos;s Cut
              </h1>
              <span className="rounded-md border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
                Dev
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
              // BRING YOUR OWN SCRIPT · CONTROL EVERY SCENE
            </p>
          </div>
        </header>

        <GlassPanel className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <Clapperboard className="h-5 w-5 text-[#FFCC00]" />
            <h2 className="text-sm font-bold text-white">Coming together</h2>
          </div>
          <p className="max-w-2xl text-sm text-zinc-400">
            You bring the script; Grifon storyboards and renders it on your guardrails. Up next in this
            flow:
          </p>
          <ol className="flex flex-col gap-2 text-sm text-zinc-300">
            <li className="flex items-center gap-2">
              <PenLine className="h-4 w-4 shrink-0 text-zinc-500" /> Slim intake — presenter, product/asset, settings
            </li>
            <li className="flex items-center gap-2">
              <PenLine className="h-4 w-4 shrink-0 text-zinc-500" /> Script Studio — pick a format, type your beats (hard-capped to ~your target length)
            </li>
            <li className="flex items-center gap-2">
              <PenLine className="h-4 w-4 shrink-0 text-zinc-500" /> Scene Direction — Auto, or pick a shot type + direct each scene
            </li>
          </ol>
        </GlassPanel>
      </div>
    </div>
  );
};

export default ExpertMode;
