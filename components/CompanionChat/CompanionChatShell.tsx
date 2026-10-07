import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { PanelLeft, PanelLeftClose, Plus, Search, X, Clapperboard } from 'lucide-react';
import Button from '../ui/Button';
import { createConversation, loadConversations, saveConversations, updateConversation, type CompanionConversation, type CompanionConversations } from '../../services/companionConversations';
import './companionChat.css';

export interface ConversationBinding {
  chat: CompanionConversation;
  update: (patch: Partial<Pick<CompanionConversation, 'draft' | 'composer' | 'runId'>>) => void;
  saved: boolean;
  saving: boolean;
  retrySave: () => void;
  openNavigation: () => void;
  newChat: () => void;
}
interface Props {
  userId: string;
  onStudio: () => void;
  children: (binding: ConversationBinding) => ReactNode;
}
const button = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';

export function CompanionChatShell({ userId, onStudio, children }: Props) {
  const [book, setBook] = useState<CompanionConversations | null>(null);
  const current = useRef<CompanionConversations | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const drawer = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const navigating = useRef(false);
  const persist = useCallback((next: CompanionConversations) => {
    setSaving(true);
    const task = writes.current.catch(() => {}).then(() => saveConversations(next));
    writes.current = task;
    void task.then(() => {
      if (mounted.current && current.current === next && writes.current === task) { setSaved(true); setSaving(false); }
    }, () => {
      if (mounted.current && current.current === next && writes.current === task) { setSaved(false); setSaving(false); }
    });
    return task;
  }, []);
  useEffect(() => {
    mounted.current = true;
    let alive = true;
    setLoadError(false);
    void loadConversations(userId).then(next => {
      if (!alive) return;
      current.current = next; setBook(next); void persist(next);
    }).catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; mounted.current = false; };
  }, [userId, attempt, persist]);
  useEffect(() => {
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
    current.current = next; setBook(next); void persist(next);
  }, [persist]);
  const navigate = async (id?: string, studio = false) => {
    if (!current.current || navigating.current) return;
    navigating.current = true;
    main.current?.setAttribute('inert', '');
    try {
      let snapshot: CompanionConversations;
      do { snapshot = current.current; await persist(snapshot); } while (snapshot !== current.current);
      if (!mounted.current) return;
      if (studio) { onStudio(); return; }
      const chat = id ? null : createConversation();
      const next = { ...current.current, selectedId: id ?? chat!.id, chats: chat ? [chat, ...current.current.chats] : current.current.chats };
      current.current = next; setBook(next); setSaved(true); setMobileOpen(false); setSearch('');
      void persist(next);
    } catch { setSaved(false); }
    finally { navigating.current = false; main.current?.removeAttribute('inert'); }
  };
  if (!book) return <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-sm text-white"><p role={loadError ? 'alert' : 'status'}>{loadError ? 'Saved chats could not be opened. Your saved data has been kept.' : 'Opening your chats…'}</p>{loadError && <><Button className={button} onClick={() => setAttempt(value => value + 1)}>Retry saved chats</Button><Button variant="ghost" className={button} onClick={onStudio}>Studio</Button></>}</div>;
  const chat = book.chats.find(item => item.id === book.selectedId)!;
  const title = (item: CompanionConversation) => item.draft.productName || item.draft.brandName || item.draft.brief || 'New chat';
  const navigation = <>
    <div className="flex items-center justify-between px-2 py-2"><span className="px-2 text-sm font-semibold">Chats</span><Button variant="ghost" className={`${button} !p-3`} aria-label={mobileOpen ? 'Close conversations' : 'Collapse conversations'} onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed(true)}>{mobileOpen ? <X className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</Button></div>
    <Button variant="ghost" className={`${button} mx-2 flex items-center justify-start gap-3 !px-3`} onClick={() => void navigate()}><Plus className="h-5 w-5 shrink-0" />New chat</Button>
    <label className="mx-2 mt-2 flex min-h-11 items-center gap-3 rounded-xl bg-zinc-950 px-3 focus-within:ring-1 focus-within:ring-[#FFCC00]"><Search className="h-4 w-4 shrink-0 text-zinc-400" /><input aria-label="Search chats" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none" /></label>
    <nav aria-label="Conversations" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">{book.chats.filter(item => title(item).toLowerCase().includes(search.toLowerCase())).map(item => <button key={item.id} data-chat-id={item.id} aria-label={`Open chat: ${title(item)}`} aria-current={item.id === chat.id ? 'page' : undefined} onClick={() => void navigate(item.id)} className={`min-h-11 w-full truncate rounded-xl px-3 text-left text-sm font-semibold ${item.id === chat.id ? 'bg-[#FFCC00]/10 text-[#FFCC00]' : 'text-zinc-300 hover:bg-white/5'}`}>{title(item)}</button>)}{!book.chats.some(item => title(item).toLowerCase().includes(search.toLowerCase())) && <p className="px-3 py-3 text-sm text-zinc-400">No matching chats</p>}</nav>
    <div className="border-t border-white/10 p-2"><Button variant="ghost" className={`${button} flex w-full items-center justify-start gap-3 !px-3`} onClick={() => void navigate(undefined, true)}><Clapperboard className="h-5 w-5 shrink-0" />Studio</Button><p className="px-3 py-2 font-mono text-[11px] text-zinc-400">Saved on this device</p></div>
  </>;
  return <div className="companion-chat companion-shell flex h-dvh min-h-0 overflow-hidden bg-zinc-950 font-sans text-white">
    {!collapsed && <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-zinc-900/40 md:flex">{navigation}</aside>}
    {collapsed && <aside className="hidden w-14 shrink-0 flex-col items-center border-r border-white/10 pt-3 md:flex"><Button variant="ghost" className={`${button} !p-3`} aria-label="Open conversations" onClick={() => setCollapsed(false)}><PanelLeft className="h-4 w-4" /></Button><Button variant="ghost" className={`${button} !p-3`} aria-label="New chat" onClick={() => void navigate()}><Plus className="h-4 w-4" /></Button></aside>}
    {mobileOpen && <div className="fixed inset-0 z-50 bg-zinc-950/80 md:hidden" onClick={() => setMobileOpen(false)}><aside ref={drawer} role="dialog" aria-modal="true" aria-label="Chat navigation" className="flex h-full w-[min(320px,85vw)] flex-col border-r border-white/10 bg-zinc-900" onClick={event => event.stopPropagation()}>{navigation}</aside></div>}
    <div ref={main} className="min-h-0 min-w-0 flex-1">{children({ chat, update: patch => update(chat.id, patch), saved, saving, retrySave: () => { if (current.current) void persist(current.current); }, openNavigation: () => { setMobileOpen(true); setCollapsed(false); }, newChat: () => void navigate() })}</div>
  </div>;
}
