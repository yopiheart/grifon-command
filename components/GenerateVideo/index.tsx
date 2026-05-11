import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronDown,
  ArrowLeftRight,
  Download,
  RotateCw,
  Sparkles,
  UploadCloud,
  Video as VideoIcon,
  X,
  Play,
} from 'lucide-react';
import type { VideoGenConfig, VideoModelType, VideoPrompt, Scene } from '../../types';
import {
  VIDEO_MODEL_SPECS,
  generateVideo,
  GeneratedVideoResult,
} from '../../services/geminiService';
import { compressImageForUpload } from '../../utils/imageCompression';
import { GoldButton } from '../ui/GoldButton';
import { GlassPanel } from '../ui/GlassPanel';
import { SceneQueue } from './SceneQueue';
import {
  runQueue,
  urlToDataUrl,
  type SceneStatus,
  type RenderJob,
  type QueueEvent,
} from './RenderAllRunner';

type Mode = 'pipeline' | 'one-shot';

interface GenerateVideoProps {
  onBack: () => void;
  seedPrompts?: VideoPrompt[];
  storyboard?: Scene[];
  defaultAspectRatio?: '9:16' | '16:9' | null;
}

const ACTIVE_MODELS: VideoModelType[] = ['Veo_3.1_Fast', 'Veo_3.1_Quality', 'Veo_3.1_Lite'];
const LOCKED_MODELS: VideoModelType[] = ['Kling_3_0', 'Seedance_2_0_Fast', 'Seedance_2_0_Quality'];

