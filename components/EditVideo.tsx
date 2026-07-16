
import React, { useEffect, useState } from 'react';
import {
  VideoEditInput, EditDecisionList, SceneBatchEntry, EditTargetPlatform,
  ConsolidationScene, FinalRenderScene, FinalRenderResult, VoiceLibrary, StabilityMode,
  VoiceWord, FinalRenderRequest, LockablePresetId, BusinessInfo,
} from '../types';
import { generateVideoEditPlan, generateEditDecisionList } from '../services/geminiService';
import { fetchVoices } from '../services/voiceService';
import { consolidateVoices } from '../services/voiceConsolidationService';
import { renderFinalVideo } from '../services/finalRenderService';
import { buildLockedPreset } from '../services/renderLock';
import { composeMusicBed } from '../services/musicService';
import { estimateSpokenSec } from '../utils/spokenDuration';
import { useSubscription } from '../hooks/useSubscription';
import { musicGenEligible } from '../utils/planGate';
import { RECOMMENDED_VOICE_IDS } from './SignalModulator/pinoyReady';
import { preferGenderVoice, type AvatarVoiceGender } from '../utils/voiceSelect';
import { compressImageForUpload } from '../utils/imageCompression';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';
import Loader from './ui/Loader';
import { Copy, ChevronLeft, UploadCloud, Image as ImageIcon, Trash2, Download, Scissors, Sparkles, Mic, Clapperboard, CheckSquare, Square, Loader2, RotateCcw, Minus, Wand2 } from 'lucide-react';
import saveAs from 'file-saver';
import {
  applyOmniStyle,
  restyleScene,
  consumeOmniStyleAd,
  mapSceneToOmniTarget,
  type OmniSceneOutcome,
  type OmniConsumeResult,
} from '../services/omniStyleService';
import { trackEvent } from '../services/analyticsService';
import { seedCaptionsEnabled } from '../utils/asmrSeeds';

export interface EditorBatchPayload {
  sceneBatch: SceneBatchEntry[];
  audioOverlays: { sceneIdx: number; audioUrl: string }[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  finalScript: string;
  /** Wizard offer (clientDetails.offer) — prefills the end-card recap field. */
  offer?: string;
  /** Look locked at GenerateVideo's Render All; absent → server rotates. */
  lockedPresetId?: LockablePresetId;
  /** Omni Edit Style locked at Render All (Slice 3 picker); drives the
   *  "Applying style" pass. Absent unless set via the picker or the dev selector. */
  omniStyle?: 'premium_reel' | 'vox_explainer';
  /** Slice 3 picker fields — hop with the style. */
  omniBrandHex?: string;
  omniEmphasisWord?: string;
  omniTitleText?: string;
  captionsEnabled?: boolean;
  /** Wizard scriptType — a UGCPro run gets the deterministic 'ugcpro' caption/music
   *  identity (hype word-pop). The EDL mis-detects UGCPro as testimonial → CLEAN
   *  preset otherwise, burying the caption bet. */
  scriptType?: BusinessInfo['scriptType'];
  /** UGC Pro ASMR flavor — audio-led format seeds captions + music OFF by default
   *  (the taps ARE the audio). Both stay user-flippable. */
  asmrFlag?: boolean;
}

interface EditVideoProps {
  onBack: () => void;
  editorBatch?: EditorBatchPayload | null;
  avatarGender?: AvatarVoiceGender;
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
  avatarGender?: AvatarVoiceGender;
}> = ({ editorBatch, onBack, avatarGender }) => {
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
  // Measured VO word timings per scene (forced alignment) — real caption pacing.
  const [voicedWords, setVoicedWords] = useState<Record<number, VoiceWord[]>>({});
  const [consolidateNotes, setConsolidateNotes] = useState<string[]>([]);
  const [consolidateError, setConsolidateError] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);

