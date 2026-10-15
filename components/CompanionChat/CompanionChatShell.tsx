import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { PanelLeft, PanelLeftClose, Plus, Search, X, Clapperboard, Settings } from 'lucide-react';
import Button from '../ui/Button';
import SettingsModal from '../dashboard/SettingsModal';
import type { PlanId } from '../../utils/planGate';
import { CompanionAvatarLayer, type CompanionAvatarPresentation } from './CompanionAvatarLayer';
import { ConversationConflictError, createConversation, loadConversations, saveConversationCopy, saveConversations, updateConversation, type CompanionConversation, type CompanionConversations } from '../../services/companionConversations';
import './companionChat.css';

export interface ConversationBinding {
  chat: CompanionConversation;
  update: (patch: Partial<Pick<CompanionConversation, 'draft' | 'composer' | 'runId' | 'referenceDraft' | 'referenceReview'>>) => void;
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
  children: (binding: ConversationBinding) => ReactNode;
}
const button = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';

export function CompanionChatShell({ userId, onStudio, userEmail, userName = 'Account', plan = 'free', planLoading = false, planError = false, onRetryPlan, onLogout, onUpgrade, onNavigate, preview = false, children }: Props) {
  const [book, setBook] = useState<CompanionConversations | null>(null);
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
    if (!current.current) return;
    const next = updateConversation(current.current, id, patch);
    if (next === current.current) return;
    current.current = next; setBook(next); if (!recovering.current) void persist(next);
  }, [persist]);
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
      if (pending !== selected) next = { ...next, chats: next.chats.map(chat => chat.id === next.selectedId ? { ...chat, draft: pending.draft, composer: pending.composer, runId: pending.runId, referenceDraft: pending.referenceDraft, referenceReview: pending.referenceReview, referenceInputRevision: pending.referenceInputRevision } : chat) };
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
      current.current = next; setBook(next); setSaved(true); setMobileOpen(false); setSearch('');
      void persist(next);
    }); } catch { /* The save/action error stays visible without discarding the chat. */ }
  };
  const openSettings = (trigger: HTMLElement) => { settingsTrigger.current = trigger; setMobileOpen(false); setSettingsOpen(true); };
  const restoreSettingsFocus = useCallback(() => settingsTrigger.current?.isConnected ? settingsTrigger.current : main.current?.querySelector<HTMLElement>('button[aria-label="Open conversations"]') ?? null, []);
  if (!book) return <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-sm text-white"><p role={loadError ? 'alert' : 'status'}>{loadError ? 'Saved chats could not be opened. Your saved data has been kept.' : 'Opening your chats…'}</p>{loadError && <><Button className={button} onClick={() => setAttempt(value => value + 1)}>Retry saved chats</Button><Button variant="ghost" className={button} onClick={onStudio}>Studio</Button></>}</div>;
  const chat = book.chats.find(item => item.id === book.selectedId)!;
  const title = (item: CompanionConversation) => item.referenceDraft ? item.referenceDraft.productName || item.referenceDraft.brandName || item.referenceDraft.brief || 'Reference brief' : item.draft.productName || item.draft.brandName || item.draft.brief || 'New chat';
  const navigation = <>
    <div className="flex items-center justify-between px-2 py-2"><span className="px-2 text-sm font-semibold">Chats</span><Button variant="ghost" className={`${button} !p-3`} aria-label={mobileOpen ? 'Close conversations' : 'Collapse conversations'} onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(true)}>{mobileOpen ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div>
    <Button variant="ghost" className={`${button} mx-2 flex items-center justify-start gap-3 !px-3`} onClick={() => void navigate()}><Plus className="h-5 w-5 shrink-0" />New chat</Button>
    <label className="mx-2 mt-2 flex min-h-11 items-center gap-3 rounded-xl bg-zinc-950 px-3 focus-within:ring-1 focus-within:ring-[#FFCC00]"><Search className="h-4 w-4 shrink-0 text-zinc-400" /><input aria-label="Search chats" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
    <nav aria-label="Conversations" className="companion-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">{book.chats.filter(item => title(item).toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} data-chat-id={item.id} aria-label={`Open chat: ${title(item)}`} aria-current={item.id === chat.id ? 'page' : undefined} onClick={() => void navigate(item.id)} className={`min-h-11 w-full truncate rounded-xl px-3 text-left text-sm font-semibold ${item.id === chat.id ? 'bg-[#FFCC00]/10 text-[#FFCC00]' : 'text-zinc-300 hover:bg-white/5'}`}>{title(item)}</button>)}{!book.chats.some(item => title(item).toLowerCase().includes(search.toLowerCase())) && <p className="px-3 py-3 text-sm text-zinc-400">No matching chats</p>}</nav>
    <div className="border-t border-white/10 p-2"><Button variant="ghost" className={`${button} flex w-full items-center justify-start gap-3 !px-3`} onClick={() => void navigate(undefined, true)}><Clapperboard className="h-5 w-5 shrink-0" />Studio</Button><Button variant="ghost" className={`${button} flex w-full items-center gap-3 !px-3 text-left`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate">{userName}</span></Button><p className="px-3 py-2 text-xs text-zinc-400">{preview ? 'Preview · simulated output' : 'Saved on this device'}</p>{navigationError && <p role="alert" className="px-3 pb-2 text-sm text-zinc-300">{navigationError}</p>}</div>
  </>;
  return <div className="companion-chat companion-shell flex h-dvh min-h-0 overflow-hidden bg-zinc-950 font-sans text-white">
    {!collapsed && <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-zinc-900/40 md:flex">{navigation}</aside>}
    {collapsed && <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-white/10 pt-3 md:flex"><Button variant="ghost" className={`${button} !p-3`} aria-label="Open conversations" onClick={() => setCollapsed(false)}><PanelLeft className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} mt-auto mb-3 !p-3`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-4 w-4" /></Button></aside>}
    {mobileOpen && <div className="fixed inset-0 z-50 bg-zinc-950/80 md:hidden" onClick={() => setMobileOpen(false)}><aside ref={drawer} role="dialog" aria-modal="true" aria-label="Chat navigation" className="flex h-full w-[min(320px,85vw)] flex-col border-r border-white/10 bg-zinc-900" onClick={event => event.stopPropagation()}>{navigation}</aside></div>}
    <div ref={main} className="relative min-h-0 min-w-0 flex-1">{children({ chat, update: patch => update(chat.id, patch), saved, saving, saveConflict, recoverCopy: () => void recoverCopy(), retrySave: () => { if (current.current) void persist(current.current); }, openNavigation: () => { setMobileOpen(true); setCollapsed(false); }, newChat: () => void navigate(), presentAvatar, leave, setMediaPreparing })}<CompanionAvatarLayer presentation={avatar} />{navigationError && collapsed && <p role="alert" className="absolute bottom-4 left-4 right-4 z-30 rounded-xl bg-zinc-900 p-3 text-sm text-zinc-300">{navigationError}</p>}</div>
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} userEmail={userEmail} userName={userName} plan={plan} planLoading={planLoading} planError={planError} onRetryPlan={onRetryPlan} preview={preview} restoreFocus={restoreSettingsFocus}
      onLogout={onLogout ? () => leave(onLogout) : undefined} onUpgrade={onUpgrade ? () => leave(onUpgrade) : undefined} onNavigate={href => leave(() => onNavigate ? onNavigate(href) : window.location.assign(href))} />
  </div>;
}
