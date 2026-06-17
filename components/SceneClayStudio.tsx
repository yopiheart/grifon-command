import React, { useState, useRef } from 'react';
import { generateSceneImage, executeStudioCommand } from '../services/geminiService';
import GeneratedFrameTile from './ui/GeneratedFrameTile';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Layers, Check, RefreshCw, Wand2, X, Sparkles } from 'lucide-react';

/**
 * Per-scene "clay" studio for the storyboard. Lets a client reshoot ONE scene
 * they dislike without redoing the ad — divergence (3 takes) → convergence
 * (pick one) → molding (refine on top).
 *
 * Continuity is the whole point: divergence calls generateSceneImage with the
 * SAME scene prompt + SAME identity references and only varies variationIndex
 * (which maps to a camera angle in geminiService) — so the avatar/product stay
 * locked and only the framing changes. REFINE uses executeStudioCommand in
 * pixel-lock Studio Mode on the current image, so tweaks mold the existing
 * frame rather than inventing a new one. The scriptLine, scene order, and
 * chainRole live in Step5Storyboard and are never touched here.
 *
 * Scope guard: the caller only mounts this for SIMPLE single-frame scenes
 * (no hook-morph start/end pair, no cinematic chainRole) — those keep their
 * existing regenerate button.
 */

const VARIATION_COUNT = 3;

interface SceneClayStudioProps {
  sceneLabel: string;
  scenePrompt: string;
  currentImageUrl?: string;
  aspectRatio: '9:16' | '16:9';
  references: { avatarUrl?: string; productUrl?: string };
  referenceImageMode: 'avatar' | 'product' | 'both' | 'none';
  ethnicity: string;
  brandColors: string[];
  scriptType: string;
  productDesc: string;
  onCommit: (imageUrl: string) => void;
  onClose: () => void;
}

type ClayMode = 'idle' | 'diverging' | 'variants' | 'refining';