  const [isRendering, setIsRendering] = useState(false);
  const [renderResult, setRenderResult] = useState<FinalRenderResult | null>(null);
  const [creativeIdCopied, setCreativeIdCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  // Burn-in: drawtext overlays/captions + SFX + ducked music bed from the EDL.
  const [burnInEnabled, setBurnInEnabled] = useState(true);
  // Captions (spoken-word subtitles) toggle. Style-defaulted at the picker (VOX
  // off / Premium on); off omits scriptLine + voiceWords from the request scenes
  // so no subtitles burn in (hook title / callouts stay). Music length + dead-air
  // trim are computed pre-omission, so this does not shift timing.
  // ASMR runs seed captions OFF (audio-led — the whisper + taps carry it, subtitles
  // fight the register). An explicit picker value (editorBatch.captionsEnabled) still
  // wins; only the unset default flips on ASMR. User-flippable via the toggle below.
  const [captionsEnabled, setCaptionsEnabled] = useState(
    seedCaptionsEnabled(editorBatch.captionsEnabled, editorBatch.asmrFlag)
  );
  // Generative music bed (ElevenLabs Music) — Pro/Business perk, default-on for
  // eligible tiers. Server is authoritative (MUSIC_DAILY); this only governs the
  // toggle + the pre-render compose call. Off / ineligible → tuned static bed.
  const sub = useSubscription();
  const musicEligible = musicGenEligible(sub.plan_id);
  const [musicGenOn, setMusicGenOn] = useState(true);
  // Face-clear caption bands per talking scene (MediaPipe, AI-Editor-only).
  // Graceful: empty → the renderer uses its per-type heuristic band.
  const [captionRegions, setCaptionRegions] = useState<Record<number, { yFracTop: number; yFracBottom: number }>>({});

  // ── Omni Edit Styles — the "Applying style" pass (Slice 2) ──────────────
  // Style source: the locked style hopped from GenerateVideo (editorBatch.omniStyle),
  // or the dev selector below (Slice-3-replaceable). A stable per-session ad id
  // keys the server-side per-ad Omni budget.
  const devUnlocked =
    typeof window !== 'undefined' && window.localStorage?.getItem('grifon_dev_unlock') === '1';
  const [omniStyle, setOmniStyle] = useState<'premium_reel' | 'vox_explainer' | null>(
    editorBatch.omniStyle ?? null
  );
  const [finishedAdId] = useState<string>(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `omni-${Date.now()}`)
  );
  const [omniResults, setOmniResults] = useState<Record<number, OmniSceneOutcome>>({});
  const [omniApplying, setOmniApplying] = useState(false);
  const [omniApplyingScenes, setOmniApplyingScenes] = useState<Set<number>>(new Set());
  const [omniError, setOmniError] = useState<string | null>(null);
  const [rerolledScenes, setRerolledScenes] = useState<Set<number>>(new Set());
  // Calm one-line billing note surfaced after the deferred consume settles.
  const [omniBillingNote, setOmniBillingNote] = useState<string | null>(null);
  // True when the pass settled with the allowance exhausted — drives the ₱499
  // top-up CTA under the billing note (Slice 3c upsell surface).
  const [omniAllowanceExhausted, setOmniAllowanceExhausted] = useState(false);

  // Map a settled consume result (or an allowance short-circuit) to the calm
  // mono billing note. null/dev_unmetered stay silent.
  const noteFromConsume = (r: OmniConsumeResult | null): string | null => {
    if (!r) return null;
    if (r.consumed) {
      return r.fromCredit
        ? '// 1 Omni ad used (top-up credit)'
        : `// 1 Omni ad used · ${r.used} of ${r.limit} this month`;
    }
    if (r.reason === 'majority_fallback') return '// No charge — most scenes kept the standard edit';
    return null; // dev_unmetered / unknown → silent
  };

  // Settle billing for a resolved omni pass. When the allowance ran dry mid-pass
  // the routed scenes short-circuit to fallback with omni_allowance_exhausted —
  // surface that specific reason plus the ₱499 top-up CTA (Slice 3c) instead of
  // the generic "no charge" note.
  const settleOmniBilling = async (outcomes: OmniSceneOutcome[]) => {
    const styledCount = outcomes.filter((o) => o.outcome === 'styled').length;
    const fallbackCount = outcomes.length - styledCount;
    // Per-ad completion telemetry (Slice 4) — fired once per settle, un-awaited so
    // it never slows the UI. `charged` is null when the pass short-circuited on an
    // exhausted allowance (no consume call happened).
    const emitPassComplete = (result: OmniConsumeResult | null) => {
      void trackEvent({
        event: 'omni_pass_complete',
        module: 'omni_style',
        meta: {
          finishedAdId,
          styleId: omniStyle,
          styledCount,
          fallbackCount,
          charged: result?.consumed ?? null,
          ...(result?.fromCredit !== undefined ? { fromCredit: result.fromCredit } : {}),
        },
      });
    };
    if (outcomes.some((o) => o.fallbackReason === 'omni_allowance_exhausted')) {
      setOmniBillingNote('// Omni allowance used up — styles fell back to the standard edit');
      setOmniAllowanceExhausted(true);
      emitPassComplete(null);
      return;
    }
    setOmniAllowanceExhausted(false);
    const consumed = await consumeOmniStyleAd(finishedAdId, outcomes);
    setOmniBillingNote(noteFromConsume(consumed));
    emitPassComplete(consumed);
  };

