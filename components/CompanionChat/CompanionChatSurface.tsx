import { Fragment, memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { AlertTriangle, ArrowLeft, Check, ImagePlus, Loader2, PanelLeft, Plus, X } from 'lucide-react';
import type { ProducerSurfaceController } from '../OneShotAd/ProducerFlow';
import type { LockablePresetId } from '../../types';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { DUR, EASE } from '../ui/motionTokens';
import type { CompanionReaction } from './CompanionAvatar';
import type { CompanionAvatarPresentation } from './CompanionAvatarLayer';
import { CompanionComposer, type CompanionComposerHandle } from './CompanionComposer';
import './companionChat.css';
import type { ConversationBinding } from './CompanionChatShell';
import { CompanionOutputViewer } from './CompanionOutputViewer';
import { CompanionScrollEdge } from './CompanionScrollEdge';
import { RECOMMENDED_VOICES } from '../SignalModulator/pinoyReady';
import { compressImageForUpload } from '../../utils/imageCompression';
import {
  acceptCompanionAnswer, buildCompanionInput, clearCompanionDraft, companionMessage,
  createCompanionDraft, loadCompanionDraft, nextCompanionField, parseCompanionRevision, saveCompanionDraft,
  type CompanionDraft,
} from '../../services/companionIntake';

export interface CompanionChatSurfaceProps {
  controller: ProducerSurfaceController;
  userId: string;
  onBack: () => void;
  onUpgrade: () => void;
  presetUnlocked: boolean;
  quotaBlocked?: boolean;
  quotaReady?: boolean;
  allowanceLoading?: boolean;
  onRetryAllowance?: () => void;
  videoAllowed?: boolean | null;
  fixtureLabel?: string;
  conversation?: ConversationBinding;
  onAvatarPresentation: (chatId: string, presentation: CompanionAvatarPresentation) => void;
}

const control = 'min-h-11 min-w-11 !rounded-xl !font-sans !text-sm !font-semibold !normal-case !tracking-normal';
const inputStyle = 'min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]';
const styles: { label: string; value: LockablePresetId | null; locked: boolean }[] = [
  { label: 'Raw', value: 'none', locked: false }, { label: 'Auto', value: null, locked: false },
  { label: 'Impact', value: 'impact', locked: true }, { label: 'Clean', value: 'clean', locked: true },
  { label: 'Punch', value: 'punch', locked: true }, { label: 'Bars', value: 'bars', locked: true },
  { label: 'Spotlight', value: 'spotlight', locked: true },
];
const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const motionStyle = {
  '--companion-duration': `${DUR.instant}s`,
  '--companion-reply-duration': `${DUR.entrance}s`,
  '--companion-ease': `cubic-bezier(${EASE.expressive.join(',')})`,
} as CSSProperties;
const Transcript = memo(function Transcript({ messages, hiddenMessageId }: { messages: CompanionDraft['messages']; hiddenMessageId: string | null }) {
  const latestUser = [...messages].reverse().find(message => message.role === 'user')?.id;
  return <>{messages.map((message, index) => message.id === hiddenMessageId ? null : <Fragment key={message.id}>
    {(index === 0 || message.at - messages[index-1].at > 30*60*1000) && <p data-testid="conversation-time-divider" className="text-center font-mono text-[11px] text-on-surface-sublabel"><time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {time(message.at)}</time></p>}
    <article className={message.role === 'user' ? 'companion-user-row ml-auto w-fit max-w-[88%]' : 'companion-assistant-row w-fit max-w-[92%]'}>
    <p className={`companion-message whitespace-pre-wrap break-words rounded-2xl px-4 py-3 ${message.role === 'user' ? 'companion-message-user' : 'companion-message-assistant rounded-bl-sm text-zinc-200'}`}>{message.text}</p>
    {message.id === latestUser && <p className="mt-2 text-right font-mono text-[11px] text-on-surface-sublabel"><time dateTime={new Date(message.at).toISOString()}>{time(message.at)}</time> · Received</p>}
  </article></Fragment>)}</>;
});

export function CompanionChatSurface({ controller, userId, onBack, onUpgrade, presetUnlocked, quotaBlocked = false, quotaReady = true, allowanceLoading = false, onRetryAllowance, videoAllowed = true, fixtureLabel, conversation, onAvatarPresentation }: CompanionChatSurfaceProps) {
  const [draft, setDraft] = useState<CompanionDraft>(() => conversation?.chat.draft ?? loadCompanionDraft(userId) ?? createCompanionDraft());
  const [hasText, setHasText] = useState(!!conversation?.chat.composer);
  const [viewer, setViewer] = useState(false);
  const closeViewer = useCallback(() => setViewer(false), []);
  const readOnly = !!controller.readOnly;
  const [localError, setLocalError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(true);
  const [editing, setEditing] = useState(false);
  const [pendingReplyId, setPendingReplyId] = useState<string | null>(null);
  const pendingReply = useRef<string | null>(null);
  const replyTimer = useRef<number | null>(null);
  const [armedScene, setArmedScene] = useState<number | null>(null);
  const [armedPreset, setArmedPreset] = useState<{ value: LockablePresetId | null; label: string } | null>(null);
  const composer = useRef<CompanionComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const avatarSlot = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLElement>(null);
  const footer = useRef<HTMLElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const uploadEpoch = useRef(0);
  const owner = useRef(userId);
  const nearBottom = useRef(true);
  const measuredViewportHeight = useRef(0);
  const firstScroll = useRef(true);
  const shownReview = useRef<string | null>(null);
  const scrollFrame = useRef(0);
  const followingScroll = useRef(false);
  const actionLock = useRef(false);
  const actionEpoch = useRef(0);
  const [actionPending, setActionPending] = useState(false);
  const { run } = controller;
  const failed = !!controller.error || controller.phase === 'error' || controller.phase === 'resume-error' || run?.status === 'error';
  const loadingRun = controller.phase === 'resuming';
  const replyPending = pendingReplyId !== null && !run && !loadingRun;
  const hiddenReplyId = replyPending ? pendingReplyId : null;
  const visibleLastMessageId = draft.messages[draft.messages.length - (replyPending ? 2 : 1)]?.id;
  const busy = controller.busy || actionPending;
  const disabled = busy || loadingRun || uploading || readOnly;
  const field = nextCompanionField(draft);
  const atStoryboard = run?.gate === 'storyboard';
  const atResult = run?.gate === 'first_cut' || !!run?.finalVideoUrl;
  const reviewKey = !run && !replyPending && (!field || editing) ? `brief:${userId}`
    : atStoryboard && !failed ? `storyboard:${run.runId}` : atResult ? `result:${run.runId}` : null;
  const readyToApprove = !!run?.scenes.length && run.scenes.every(scene => scene.imageUrl && scene.status !== 'flagged');
  const retryNeedsAllowance = !run?.gate && (!quotaReady || quotaBlocked || (!!run?.storyboardApproved && videoAllowed !== true));
  const activeStage = run?.stages.find(stage => stage.status === 'running');
  const avatarState: CompanionReaction = failed ? 'idle' : busy || loadingRun || replyPending ? 'working'
    : uploading || (!run && hasText) ? 'reading' : atStoryboard || (atResult && !!run?.finalVideoUrl) ? 'ready' : 'idle';
  const stateLabel = readOnly ? 'Saved conversation · read-only' : failed || localError ? 'Needs attention'
    : loadingRun ? 'Opening your saved ad…' : uploading ? 'Preparing your photo…' : replyPending ? 'Replying…'
      : busy ? controller.phase === 'researching' ? 'Researching your product…'
        : controller.approving ? 'Starting production…' : controller.reshooting !== null ? `Updating scene ${controller.reshooting + 1}…`
          : controller.presetBusy ? 'Applying edit style…' : activeStage?.label ?? 'Working…'
        : atStoryboard ? 'Waiting for storyboard review' : atResult ? 'First cut ready' : 'Ready';
  const clearPendingReply = useCallback(() => {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    replyTimer.current = null; pendingReply.current = null; setPendingReplyId(null);
  }, []);
  const measureClearance = useCallback(() => {
    const node = scroller.current;
    if (!node || !header.current || !footer.current) return { top: 24, bottom: 24 };
    const top = 16;
    const bottom = Math.ceil(footer.current.getBoundingClientRect().height) + 24;
    node.style.setProperty('--companion-header-offset', `${top}px`);
    node.style.setProperty('--companion-footer-offset', `${bottom}px`);
    return { top, bottom };
  }, []);

  useEffect(() => {
    if (owner.current !== userId) {
      clearPendingReply();
      owner.current = userId; uploadEpoch.current++;
      actionEpoch.current++; actionLock.current = false; setActionPending(false);
      setDraft(loadCompanionDraft(userId) ?? createCompanionDraft());
      composer.current?.clear(); setLocalError(''); setUploading(false); setEditing(false); setArmedScene(null); setArmedPreset(null);
      firstScroll.current = true; nearBottom.current = true;
      return;
    }
    if (conversation) conversation.update({ draft });
    else setSaved(saveCompanionDraft(userId, draft));
  }, [draft, userId, clearPendingReply]);
  useEffect(() => { if (conversation && run?.runId && run.runId !== conversation.chat.runId) conversation.update({ runId: run.runId }); }, [run?.runId]);
  useEffect(() => { if (conversation) composer.current?.focus(); }, []);
  useEffect(() => () => {
    uploadEpoch.current++; actionEpoch.current++;
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    replyTimer.current = null; pendingReply.current = null;
  }, []);
  useEffect(() => { if (run || loadingRun) clearPendingReply(); }, [run?.runId, loadingRun, clearPendingReply]);
  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node || !header.current || !footer.current) return;
    let frame = 0;
    const measure = () => {
      measureClearance();
      measuredViewportHeight.current = node.clientHeight;
      if (node.scrollHeight <= node.clientHeight) nearBottom.current = true;
      if (nearBottom.current) node.scrollTo({ top: node.scrollHeight, behavior: 'auto' });
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; measure(); });
    };
    measure();
    const observer = new ResizeObserver(schedule);
    observer.observe(header.current); observer.observe(footer.current);
    observer.observe(node, { box: 'border-box' });
    return () => { observer.disconnect(); if (frame) window.cancelAnimationFrame(frame); };
  }, [measureClearance]);
  useLayoutEffect(() => {
    const slot = avatarSlot.current;
    if (!slot || !surface.current || !header.current || !conversation) return;
    const publish = () => {
      if (!slot.isConnected) return;
      const bounds = slot.getBoundingClientRect();
      onAvatarPresentation(conversation.chat.id, {
        state: avatarState, bounds: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
        inert: !!slot.closest('[inert]') || (viewer && window.innerWidth < 768),
      });
    };
    publish();
    const resize = new ResizeObserver(publish);
    resize.observe(slot); resize.observe(surface.current); resize.observe(header.current);
    const attributes = new MutationObserver(publish);
    for (let node = slot.parentElement; node; node = node.parentElement) attributes.observe(node, { attributes: true, attributeFilter: ['inert'] });
    window.addEventListener('resize', publish);
    return () => { resize.disconnect(); attributes.disconnect(); window.removeEventListener('resize', publish); };
  }, [avatarState, viewer, conversation?.chat.id, onAvatarPresentation]);
  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    const openingReview = reviewKey !== shownReview.current;
    if (!nearBottom.current) { shownReview.current = reviewKey; return; }
    followingScroll.current = true;
    scrollFrame.current = window.requestAnimationFrame(() => {
      scrollFrame.current = 0;
      if (!nearBottom.current) return;
      shownReview.current = reviewKey;
      const review = openingReview ? node.querySelector<HTMLElement>('[data-companion-review]') : null;
      const { top: topInset, bottom: bottomInset } = measureClearance();
      if (review && review.offsetHeight > node.clientHeight - topInset - bottomInset) {
        const top = node.scrollTop + review.getBoundingClientRect().top - node.getBoundingClientRect().top - topInset;
        firstScroll.current = false; followingScroll.current = false; nearBottom.current = false;
        node.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
        return;
      }
      const instant = firstScroll.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches
        || node.scrollHeight - node.scrollTop - node.clientHeight > node.clientHeight;
      firstScroll.current = false;
      followingScroll.current = !instant && node.scrollHeight-node.scrollTop-node.clientHeight > 1;
      node.scrollTo({ top: node.scrollHeight, behavior: instant ? 'auto' : 'smooth' });
    });
    return () => { if (scrollFrame.current) window.cancelAnimationFrame(scrollFrame.current); };
  }, [visibleLastMessageId, run?.gate, activeStage?.id, controller.error, reviewKey, measureClearance]);
  useEffect(() => { setArmedScene(null); setArmedPreset(null); }, [run?.runId, run?.gate]);

  const stopFollowing = () => {
    const node = scroller.current;
    if (scrollFrame.current) window.cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = 0; nearBottom.current = !!node && node.scrollHeight <= node.clientHeight; followingScroll.current = false;
    shownReview.current = reviewKey;
    if (node) node.scrollTo({ top: node.scrollTop, behavior: 'auto' });
  };

  const call = async (action: () => Promise<void>) => {
    if (actionLock.current || busy || loadingRun || readOnly) return;
    actionLock.current = true; setActionPending(true); setLocalError('');
    const currentOwner = userId;
    const epoch = ++actionEpoch.current;
    try { if (conversation) await conversation.leave(() => {}); await action(); }
    catch (error) { if (owner.current === currentOwner && epoch === actionEpoch.current) setLocalError(error instanceof Error ? error.message === 'CHAT_SAVE_FAILED' ? 'Save this chat before starting more work. Use the save recovery below.' : error.message : 'Please try again.'); }
    finally { if (owner.current === currentOwner && epoch === actionEpoch.current) { actionLock.current = false; setActionPending(false); } }
  };

  const send = (text: string) => {
    if (!text.trim() || disabled || pendingReply.current) return false;
    try {
      if (!run && field) {
        const next = acceptCompanionAnswer(draft, text);
        const replyId = next.messages[next.messages.length - 1].id;
        const currentOwner = userId;
        pendingReply.current = replyId; setPendingReplyId(replyId);
        setDraft(next); if (conversation) conversation.update({ draft: next }); else setSaved(saveCompanionDraft(userId, next));
        replyTimer.current = window.setTimeout(() => {
          if (owner.current !== currentOwner || pendingReply.current !== replyId) return;
          replyTimer.current = null; pendingReply.current = null; setPendingReplyId(null);
        }, DUR.entrance * 1000);
      }
      else {
        const revision = atResult ? parseCompanionRevision(text) : null;
        let reply = !run ? 'Your brief is ready. Use Edit brief to change details, then Generate storyboard when everything looks right.'
          : 'I can regenerate a storyboard image, reshoot a scene, or apply an edit style using the controls below.';
        if (revision?.kind === 'reshoot') {
          if (run?.scenes.some(scene => scene.sceneIdx === revision.sceneIndex)) {
            setArmedScene(revision.sceneIndex); reply = `Scene ${revision.sceneIndex+1} is selected. Review its take allowance below, then confirm the reshoot.`;
          } else reply = 'That scene is not in this ad. Choose one of the scene numbers below.';
        } else if (revision?.kind === 'preset') {
          const preset = styles.find(style => style.value === revision.preset)!;
          if (preset.locked && !presetUnlocked) reply = `${preset.label} requires Pro. You can choose Raw or Auto, or upgrade below.`;
          else { setArmedPreset(preset); reply = `${preset.label} is selected. Confirm Apply style below to update this cut.`; }
        }
        setDraft(previous => ({ ...previous, messages: [...previous.messages, companionMessage('user', text.trim()), companionMessage('assistant', reply)].slice(-120) }));
      }
      setLocalError(''); nearBottom.current = true; followingScroll.current = true;
      return true;
    } catch (error) { setLocalError(error instanceof Error ? error.message : 'Please check your message.'); return false; }
  };

  const attach = async (file: File | undefined) => {
    if (!file || disabled || run) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20*1024*1024) {
      setLocalError('Choose a JPG, PNG or WebP image smaller than 20 MB.'); return;
    }
    const epoch = ++uploadEpoch.current; setUploading(true); setLocalError('');
    try {
      const image = await compressImageForUpload(file);
      if (epoch !== uploadEpoch.current) return;
      setDraft(previous => ({ ...previous, heroImageBase64: image.dataUrl, imageName: file.name }));
    } catch { if (epoch === uploadEpoch.current) setLocalError('That image could not be opened. Please try another.'); }
    finally { if (epoch === uploadEpoch.current) setUploading(false); }
  };

  const generate = () => {
    if (!quotaReady || quotaBlocked || disabled || pendingReply.current || field || run) return;
    try { const input = buildCompanionInput(draft); setEditing(false); void call(() => controller.start(input)); }
    catch (error) { setLocalError(error instanceof Error ? error.message : 'Please check your brief.'); }
  };
  const reset = () => {
    if (busy) return;
    clearPendingReply();
    controller.reset(); uploadEpoch.current++; clearCompanionDraft(userId);
    setDraft(createCompanionDraft()); composer.current?.clear(); setLocalError(''); setEditing(false); setArmedScene(null); setArmedPreset(null);
    nearBottom.current = true; composer.current?.focus();
  };
  const cancel = () => { actionEpoch.current++; controller.cancel(); actionLock.current = false; setActionPending(false); };
  const exit = () => { clearPendingReply(); if (controller.busy || actionPending) cancel(); onBack(); };
  const saveHint = fixtureLabel ?? 'No generation starts until you confirm.';
  const preferences = (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label className="text-xs text-zinc-400">Language<select aria-label="Ad language" disabled={disabled || !!run} value={draft.language} onChange={event => setDraft({ ...draft, language: event.target.value as CompanionDraft['language'] })} className={`${inputStyle} mt-1`}><option>English</option><option>Taglish</option></select></label>
      <label className="text-xs text-zinc-400">Format<select aria-label="Ad format" disabled={disabled || !!run} value={draft.aspectRatio} onChange={event => setDraft({ ...draft, aspectRatio: event.target.value as CompanionDraft['aspectRatio'] })} className={`${inputStyle} mt-1`}><option value="9:16">Vertical · 9:16</option><option value="16:9">Landscape · 16:9</option><option value="1:1">Square · 1:1</option></select></label>
      <label className="text-xs text-zinc-400">Voice<select aria-label="Ad voice" disabled={disabled || !!run} value={draft.voiceId} onChange={event => setDraft({ ...draft, voiceId: event.target.value })} className={`${inputStyle} mt-1`}>{RECOMMENDED_VOICES.map(voice => <option key={voice.id} value={voice.id}>{voice.name} · {voice.vibe}</option>)}</select></label>
    </div>
  );

  return <div ref={surface} className={`companion-chat relative flex h-full min-h-0 flex-col overflow-hidden bg-zinc-950 font-sans font-normal tracking-normal text-white ${viewer ? "companion-viewer-open" : ""}`} style={motionStyle} data-testid="companion-chat" data-chat-id={conversation?.chat.id} data-companion-state={avatarState}>
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1">
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Conversation with Grifon">
        <header ref={header} className={`companion-header pointer-events-none relative z-20 flex shrink-0 items-center justify-center px-4 py-4 sm:px-8 ${conversation ? 'companion-bound-header' : ''}`}>
          <div className="companion-header-navigation pointer-events-auto">{conversation ? <Button variant="ghost" className={control + ' !p-3 md:!hidden'} aria-label="Open conversations" onClick={conversation.openNavigation}><PanelLeft className="h-4 w-4" /></Button> : <Button variant="ghost" className={control + ' !p-3'} aria-label="Back to dashboard" onClick={exit}><ArrowLeft className="h-4 w-4" /></Button>}</div>
          {!conversation && <div className="pointer-events-auto absolute right-4 top-3 sm:right-8"><Button variant="ghost" className={control + ' !p-3'} aria-label="New ad" disabled={disabled} onClick={reset}><Plus className="h-4 w-4" /></Button></div>}
          <div className="companion-identity companion-identity-badge flex min-w-0 w-fit items-center gap-2">
            <div ref={avatarSlot} aria-hidden="true" data-companion-avatar-slot className="h-14 w-14 shrink-0 sm:h-16 sm:w-16" />
            <div className="companion-identity-copy min-w-0">
              <h1 className="companion-display !normal-case !tracking-tight"><span aria-hidden="true" className="companion-name-glow">Grifon</span><span>Grifon</span></h1>
              <p role="status" aria-live="polite" aria-atomic="true" className="companion-identity-status truncate text-xs leading-relaxed text-zinc-100">{stateLabel}</p>
            </div>
          </div>
          <CompanionScrollEdge scroller={scroller} />
        </header>
        <div ref={scroller}
          onScroll={event => {
            const node = event.currentTarget;
            // A viewport resize changes the bottom gap before its observer runs.
            // Preserve following intent until that resize has been measured.
            if (node.clientHeight !== measuredViewportHeight.current) return;
            if (node.scrollHeight-node.scrollTop-node.clientHeight < 24) { nearBottom.current = true; followingScroll.current = false; }
            else if (!followingScroll.current) nearBottom.current = false;
          }}
          onPointerDown={event => { if (event.target === event.currentTarget && followingScroll.current) stopFollowing(); }}
          onWheel={event => { if (event.deltaY < 0 || followingScroll.current || !nearBottom.current) stopFollowing(); }} onTouchMove={stopFollowing}
          onKeyDown={event => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key) && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)) stopFollowing(); }}
          className="companion-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-8" data-testid="conversation-scroll">
          <div className="companion-transcript mx-auto flex min-h-full flex-col justify-end">
            <div className="shrink-0 space-y-5">
            <div aria-label="Beta limits" className="space-y-2 text-xs leading-relaxed text-zinc-400">
              <p>Beta · guided ad brief. Each answer fills the field Grifon asks for. Use Edit brief at review to make corrections.</p>
              <p>Chats stay in this browser on this device. Keep this tab open during production; work may not resume after closing it.</p>
            </div>
            <Transcript messages={draft.messages} hiddenMessageId={hiddenReplyId} />
            {replyPending && <div role="status" aria-label="Grifon is typing" className="companion-message-assistant flex w-fit items-center gap-1.5 rounded-2xl rounded-bl-sm px-4 py-4">
              <span className="sr-only">Grifon is typing</span>
              <span aria-hidden="true" className="companion-typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" /><span aria-hidden="true" className="companion-typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" /><span aria-hidden="true" className="companion-typing-dot h-1.5 w-1.5 rounded-full bg-zinc-400" />
            </div>}
            {!run && !replyPending && (!field || editing) && <GlassPanel className="p-4 sm:p-5" aria-label="Review your brief" data-companion-review="brief">
              <div className="flex items-center justify-between gap-3"><h2 className="!text-base !font-semibold !normal-case !tracking-normal">Your product ad</h2><Button variant="ghost" className={`${control} !px-3`} disabled={disabled} onClick={() => setEditing(!editing)}>{editing ? 'Done editing' : 'Edit brief'}</Button></div>
              {editing ? <div className="mt-3 space-y-3">{(['brief','brandName','productName','offer','price'] as const).map(key => <label key={key} className="block text-xs text-zinc-400">{({ brief: 'Original brief', brandName: 'Brand name', productName: 'Product name', offer: 'Offer', price: 'Price' })[key]}<textarea className={`${inputStyle} mt-1 resize-y`} value={draft[key]} maxLength={key === 'brief' ? 4000 : key === 'offer' ? 2000 : 200} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div> : <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt className="text-zinc-400">Brand</dt><dd className="break-words">{draft.brandName}</dd><dt className="text-zinc-400">Product</dt><dd className="break-words">{draft.productName}</dd><dt className="text-zinc-400">Offer</dt><dd className="break-words">{draft.offer}</dd><dt className="text-zinc-400">Price</dt><dd className="break-words">{draft.price}</dd></dl>}
              {preferences}
              <p className="mt-3 text-xs leading-relaxed text-zinc-400">Testimonial ad · presenter cast automatically to match the selected voice. Stock voices use an American English accent; Taglish pronunciation may vary.</p>
              {!draft.heroImageBase64 && <Button variant="secondary" className={`${control} mt-4 flex w-full items-center justify-center gap-2`} disabled={disabled} onClick={() => upload.current?.click()}><ImagePlus className="h-4 w-4 shrink-0" /> Add product photo</Button>}
              <p className="mt-4 text-xs leading-relaxed text-zinc-400">Generating uses your plan allowances for research and images. Review and approve the storyboard before video production begins.</p>
              {(!draft.heroImageBase64 || field) && <p className="mt-3 text-xs text-zinc-400">{field ? 'Complete each brief field before generating.' : 'Add a product photo before generating.'}</p>}
              {!quotaReady ? <div className="mt-4"><p className="text-xs text-zinc-400">{allowanceLoading ? 'Checking your generation allowance…' : 'Your allowance could not be confirmed. Retry before generating.'}</p><Button className={`${control} mt-3 w-full`} disabled={allowanceLoading} onClick={onRetryAllowance}>{allowanceLoading ? 'Checking allowance…' : 'Retry allowance'}</Button></div> : quotaBlocked ? <Button className={`${control} mt-4 w-full`} onClick={onUpgrade}>View plan options</Button> : <Button className={`${control} mt-4 w-full`} disabled={disabled || !draft.heroImageBase64 || !!field} onClick={generate}>Generate storyboard</Button>}
            </GlassPanel>}
            {loadingRun && <p role="status" className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" /> Opening your saved ad…</p>}
            {!readOnly && (busy || (!!run && !atStoryboard && !atResult && !failed)) && <GlassPanel className="p-4" aria-label="Production progress"><div role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin text-[#FFCC00]" />{stateLabel}</div>{run && <details className="mt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">View steps</summary><ol className="space-y-2">{run.stages.filter(stage => stage.status !== 'pending').map(stage => <li key={stage.id} className="flex items-start gap-2 text-xs text-zinc-400">{stage.status === 'done' ? <Check className="h-4 w-4 shrink-0 text-[#FFCC00]" /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#FFCC00]" />}<span>{stage.label}{stage.error ? ` — ${stage.error}` : ''}</span></li>)}</ol></details>}<p className="mt-3 text-xs leading-relaxed text-zinc-400">Stop waiting ends this tab’s waiting. Submitted work may still finish and use your allowance.</p><Button variant="ghost" className={`${control} mt-3 !px-2`} onClick={cancel}>Stop waiting</Button></GlassPanel>}
            {(controller.phase === 'resume-error' || (!readOnly && (failed || localError))) && <GlassPanel className="p-4" role="alert"><p className="text-sm leading-relaxed text-zinc-200">{localError || controller.error || 'This step could not finish.'}</p><div className="mt-3 flex flex-wrap gap-2">{controller.phase === 'resume-error' ? <Button className={control} disabled={busy} onClick={controller.retryResume}>Retry saved ad</Button> : run?.status === 'error' ? <Button className={control} disabled={busy || retryNeedsAllowance} onClick={() => void call(controller.retry)}>Resume saved progress</Button> : null}{run && controller.phase !== 'resume-error' && <Button variant="secondary" className={control} disabled={busy} onClick={controller.retryResume}>Check saved progress</Button>}<Button variant="secondary" className={control} disabled={busy} onClick={() => { if (localError) setLocalError(''); else if (conversation && run) conversation.newChat(); else controller.reset(); }}>{localError ? 'Dismiss' : run && conversation ? 'Start new chat' : 'Back to brief'}</Button></div></GlassPanel>}
            {!readOnly && run?.status === 'error' && retryNeedsAllowance && <div className="space-y-2 text-xs text-zinc-400"><p>Confirm your generation allowance before resuming production.</p><Button variant="secondary" className={control} disabled={allowanceLoading} onClick={quotaBlocked || videoAllowed === false ? onUpgrade : onRetryAllowance}>{quotaBlocked || videoAllowed === false ? 'View plan options' : allowanceLoading ? 'Checking allowance…' : 'Retry allowance'}</Button></div>}
            {readOnly && run && <GlassPanel className="p-4">
              <p className="text-sm text-zinc-300">Saved conversation · read-only. Opening it does not restart production.</p>
              <p className="mt-2 text-xs text-zinc-400">Resuming production may use your plan allowance or credits. Submitted work may already have finished.</p>
              <Button className={`${control} mt-3`} disabled={busy || (!run.gate && (!quotaReady || (run.storyboardApproved && videoAllowed !== true)))} onClick={() => void (async () => { try { if (conversation) await conversation.leave(() => {}); await controller.resume?.(); } catch { /* The save barrier keeps this chat visible. */ } })()}>{run.gate ? 'Resume editing' : 'Resume saved progress'}</Button>
              {!run.gate && (!quotaReady || (run.storyboardApproved && videoAllowed !== true)) && <Button variant="secondary" className={`${control} mt-2`} onClick={videoAllowed === false ? onUpgrade : onRetryAllowance}>{videoAllowed === false ? 'View plan options' : 'Retry allowance'}</Button>}
            </GlassPanel>}
            {(atStoryboard || atResult) && <GlassPanel className="p-4" data-companion-review="output"><p className="text-sm font-semibold">{atStoryboard ? 'Your storyboard is ready' : 'Your first cut is ready'}</p><p className="mt-1 text-sm text-zinc-400">{run!.scenes.length} scene{run!.scenes.length === 1 ? '' : 's'} · {atStoryboard ? 'Review before approving production' : 'Watch and review your ad'}</p><Button variant="secondary" className={control + ' mt-3'} onClick={() => setViewer(true)}>{atStoryboard ? 'Open storyboard' : 'Open first cut'}</Button></GlassPanel>}

            </div>
          </div>
        </div>
        <footer ref={footer} className="companion-footer pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="companion-composer-wrap pointer-events-auto mx-auto">
            {draft.heroImageBase64 && !run && <div className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 p-2"><img src={draft.heroImageBase64} alt="Attached product" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{draft.imageName || 'Product photo'}</p><Button variant="ghost" className={`${control} !p-3`} disabled={disabled} aria-label="Remove product photo" onClick={() => { uploadEpoch.current++; setDraft({ ...draft, heroImageBase64: '', imageName: '' }); }}><X className="h-4 w-4" /></Button></div>}
            <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Product photo" className="hidden" disabled={disabled || !!run} onChange={event => { void attach(event.target.files?.[0]); event.target.value = ''; }} />
            <CompanionComposer ref={composer} initialText={conversation?.chat.composer} onTextChange={text => conversation?.update({ composer: text })} disabled={disabled} voiceDisabled={disabled || viewer} voiceScope={`${userId}:${conversation?.chat.id ?? 'draft'}:${run?.runId ?? 'brief'}`} sendDisabled={replyPending} uploading={uploading} allowAttachment={!run}
              placeholder={run ? atResult ? 'Try “reshoot scene 2” or “style clean”…' : 'Use the review controls above…' : field || replyPending ? 'Tell Grifon…' : 'Anything to change? Edit your brief above.'}
              onAttach={() => upload.current?.click()} onSend={send} onDraftPresence={setHasText} />
            <div className="companion-footer-note companion-save-note mt-3 text-center text-xs leading-relaxed">
              <span aria-hidden="true">Saving on this device… {saveHint}</span>
              <span aria-hidden="true">Draft saved on this device. {saveHint}</span>
              <p id="companion-save-status">{conversation?.saveConflict ? 'Another tab saved newer chats. Keep this tab open. Save this chat as a copy to preserve both versions.' : conversation?.saving ? 'Saving on this device…' : (conversation?.saved ?? saved) ? 'Draft saved on this device.' : 'Draft could not be saved on this device. Keep this tab open.'} {saveHint}</p>
            </div>{conversation && !conversation.saved && !conversation.saving && <Button variant="secondary" className={control + " mt-2 w-full"} onClick={conversation.saveConflict ? conversation.recoverCopy : conversation.retrySave}>{conversation.saveConflict ? 'Save this chat as a copy' : 'Retry saving'}</Button>}
          </div>
        </footer>
      </section>
    </div>
    {viewer && <CompanionOutputViewer onClose={closeViewer} title={atStoryboard ? "Storyboard" : "First cut"}>
            {atStoryboard && (!failed || readOnly) && <GlassPanel className="p-4 sm:p-5" aria-label="Storyboard review" data-companion-review="storyboard"><h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Your scenes, before we film.</h2><p className="mt-2 text-sm leading-relaxed text-zinc-400">Check the product, presenter and script. You can regenerate an image before approving.</p><div className="companion-scene-grid mt-4 grid grid-cols-2 gap-3">{run!.scenes.map(scene => <div key={scene.sceneIdx} className="min-w-0 overflow-hidden rounded-xl border border-white/10"><div className="aspect-[3/4] bg-zinc-900">{scene.imageUrl ? <a href={scene.imageUrl} target="_blank" rel="noreferrer" aria-label={`Open scene ${scene.sceneIdx+1} image`}><img src={scene.imageUrl} alt={`Scene ${scene.sceneIdx+1}`} className="h-full w-full object-contain" /></a> : <p className="p-3 text-xs text-zinc-400">Image not ready</p>}</div><div className="p-3"><p className="text-xs font-semibold">Scene {scene.sceneIdx+1}</p><p className="mt-2 text-xs leading-relaxed text-zinc-400">{run!.storyboard?.[scene.sceneIdx]?.scriptLine}</p>{run!.storyboard?.[scene.sceneIdx]?.endFrameImageUrl && <a href={run!.storyboard![scene.sceneIdx].endFrameImageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-11 items-center text-xs text-[#FFCC00]">View end frame</a>}{scene.flaggedReason && <p className="mt-2 flex items-start gap-2 text-xs text-amber-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{scene.flaggedReason}</p>}<Button variant="secondary" className={`${control} mt-3 !w-full !px-2 !text-xs`} aria-label={`Regenerate scene ${scene.sceneIdx+1}`} disabled={busy || readOnly} onClick={() => void call(() => controller.regenScene(scene.sceneIdx))}>{controller.reshooting === scene.sceneIdx ? 'Updating…' : 'Regenerate'}</Button></div></div>)}</div><p className="mt-4 text-xs leading-relaxed text-zinc-400">Approval uses 1 video ad from your plan, or 1 purchased video credit if your plan allowance is used up. Regenerated images use image allowance.</p><p id="storyboard-approval-help" className="mt-3 text-xs leading-relaxed text-zinc-400">{readOnly ? 'Resume editing in the conversation before changing or approving this storyboard.' : busy ? 'Wait for the current update to finish before approving.' : !readyToApprove ? 'Every scene needs an image without a flag before approval. Regenerate incomplete or flagged scenes.' : ''}</p><Button aria-describedby="storyboard-approval-help" className={`${control} mt-4 w-full`} disabled={busy || readOnly || !readyToApprove || videoAllowed === null} onClick={() => videoAllowed === false ? onUpgrade() : void call(controller.approve)}>{videoAllowed === null ? allowanceLoading ? 'Checking video allowance…' : 'Video allowance unavailable' : videoAllowed === false ? 'Unlock video production' : 'Approve storyboard'}</Button>{videoAllowed === null && !allowanceLoading && <Button variant="secondary" className={`${control} mt-2 w-full`} onClick={onRetryAllowance}>Retry allowance</Button>}</GlassPanel>}
            {atResult && <GlassPanel className="p-4 sm:p-5" aria-label="Your first cut" data-companion-review="result"><h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Your first cut.</h2>{run!.finalVideoUrl ? <video controls playsInline preload="metadata" src={run!.finalVideoUrl} poster={run!.thumbnailUrl} className="mt-4 max-h-[440px] w-full rounded-xl bg-zinc-950" aria-label="Generated ad video" /> : <p className="mt-4 text-sm text-zinc-400">The final video is not available yet.</p>}{run!.finalDownloadUrl && <a href={run!.finalDownloadUrl} download target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#FFCC00]">Download video</a>}<p className="mt-4 text-sm leading-relaxed text-zinc-400">Keep the cut, reshoot a scene, or apply an edit style. Custom free-form edits are not supported here yet.</p><div className="mt-3 flex flex-wrap gap-2">{run!.scenes.map(scene => <Button key={scene.sceneIdx} variant="secondary" className={`${control} !px-3`} disabled={busy || readOnly} onClick={() => { setArmedScene(scene.sceneIdx); setArmedPreset(null); }}>Reshoot scene {scene.sceneIdx+1}</Button>)}</div>{armedScene !== null && <div className="mt-3 rounded-xl border border-white/10 p-3"><p className="text-xs leading-relaxed text-zinc-300">Scene {armedScene+1}: {run!.scenes.find(scene => scene.sceneIdx === armedScene)?.status === 'flagged' ? 'this regenerates the flagged scene. Plan limits still apply.' : 'additional generation may use your plan allowance or credits.'}</p><Button className={`${control} mt-3`} disabled={busy || readOnly} onClick={() => { const index = armedScene; setArmedScene(null); void call(() => controller.reshoot(index)); }}>Confirm reshoot</Button></div>}<label className="mt-5 block text-xs text-zinc-400">Edit style<select aria-label="Edit style" className={`${inputStyle} mt-1`} disabled={busy || readOnly} value={armedPreset ? armedPreset.value ?? 'auto' : run!.presetId ?? 'auto'} onChange={event => { const selected = styles.find(style => (style.value ?? 'auto') === event.target.value)!; if (selected.locked && !presetUnlocked) onUpgrade(); else { setArmedPreset(selected); setArmedScene(null); } }}>{styles.map(style => <option key={style.label} value={style.value ?? 'auto'}>{style.label}{style.locked && !presetUnlocked ? ' · Pro' : ''}</option>)}</select></label>{armedPreset && <Button className={`${control} mt-3`} disabled={busy || readOnly} onClick={() => { const preset = armedPreset.value; setArmedPreset(null); void call(() => controller.choosePreset(preset)); }}>Apply style</Button>}</GlassPanel>}
    </CompanionOutputViewer>}
  </div>;
}
