import React, { useRef, useState } from 'react';
import { Sparkles, UploadCloud, Mic, User, Trash2, ShieldCheck, Volume2 } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import Loader from '../ui/Loader';
import AudioRecorder from '../ui/AudioRecorder';
import { cloneVoice, deleteVoice } from '../../services/voiceService';
import type { VoiceLibrary } from '../../types';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MIN_DURATION_SEC = 30;
const MAX_DURATION_SEC = 180;
const ACCEPT_MIMES = 'audio/mpeg,audio/wav,audio/x-m4a,audio/mp4';

type SourceTab = 'upload' | 'record';

interface VoiceCloningTileProps {
  library: VoiceLibrary;
  onLibraryRefresh: () => void;
}

const VoiceCloningTile: React.FC<VoiceCloningTileProps> = ({ library, onLibraryRefresh }) => {
  const [tab, setTab] = useState<SourceTab>('upload');
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [audio, setAudio] = useState<string | null>(null);
  const [audioLabel, setAudioLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quotaFull = library.myVoices.length >= library.quotaMax;

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError(`FILE_TOO_LARGE — ${Math.round(file.size / 1024 / 1024)}MB exceeds 10MB cap`);
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setAudio(reader.result);
        setAudioLabel(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const onRecorded = (dataUrl: string, durationSec: number) => {
    if (durationSec < MIN_DURATION_SEC) {
      setError(`MIN_${MIN_DURATION_SEC}_SECONDS_REQUIRED — recorded only ${Math.round(durationSec)}s`);
      setAudio(null);
      setAudioLabel(null);
      return;
    }
    setError(null);
    setAudio(dataUrl);
    setAudioLabel(`Recorded ${Math.round(durationSec)}s`);
  };

  const reset = () => {
    setVoiceName('');
    setDescription('');
    setConsent(false);
    setAudio(null);
    setAudioLabel(null);
  };

  const onClone = async () => {
    if (!voiceName.trim() || !audio || !consent) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await cloneVoice({
        voiceName: voiceName.trim(),
        description: description.trim() || undefined,
        consent: true,
        audio,
      });
      setSuccess(`Voice "${result.voice_name}" created — available now in TTS and Voice Changer.`);
      reset();
      onLibraryRefresh();
    } catch (err: any) {
      setError(err?.message ?? 'CLONE_FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async (voiceId: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This frees your voice slot. The cloned voice cannot be restored.`)) return;
    setIsDeleting(voiceId);
    setError(null);
    try {
      await deleteVoice(voiceId);
      onLibraryRefresh();
    } catch (err: any) {
      setError(err?.message ?? 'DELETE_FAILED');
    } finally {
      setIsDeleting(null);
    }
  };

  const tabBtn = (id: SourceTab, label: string, Icon: typeof UploadCloud) => (
    <button
      type="button"
      onClick={() => { setTab(id); setAudio(null); setAudioLabel(null); }}
      disabled={quotaFull}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tab === id ? 'bg-[#FFCC00] text-black' : 'text-zinc-500 hover:text-white'}`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      {library.myVoices.length === 0 ? (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/5">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            // MY_VOICES — YOUR_CLONED_VOICES_APPEAR_HERE
          </span>
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            {library.quotaUsed} / {library.quotaMax} SLOTS
          </span>
        </div>
      ) : (
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
            <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">// MY_VOICES</h3>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              {library.quotaUsed} / {library.quotaMax} SLOTS
            </span>
          </div>
          <div className="space-y-2">
            {library.myVoices.map(v => (
              <div key={v.voice_id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-white/10">
                <div className="w-9 h-9 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{v.name}</p>
                  {v.description && (
                    <p className="text-[10px] text-zinc-500 truncate">{v.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(v.voice_id, v.name)}
                  disabled={isDeleting === v.voice_id}
                  className="p-2 rounded-lg border border-white/10 hover:border-red-500/40 hover:text-red-400 text-zinc-500 transition-colors disabled:opacity-50"
                  aria-label={`Delete ${v.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      <GlassPanel className="p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
            <Loader message="CLONING VOICE PROFILE..." />
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-4">
              // TYPICALLY_10_TO_30_SECONDS
            </p>
          </div>
        )}

        {quotaFull && (
          <div className="bg-zinc-950 border border-[#FFCC00]/30 rounded-xl p-4 mb-6 text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest text-center">
            // QUOTA_FULL — DELETE_YOUR_EXISTING_VOICE_TO_CREATE_A_NEW_ONE
          </div>
        )}

        <h3 className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest border-b border-white/10 pb-4 mb-6">
          // CREATE_NEW_VOICE_CLONE
        </h3>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-2">VOICE_NAME *</label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value.slice(0, 50))}
                disabled={quotaFull}
                placeholder="e.g., Sales Rep Marco"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFCC00] transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-2">DESCRIPTION (OPTIONAL)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                disabled={quotaFull}
                placeholder="Notes for your reference..."
                rows={3}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFCC00] transition-colors resize-none disabled:opacity-50"
              />
            </div>

            <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 text-[10px] text-zinc-500 leading-relaxed">
              <p className="font-mono uppercase tracking-widest text-zinc-400 mb-2">// SAMPLE_GUIDELINES</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Single speaker only</li>
                <li>Quiet room, no music or background noise</li>
                <li>30 seconds to 3 minutes</li>
                <li>Speak naturally, vary your tone</li>
              </ul>
            </div>

            <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${consent ? 'bg-[#FFCC00]/5 border-[#FFCC00]/40' : 'bg-zinc-950 border-white/10 hover:border-white/20'} ${quotaFull ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={quotaFull}
                className="mt-0.5 w-4 h-4 accent-[#FFCC00]"
              />
              <span className="text-[10px] text-zinc-300 leading-relaxed">
                <span className="flex items-center gap-1.5 font-mono uppercase tracking-widest text-zinc-400 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> CONSENT_REQUIRED
                </span>
                I confirm I am the speaker in this audio, OR I have explicit written permission from the speaker to clone their voice for use in this product.
              </span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-zinc-500 uppercase mb-2">VOICE_SAMPLE *</label>
              <div className="flex justify-center mb-4">
                <div className="bg-zinc-900 border border-white/10 p-1 rounded-xl flex gap-1">
                  {tabBtn('upload', 'UPLOAD', UploadCloud)}
                  {tabBtn('record', 'RECORD', Mic)}
                </div>
              </div>

              {tab === 'upload' && (
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => !quotaFull && fileInputRef.current?.click()}
                    className={`w-full h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${quotaFull ? 'opacity-50 cursor-not-allowed border-white/10' : audio ? 'border-[#FFCC00] bg-[#FFCC00]/5 cursor-pointer' : 'border-white/10 hover:border-[#FFCC00] hover:bg-zinc-800/80 bg-zinc-950/50 cursor-pointer'}`}
                  >
                    {audio ? (
                      <>
                        <div className="w-12 h-12 rounded-full bg-[#FFCC00] flex items-center justify-center">
                          <Volume2 className="w-6 h-6 text-black" />
                        </div>
                        <p className="text-[10px] font-mono text-white uppercase tracking-widest text-center px-3">
                          // {audioLabel ?? 'SAMPLE_READY'}
                        </p>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-10 h-10 text-zinc-600" />
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest mb-1">
                            // UPLOAD_VOICE_SAMPLE
                          </p>
                          <p className="text-[10px] text-zinc-500 uppercase">
                            MP3 · WAV · M4A — Max 10MB
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <input type="file" hidden ref={fileInputRef} onChange={onFile} accept={ACCEPT_MIMES} />
                </div>
              )}

              {tab === 'record' && (
                <AudioRecorder
                  maxDurationSec={MAX_DURATION_SEC}
                  minDurationSec={MIN_DURATION_SEC}
                  onComplete={onRecorded}
                  onCleared={() => { setAudio(null); setAudioLabel(null); }}
                  disabled={quotaFull}
                />
              )}
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/50 text-red-500 p-4 rounded-xl font-mono text-[10px] uppercase tracking-widest">
                [ERROR] {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-900/20 border border-emerald-900/50 text-emerald-400 p-4 rounded-xl font-mono text-[10px] uppercase tracking-widest">
                [OK] {success}
              </div>
            )}

            <GoldButton
              onClick={onClone}
              disabled={isLoading || quotaFull || !voiceName.trim() || !audio || !consent}
              className="w-full py-4 text-xs tracking-widest flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> CREATE VOICE CLONE
            </GoldButton>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default VoiceCloningTile;
