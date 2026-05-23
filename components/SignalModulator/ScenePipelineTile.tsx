import React, { useEffect, useMemo, useState } from 'react';
import { Download, Layers, Loader2, Check, AlertTriangle, RefreshCw, Scissors } from 'lucide-react';
import JSZip from 'jszip';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { synthesizeSpeech } from '../../services/voiceService';
import type { SceneBatchEntry, StabilityMode, VoiceLibrary } from '../../types';
import VoicePicker from './VoicePicker';
import { RECOMMENDED_VOICE_IDS } from './pinoyReady';
import { STABILITY_LABELS, downloadAudio } from './utils';
import type { SessionHistoryApi } from './useSessionHistory';

interface ScenePipelineTileProps {
  library: VoiceLibrary;
  sceneBatch: SceneBatchEntry[];
  history: SessionHistoryApi;
  onUsageReported?: () => void;
  onSendToAiEditor?: (audioOverlays: { sceneIdx: number; audioUrl: string }[]) => void;
}

type SceneStatus = 'queued' | 'rendering' | 'done' | 'failed';

interface SceneState {
  status: SceneStatus;
  audioUrl?: string;
  error?: string;
}

const ScenePipelineTile: React.FC<ScenePipelineTileProps> = ({
  library,
  sceneBatch,
  history,
  onUsageReported,
  onSendToAiEditor,
}) => {
  const [voiceId, setVoiceId] = useState<string>('');
  // Default to 'robust' for batch voice generation — keeps tone consistent
  // across all scenes, which is the whole point of routing through here.
  const [stabilityMode, setStabilityMode] = useState<StabilityMode>('robust');
  const [sceneStates, setSceneStates] = useState<Record<number, SceneState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [rateLimited, setRateLimited] = useState<number | null>(null);

  // Default to first Filipino library voice on mount; falls back to recommended,
  // then first stock voice. Same selection logic as TextToSpeechTile so users
  // don't have to re-learn the picker.
  useEffect(() => {
    if (voiceId) return;
    if (library.libraryVoices.length > 0) {
      setVoiceId(library.libraryVoices[0].voice_id);
      return;
    }
    if (library.myVoices.length > 0) {
      setVoiceId(library.myVoices[0].voice_id);
      return;
    }
    if (library.stockVoices.length > 0) {
      const stockIds = new Set(library.stockVoices.map((v) => v.voice_id));
      const firstRecommended = RECOMMENDED_VOICE_IDS.find((id) => stockIds.has(id));
      setVoiceId(firstRecommended ?? library.stockVoices[0].voice_id);
    }
  }, [library, voiceId]);

  const totalChars = useMemo(
    () => sceneBatch.reduce((sum, s) => sum + (s.scriptLine?.length ?? 0), 0),
    [sceneBatch]
  );

  // ElevenLabs Pro pricing: ~30¢ per 1k characters. Multilingual v2 is slightly
  // more expensive; use a slightly conservative estimate so users aren't surprised.
  const estCostUsd = (totalChars / 1000) * 0.3;

  const allDone = sceneBatch.length > 0 && sceneBatch.every((s) => sceneStates[s.sceneIdx]?.status === 'done');
  const anyFailed = sceneBatch.some((s) => sceneStates[s.sceneIdx]?.status === 'failed');

  const handleGenerateAll = async () => {
    if (!voiceId || isGenerating) return;
    setIsGenerating(true);
    setRateLimited(null);

    // Reset previous state for any scene that wasn't already done (retry pattern).
    setSceneStates((prev) => {
      const next: Record<number, SceneState> = {};
      for (const s of sceneBatch) {
        const existing = prev[s.sceneIdx];
        if (existing?.status === 'done') {
          next[s.sceneIdx] = existing;
        } else {
          next[s.sceneIdx] = { status: 'queued' };
        }
      }
      return next;
    });

    for (const scene of sceneBatch) {
      // Skip scenes already rendered successfully (retry-failed-only flow).
      if (sceneStates[scene.sceneIdx]?.status === 'done') continue;
      if (!scene.scriptLine?.trim()) {
        setSceneStates((prev) => ({
          ...prev,
          [scene.sceneIdx]: { status: 'failed', error: 'EMPTY_SCRIPT_LINE' },
        }));
        continue;
      }

      setSceneStates((prev) => ({
        ...prev,
        [scene.sceneIdx]: { status: 'rendering' },
      }));

      try {
        const url = await synthesizeSpeech({
          voiceId,
          text: scene.scriptLine,
          stabilityMode,
        });
        setSceneStates((prev) => ({
          ...prev,
          [scene.sceneIdx]: { status: 'done', audioUrl: url },
        }));
        history.addTake({
          kind: 'tts',
          voiceId,
          voiceName: voiceId,
          text: scene.scriptLine,
          stabilityMode,
          audioUrl: url,
        });
        onUsageReported?.();
      } catch (err: any) {
        const msg = err?.message ?? 'TTS_FAILED';
        const is429 = msg.includes('429') || /rate.?limit/i.test(msg);
        setSceneStates((prev) => ({
          ...prev,
          [scene.sceneIdx]: { status: 'failed', error: msg },
        }));
        onUsageReported?.();
        if (is429) {
          setRateLimited(Date.now());
          break; // halt the loop; user retries after cooldown
        }
      }
    }

    setIsGenerating(false);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const readmeLines = [
      '// GRIFON COMMAND — Scene Pipeline Bundle',
      `// Generated ${new Date().toISOString().split('T')[0]}`,
      '',
      `Scenes: ${sceneBatch.length}`,
      `Voice: ${voiceId}`,
      `Stability: ${stabilityMode}`,
      '',
      'How to merge in CapCut:',
      '  1. Drop your rendered MP4s on the timeline in scene order.',
      '  2. Mute each MP4 (the silent Veo render).',
      '  3. Drop the matching MP3 from this zip onto the audio track.',
      '  4. Sync to the avatar\'s mouth movement (talking scenes).',
      '  5. Export 9:16 vertical for FB/IG/TikTok.',
      '',
    ];

    for (const scene of sceneBatch) {
      const state = sceneStates[scene.sceneIdx];
      if (!state?.audioUrl) continue;
      try {
        const blob = await fetch(state.audioUrl).then((r) => r.blob());
        const filename = `scene_${String(scene.sceneIdx + 1).padStart(2, '0')}_${scene.type}.mp3`;
        zip.file(filename, blob);
        readmeLines.push(`${filename}  ::  "${scene.scriptLine}"`);
      } catch {
        readmeLines.push(`(skipped scene ${scene.sceneIdx + 1} — fetch failed)`);
      }
    }

    zip.file('README.txt', readmeLines.join('\n'));
    const bundle = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(bundle);
    a.download = `grifon_scene_pipeline_${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const statusBadge = (status?: SceneStatus, error?: string) => {
    if (!status || status === 'queued') {
      return <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">// READY</span>;
    }
    if (status === 'rendering') {
      return (
        <span className="text-[9px] font-mono text-[#FFCC00] uppercase tracking-widest flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> // SYNTH
        </span>
      );
    }
    if (status === 'done') {
      return (
        <span className="text-[9px] font-mono text-green-400 uppercase tracking-widest flex items-center gap-1">
          <Check className="w-3 h-3" /> // DONE
        </span>
      );
    }
    return (
      <span
        className="text-[9px] font-mono text-red-400 uppercase tracking-widest flex items-center gap-1"
        title={error ?? 'failed'}
      >
        <AlertTriangle className="w-3 h-3" /> // FAILED
      </span>
    );
  };

  if (sceneBatch.length === 0) {
    return (
      <GlassPanel className="p-8 text-center">
        <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-4" />
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          // NO_SCENES_RECEIVED — RENDER ALL FROM GENERATE_VIDEO FIRST
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* relative z-50: GlassPanel's backdrop-blur creates a stacking context, so the
          VoicePicker dropdown (absolute z-30) was trapped inside this panel and the
          later-in-DOM scene-list panel painted over it. Lifting this whole panel above
          the scene list lets the dropdown overlay the scene rows. */}
      <GlassPanel className="p-6 flex flex-col gap-5 relative z-50">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#FFCC00]" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
              // SCENE_PIPELINE · {sceneBatch.length}_SCENES_FROM_GENERATE_VIDEO
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            ~{totalChars.toLocaleString()}_CHARS · ~${estCostUsd.toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            // VOICE_FOR_ALL_SCENES
          </label>
          <VoicePicker library={library} value={voiceId} onChange={setVoiceId} disabled={isGenerating} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
            // STABILITY
          </label>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(STABILITY_LABELS) as StabilityMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setStabilityMode(mode)}
                disabled={isGenerating}
                className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  stabilityMode === mode
                    ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00]'
                    : 'border-white/10 text-zinc-500 hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {STABILITY_LABELS[mode]}
              </button>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="p-6 flex flex-col gap-2">
        {sceneBatch.map((scene) => {
          const state = sceneStates[scene.sceneIdx];
          return (
            <div
              key={scene.sceneIdx}
              className="flex items-center gap-4 px-4 py-3 rounded-xl bg-zinc-950 border border-white/5"
            >
              <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest shrink-0">
                SCENE_{String(scene.sceneIdx + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest shrink-0">
                // {scene.type}
              </span>
              <span className="flex-1 text-sm text-zinc-300 truncate font-sans">
                {scene.scriptLine || <span className="italic text-zinc-600">(empty)</span>}
              </span>
              <div className="shrink-0">{statusBadge(state?.status, state?.error)}</div>
              {state?.status === 'done' && state.audioUrl && (
                <button
                  type="button"
                  onClick={() => downloadAudio(state.audioUrl!, 'tts', `scene_${scene.sceneIdx + 1}`)}
                  className="shrink-0 p-2 rounded-lg border border-white/10 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] text-zinc-400 transition-colors"
                  title="Download this scene's MP3"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </GlassPanel>

      <div className="flex flex-wrap gap-3 justify-center">
        {!allDone && (
          <GoldButton
            onClick={handleGenerateAll}
            disabled={isGenerating || !voiceId}
            className="px-8 py-3 text-xs flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> SYNTHESIZING…
              </>
            ) : anyFailed ? (
              <>
                <RefreshCw className="w-4 h-4" /> RETRY FAILED + UNDONE
              </>
            ) : (
              <>GENERATE ALL VOICES (~${estCostUsd.toFixed(2)})</>
            )}
          </GoldButton>
        )}

        {allDone && (
          <GoldButton onClick={handleDownloadAll} className="px-8 py-3 text-xs flex items-center gap-2">
            <Download className="w-4 h-4" /> DOWNLOAD ALL (.ZIP)
          </GoldButton>
        )}

        {allDone && onSendToAiEditor && (
          <button
            type="button"
            onClick={() => {
              const audioOverlays = sceneBatch
                .map((scene) => ({
                  sceneIdx: scene.sceneIdx,
                  audioUrl: sceneStates[scene.sceneIdx]?.audioUrl ?? '',
                }))
                .filter((a) => a.audioUrl);
              onSendToAiEditor(audioOverlays);
            }}
            className="px-8 py-3 text-xs flex items-center gap-2 rounded-xl bg-zinc-950 border border-white/10 hover:border-[#FFCC00] hover:text-[#FFCC00] text-zinc-300 font-bold uppercase tracking-widest transition-colors"
          >
            <Scissors className="w-4 h-4" /> SEND TO AI EDITOR ↗
          </button>
        )}
      </div>

      {rateLimited && (
        <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest text-center">
          // ELEVENLABS_RATE_LIMIT_HIT · WAIT 60s THEN RETRY
        </p>
      )}
    </div>
  );
};

export default ScenePipelineTile;