  const hasRenderedScenes = editorBatch.sceneBatch.some((s) => s.renderedUrl);
  const allScriptLinesJoined = editorBatch.sceneBatch
    .map((s) => s.scriptLine)
    .filter(Boolean)
    .join(' ');

  const handleApplyStyle = async () => {
    if (!omniStyle) return;
    setOmniApplying(true);
    setOmniError(null);
    // Mark every routable scene as applying up front (Loader2 chips); each flips
    // as its ladder resolves via the onOutcome callback.
    const eligible = new Set(
      editorBatch.sceneBatch
        .filter((s) => s.renderedUrl && mapSceneToOmniTarget(s.type))
        .map((s) => s.sceneIdx)
    );
    setOmniApplyingScenes(eligible);
    try {
      const outcomes = await applyOmniStyle(
        editorBatch.sceneBatch,
        omniStyle,
        {
          finishedAdId,
          aspectRatio: editorBatch.aspectRatio,
          brandPrimaryHex: editorBatch.omniBrandHex,
          slotOverrides: { emphasisWord: editorBatch.omniEmphasisWord, titleText: editorBatch.omniTitleText },
        },
        (o) => {
          setOmniResults((prev) => ({ ...prev, [o.sceneIdx]: o }));
          setOmniApplyingScenes((prev) => {
            const next = new Set(prev);
            next.delete(o.sceneIdx);
            return next;
          });
        }
      );
      // Deferred consume — settle billing now that every routed scene resolved.
      await settleOmniBilling(outcomes);
    } catch (err: any) {
      setOmniError(err?.message ?? 'OMNI_STYLE_FAILED');
    } finally {
      setOmniApplying(false);
      setOmniApplyingScenes(new Set());
    }
  };

