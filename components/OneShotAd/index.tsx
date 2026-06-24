import React, { useState } from 'react';
import { ChevronLeft, AlertTriangle, RotateCw } from 'lucide-react';
import type { ClientDetails, BusinessInfo } from '../../types';
import { generateMarketResearch } from '../../services/geminiService';
import { mapReportToWizard, type AutopilotInput } from '../../services/oneShotIntake';
import { useOneShotGeneration, type OneShotSinks } from '../../hooks/useOneShotGeneration';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen';

/**
 * One-Shot Ad module container. Collects a brief (LaunchScreen), runs market
 * research, projects it onto the wizard, then drives main's client-side
 * `useOneShotGeneration` chain (script → presenter → storyboard → scenes →
 * thumbnail → video prompts). On completion it routes to Step 8 review, where
 * the GenerateVideo hand-off (and metered render) already live — identical to
 * the Director one-shot, just with a richer intake.
 */
interface OneShotAdProps {
  userId: string | null;
  /** Setters into App.tsx's central wizard state — keeps Step 8 review + GenerateVideo in sync. */
  sinks: OneShotSinks;
  setClientDetails: (c: ClientDetails) => void;
  setBusinessInfo: (b: BusinessInfo) => void;
  setAspectRatio: (r: '9:16' | '16:9') => void;
  /** Pro+ unlock for Director (step-by-step) mode. Free/Starter get the upsell. */
  directorUnlocked: boolean;
  onBack: () => void;
  /** Route to pricing when a locked user reaches for Director mode. */
  onUpgrade: () => void;
  /** Switch to the advanced 8-step wizard (the brief carries over). */
  onSwitchToSteps: () => void;
  /** Open Signal Modulator's Voice Cloning tab from the voice picker. */
  onCloneVoice: () => void;
  /** After a successful run → Step 8 review + video hand-off. */
  onReview: () => void;
}

const OneShotAd: React.FC<OneShotAdProps> = ({
  userId,
  sinks,
  setClientDetails,
  setBusinessInfo,
  setAspectRatio,
  directorUnlocked,
  onBack,
  onUpgrade,
  onSwitchToSteps,
  onCloneVoice,
  onReview,
}) => {
  const oneShot = useOneShotGeneration();
  const [phase, setPhase] = useState<'launch' | 'running' | 'error'>('launch');
  const [researching, setResearching] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  const start = async (input: AutopilotInput) => {
    setErrMsg('');
    setPhase('running');
    setResearching(true);
    try {
      // 1 — Market research (auto; replaces the manual Step 1/2 prefill).
      const report = await generateMarketResearch({
        brandName: input.brandName,
        productName: input.productName,
        productDescription: input.productDescription,
        priceOffer: input.price ? `${input.offer} (${input.price})` : input.offer,
        isLocalService: input.isLocalService ?? (input.scriptType === 'Services' || input.scriptType === 'RealEstate'),
        businessAddress: input.businessAddress?.trim() || undefined,
        uploadedImages: input.heroImageBase64 ? [input.heroImageBase64] : [],
      });

      // 2 — Project onto wizard state so Step 8 review + GenerateVideo see it.
      const { clientDetails, businessInfo } = mapReportToWizard(input, report);
      const ar: '9:16' | '16:9' = input.aspectRatio === '16:9' ? '16:9' : '9:16';
      setClientDetails(clientDetails);
      setBusinessInfo(businessInfo);
      setAspectRatio(ar);
      setResearching(false);

      // 3 — Run the generation chain, honoring the intake presenter.
      const ok = await oneShot.run(
        { clientDetails, businessInfo, language: input.language, aspectRatio: ar, presetAvatar: input.avatar },
        sinks,
      );
      if (ok) {
        onReview();
      } else {
        setErrMsg(oneShot.error || 'Generation failed. Please try again.');
        setPhase('error');
      }
    } catch (e: unknown) {
      setResearching(false);
      setErrMsg(e instanceof Error ? e.message : 'Market research failed. Please try again.');
      setPhase('error');
    }
  };

  const BackBar = (
    <button
      onClick={onBack}
      className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white"
    >
      <ChevronLeft className="h-4 w-4" /> Command Center
    </button>
  );

  if (!userId) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        {BackBar}
        <p className="text-sm">Sign in to use One-Shot Ad.</p>
      </div>
    );
  }

  // Running screen has no header of its own → keep the absolute back link.
  if (phase === 'running') {
    return (
      <div className="relative">
        {BackBar}
        <RunningScreen researching={researching} stages={oneShot.stages} onMinimize={onBack} />
      </div>
    );
  }

  // LaunchScreen renders the canonical left-aligned module header (with its own
  // back button), so the absolute BackBar is omitted here to avoid a duplicate.
  return (
    <div className="relative">
      {phase === 'error' && (
        <div className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {errMsg} — adjust and try again.
          <button onClick={() => { oneShot.reset(); setPhase('launch'); }} className="ml-auto flex items-center gap-1 text-[#FFCC00] hover:underline">
            <RotateCw className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      )}
      <LaunchScreen
        onLaunch={start}
        directorUnlocked={directorUnlocked}
        onUpgrade={onUpgrade}
        onSwitchToSteps={onSwitchToSteps}
        onBack={onBack}
        onCloneVoice={onCloneVoice}
      />
    </div>
  );
};

export default OneShotAd;
