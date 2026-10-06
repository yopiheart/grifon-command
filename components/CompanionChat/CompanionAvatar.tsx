import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCw } from 'lucide-react';
import Button from '../ui/Button';

export type CompanionReaction = 'idle' | 'reading' | 'working' | 'ready';
interface CompanionAvatarProps {
  state: CompanionReaction;
  className?: string;
}

/** The accepted 3D runtime stays isolated; only explicit state/motion messages cross the bridge. */
export function CompanionAvatar({ state, className = '' }: CompanionAvatarProps) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const base = '/companion/';
  const send = useCallback((command: Record<string, unknown>) => {
    frame.current?.contentWindow?.postMessage({ channel: 'grifon-companion', ...command }, window.location.origin);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const message = event.data as { channel?: unknown; event?: unknown } | null;
      if (!message || message.channel !== 'grifon-companion') return;
      if (message.event === 'ready') { setReady(true); setFailed(false); }
      if (message.event === 'failed') { setReady(false); setFailed(true); }
    };
    window.addEventListener('message', onMessage);
    const timeout = window.setTimeout(() => {
      // Functional chat remains available even when a device cannot render the companion.
      if (!frame.current?.dataset.ready) setFailed(true);
    }, 30_000);
    return () => { window.removeEventListener('message', onMessage); window.clearTimeout(timeout); };
  }, [attempt]);

  useEffect(() => {
    send({ command: 'state', state });
    send({ command: 'pause', paused });
  }, [state, paused, ready, attempt, send]);

  useEffect(() => {
    if (!ready || paused) return;
    let raf = 0;
    let point: { x: number; y: number } | null = null;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && !(event.target instanceof Node && host.current?.contains(event.target))) return;
      const bounds = host.current?.getBoundingClientRect();
      if (!bounds) return;
      point = {
        x: Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / Math.max(window.innerWidth / 2, 160))),
        y: Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - event.clientY) / Math.max(window.innerHeight / 2, 160))),
      };
      if (!raf) raf = window.requestAnimationFrame(() => { raf = 0; if (point) send({ command: 'pointer', ...point }); });
    };
    const center = () => send({ command: 'pointer', x: 0, y: 0 });
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', center);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', center);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [ready, paused, send]);

  const retry = () => { setReady(false); setFailed(false); setAttempt(value => value + 1); };
  return (
    <div ref={host} className={`relative isolate ${className}`} data-companion-state={state}>
      {!ready && <img src={`${base}neutral.png`} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />}
      <iframe
        key={attempt} ref={frame} src={`${base}frame.html`} title="Grifon animated companion"
        aria-hidden="true" tabIndex={-1} data-ready={ready ? 'true' : undefined}
        className="pointer-events-none absolute inset-0 h-full w-full border-0"
        style={{ opacity: ready ? 1 : 0 }}
        allow="camera 'none'; microphone 'none'; geolocation 'none'"
        onLoad={() => { send({ command: 'state', state }); send({ command: 'pause', paused }); }}
        onError={() => { setReady(false); setFailed(true); }}
      />
      <div className="absolute bottom-0 right-0 z-10 flex items-center gap-1">
        {failed ? (
          <Button type="button" variant="ghost" className="min-h-11 min-w-11 !rounded-xl !p-2 text-xs" onClick={retry} aria-label="Retry companion motion" title="Still image. Retry companion motion">
            <RotateCw className="h-4 w-4 shrink-0" />
          </Button>
        ) : ready ? (
          <Button type="button" variant="ghost" className="min-h-11 min-w-11 !rounded-xl !p-2" onClick={() => setPaused(value => !value)} aria-label={paused ? 'Resume companion motion' : 'Pause companion motion'} aria-pressed={paused}>
            {paused ? <Play className="h-4 w-4 shrink-0" /> : <Pause className="h-4 w-4 shrink-0" />}
          </Button>
        ) : null}
      </div>
      {failed && <span role="status" className="sr-only">Companion shown as a still image. Chat is available.</span>}
    </div>
  );
}
