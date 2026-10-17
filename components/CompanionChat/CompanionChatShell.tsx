import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, PanelLeft, PanelLeftClose, Plus, Search, X, Clapperboard, Settings } from 'lucide-react';
import Button from '../ui/Button';
import { LiquidGlass } from '../ui/LiquidGlass';
import SettingsModal from '../dashboard/SettingsModal';
import type { PlanId } from '../../utils/planGate';
import { CompanionAvatarLayer, type CompanionAvatarPresentation } from './CompanionAvatarLayer';
import { ConversationConflictError, createConversation, loadConversations, saveConversationCopy, saveConversations, updateConversation, type CompanionConversation, type CompanionConversations } from '../../services/companionConversations';
import { COMPANION_APPEARANCE_KEY, readCompanionAppearance, type CompanionAppearance } from './CompanionAppearance';
import { useCompanionGlass } from './useCompanionGlass';
import './companionChat.css';

export interface ConversationBinding {
  chat: CompanionConversation;
  update: (patch: Partial<Pick<CompanionConversation, 'draft' | 'composer' | 'runId'>>) => void;
  saved: boolean;
  saving: boolean;
  saveConflict: boolean;
  recoverCopy: () => void;
  retrySave: () => void;
  openNavigation: () => void;
  newChat: () => void;
  presentAvatar: (chatId: string, presentation: CompanionAvatarPresentation) => void;
  leave: (action: () => void | Promise<void>) => Promise<void>;
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

const relativeTime = (at: number, now: number) => {
  const minutes = Math.max(0, Math.floor((now - at) / 60000));
  return minutes < 1 ? 'now' : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`;
};
function ConversationTime({ at, now }: { at: number; now: number }) {
  const updated = new Date(at);
  if (!Number.isFinite(updated.getTime())) return null;
  return <time className="companion-conversation-time shrink-0" dateTime={updated.toISOString()} title={updated.toLocaleString()}>{relativeTime(at, now)}</time>;
}

export function CompanionChatShell({ userId, onStudio, userEmail, userName = 'Account', plan = 'free', planLoading = false, planError = false, onRetryPlan, onLogout, onUpgrade, onNavigate, preview = false, children }: Props) {
  const [book, setBook] = useState<CompanionConversations | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const interval = window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const shell = useRef<HTMLDivElement>(null);
  const [appearance, setAppearance] = useState<CompanionAppearance>(readCompanionAppearance);
  useCompanionGlass(shell, !!book);
  useLayoutEffect(() => {
    const node = shell.current;
    const viewport = window.visualViewport;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      if (viewport && viewport.scale !== 1) {
        node.style.removeProperty('--companion-viewport-height');
        node.style.removeProperty('--companion-viewport-top');
        return;
      }
      const height = viewport?.height ?? window.innerHeight;
      if (viewport) {
        node.style.setProperty('--companion-viewport-height', `${height}px`);
        node.style.setProperty('--companion-viewport-top', `${viewport.offsetTop}px`);
      }
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => { frame = 0; measure(); });
    };
    measure();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    node.addEventListener('focusin', schedule);
    node.addEventListener('focusout', schedule);
    return () => {
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      node.removeEventListener('focusin', schedule);
      node.removeEventListener('focusout', schedule);
      if (frame) window.cancelAnimationFrame(frame);
      node.style.removeProperty('--companion-viewport-height');
      node.style.removeProperty('--companion-viewport-top');
    };
  }, [!!book]);
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
  const [saveConflict, setSaveConflict] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const mobileSearchActive = useRef(false);
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigationError, setNavigationError] = useState('');
  const settingsTrigger = useRef<HTMLElement | null>(null);
  const drawer = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const closeMobileNavigation = useCallback(() => {
    if (mobileSearchActive.current) setSearch('');
    mobileSearchActive.current = false; setMobileSearch(false); setMobileOpen(false);
  }, []);
  const exitMobileSearch = useCallback(() => {
    mobileSearchActive.current = false; setMobileSearch(false); setSearch('');
    window.requestAnimationFrame(() => drawer.current?.querySelector<HTMLElement>('button[aria-label="Close conversations"]')?.focus());
  }, []);
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
    if (saved && !saving) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved, saving]);
  useLayoutEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    main.current?.setAttribute('inert', '');
    drawer.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); if (mobileSearchActive.current) exitMobileSearch(); else closeMobileNavigation(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(drawer.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, [tabindex="0"]') ?? []).filter(item => item.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth >= 768) closeMobileNavigation(); };
    document.addEventListener('keydown', key); window.addEventListener('resize', resize);
    return () => {
      document.body.style.overflow = overflow; main.current?.removeAttribute('inert'); document.removeEventListener('keydown', key); window.removeEventListener('resize', resize);
      const target = previous?.isConnected && previous !== document.body && previous !== document.documentElement && previous.getClientRects().length > 0
        ? previous : main.current?.querySelector<HTMLElement>('button[aria-label="Open conversations"]');
      if (target?.isConnected && target.getClientRects().length > 0) target.focus();
    };
  }, [mobileOpen, closeMobileNavigation, exitMobileSearch]);
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
      if (pending !== selected) next = updateConversation(next, next.selectedId, { draft: pending.draft, composer: pending.composer, runId: pending.runId });
      revision.current = next.revision ?? 0; current.current = next; setBook(next);
      if (pending !== selected) await persist(next);
      setSaveConflict(false); setSaved(true); setNavigationError('');
    } catch { if (mounted.current) setNavigationError('The copy could not be saved. Keep this tab open and try again.'); }
    finally { navigating.current = false; recovering.current = false; if (mounted.current) setSaving(false); if (!wasInert) main.current?.removeAttribute('inert'); }
  };
  const leave = useCallback(async (action: () => void | Promise<void>) => {
    if (!current.current || navigating.current) throw new Error('Chat navigation is busy.');
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
      current.current = next; setBook(next); setSaved(true); closeMobileNavigation(); setSearch('');
      void persist(next);
    }); } catch { /* The save/action error stays visible without discarding the chat. */ }
  };
  const openSettings = (trigger: HTMLElement) => { settingsTrigger.current = trigger; closeMobileNavigation(); setSettingsOpen(true); };
  const restoreSettingsFocus = useCallback(() => settingsTrigger.current?.isConnected ? settingsTrigger.current : main.current?.querySelector<HTMLElement>('button[aria-label="Open conversations"]') ?? null, []);
  if (!book) return <div data-companion-theme={appearance} className="companion-chat companion-loading flex h-dvh flex-col items-center justify-center gap-4 px-6 text-sm"><p role={loadError ? 'alert' : 'status'}>{loadError ? 'Saved chats could not be opened. Your saved data has been kept.' : 'Opening your chats…'}</p>{loadError && <><Button className={button} onClick={() => setAttempt(value => value + 1)}>Retry saved chats</Button><Button variant="ghost" className={button} onClick={onStudio}>Studio</Button></>}</div>;
  const chat = book.chats.find(item => item.id === book.selectedId)!;
  const title = (item: CompanionConversation) => item.draft.productName || item.draft.brandName || item.draft.brief || 'New chat';
  const navigation = (mobile = false) => {
    const searching = mobile && mobileSearch;
    return <>
    {!searching && <div className="companion-sidebar-top flex items-center justify-between px-3 py-3"><img src="/logo-badge.png" alt="Grifon" className="companion-brand-logo h-11 w-11 object-contain" /><div className="flex items-center"><Button variant="ghost" className={`${button} !p-3`} aria-label={mobile ? 'Close conversations' : 'Collapse conversations'} onClick={() => mobile ? closeMobileNavigation() : setCollapsed(true)}>{mobile ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-5 w-5 shrink-0" /></Button></div></div>}
    <div className="companion-search-row">{searching && <Button variant="ghost" className={`${button} shrink-0 !p-3`} aria-label="Back to conversations" onClick={exitMobileSearch}><ArrowLeft className="h-5 w-5" /></Button>}<label className="companion-search mx-3 mt-3 flex min-h-11 items-center gap-3 rounded-xl px-3 focus-within:ring-1 focus-within:ring-[#FFCC00]"><Search className="h-4 w-4 shrink-0 text-zinc-400" /><input aria-label="Search chats" placeholder="Search conversations" value={search} onFocus={() => { if (mobile) { mobileSearchActive.current = true; setMobileSearch(true); } }} onChange={event => setSearch(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" /></label></div>
    <nav aria-label="Conversations" className="companion-sidebar-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4">{book.chats.filter(item => title(item).toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} data-chat-id={item.id} aria-label={`Open chat: ${title(item)}`} aria-current={item.id === chat.id ? 'page' : undefined} onClick={() => void navigate(item.id)} className="companion-conversation min-h-11 w-full rounded-2xl text-left text-sm">
      <span aria-hidden="true" className="companion-conversation-icon"><Clapperboard className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex min-w-0 items-baseline gap-2"><strong className="companion-conversation-title min-w-0 flex-1 truncate">{title(item)}</strong><ConversationTime at={item.updatedAt} now={now} /></span><span className="companion-conversation-preview mt-1 block truncate">{item.draft.messages[item.draft.messages.length - 1]?.text || 'Start a conversation'}</span></span>
    </button>)}{!book.chats.some(item => title(item).toLowerCase().includes(search.toLowerCase())) && <p className="px-3 py-3 text-sm text-zinc-400">No matching chats</p>}</nav>
    {(!searching || navigationError) && <div className="companion-sidebar-account border-t border-white/10 p-2">{!searching && <><Button variant="ghost" className={`${button} flex w-full items-center justify-start gap-3 !px-3`} onClick={() => void navigate(undefined, true)}><Clapperboard className="h-5 w-5 shrink-0" />Studio</Button><Button variant="ghost" className={`${button} flex w-full items-center gap-3 !px-3 text-left`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate">{userName}</span></Button><p className="px-3 py-2 text-xs text-zinc-400">{preview ? 'Preview · simulated output' : 'Saved on this device'}</p></>}{navigationError && <p role="alert" className="px-3 pb-2 text-sm text-zinc-300">{navigationError}</p>}</div>}
  </>;
  };
  return <div ref={shell} data-companion-theme={appearance} className="companion-chat companion-shell flex h-dvh min-h-0 overflow-hidden font-sans">
    {!collapsed && <LiquidGlass as="aside" data-companion-glass className="companion-sidebar hidden shrink-0 flex-col md:flex">{navigation()}</LiquidGlass>}
    {collapsed && <LiquidGlass as="aside" data-companion-glass className="companion-sidebar companion-sidebar-collapsed hidden w-16 shrink-0 flex-col items-center pt-3 md:flex"><img src="/logo-badge.png" alt="Grifon" className="mb-2 h-10 w-10 object-contain" /><Button variant="ghost" className={`${button} !p-3`} aria-label="Open conversations" onClick={() => setCollapsed(false)}><PanelLeft className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} mt-auto mb-3 !p-3`} aria-label="Account settings" onClick={event => openSettings(event.currentTarget)}><Settings className="h-4 w-4" /></Button></LiquidGlass>}
    {mobileOpen && <div className="companion-drawer-veil fixed inset-0 z-50 md:hidden" onClick={closeMobileNavigation}><aside ref={drawer} role="dialog" aria-modal="true" aria-label="Chat navigation" data-companion-search={mobileSearch ? 'true' : undefined} className="companion-mobile-navigation flex h-full w-[min(320px,85vw)] flex-col" onClick={event => event.stopPropagation()}>{navigation(true)}</aside></div>}
    <div ref={main} className="companion-main relative min-h-0 min-w-0 flex-1"><Button variant="ghost" className={`${button} companion-appearance-toolbar companion-toolbar-new absolute z-30 !p-3 md:!hidden`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button>{children({ chat, update: patch => update(chat.id, patch), saved, saving, saveConflict, recoverCopy: () => void recoverCopy(), retrySave: () => { if (current.current) void persist(current.current); }, openNavigation: () => { setMobileOpen(true); setCollapsed(false); }, newChat: () => void navigate(), presentAvatar, leave })}<CompanionAvatarLayer presentation={avatar} />{navigationError && collapsed && <p role="alert" className="absolute bottom-4 left-4 right-4 z-30 rounded-xl bg-zinc-900 p-3 text-sm text-zinc-300">{navigationError}</p>}</div>
    <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} appearance={appearance} onAppearanceChange={changeAppearance} userEmail={userEmail} userName={userName} plan={plan} planLoading={planLoading} planError={planError} onRetryPlan={onRetryPlan} preview={preview} restoreFocus={restoreSettingsFocus}
      onLogout={onLogout ? () => leave(onLogout) : undefined} onUpgrade={onUpgrade ? () => leave(onUpgrade) : undefined} onNavigate={href => leave(() => onNavigate ? onNavigate(href) : window.location.assign(href))} />
  </div>;
}
