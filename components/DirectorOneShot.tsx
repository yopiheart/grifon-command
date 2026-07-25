import React, { useState } from 'react';
import { Sparkles, Loader2, Check, X, Circle, ArrowRight, AlertTriangle, Settings2, RotateCw, Lock } from 'lucide-react';
import type { ClientDetails, BusinessInfo } from '../types';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import { useOneShotGeneration, type OneShotSinks, type OneShotStage } from '../hooks/useOneShotGeneration';
import { MAT_PLATE } from './ui/materialTokens';

/**
 * One-shot Director surface — the DEFAULT view of the Director AI module.
 * Takes the (research-prefilled) brief held in App.tsx and produces a complete
 * ad plan in one click, writing through the same wizard state the 8-step flow
 * uses. The step-by-step wizard is preserved as "Director mode" (advanced).
 */

interface DirectorOneShotProps {
  clientDetails: ClientDetails;
  businessInfo: BusinessInfo;
  aspectRatio: '9:16' | '16:9' | null;
  setAspectRatio: (r: '9:16' | '16:9') => void;
  language: 'English' | 'Taglish' | null;
  sinks: OneShotSinks;
  /** Pro+ unlock for Director (step-by-step) mode. Free/Starter get the upsell. */
  directorUnlocked: boolean;
  /** Route to pricing when a locked user reaches for Director mode. */
  onUpgrade: () => void;
  /** Advanced step-by-step wizard (also the place to set up a brief manually). */
  onSwitchToSteps: () => void;
  /** After a successful run → Step 8 review + video hand-off. */
  onReview: () => void;
}

const STAGE_ICON: Record<OneShotStage['status'], React.ReactNode> = {
  pending: <Circle className="w-4 h-4 text-on-surface-sublabel" />,
  running: <Loader2 className="w-4 h-4 text-[#FFCC00] animate-spin" />,
  done: <Check className="w-4 h-4 text-[#FFCC00]" />,
  error: <X className="w-4 h-4 text-red-400" />,
  skipped: <Circle className="w-4 h-4 text-on-surface-sublabel" />,
};

const BriefRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">{label}</span>
    <span className={`text-sm ${value ? 'text-zinc-200' : 'text-on-surface-sublabel italic'}`}>{value || 'Not set'}</span>
  </div>
);