const initialConfig = (defaultAspectRatio?: '9:16' | '16:9' | null): VideoGenConfig => ({
  model: 'Veo_3.1_Fast',
  duration: 8,
  resolution: '1080p',
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
  const [oneShotResult, setOneShotResult] = useState<GeneratedVideoResult | null>(null);

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
      urlToDataUrl(sceneImage)
        .then((dataUrl) => setConfig((prev) => ({ ...prev, startFrame: dataUrl })))
        .catch(() => {});
    } else {
      setConfig((prev) => ({ ...prev, startFrame: undefined }));
    }
  }, [activeIdx, hasSeedPrompts, seedPrompts, storyboard]);

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

  const renderedCount = useMemo(
    () => sceneStatus.filter((s) => s === 'done').length,
    [sceneStatus]
  );

  const queuedCount = useMemo(
    () => sceneStatus.filter((s) => s === 'queued' || s === 'rendering').length,
    [sceneStatus]
  );

  const galleryItems = useMemo(() => {
    const items: { idx: number; result: GeneratedVideoResult; scriptLine: string }[] = [];
    for (let i = 0; i < seedPrompts.length; i++) {
      const r = sceneResults[i];
      if (r) items.push({ idx: i, result: r, scriptLine: seedPrompts[i].scriptLine });
    }
    if (oneShotResult) {
      items.push({
        idx: -1,
        result: oneShotResult,
        scriptLine: config.prompt.slice(0, 60),
      });
    }
    return items.reverse();
  }, [seedPrompts, sceneResults, oneShotResult, config.prompt]);

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
    setConfig((prev) => ({
      ...prev,
      model: m,
      duration: newSpecs.durations.includes(prev.duration) ? prev.duration : newSpecs.durations[0],
      resolution: newSpecs.resolutions.includes(prev.resolution)
        ? prev.resolution
        : newSpecs.resolutions[0],
      aspectRatio: newSpecs.aspectRatios.includes(prev.aspectRatio)
        ? prev.aspectRatio
        : newSpecs.aspectRatios[0],
    }));
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

    setError(null);
    setBusy(true);

    if (mode === 'pipeline') {
      setStatus(activeIdx, 'rendering');
      startElapsedTick(activeIdx);
    }

    const ctrl = new AbortController();
    singleAbortRef.current = ctrl;

    try {
      const result = await generateVideo(config, { signal: ctrl.signal });
      if (mode === 'pipeline') {
        setSceneResults((prev) => ({ ...prev, [activeIdx]: result }));
        setStatus(activeIdx, 'done');
      } else {
        setOneShotResult(result);
      }
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
              startFrame = await urlToDataUrl(sceneImage);
            } catch {
              // proceed without start frame for this job
            }
          }
          setStatus(i, 'queued');
          return { sceneIdx: i, prompt: p.prompt, startFrame };
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
    <header className="flex items-center justify-between gap-3 mb-6 w-full border-b border-white/10 pb-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-zinc-500 hover:text-white uppercase tracking-widest transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden md:inline">COMMAND CENTER</span>
        <span className="md:hidden">BACK</span>
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 uppercase tracking-tight leading-tight">
          Generate Video
        </h1>
        <p className={`${labelCaps} mt-1`}>
          //{' '}
          {mode === 'pipeline'
            ? `SCENE PIPELINE · ${renderedCount}/${seedPrompts.length} RENDERED`
            : 'ONE-SHOT CLIP'}
        </p>
      </div>
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
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specs.durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setConfig((p) => ({ ...p, duration: d }))}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all ${
                    config.duration === d
                      ? 'border-[#FFCC00] text-[#FFCC00] bg-[#FFCC00]/10'
                      : 'border-white/10 text-zinc-500 hover:text-white'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className={labelCaps}>Resolution</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {specs.resolutions.map((res) => (
                <button
                  key={res}
                  onClick={() => setConfig((p) => ({ ...p, resolution: res }))}
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

  /* ─── CANVAS PANEL ─── */
  const CanvasPanel = (
    <GlassPanel className="flex-1 flex flex-col gap-5 p-5 sm:p-6 lg:p-7 min-h-[480px]">
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
    </GlassPanel>
  );

  /* ─── RENDERED RAIL ─── */
  const RenderedRail = (
    <GlassPanel className="w-full lg:w-72 shrink-0 flex flex-col gap-4 p-5 max-h-[640px] lg:max-h-none">
      <div className="flex items-center justify-between">
        <div className={labelCaps}>// RENDERED</div>
        <div className="text-[10px] font-black text-[#FFCC00] font-mono">
          {renderedCount}
          <span className="text-zinc-500">/{seedPrompts.length || (oneShotResult ? 1 : 0)}</span>
        </div>
      </div>

      {resumeAt && (
        <div className="text-[10px] text-[#FFCC00] font-mono bg-[#FFCC00]/5 border border-[#FFCC00]/30 rounded-xl px-3 py-2 leading-relaxed">
          // RATE LIMITED · {queuedCount} queued ·{' '}
          {formatEta(Math.max(0, Math.ceil((resumeAt - Date.now()) / 1000)))} to resume
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1 -mr-1">
        {galleryItems.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-[10px] font-mono uppercase tracking-widest leading-relaxed">
            <VideoIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            Renders show up here.
            <br />
            {hasSeedPrompts ? 'Click RENDER ALL to start.' : 'Generate a clip to begin.'}
          </div>
        ) : (
          galleryItems.map((item) => (
            <div
              key={`${item.idx}-${item.result.url}`}
              className="rounded-xl border border-white/10 bg-zinc-950 overflow-hidden"
            >
              <video
                src={item.result.url}
                controls
                loop
                muted
                className="w-full aspect-video object-cover bg-black"
              />
              <div className="p-3 space-y-2">
                <div className="text-[9px] font-black text-[#FFCC00] uppercase tracking-widest">
                  {item.idx >= 0 ? `SCENE ${String(item.idx + 1).padStart(2, '0')}` : 'ONE-SHOT'}
                </div>
                <div className="text-[9px] text-zinc-400 line-clamp-2 font-mono leading-snug">
                  {item.scriptLine}
                </div>
                <a
                  href={item.result.downloadUrl}
                  download={`grifon-${item.idx >= 0 ? `scene-${String(item.idx + 1).padStart(2, '0')}` : 'clip'}.mp4`}
                  className={`${ghostBtn} flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase tracking-widest py-2`}
                >
                  <Download className="w-3 h-3" /> Download
                </a>
              </div>
            </div>
          ))
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
        />
      </div>
      <GoldButton
        onClick={handleRenderAll}
        disabled={busy || seedPrompts.length === 0 || isCurrentModelLocked}
        className="w-full"
      >
        <span className="flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Render All {seedPrompts.length}
        </span>
      </GoldButton>
    </GlassPanel>
  );

  /* ─── ONE-SHOT RESULT MODAL (inline) ─── */
  const OneShotPreview = oneShotResult && mode === 'one-shot' && (
    <div className="mt-4">
      <GlassPanel className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-[#FFCC00]" />
          <div className={labelCaps}>// LATEST CLIP</div>
        </div>
        <video
          src={oneShotResult.url}
          controls
          autoPlay
          loop
          className="w-full max-h-[55vh] rounded-xl border border-[#FFCC00]/30"
        />
        <div className="mt-3 flex gap-2">
          <a
            href={oneShotResult.downloadUrl}
            download={`grifon-clip-${Date.now()}.mp4`}
            className={`${ghostBtn} flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2`}
          >
            <Download className="w-3 h-3" /> Download
          </a>
          <button
            onClick={() => setOneShotResult(null)}
            className={`${ghostBtn} flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-3 py-2`}
          >
            <RotateCw className="w-3 h-3" /> New Clip
          </button>
        </div>
      </GlassPanel>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono flex flex-col p-4 sm:p-6 md:p-8">
      {Header}

      {mode === 'pipeline' && hasSeedPrompts ? (
        <div className="flex flex-col lg:flex-row gap-5 flex-1">
          {PipelinePanel}
          {CanvasPanel}
          {RenderedRail}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 flex-1">
          <div className="flex-1 flex flex-col gap-5">
            {CanvasPanel}
            {OneShotPreview}
          </div>
          {RenderedRail}
        </div>
      )}
    </div>
  );
};

export default GenerateVideo;
