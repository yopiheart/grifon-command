import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Activity, ChevronDown, Download, RefreshCw } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import Loader from '../ui/Loader';
import { synthesizeSpeech } from '../../services/voiceService';
import type { StabilityMode, VoiceLibrary } from '../../types';
import VoicePicker from './VoicePicker';
import { RECOMMENDED_VOICE_IDS } from './pinoyReady';
import { STABILITY_LABELS, TTS_TAGS, downloadAudio } from './utils';
import type { SessionHistoryApi } from './useSessionHistory';

const MAX_CHARS = 10000;

interface TextToSpeechTileProps {
  library: VoiceLibrary;
  globalScript?: string[];
  history: SessionHistoryApi;
  onUsageReported?: () => void;
}

const resolveVoiceName = (library: VoiceLibrary, voiceId: string): string =>
  [...library.myVoices, ...library.libraryVoices, ...library.stockVoices].find(v => v.voice_id === voiceId)?.name
  ?? 'audio';

const TextToSpeechTile: React.FC<TextToSpeechTileProps> = ({ library, globalScript = [], history, onUsageReported }) => {
  const [voiceId, setVoiceId] = useState<string>('');
  const [text, setText] = useState('');
  const [stabilityMode, setStabilityMode] = useState<StabilityMode>('natural');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTakeId, setCurrentTakeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!voiceId && library.stockVoices.length > 0) {
      const myFirst = library.myVoices[0];
      const stockIds = new Set(library.stockVoices.map(v => v.voice_id));
      const firstRecommended = RECOMMENDED_VOICE_IDS.find(id => stockIds.has(id));
      setVoiceId(myFirst?.voice_id ?? firstRecommended ?? library.stockVoices[0].voice_id);
    }
  }, [library, voiceId]);

  // Hydrate form when a take is restored from the history drawer.
  useEffect(() => {
    const t = history.pendingRestore;
    if (!t || t.kind !== 'tts') return;
    setVoiceId(t.voiceId);
    setText(t.text ?? '');
    setStabilityMode(t.stabilityMode);
    setAudioUrl(null);
    setCurrentTakeId(null);
    setError(null);
    history.consumeRestore();
  }, [history]);

  const insertTag = (tag: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setText(t => (t ? `${t} ${tag} ` : `${tag} `));
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const insertion = `${start > 0 && !before.endsWith(' ') ? ' ' : ''}${tag} `;
    const next = before + insertion + after;
    if (next.length > MAX_CHARS) return;
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = (before + insertion).length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const onPullScript = () => {
    if (globalScript.length === 0) return;
    const joined = globalScript.join(' ');
    setText(joined.slice(0, MAX_CHARS));
  };

  const onSynthesize = async () => {
    if (!voiceId || !text.trim()) return;
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const url = await synthesizeSpeech({ voiceId, text, stabilityMode });
      setAudioUrl(url);
      const takeId = history.addTake({
        kind: 'tts',
        voiceId,
        voiceName: resolveVoiceName(library, voiceId),
        text,
        stabilityMode,
        audioUrl: url,
      });
      setCurrentTakeId(takeId);
      onUsageReported?.();
    } catch (err: any) {
      setError(err?.message ?? 'TTS_SYNTHESIS_FAILED');
      onUsageReported?.();
    } finally {
      setIsLoading(false);
    }
  };

  const currentTake = useMemo(
    () => history.takes.find(t => t.id === currentTakeId) ?? null,
    [history.takes, currentTakeId]
  );
  const regensLeft = currentTake?.regensRemaining ?? 0;

  const onRegenerate = async () => {
    if (!currentTake || regensLeft <= 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = await synthesizeSpeech({
        voiceId: currentTake.voiceId,
        text: currentTake.text ?? '',
        stabilityMode: currentTake.stabilityMode,
      });
      setAudioUrl(url);
      history.replaceTakeAudio(currentTake.id, url);
      onUsageReported?.();
    } catch (err: any) {
      setError(err?.message ?? 'TTS_REGENERATE_FAILED');
      onUsageReported?.();
    } finally {
      setIsLoading(false);
    }
  };

  const onDownload = () => {
    if (!audioUrl) return;
    downloadAudio(audioUrl, 'tts', resolveVoiceName(library, voiceId));
  };

  const charCount = text.length;
  const charPct = (charCount / MAX_CHARS) * 100;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col gap-6">
        <GlassPanel className="flex-1 p-8 relative flex flex-col overflow-hidden min-h-[480px]">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader message="SYNTHESIZING SIGNAL..." />
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest mt-4">
                // TYPICALLY_5_TO_15_SECONDS
              </p>
            </div>
          )}

          <div className="flex-1 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">// TRANSMISSION_TEXT</label>
              {globalScript.length > 0 && (
                <button
                  type="button"
                  onClick={onPullScript}
                  className="text-[10px] font-bold text-[#FFCC00] border border-[#FFCC00]/20 px-4 py-1.5 rounded-full hover:bg-[#FFCC00]/10 transition-all uppercase"
                >
                  PULL LATEST SCRIPT
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {TTS_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
                  className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-zinc-950 border border-white/10 text-zinc-300 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] transition-colors uppercase"
                  title={`Insert ${tag} tag at cursor`}
                >
                  {tag}
                </button>
              ))}
              <span className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest self-center ml-2">
                // INLINE_DELIVERY_TAGS
              </span>
            </div>

            <textarea
              ref={textareaRef}
              className="flex-1 min-h-[220px] bg-zinc-950 border border-white/10 focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] p-6 text-sm text-zinc-300 font-sans leading-relaxed resize-none rounded-xl transition-all"
              placeholder="Enter your script. Use [whispers], [excited], [sad], etc. inline to shape delivery."
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            />

            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
              <span className="text-on-surface-sublabel">
                {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
              </span>
              <div className="flex-1 mx-4 h-0.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FFCC00] transition-all"
                  style={{ width: `${Math.min(100, charPct)}%` }}
                />
              </div>
              <span className={charPct > 90 ? 'text-[#FFCC00]' : 'text-on-surface-sublabel'}>
                {Math.floor(charPct)}%
              </span>
            </div>
          </div>

          {audioUrl && !isLoading && (
            <div className="mt-8 p-6 bg-zinc-950 border border-white/10 rounded-xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono uppercase mb-4">
                    <span>// SYNTH_OUTPUT</span>
                    <Activity className="w-4 h-4 text-[#FFCC00] animate-pulse" />
                  </div>
                  <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" className="w-full filter invert opacity-80 h-10" />
                  <p className="text-[9px] font-mono text-on-surface-sublabel uppercase tracking-widest mt-3">
                    // LOGGED_TO_SESSION — DEPLOY_AUDIO_TO_KEEP_AFTER_REFRESH
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                  <GoldButton onClick={onDownload} className="px-6 py-3 text-xs flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> DEPLOY AUDIO
                  </GoldButton>
                  {currentTake && (
                    <button
                      type="button"
                      onClick={onRegenerate}
                      disabled={regensLeft <= 0 || isLoading}
                      className="px-6 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-zinc-300 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      title={regensLeft > 0
                        ? `Regenerate this take with the same voice + text · ${regensLeft} left`
                        : 'No regenerates left for this take. Edit text or change voice and synthesize again.'}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      REGENERATE
                      <span className={`text-[9px] font-mono ${regensLeft > 0 ? 'text-[#FFCC00]' : 'text-on-surface-sublabel'}`}>
                        · {regensLeft}_LEFT
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </GlassPanel>
      </div>

      <aside className="w-full lg:w-80 flex flex-col gap-6">
        <GlassPanel className="p-6 space-y-6">
          <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest border-b border-white/10 pb-4">
            // ENGINE_CONFIG
          </h3>

          <div>
            <label className="block text-[10px] font-mono text-on-surface-sublabel uppercase mb-2">VOICE_DNA_PROFILE</label>
            <VoicePicker library={library} value={voiceId} onChange={setVoiceId} />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-on-surface-sublabel uppercase mb-2">VOICE_MODE</label>
            <div className="relative">
              <select
                value={stabilityMode}
                onChange={(e) => setStabilityMode(e.target.value as StabilityMode)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white focus:outline-none focus:border-[#FFCC00] transition-colors appearance-none truncate pr-10"
              >
                <option value="creative">CREATIVE</option>
                <option value="natural">NATURAL (DEFAULT)</option>
                <option value="robust">ROBUST</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-sublabel pointer-events-none" />
            </div>
            <p className="text-[10px] text-on-surface-sublabel mt-2 leading-relaxed">{STABILITY_LABELS[stabilityMode]}</p>
          </div>

          <div className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest pt-4 border-t border-white/10">
            // MODEL: ELEVEN_V3 (LATEST)
          </div>
        </GlassPanel>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-4 rounded-xl font-mono text-[10px] uppercase tracking-widest">
            [ERROR] {error}
          </div>
        )}

        <GoldButton
          onClick={onSynthesize}
          disabled={isLoading || !voiceId || !text.trim()}
          className="w-full py-4 text-xs tracking-widest flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> SYNTHESIZE SIGNAL
        </GoldButton>
      </aside>
    </div>
  );
};

export default TextToSpeechTile;
