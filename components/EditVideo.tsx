
import React, { useEffect, useState } from 'react';
import {
  VideoEditInput, EditDecisionList, SceneBatchEntry, EditTargetPlatform,
  ConsolidationScene, FinalRenderScene, FinalRenderResult, VoiceLibrary, StabilityMode,
} from '../types';
import { generateVideoEditPlan, generateEditDecisionList } from '../services/geminiService';
import { fetchVoices } from '../services/voiceService';
import { consolidateVoices } from '../services/voiceConsolidationService';
import { renderFinalVideo } from '../services/finalRenderService';
import { estimateSpokenSec } from '../utils/spokenDuration';
import { RECOMMENDED_VOICE_IDS } from './SignalModulator/pinoyReady';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, UploadCloud, Image as ImageIcon, Trash2, Download, Scissors, Sparkles, Mic, Clapperboard, CheckSquare, Square } from 'lucide-react';
import saveAs from 'file-saver';

export interface EditorBatchPayload {
  sceneBatch: SceneBatchEntry[];
  audioOverlays: { sceneIdx: number; audioUrl: string }[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  finalScript: string;
}

interface EditVideoProps {
  onBack: () => void;
  editorBatch?: EditorBatchPayload | null;
}

const aspectRatioToPlatform = (ar: '9:16' | '16:9' | '1:1'): EditTargetPlatform => {
  if (ar === '16:9') return 'youtube';
  if (ar === '1:1') return 'reels';
  return 'tiktok';
};

const formatSec = (s: number): string => {
  const m = Math.floor(s / 60);
  const r = (s - m * 60).toFixed(1);
  return `${m}:${r.padStart(4, '0')}`;
};

const BatchEditMode: React.FC<{
  editorBatch: EditorBatchPayload;
  onBack: () => void;
}> = ({ editorBatch, onBack }) => {
  const [edl, setEdl] = useState<EditDecisionList | null>(null);
  const [isPlanning, setIsPlanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsPlanning(true);
    setError(null);
    generateEditDecisionList({
      sceneBatch: editorBatch.sceneBatch,
      audioOverlays: editorBatch.audioOverlays,
      finalScript: editorBatch.finalScript,
      targetPlatform: aspectRatioToPlatform(editorBatch.aspectRatio),
      aspectRatio: editorBatch.aspectRatio,
    })
      .then((result) => {
        if (!cancelled) setEdl(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'EDL_GENERATION_FAILED');
      })
      .finally(() => {
        if (!cancelled) setIsPlanning(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editorBatch]);

  const handleDownloadJson = () => {
    if (!edl) return;
    const blob = new Blob([JSON.stringify(edl, null, 2)], { type: 'application/json;charset=utf-8' });
    saveAs(blob, `edit-decision-list-${Date.now()}.json`);
  };

  // --- Final-render pipeline (voice consolidation → server ffmpeg render) ----
  const [voices, setVoices] = useState<VoiceLibrary | null>(null);
  const [voiceId, setVoiceId] = useState<string>('');
  const stabilityMode: StabilityMode = 'robust';
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [voicedOverlays, setVoicedOverlays] = useState<Record<number, string>>({});
  const [consolidateNotes, setConsolidateNotes] = useState<string[]>([]);
  const [consolidateError, setConsolidateError] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<FinalRenderResult | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  // Burn-in: drawtext overlays/captions + SFX + ducked music bed from the EDL.
  const [burnInEnabled, setBurnInEnabled] = useState(true);
  // Face-clear caption bands per talking scene (MediaPipe, AI-Editor-only).
  // Graceful: empty → the renderer uses its per-type heuristic band.
  const [captionRegions, setCaptionRegions] = useState<Record<number, { yFracTop: number; yFracBottom: number }>>({});

  useEffect(() => {
    let cancelled = false;
    fetchVoices()
      .then((lib) => {
        if (cancelled) return;
        setVoices(lib);
        const first =
          lib.libraryVoices[0]?.voice_id ??
          lib.myVoices[0]?.voice_id ??
          lib.stockVoices[0]?.voice_id ??
          RECOMMENDED_VOICE_IDS[0] ??
          '';
        setVoiceId(first);
      })
      .catch(() => {
        if (!cancelled) setVoiceId(RECOMMENDED_VOICE_IDS[0] ?? '');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Detect face-clear caption bands for talking scenes (dynamic-imported MediaPipe;
  // runs once per batch, fully graceful — failure leaves captionRegions empty).
  useEffect(() => {
    let cancelled = false;
    const talking = editorBatch.sceneBatch.filter((s) => s.type === 'talking' && s.renderedUrl);
    if (!talking.length) return;
    import('../services/captionRegionDetect')
      .then(({ detectCaptionRegions }) =>
        detectCaptionRegions(
          editorBatch.sceneBatch.map((s) => ({ sceneIdx: s.sceneIdx, videoUrl: s.renderedUrl, type: s.type }))
        )
      )
      .then((r) => { if (!cancelled) setCaptionRegions(r); })
      .catch(() => { /* heuristic fallback */ });
    return () => { cancelled = true; };
  }, [editorBatch]);

  const handleConsolidate = async () => {
    if (!voiceId) {
      setConsolidateError('Pick a voice first.');
      return;
    }
    setIsConsolidating(true);
    setConsolidateError(null);
    setConsolidateNotes([]);
    try {
      const scenes: ConsolidationScene[] = editorBatch.sceneBatch.map((s) => ({
        sceneIdx: s.sceneIdx,
        type: s.type,
        scriptLine: s.scriptLine,
        videoUrl: s.renderedUrl,
      }));
      const results = await consolidateVoices(scenes, voiceId, stabilityMode);
      const overlays: Record<number, string> = {};
      const notes: string[] = [];
      for (const r of results) {
        if (r.audioUrl) overlays[r.sceneIdx] = r.audioUrl;
        else if (r.skipped) notes.push(`Scene ${r.sceneIdx + 1}: skipped (${r.error ?? 'visual-only'})`);
        else if (r.error) notes.push(`Scene ${r.sceneIdx + 1}: ${r.error}`);
      }
      setVoicedOverlays(overlays);
      setConsolidateNotes(notes);
      setVoiceReady(true);
      if (Object.keys(overlays).length === 0) {
        setConsolidateError('No voice tracks were produced — check your daily quota or scene scripts.');
      }
    } catch (err: any) {
      setConsolidateError(err?.message ?? 'VOICE_CONSOLIDATION_FAILED');
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleRenderFinal = async () => {
    setIsRendering(true);
    setRenderError(null);
    setRenderResult(null);
    try {
      const scenes: FinalRenderScene[] = editorBatch.sceneBatch
        .filter((s) => s.renderedUrl)
        .map((s) => {
          // Per-type dead-air trim: keep the hook (scene 0) full so its
          // product-reveal end-frame survives; cap every other scene to the
          // spoken-length estimate so Veo's filler tail is cut.
          const isHook = s.sceneIdx === 0;
          const estimate = estimateSpokenSec(s.scriptLine);
          // Burn-in: thread this scene's EDL plan (overlays/captions, SFX,
          // transition) into the renderer. Absent EDL → bare stitch for the scene.
          const plan = edl?.scenes.find((e) => e.sceneIdx === s.sceneIdx);
          return {
            sceneIdx: s.sceneIdx,
            videoUrl: s.renderedUrl as string,
            audioUrl: voicedOverlays[s.sceneIdx] ?? null,
            keepFullClip: isHook,
            targetDurationSec: isHook || estimate <= 0 ? null : estimate,
            overlayText: plan?.overlayText,
            sfxCues: plan?.sfxCues,
            transitionIn: plan?.transitionIn,
            cameraEffect: plan?.cameraEffect,
            // Overlay/caption engine inputs:
            scriptLine: s.scriptLine,
            sceneType: s.type,
            isHook,
            // Face-clear band from browser detection (talking scenes); absent → heuristic.
            captionRegion: captionRegions[s.sceneIdx],
          };
        });
      if (scenes.length === 0) {
        setRenderError('No rendered scene videos found in this batch.');
        return;
      }
      // Background-music bed chosen in code from the EDL's detected script style.
      const music = burnInEnabled
        ? { style: edl?.meta.scriptStyleDetected ?? 'mrbeast', enabled: true as const }
        : undefined;
      const result = await renderFinalVideo({ scenes, aspectRatio: editorBatch.aspectRatio, music });
      if (result.status === 'failed') setRenderError(result.error ?? 'RENDER_FAILED');
      else setRenderResult(result);
    } catch (err: any) {
      setRenderError(err?.message ?? 'FINAL_RENDER_FAILED');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
          <div className="flex items-center justify-between w-full">
            <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
              <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
            </button>
            <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">
              // FROM_RENDER_BATCH · {editorBatch.sceneBatch.length}_SCENES
            </span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
              Viral Video Editor <span className="text-[#FFCC00]">// FINAL RENDER</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
              // VOICE CONSOLIDATION → DEAD-AIR TRIM → FINAL MP4
            </p>
          </div>
        </header>

        {/* FINAL RENDER — primary pipeline CTA */}
        <GlassPanel className="p-6 mb-6">
          <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
            <Clapperboard className="w-4 h-4 shrink-0 text-[#FFCC00]" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              // FINAL_RENDER · {editorBatch.sceneBatch.length}_SCENES
            </span>
          </div>

          {/* Step 1 — consolidate voice */}
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
                // STEP_1 · BRAND_VOICE
              </label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]"
              >
                {voices ? (
                  <>
                    {voices.libraryVoices.length > 0 && (
                      <optgroup label="Filipino Library">
                        {voices.libraryVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {voices.myVoices.length > 0 && (
                      <optgroup label="My Voices">
                        {voices.myVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {voices.stockVoices.length > 0 && (
                      <optgroup label="Stock">
                        {voices.stockVoices.map((v) => (
                          <option key={v.voice_id} value={v.voice_id}>{v.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  <option value="">Loading voices…</option>
                )}
              </select>
            </div>
            <button
              type="button"
              onClick={handleConsolidate}
              disabled={isConsolidating || !voiceId}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Mic className="w-3.5 h-3.5 shrink-0" />
              {isConsolidating ? 'CONSOLIDATING…' : voiceReady ? 'RE-CONSOLIDATE' : 'CONSOLIDATE VOICE'}
            </button>
          </div>

          <p className="text-[10px] text-zinc-500 font-mono mt-2">
            // Talking scenes use the voice-changer (preserves lip-sync); b-roll/hook use TTS. Spends your daily TTS/STS quota (Creator+).
          </p>
          {voiceReady && (
            <p className="text-[10px] text-[#FFCC00] font-mono mt-1">
              ✓ {Object.keys(voicedOverlays).length} voice track(s) persisted.
            </p>
          )}
          {consolidateNotes.map((n, i) => (
            <p key={i} className="text-[10px] text-zinc-500 font-mono">// {n}</p>
          ))}
          {consolidateError && (
            <p className="text-[10px] text-red-400 font-mono mt-1">// {consolidateError}</p>
          )}

          {/* Step 2 — assemble final MP4 */}
          <div className="mt-5 pt-5 border-t border-white/5">
            <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
              // STEP_2 · ASSEMBLE_FINAL_MP4
            </label>
            <button
              type="button"
              onClick={() => setBurnInEnabled((v) => !v)}
              className="flex items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
            >
              {burnInEnabled
                ? <CheckSquare className="w-4 h-4 shrink-0 text-[#FFCC00]" />
                : <Square className="w-4 h-4 shrink-0 text-zinc-500" />}
              // BURN-IN · CAPTIONS · SFX · MUSIC
            </button>
            <GoldButton
              onClick={handleRenderFinal}
              disabled={isRendering || !voiceReady}
              className="w-full py-4 rounded-xl tracking-widest whitespace-nowrap"
            >
              {isRendering ? 'RENDERING FINAL VIDEO…' : 'RENDER FINAL VIDEO'}
            </GoldButton>
            {!voiceReady && (
              <p className="text-[10px] text-zinc-500 font-mono mt-2 text-center">
                // Consolidate voice first to enable render.
              </p>
            )}
            {renderError && (
              <p className="text-[10px] text-red-400 font-mono mt-2">// RENDER_ERROR: {renderError}</p>
            )}
          </div>

          {isRendering && (
            <div className="mt-4">
              <Loader message="TRIMMING DEAD AIR · MUXING VOICE · CONCATENATING…" />
            </div>
          )}

          {renderResult?.url && (
            <div className="mt-6 flex flex-col gap-3">
              <video
                src={renderResult.url}
                controls
                className="w-full max-h-[60vh] rounded-xl border border-white/10 bg-zinc-950"
              />
              <a
                href={renderResult.downloadUrl ?? renderResult.url}
                download
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                <Download className="w-3.5 h-3.5 shrink-0" /> DOWNLOAD FINAL MP4
              </a>
            </div>
          )}
        </GlassPanel>

        {isPlanning && (
          <GlassPanel className="p-12 flex items-center justify-center">
            <Loader message="DRAFTING EDIT DECISION LIST..." />
          </GlassPanel>
        )}

        {error && !isPlanning && (
          <GlassPanel className="p-6 border-red-900/50 bg-red-900/10">
            <p className="text-red-400 font-mono text-sm">// EDL_ERROR: {error}</p>
          </GlassPanel>
        )}

        {edl && !isPlanning && (
          <div className="flex flex-col gap-6">
            <GlassPanel className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFCC00]" />
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                    // META
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> EXPORT EDL JSON
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">DURATION</p>
                  <p className="text-white font-mono">{formatSec(edl.meta.totalDurationSec)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">ASPECT</p>
                  <p className="text-white font-mono">{edl.meta.aspectRatio}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">PLATFORM</p>
                  <p className="text-white font-mono uppercase">{edl.meta.targetPlatform}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">FORMULA</p>
                  <p className="text-white font-mono uppercase">{(edl.meta.formulaApplied ?? []).join(' + ') || '—'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">HOOK STRATEGY</p>
                <p className="text-zinc-300 text-sm">{edl.meta.hookStrategy}</p>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                // TIMELINE · {(edl.scenes ?? []).length}_SCENES
              </h2>
              <div className="flex flex-col gap-3">
                {(edl.scenes ?? []).map((scene) => (
                  <div
                    key={scene.sceneIdx}
                    className="flex flex-col gap-2 p-4 rounded-xl bg-zinc-950 border border-white/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">
                          SCENE_{String(scene.sceneIdx + 1).padStart(2, '0')}
                        </span>
                        {scene.transitionIn && (
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            // IN: {scene.transitionIn.type.toUpperCase()} ({scene.transitionIn.durationSec}s)
                          </span>
                        )}
                        {scene.cameraEffect && scene.cameraEffect !== 'none' && (
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            // CAM: {scene.cameraEffect.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                        {(scene.keepSegments ?? [])
                          .map((s) => `${formatSec(s.startSec)}–${formatSec(s.endSec)}`)
                          .join(', ')}
                      </span>
                    </div>
                    {scene.overlayText && scene.overlayText.length > 0 && (
                      <div className="flex flex-col gap-1">
                        {scene.overlayText.map((ov, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-[#FFCC00]/10 text-[#FFCC00] text-[9px] font-mono uppercase tracking-widest">
                              {ov.style} · {ov.position}
                            </span>
                            <span className="font-mono text-white">"{ov.text}"</span>
                            <span className="text-[9px] font-mono text-zinc-500">
                              [{formatSec(ov.startSec)}–{formatSec(ov.endSec)}]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {scene.sfxCues && scene.sfxCues.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {scene.sfxCues.map((cue, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded-full bg-zinc-900 border border-white/10 text-[9px] font-mono text-zinc-300 uppercase tracking-widest"
                            title={cue.reason}
                          >
                            🔊 {cue.sfxId} @ {formatSec(cue.anchorSec)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-zinc-500 font-mono italic mt-1">// {scene.notes}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-6">
              <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2 mb-4">
                // FORMULA_CHECK
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">RULES APPLIED</p>
                  <ul className="space-y-1">
                    {(edl.formulaCheck?.rulesApplied ?? []).map((r, i) => (
                      <li key={i} className="text-zinc-300 text-sm">✓ {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">WEAKNESSES FLAGGED</p>
                  {(edl.formulaCheck?.weaknessesFlagged ?? []).length === 0 ? (
                    <p className="text-zinc-500 text-sm italic">// None — formula intact.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(edl.formulaCheck?.weaknessesFlagged ?? []).map((w, i) => (
                        <li key={i} className="text-[#FFCC00] text-sm">⚠ {w}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">GLOBAL SFX PICKS</p>
                <div className="flex gap-2 flex-wrap">
                  {(edl.globalSfxPicks ?? []).map((sfx) => (
                    <span
                      key={sfx}
                      className="px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-[10px] font-mono text-zinc-300 uppercase tracking-widest"
                    >
                      {sfx}
                    </span>
                  ))}
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-6 bg-zinc-900/30">
              <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-3.5 h-3.5 text-zinc-500" />
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                  // PHASE_1A · STUB BRAIN
                </p>
              </div>
              <p className="text-zinc-400 text-sm">
                This EDL drives the render. With
                <span className="text-zinc-300"> Burn-in</span> on, the
                <span className="text-zinc-300"> Final Render</span> panel above burns these
                overlays/captions and SFX into the MP4 and lays a ducked music bed under the
                voice-over — on top of the server-side trim + voice mux + concat.
              </p>
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );
};

const EditVideo: React.FC<EditVideoProps> = ({ onBack, editorBatch }) => {
  if (editorBatch && editorBatch.sceneBatch.length > 0) {
    return <BatchEditMode editorBatch={editorBatch} onBack={onBack} />;
  }

  const [formData, setFormData] = useState<VideoEditInput>({
    scriptText: '',
    sceneImages: [],
    instructions: '',
  });
  
  const [scriptSource, setScriptSource] = useState<'paste' | 'upload'>('paste');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleScriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        setFormData(prev => ({ ...prev, scriptText: text }));
    };
    reader.readAsText(file);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const filesArray = Array.from(e.target.files) as File[];
          const compressed = await Promise.all(filesArray.map(f => compressImageForUpload(f)));
          const newImages = compressed.map(c => c.dataUrl);
          setFormData(prev => ({ ...prev, sceneImages: [...prev.sceneImages, ...newImages] }));
      }
      if (e.target) e.target.value = '';
  };

  const removeImage = (indexToRemove: number) => {
      setFormData(prev => ({
          ...prev,
          sceneImages: prev.sceneImages.filter((_, idx) => idx !== indexToRemove)
      }));
  };

  const handleAnalyze = async () => {
    // REQUIREMENT: Script is mandatory
    if (!formData.scriptText) {
        setError("Missing Script: You MUST paste a script or upload a text file.");
        return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    
    try {
        const plan = await generateVideoEditPlan(formData);
        setResult(plan);
    } catch (err: any) {
        console.error(err);
        setError(`Analysis Failed: ${err.message || 'Unknown Error'}. Please check your connection.`);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    saveAs(blob, `Viral_Edit_Plan.txt`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
          <div className="flex items-center justify-between w-full">
            <button onClick={onBack} className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
              <ChevronLeft className="w-4 h-4" /> <span className="hidden md:inline">COMMAND CENTER</span><span className="md:hidden">BACK</span>
            </button>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
                Viral Video Editor
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
                // TURN RAW FOOTAGE INTO VIRAL GOLD
            </p>
          </div>
        </header>

        <GlassPanel className="relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* LEFT: INPUTS */}
                <div className="space-y-6">
                    <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest border-b border-white/10 pb-2">
                        // SOURCE_MATERIAL
                    </h2>
                    
                    {/* Script Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                             <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                                 // SCRIPT_SOURCE (REQUIRED)
                             </label>
                             <div className="flex gap-4">
                                <button 
                                    className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${scriptSource === 'paste' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    onClick={() => setScriptSource('paste')}
                                >
                                    Paste Text
                                </button>
                                <button 
                                    className={`pb-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${scriptSource === 'upload' ? 'text-[#FFCC00] border-b-2 border-[#FFCC00]' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    onClick={() => setScriptSource('upload')}
                                >
                                    Upload File
                                </button>
                             </div>
                        </div>

                        {scriptSource === 'upload' ? (
                            <div className="space-y-2">
                                <label className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-4 rounded-xl flex items-center justify-center cursor-pointer transition-all">
                                    <UploadCloud className="w-5 h-5 mr-2" />
                                    <span className="font-mono text-sm uppercase tracking-widest">Upload .TXT Script</span>
                                    <input 
                                        type="file" 
                                        accept=".txt" 
                                        onChange={handleScriptUpload} 
                                        className="hidden"
                                    />
                                </label>
                                {formData.scriptText && <p className="text-[#FFCC00] text-xs mt-2 font-mono text-center">Script loaded successfully.</p>}
                            </div>
                        ) : (
                            <textarea 
                                id="scriptText"
                                name="scriptText"
                                value={formData.scriptText}
                                onChange={handleChange}
                                placeholder="Paste your script or outline here..."
                                rows={6}
                                className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] min-h-[100px] text-sm"
                            />
                        )}
                    </div>
                    
                    {/* Image Section */}
                    <div>
                        <label className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest mb-2">
                            // KEY_SCENES_SCREENSHOTS
                        </label>
                        <p className="text-[10px] text-zinc-500 mb-4 font-mono">
                            Upload screenshots or photos of your raw footage. The AI will analyze visual composition against your script.
                        </p>
                        
                        {/* Image Grid */}
                        {formData.sceneImages.length > 0 && (
                             <div className="grid grid-cols-4 gap-2 mb-4">
                                {formData.sceneImages.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square border border-white/10 rounded-lg overflow-hidden bg-zinc-950 group">
                                        <img src={img} alt={`Scene ${idx}`} className="w-full h-full object-cover opacity-80" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-red-600/80 text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-red-600 opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                             </div>
                        )}

                        <label className="bg-zinc-950/50 border-2 border-dashed border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 text-zinc-400 p-6 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all min-h-[100px]">
                            <ImageIcon className="w-6 h-6 mb-2 text-zinc-500" />
                            <span className="font-mono text-[10px] uppercase tracking-widest">[CLICK TO UPLOAD KEYFRAMES]</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                multiple
                                onChange={handleImageUpload} 
                                className="hidden"
                            />
                        </label>
                    </div>
                    
                    <div className="space-y-2">
                        <label htmlFor="instructions" className="block text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // SPECIAL_INSTRUCTIONS (OPTIONAL)
                        </label>
                        <textarea 
                            id="instructions"
                            name="instructions"
                            value={formData.instructions}
                            onChange={handleChange}
                            placeholder="e.g., Focus on high energy, target Gen Z audience..."
                            rows={2}
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] text-sm"
                        />
                    </div>

                    <GoldButton 
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="w-full py-4 mt-4 rounded-xl tracking-widest whitespace-nowrap"
                    >
                        {isAnalyzing ? "ANALYZING SCENES..." : "GENERATE EDIT PLAN"}
                    </GoldButton>
                    
                    {error && (
                        <p className="text-red-500 font-mono text-sm text-center border border-red-900/50 bg-red-900/20 p-4 rounded-xl mt-4">{error}</p>
                    )}
                </div>

                {/* RIGHT: RESULTS */}
                <div className="flex flex-col h-full min-h-[500px] border-l border-white/10 pl-0 lg:pl-10">
                    <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                        <h2 className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest">
                            // VIRAL_EDIT_PLAN
                        </h2>
                        {result && (
                            <button 
                                onClick={handleDownload} 
                                className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono uppercase tracking-widest hover:text-[#FFCC00] transition-colors"
                            >
                                <Copy className="w-3 h-3" /> DOWNLOAD .TXT
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-grow bg-zinc-950 border border-white/10 rounded-xl p-6 overflow-y-auto custom-scrollbar relative">
                        {isAnalyzing ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 rounded-xl">
                                <Loader message="WATCHING & STRATEGIZING..." />
                            </div>
                        ) : result ? (
                            <pre className="text-sm font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {result}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                                <p className="font-mono text-center mb-2 text-[10px] uppercase tracking-widest">// SYSTEM_STANDBY</p>
                                <p className="text-sm text-center max-w-xs">
                                    Upload script and scene screenshots to receive a frame-by-frame viral editing strategy.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default EditVideo;
