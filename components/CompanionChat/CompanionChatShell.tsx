import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PanelLeft, PanelLeftClose, Plus, Search, X, Clapperboard, Settings, Cloud, FolderOpen } from 'lucide-react';
import Button from '../ui/Button';
import { LiquidGlass } from '../ui/LiquidGlass';
import SettingsModal from '../dashboard/SettingsModal';
import type { PlanId } from '../../utils/planGate';
import { CompanionAvatarLayer, type CompanionAvatarPresentation } from './CompanionAvatarLayer';
import { clearCloudCopyApproval, ConversationConflictError, createConversation, loadConversations, saveConversationCopy, saveConversations, updateConversation, type CompanionConversation, type CompanionConversations, type ConversationPatch } from '../../services/companionConversations';
import type { CloudFixtureClient } from '../../services/companionCloudFixtures';
import { CompanionCloudFixtureJobs, type FixtureInputVerificationClient } from './CompanionCloudFixtureJobs';
import type { FixtureExecutionSafetyClient } from '../../services/companionExecutionSafetyClient';
import { cloudReferenceLink, verifyCloudReferenceDraft, type CloudReferenceClient, type CloudReferenceReceipt } from '../../services/companionCloudReferences';
import { verifyFixtureJobIntent, type FixtureJobIntent } from '../../services/companionFixtureJobs';
import { isReferenceDraft, type CompanionReferenceDraft } from '../../services/companionReferenceDraft';
import { CompanionCloudReferences } from './CompanionCloudReferences';
import type { VideoLibraryItem } from '../../types';
import type { CloudFixtureResultClient, CloudFixtureResultReceipt } from '../../services/companionFixtureResults';
import type { FixtureVideoLoader } from './CompanionFixtureResult';
import { CompanionAssets } from './CompanionAssets';
import { COMPANION_APPEARANCE_KEY, CompanionAppearanceChoices, readCompanionAppearance, type CompanionAppearance } from './CompanionAppearance';
import { useCompanionGlass } from './useCompanionGlass';
import './companionChat.css';

export interface ConversationBinding {
  chat: CompanionConversation;
  update: (patch: ConversationPatch) => void;
  updateSaved: (patch: ConversationPatch, expectedChat: CompanionConversation) => Promise<void>;
  cloudReferenceClient?: CloudReferenceClient;
  cloudFixtureClient?: CloudFixtureClient;
  fixtureResultClient?: CloudFixtureResultClient;
  loadFixtureVideo?: FixtureVideoLoader;
  viewFixtureInAssets?: (receipt: CloudFixtureResultReceipt) => void;
  openCloudJobs?: () => void;
  queueIsCurrent: (id: string, revision: number) => boolean;
  fixtureJobIsCurrent: (requestId: string, invalidated: boolean) => boolean;
  saved: boolean;
  saving: boolean;
  saveConflict: boolean;
  recoverCopy: () => void;
  retrySave: () => void;
  openNavigation: () => void;
  newChat: () => void;
  presentAvatar: (chatId: string, presentation: CompanionAvatarPresentation) => void;
  leave: (action: () => void | Promise<void>) => Promise<void>;
  setMediaPreparing: (preparing: boolean) => void;
}
interface Props {
  userId: string;
  onStudio: () => void;
  userEmail?: string | null;
  userName?: string;
  plan?: PlanId;
  planLoading?: boolean;
  planError?: boolean;
  onRetryPlan?: () => Promise<void>;
  onLogout?: () => void | Promise<void>;
  onUpgrade?: () => void | Promise<void>;
  onNavigate?: (href: string) => void | Promise<void>;
  preview?: boolean;
  cloudFixtureClient?: CloudFixtureClient;
  cloudReferenceClient?: CloudReferenceClient;
  fixtureResultClient?: CloudFixtureResultClient;
  executionSafetyClient?: FixtureExecutionSafetyClient;
  inputVerificationClient?: FixtureInputVerificationClient;
  loadFixtureVideo?: FixtureVideoLoader;
  loadVideoLibrary?: () => Promise<VideoLibraryItem[]>;
  children: (binding: ConversationBinding) => ReactNode;
}
const button = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';

