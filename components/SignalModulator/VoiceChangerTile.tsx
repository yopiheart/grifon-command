import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, Activity, ChevronDown, Download, UploadCloud, Mic, Volume2, RefreshCw } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import Loader from '../ui/Loader';
import AudioRecorder from '../ui/AudioRecorder';
import { convertSpeech } from '../../services/voiceService';
import type { StabilityMode, VoiceLibrary } from '../../types';
import VoicePicker from './VoicePicker';
import { RECOMMENDED_VOICE_IDS } from './pinoyReady';
import { STABILITY_LABELS, downloadAudio } from './utils';
import type { SessionHistoryApi } from './useSessionHistory';

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPT_MIMES = 'audio/mpeg,audio/wav,audio/x-m4a,audio/mp4,video/mp4,video/quicktime';

type SourceTab = 'upload' | 'record';

interface VoiceChangerTileProps {
  library: VoiceLibrary;
  history: SessionHistoryApi;
  onUsageReported?: () => void;
}

const resolveVoiceName = (library: VoiceLibrary, voiceId: string): string =>
  [...library.myVoices, ...library.libraryVoices, ...library.stockVoices].find(v => v.voice_id === voiceId)?.name
  ?? 'audio';

const VoiceChangerTile: React.FC<VoiceChangerTileProps> = ({ library, history, onUsageReported }) => {
  const [voiceId, setVoiceId] = useState<string>('');
  const [stabilityMode, setStabilityMode] = useState<StabilityMode>('natural');
  const [tab, setTab] = useState<SourceTab>('upload');
  const [sourceFile, setSourceFile] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTakeId, setCurrentTakeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!voiceId && library.stockVoices.length > 0) {
      const stockIds = new Set(library.stockVoices.map(v => v.voice_id));
      const firstRecommended = RECOMMENDED_VOICE_IDS.find(id => stockIds.has(id));
      setVoiceId(firstRecommended ?? library.stockVoices[0].voice_id);
    }
  }, [library, voiceId]);

  // Hydrate form when a Voice Changer take is restored from the history drawer.
  useEffect(() => {
    const t = history.pendingRestore;
    if (!t || t.kind !== 'voice-changer') return;
    setVoiceId(t.voiceId);
    setStabilityMode(t.stabilityMode);
    setSourceFile(t.sourceFile ?? null);
    setSourceLabel(t.sourceLabel ?? null);
    setTab(t.sourceLabel?.startsWith('Recorded') ? 'record' : 'upload');
    setAudioUrl(null);
    setCurrentTakeId(null);
    setError(null);
    history.consumeRestore();
  }, [history]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`FILE_TOO_LARGE — ${Math.round(file.size / 1024 / 1024)}MB exceeds 50MB cap`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSourceFile(reader.result);
        setSourceLabel(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const onRecorded = (dataUrl: string, durationSec: number) => {
    setSourceFile(dataUrl);
    setSourceLabel(`Recorded ${Math.round(durationSec)}s`);
    setError(null);
  };

  const onConvert = async () => {
    if (!voiceId || !sourceFile) return;
    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const url = await convertSpeech({ voiceId, sourceFile, stabilityMode });
      setAudioUrl(url);
      const takeId = history.addTake({
        kind: 'voice-changer',
        voiceId,
        voiceName: resolveVoiceName(library, voiceId),
        sourceFile,
        sourceLabel: sourceLabel ?? undefined,
        stabilityMode,
        audioUrl: url,
      });
      setCurrentTakeId(takeId);
      onUsageReported?.();
    } catch (err: any) {
      setError(err?.message ?? 'STS_CONVERSION_FAILED');
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
    if (!currentTake || regensLeft <= 0 || !currentTake.sourceFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const url = await convertSpeech({
        voiceId: currentTake.voiceId,
        sourceFile: currentTake.sourceFile,
        stabilityMode: currentTake.stabilityMode,
      });
      setAudioUrl(url);
      history.replaceTakeAudio(currentTake.id, url);
      onUsageReported?.();
    } catch (err: any) {
      setError(err?.message ?? 'STS_REGENERATE_FAILED');
      onUsageReported?.();
    } finally {
      setIsLoading(false);
    }
  };

  const onDownload = () => {
    if (!audioUrl) return;
    downloadAudio(audioUrl, 'vc', resolveVoiceName(library, voiceId));
  };

  const tabBtn = (id: SourceTab, label: string, Icon: typeof UploadCloud) => (
    <button
      type="button"
      onClick={() => { setTab(id); setSourceFile(null); setSourceLabel(null); }}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${tab === id ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col gap-6">
        <GlassPanel className="flex-1 p-8 relative flex flex-col overflow-hidden min-h-[480px]">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader message="CONVERTING SIGNAL..." />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-4">
                // TYPICALLY_5_TO_15_SECONDS
              </p>
            </div>
          )}

          <div className="flex justify-center mb-6">
            <div className="bg-zinc-900 border border-white/10 p-1 rounded-xl flex gap-1">
              {tabBtn('upload', 'UPLOAD', UploadCloud)}
              {tabBtn('record', 'RECORD', Mic)}
            </div>
          </div>

          {tab === 'upload' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-lg aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-6 cursor-pointer transition-all ${sourceFile ? 'border-[#FFCC00] bg-[#FFCC00]/5' : 'border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 bg-zinc-950/50'}`}
              >
                {sourceFile ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#FFCC00] flex items-center justify-center">
                      <Volume2 className="w-8 h-8 text-black" />
                    </div>
                    <p className="text-[10px] font-mono text-white uppercase tracking-widest text-center">
                      // {sourceLabel ?? 'SOURCE_SIGNAL_READY'}
                    </p>
                    <button
                      type="button"
                      className="text-[10px] font-bold px-4 py-2 border border-white/10 rounded-full hover:bg-white/5 transition-colors uppercase"
                    >
                      REPLACE SIGNAL
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-12 h-12 text-zinc-600" />
                    <div className="text-center">
                      <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-2">
                        // INJECT_AUDIO_SOURCE
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase">
                        MP3 · WAV · M4A · MP4 · MOV — Max 50MB
                      </p>
                    </div>
                  </>
                )}
              </div>
              <input type="file" hidden ref={fileInputRef} onChange={onFile} accept={ACCEPT_MIMES} />
            </div>
          )}

          {tab === 'record' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <AudioRecorder maxDurationSec={60} onComplete={onRecorded} onCleared={() => { setSourceFile(null); setSourceLabel(null); }} />
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-4 text-center">
                // RECORD_YOURSELF_READING_THE_SCRIPT — UP_TO_60_SECONDS
              </p>
            </div>
          )}

          {audioUrl && !isLoading && (
            <div className="mt-8 p-6 bg-zinc-950 border border-white/10 rounded-xl flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1 w-full">
                  <div className="flex justify-between text-[10px] text-zinc-400 font-mono uppercase mb-4">
                    <span>// CONVERSION_OUTPUT</span>
                    <Activity className="w-4 h-4 text-[#FFCC00] animate-pulse" />
                  </div>
                  <audio src={audioUrl} controls controlsList="nodownload noplaybackrate" className="w-full filter invert opacity-80 h-10" />
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mt-3">
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
                        ? `Regenerate this take with the same source + voice · ${regensLeft} left`
                        : 'No regenerates left for this take. Re-upload or re-record to convert again.'}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      REGENERATE
                      <span className={`text-[9px] font-mono ${regensLeft > 0 ? 'text-[#FFCC00]' : 'text-zinc-600'}`}>
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
            // TARGET_VOICE
          </h3>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-2">VOICE_DNA_PROFILE</label>
            <VoicePicker library={library} value={voiceId} onChange={setVoiceId} />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-2">VOICE_MODE</label>
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
              <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">{STABILITY_LABELS[stabilityMode]}</p>
          </div>

          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest pt-4 border-t border-white/10">
            // MODEL: MULTILINGUAL_STS_V2
          </div>
        </GlassPanel>

        {error && (
          <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-4 rounded-xl font-mono text-[10px] uppercase tracking-widest">
            [ERROR] {error}
          </div>
        )}

        <GoldButton
          onClick={onConvert}
          disabled={isLoading || !voiceId || !sourceFile}
          className="w-full py-4 text-xs tracking-widest flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> CONVERT SIGNAL
        </GoldButton>
      </aside>
    </div>
  );
};

export default VoiceChangerTile;