const Toggle: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors border ${
      active
        ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]'
        : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]/50'
    }`}
  >
    {children}
  </button>
);

const DirectorOneShot: React.FC<DirectorOneShotProps> = ({
  clientDetails,
  businessInfo,
  aspectRatio,
  setAspectRatio,
  language,
  sinks,
  directorUnlocked,
  onUpgrade,
  onSwitchToSteps,
  onReview,
}) => {
  const oneShot = useOneShotGeneration();
  const [lang, setLang] = useState<'English' | 'Taglish'>(language ?? 'Taglish');
  const ratio = aspectRatio ?? '9:16';

  const ready = !!clientDetails.brandName && !!clientDetails.offer && !!businessInfo.product && !!businessInfo.audience;

  const handleGenerate = () => {
    if (!ready) return;
    setAspectRatio(ratio); // persist the chosen ratio into wizard state for the hand-off
    void oneShot.run({ clientDetails, businessInfo, language: lang, aspectRatio: ratio }, sinks);
  };

  // ── Progress / result view ────────────────────────────────────────────────
  if (oneShot.running || oneShot.done || oneShot.error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">
            {oneShot.error ? 'Generation hit a snag' : oneShot.done ? 'Your ad plan is ready' : 'Building your ad…'}
          </h2>
          <p className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest mt-1">
            {clientDetails.brandName} {clientDetails.offer ? `· ${clientDetails.offer}` : ''}
          </p>
        </div>

        <GlassPanel className="p-5">
          <ul className="space-y-3">
            {oneShot.stages.map(stage => (
              <li key={stage.id} className="flex items-center gap-3">
                <span className="shrink-0">{STAGE_ICON[stage.status]}</span>
                <span className={`text-sm flex-1 ${stage.status === 'pending' || stage.status === 'skipped' ? 'text-on-surface-sublabel' : 'text-zinc-200'}`}>
                  {stage.label}
                </span>
                {stage.detail && (
                  <span className={`text-[10px] font-mono uppercase tracking-widest ${stage.status === 'error' ? 'text-red-400' : 'text-on-surface-sublabel'}`}>
                    {stage.detail}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </GlassPanel>

        {oneShot.error && (
          <div className={`${MAT_PLATE} border border-red-500/30 rounded-xl p-4 flex items-start gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-xs text-zinc-300">{oneShot.error}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {oneShot.done && (
            <GoldButton onClick={onReview} className="flex items-center justify-center gap-2">
              Review &amp; make video <ArrowRight className="w-4 h-4" />
            </GoldButton>
          )}
          {!oneShot.running && (
            <button
              onClick={oneShot.reset}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-zinc-400 bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/50 transition-colors"
            >
              <RotateCw className="w-4 h-4" /> {oneShot.error ? 'Try again' : 'Start over'}
            </button>
          )}
          {oneShot.done && directorUnlocked && (
            <button
              onClick={onSwitchToSteps}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-zinc-400 bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/50 transition-colors"
            >
              <Settings2 className="w-4 h-4" /> Fine-tune in Director mode
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Brief / launch view ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#FFCC00]" /> One-shot ad
        </h2>
        <p className="text-sm text-zinc-400 mt-1">
          We&apos;ll write the script, cast a spokesperson, storyboard it, render the scenes and design a thumbnail — all from your brief. One click.
        </p>
      </div>

      <GlassPanel className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">// YOUR_BRIEF</span>
          {directorUnlocked && (
            <button onClick={onSwitchToSteps} className="text-[10px] text-[#FFCC00] font-mono uppercase tracking-widest hover:underline">
              Edit
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BriefRow label="Brand" value={clientDetails.brandName} />
          <BriefRow label="Offer" value={clientDetails.offer} />
          <BriefRow label="Product" value={businessInfo.product} />
          <BriefRow label="Audience" value={businessInfo.audience} />
        </div>
      </GlassPanel>

      {!ready && (
        <div className={`${MAT_PLATE} border border-[#FFCC00]/30 rounded-xl p-4 flex items-start gap-3`}>
          <AlertTriangle className="w-5 h-5 text-[#FFCC00] mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Finish your brief first</h3>
            <p className="text-xs text-zinc-400">
              Brand, offer, product and audience are required. Run Market Research to auto-fill them{directorUnlocked ? ', or set them up in Director mode.' : '.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="space-y-2">
          <span className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">// FORMAT</span>
          <div className="flex gap-2">
            <Toggle active={ratio === '9:16'} onClick={() => setAspectRatio('9:16')}>9:16</Toggle>
            <Toggle active={ratio === '16:9'} onClick={() => setAspectRatio('16:9')}>16:9</Toggle>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-widest">// LANGUAGE</span>
          <div className="flex gap-2">
            <Toggle active={lang === 'Taglish'} onClick={() => setLang('Taglish')}>Taglish</Toggle>
            <Toggle active={lang === 'English'} onClick={() => setLang('English')}>English</Toggle>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
        <GoldButton onClick={handleGenerate} disabled={!ready} className="flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none disabled:hover:scale-100">
          <Sparkles className="w-4 h-4" /> Generate my ad
        </GoldButton>
        {directorUnlocked ? (
          <button
            onClick={onSwitchToSteps}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-zinc-400 bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/50 transition-colors"
          >
            <Settings2 className="w-4 h-4" /> Control every scene — Director mode
          </button>
        ) : (
          <button
            onClick={onUpgrade}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide text-zinc-400 bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/50 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" /> Control every scene — <span className="text-[#FFCC00]">Pro</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default DirectorOneShot;