const SceneClayStudio: React.FC<SceneClayStudioProps> = ({
  sceneLabel,
  scenePrompt,
  currentImageUrl,
  aspectRatio,
  references,
  referenceImageMode,
  ethnicity,
  brandColors,
  scriptType,
  productDesc,
  onCommit,
  onClose,
}) => {
  const [working, setWorking] = useState<string | null>(currentImageUrl ?? null);
  const [variants, setVariants] = useState<(string | null)[]>([]);
  const [mode, setMode] = useState<ClayMode>('idle');
  const [rerollIndex, setRerollIndex] = useState<number | null>(null);
  const [refineText, setRefineText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Advancing seed → distinct camera angles per take (variationIndex maps to an
  // angle in generateSceneImage). Bumped on every explore/reroll so no two takes
  // land on the same framing.
  const seedRef = useRef(1);

  const aspectClass = aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-[16/9]';

  const synthOne = (variationIndex: number) =>
    generateSceneImage(
      scenePrompt,
      aspectRatio,
      '1K',
      references,
      ethnicity,
      brandColors,
      scriptType,
      productDesc,
      undefined,
      variationIndex,
      referenceImageMode,
    );

  // Divergence: flesh out the space with N takes of the SAME locked scene.
  const onExplore = async () => {
    if (!scenePrompt) return;
    setMode('diverging');
    setError(null);
    const seeds = Array.from({ length: VARIATION_COUNT }, (_, i) => seedRef.current + i);
    seedRef.current += VARIATION_COUNT;
    try {
      const settled = await Promise.allSettled(seeds.map(synthOne));
      const results = settled.map(s => (s.status === 'fulfilled' ? s.value : null));
      // Keep the survivors and let RE-ROLL recover empty slots — a single failed
      // take must not nuke the whole quota spend. Only bail if all failed.
      if (results.every(r => r === null)) {
        setError('SYSTEM_ERROR: DIVERGENCE_FAILED');
        setMode('idle');
        return;
      }
      setVariants(results);
      setMode('variants');
    } catch {
      setError('SYSTEM_ERROR: DIVERGENCE_FAILED');
      setMode('idle');
    }
  };

  const rerollVariant = async (idx: number) => {
    setRerollIndex(idx);
    setError(null);
    const seed = seedRef.current;
    seedRef.current += 1;
    try {
      const next = await synthOne(seed);
      setVariants(prev => prev.map((v, i) => (i === idx ? next : v)));
    } catch {
      setError('SYSTEM_ERROR: RE-ROLL_FAILED');
    } finally {
      setRerollIndex(null);
    }
  };

  // Convergence: prune to the chosen take. It becomes the working clay so REFINE
  // can mold from here.
  const selectVariant = (url: string) => {
    setWorking(url);
    setVariants([]);
    setMode('idle');
  };

  // Molding: refine the working image in pixel-lock Studio Mode (identity held).
  const onRefine = async () => {
    if (!working || !refineText.trim()) return;
    setMode('refining');
    setError(null);
    try {
      const next = await executeStudioCommand(refineText.trim(), [working], aspectRatio, ethnicity);
      setWorking(next);
      setRefineText('');
      setMode('idle');
    } catch {
      setError('SYSTEM_ERROR: REFINE_FAILED');
      setMode('idle');
    }
  };

  const busy = mode === 'diverging' || mode === 'refining';
  const committable = !!working && working !== currentImageUrl;

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-950/95 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 text-[#FFCC00] shrink-0" />
          <span className="text-[10px] md:text-xs font-mono text-[#FFCC00] uppercase tracking-[0.2em] truncate">
            // CLAY_STUDIO : {sceneLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          <X className="w-4 h-4" /> CLOSE
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {mode === 'variants' ? (
          /* Divergence field */
          <div className="w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] md:text-xs font-mono text-[#FFCC00] uppercase tracking-[0.2em]">
                // DIVERGENCE_FIELD : SELECT_TO_CONVERGE
              </span>
              <button
                onClick={() => setMode('idle')}
                className="text-[10px] text-zinc-500 uppercase hover:text-white underline font-mono tracking-widest"
              >
                &larr; BACK
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {variants.map((v, idx) => (
                <GeneratedFrameTile
                  key={idx}
                  imageUrl={v}
                  busy={rerollIndex === idx}
                  className={aspectClass}
                  label={`0${idx + 1}`}
                  actions={v ? [
                    { icon: Check, label: 'SELECT', primary: true, onClick: () => selectVariant(v) },
                    { icon: RefreshCw, label: 'RE-ROLL', onClick: () => rerollVariant(idx), busy: rerollIndex === idx },
                  ] : []}
                  emptyState={v === null && rerollIndex !== idx ? (
                    <button
                      onClick={() => rerollVariant(idx)}
                      className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-[#FFCC00] transition-colors"
                    >
                      <RefreshCw className="w-6 h-6" />
                      <span className="text-[10px] font-mono uppercase tracking-widest">TAKE_FAILED &middot; RE-ROLL</span>
                    </button>
                  ) : undefined}
                />
              ))}
            </div>
          </div>
        ) : busy ? (
          /* Working spinner */
          <div className="h-full flex flex-col items-center justify-center gap-10">
            <div className="relative">
              <div className="w-32 h-32 md:w-44 md:h-44 border border-[#FFCC00]/20 animate-spin-slow rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-10 h-10 md:w-14 md:h-14 text-[#FFCC00] animate-pulse" />
              </div>
            </div>
            <Loader message={mode === 'diverging' ? 'EXPLORING_POSSIBILITY_SPACE..' : 'MOLDING_THE_CLAY..'} />
          </div>
        ) : (
          /* Working preview */
          <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
            <div className={`w-full ${aspectClass} max-h-[48vh] overflow-hidden border border-white/10 rounded-2xl bg-zinc-900 shadow-xl`}>
              {working ? (
                <img src={working} alt={sceneLabel} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-mono uppercase tracking-widest">
                  NO_FRAME_YET
                </div>
              )}
            </div>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase text-center">
              // {working ? 'CURRENT_TAKE' : 'EXPLORE TO SYNTHESIZE TAKES'}
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-center mt-6 font-mono text-sm">{error}</p>
        )}
      </div>

      {/* Action bar */}
      {mode !== 'variants' && (
        <div className="shrink-0 border-t border-white/10 pt-5 mt-4 max-w-3xl mx-auto w-full space-y-4">
          {/* Refine row */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={refineText}
              onChange={e => setRefineText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onRefine(); }}
              disabled={!working || busy}
              placeholder={working ? 'Refine this take (e.g. warmer lighting, tighter crop)…' : 'Explore takes first…'}
              className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-300 font-mono focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] outline-none disabled:opacity-40"
            />
            <button
              onClick={onRefine}
              disabled={!working || !refineText.trim() || busy}
              className="px-5 py-3 text-[10px] md:text-xs flex items-center gap-2 rounded-xl font-mono tracking-widest uppercase bg-zinc-950 border border-white/10 text-zinc-300 hover:border-[#FFCC00] hover:text-[#FFCC00] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Wand2 className="w-4 h-4" /> REFINE
            </button>
          </div>

          {/* Primary actions */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onExplore}
              disabled={busy}
              title={`Synthesize ${VARIATION_COUNT} takes to compare`}
              className="px-5 py-4 text-[10px] md:text-xs flex items-center gap-2 rounded-xl font-mono tracking-widest uppercase bg-zinc-950 border border-white/10 text-zinc-300 hover:border-[#FFCC00] hover:text-[#FFCC00] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Layers className="w-4 h-4" /> EXPLORE {VARIATION_COUNT}&times;
            </button>
            <GoldButton
              onClick={() => working && onCommit(working)}
              disabled={!committable || busy}
              className="px-8 md:px-10 py-4 text-xs md:text-sm flex items-center gap-3 rounded-xl font-mono tracking-widest"
            >
              <Check className="w-4 h-4 md:w-5 md:h-5" /> USE THIS TAKE
            </GoldButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneClayStudio;
