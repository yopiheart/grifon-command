import React, { useEffect, useState } from 'react';
import { ChevronLeft, AlertTriangle, RotateCw, Loader2, Sparkles, FilePlus2 } from 'lucide-react';
import type { ClientDetails, BusinessInfo, Scene } from '../../types';
import { generateMarketResearch } from '../../services/geminiService';
import { mapReportToWizard, type ProductionInput } from '../../services/oneShotIntake';
import { useOneShotGeneration, type OneShotSinks } from '../../hooks/useOneShotGeneration';
import { hydrateOneShotDraft, loadOneShotDraft, clearOneShotDraft } from '../../utils/oneShotDraft';
import { LaunchScreen } from './LaunchScreen';
import { RunningScreen } from './RunningScreen';
import ProducerFlow from './ProducerFlow';
import { MAT_PLATE } from '../ui/materialTokens';

/**
 * Opt-in switch to the new orchestrator-driven flow (Running → storyboard gate →
 * First Cut) while it bakes behind the live useOneShotGeneration→Step 8 path. Enable
 * per-session with `?osaEngine=producer` (persists to localStorage) or `?osaEngine=steps`
 * to force the legacy path. Lets the SIGLA smoke exercise the real flow non-destructively.
 */
const useProducerEngine = (): boolean => {
  if (typeof window === 'undefined') return false;
  const q = new URLSearchParams(window.location.search).get('osaEngine');
  if (q === 'producer') { try { localStorage.setItem('osa_engine', 'producer'); } catch { /* ignore */ } return true; }
  if (q === 'steps') { try { localStorage.removeItem('osa_engine'); } catch { /* ignore */ } return false; }
  try { return localStorage.getItem('osa_engine') === 'producer'; } catch { return false; }
};

/**
 * One-Shot Ad module container. Collects a brief (LaunchScreen), runs market
 * research, projects it onto the wizard, then drives main's client-side
 * `useOneShotGeneration` chain (script → presenter → storyboard → scenes →
 * thumbnail → video prompts). On completion it routes to the consumer review
 * surface (ReviewScreen), where the GenerateVideo hand-off (and metered render)
 * already live — identical to the Director one-shot, just with a richer intake.
 */
interface OneShotAdProps {
  userId: string | null;
  /** Setters into App.tsx's central wizard state — keeps review + GenerateVideo in sync. */
  sinks: OneShotSinks;
  /** Live storyboard read back from App state — feeds the running screen's scene tiles. */
  storyboard?: Scene[];
  setClientDetails: (c: ClientDetails) => void;
  setBusinessInfo: (b: BusinessInfo) => void;
  setAspectRatio: (r: '9:16' | '16:9') => void;
  /** Dev-only unlock for Director (step-by-step) mode — the wizard door. */
  directorUnlocked: boolean;
  /** Pro+ unlock for the First Cut edit presets (IMPACT/CLEAN). Free/Starter get the upsell. */
  presetUnlocked: boolean;
  /** True when the user is already on Business — hides the First Cut "Advanced Editor" teaser. */
  isBusinessTier: boolean;
  /** Vertical from the landing one-question segmentation — a DEFAULT for the
   * LaunchScreen picker only; a restored draft's own vertical wins. */
  preferredVertical?: string;
  onBack: () => void;
  /** Route to pricing when a locked user reaches for Director mode. */
  onUpgrade: () => void;
  /** Switch to the advanced 8-step wizard (the brief carries over). */
  onSwitchToSteps: () => void;
  /** Switch to Expert Mode (Director's Cut). Dev-unlock gated for v1 — undefined hides the door. */
  onSwitchToExpert?: () => void;
  /** Open Signal Modulator's Voice Cloning tab from the voice picker. */
  onCloneVoice: () => void;
  /** After a successful run → the consumer review surface + video hand-off. */
  onReview: () => void;
}

