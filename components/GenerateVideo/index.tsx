import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronDown,
  ArrowLeftRight,
  Download,
  RotateCw,
  Sparkles,
  Trash2,
  UploadCloud,
  Video as VideoIcon,
  X,
  Pencil,
  Eye,
  Loader2,
} from 'lucide-react';
import type {
  VideoGenConfig,
  VideoModelType,
  VideoPrompt,
  Scene,
  VideoLibraryItem,
  SceneBatchEntry,
} from '../../types';
import {
  VIDEO_MODEL_SPECS,
  generateVideo,
  GeneratedVideoResult,
  getValidDurations,
  listVideoLibrary,
  deleteVideoLibraryItem,
  suggestDurationForScript,
  resumeVideoOperation,
} from '../../services/geminiService';
import { getSupabase } from '../../services/supabaseClient';
import { listActiveJobs, clearActiveJob } from '../../services/activeJobStore';
import { compressImageForUpload } from '../../utils/imageCompression';
import { GoldButton } from '../ui/GoldButton';
import { GlassPanel } from '../ui/GlassPanel';
import { SceneQueue } from './SceneQueue';
import {
  runQueue,
  urlToDataUrl,
  autoRouteModelForType,
  type SceneStatus,
  type RenderJob,
  type QueueEvent,
} from './RenderAllRunner';
import { formatRelativeTime } from './utils';

type Mode = 'pipeline' | 'one-shot';
type CanvasView = 'edit' | 'preview';

interface PreviewItem {
  id: string;
  url: string;
  downloadUrl: string;
  mimeType: string;
  prompt: string;
  sceneIdx?: number;
  model?: VideoModelType;
  createdAt?: string;
  source: 'session' | 'library';
}

interface GenerateVideoProps {
  onBack: () => void;
  seedPrompts?: VideoPrompt[];
  storyboard?: Scene[];
  defaultAspectRatio?: '9:16' | '16:9' | null;
  /** Phase 5 v2 — when present and all scenes have rendered, the // RENDERED
   * rail shows a "SEND TO SIGNAL MODULATOR ↗" button that hands off the
   * scriptLines (+ rendered MP4 URLs) for batch voice generation. */
  onSendToSignalModulator?: (batch: SceneBatchEntry[]) => void;
}

const ACTIVE_MODELS: VideoModelType[] = ['Veo_3.1_Fast', 'Veo_3.1_Quality', 'Veo_3.1_Lite', 'Kling_3_0'];
const LOCKED_MODELS: VideoModelType[] = ['Seedance_2_0_Fast', 'Seedance_2_0_Quality'];

const initialConfig = (defaultAspectRatio?: '9:16' | '16:9' | null): VideoGenConfig => ({
  // Phase 4h.1 — default to Lite for beta cost-control. Cheapest tier;
  // 720p supports full 4/6/8s grid. Users opt up via the model picker.
  model: 'Veo_3.1_Lite',
  duration: 8,
  resolution: '720p', // 720p gives pacing flexibility (4/6/8s) on all Veo variants. User can opt up.
  aspectRatio: defaultAspectRatio ?? '9:16',
  audioEnabled: false,
  prompt: '',
  elements: [],
});

