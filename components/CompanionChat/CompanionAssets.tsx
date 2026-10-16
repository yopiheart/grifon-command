import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, FolderOpen, PanelLeft } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import type { VideoLibraryItem } from '../../types';
import type { FixtureJobIntent } from '../../services/companionFixtureJobs';
import type { ConversationBinding } from './CompanionChatShell';
import type { CloudFixtureResultClient, CloudFixtureResultReceipt } from '../../services/companionFixtureResults';
import { CompanionFixtureResult, type FixtureVideoLoader } from './CompanionFixtureResult';

const ghost = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFCC00]';

export function CompanionAssets({ userId, conversation, client, loadVideo, loadLibrary, selectedId, onSelect, onBack, onOpenChat }: {
  userId: string; conversation: ConversationBinding; client?: CloudFixtureResultClient; loadVideo: FixtureVideoLoader;
  loadLibrary: () => Promise<VideoLibraryItem[]>; selectedId: string | null; onSelect: (id: string) => void; onBack: () => void;
  onOpenChat: (intent: FixtureJobIntent, isCurrent: () => boolean) => Promise<void>;
}) {
  const [results, setResults] = useState<CloudFixtureResultReceipt[]>([]);
  const [videos, setVideos] = useState<VideoLibraryItem[]>([]);
  const [resultError, setResultError] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const identity = `${userId}:${conversation.chat.id}`;
  const current = useRef(identity); current.current = identity;
  useEffect(() => {
    let alive = true;
    const visible = () => alive && current.current === identity;
    setLoading(true); setResults([]); setVideos([]); setResultError(''); setLibraryError('');
    const reads = [
      (client ? client.list() : Promise.resolve([])).then(next => { if (visible()) setResults(next); }).catch(reason => { if (visible()) setResultError(reason instanceof Error ? reason.message : 'Fixture results could not be opened.'); }),
      loadLibrary().then(next => { if (visible()) setVideos(next); }).catch(reason => { if (visible()) setLibraryError(reason instanceof Error ? reason.message : 'Saved videos could not be opened.'); }),
    ];
    void Promise.all(reads).finally(() => { if (visible()) setLoading(false); });
    return () => { alive = false; };
  }, [identity, client, loadLibrary, attempt]);
  const selected = results.find(receipt => `${receipt.requestId}:${receipt.fixtureVersion}` === selectedId);
  const intent = selected ? JSON.parse(selected.intentText) as FixtureJobIntent : null;
  return <section data-testid="companion-assets" className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-3 sm:px-5">
      <Button variant="ghost" className={`${ghost} flex items-center gap-3 !px-3`} onClick={onBack}><ArrowLeft aria-hidden className="h-5 w-5 shrink-0" />Back to chat</Button>
      <Button variant="ghost" className={`${ghost} !px-3 md:hidden`} aria-label="Open conversations" onClick={conversation.openNavigation}><PanelLeft aria-hidden className="h-5 w-5 shrink-0" /></Button>
    </header>
    <div className="companion-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><div className="mx-auto max-w-3xl space-y-4">
      <GlassPanel className="space-y-3 p-4 sm:p-5"><h1 className="flex items-center gap-3 !text-lg !font-semibold !normal-case !tracking-normal"><FolderOpen aria-hidden className="h-5 w-5 shrink-0 text-[#FFCC00]" />Grifon Assets</h1><p className="text-sm leading-relaxed text-zinc-300">Browse your saved videos and fixture samples. Opening or refreshing Assets does not start generation.</p><Button variant="ghost" className={`${ghost} w-full`} disabled={loading} onClick={() => setAttempt(value => value + 1)}>Refresh Assets</Button>{loading && <p role="status" className="text-sm text-zinc-300">Opening saved Assets…</p>}</GlassPanel>
      {resultError && <p role="alert" className="flex items-start gap-2 break-words text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">{resultError}</span></p>}
      {selected && intent && client && <CompanionFixtureResult key={`${identity}:${intent.requestId}`} userId={userId} chatId={conversation.chat.id} intent={intent} client={client} cloudClient={conversation.cloudFixtureClient} loadVideo={loadVideo} onOpenChat={onOpenChat} />}
      {selectedId && !selected && !loading && !resultError && <p role="status" className="text-sm leading-relaxed text-zinc-300">This saved result is unavailable for the current account. Refresh to check the same Assets list.</p>}
      <GlassPanel className="space-y-3 p-4 sm:p-5" aria-label="Saved fixture samples"><h2 className="!text-base !font-semibold !normal-case !tracking-normal">Fixture samples</h2><p className="text-xs leading-relaxed text-zinc-400">Each linked fixture has one saved receipt. Samples are not generated from your inputs. Actual spend: PHP 0.00.</p>{!loading && !resultError && !results.length && <p className="text-sm text-zinc-300">No fixture sample receipts found.</p>}{results.map(receipt => {
        const id = `${receipt.requestId}:${receipt.fixtureVersion}`;
        return <Button key={id} variant="ghost" data-result-id={id} aria-label={`Open fixture sample: ${id}`} aria-pressed={selectedId === id} className={`${ghost} w-full !text-left ${selectedId === id ? '!text-[#FFCC00] !border-[#FFCC00]/50' : ''}`} onClick={() => onSelect(id)}><span className="block">Fixture sample video · {receipt.status === 'READY' ? 'Ready' : 'Pending'}</span><span className="mt-1 block text-xs font-normal text-zinc-400">{new Date(receipt.readyAt ?? receipt.createdAt).toLocaleString()}</span><span className="mt-1 block break-all text-xs font-normal text-zinc-400">{id}</span></Button>;
      })}</GlassPanel>
      <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Saved videos"><h2 className="!text-base !font-semibold !normal-case !tracking-normal">Saved videos</h2><p className="text-xs leading-relaxed text-zinc-400">Videos currently available in your existing Grifon video library.</p>{libraryError && <p role="alert" className="flex items-start gap-2 text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{libraryError}</span></p>}{!loading && !libraryError && !videos.length && <p className="text-sm text-zinc-300">No saved videos are currently available.</p>}<div className="grid gap-4 sm:grid-cols-2">{videos.map(video => <article key={video.path} className="min-w-0 space-y-2"><video controls playsInline preload="none" src={video.url} poster={video.posterUrl} width={640} height={360} style={{ aspectRatio: video.aspectRatio === '9:16' ? '9 / 16' : video.aspectRatio === '1:1' ? '1' : '16 / 9' }} aria-label="Saved video player" className="max-h-80 w-full rounded-xl bg-zinc-950 object-contain" /><p className="break-words text-sm leading-relaxed text-zinc-300">{video.prompt || 'Saved video'}</p></article>)}</div></GlassPanel>
    </div></div>
  </section>;
}