const OneShotAd: React.FC<OneShotAdProps> = ({
  userId,
  sinks,
  storyboard,
  setClientDetails,
  setBusinessInfo,
  setAspectRatio,
  directorUnlocked,
  presetUnlocked,
  isBusinessTier,
  preferredVertical,
  onBack,
  onUpgrade,
  onSwitchToSteps,
  onSwitchToExpert,
  onCloneVoice,
  onReview,
}) => {
  // Opt-in orchestrator flow — early-return before the legacy hooks so hook order stays
  // stable for the mount (the flag is constant per mount).
  if (useProducerEngine()) {
    return (
      <ProducerFlow
        userId={userId}
        directorUnlocked={directorUnlocked}
        presetUnlocked={presetUnlocked}
        isBusinessTier={isBusinessTier}
        preferredVertical={preferredVertical}
        onBack={onBack}
        onUpgrade={onUpgrade}
        onSwitchToSteps={onSwitchToSteps}
        onSwitchToExpert={onSwitchToExpert}
        onCloneVoice={onCloneVoice}
      />
    );
  }

  const oneShot = useOneShotGeneration();
  const [phase, setPhase] = useState<'launch' | 'running' | 'error'>('launch');
  const [researching, setResearching] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Resume gating: a warm draft (same session — e.g. the clone-voice detour)
  // restores silently; a cold draft (browser was closed) offers Resume / Start
  // fresh so the user keeps control. `go` mounts the composer.
  const [resume, setResume] = useState<'loading' | 'ask' | 'go'>(() => (loadOneShotDraft() ? 'go' : 'loading'));
  useEffect(() => {
    if (loadOneShotDraft()) { setResume('go'); return; } // warm → silent restore
    let alive = true;
    void hydrateOneShotDraft().then((d) => {
      if (!alive) return;
      setResume(d ? 'ask' : 'go');
    });
    return () => { alive = false; };
  }, []);

  const start = async (input: ProductionInput) => {
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
        { clientDetails, businessInfo, language: input.language, aspectRatio: ar, presetAvatar: input.avatar, castHints: input.castHints },
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
      className="absolute left-4 top-4 z-20 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel hover:text-white"
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
        <RunningScreen researching={researching} stages={oneShot.stages} scenes={storyboard} onMinimize={onBack} />
      </div>
    );
  }

  // Cold-start: a quick blank while IndexedDB hydrates (sub-frame in practice).
  if (resume === 'loading') {
    return (
      <div className="relative min-h-screen bg-zinc-950">
        {BackBar}
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#FFCC00]" />
        </div>
      </div>
    );
  }

  // Cold-start with a saved draft → let the user choose resume vs. fresh.
  if (resume === 'ask') {
    const d = loadOneShotDraft();
    return (
      <div className="relative min-h-screen bg-zinc-950 px-4 py-10 text-white">
        {BackBar}
        <div className={`mx-auto mt-16 max-w-md rounded-2xl border border-white/10 ${MAT_PLATE} p-6`}>
          <div className="mb-3 flex items-center gap-2 text-[#FFCC00]">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-[10px] font-mono uppercase tracking-widest">// Unfinished ad</span>
          </div>
          <h2 className="text-lg font-black text-white">Resume your draft?</h2>
          <p className="mt-1 text-sm text-zinc-400">
            You have an unfinished ad{d?.brandName ? ` for ${d.brandName}` : ''}{d?.offer ? ` — “${d.offer.slice(0, 60)}${d.offer.length > 60 ? '…' : ''}”` : ''}. Pick up where you left off, or start fresh.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setResume('go')}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFCC00] px-4 py-3 text-sm font-semibold text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]"
            >
              <RotateCw className="h-4 w-4 shrink-0" /> Resume
            </button>
            <button
              type="button"
              onClick={() => { clearOneShotDraft(); setResume('go'); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
            >
              <FilePlus2 className="h-4 w-4 shrink-0" /> Start fresh
            </button>
          </div>
        </div>
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
        onSwitchToExpert={onSwitchToExpert}
        onBack={onBack}
        onCloneVoice={onCloneVoice}
        preferredVertical={preferredVertical}
      />
    </div>
  );
};

export default OneShotAd;