const formatEta = (sec: number): string => {
  if (sec <= 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  return `${m}m`;
};

const GenerateVideo: React.FC<GenerateVideoProps> = ({
  onBack,
  seedPrompts = [],
  storyboard = [],
  defaultAspectRatio,
  onSendToSignalModulator,
}) => {
  const hasSeedPrompts = seedPrompts.length > 0;
  const [mode, setMode] = useState<Mode>(hasSeedPrompts ? 'pipeline' : 'one-shot');
  const [activeIdx, setActiveIdx] = useState(0);
  const [config, setConfig] = useState<VideoGenConfig>(() => {
    const base = initialConfig(defaultAspectRatio);
    if (hasSeedPrompts) return { ...base, prompt: seedPrompts[0]?.prompt ?? '' };
    return base;
  });
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [sceneStatus, setSceneStatus] = useState<SceneStatus[]>(() =>
    seedPrompts.map(() => 'ready' as SceneStatus)
  );
  const [sceneResults, setSceneResults] = useState<Record<number, GeneratedVideoResult>>({});
  const [elapsed, setElapsed] = useState<Record<number, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<number | null>(null);

  const [canvasView, setCanvasView] = useState<CanvasView>('edit');
  const [previewItem, setPreviewItem] = useState<PreviewItem | null>(null);
  const [library, setLibrary] = useState<VideoLibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [tick, setTick] = useState(0); // re-renders to refresh relative timestamps every minute
  const [userId, setUserId] = useState<string | null>(null); // Phase 4d — needed for IndexedDB resume keying

  // Phase 4a — cost guardrail confirm dialog. Resolves the promise stored on the
  // state so the GENERATE handler can await the user's choice before proceeding.
  const [confirmDialog, setConfirmDialog] = useState<{
    sceneIdx: number;
    count: number;
    resolve: (action: 'replace' | 'variant' | 'cancel') => void;
  } | null>(null);

  // Phase 4b — sticky-by-scene flags for the smart-duration heuristic. Once the
  // user manually clicks a duration chip on a scene, we stop auto-overriding it
  // until they switch to a different scene (or change model/resolution, which
  // resets via the dependency array of the smart-default effect). Only relevant
  // in manual mode (no scriptLine); pipeline mode auto-computes per-scene at
  // render time so this flag never fires there.
  const [manualDurationByScene, setManualDurationByScene] = useState<Record<number, boolean>>({});

  const queueAbortRef = useRef<AbortController | null>(null);
  const singleAbortRef = useRef<AbortController | null>(null);
  const elapsedTickRef = useRef<number | null>(null);
  const startFrameRef = useRef<HTMLInputElement>(null);
  const endFrameRef = useRef<HTMLInputElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const specs = VIDEO_MODEL_SPECS[config.model];
  const isCurrentModelLocked = !!specs?.locked;

  useEffect(() => {
    if (!hasSeedPrompts) return;
    const seed = seedPrompts[activeIdx];
    if (!seed) return;
    setConfig((prev) => ({ ...prev, prompt: seed.prompt }));
    const sceneImage = storyboard[activeIdx]?.imageUrl ?? storyboard[activeIdx]?.manualUploadUrl;
    if (sceneImage) {
      // Storyboard images can be 1-2 MB raw. Compress to keep submit body under the
      // 55s Vercel ceiling (compressImageForUpload caps at 1280px / JPEG q=0.85).
      urlToDataUrl(sceneImage)
        .then((dataUrl) => compressImageForUpload(dataUrl))
        .then((compressed) =>
          setConfig((prev) => ({ ...prev, startFrame: compressed.dataUrl }))
        )
        .catch(() => {});
    } else {
      setConfig((prev) => ({ ...prev, startFrame: undefined }));
    }

    // Phase 4h.4 (corrected 4h.4b) — auto-anchor the scene's OWN end-frame
    // image (Scene.endFrameImageUrl from the storyboard step, or the user's
    // manualEndFrameUrl override). This is the SAME-scene end frame, NOT the
    // next scene's start frame. Used primarily for SCENE 1 (HOOK) where the
    // storyboard generated two glasses-of-water shots — start and end of the
    // hook beat. Any scene with an endFrameImageUrl will auto-load; otherwise
    // endFrame stays undefined and Veo generates a natural ending.
    const sceneEndImage = storyboard[activeIdx]?.endFrameImageUrl ?? storyboard[activeIdx]?.manualEndFrameUrl;
    if (sceneEndImage) {
      urlToDataUrl(sceneEndImage)
        .then((dataUrl) => compressImageForUpload(dataUrl))
        .then((compressed) =>
          setConfig((prev) => ({ ...prev, endFrame: compressed.dataUrl }))
        )
        .catch(() => {});
    } else {
      setConfig((prev) => ({ ...prev, endFrame: undefined }));
    }
  }, [activeIdx, hasSeedPrompts, seedPrompts, storyboard]);

  // Phase 4b — Smart-default duration. Auto-snaps the duration chip to the
  // shortest valid value that fits the active scene's script line, so users
  // don't accidentally render 8s clips for 4-6s of dialog (creating dead air
  // that the downstream AI editor has to trim). Manual chip clicks override
  // for that scene; switching scenes or model/resolution re-suggests.
  const suggestedDuration = useMemo(() => {
    if (!hasSeedPrompts) return null;
    const scriptLine = storyboard?.[activeIdx]?.scriptLine;
    if (!scriptLine) return null;
    return suggestDurationForScript(scriptLine, config.model, config.resolution);
  }, [hasSeedPrompts, storyboard, activeIdx, config.model, config.resolution]);

  useEffect(() => {
    if (suggestedDuration === null) return;
    if (manualDurationByScene[activeIdx]) return;
    if (suggestedDuration === config.duration) return;
    setConfig((prev) => ({ ...prev, duration: suggestedDuration }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedDuration, activeIdx]);

  // Phase 4a — Set of scene indices whose current wizard prompt also matches
  // an existing library entry. Matching on (sceneIdx, prompt) — NOT sceneIdx
  // alone — prevents false positives when a new wizard run reuses an index
  // that a prior storyboard already rendered with a different prompt.
  // (Same key shape as the Phase 4c dedupe useMemo for consistency.)
  const renderedSceneIdxs = useMemo(() => {
    const s = new Set<number>();
    for (const item of library) {
      if (typeof item.sceneIdx !== 'number') continue;
      const sceneSeedPrompt = seedPrompts[item.sceneIdx]?.prompt?.trim();
      if (sceneSeedPrompt && (item.prompt ?? '').trim() === sceneSeedPrompt) {
        s.add(item.sceneIdx);
      }
    }
    return s;
  }, [library, seedPrompts]);

  const handleDialogAction = (action: 'replace' | 'variant' | 'cancel') => {
    confirmDialog?.resolve(action);
    setConfirmDialog(null);
  };

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelPickerOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  useEffect(() => {
    if (!resumeAt) return;
    const id = window.setInterval(() => {
      const remain = Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000));
      if (remain <= 0) {
        setResumeAt(null);
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [resumeAt]);

  // Fetch library on mount + refresh after every successful render
  const refreshLibrary = async () => {
    try {
      const items = await listVideoLibrary();
      setLibrary(items);
    } catch (e: any) {
      console.warn('[GenerateVideo] library fetch failed:', e?.message);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    refreshLibrary();
    // refresh relative timestamps every minute
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Phase 4d — fetch the auth user once on mount so we can (a) key the
  // IndexedDB resume store and (b) thread userId into new render calls.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabase().auth.getUser();
        if (!cancelled) setUserId(data.user?.id ?? null);
      } catch (err) {
        console.warn('[GenerateVideo] auth.getUser failed:', (err as any)?.message ?? err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phase 4d — on mount (once userId is known), scan IndexedDB for any
  // in-flight renders that were live when the tab/browser/PC last died and
  // resume polling them. The server-side poll endpoint completes the
  // download + upload to Supabase Storage as soon as we ask, so this single
  // resume turns a disconnect-burnt credit back into a usable render.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const jobs = await listActiveJobs(userId);
      if (cancelled || jobs.length === 0) return;
      toast(
        `RESUMING ${jobs.length} IN-FLIGHT RENDER${jobs.length > 1 ? 'S' : ''}…`,
        { description: 'Reconnecting to renders that were live when you disconnected.' }
      );
      for (const job of jobs) {
        if (cancelled) return;
        const sceneLabel =
          job.sceneIdx !== undefined ? `SCENE ${String(job.sceneIdx + 1).padStart(2, '0')}` : 'ONE-SHOT';
        try {
          await resumeVideoOperation({
            operation: job.operation,
            prompt: job.prompt,
            sceneIdx: job.sceneIdx,
            model: job.model,
            aspectRatio: job.aspectRatio,
            duration: job.duration,
          });
          await clearActiveJob(job.jobId);
          toast.success(`${sceneLabel} RESUMED`, {
            description: 'Render rejoined the library.',
          });
          await refreshLibrary();
        } catch (err: any) {
          await clearActiveJob(job.jobId);
          const msg = err?.message ?? 'Unknown';
          toast.error(`${sceneLabel} RESUME FAILED`, {
            description: `${msg.slice(0, 120)} — re-generate to retry.`,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const renderedCount = useMemo(
    () => sceneStatus.filter((s) => s === 'done').length,
    [sceneStatus]
  );

  const queuedCount = useMemo(
    () => sceneStatus.filter((s) => s === 'queued' || s === 'rendering').length,
    [sceneStatus]
  );

  // referenced inside JSX to ensure re-render on tick (relative timestamps refresh)
  void tick;

  const setStatus = (idx: number, status: SceneStatus) => {
    setSceneStatus((prev) => {
      const next = [...prev];
      next[idx] = status;
      return next;
    });
  };

  const startElapsedTick = (idx: number) => {
    const startedAt = Date.now();
    setElapsed((prev) => ({ ...prev, [idx]: 0 }));
    elapsedTickRef.current = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed((prev) => ({ ...prev, [idx]: sec }));
    }, 1000);
  };

  const stopElapsedTick = () => {
    if (elapsedTickRef.current) {
      window.clearInterval(elapsedTickRef.current);
      elapsedTickRef.current = null;
    }
  };

  const handleModelPick = (m: VideoModelType) => {
    const newSpecs = VIDEO_MODEL_SPECS[m];
    if (newSpecs.locked) {
      toast.error(`${newSpecs.displayName.toUpperCase()} // BETA`, {
        description: 'Coming after integration. Beta launches with Veo 3.1 only.',
      });
      return;
    }
    setConfig((prev) => {
      const nextResolution = newSpecs.resolutions.includes(prev.resolution)
        ? prev.resolution
        : newSpecs.resolutions[0];
      const allowed = getValidDurations(m, nextResolution);
      const nextDuration = allowed.includes(prev.duration)
        ? prev.duration
        : allowed[allowed.length - 1] ?? newSpecs.durations[0];
      return {
        ...prev,
        model: m,
        duration: nextDuration,
        resolution: nextResolution,
        aspectRatio: newSpecs.aspectRatios.includes(prev.aspectRatio)
          ? prev.aspectRatio
          : newSpecs.aspectRatios[0],
      };
    });
    setModelPickerOpen(false);
  };

  const handleFrameUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: 'start' | 'end') => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    const { dataUrl } = await compressImageForUpload(file);
    setConfig((prev) => ({ ...prev, [slot === 'start' ? 'startFrame' : 'endFrame']: dataUrl }));
  };

  const handleSwapFrames = () => {
    setConfig((prev) => ({ ...prev, startFrame: prev.endFrame, endFrame: prev.startFrame }));
  };

  const handleGenerateSingle = async () => {
    if (!config.prompt.trim()) {
      toast.error('PROMPT REQUIRED');
      return;
    }
    if (isCurrentModelLocked) {
      toast.error('MODEL LOCKED', { description: 'Pick an active Veo 3.1 engine.' });
      return;
    }

    // Phase 4a — diagnostic: one log per user click. Correlates with
    // [grifon:gv:proxy] (client) and [grifon:gv:submit] (server) via requestId
    // injected in proxyGenerateVideo. If the double-render bug recurs, the log
    // pattern reveals which hypothesis (UI double-fire vs config-state race vs
    // server fan-out) is real.
    console.log('[grifon:gv:click]', {
      t: Date.now(),
      mode,
      activeIdx,
      model: config.model,
      resolution: config.resolution,
      duration: config.duration,
    });

    // Phase 4a — cost guardrail. If THIS scene's prompt already has at least
    // one persisted library render, confirm with the user before spending
    // credits on another. Match on (sceneIdx, prompt) so a fresh wizard run
    // doesn't falsely fire the guardrail against a prior storyboard's
    // unrelated render at the same scene index.
    if (mode === 'pipeline') {
      const promptTrim = config.prompt.trim();
      const sceneRenders = library.filter(
        (i) => i.sceneIdx === activeIdx && (i.prompt ?? '').trim() === promptTrim
      );
      if (sceneRenders.length > 0) {
        const action = await new Promise<'replace' | 'variant' | 'cancel'>((resolve) => {
          setConfirmDialog({ sceneIdx: activeIdx, count: sceneRenders.length, resolve });
        });
        if (action === 'cancel') return;
        if (action === 'replace') {
          try {
            const toDelete = sceneRenders[0]; // library is desc-sorted by createdAt
            // Phase 4h.2 — server-side delete (was silently failing client-side
            // due to RLS on bucket DELETE). Helper throws on failure.
            await deleteVideoLibraryItem(toDelete.path);
            toast('PREVIOUS RENDER REPLACED');
            void refreshLibrary();
          } catch (err: any) {
            console.warn('[grifon:gv:replace-delete] non-fatal:', err?.message ?? err);
          }
        }
      }
    }

    setError(null);
    setBusy(true);
    // Flip to PREVIEW immediately so the inline placeholder (start frame + spinner)
    // fires while Veo is rendering — instead of only the tiny scene-tile spinner.
    setCanvasView('preview');

    if (mode === 'pipeline') {
      setStatus(activeIdx, 'rendering');
      startElapsedTick(activeIdx);
    }

    const ctrl = new AbortController();
    singleAbortRef.current = ctrl;

    try {
      const result = await generateVideo(config, {
        signal: ctrl.signal,
        metadata: mode === 'pipeline' ? { sceneIdx: activeIdx } : undefined,
        userId: userId ?? undefined,
      });
      if (mode === 'pipeline') {
        setSceneResults((prev) => ({ ...prev, [activeIdx]: result }));
        setStatus(activeIdx, 'done');
        setPreviewItem({
          id: `session:scene-${activeIdx}`,
          url: result.url,
          downloadUrl: result.downloadUrl,
          mimeType: result.mimeType,
          prompt: config.prompt.trim(),
          sceneIdx: activeIdx,
          model: config.model,
          createdAt: new Date().toISOString(),
          source: 'session',
        });
      } else {
        setPreviewItem({
          id: `session:one-shot:${Date.now()}`,
          url: result.url,
          downloadUrl: result.downloadUrl,
          mimeType: result.mimeType,
          prompt: config.prompt.trim(),
          model: config.model,
          createdAt: new Date().toISOString(),
          source: 'session',
        });
      }
      setCanvasView('preview');
      void refreshLibrary();
      toast.success('RENDER COMPLETE');
    } catch (e: any) {
      const msg = e?.message ?? 'Unknown error';
      if (msg !== 'ABORTED') {
        setError(msg);
        if (mode === 'pipeline') setStatus(activeIdx, 'failed');
        toast.error('RENDER FAILED', { description: msg });
      } else if (mode === 'pipeline') {
        setStatus(activeIdx, 'ready');
      }
    } finally {
      stopElapsedTick();
      setBusy(false);
      singleAbortRef.current = null;
    }
  };

  const handleRenderAll = async () => {
    if (!hasSeedPrompts) return;
    if (isCurrentModelLocked) {
      toast.error('MODEL LOCKED', { description: 'Pick an active Veo 3.1 engine.' });
      return;
    }

    setError(null);
    setBusy(true);
    setCanvasView('preview'); // big-preview spinner fires for the active scene as the queue runs
    toast('PREPARING SCENE PIPELINE...', { description: 'Loading storyboard images.' });

    let jobs: RenderJob[];
    try {
      const prepared = await Promise.all(
        seedPrompts.map(async (p, i): Promise<RenderJob | null> => {
          if (sceneResults[i]) return null;
          const sceneImage = storyboard[i]?.imageUrl ?? storyboard[i]?.manualUploadUrl;
          let startFrame: string | undefined;
          if (sceneImage) {
            try {
              const raw = await urlToDataUrl(sceneImage);
              const compressed = await compressImageForUpload(raw);
              startFrame = compressed.dataUrl;
            } catch {
              // proceed without start frame for this job
            }
          }
          // Q4 — per-scene end-frame propagation. Single-scene UI (see the
          // useEffect around line ~180) loads endFrameImageUrl into
          // config.endFrame, but RENDER ALL's queue prep previously dropped
          // it on the floor — every scene rendered without its end frame,
          // collapsing the b-roll Scene 1 morph from start → end frame.
          const sceneEndImage = storyboard[i]?.endFrameImageUrl ?? storyboard[i]?.manualEndFrameUrl;
          let endFrame: string | undefined;
          if (sceneEndImage) {
            try {
              const raw = await urlToDataUrl(sceneEndImage);
              const compressed = await compressImageForUpload(raw);
              endFrame = compressed.dataUrl;
            } catch {
              // proceed without end frame for this job
            }
          }
          // Session B — auto-route this scene's engine from its type.
          // talking → Veo (avatars), b-roll/cinematic → Kling (morph). The
          // user's global picker becomes the fallback if the type isn't one
          // of the known three.
          const sceneModel = autoRouteModelForType(p.type, config.model);
          // Phase 6 — auto-compute per-scene duration from scriptLine.
          // RENDER ALL previously inherited the single config.duration value
          // (whatever scene was last viewed), forcing every clip to one length.
          // For Director AI scenes the AI already knows the optimal duration
          // via suggestDurationForScript; bypass the chip entirely.
          // Pass the AUTO-ROUTED model so Kling's [5,10] duration set is
          // consulted (not Veo's [4,6,8]) when a scene is routed to Kling.
          const scriptLine = storyboard[i]?.scriptLine;
          const sceneDuration = scriptLine
            ? suggestDurationForScript(scriptLine, sceneModel, config.resolution)
            : config.duration;
          setStatus(i, 'queued');
          return { sceneIdx: i, prompt: p.prompt, startFrame, endFrame, duration: sceneDuration, model: sceneModel };
        })
      );
      jobs = prepared.filter((j): j is RenderJob => j !== null);
    } catch (e: any) {
      setBusy(false);
      toast.error('PIPELINE_PREP_FAILED', { description: e?.message ?? 'Unknown' });
      return;
    }

    if (jobs.length === 0) {
      setBusy(false);
      toast('ALL SCENES ALREADY RENDERED');
      return;
    }

    const ctrl = new AbortController();
    queueAbortRef.current = ctrl;

    const startedAtPerScene = new Map<number, number>();
    const startTick = (idx: number) => {
      startedAtPerScene.set(idx, Date.now());
      setElapsed((prev) => ({ ...prev, [idx]: 0 }));
      if (elapsedTickRef.current) window.clearInterval(elapsedTickRef.current);
      elapsedTickRef.current = window.setInterval(() => {
        const startedAt = startedAtPerScene.get(idx);
        if (startedAt) {
          setElapsed((prev) => ({ ...prev, [idx]: Math.floor((Date.now() - startedAt) / 1000) }));
        }
      }, 1000);
    };

    const onEvent = (evt: QueueEvent) => {
      if (evt.type === 'status') {
        setStatus(evt.sceneIdx, evt.status);
        if (evt.status === 'rendering') startTick(evt.sceneIdx);
        if (evt.status === 'done' && evt.result) {
          setSceneResults((prev) => ({ ...prev, [evt.sceneIdx]: evt.result! }));
          stopElapsedTick();
          // Promote the latest finished scene into the big preview
          setPreviewItem({
            id: `session:scene-${evt.sceneIdx}`,
            url: evt.result.url,
            downloadUrl: evt.result.downloadUrl,
            mimeType: evt.result.mimeType,
            prompt: seedPrompts[evt.sceneIdx]?.prompt ?? '',
            sceneIdx: evt.sceneIdx,
            model: config.model,
            createdAt: new Date().toISOString(),
            source: 'session',
          });
          setCanvasView('preview');
          void refreshLibrary();
        }
        if (evt.status === 'failed') {
          stopElapsedTick();
        }
      } else if (evt.type === 'rate-limited') {
        stopElapsedTick();
        setResumeAt(Date.now() + evt.retryAfterSec * 1000);
        const eta = formatEta(evt.retryAfterSec);
        const pendingCount = jobs.length - renderedCount;
        toast('RATE LIMIT HIT', {
          description: `${pendingCount} scene(s) queued — resumes in ${eta}.`,
          duration: 8000,
        });
      } else if (evt.type === 'resumed') {
        toast('RESUMING QUEUE...');
      } else if (evt.type === 'complete') {
        toast.success('SCENE PIPELINE COMPLETE');
      }
    };

    try {
      await runQueue(jobs, {
        config: {
          model: config.model,
          duration: config.duration,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
          audioEnabled: false,
        },
        signal: ctrl.signal,
        onEvent,
        userId: userId ?? undefined,
      });
    } catch (e: any) {
      const msg = e?.message ?? 'Queue error';
      if (msg !== 'ABORTED') {
        setError(msg);
        toast.error('PIPELINE FAILED', { description: msg });
      }
    } finally {
      stopElapsedTick();
      setBusy(false);
      queueAbortRef.current = null;
    }
  };

  const handleCancelAll = () => {
    queueAbortRef.current?.abort();
    singleAbortRef.current?.abort();
    setBusy(false);
    toast('CANCELLED');
  };

  const labelCaps = 'text-[10px] text-zinc-500 font-mono uppercase tracking-widest';
  const ghostBtn =
    'bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all rounded-xl';

  /* ─── HEADER ─── */
  const Header = (
    <header className="flex flex-col items-start gap-4 mb-8 w-full border-b border-white/10 pb-6 relative">
      <div className="flex items-center justify-between w-full gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden md:inline">COMMAND CENTER</span>
          <span className="md:hidden">BACK</span>
        </button>
        {hasSeedPrompts && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-white/10 bg-zinc-950">
            <button
              onClick={() => setMode('pipeline')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                mode === 'pipeline' ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setMode('one-shot')}
              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                mode === 'one-shot' ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'
              }`}
            >
              One-Shot
            </button>
          </div>
        )}
      </div>
      <div>
        <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight break-words whitespace-normal leading-tight">
          Generate Video
        </h1>
        <p className={`${labelCaps} mt-2`}>
          //{' '}
          {mode === 'pipeline'
            ? `SCENE PIPELINE · ${renderedCount}/${seedPrompts.length} RENDERED`
            : 'ONE-SHOT CLIP'}
        </p>
      </div>
    </header>
  );

  /* ─── MODEL PILL ─── */
  const ModelPill = (
    <div className="relative" ref={modelMenuRef}>
      <button
        onClick={() => setModelPickerOpen((o) => !o)}
        className={`w-full ${ghostBtn} px-4 py-3 flex items-center justify-between gap-3`}
      >
        <div className="flex flex-col items-start gap-0.5 text-left min-w-0">
          <span className="text-[9px] font-black text-[#FFCC00] uppercase tracking-widest">
            {specs.displayName}
          </span>
          <span className="text-[10px] text-zinc-400 truncate">{specs.tagline}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${modelPickerOpen ? 'rotate-180' : ''}`} />
      </button>
      {modelPickerOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-[0_0_30px_rgba(0,0,0,0.6)] max-h-[420px] overflow-y-auto custom-scrollbar">
          <div className={`${labelCaps} px-3 py-2`}>// ACTIVE</div>
          {ACTIVE_MODELS.map((m) => {
            const ms = VIDEO_MODEL_SPECS[m];
            const isSelected = config.model === m;
            return (
              <button
                key={m}
                onClick={() => handleModelPick(m)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                  isSelected
                    ? 'bg-[#FFCC00]/10 border border-[#FFCC00]/40'
                    : 'border border-transparent hover:bg-white/5'
                }`}
              >
                <div className="text-[10px] font-black text-white uppercase tracking-widest">
                  {ms.displayName}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{ms.tagline}</div>
              </button>
            );
          })}
          <div className={`${labelCaps} px-3 py-2 mt-2`}>// LOCKED</div>
          {LOCKED_MODELS.map((m) => {
            const ms = VIDEO_MODEL_SPECS[m];
            return (
              <button
                key={m}
                onClick={() => handleModelPick(m)}
                className="w-full text-left px-3 py-2.5 rounded-xl border border-transparent hover:bg-white/5 opacity-50 cursor-not-allowed"
                title="BETA — Coming after integration. Beta launches with Veo 3.1 only."
              >
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    {ms.displayName}
                  </div>
                  <span className="text-[7px] font-black text-[#FFCC00] bg-[#FFCC00]/10 border border-[#FFCC00]/30 rounded-full px-1.5 py-0.5 uppercase tracking-widest">
                    BETA
                  </span>
                </div>
                <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{ms.tagline}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ─── SETTINGS CHIP ─── */
  const SettingsChip = (
    <div className="relative" ref={settingsMenuRef}>
      <button
        onClick={() => setSettingsOpen((o) => !o)}
        className={`w-full ${ghostBtn} px-4 py-2.5 flex items-center justify-between gap-3 text-[10px] font-mono uppercase tracking-widest`}
      >
        <span className="text-zinc-300">
          {config.aspectRatio} · {config.duration}s · {config.resolution}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
      </button>
      {settingsOpen && (
        <div className="absolute z-50 top-full mt-2 left-0 right-0 bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          <div>
            <div className={labelCaps}>Aspect Ratio</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specs.aspectRatios.map((r) => (
                <button
                  key={r}
                  onClick={() => setConfig((p) => ({ ...p, aspectRatio: r }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                    config.aspectRatio === r
                      ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={labelCaps}>Duration</div>
            {/* Phase 6 — in pipeline mode the AI auto-computes per-scene
                duration at RENDER ALL time from each scene's scriptLine.
                Hiding the chips removes the manual-click-per-scene UX trap
                where users believed they were configuring each scene
                independently but config.duration only stored one value. */}
            {storyboard?.[activeIdx]?.scriptLine ? (
              <div className="mt-2 text-[10px] text-zinc-500 font-mono leading-snug">
                // AI AUTO-DURATION · {suggestedDuration ?? config.duration}s for this scene · per-scene at render
              </div>
            ) : (
            <div className="flex flex-wrap gap-1.5 mt-2 items-center">
              {specs.durations.map((d) => {
                const allowedDurations = getValidDurations(config.model, config.resolution);
                const isAllowed = allowedDurations.includes(d);
                const isActive = config.duration === d;
                const isAuto =
                  isActive &&
                  suggestedDuration === d &&
                  !manualDurationByScene[activeIdx];
                return (
                  <button
                    key={d}
                    onClick={() => {
                      if (!isAllowed) return;
                      setConfig((p) => ({ ...p, duration: d }));
                      if (mode === 'pipeline') {
                        setManualDurationByScene((m) => ({ ...m, [activeIdx]: true }));
                      }
                    }}
                    disabled={!isAllowed}
                    title={
                      isAllowed
                        ? undefined
                        : `Locked by ${config.resolution}. Switch to 720p (or another engine) to unlock ${d}s.`
                    }
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all flex items-center gap-1.5 ${
                      !isAllowed
                        ? 'border-white/5 text-zinc-700 cursor-not-allowed'
                        : isActive
                        ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10'
                        : 'border-white/10 text-zinc-500 hover:text-white'
                    }`}
                  >
                    {d}s
                    {isAuto && (
                      <span className="text-[8px] text-[#FFCC00]/70 font-mono">AUTO</span>
                    )}
                  </button>
                );
              })}
            </div>
            )}
            {/* Phase 6 — old "Smart-picked · click to override" hint suppressed
                when scriptLine is present (pipeline mode now uses the inline
                "// AI AUTO-DURATION" line above and there's no chip to click).
                Hint still shows for manual-mode runs without a scriptLine. */}
            {suggestedDuration !== null && hasSeedPrompts && !storyboard?.[activeIdx]?.scriptLine && (() => {
              const scriptLine = storyboard?.[activeIdx]?.scriptLine ?? '';
              const words = scriptLine.trim().split(/\s+/).filter(Boolean).length;
              if (!words) return null;
              const overridden = !!manualDurationByScene[activeIdx];
              return (
                <div className="mt-2 text-[9px] text-zinc-500 font-mono leading-snug">
                  {overridden ? (
                    <>// Manual override · Smart pick was {suggestedDuration}s for {words}-word script</>
                  ) : (
                    <>// Smart-picked for ~{words}-word script · click to override</>
                  )}
                </div>
              );
            })()}
          </div>
          <div>
            <div className={labelCaps}>Resolution</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specs.resolutions.map((res) => (
                <button
                  key={res}
                  onClick={() => {
                    const allowed = getValidDurations(config.model, res);
                    setConfig((p) => {
                      const next = { ...p, resolution: res };
                      if (!allowed.includes(p.duration)) {
                        const clamped = allowed[allowed.length - 1] ?? p.duration;
                        toast(`${VIDEO_MODEL_SPECS[p.model].displayName} locks ${res} to ${clamped}s`, {
                          description: 'Duration auto-set. Switch to 720p for more pacing options.',
                          duration: 5000,
                        });
                        next.duration = clamped;
                      }
                      return next;
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                    config.resolution === res
                      ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            {config.model === 'Veo_3.1_Lite' && config.resolution === '1080p' && (
              <div className="mt-2 text-[10px] text-[#FFCC00]/70 font-mono uppercase tracking-widest">
                // Veo 3.1 Lite @ 1080p · all clips locked to 8s
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── FRAME CARD ─── */
  const FrameCard: React.FC<{
    label: string;
    dataUrl?: string;
    onPick: () => void;
    onClear: () => void;
    hint: string;
  }> = ({ label, dataUrl, onPick, onClear, hint }) => (
    <div className="flex-1 space-y-2">
      <div className={labelCaps}>{label}</div>
      <div
        onClick={onPick}
        className="aspect-video bg-zinc-950 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] transition-all cursor-pointer overflow-hidden relative group"
      >
        {dataUrl ? (
          <>
            <img src={dataUrl} alt={label} className="w-full h-full object-cover" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-zinc-950/80 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-red-500/60"
              title="Clear frame"
            >
              <X className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-zinc-600">
            <UploadCloud className="w-5 h-5" />
            <span className="text-[8px] uppercase tracking-widest font-mono">{hint}</span>
          </div>
        )}
      </div>
    </div>
  );

  /* ─── EDIT VIEW (inside CanvasPanel) ─── */
  const EditView = (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="sm:flex-1">{ModelPill}</div>
        <div className="sm:w-56">{SettingsChip}</div>
      </div>

      <div className="space-y-2">
        <div className={labelCaps}>// KINETIC DIRECTIVE</div>
        <textarea
          value={config.prompt}
          onChange={(e) => setConfig((p) => ({ ...p, prompt: e.target.value }))}
          placeholder={
            mode === 'pipeline'
              ? 'Scene prompt loaded from storyboard. Edit to refine.'
              : 'Describe the action you want to see. e.g. A fast drone shot through neon rain.'
          }
          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all min-h-[140px] font-mono leading-relaxed text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className={labelCaps}>// FRAMES</div>
          {(config.startFrame || config.endFrame) && (
            <button
              onClick={handleSwapFrames}
              className={`${ghostBtn} px-2.5 py-1 text-[9px] flex items-center gap-1.5`}
              title="Swap start and end frames"
            >
              <ArrowLeftRight className="w-3 h-3" />
              SWAP
            </button>
          )}
        </div>
        <div className="flex gap-3">
          <FrameCard
            label="START"
            dataUrl={config.startFrame}
            onPick={() => startFrameRef.current?.click()}
            onClear={() => setConfig((p) => ({ ...p, startFrame: undefined }))}
            hint="ANCHOR"
          />
          <FrameCard
            label="END"
            dataUrl={config.endFrame}
            onPick={() => endFrameRef.current?.click()}
            onClear={() => setConfig((p) => ({ ...p, endFrame: undefined }))}
            hint="PAYOFF"
          />
        </div>
        <input
          type="file"
          hidden
          ref={startFrameRef}
          onChange={(e) => handleFrameUpload(e, 'start')}
          accept="image/*"
        />
        <input
          type="file"
          hidden
          ref={endFrameRef}
          onChange={(e) => handleFrameUpload(e, 'end')}
          accept="image/*"
        />
      </div>

      <div className="flex flex-col items-stretch gap-2 pt-2">
        <GoldButton
          onClick={handleGenerateSingle}
          disabled={busy || !config.prompt.trim() || isCurrentModelLocked}
          className="w-full"
        >
          {busy
            ? 'RENDERING...'
            : mode === 'pipeline'
            ? `GENERATE SCENE ${String(activeIdx + 1).padStart(2, '0')}`
            : 'GENERATE CLIP'}
        </GoldButton>
        {busy && (singleAbortRef.current || queueAbortRef.current) && (
          <button
            onClick={handleCancelAll}
            className="text-[10px] font-mono uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
          >
            ABORT
          </button>
        )}
        {error && !busy && (
          <p className="text-red-400 text-[10px] font-mono uppercase tracking-widest border border-red-900/50 bg-red-900/20 px-3 py-2 rounded-xl break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  );

  /* ─── PREVIEW VIEW (inside CanvasPanel) ─── */
  const handleUsePromptFromPreview = () => {
    if (!previewItem) return;
    setConfig((p) => ({ ...p, prompt: previewItem.prompt }));
    setCanvasView('edit');
    toast('PROMPT LOADED');
  };

  const handleRerender = () => {
    if (!previewItem) return;
    setConfig((p) => ({ ...p, prompt: previewItem.prompt }));
    setCanvasView('edit');
    // brief delay so user sees the prompt loaded before kicking off
    window.setTimeout(() => handleGenerateSingle(), 100);
  };

  const isShowingLoadingPlaceholder = busy && canvasView === 'preview';
  const activeElapsed = mode === 'pipeline' ? elapsed[activeIdx] ?? 0 : 0;

  const PreviewView = (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      {isShowingLoadingPlaceholder ? (
        <div className="relative w-full max-h-[60vh] aspect-video rounded-xl border border-[#FFCC00]/40 bg-zinc-950 overflow-hidden">
          {config.startFrame ? (
            <img
              src={config.startFrame}
              alt="Rendering from this anchor frame"
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-700">
              <VideoIcon className="w-16 h-16" />
            </div>
          )}
          <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-12 h-12 text-[#FFCC00] animate-spin" />
            <div className="text-[10px] text-[#FFCC00] font-black uppercase tracking-widest font-mono">
              RENDERING {activeElapsed > 0 ? `· ${activeElapsed}s` : ''}
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">
              {mode === 'pipeline'
                ? `SCENE ${String(activeIdx + 1).padStart(2, '0')} · ${specs.displayName}`
                : specs.displayName}
            </div>
          </div>
        </div>
      ) : previewItem ? (
        <>
          <video
            key={previewItem.url}
            src={previewItem.url}
            controls
            autoPlay
            loop
            className="w-full max-h-[60vh] rounded-xl border border-[#FFCC00]/40 shadow-[0_0_30px_rgba(255,204,0,0.15)] bg-black"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
              {previewItem.sceneIdx !== undefined && (
                <span className="text-[#FFCC00] font-black">
                  SCENE {String(previewItem.sceneIdx + 1).padStart(2, '0')}
                </span>
              )}
              {previewItem.model && (
                <span className="text-zinc-500">
                  · {VIDEO_MODEL_SPECS[previewItem.model]?.displayName ?? previewItem.model}
                </span>
              )}
              {previewItem.createdAt && (
                <span className="text-zinc-600">
                  · {formatRelativeTime(previewItem.createdAt)}
                </span>
              )}
            </div>
            {previewItem.prompt && (
              <p className="text-[11px] text-zinc-400 font-mono leading-relaxed line-clamp-3">
                "{previewItem.prompt}"
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={previewItem.downloadUrl}
              download={`grifon-${previewItem.sceneIdx !== undefined ? `scene-${String(previewItem.sceneIdx + 1).padStart(2, '0')}` : 'clip'}.mp4`}
              className={`${ghostBtn} flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2`}
            >
              <Download className="w-3 h-3" /> Download
            </a>
            <button
              onClick={handleUsePromptFromPreview}
              className={`${ghostBtn} flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2`}
            >
              <Pencil className="w-3 h-3" /> Use Prompt
            </button>
            <button
              onClick={handleRerender}
              disabled={busy}
              className={`${ghostBtn} flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              <RotateCw className="w-3 h-3" /> Re-render
            </button>
          </div>
        </>
      ) : (
        <div className="w-full aspect-video rounded-xl border border-white/10 bg-zinc-950 flex flex-col items-center justify-center gap-2 text-zinc-600">
          <VideoIcon className="w-12 h-12 opacity-50" />
          <div className="text-[10px] font-mono uppercase tracking-widest">
            Generate a clip to preview it here.
          </div>
        </div>
      )}
    </div>
  );

  /* ─── CANVAS PANEL ─── */
  const canPreview = !!previewItem || isShowingLoadingPlaceholder;
  const CanvasPanel = (
    <GlassPanel className="flex-1 flex flex-col gap-5 p-5 sm:p-6 lg:p-7 min-h-[480px]">
      <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-zinc-950 self-start">
        <button
          onClick={() => setCanvasView('edit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            canvasView === 'edit' ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'
          }`}
        >
          <Pencil className="w-3 h-3" /> Edit
        </button>
        <button
          onClick={() => canPreview && setCanvasView('preview')}
          disabled={!canPreview}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
            canvasView === 'preview'
              ? 'bg-[#FFCC00] text-black'
              : canPreview
              ? 'text-zinc-500 hover:text-white'
              : 'text-zinc-700 cursor-not-allowed'
          }`}
        >
          <Eye className="w-3 h-3" /> Preview
        </button>
      </div>

      {canvasView === 'edit' ? EditView : PreviewView}
    </GlassPanel>
  );

  /* ─── RAIL TILE ─── */
  const handleRailTileClick = (item: VideoLibraryItem) => {
    setPreviewItem({
      id: `library:${item.path}`,
      url: item.url,
      downloadUrl: item.downloadUrl,
      mimeType: item.mimeType,
      prompt: item.prompt,
      sceneIdx: item.sceneIdx,
      model: item.model,
      createdAt: item.createdAt,
      source: 'library',
    });
    setCanvasView('preview');
  };

  const handleTileUsePrompt = (e: React.MouseEvent, item: VideoLibraryItem) => {
    e.stopPropagation();
    setConfig((p) => ({ ...p, prompt: item.prompt }));
    setCanvasView('edit');
    toast('PROMPT LOADED');
  };

  // Phase 4g.4 + 4h.2 — Delete a single library entry (mp4 + sidecar) via
  // server endpoint. Server uses supabaseAdmin (service role) and verifies
  // user ownership via path prefix, bypassing the RLS gap on the bucket
  // that was silently failing client-side `storage.remove()` calls.
  // If the tile being deleted is currently selected in the preview canvas,
  // clear the preview so we don't show a dead signed URL.
  const handleTileDelete = async (e: React.MouseEvent, item: VideoLibraryItem) => {
    e.stopPropagation();
    if (!confirm(`Delete this render? This can't be undone.`)) return;
    try {
      await deleteVideoLibraryItem(item.path);
      if (previewItem?.url === item.url) {
        setPreviewItem(null);
        setCanvasView('edit');
      }
      toast.success('RENDER DELETED');
      void refreshLibrary();
    } catch (err: any) {
      console.warn('[grifon:gv:delete] failed:', err?.message ?? err);
      toast.error('DELETE FAILED', { description: err?.message?.slice(0, 120) ?? 'Unknown error' });
    }
  };

  const renderRailTile = (item: VideoLibraryItem, variants?: VideoLibraryItem[]) => {
    const tileId = `library:${item.path}`;
    const isSelected = previewItem?.id === tileId;
    const sceneLabel =
      item.sceneIdx !== undefined ? `SCENE ${String(item.sceneIdx + 1).padStart(2, '0')}` : 'ONE-SHOT';
    const variantCount = variants?.length ?? 1;
    return (
      <div
        key={item.path}
        onClick={() => handleRailTileClick(item)}
        className={`relative rounded-xl border bg-zinc-950 overflow-hidden cursor-pointer transition-all ${
          isSelected
            ? 'border-[#FFCC00] ring-1 ring-[#FFCC00]/50 shadow-[0_0_15px_rgba(255,204,0,0.3)]'
            : 'border-white/10 hover:border-white/30'
        }`}
      >
        {variantCount > 1 && (
          <div
            className="absolute top-1.5 right-1.5 z-10 text-[8px] font-black bg-[#FFCC00]/20 text-[#FFCC00] px-1.5 py-0.5 rounded-full backdrop-blur-sm border border-[#FFCC00]/40"
            title={`${variantCount} renders of this scene/prompt`}
          >
            {variantCount}×
          </div>
        )}
        <video
          src={item.url}
          loop
          muted
          playsInline
          preload="metadata"
          onMouseEnter={(e) => {
            const v = e.currentTarget;
            v.play().catch(() => {});
          }}
          onMouseLeave={(e) => {
            const v = e.currentTarget;
            v.pause();
            v.currentTime = 0;
          }}
          className="w-full aspect-video object-cover bg-black"
        />
        <div className="p-3 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div
              className={`text-[9px] font-black uppercase tracking-widest ${
                item.sceneIdx !== undefined ? 'text-[#FFCC00]' : 'text-zinc-400'
              }`}
            >
              {sceneLabel}
            </div>
            <div className="text-[8px] text-zinc-600 font-mono">
              {formatRelativeTime(item.createdAt)}
            </div>
          </div>
          <div className="text-[9px] text-zinc-400 line-clamp-2 font-mono leading-snug min-h-[2.4em]">
            {item.prompt || '—'}
          </div>
          <div className="flex gap-1.5 pt-1">
            <a
              href={item.downloadUrl}
              download={`grifon-${
                item.sceneIdx !== undefined
                  ? `scene-${String(item.sceneIdx + 1).padStart(2, '0')}`
                  : 'clip'
              }.mp4`}
              onClick={(e) => e.stopPropagation()}
              className={`flex-1 ${ghostBtn} flex items-center justify-center gap-1 text-[9px] font-mono uppercase tracking-widest py-1.5`}
              title="Download"
            >
              <Download className="w-3 h-3" />
            </a>
            <button
              onClick={(e) => handleTileUsePrompt(e, item)}
              className={`flex-1 ${ghostBtn} flex items-center justify-center gap-1 text-[9px] font-mono uppercase tracking-widest py-1.5`}
              title="Use this prompt"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleTileDelete(e, item)}
              className="flex-1 bg-zinc-950 border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-500/50 transition-all rounded-xl flex items-center justify-center gap-1 text-[9px] font-mono uppercase tracking-widest py-1.5"
              title="Delete this render"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Phase 4c — dedupe library tiles by (sceneIdx, prompt). Multiple renders of
  // the same prompt collapse into one tile with a variant-count pill. Library
  // is already sorted desc by createdAt server-side, so group[0] is the newest.
  const deduplicatedLibrary = useMemo(() => {
    const groups = new Map<string, VideoLibraryItem[]>();
    for (const item of library) {
      const key = `${item.sceneIdx ?? 'one-shot'}::${(item.prompt ?? '').trim()}`;
      const existing = groups.get(key);
      if (existing) existing.push(item);
      else groups.set(key, [item]);
    }
    return Array.from(groups.values()).map((group) => ({
      primary: group[0],
      variants: group,
    }));
  }, [library]);

  /* ─── RENDERED RAIL ─── */
  const RenderedRail = (
    <GlassPanel className="w-full lg:w-72 shrink-0 flex flex-col gap-4 p-5 max-h-[640px] lg:max-h-none">
      <div className="flex items-center justify-between">
        <div className={labelCaps}>// RENDERED</div>
        <div className="text-[10px] font-black text-[#FFCC00] font-mono">
          {hasSeedPrompts ? (
            <>
              {renderedCount}
              <span className="text-zinc-500">/{seedPrompts.length}</span>
            </>
          ) : (
            <span>{deduplicatedLibrary.length}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 -mr-1">
        {libraryLoading ? (
          <div className="space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden">
                <div className="aspect-video bg-white/5" />
                <div className="p-3 space-y-2">
                  <div className="h-2 bg-white/10 rounded w-1/2" />
                  <div className="h-2 bg-white/10 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : deduplicatedLibrary.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
            <VideoIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            Your renders show up here.
            <br />
            They stay for 24 hours.
            <br />
            <span className="text-zinc-700 normal-case tracking-normal">
              {hasSeedPrompts ? 'Click RENDER ALL to start.' : 'Generate a clip to begin.'}
            </span>
          </div>
        ) : (
          deduplicatedLibrary.map((group) => renderRailTile(group.primary, group.variants))
        )}
      </div>
    </GlassPanel>
  );

  /* ─── SCENE PIPELINE PANEL (left) ─── */
  const PipelinePanel = (
    <GlassPanel className="w-full lg:w-64 shrink-0 flex flex-col gap-4 p-5 max-h-[480px] lg:max-h-none">
      <div className="flex items-center justify-between">
        <div className={labelCaps}>// SCENES</div>
        <div className="text-[10px] font-black text-zinc-400 font-mono">{seedPrompts.length}</div>
      </div>
      <div className="flex-1 lg:overflow-y-auto custom-scrollbar -mr-1 pr-1">
        <SceneQueue
          seedPrompts={seedPrompts}
          storyboard={storyboard}
          activeIdx={activeIdx}
          status={sceneStatus}
          elapsed={elapsed}
          onSelect={setActiveIdx}
          renderedSceneIdxs={renderedSceneIdxs}
          perSceneModels={seedPrompts.map((p) => autoRouteModelForType(p.type, config.model))}
        />
      </div>
    </GlassPanel>
  );

  const handleSendToSignalFromBar = () => {
    if (!onSendToSignalModulator) return;
    const batch: SceneBatchEntry[] = seedPrompts.map((p, i) => ({
      sceneIdx: i,
      scriptLine: storyboard[i]?.scriptLine ?? '',
      renderedUrl: sceneResults[i]?.url,
      type: p.type,
    }));
    onSendToSignalModulator(batch);
  };

  /* ─── STICKY PIPELINE COMMAND BAR ─── */
  const PipelineCommandBar = (
    <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-3 mb-5 bg-zinc-950/95 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] border border-[#FFCC00]/30 bg-[#FFCC00]/5 rounded px-2 py-1 whitespace-nowrap">
          // PIPELINE · {renderedCount}/{seedPrompts.length} RENDERED
        </span>

        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 border border-white/10 bg-zinc-950 rounded px-2 py-1 whitespace-nowrap hidden sm:inline-flex items-center">
          {specs?.displayName ?? config.model} · {config.aspectRatio} · {config.resolution} · {config.duration}s
        </span>

        {resumeAt && (
          <span
            className="text-[10px] font-mono uppercase tracking-widest text-amber-400 border border-amber-500/30 bg-amber-500/5 rounded px-2 py-1 whitespace-nowrap"
            title="Veo enforces an hourly quota. Scenes auto-resume when the window clears — no action needed."
          >
            // RATE LIMITED · {queuedCount} queued · {formatEta(Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000)))} to resume · AUTO-RESUMES
          </span>
        )}

        <div className="flex-1" />

        {onSendToSignalModulator && renderedCount === seedPrompts.length && renderedCount > 0 ? (
          <button
            type="button"
            onClick={handleSendToSignalFromBar}
            className="text-[10px] font-mono font-bold tracking-widest uppercase rounded-xl border border-[#FFCC00]/40 bg-[#FFCC00]/10 text-[#FFCC00] px-4 py-2.5 hover:bg-[#FFCC00]/20 hover:border-[#FFCC00] transition-all whitespace-nowrap"
            title="Pass scriptLines + rendered MP4 URLs to Signal Modulator for batch voice generation"
          >
            // SEND TO SIGNAL MODULATOR ↗
          </button>
        ) : busy ? (
          <button
            type="button"
            onClick={handleCancelAll}
            className="text-[10px] font-bold tracking-widest uppercase rounded-xl bg-zinc-950 border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all whitespace-nowrap px-4 py-2.5"
          >
            Cancel Pipeline
          </button>
        ) : (
          <GoldButton
            onClick={handleRenderAll}
            disabled={seedPrompts.length === 0 || isCurrentModelLocked}
            className="py-2.5 px-4 text-[10px] tracking-widest flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Render All {seedPrompts.length}
          </GoldButton>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-950 text-white font-mono flex flex-col p-4 sm:p-6 md:p-8">
        {Header}

        {mode === 'pipeline' && hasSeedPrompts && PipelineCommandBar}

        {mode === 'pipeline' && hasSeedPrompts ? (
          <div className="flex flex-col lg:flex-row gap-5 flex-1">
            {PipelinePanel}
            {CanvasPanel}
            {RenderedRail}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5 flex-1">
            {CanvasPanel}
            {RenderedRail}
          </div>
        )}
      </div>

      {/* Phase 4a — cost guardrail confirm dialog */}
      {confirmDialog &&
        createPortal(
          <div
            className="fixed inset-0 bg-zinc-950/80 flex items-center justify-center z-50 p-4"
            onClick={() => handleDialogAction('cancel')}
            role="dialog"
            aria-modal="true"
            aria-label="Cost guardrail confirmation"
          >
            <GlassPanel
              className="w-full max-w-md p-6 flex flex-col gap-5"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <div className={labelCaps}>// COST GUARDRAIL</div>
                <h2 className="text-lg font-black bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-wide">
                  SCENE {String(confirmDialog.sceneIdx + 1).padStart(2, '0')} already has{' '}
                  {confirmDialog.count} render{confirmDialog.count > 1 ? 's' : ''}
                </h2>
                <p className="text-[11px] text-zinc-400 font-mono leading-relaxed">
                  Generating again will spend another credit. Choose how to proceed.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <GoldButton
                  onClick={() => handleDialogAction('replace')}
                  className="w-full"
                >
                  <span className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest">
                    <RotateCw className="w-3.5 h-3.5" />
                    Replace previous
                  </span>
                </GoldButton>
                <button
                  onClick={() => handleDialogAction('variant')}
                  className={`${ghostBtn} w-full py-2.5 text-[11px] font-black uppercase tracking-widest`}
                >
                  Add variant
                </button>
                <button
                  onClick={() => handleDialogAction('cancel')}
                  className="w-full py-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </GlassPanel>
          </div>,
          document.body
        )}
    </>
  );
};

export default GenerateVideo;
