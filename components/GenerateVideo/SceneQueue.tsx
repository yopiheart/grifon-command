import React from 'react';
import { CheckCircle2, RotateCw, AlertTriangle, Clock, Check } from 'lucide-react';
import type { SceneStatus } from './RenderAllRunner';
import type { VideoPrompt, Scene, VideoModelType } from '../../types';
import { VIDEO_MODEL_ROUTING, VIDEO_MODEL_SPECS } from '../../services/geminiService';

export interface SceneQueueProps {
  seedPrompts: VideoPrompt[];
  storyboard: Scene[];
  activeIdx: number;
  status: SceneStatus[];
  elapsed: Record<number, number>;
  onSelect: (idx: number) => void;
  /** Scene indices that already have at least one persisted library render. */
  renderedSceneIdxs?: Set<number>;
  /** Session B — per-scene engine surfaced as a VEO/KLING chip. Computed by the
   * parent via autoRouteModelForType so the rail shows where each scene WOULD
   * render if the user clicks RENDER ALL right now. */
  perSceneModels?: VideoModelType[];
}

const statusLabel = (s: SceneStatus): string => {
  switch (s) {
    case 'ready': return 'READY';
    case 'queued': return 'QUEUED';
    case 'rendering': return 'RENDERING';
    case 'done': return 'DONE';
    case 'failed': return 'FAILED';
  }
};

const StatusBadge: React.FC<{ status: SceneStatus; elapsed?: number }> = ({ status, elapsed }) => {
  // Phase 4h.3 — bold 2px borders + opaque-ish bg + white text on done/failed
  // for legibility against the thumbnail. Gold variants keep gold text (the
  // brand accent reads cleanly on the dark thumb tint). Bumped to text-[9px].
  // top-2 right-2 + z-10 (Phase 4g.3) avoids clipping by active-chip ring.
  const baseClasses = 'absolute top-2 right-2 z-10 text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 flex items-center gap-1 whitespace-nowrap';
  switch (status) {
    case 'ready':
      return null;
    case 'queued':
      return (
        <div className={`${baseClasses} bg-zinc-950/80 border-2 border-[#FFCC00]/60 text-[#FFCC00]`}>
          <Clock className="w-2.5 h-2.5" /> QUEUED
        </div>
      );
    case 'rendering':
      return (
        <div className={`${baseClasses} bg-zinc-950/80 border-2 border-[#FFCC00] text-[#FFCC00] animate-pulse`}>
          <RotateCw className="w-2.5 h-2.5 animate-spin" /> {elapsed ? `${elapsed}s` : 'RENDER'}
        </div>
      );
    case 'done':
      return (
        <div className={`${baseClasses} bg-green-500/40 border-2 border-green-500 text-white shadow-[0_0_8px_rgba(34,197,94,0.4)]`}>
          <CheckCircle2 className="w-2.5 h-2.5" /> DONE
        </div>
      );
    case 'failed':
      return (
        <div className={`${baseClasses} bg-red-500/40 border-2 border-red-500 text-white`}>
          <AlertTriangle className="w-2.5 h-2.5" /> FAIL
        </div>
      );
  }
};

const EngineChip: React.FC<{ model?: VideoModelType }> = ({ model }) => {
  if (!model) return null;
  const apiSurface = VIDEO_MODEL_ROUTING[model]?.apiSurface;
  const displayName = VIDEO_MODEL_SPECS[model]?.displayName ?? model;
  if (apiSurface === 'kling-image2video' || apiSurface === 'kling-omni-video') {
    return (
      <span
        className="text-[7px] font-black font-mono uppercase tracking-widest rounded px-1 py-px border border-[#FFCC00]/50 bg-[#FFCC00]/10 text-[#FFCC00]"
        title={`Routed to ${displayName}`}
      >
        KLING
      </span>
    );
  }
  return (
    <span
      className="text-[7px] font-black font-mono uppercase tracking-widest rounded px-1 py-px border border-white/15 bg-zinc-950 text-zinc-400"
      title={`Routed to ${displayName}`}
    >
      VEO
    </span>
  );
};

export const SceneQueue: React.FC<SceneQueueProps> = ({
  seedPrompts,
  storyboard,
  activeIdx,
  status,
  elapsed,
  onSelect,
  renderedSceneIdxs,
  perSceneModels,
}) => (
  <div className="flex lg:flex-col gap-2 lg:gap-3 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0 custom-scrollbar">
    {seedPrompts.map((p, i) => {
      const thumb = storyboard[i]?.imageUrl ?? storyboard[i]?.manualUploadUrl;
      const sceneStatus: SceneStatus = status[i] ?? 'ready';
      const isActive = i === activeIdx;
      const isRendering = sceneStatus === 'rendering';
      const isDone = sceneStatus === 'done';
      const isFailed = sceneStatus === 'failed';

      const borderColor = isFailed
        ? 'border-red-500/40'
        : isDone
        ? 'border-green-500/40'
        : isRendering
        ? 'border-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.3)] animate-pulse'
        : isActive
        ? 'border-[#FFCC00] bg-[#FFCC00]/5 ring-1 ring-[#FFCC00]/50 shadow-[0_0_15px_rgba(255,204,0,0.3)]'
        : 'border-white/10 hover:border-white/30';

      return (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={`relative shrink-0 w-32 sm:w-36 lg:w-full text-left rounded-xl border transition-all overflow-hidden bg-zinc-950 ${borderColor}`}
          title={p.prompt}
        >
          <div className="aspect-video w-full bg-zinc-950 relative">
            {thumb ? (
              <img src={thumb} alt={`Scene ${i + 1} thumbnail`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-700 text-[9px] font-mono uppercase tracking-widest">
                NO THUMB
              </div>
            )}
            <StatusBadge status={sceneStatus} elapsed={elapsed[i]} />
          </div>
          <div className="p-2 sm:p-3 space-y-0.5">
            <div className="text-[9px] font-black text-[#FFCC00] uppercase tracking-widest flex items-center gap-1">
              SCENE {String(i + 1).padStart(2, '0')}
              {renderedSceneIdxs?.has(i) && (
                <Check className="w-2.5 h-2.5" aria-label="Already in library" />
              )}
              <EngineChip model={perSceneModels?.[i]} />
            </div>
            <div className="text-[9px] text-zinc-400 line-clamp-2 font-mono leading-snug">
              {p.scriptLine || p.prompt.slice(0, 60)}
            </div>
            <div className="text-[7px] text-zinc-600 uppercase tracking-widest font-mono pt-1">
              {statusLabel(sceneStatus)}
            </div>
          </div>
        </button>
      );
    })}
  </div>
);