export function CompanionChatShell({ userId, onStudio, userEmail, userName = 'Account', plan = 'free', planLoading = false, planError = false, onRetryPlan, onLogout, onUpgrade, onNavigate, preview = false, cloudFixtureClient, cloudReferenceClient, fixtureResultClient, executionSafetyClient, inputVerificationClient, loadFixtureVideo, loadVideoLibrary, children }: Props) {
  const [book, setBook] = useState<CompanionConversations | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [appearance, setAppearance] = useState<CompanionAppearance>(readCompanionAppearance);
  useCompanionGlass(shell, !!book);
  const changeAppearance = (next: CompanionAppearance) => {
    setAppearance(next);
    try { localStorage.setItem(COMPANION_APPEARANCE_KEY, next); } catch { /* Keep the choice for this session if storage is unavailable. */ }
  };
  const current = useRef<CompanionConversations | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const revision = useRef(0);
  const mounted = useRef(true);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(true);
  const [mediaPreparing, setPreparingState] = useState(false);
  const preparing = useRef(false);
  const setMediaPreparing = useCallback((value: boolean) => { preparing.current = value; setPreparingState(value); }, []);
  const [saveConflict, setSaveConflict] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cloudOpen, setCloudOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigationError, setNavigationError] = useState('');
  const settingsTrigger = useRef<HTMLElement | null>(null);
  const drawer = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const navigating = useRef(false);
  const recovering = useRef(false);
  const [avatar, setAvatar] = useState<CompanionAvatarPresentation | null>(null);
  const presentAvatar = useCallback((chatId: string, presentation: CompanionAvatarPresentation) => {
    if (!mounted.current || current.current?.selectedId !== chatId || !main.current) return;
    const origin = main.current.getBoundingClientRect();
    const next = { ...presentation, bounds: { ...presentation.bounds, left: presentation.bounds.left - origin.left, top: presentation.bounds.top - origin.top } };
    setAvatar(previous => previous && previous.state === next.state && previous.inert === next.inert
      && previous.bounds.left === next.bounds.left && previous.bounds.top === next.bounds.top
      && previous.bounds.width === next.bounds.width && previous.bounds.height === next.bounds.height ? previous : next);
  }, []);
  const persist = useCallback((next: CompanionConversations) => {
    setSaving(true);
    const task = writes.current.catch(() => {}).then(async () => {
      // Coalesce superseded edits before cloning the book's local media into IndexedDB.
      if (current.current !== next && current.current?.userId === next.userId) return;
      revision.current = await saveConversations({ ...next, revision: revision.current });
    });
    writes.current = task;
    void task.then(() => {
      if (mounted.current && current.current === next && writes.current === task) { setSaved(true); setSaving(false); }
    }, error => {
      if (mounted.current && current.current === next && writes.current === task) { setSaved(false); setSaving(false); setSaveConflict(error instanceof ConversationConflictError); }
    });
    return task;
  }, []);
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    setLoadError(false);
    void loadConversations(userId).then(next => {
      if (!alive) return;
      revision.current = next.revision ?? 0;
      current.current = next; setBook(next);
      if (next.revision === undefined) void persist(next);
      else { setSaved(true); setSaving(false); }
    }).catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; mounted.current = false; };
  }, [userId, attempt, persist]);
  useEffect(() => {
    if (saved && !saving && !mediaPreparing) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved, saving, mediaPreparing]);
  useLayoutEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    main.current?.setAttribute('inert', '');
    drawer.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setMobileOpen(false); }
      if (event.key !== 'Tab') return;
      const items = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    document.addEventListener('keydown', key); window.addEventListener('resize', resize);
    return () => { document.body.style.overflow = overflow; main.current?.removeAttribute('inert'); document.removeEventListener('keydown', key); window.removeEventListener('resize', resize); previous?.focus(); };
  }, [mobileOpen]);
  const update = useCallback((id: string, patch: Parameters<ConversationBinding['update']>[0]) => {
    if (!mounted.current || !current.current || ((patch.referenceQueue !== undefined || patch.referenceFixtureJob !== undefined) && (navigating.current || recovering.current || current.current.selectedId !== id))) return;
    const next = updateConversation(current.current, id, patch);
    if (next === current.current) return;
    current.current = next; setBook(next); if (!recovering.current) void persist(next);
  }, [persist]);
  const updateSaved = async (patch: ConversationPatch, expectedChat: CompanionConversation) => {
    const before = current.current;
    if (!mounted.current || !before || before.userId !== userId || before.selectedId !== expectedChat.id || navigating.current || recovering.current
      || before.chats.find(item => item.id === expectedChat.id) !== expectedChat) throw new Error('The selected chat or inputs changed. Check the current chat before continuing.');
    const next = updateConversation(before, expectedChat.id, patch);
    if (next === before) throw new Error('The current chat could not accept this saved cloud link or review.');
    current.current = next; setBook(next);
    await persist(next);
    if (!mounted.current || current.current !== next || next.userId !== userId) throw new Error('The chat changed while saving. No cloud job was submitted.');
  };
  const recoverCopy = async () => {
    if (!current.current || navigating.current) return;
    navigating.current = true; recovering.current = true;
    const wasInert = main.current?.hasAttribute('inert');
    main.current?.setAttribute('inert', ''); setSaving(true);
    try {
      await writes.current.catch(() => {});
      const latest = current.current;
      const selected = latest.chats.find(item => item.id === latest.selectedId)!;
      let next = await saveConversationCopy(userId, selected);
      if (!mounted.current) return;
      const pending = current.current.chats.find(item => item.id === latest.selectedId)!;
      const pendingCopy = clearCloudCopyApproval(pending);
      if (pending !== selected) next = { ...next, chats: next.chats.map(chat => chat.id === next.selectedId ? { ...chat, draft: pendingCopy.draft, composer: pendingCopy.composer, runId: pendingCopy.runId, referenceDraft: pendingCopy.referenceDraft, referenceReview: pendingCopy.referenceReview, referenceInputRevision: pendingCopy.referenceInputRevision, referenceQueue: pendingCopy.referenceQueue, referenceFixtureJob: pendingCopy.referenceFixtureJob, referenceCloudSource: pendingCopy.referenceCloudSource, referenceCloudObservation: pendingCopy.referenceCloudObservation, referenceCloudJob: pendingCopy.referenceCloudJob } : chat) };
      revision.current = next.revision ?? 0; current.current = next; setBook(next);
      if (pending !== selected) await persist(next);
      setSaveConflict(false); setSaved(true); setNavigationError('');
    } catch { if (mounted.current) setNavigationError('The copy could not be saved. Keep this tab open and try again.'); }
    finally { navigating.current = false; recovering.current = false; if (mounted.current) setSaving(false); if (!wasInert) main.current?.removeAttribute('inert'); }
  };
  const leave = useCallback(async (action: () => void | Promise<void>) => {
    if (!current.current || navigating.current) throw new Error('Chat navigation is busy.');
    if (preparing.current) {
      setNavigationError('Wait for the selected media to finish checking and saving before leaving this chat.');
      throw new Error('Wait for the selected media to finish checking and saving.');
    }
    navigating.current = true;
    setNavigationError('');
    const wasInert = main.current?.hasAttribute('inert');
    main.current?.setAttribute('inert', '');
    let flushed = false;
    try {
      let snapshot: CompanionConversations;
      do { snapshot = current.current; await persist(snapshot); } while (snapshot !== current.current);
      flushed = true;
      if (!mounted.current) return;
      await action();
    } catch (error) {
      if (mounted.current) setNavigationError(flushed ? 'This action could not finish. Your chat has been kept. Try again.' : 'Draft could not be saved on this device. Your chat has been kept. Try again.');
      throw flushed ? error : new Error('CHAT_SAVE_FAILED');
    } finally { navigating.current = false; if (!wasInert) main.current?.removeAttribute('inert'); }
  }, [persist]);
  const navigate = async (id?: string, studio = false) => {
    if (!current.current || navigating.current) return;
    try { await leave(() => {
      if (studio) { onStudio(); return; }
      const chat = id ? null : createConversation();
      const next = { ...current.current!, selectedId: id ?? chat!.id, chats: chat ? [chat, ...current.current!.chats] : current.current!.chats };
      current.current = next; setBook(next); setSaved(true); setMobileOpen(false); setCloudOpen(false); setReferencesOpen(false); setAssetsOpen(false); setSearch('');
      void persist(next);
    }); } catch { /* The save/action error stays visible without discarding the chat. */ }
  };
  const openCloud = async () => {
    if (!cloudFixtureClient) return;
    try { await leave(() => { setCloudOpen(true); setReferencesOpen(false); setAssetsOpen(false); setMobileOpen(false); setAvatar(null); }); }
    catch { /* The existing save error remains visible without discarding the chat. */ }
  };
  const openReferences = async () => {
    if (!cloudReferenceClient) return;
    try { await leave(() => { setReferencesOpen(true); setCloudOpen(false); setAssetsOpen(false); setMobileOpen(false); setAvatar(null); }); }
    catch { /* The existing save error remains visible without discarding the chat. */ }
  };
  const openAssets = async (receipt?: CloudFixtureResultReceipt) => {
    if (!loadFixtureVideo || !loadVideoLibrary || (receipt && receipt.ownerId !== userId)) return;
    try { await leave(() => { setSelectedAssetId(receipt ? `${receipt.requestId}:${receipt.fixtureVersion}` : null); setAssetsOpen(true); setReferencesOpen(false); setCloudOpen(false); setMobileOpen(false); setAvatar(null); }); }
    catch { /* The existing save error remains visible without discarding the chat. */ }
  };
  const importReference = async (draft: CompanionReferenceDraft, sourceLocalChatId: string, receipt: CloudReferenceReceipt, job?: FixtureJobIntent, requestIsCurrent?: () => boolean) => {
    if (!isReferenceDraft(draft) || !mounted.current || current.current?.userId !== userId || current.current.selectedId !== sourceLocalChatId || (requestIsCurrent && !requestIsCurrent())) throw new Error('The account or selected chat changed. Open the cloud copy again from the current chat.');
    const source = await cloudReferenceLink(receipt, userId);
    if (!await verifyCloudReferenceDraft(draft, source) || (job && (!await verifyFixtureJobIntent(job) || job.ownerId !== userId || JSON.stringify(job.cloudReference) !== JSON.stringify(source)))) throw new Error('The cloud job does not match these verified saved inputs. Your current chat is kept.');
    if (requestIsCurrent && !requestIsCurrent()) throw new Error('The selected result changed. Open it again from the current view.');
    await leave(async () => {
      const before = current.current!;
      if (before.userId !== userId || before.selectedId !== sourceLocalChatId) throw new Error('The selected chat changed before the cloud copy could be opened.');
      const copy = { ...createConversation(), referenceDraft: draft, referenceInputRevision: 0, referenceCloudSource: source,
        ...(job ? { referenceReview: { ...structuredClone(job.plan), inputRevision: 0, ...(job.plan.creativePlan ? { creativePlan: { ...structuredClone(job.plan.creativePlan), inputRevision: 0 } } : {}), stale: false, confirmation: null }, referenceCloudObservation: job } : {}) };
      const next = { ...before, chats: [copy, ...before.chats], selectedId: copy.id, revision: revision.current };
      // Persist the entire new copy with the existing CAS before selecting it in the UI.
      const savedRevision = await saveConversations(next);
      if (!mounted.current || current.current?.userId !== userId) return;
      if (current.current !== before) throw new ConversationConflictError();
      revision.current = savedRevision; current.current = { ...next, revision: savedRevision }; setBook(current.current);
      setSaved(true); setSaving(false); setSaveConflict(false); setReferencesOpen(false); setCloudOpen(false); setAssetsOpen(false); setMobileOpen(false); setSearch(''); setAvatar(null);
    });
  };
  const openResultChat = async (intent: FixtureJobIntent, requestIsCurrent: () => boolean) => {
    const before = current.current;
    if (!before || before.userId !== userId || intent.ownerId !== userId || !intent.cloudReference || !requestIsCurrent() || !await verifyFixtureJobIntent(intent)) throw new Error('The saved result has an invalid account or job identity.');
    if (!mounted.current || current.current !== before || !requestIsCurrent()) throw new Error('The selected chat changed. Open the result again from the current chat.');
    const matches = (item: CompanionConversation) => JSON.stringify(item.referenceCloudJob ?? item.referenceCloudObservation) === JSON.stringify(intent);
    const original = before.chats.find(item => item.id === intent.ownerChatId && matches(item)) ?? before.chats.find(matches);
    if (original) {
      await navigate(original.id);
      if (current.current?.selectedId !== original.id) throw new Error('The chat could not be opened. Keep this tab open and try again.');
      return;
    }
    if (!cloudReferenceClient) throw new Error('The saved inputs cannot be opened in this view.');
    const opened = await cloudReferenceClient.openSnapshot(intent.cloudReference.saveId);
    if (!mounted.current || current.current !== before || !requestIsCurrent()) throw new Error('The selected chat changed while opening the saved inputs.');
    await importReference(opened.draft, before.selectedId, opened.receipt, intent, requestIsCurrent);
  };
  const openSettings = (trigger: HTMLElement) => { settingsTrigger.current = trigger; setMobileOpen(false); setSettingsOpen(true); };
  const restoreSettingsFocus = useCallback(() => settingsTrigger.current?.isConnected ? settingsTrigger.current : main.current?.querySelector<HTMLElement>('button[aria-label="Open conversations"]') ?? null, []);
  if (!book) return <div data-companion-theme={appearance} className="companion-chat companion-loading flex h-dvh flex-col items-center justify-center gap-4 px-6 text-sm"><p role={loadError ? 'alert' : 'status'}>{loadError ? 'Saved chats could not be opened. Your saved data has been kept.' : 'Opening your chats…'}</p>{loadError && <><Button className={button} onClick={() => setAttempt(value => value + 1)}>Retry saved chats</Button><Button variant="ghost" className={button} onClick={onStudio}>Studio</Button></>}</div>;
  const chat = book.chats.find(item => item.id === book.selectedId)!;
  const title = (item: CompanionConversation) => item.referenceDraft ? item.referenceDraft.productName || item.referenceDraft.brandName || item.referenceDraft.brief || 'Reference brief' : item.draft.productName || item.draft.brandName || item.draft.brief || 'New chat';
  const navigation = <>
    <div className="companion-sidebar-top flex items-center justify-between px-3 py-3"><img src="/logo-badge.png" alt="Grifon" className="companion-brand-logo h-11 w-11 object-contain" /><div className="flex items-center"><Button variant="ghost" className={`${button} !p-3`} aria-label={mobileOpen ? 'Close conversations' : 'Collapse conversations'} onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(true)}>{mobileOpen ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-5 w-5 shrink-0" /></Button></div></div>
    {loadFixtureVideo && loadVideoLibrary && <Button variant="ghost" aria-current={assetsOpen ? 'page' : undefined} className={`${button} mx-2 flex items-center justify-start gap-3 !px-3 ${assetsOpen ? '!text-[#FFCC00]' : ''}`} onClick={() => void openAssets()}><FolderOpen className="h-5 w-5 shrink-0" />Grifon Assets</Button>}
    {cloudFixtureClient && <Button variant="ghost" aria-current={cloudOpen ? 'page' : undefined} className={`${button} mx-2 flex items-center justify-start gap-3 !px-3 ${cloudOpen ? '!text-[#FFCC00]' : ''}`} onClick={() => void openCloud()}><Cloud className="h-5 w-5 shrink-0" />Cloud fixture jobs</Button>}
    {cloudReferenceClient && <Button variant="ghost" aria-current={referencesOpen ? 'page' : undefined} className={`${button} mx-2 flex items-center justify-start gap-3 !px-3 ${referencesOpen ? '!text-[#FFCC00]' : ''}`} onClick={() => void openReferences()}><Cloud className="h-5 w-5 shrink-0" />Cloud reference briefs</Button>}
    <label className="companion-search mx-3 mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 focus-within:ring-1 focus-within:ring-[#FFCC00]"><Search className="h-4 w-4 shrink-0 text-zinc-400" /><input aria-label="Search chats" placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
    <nav aria-label="Conversations" className="companion-sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">{book.chats.filter(item => title(item).toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} data-chat-id={item.id} aria-label={`Open chat: ${title(item)}`} aria-current={item.id === chat.id ? 'page' : undefined} onClick={() => void navigate(item.id)} className="companion-conversation min-h-11 w-full rounded-2xl text-left text-sm">
      <span aria-hidden="true" className="companion-conversation-icon"><Clapperboard className="h-5 w-5" /></span><span className="min-w-0 flex-1"><strong className="companion-conversation-title block truncate">{title(item)}</strong><span className="companion-conversation-preview mt-1 block truncate">{item.referenceDraft ? item.referenceDraft.brief || 'Reference brief' : item.draft.messages[item.draft.messages.length - 1]?.text || 'Start a conversation'}</span></span>
    </button>)}{!book.chats.some(item => title(item).toLowerCase().includes(search.toLowerCase())) && <p className="px-3 py-3 text-sm text-zinc-400">No matching chats</p>}</nav>
    <div className="companion-sidebar-account border-t border-white/10 p-2"><Button variant="ghost" className={`${button} flex w-full items-center justify-start gap-3 !px-3`} onClick={() => void navigate(undefined, true)}><Clapperboard className="h-5 w-5 shrink-0" />Studio</Button><Button variant="ghost" className={`${button} flex w-full items-center gap-3 !px-3 text-left`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate">{userName}</span></Button><p className="px-3 py-2 text-xs text-zinc-400">{preview ? 'Preview · simulated output' : 'Saved on this device'}</p>{navigationError && <p role="alert" className="px-3 pb-2 text-sm text-zinc-300">{navigationError}</p>}</div>
  </>;
  const binding: ConversationBinding = { chat, update: patch => update(chat.id, patch), updateSaved, cloudReferenceClient, cloudFixtureClient, fixtureResultClient, loadFixtureVideo, viewFixtureInAssets: loadFixtureVideo && loadVideoLibrary ? receipt => void openAssets(receipt) : undefined, openCloudJobs: cloudFixtureClient ? () => void openCloud() : undefined, queueIsCurrent: (id, queueRevision) => {
    const selected = current.current?.chats.find(item => item.id === current.current?.selectedId);
    return mounted.current && !navigating.current && !recovering.current && current.current?.userId === userId && selected?.id === chat.id && selected.referenceQueue?.id === id && selected.referenceQueue.revision === queueRevision;
  }, fixtureJobIsCurrent: (requestId, invalidated) => {
    const selected = current.current?.chats.find(item => item.id === current.current?.selectedId);
    return mounted.current && !navigating.current && !recovering.current && current.current?.userId === userId && selected?.id === chat.id
      && selected.referenceFixtureJob?.intent.requestId === requestId && selected.referenceFixtureJob.invalidated === invalidated;
  }, saved, saving, saveConflict, recoverCopy: () => void recoverCopy(), retrySave: () => { if (current.current) void persist(current.current); }, openNavigation: () => { setMobileOpen(true); setCollapsed(false); }, newChat: () => void navigate(), presentAvatar, leave, setMediaPreparing };
  return <div ref={shell} data-companion-theme={appearance} className="companion-chat companion-shell flex h-dvh min-h-0 overflow-hidden font-sans">
    {!collapsed && <LiquidGlass as="aside" data-companion-glass className="companion-sidebar hidden shrink-0 flex-col md:flex">{navigation}</LiquidGlass>}
    {collapsed && <LiquidGlass as="aside" data-companion-glass className="companion-sidebar companion-sidebar-collapsed hidden w-16 shrink-0 flex-col items-center pt-3 md:flex"><img src="/logo-badge.png" alt="Grifon" className="mb-2 h-10 w-10 object-contain" /><Button variant="ghost" className={`${button} !p-3`} aria-label="Open conversations" onClick={() => setCollapsed(false)}><PanelLeft className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button>{loadFixtureVideo && loadVideoLibrary && <Button variant="ghost" className={`${button} !p-3 ${assetsOpen ? '!text-[#FFCC00]' : ''}`} aria-label="Grifon Assets" onClick={() => void openAssets()}><FolderOpen className="h-4 w-4 shrink-0" /></Button>}{cloudFixtureClient && <Button variant="ghost" className={`${button} !p-3 ${cloudOpen ? '!text-[#FFCC00]' : ''}`} aria-label="Cloud fixture jobs" onClick={() => void openCloud()}><Cloud className="h-4 w-4 shrink-0" /></Button>}{cloudReferenceClient && <Button variant="ghost" className={`${button} !p-3 ${referencesOpen ? '!text-[#FFCC00]' : ''}`} aria-label="Cloud reference briefs" onClick={() => void openReferences()}><Cloud className="h-4 w-4 shrink-0" /></Button>}<Button variant="ghost" className={`${button} mt-auto mb-3 !p-3`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-4 w-4" /></Button></LiquidGlass>}
    {mobileOpen && <div className="companion-drawer-veil fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}><aside ref={drawer} role="dialog" aria-modal="true" aria-label="Chat navigation" className="companion-mobile-navigation flex h-full w-[min(320px,85vw)] flex-col" onClick={event => event.stopPropagation()}>{navigation}</aside></div>}
    <div ref={main} className={`companion-main relative min-h-0 min-w-0 flex-1 ${assetsOpen || referencesOpen || cloudOpen ? 'companion-secondary-surface' : ''}`}>
      <LiquidGlass data-companion-glass className="companion-appearance-toolbar absolute z-30 flex items-center rounded-full p-1"><CompanionAppearanceChoices appearance={appearance} onChange={changeAppearance} /><Button variant="ghost" className={`${button} companion-toolbar-new !rounded-full !p-3 md:!hidden`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button></LiquidGlass>
      {assetsOpen && loadFixtureVideo && loadVideoLibrary ? <CompanionAssets key={userId} userId={userId} conversation={binding} client={fixtureResultClient} loadVideo={loadFixtureVideo} loadLibrary={loadVideoLibrary} selectedId={selectedAssetId} onSelect={setSelectedAssetId} onBack={() => setAssetsOpen(false)} onOpenChat={openResultChat} /> : referencesOpen && cloudReferenceClient ? <CompanionCloudReferences key={userId} userId={userId} conversation={binding} client={cloudReferenceClient} onBack={() => setReferencesOpen(false)} onOpen={importReference} /> : cloudOpen && cloudFixtureClient ? <CompanionCloudFixtureJobs key={userId} userId={userId} conversation={binding} client={cloudFixtureClient} executionSafetyClient={executionSafetyClient} inputVerificationClient={inputVerificationClient} onBack={() => setCloudOpen(false)} onOpenInputs={importReference} onOpenChat={openResultChat} /> : children(binding)}{!cloudOpen && !referencesOpen && !assetsOpen && <CompanionAvatarLayer presentation={avatar} />}{navigationError && collapsed && <p role="alert" className="absolute bottom-4 left-4 right-4 z-30 rounded-xl bg-zinc-900 p-3 text-sm text-zinc-300">{navigationError}</p>}</div>
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} appearance={appearance} onAppearanceChange={changeAppearance} userEmail={userEmail} userName={userName} plan={plan} planLoading={planLoading} planError={planError} onRetryPlan={onRetryPlan} preview={preview} restoreFocus={restoreSettingsFocus}
      onLogout={onLogout ? () => leave(onLogout) : undefined} onUpgrade={onUpgrade ? () => leave(onUpgrade) : undefined} onNavigate={href => leave(() => onNavigate ? onNavigate(href) : window.location.assign(href))} />
  </div>;
}
