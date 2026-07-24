import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Undo2, MessageSquare, Mic, Trash2, Download } from 'lucide-react';
import type { HistoryTake } from '../../types';
import { formatRelativeTime, HISTORY_CAP, downloadAudio } from './utils';

interface SessionHistoryProps {
  open: boolean;
  takes: HistoryTake[];
  onClose: () => void;
  onRestore: (take: HistoryTake) => void;
  onRemove: (id: string) => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ open, takes, onClose, onRestore, onRemove }) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }, [open]);

  const togglePlay = (take: HistoryTake) => {
    if (playingId === take.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(take.audioUrl);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play().catch(() => setPlayingId(null));
    setPlayingId(take.id);
  };

  const summary = (take: HistoryTake): string => {
    if (take.kind === 'tts') return take.text?.replace(/\s+/g, ' ').trim() ?? '';
    return take.sourceLabel ?? 'Voice changer take';
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-zinc-950 border-l border-white/10 z-50 transform transition-transform duration-200 ease-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs font-bold text-[#FFCC00] uppercase tracking-widest">// TRANSMISSION_LOG</h2>
            <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest mt-1">
              {takes.length} / {HISTORY_CAP} TAKES · SESSION_ONLY
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center hover:border-[#FFCC00]/40 transition-colors"
            aria-label="Close history"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {takes.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest leading-relaxed">
                // NO_TAKES_YET<br />
                SYNTHESIZE OR CONVERT TO LOG A TAKE
              </p>
            </div>
          )}
          {takes.map(take => {
            const KindIcon = take.kind === 'tts' ? MessageSquare : Mic;
            const isPlaying = playingId === take.id;
            return (
              <div
                key={take.id}
                className="bg-zinc-900/50 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(take)}
                    className="w-9 h-9 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center hover:border-[#FFCC00]/40 shrink-0 transition-colors"
                    aria-label={isPlaying ? 'Pause take' : 'Play take'}
                  >
                    {isPlaying
                      ? <Pause className="w-3.5 h-3.5 text-[#FFCC00]" />
                      : <Play className="w-3.5 h-3.5 text-zinc-300" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <KindIcon className="w-3 h-3 text-on-surface-sublabel shrink-0" />
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest truncate">
                        {take.voiceName}
                      </span>
                      <span className="text-[9px] font-mono text-on-surface-sublabel uppercase tracking-widest shrink-0">
                        · {formatRelativeTime(take.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-snug line-clamp-2 mb-2">
                      {summary(take)}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadAudio(take.audioUrl, take.kind === 'tts' ? 'tts' : 'vc', take.voiceName)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] text-[9px] font-mono text-zinc-400 uppercase tracking-widest transition-colors"
                        title="Download this take"
                      >
                        <Download className="w-3 h-3" /> SAVE
                      </button>
                      <button
                        type="button"
                        onClick={() => onRestore(take)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-white/10 hover:border-[#FFCC00]/40 hover:text-[#FFCC00] text-[9px] font-mono text-zinc-400 uppercase tracking-widest transition-colors"
                        title="Restore voice + text + settings into the form"
                      >
                        <Undo2 className="w-3 h-3" /> RESTORE
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemove(take.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950 border border-white/10 hover:border-red-500/40 hover:text-red-400 text-[9px] font-mono text-zinc-400 uppercase tracking-widest transition-colors"
                        title="Remove from log"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <footer className="px-5 py-3 border-t border-white/10 shrink-0">
          <p className="text-[9px] font-mono text-on-surface-sublabel uppercase tracking-widest leading-relaxed">
            // CLEARED_ON_REFRESH — DEPLOY_AUDIO_TO_KEEP
          </p>
        </footer>
      </aside>
    </>
  );
};

export default SessionHistory;
