import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, RefreshCw } from 'lucide-react';

type RecorderState = 'idle' | 'recording' | 'recorded' | 'denied' | 'unsupported';

interface AudioRecorderProps {
  maxDurationSec: number;
  minDurationSec?: number;
  onComplete: (dataUrl: string, durationSec: number) => void;
  onCleared?: () => void;
  disabled?: boolean;
}

const formatTime = (s: number): string => {
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = Math.floor(s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
};

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  maxDurationSec,
  minDurationSec = 0,
  onComplete,
  onCleared,
  disabled,
}) => {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array(32).fill(0));
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      cleanup();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    rafRef.current = null;
    tickRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
  };

  const startRecording = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const animate = () => {
        analyser.getByteFrequencyData(buffer);
        const next: number[] = [];
        for (let i = 0; i < 32; i++) {
          const v = buffer[i] ?? 0;
          next.push(Math.min(1, v / 220));
        }
        setLevels(next);
        rafRef.current = requestAnimationFrame(animate);
      };
      animate();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const elapsedSec = (performance.now() - startTimeRef.current) / 1000;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onComplete(reader.result, elapsedSec);
          }
        };
        reader.readAsDataURL(blob);

        cleanup();
        setState('recorded');
      };

      startTimeRef.current = performance.now();
      setElapsed(0);
      tickRef.current = window.setInterval(() => {
        const seconds = (performance.now() - startTimeRef.current) / 1000;
        setElapsed(seconds);
        if (seconds >= maxDurationSec) {
          stopRecording();
        }
      }, 100);

      recorder.start();
      setState('recording');
    } catch (err) {
      console.error('[AudioRecorder] getUserMedia failed:', err);
      cleanup();
      setState('denied');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const discard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setLevels(Array(32).fill(0));
    setElapsed(0);
    setState('idle');
    onCleared?.();
  };

  const belowMin = minDurationSec > 0 && elapsed < minDurationSec && state === 'recording';

  return (
    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-5">
      {state === 'unsupported' && (
        <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
          // RECORDING_NOT_SUPPORTED_IN_BROWSER
        </p>
      )}
      {state === 'denied' && (
        <p className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
          // MICROPHONE_PERMISSION_DENIED
        </p>
      )}

      <div className="flex items-end gap-1 h-16 w-full max-w-sm">
        {levels.map((lvl, i) => (
          <div
            key={i}
            className="flex-1 bg-[#FFCC00] rounded-full transition-[height] duration-75"
            style={{ height: `${Math.max(8, lvl * 100)}%`, opacity: state === 'recording' ? 1 : 0.25 }}
          />
        ))}
      </div>

      <div className="flex items-baseline gap-3">
        <span className={`text-2xl font-mono font-bold ${state === 'recording' ? 'text-[#FFCC00]' : 'text-zinc-400'}`}>
          {formatTime(elapsed)}
        </span>
        <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
          / {formatTime(maxDurationSec)}
        </span>
      </div>

      {state === 'recording' && minDurationSec > 0 && (
        <p className={`text-[10px] font-mono uppercase tracking-widest ${belowMin ? 'text-zinc-500' : 'text-[#FFCC00]'}`}>
          {belowMin
            ? `// MIN_${formatTime(minDurationSec)}_REQUIRED`
            : '// READY_TO_STOP'}
        </p>
      )}

      <div className="flex gap-3">
        {state === 'idle' && (
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 px-6 py-3 bg-[#FFCC00] text-black font-bold uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="w-4 h-4" /> START RECORDING
          </button>
        )}
        {state === 'recording' && (
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-bold uppercase text-xs rounded-full hover:scale-105 active:scale-95 transition-transform"
          >
            <Square className="w-4 h-4" /> STOP
          </button>
        )}
        {state === 'recorded' && (
          <>
            <button
              type="button"
              onClick={discard}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 border border-white/10 text-zinc-300 font-bold uppercase text-xs rounded-full hover:border-[#FFCC00]/40 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> DISCARD
            </button>
            <button
              type="button"
              onClick={() => { discard(); startRecording(); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-zinc-950 border border-white/10 text-zinc-300 font-bold uppercase text-xs rounded-full hover:border-[#FFCC00]/40 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> RE-RECORD
            </button>
          </>
        )}
        {(state === 'denied' || state === 'unsupported') && (
          <button
            type="button"
            onClick={() => setState('idle')}
            className="px-5 py-2.5 bg-zinc-950 border border-white/10 text-zinc-300 font-bold uppercase text-xs rounded-full hover:border-[#FFCC00]/40 transition-colors"
          >
            RETRY
          </button>
        )}
      </div>

      {audioUrl && state === 'recorded' && (
        <audio src={audioUrl} controls className="w-full filter invert opacity-80 h-10" />
      )}
    </div>
  );
};

export default AudioRecorder;
