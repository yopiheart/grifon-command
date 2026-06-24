import React, { useState } from 'react';
import { ChevronLeft, Clapperboard, PenLine } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { IntakeScreen } from './IntakeScreen';
import { emptyExpertIntake, type ExpertIntake } from './types';

// ===========================================================================
// Expert Mode — "Director's Cut" (bring-your-own-script door in Director AI).
//
// Additive sibling to One-Shot + the 8-step wizard: the expert brings their own
// script and controls each storyboard scene, on Grifon's guardrails. v1 is
// dev-unlock gated (grifon_dev_unlock / ?admin=on) — see App.tsx.
//
// Internal phase machine. Slice 3: slim intake. Slices 4–5 add Script Studio +
// per-scene direction + generation wiring. PRESENTATIONAL — holds its own draft
// state; writes to App's wizard state only when the flow generates (slice 5).
// ===========================================================================

type Phase = 'intake' | 'studio';

export interface ExpertModeProps {
  onBack: () => void;
}

const ExpertMode: React.FC<ExpertModeProps> = ({ onBack }) => {
  const [phase, setPhase] = useState<Phase>('intake');
  const [intake, setIntake] = useState<ExpertIntake>(emptyExpertIntake);

  if (phase === 'intake') {
    return (
      <Frame onBack={onBack}>
        <IntakeScreen
          intake={intake}
          setIntake={setIntake}
          onBack={onBack}
          onNext={() => setPhase('studio')}
        />
      </Frame>
    );
  }

  // Slice 4 lands here — Script Studio. Stub for now.
  return (
    <Frame onBack={() => setPhase('intake')} backLabel="BACK TO INTAKE">
      <GlassPanel className="mx-auto flex max-w-4xl flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <PenLine className="h-5 w-5 text-[#FFCC00]" />
          <h2 className="text-sm font-bold text-white">Script Studio — next up</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Intake captured for <span className="text-[#FFCC00]">{intake.brandName || '—'}</span>. Script
          Studio (pick a format, type your hard-capped beats to your target length) lands in the next slice.
        </p>
      </GlassPanel>
    </Frame>
  );
};

// Shared page chrome — header + back affordance, matching the Director AI surface.
const Frame: React.FC<{ onBack: () => void; backLabel?: string; children: React.ReactNode }> = ({
  onBack,
  backLabel = 'BACK TO ONE-SHOT',
  children,
}) => (
  <div className="min-h-screen bg-zinc-950 font-sans flex flex-col items-center p-4 sm:p-6 md:p-8 text-white">
    <div className="w-full max-w-6xl mx-auto">
      <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-4">
        <button
          onClick={onBack}
          className="-ml-1 flex min-h-11 items-center gap-2 px-1 py-2 text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" /> <span className="hidden md:inline">{backLabel}</span>
          <span className="md:hidden">BACK</span>
        </button>
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight">
              Director&apos;s Cut
            </h1>
            <span className="rounded-md border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
              Dev
            </span>
            <Clapperboard className="h-5 w-5 text-zinc-600" />
          </div>
          <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">
            // BRING YOUR OWN SCRIPT · CONTROL EVERY SCENE
          </p>
        </div>
      </header>
      {children}
    </div>
  </div>
);

export default ExpertMode;
