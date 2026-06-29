import React, { useEffect, useMemo } from 'react';
import { Clock, AlertTriangle, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { StepShell } from '../ui/StepShell';
import { StepFooter } from '../ui/StepFooter';
import { TitledCard } from '../ui/TitledCard';
import { TextArea } from '../ui/TextField';
import { SegButton } from '../ui/SegButton';
import { SCENE_CAP, type PlanId } from '../../utils/planGate';
import {
  customBeats, validateBeat, totalEstSeconds, multiPlaceBeat, recommendedSceneCount,
  type TargetDurationSec,
} from '../../utils/scriptGuardrails';

// ===========================================================================
// Concierge — Script Studio (free-form, Slice 2). No format card: the expert
// brings their own structure. Add/remove scene boxes (1…plan SCENE_CAP), each a
// generic beat (Hook → Scene N → CTA via customBeats). Word caps are SOFT — typing
// is never blocked; the live seconds meter + an amber advisory do the nudging. A
// budget bar totals vs the target length. The boxes assemble into script[] (order
// preserved) for the existing generateStoryboard. PRESENTATIONAL — owns no global state.
// ===========================================================================

const TARGETS: TargetDurationSec[] = [15, 20, 30];

export const ScriptStudio: React.FC<{
  plan: PlanId;
  target: TargetDurationSec;
  setTarget: (t: TargetDurationSec) => void;
  lines: string[];
  setLines: React.Dispatch<React.SetStateAction<string[]>>;
  onBack: () => void;
  onNext: () => void;
}> = ({ plan, target, setTarget, lines, setLines, onBack, onNext }) => {
  const maxScenes = SCENE_CAP[plan];

  // Seed the editor with a sensible starting scene count the FIRST time only (lines
  // are lifted in the parent, so they survive back/forward navigation).
  useEffect(() => {
    setLines((prev) => {
      if (prev.length > 0) return prev;
      const seed = Math.min(recommendedSceneCount(target, plan) || 1, maxScenes);
      return Array.from({ length: Math.max(1, seed) }, () => '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beats = useMemo(() => customBeats(lines.length), [lines.length]);

  // Soft caps — accept any input; the meter + amber advisories nudge, never block.
  const setLine = (i: number, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const addScene = () => setLines((prev) => (prev.length >= maxScenes ? prev : [...prev, '']));
  const removeScene = (i: number) =>
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const totalSec = totalEstSeconds(lines);
  const overBudget = totalSec > target + 3; // small grace before flagging
  const filled = lines.filter((l) => l.trim().length > 0).length;
  const ready = lines.length > 0 && filled === lines.length;
  const atCap = lines.length >= maxScenes;
  const noRender = maxScenes <= 0;

  return (
    <StepShell
      sublabel="DIRECTOR'S CUT · SCRIPT STUDIO"
      title={<>Write Your Script</>}
      panelClassName="max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-5">
        <TitledCard
          title="TARGET LENGTH"
          right={
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              {lines.length} scene{lines.length === 1 ? '' : 's'} · cap {maxScenes}
            </span>
          }
        >
          <SegButton<string>
            value={String(target)}
            onChange={(v) => setTarget(Number(v) as TargetDurationSec)}
            options={TARGETS.map((t) => ({ value: String(t), label: `${t}s` }))}
          />
          {noRender && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-500/80">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Your plan renders no video. Upgrade to write an ad.
            </p>
          )}
        </TitledCard>

        {!noRender && (
          <TitledCard
            title="SCENES"
            right={
              <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest ${overBudget ? 'text-amber-500' : 'text-zinc-500'}`}>
                <Clock className="h-3 w-3 shrink-0" /> ~{totalSec.toFixed(1)}s / {target}s
              </span>
            }
          >
            <p className="mb-4 text-[11px] leading-relaxed text-zinc-400">
              One scene renders <span className="text-zinc-300">one shot</span> — keep each box to a single
              place or moment. Caps are a guide, not a wall; the meter flags long lines.
            </p>
            <div className="flex flex-col gap-4">
              {beats.map((b, i) => {
                const v = validateBeat(lines[i] ?? '', b);
                const multiPlace = multiPlaceBeat(lines[i] ?? '');
                const over = v.overWordCap || v.overSentenceCap;
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                        {i + 1}. {b.label}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-[10px] font-mono ${over ? 'text-amber-500' : 'text-zinc-500'}`}>
                          {v.wordCount}/{b.wordCap}w · ~{v.estSeconds.toFixed(1)}s
                        </span>
                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeScene(i)}
                            aria-label={`Remove scene ${i + 1}`}
                            className="-my-3 -mr-3 flex min-h-11 min-w-11 items-center justify-center text-zinc-600 hover:text-white transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        )}
                      </div>
                    </div>
                    <TextArea
                      rows={2}
                      placeholder={b.hint}
                      value={lines[i] ?? ''}
                      onChange={(e) => setLine(i, e.target.value)}
                      invalid={v.overSentenceCap}
                    />
                    {v.overWordCap && (
                      <span className="flex items-center gap-1.5 text-[10px] text-amber-500/80">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Long for one shot — aim for ≤{b.wordCap} words so it paces clean.
                      </span>
                    )}
                    {v.overSentenceCap && (
                      <span className="text-[10px] text-amber-500/80">Keep the hook to {b.sentenceCap} sentence{b.sentenceCap === 1 ? '' : 's'}.</span>
                    )}
                    {multiPlace && (
                      <span className="flex items-center gap-1.5 text-[10px] text-amber-500/80">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Lists several places — one scene renders one image. Split it or name the hero shot.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addScene}
              disabled={atCap}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-300 transition-colors hover:border-[#FFCC00]/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-zinc-300"
            >
              <Plus className="h-4 w-4 shrink-0" /> Add scene
            </button>
            {atCap && (
              <p className="mt-2 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                Plan cap reached ({maxScenes} scenes)
              </p>
            )}
          </TitledCard>
        )}
      </div>

      <StepFooter
        onBack={onBack}
        backLabel="BACK"
        onNext={onNext}
        nextDisabled={!ready}
        nextLabel="DIRECT THE SCENES"
        nextIcon={<ArrowRight className="h-4 w-4" />}
      />
    </StepShell>
  );
};

export default ScriptStudio;