  const handleReroll = async (sceneIdx: number) => {
    const scene = editorBatch.sceneBatch.find((s) => s.sceneIdx === sceneIdx);
    if (!scene || !omniStyle || rerolledScenes.has(sceneIdx)) return;
    setRerolledScenes((prev) => new Set(prev).add(sceneIdx)); // one re-roll per scene
    setOmniApplyingScenes((prev) => new Set(prev).add(sceneIdx));
    try {
      const o = await restyleScene(
        scene,
        omniStyle,
        {
          finishedAdId,
          aspectRatio: editorBatch.aspectRatio,
          brandPrimaryHex: editorBatch.omniBrandHex,
          slotOverrides: { emphasisWord: editorBatch.omniEmphasisWord, titleText: editorBatch.omniTitleText },
        },
        allScriptLinesJoined
      );
      setOmniResults((prev) => ({ ...prev, [sceneIdx]: o }));
      // Re-settle billing from the FULL merged tally (all scenes incl. this
      // re-roll). The server marker makes this idempotent: a re-roll that flips
      // a fallback-majority into a styled-majority charges at THIS moment.
      // Accepted asymmetry: a charge followed by a degrading re-roll has no
      // refund — there is no un-consume primitive.
      await settleOmniBilling(Object.values({ ...omniResults, [sceneIdx]: o }));
    } finally {
      setOmniApplyingScenes((prev) => {
        const next = new Set(prev);
        next.delete(sceneIdx);
        return next;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchVoices()
      .then((lib) => {
        if (cancelled) return;
        setVoices(lib);
        // Avatar gender prefers a matching voice WITHIN each tier; tier order
        // (Filipino library → my voices → stock) is unchanged.
        const first =
          preferGenderVoice(lib.libraryVoices, avatarGender)?.voice_id ??
          lib.libraryVoices[0]?.voice_id ??
          lib.myVoices[0]?.voice_id ??
          preferGenderVoice(lib.stockVoices, avatarGender)?.voice_id ??
          lib.stockVoices[0]?.voice_id ??
          '';
        setVoiceId(first);
      })
      .catch(() => {
        if (!cancelled) setVoiceId(RECOMMENDED_VOICE_IDS[0] ?? '');
      });
    return () => {
      cancelled = true;
    };
  }, [avatarGender]);

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
      const wordsByScene: Record<number, VoiceWord[]> = {};
      const notes: string[] = [];
      for (const r of results) {
        if (r.audioUrl) {
          overlays[r.sceneIdx] = r.audioUrl;
          if (r.words?.length) wordsByScene[r.sceneIdx] = r.words;
        }
        else if (r.skipped) notes.push(`Scene ${r.sceneIdx + 1}: skipped (${r.error ?? 'visual-only'})`);
        else if (r.error) notes.push(`Scene ${r.sceneIdx + 1}: ${r.error}`);
      }
      setVoicedOverlays(overlays);
      setVoicedWords(wordsByScene);
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
          // Omni pass: a styled scene renders from its Omni output; every other
          // scene (fallback or never-styled) keeps its standard renderedUrl.
          const styled = omniResults[s.sceneIdx];
          const videoUrl =
            (styled?.outcome === 'styled' ? styled.styledUrl : undefined) ?? (s.renderedUrl as string);
          return {
            sceneIdx: s.sceneIdx,
            videoUrl,
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
            // Measured VO word timings (forced alignment) → real caption pacing.
            voiceWords: voicedWords[s.sceneIdx],
          };
        });
      if (scenes.length === 0) {
        setRenderError('No rendered scene videos found in this batch.');
        return;
      }
      // Background-music bed chosen in code from the EDL's detected script style.
      // Eligible tiers with the toggle on first try to generate a custom bed
      // (pre-step); on any miss/failure `music` stays style-only and the render
      // falls back to the tuned static bed.
      let music: FinalRenderRequest['music'];
      if (burnInEnabled) {
        // Deterministic override: a UGCPro run always burns the 'ugcpro' caption/music
        // identity (hype word-pop) — we KNOW the scriptType, so we don't ask the EDL
        // (which mis-detects UGCPro as testimonial → CLEAN preset). Non-UGCPro keeps the
        // EDL-detected style. ASMR is audio-led — the taps ARE the audio; a bed buries them.
        const style = editorBatch.scriptType === 'UGCPro' ? 'ugcpro' : (edl?.meta.scriptStyleDetected ?? 'mrbeast');
        music = { style, enabled: editorBatch.asmrFlag ? false : true };
        if (musicGenOn && musicEligible) {
          const lengthMs = Math.max(
            8000,
            Math.round(
              scenes.reduce(
                (sum, s) => sum + (s.targetDurationSec ?? Math.max(2, estimateSpokenSec(s.scriptLine || ''))),
                0
              ) * 1000
            ) + 1500 // small tail pad
          );
          const composed = await composeMusicBed({
            style,
            videoUrls: scenes.map((s) => s.videoUrl),
            lengthMs,
          });
          if (composed?.bedUrl) music = { ...music, bedUrl: composed.bedUrl };
        }
      }
      // Omni-styled scenes own their typography: drop the FFmpeg overlayText
      // (hook title / callouts) so it can't stamp over the style's rendered
      // title. Live catch (Neil eyeball 2026-07-07): the blue/white "DRY SKIN?"
      // hook overlay landed on top of the VOX torn-paper headline. Fallback /
      // never-styled scenes keep their overlays — the standard edit needs them.
      const styledScenes = new Set(
        Object.values(omniResults)
          .filter((o) => o.outcome === 'styled')
          .map((o) => o.sceneIdx)
      );
      const overlayScenes: FinalRenderScene[] = scenes.map((s) =>
        styledScenes.has(s.sceneIdx) ? { ...s, overlayText: undefined } : s
      );
      // Captions OFF: drop scriptLine + measured word timings from the request
      // scenes so no spoken-word subtitles burn in (hook title / callouts via
      // overlayText STAY on non-styled scenes — Neil decision). This happens
      // AFTER the music-length reduce + targetDurationSec above (both computed
      // from the pre-omission scenes), so captions-off never shifts music
      // length or dead-air trim.
      const requestScenes: FinalRenderScene[] = captionsEnabled
        ? overlayScenes
        : overlayScenes.map(({ scriptLine, voiceWords, ...rest }) => rest);
      // End-card recap overlay removed 2026-06-16 (Neil): it auto-pulled the
      // wizard offer — which carries the price — and burned it onto the last
      // scene (and covered the presenter's face). No auto-applied recap now; the
      // last scene renders clean, like before the 2026-06-13 feature.
      const result = await renderFinalVideo({
        scenes: requestScenes,
        aspectRatio: editorBatch.aspectRatio,
        music,
        preset: buildLockedPreset(editorBatch.lockedPresetId),
      });
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
              Edit Bay <span className="text-[#FFCC00]">// FINAL RENDER</span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mt-2">
              // VOICE CONSOLIDATION → DEAD-AIR TRIM → FINAL MP4
            </p>
          </div>
        </header>

