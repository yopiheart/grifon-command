import React, { useState, useRef } from 'react';
import { Download, RefreshCw, Wand2, Plus, CheckCircle2, AlertTriangle, Lock, Film, ArrowRight, Image as ImageIcon, ImageDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import ImageModal from '../ui/ImageModal';
import { GoldButton } from '../ui/GoldButton';
import { ShimmerButton, SceneReveal } from './motion';
import type { ProductionRun } from '../../services/producerOrchestrator';
import type { LockablePresetId } from '../../types';

/** First Cut edit-preset switcher (Decision 8). AUTO = server rotation (free, all tiers);
 * IMPACT/CLEAN lock a look (Pro+). null = AUTO. */
const PRESETS: { id: LockablePresetId | null; label: string; pro: boolean }[] = [
  { id: 'none', label: 'RAW', pro: false },
  { id: null, label: 'AUTO', pro: false },
  { id: 'impact', label: 'IMPACT', pro: true },
  { id: 'clean', label: 'CLEAN', pro: true },
  { id: 'punch', label: 'PUNCH', pro: true },
  { id: 'bars', label: 'BARS', pro: true },
  { id: 'spotlight', label: 'SPOTLIGHT', pro: true },
];

/** Roadmap #18 — Business "Advanced Editor" cinema-cuts teaser. Ships OFF: when
 * false, zero DOM. The real re-cut surface doesn't exist yet, so day one the CTA
 * opens pricing. Flip to true to preview the locked upsell for Starter/Pro. */
const ADVANCED_EDITOR_TEASER_ENABLED = false;

/** Blurred 9:16 placeholders for the teaser — CSS gradient fills only, no assets. */
const CINEMA_CUT_THUMBS: { label: string; gradient: string }[] = [
  { label: 'Film Burn', gradient: 'from-orange-500/60 via-red-600/40 to-zinc-950' },
  { label: 'Archival', gradient: 'from-amber-200/40 via-yellow-800/30 to-zinc-950' },
  { label: 'Editorial', gradient: 'from-blue-500/40 via-purple-600/30 to-zinc-950' },
];

/** Free "takes" (manual re-rolls of a scene that already worked) per ad before
 * credits kick in. Fixing a FLAGGED scene is always free and never counts. */
const FREE_TAKES = 2;

export const FirstCutScreen: React.FC<{
  run: ProductionRun;
  reshooting: number | null;
  onReshoot: (sceneIdx: number) => void;
  onMakeAnother: () => void;
  /** Re-render the final cut with a chosen preset (null = AUTO). Absent → hide switcher. */
  onChoosePreset?: (id: LockablePresetId | null) => void;
  /** Pro+ unlock for IMPACT/CLEAN + raw export. Locked users get the upsell. */
  proUnlocked?: boolean;
  onUpgrade?: () => void;
  /** True while a preset re-render is assembling. */
  presetBusy?: boolean;
  /** True when the user is already on Business — hides the "Advanced Editor" upsell teaser. */
  isBusinessTier?: boolean;
}> = ({ run, reshooting, onReshoot, onMakeAnother, onChoosePreset, proUnlocked = false, onUpgrade, presetBusy = false, isBusinessTier = false }) => {
  const activePreset = run.presetId ?? null;
  const flagged = run.scenes.filter((s) => s.status === 'flagged').length;
  // Per-run take allowance, lifted into the run (persisted) so free takes survive remount AND
  // reload — ProducerFlow.handleReshoot bumps run.takesUsed for a re-roll of a scene that worked.
  const takesUsed = run.takesUsed ?? 0;
  const [armedIdx, setArmedIdx] = useState<number | null>(null);
  const freeTakesLeft = Math.max(0, FREE_TAKES - takesUsed);
  // Click-to-zoom lightbox (Neil request 2026-08-01, sibling of the gate-screen one).
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const scrollStrip = (dir: -1 | 1) => stripRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="relative mx-auto w-full max-w-3xl">
        <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// REVIEW · RESHOOT · SHIP</p>
        <h1 className="mb-6 text-3xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          Your First Cut
        </h1>

        {/* Hero player */}
        <GlassPanel className="relative overflow-hidden p-3 shadow-[0_0_30px_rgba(255,204,0,0.18)]">
          <div className="osa-land pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-[#FFCC00]/25 to-transparent" />
          {run.finalVideoUrl ? (
            <video src={run.finalVideoUrl} controls autoPlay loop className="aspect-[9/16] max-h-[60vh] w-full rounded-xl bg-zinc-950 object-contain" />
          ) : (
            <div className="flex aspect-[9/16] max-h-[60vh] w-full items-center justify-center rounded-xl bg-zinc-950 text-xs font-mono text-on-surface-sublabel">
              assembling final cut…
            </div>
          )}
        </GlassPanel>

        {/* Status line */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {flagged === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-[#FFCC00]" />
              <span className="text-zinc-300">All scenes landed. Love it? Ship it.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-zinc-300">{flagged} scene{flagged > 1 ? 's' : ''} ready for your call — fix below (free).</span>
            </>
          )}
          <span className="text-on-surface-sublabel">·</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface-sublabel">
            {freeTakesLeft > 0 ? `${freeTakesLeft} free take${freeTakesLeft > 1 ? 's' : ''} left` : 'extra takes use 1 credit'}
          </span>
        </div>

        {run.error?.startsWith('preset:') && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Couldn&apos;t apply that edit style. Your previous cut is still selected. Try again.</span>
          </div>
        )}

        {/* Scene film-strip — arrow affordances because a mouse can't obviously
            scroll a horizontal strip (Neil, 2026-08-01: "wala man lang scroller"). */}
        <div className="relative mt-4">
          <button
            type="button"
            aria-label="Scroll scenes left"
            onClick={() => scrollStrip(-1)}
            className="absolute -left-2 top-[40%] z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-1.5 text-zinc-300 transition-colors hover:border-[#FFCC00]/60 hover:text-[#FFCC00]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll scenes right"
            onClick={() => scrollStrip(1)}
            className="absolute -right-2 top-[40%] z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/70 p-1.5 text-zinc-300 transition-colors hover:border-[#FFCC00]/60 hover:text-[#FFCC00]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        <div ref={stripRef} className="flex snap-x gap-3 overflow-x-auto pb-2">
          {run.scenes.map((sc) => {
            const busy = reshooting === sc.sceneIdx;
            const isFlagged = sc.status === 'flagged';
            const isPaid = !isFlagged && takesUsed >= FREE_TAKES; // free allowance spent → a take costs a credit
            const armed = armedIdx === sc.sceneIdx;
            // Short labels — they live in a 112px-wide film-strip card. The fuller
            // "free takes left / extra takes use 1 credit" context is in the status line.
            const label = busy
              ? 'Working…'
              : isFlagged
                ? 'Fix scene'
                : isPaid
                  ? armed ? 'Confirm?' : 'Take · 1 credit'
                  : 'New take';

            const handleClick = () => {
              if (busy || reshooting !== null) return;
              if (isPaid && !armed) {
                setArmedIdx(sc.sceneIdx); // first tap arms the paid confirm (avoids accidental credit spend)
                return;
              }
              setArmedIdx(null);
              // A "take" on a scene that already worked consumes the allowance; fixing a flagged
              // scene is always free and never counts. The counter now lives on the run and is
              // bumped + persisted in ProducerFlow.handleReshoot (survives remount + reload).
              // TODO(billing): when One-Shot is metered, deduct 1 credit here when isPaid.
              onReshoot(sc.sceneIdx);
            };

            const Icon = isFlagged ? RefreshCw : Wand2;
            return (
              <div
                key={sc.sceneIdx}
                className={`relative w-28 shrink-0 snap-start overflow-hidden rounded-xl border ${
                  isFlagged ? 'border-amber-500/70 animate-pulse' : 'border-white/10'
                }`}
              >
                <div className="aspect-[9/16]">
                  <SceneReveal imageUrl={sc.imageUrl} loading={busy} alt={`Scene ${sc.sceneIdx + 1}`} />
                </div>
                <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                  {sc.sceneIdx + 1}
                </div>
                <button
                  onClick={handleClick}
                  disabled={busy || reshooting !== null}
                  className={`flex min-h-[40px] w-full items-center justify-center gap-1 whitespace-nowrap px-1 py-2 text-[10px] font-mono uppercase tracking-wide transition-colors disabled:opacity-50 ${
                    isFlagged
                      ? 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                      : armed
                        ? 'bg-[#FFCC00]/20 text-[#FFCC00]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-[#FFCC00]'
                  }`}
                >
                  <Icon className={`h-3 w-3 shrink-0 ${busy ? 'animate-spin' : ''}`} /> {label}
                </button>
              </div>
            );
          })}
        </div>
        </div>

        {/* Thumbnail surface (finding #30) — the producer's cover frame, read from run
            state the same way scenes are. Nothing renders when the run has no thumbnail. */}
        {run.thumbnailUrl && (
          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              aria-label="View thumbnail full size"
              onClick={() => setLightbox({ url: run.thumbnailUrl!, name: 'ad-thumbnail.png' })}
              className="relative w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-white/10 p-0 transition-colors hover:border-[#FFCC00]/60"
            >
              <img src={run.thumbnailUrl} alt="Ad thumbnail" className="aspect-[9/16] w-full bg-zinc-950 object-cover" />
              <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-mono text-zinc-300">
                <ImageIcon className="h-3 w-3" />
              </div>
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Thumbnail</p>
              <p className="text-xs text-zinc-400">Your scroll-stopping cover frame — click to view, download below.</p>
            </div>
          </div>
        )}
        {lightbox && <ImageModal imageUrl={lightbox.url} filename={lightbox.name} onClose={() => setLightbox(null)} />}

        {/* Edit-style switcher (Decision 8) — AUTO free/all-tiers; IMPACT/CLEAN Pro+. */}
        {onChoosePreset && (
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => {
                const active = activePreset === p.id;
                const locked = p.pro && !proUnlocked;
                return (
                  <button
                    key={p.label}
                    onClick={() => {
                      if (presetBusy || active) return;
                      if (locked) { onUpgrade?.(); return; }
                      onChoosePreset(p.id);
                    }}
                    disabled={presetBusy}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-[11px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50 ${
                      active ? 'border-[#FFCC00] bg-[#FFCC00]/15 text-[#FFCC00]' : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-[#FFCC00]/50 hover:text-white'
                    }`}
                  >
                    {active && <CheckCircle2 className="h-3 w-3" />}
                    {locked && <Lock className="h-3 w-3" />}
                    {p.label}
                  </button>
                );
              })}
              {presetBusy && <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FFCC00]" />}
            </div>
            {/* Quiet Pro nudge — the "you're not locked in" raw-export lever (Decision 4). */}
            {!proUnlocked && (
              <p className="mt-2 text-[10px] leading-relaxed text-on-surface-sublabel">
                May sariling editor? <span className="text-zinc-400">Kunin mo yung clean scene clips + voiceover + captions — i-edit mo sa paraan mo.</span>{' '}
                <button onClick={onUpgrade} className="font-mono uppercase tracking-widest text-[#FFCC00] hover:underline">[PRO]</button>
              </p>
            )}
          </div>
        )}

        {/* Business "Advanced Editor" cinema-cuts teaser (roadmap #18). Flag-gated OFF →
            zero DOM. Shown to Starter/Pro only; Business gets the real surface later.
            Day one the CTA opens pricing (reuses onUpgrade). */}
        {ADVANCED_EDITOR_TEASER_ENABLED && !isBusinessTier && (
          <GlassPanel className="mt-6 border border-[#FFCC00]/20 bg-[#FFCC00]/[0.06] p-6">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#FFCC00]/30 bg-[#FFCC00]/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
              <Lock className="h-3 w-3" /> Business
            </div>
            <p className="mb-1 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">// Advanced Editor</p>
            <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
              Your ad. Re-cut like a film studio did it.
            </h2>
            <p className="mb-4 max-w-prose text-sm leading-relaxed text-zinc-400">
              Those blurred takes? They&apos;re your scenes — the ad you just made, already re-cut in three cinema styles. Film burn. Archival tape. Editorial color. They&apos;re waiting on the other side of Business.
            </p>

            {/* Three blurred 9:16 cinema-style placeholders (CSS gradients only). */}
            <div className="mb-5 grid max-w-sm grid-cols-3 gap-3">
              {CINEMA_CUT_THUMBS.map((t) => (
                <div key={t.label} className="relative overflow-hidden rounded-xl border border-white/10">
                  <div className={`aspect-[9/16] bg-gradient-to-b ${t.gradient} blur-[3px]`} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="h-4 w-4 text-white/40" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-zinc-950/60 px-1.5 py-1 text-center text-[10px] font-mono uppercase tracking-wide text-zinc-300">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>

            <GoldButton onClick={onUpgrade} className="w-full sm:w-auto">
              <span className="inline-flex items-center gap-2">
                Watch your cinema cuts <ArrowRight className="h-4 w-4 shrink-0" />
              </span>
            </GoldButton>
            <p className="mt-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">
              included in Business · your cut stays untouched
            </p>
          </GlassPanel>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <a href={run.finalDownloadUrl ?? run.finalVideoUrl ?? '#'} download className={run.finalVideoUrl ? '' : 'pointer-events-none'}>
              <ShimmerButton disabled={!run.finalVideoUrl}>
                <span className="inline-flex items-center justify-center gap-2">
                  <Download className="h-4 w-4" /> Download Ad
                </span>
              </ShimmerButton>
            </a>
          </div>
          {run.thumbnailUrl && (
            <a
              href={run.thumbnailUrl}
              download
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-6 py-4 text-sm font-mono uppercase tracking-widest text-zinc-300 hover:border-[#FFCC00] hover:text-white sm:w-auto"
            >
              <ImageDown className="h-4 w-4" /> Download Thumbnail
            </a>
          )}
          <button
            onClick={onMakeAnother}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-6 py-4 text-sm font-mono uppercase tracking-widest text-zinc-300 hover:border-[#FFCC00] hover:text-white sm:w-48"
          >
            <Plus className="h-4 w-4" /> Make Another
          </button>
        </div>
      </div>
    </div>
  );
};
