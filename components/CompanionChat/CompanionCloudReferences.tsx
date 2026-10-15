import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Cloud, PanelLeft } from 'lucide-react';
import Button from '../ui/Button';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { cloudReferenceLink, verifyCloudReferenceDraft, type CloudReferenceClient, type CloudReferenceReceipt } from '../../services/companionCloudReferences';
import type { CompanionReferenceDraft } from '../../services/companionReferenceDraft';
import type { ConversationBinding } from './CompanionChatShell';

const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
export function CompanionCloudReferences({ userId, client, conversation, onBack, onOpen }: {
  userId: string;
  client: CloudReferenceClient;
  conversation: ConversationBinding;
  onBack: () => void;
  onOpen: (draft: CompanionReferenceDraft, sourceLocalChatId: string, receipt: CloudReferenceReceipt) => Promise<void>;
}) {
  const [receipts, setReceipts] = useState<CloudReferenceReceipt[]>([]);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const locked = useRef(false), active = useRef(true), generation = useRef(0);
  const current = useRef({ userId, client, chatId: conversation.chat.id }); current.current = { userId, client, chatId: conversation.chat.id };
  const visible = (token: number) => active.current && generation.current === token && current.current.userId === userId && current.current.client === client && current.current.chatId === conversation.chat.id;
  const refresh = async () => {
    if (locked.current) return;
    const token = ++generation.current;
    locked.current = true; setBusy(true); setError('');
    try { const next = await client.list(); if (visible(token)) { setReceipts(next); setChecked(true); } }
    catch (reason) { if (visible(token)) setError(reason instanceof Error ? reason.message : 'Cloud briefs could not be checked. Your local work is kept.'); }
    finally { if (visible(token)) { locked.current = false; setBusy(false); } }
  };
  useEffect(() => {
    active.current = true; locked.current = false; void refresh();
    return () => { active.current = false; generation.current++; };
  }, [userId, client]);
  const save = async () => {
    const chat = conversation.chat, draft = chat.referenceDraft;
    if (locked.current || !draft || !conversation.saved || conversation.saving || conversation.saveConflict) return;
    const token = ++generation.current;
    locked.current = true; setBusy(true); setError(''); setStatus('Checking and saving this brief to cloud…');
    try {
      const receipt = await client.save(conversation.chat.id, draft);
      const link = await cloudReferenceLink(receipt, userId);
      if (!await verifyCloudReferenceDraft(draft, link)) throw new Error('The cloud save does not match the current brief. Your local work is kept.');
      if (visible(token)) {
        await conversation.updateSaved({ referenceCloudSource: link }, chat);
        if (visible(token)) { setReceipts(items => [receipt, ...items.filter(item => item.saveId !== receipt.saveId)]); setStatus('Cloud save confirmed. This private snapshot can be opened on another device.'); }
      }
    } catch (reason) {
      if (visible(token)) { setError(reason instanceof Error ? reason.message : 'Cloud save was not confirmed. Retry the same brief when connected.'); setStatus('Cloud save is not confirmed. Your local brief is kept.'); }
    } finally { if (visible(token)) { locked.current = false; setBusy(false); } }
  };
  const open = async (receipt: CloudReferenceReceipt) => {
    if (locked.current) return;
    const token = ++generation.current;
    locked.current = true; setBusy(true); setError(''); setStatus('Downloading and checking every saved file…');
    try {
      const opened = await client.openSnapshot(receipt.saveId);
      if (visible(token)) await onOpen(opened.draft, conversation.chat.id, opened.receipt);
    } catch (reason) { if (visible(token)) { setError(reason instanceof Error ? reason.message : 'The cloud brief could not be opened. Your local work is kept.'); setStatus('No cloud copy was installed.'); } }
    finally { if (visible(token)) { locked.current = false; setBusy(false); } }
  };
  const eligible = !!conversation.chat.referenceDraft && conversation.saved && !conversation.saving && !conversation.saveConflict;
  return <section data-testid="cloud-reference-panel" className="flex h-full min-h-0 flex-col">
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 p-3 sm:px-5">
      <Button variant="ghost" className={`${ghost} flex items-center gap-3 !px-3`} onClick={onBack}><ArrowLeft className="h-5 w-5 shrink-0" />Back to chat</Button>
      <Button variant="ghost" className={`${ghost} !px-3 md:hidden`} aria-label="Open conversations" onClick={conversation.openNavigation}><PanelLeft className="h-5 w-5 shrink-0" /></Button>
    </header>
    <div className="companion-sidebar-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <h1 className="flex items-center gap-3 !text-lg !font-semibold !normal-case !tracking-normal"><Cloud className="h-5 w-5 shrink-0 text-[#FFCC00]" />Cloud reference briefs</h1>
          <p className="text-sm leading-relaxed text-zinc-300">{client.simulation ? 'Fixture simulation: this preview uses a test cloud service.' : 'Private fixture storage for this signed-in account. Open a saved brief on another device using the same account.'}</p>
          <p className="text-sm leading-relaxed text-zinc-400">Each snapshot keeps the reference video, up to five photos in order with their roles, and selected voice details. Files must be 6,000,000 bytes (6 MB) or smaller each. Up to 20 snapshots and 200 MB per account, including unfinished uploads.</p>
          <p className="text-sm leading-relaxed text-zinc-400">Opening creates a new editable local chat. Prepare and confirm its sample plan, then start a cloud fixture job linked to these exact saved inputs. Review edits stay on this device until a job is accepted.</p>
          <p className="text-sm font-semibold text-[#FFCC00]">Private fixture · No generation · Actual spend: PHP 0.00</p>
          {error && <p role="alert" className="flex items-start gap-2 break-words text-sm leading-relaxed text-amber-500"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0">{error}</span></p>}
          {status && <p role="status" data-testid="cloud-reference-status" className="text-sm leading-relaxed text-zinc-300">{status}</p>}
        </GlassPanel>
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Save this chat’s reference brief</h2>
          <p className="text-sm leading-relaxed text-zinc-300">{conversation.chat.referenceDraft ? conversation.chat.referenceDraft.productName || conversation.chat.referenceDraft.brandName || conversation.chat.referenceDraft.brief || 'Reference brief' : 'Return to chat and add a reference brief first.'}</p>
          <p className="text-sm text-zinc-400">Local brief: {conversation.saveConflict ? 'Save conflict on this device' : conversation.saving ? 'Saving on this device…' : conversation.saved ? 'Saved on this device' : 'Not yet saved on this device'}. Cloud save requires its own confirmation.</p>
          <GoldButton className={`${control} w-full`} disabled={!eligible || busy} onClick={() => void save()}>Save this brief to cloud</GoldButton>
        </GlassPanel>
        <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Saved cloud reference briefs">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Your cloud reference briefs</h2>
          <Button variant="ghost" className={`${ghost} w-full`} disabled={busy} onClick={() => void refresh()}>Refresh cloud briefs</Button>
          {!checked && <p className="text-sm text-zinc-300">{busy ? 'Checking cloud briefs…' : 'Cloud briefs have not been confirmed. Refresh when connected.'}</p>}
          {checked && !receipts.length && <p className="text-sm text-zinc-300">No cloud reference briefs found.</p>}
          {receipts.map(receipt => {
            const draft = JSON.parse(receipt.manifestText).draft as CompanionReferenceDraft;
            const title = draft.productName || draft.brandName || draft.brief || 'Reference brief';
            return <div key={receipt.saveId} className="space-y-3 rounded-xl bg-zinc-950 p-3">
              <p className="break-words text-sm font-semibold text-white">{title}</p>
              <p className="break-words text-sm leading-relaxed text-zinc-400">{draft.referenceVideo ? '1 reference video' : 'No reference video'} · {draft.photos.length} photos · Voice: {draft.voice?.name || 'Not selected'}</p>
              <p className="break-all text-xs leading-relaxed text-zinc-400">Original chat: {receipt.sourceChatId}<br />Snapshot: {receipt.saveId}</p>
              <Button variant="ghost" aria-label={`Open copy in chat: ${title}`} disabled={busy} className={`${ghost} w-full`} onClick={() => void open(receipt)}>Open copy in chat</Button>
            </div>;
          })}
        </GlassPanel>
      </div>
    </div>
  </section>;
}