        {/* ── APPLYING STYLE · Omni Edit Styles (Slice 2) ─────────────────────
            Shows when a style is locked from GenerateVideo (Slice 3 picker) OR
            the dev selector below is used. The dev selector is TEMPORARY —
            Slice 3 replaces it with the picker beside the LOOK control. */}
        {(omniStyle || devUnlocked) && (
          <GlassPanel className="p-6 mb-6">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
              <Wand2 className="w-4 h-4 shrink-0 text-[#FFCC00]" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                // APPLYING_STYLE{omniStyle ? ` · ${omniStyle === 'premium_reel' ? 'PREMIUM_REEL' : 'VOX_EXPLAINER'}` : ''}
              </span>
            </div>

            {/* Dev-gated style selector — Slice-3-replaceable. */}
            {devUnlocked && (
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">// DEV_STYLE</span>
                {([
                  { id: 'premium_reel', label: 'PREMIUM REEL' },
                  { id: 'vox_explainer', label: 'VOX EXPLAINER' },
                  { id: null, label: 'NONE' },
                ] as const).map((opt) => {
                  const active = omniStyle === opt.id || (opt.id === null && !omniStyle);
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setOmniStyle(opt.id)}
                      disabled={omniApplying}
                      className={`text-[10px] font-mono font-bold tracking-widest uppercase rounded-lg border px-3 py-1.5 transition-all whitespace-nowrap disabled:opacity-40 ${
                        active
                          ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                          : 'border-white/10 bg-zinc-950 text-zinc-400 hover:border-[#FFCC00]/50 hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}

            {omniStyle ? (
              <>
                <GoldButton
                  onClick={handleApplyStyle}
                  disabled={omniApplying || !hasRenderedScenes}
                  className="w-full py-4 rounded-xl tracking-widest"
                >
                  {omniApplying ? 'APPLYING STYLE…' : 'APPLY STYLE'}
                </GoldButton>
                <p className="text-[10px] text-zinc-500 font-mono mt-2">
                  // Premium styles take ~3–5 minutes. Scenes that can't be styled keep the standard edit.
                </p>
                {omniError && <p className="text-[10px] text-red-400 font-mono mt-1">// {omniError}</p>}
                {omniBillingNote && (
                  <p className="text-[10px] text-zinc-400 font-mono mt-1">{omniBillingNote}</p>
                )}
                {omniAllowanceExhausted && (
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/checkout?topup=omni_style_single'; }}
                    className="mt-2 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-zinc-400 transition-all hover:border-[#FFCC00]/50 hover:text-[#FFCC00]"
                  >
                    // BUY 1 OMNI STYLE — ₱499
                  </button>
                )}

                {/* Per-scene status chips */}
                {(Object.keys(omniResults).length > 0 || omniApplyingScenes.size > 0) && (
                  <div className="mt-4 flex flex-col gap-2">
                    {editorBatch.sceneBatch
                      .filter((s) => s.renderedUrl)
                      .map((s) => {
                        const routed = !!mapSceneToOmniTarget(s.type);
                        const res = omniResults[s.sceneIdx];
                        const applying = omniApplyingScenes.has(s.sceneIdx);
                        const rerolled = rerolledScenes.has(s.sceneIdx);
                        return (
                          <div
                            key={s.sceneIdx}
                            className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-white/5"
                          >
                            <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest w-16 shrink-0">
                              SCENE_{String(s.sceneIdx + 1).padStart(2, '0')}
                            </span>
                            {applying ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-300">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFCC00]" /> APPLYING…
                              </span>
                            ) : res?.outcome === 'styled' ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#FFCC00]">
                                <Sparkles className="w-3.5 h-3.5" /> STYLED
                              </span>
                            ) : res?.outcome === 'fallback' || !routed ? (
                              <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                                <Minus className="w-3.5 h-3.5" /> Scene {s.sceneIdx + 1} used the standard edit
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-600">// queued</span>
                            )}
                            <div className="flex-1" />
                            {res?.outcome === 'styled' && res.styledUrl && (
                              <button
                                type="button"
                                onClick={() => handleReroll(s.sceneIdx)}
                                disabled={rerolled || applying}
                                title={rerolled ? 'Re-roll used' : 'Re-roll style (1 left)'}
                                className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-[#FFCC00] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {/* Styled previews — swap in the Omni output for eyeballing pre-render. */}
                {Object.values(omniResults).some((r) => r.outcome === 'styled' && r.styledUrl) && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {editorBatch.sceneBatch
                      .filter((s) => omniResults[s.sceneIdx]?.outcome === 'styled' && omniResults[s.sceneIdx]?.styledUrl)
                      .map((s) => (
                        <div key={s.sceneIdx} className="flex flex-col gap-1">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            SCENE_{String(s.sceneIdx + 1).padStart(2, '0')} · STYLED
                          </span>
                          <video
                            src={omniResults[s.sceneIdx]!.styledUrl}
                            controls
                            className="w-full rounded-xl border border-white/10 bg-zinc-950"
                          />
                        </div>
                      ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[10px] text-zinc-500 font-mono">
                // No Edit Style selected — scenes render with the standard edit.
              </p>
            )}
          </GlassPanel>
        )}

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

          {/* Step 2 — assemble final MP4 (end-card recap removed 2026-06-16) */}
          <div className="mt-5 pt-5 border-t border-white/5">
            <label className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">
              // STEP_2 · ASSEMBLE_FINAL_MP4
            </label>
            {/* Raw / Auto edit mode. AUTO = captions + SFX + music burned in
                (ready to post). RAW = stitched clips only, edit it yourself. */}
            <div className="mb-3">
              <span className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// EDIT_MODE</span>
              <div className="flex gap-2">
                {([
                  { v: true, label: 'Auto' },
                  { v: false, label: 'Raw' },
                ] as const).map(({ v, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setBurnInEnabled(v)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors border ${
                      burnInEnabled === v
                        ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]'
                        : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-2">
                {burnInEnabled
                  ? '// Captions · SFX · music — ready to post'
                  : '// Stitched clips only — edit it yourself'}
              </p>
            </div>
            {/* Captions (spoken-word subtitles) — only meaningful in Auto mode. */}
            {burnInEnabled && (
              <div className="mb-3">
                <span className="block text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">// CAPTIONS</span>
                <div className="flex gap-2">
                  {([
                    { v: true, label: 'On' },
                    { v: false, label: 'Off' },
                  ] as const).map(({ v, label }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCaptionsEnabled(v)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-colors border ${
                        captionsEnabled === v
                          ? 'bg-[#FFCC00] text-zinc-950 border-[#FFCC00]'
                          : 'bg-zinc-950 text-zinc-400 border-white/10 hover:border-[#FFCC00]/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-500 font-mono mt-2">
                  {captionsEnabled
                    ? '// Spoken-word subtitles burned in'
                    : '// No subtitles — hook title & callouts stay'}
                </p>
              </div>
            )}
            {/* Generative music — Pro/Business only. Off / ineligible → tuned static bed. */}
            {musicEligible && burnInEnabled && (
              <button
                type="button"
                onClick={() => setMusicGenOn((v) => !v)}
                className="flex items-center gap-2 mb-3 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
              >
                {musicGenOn
                  ? <CheckSquare className="w-4 h-4 shrink-0 text-[#FFCC00]" />
                  : <Square className="w-4 h-4 shrink-0 text-zinc-500" />}
                // CUSTOM_MUSIC_BED <span className="text-[#FFCC00]">· PRO</span>
              </button>
            )}
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

              {renderResult.creativeId && (
                <div className="rounded-xl bg-zinc-950 border border-white/10 p-4">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00]">
                    // CREATIVE ID
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate text-xs font-mono text-zinc-300">
                      grifon-{renderResult.creativeId}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(`grifon-${renderResult.creativeId}`);
                        setCreativeIdCopied(true);
                        setTimeout(() => setCreativeIdCopied(false), 1500);
                      }}
                      className="flex items-center gap-1.5 shrink-0 px-3 py-3 rounded-xl bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 shrink-0" /> {creativeIdCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Name your Meta ad with this so Grifon can read its results.
                  </p>
                </div>
              )}
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

const EditVideo: React.FC<EditVideoProps> = ({ onBack, editorBatch, avatarGender }) => {
  if (editorBatch && editorBatch.sceneBatch.length > 0) {
    return <BatchEditMode editorBatch={editorBatch} onBack={onBack} avatarGender={avatarGender} />;
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
                Edit Bay
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
