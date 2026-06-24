import React, { useEffect, useMemo } from 'react';
import { Clapperboard, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { StepShell } from '../ui/StepShell';
import { StepFooter } from '../ui/StepFooter';
import { TitledCard } from '../ui/TitledCard';
import { TextArea } from '../ui/TextField';
import { SegButton } from '../ui/SegButton';
import type { PlanId } from '../../utils/planGate';
import {
  EXPERT_FORMATS, formatsFor, recommendedSceneCount, beatsForCount, validateBeat, totalEstSeconds,
  wordCount, multiPlaceBeat,
  type ExpertFormat, type ExpertFormatId, type ExpertBusinessType, type TargetDurationSec,
} from '../../utils/scriptGuardrails';

// ===========================================================================
// Expert Mode — Script Studio (slice 4). Pick a proven format (or Custom) + a
// target length → exactly N hard-capped beat boxes (N ≤ plan cap). Each box
// blocks typing past its word cap and shows a live seconds meter; a budget bar
// totals vs the target. The boxes assemble into script[] (order preserved) for
// the existing generateStoryboard. PRESENTATIONAL — owns no global state.
// ===========================================================================

const TARGETS: TargetDurationSec[] = [15, 20, 30];

export const ScriptStudio: React.FC<{
  businessType: ExpertBusinessType;
  plan: PlanId;
  formatId: ExpertFormatId | null;
  setFormatId: (id: ExpertFormatId) => void;
  target: TargetDurationSec;
  setTarget: (t: TargetDurationSec) => void;
  lines: string[];
  setLines: React.Dispatch<React.SetStateAction<string[]>>;
  onBack: () => void;
  onNext: () => void;
}> = ({ businessType, plan, formatId, setFormatId, target, setTarget, lines, setLines, onBack, onNext }) => {
  const formats = useMemo(() => formatsFor(businessType), [businessType]);
  const format: ExpertFormat | undefined =
    EXPERT_FORMATS.find((f) => f.id === formatId) ?? formats[0];

  const sceneCount = recommendedSceneCount(target, plan);
  const beats = useMemo(
    () => (format ? beatsForCount(format, sceneCount) : []),
    [format, sceneCount],
  );

  // Keep the lines array length in lock-step with the beat count (preserve content by index).
  useEffect(() => {
    setLines((prev) => {
      if (prev.length === beats.length) return prev;
      const next = beats.map((_, i) => prev[i] ?? '');
      return next;
    });
  }, [beats.length, setLines]);

  // Default the format selection to the first available for this business type.
  useEffect(() => {
    if (!formatId && format) setFormatId(format.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format?.id]);

  const setLine = (i: number, value: string, wordCap: number) => {
    setLines((prev) => {
      const cur = prev[i] ?? '';
      // Hard cap: reject growth past the word cap; always allow shrinking (edits/deletes).
      if (value.length > cur.length && wordCount(value) > wordCap) return prev;
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const totalSec = totalEstSeconds(lines);
  const overBudget = totalSec > target + 3; // small grace before flagging
  const filled = lines.filter((l) => l.trim().length > 0).length;
  const ready = sceneCount > 0 && filled === beats.length;

  return (
    <StepShell
      sublabel="DIRECTOR'S CUT · SCRIPT STUDIO"
      title={<>Write Your Script</>}
      panelClassName="max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-5">
        <TitledCard title="FORMAT">
          <div className="grid gap-3 sm:grid-cols-2">
            {formats.map((f) => {
              const active = format?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormatId(f.id)}
                  className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${
                    active
                      ? 'border-[#FFCC00] bg-[#FFCC00]/10'
                      : 'border-white/10 bg-zinc-950 hover:border-white/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${active ? 'text-[#FFCC00]' : 'text-white'}`}>{f.name}</span>
                    <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      <Clapperboard className="h-3 w-3 shrink-0" /> {f.pacing}
                    </span>
                  </div>
                  <span className="text-xs leading-relaxed text-zinc-400">{f.strategy}</span>
                </button>
              );
            })}
          </div>
        </TitledCard>

        <TitledCard
          title="TARGET LENGTH"
          right={
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              {sceneCount} scene{sceneCount === 1 ? '' : 's'} · plan cap
            </span>
          }
        >
          <SegButton<string>
            value={String(target)}
            onChange={(v) => setTarget(Number(v) as TargetDurationSec)}
            options={TARGETS.map((t) => ({ value: String(t), label: `${t}s` }))}
          />
          {sceneCount === 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-amber-500/80">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Your plan renders no video. Upgrade to write an ad.
            </p>
          )}
        </TitledCard>

        {sceneCount > 0 && (
          <TitledCard
            title="SCENES"
            right={
              <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest ${overBudget ? 'text-amber-500' : 'text-zinc-500'}`}>
                <Clock className="h-3 w-3 shrink-0" /> ~{totalSec.toFixed(1)}s / {target}s
              </span>
            }
          >
            <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
              One beat renders <span className="text-zinc-300">one shot</span> — keep each box to a single
              place or moment. Naming several places in one beat shows only one of them.
            </p>
            <div className="flex flex-col gap-4">
              {beats.map((b, i) => {
                const v = validateBeat(lines[i] ?? '', b);
                const multiPlace = multiPlaceBeat(lines[i] ?? '');
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                        {i + 1}. {b.label}
                      </span>
                      <span className={`text-[10px] font-mono ${v.overWordCap || v.overSentenceCap ? 'text-amber-500' : 'text-zinc-500'}`}>
                        {v.wordCount}/{b.wordCap}w · ~{v.estSeconds.toFixed(1)}s
                      </span>
                    </div>
                    <TextArea
                      rows={2}
                      placeholder={b.hint}
                      value={lines[i] ?? ''}
                      onChange={(e) => setLine(i, e.target.value, b.wordCap)}
                      invalid={v.overSentenceCap}
                    />
                    {v.overSentenceCap && (
                      <span className="text-[10px] text-amber-500/80">Keep the hook to {b.sentenceCap} sentence{b.sentenceCap === 1 ? '' : 's'}.</span>
                    )}
                    {multiPlace && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500/80">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        Lists several places — one scene renders one image. Split it or name the hero shot.
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
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
