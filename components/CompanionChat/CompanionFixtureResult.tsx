import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FolderOpen, LoaderCircle, MessageSquare, RefreshCw, Video } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import type { FixtureJobIntent } from '../../services/companionFixtureJobs';
import type { CloudFixtureClient, CloudFixtureSnapshot } from '../../services/companionCloudFixtures';
import type { CloudFixtureResultClient, CloudFixtureResultReceipt } from '../../services/companionFixtureResults';
import { FIXTURE_VIDEO_MANIFEST } from '../../services/companionFixtureVideo';

const ghost = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]';
export type FixtureVideoLoader = (receipt: CloudFixtureResultReceipt, signal?: AbortSignal) => Promise<Blob>;

export function CompanionFixtureResult({ userId, chatId, intent, client, cloudClient, observedJobStatus, loadVideo, onViewAssets, onOpenChat }: {
  userId: string; chatId: string; intent: FixtureJobIntent; client: CloudFixtureResultClient;
  cloudClient?: CloudFixtureClient; loadVideo: FixtureVideoLoader;
  observedJobStatus?: string;
  onViewAssets?: (receipt: CloudFixtureResultReceipt) => void;
  onOpenChat?: (intent: FixtureJobIntent, isCurrent: () => boolean) => Promise<void>;
}) {
  const identity = `${userId}:${chatId}:${intent.requestId}`;
  const current = useRef(identity); current.current = identity;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [receipt, setReceipt] = useState<CloudFixtureResultReceipt | null>(null);
  const [job, setJob] = useState<CloudFixtureSnapshot | null>(null);
  const [checked, setChecked] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [pollPaused, setPollPaused] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [videoAttempt, setVideoAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const intentText = JSON.stringify(intent);
  useEffect(() => {
    let alive = true, busy = false, polling = true, timer: number | undefined, reads = 0;
    const exactIntent = JSON.parse(intentText) as FixtureJobIntent;
    const visible = () => alive && current.current === identity;
    setReceipt(null); setJob(null); setChecked(false); setError(''); setPollPaused(false);
    const read = async () => {
      if (busy || !visible() || document.hidden) return;
      busy = true; setReading(true);
      try {
        if (exactIntent.ownerId !== userId) throw new Error('This result belongs to a different account.');
        const next = await client.get(exactIntent);
        const nextJob = next?.status === 'READY' || !cloudClient ? null : await cloudClient.get(exactIntent);
        if (!visible()) return;
        setReceipt(next); setJob(nextJob); setChecked(true); setError('');
        const running = next?.status === 'PENDING' && nextJob && !nextJob.queue.invalidated && ['prepared', 'running', 'complete'].includes(nextJob.queue.status);
        polling = !!running;
        if (running && ++reads < 120) timer = window.setTimeout(() => void read(), 2500);
        else if (running) setPollPaused(true);
      } catch (reason) {
        polling = false;
        if (visible()) { setChecked(true); setError(reason instanceof Error ? reason.message : 'The fixture result could not be checked.'); }
      } finally { busy = false; if (visible()) setReading(false); }
    };
    const visibility = () => {
      window.clearTimeout(timer);
      if (!document.hidden && polling && reads < 120) void read();
    };
    void read(); document.addEventListener('visibilitychange', visibility);
    return () => { alive = false; window.clearTimeout(timer); document.removeEventListener('visibilitychange', visibility); };
  }, [identity, intentText, userId, client, cloudClient, observedJobStatus, attempt]);
  useEffect(() => {
    let alive = true, objectUrl = '';
    const abort = new AbortController();
    setVideoUrl(''); setVideoError(''); setVideoLoading(false);
    if (receipt?.status === 'READY') {
      setVideoLoading(true);
      void loadVideo(receipt, abort.signal).then(blob => {
        if (!alive || current.current !== identity || abort.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setVideoUrl(objectUrl);
      }).catch(reason => {
        if (alive && current.current === identity && !abort.signal.aborted) setVideoError(reason instanceof Error ? reason.message : 'The sample video could not be opened.');
      }).finally(() => { if (alive && current.current === identity) setVideoLoading(false); });
    }
    return () => { alive = false; abort.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [identity, receipt, loadVideo, videoAttempt]);
  const openChat = async () => {
    if (!onOpenChat || opening) return;
    setOpening(true); setError('');
    try { await onOpenChat(intent, () => mounted.current && current.current === identity); }
    catch (reason) { if (mounted.current && current.current === identity) setError(reason instanceof Error ? reason.message : 'The original chat could not be opened.'); }
    finally { if (mounted.current && current.current === identity) setOpening(false); }
  };
  const stopped = !!job && (job.queue.invalidated || ['cancelled', 'failed', 'paused'].includes(job.queue.status));
  const status = receipt?.status === 'READY' ? 'Sample ready · saved in Grifon Assets'
    : !checked ? 'Checking this fixture result…'
      : !receipt ? 'No sample result is available for this request.'
        : stopped ? job!.queue.status === 'failed' ? 'Fixture stopped at a failed step. No sample is ready.' : 'Fixture stopped. No sample is ready.'
          : job?.queue.status === 'complete' ? 'The fixture completed; its sample is not ready yet.' : 'Fixture in progress. No sample is ready yet.';
  return <GlassPanel data-testid="fixture-result-card" data-result-id={receipt ? `${receipt.requestId}:${receipt.fixtureVersion}` : undefined} data-request-id={intent.requestId} className="space-y-4 p-4 sm:p-5" aria-label="Fixture sample video">
    <div className="flex items-start gap-3"><Video aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-[#FFCC00]" /><div className="min-w-0 flex-1"><h2 className="!text-base !font-semibold !normal-case !tracking-normal">Fixture sample video</h2><p className="mt-1 text-sm leading-relaxed text-zinc-300">This sample was not generated from your brief, reference, photos or selected voice.</p></div></div>
    <p role="status" data-testid="fixture-result-status" className="text-sm leading-relaxed text-zinc-300">{status}</p>
    <p className="text-sm text-zinc-400">Actual spend: PHP 0.00.</p>
    {!receipt && checked && !error && <p className="text-xs leading-relaxed text-zinc-400">Older jobs may have no sample receipt. Refresh checks this exact request and does not create a replacement.</p>}
    {receipt?.status === 'PENDING' && !stopped && <p className="text-xs leading-relaxed text-zinc-400">The fixture video will appear here and in Grifon Assets after this job completes.</p>}
    {pollPaused && <p className="text-xs leading-relaxed text-zinc-400">Automatic checks paused. Refresh when you want to check this result again.</p>}
    {(error || videoError) && <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{error || videoError}</span></p>}
    {videoLoading && <p role="status" className="flex items-center gap-2 text-sm text-zinc-300"><LoaderCircle aria-hidden className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />Opening the sample video…</p>}
    {videoUrl && <video controls playsInline preload="metadata" src={videoUrl} width={FIXTURE_VIDEO_MANIFEST.width} height={FIXTURE_VIDEO_MANIFEST.height} style={{ aspectRatio: `${FIXTURE_VIDEO_MANIFEST.width} / ${FIXTURE_VIDEO_MANIFEST.height}` }} aria-label="Fixture sample video player" onError={() => setVideoError('The sample video could not play. Retry opening the same saved result.')} className="mx-auto max-h-[420px] w-full rounded-xl bg-zinc-950 object-contain" />}
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      {videoUrl && <a className={`${ghost} flex items-center justify-center gap-3 px-4 py-3`} href={videoUrl} download={`fixture-sample-${intent.requestId}-v1.mp4`}><Download aria-hidden className="h-5 w-5 shrink-0" />Download fixture video</a>}
      <Button variant="ghost" className={`${ghost} flex items-center justify-center gap-3`} disabled={reading || opening} onClick={() => setAttempt(value => value + 1)}><RefreshCw aria-hidden className={`h-5 w-5 shrink-0 ${reading ? 'animate-spin motion-reduce:animate-none' : ''}`} />Refresh result</Button>
      {videoError && receipt?.status === 'READY' && <Button variant="ghost" className={ghost} disabled={videoLoading} onClick={() => setVideoAttempt(value => value + 1)}>Retry video</Button>}
      {receipt?.status === 'READY' && onViewAssets && <Button variant="ghost" className={`${ghost} flex items-center justify-center gap-3`} onClick={() => onViewAssets(receipt)}><FolderOpen aria-hidden className="h-5 w-5 shrink-0" />View in Assets</Button>}
      {onOpenChat && <Button variant="ghost" className={`${ghost} flex items-center justify-center gap-3`} disabled={opening} onClick={() => void openChat()}><MessageSquare aria-hidden className="h-5 w-5 shrink-0" />{opening ? 'Opening chat…' : 'Open in chat'}</Button>}
    </div>
    {receipt && <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]">Sample details</summary><div className="space-y-2 text-xs leading-relaxed text-zinc-400"><p>Asset: <span className="break-all">{receipt.requestId}:{receipt.fixtureVersion}</span></p><p>Original chat: <span className="break-all">{receipt.ownerChatId}</span></p><p>Input snapshot: <span className="break-all">{receipt.sourceSaveId}</span></p></div></details>}
  </GlassPanel>;
}
