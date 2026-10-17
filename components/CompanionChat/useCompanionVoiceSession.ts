import { useCallback, useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';
import { CompanionVoiceClient, connectCompanionVoice, createBrowserVoiceAudio, requestCompanionVoiceSession, type CompanionVoiceDependencies } from '../../services/companionVoiceSession';

const browserVoiceDependencies: CompanionVoiceDependencies = { bootstrap: requestCompanionVoiceSession, audio: createBrowserVoiceAudio, connect: connectCompanionVoice };

export function useCompanionVoiceSession(anchor: RefObject<HTMLElement>, disabled: boolean, scope: string, dependencies: CompanionVoiceDependencies = browserVoiceDependencies) {
  const client = useRef<CompanionVoiceClient>();
  if (!client.current) client.current = new CompanionVoiceClient(dependencies);
  const session = client.current;
  const snapshot = useSyncExternalStore(session.subscribe, session.snapshot);
  const current = useRef({ disabled, scope }); current.current = { disabled, scope };
  const blocked = useCallback(() => current.current.disabled || document.hidden || !!anchor.current?.closest('[inert]'), [anchor]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) session.dismiss(); };
    document.addEventListener('visibilitychange', visibility);
    const observer = new MutationObserver(() => { if (blocked()) session.dismiss(); });
    for (let node = anchor.current; node; node = node.parentElement) observer.observe(node, { attributes: true, attributeFilter: ['inert'] });
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); session.dismiss(); };
  }, [anchor, blocked, session]);
  useEffect(() => {
    session.dismiss();
  }, [disabled, scope, session]);
  const start = useCallback(() => { if (!blocked()) void session.start(); }, [blocked, session]);
  const reviewIsCurrent = (id: number) => session.snapshot().status === 'ended' && session.snapshot().transcripts.some(transcript => transcript.role === 'user' && transcript.id === id);
  return { ...snapshot, start, end: session.end, dismiss: session.dismiss, reviewIsCurrent, setMuted: session.setMuted, active: ['connecting', 'listening', 'responding', 'speaking'].includes(snapshot.status) };
}
