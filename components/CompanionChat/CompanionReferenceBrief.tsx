import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AlertTriangle, PanelLeft, Plus, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import type { VoiceLibrary } from '../../types';
import { fetchVoices } from '../../services/voiceService';
import { prepareReferenceMedia, validateReferenceLink, type CompanionReferenceDraft, type ReferenceMedia, type ReferencePhoto, type ReferenceVoice } from '../../services/companionReferenceDraft';
import type { ConversationBinding } from './CompanionChatShell';
import { confirmSampleReview, createSampleReview, fingerprintReferenceDraft } from '../../services/companionReferenceReview';
import { CompanionReferenceReview } from './CompanionReferenceReview';
import { CompanionReferenceQueue } from './CompanionReferenceQueue';

const control = 'min-h-11 min-w-11 !rounded-xl !text-sm !font-semibold !normal-case !tracking-normal';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
const dropzone = `${control} w-full !bg-zinc-950/50 !border-2 border-dashed border-white/10 hover:!border-[#FFCC00] hover:!bg-zinc-800/80 flex flex-col items-center justify-center !p-6`;
const selectStyle = 'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]';

function MediaPreview({ media, video = false }: { media: ReferenceMedia; video?: boolean }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(media.blob); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [media.blob]);
  if (!url) return null;
  return video ? <video controls playsInline preload="metadata" src={url} aria-label="Reference video preview" className="max-h-64 w-full rounded-xl bg-zinc-950" />
    : <img src={url} alt={media.name} className="h-28 w-full rounded-lg object-contain" />;
}

export function CompanionReferenceBrief({ conversation, userId, loadVoices = fetchVoices }: {
  conversation: ConversationBinding;
  userId: string;
  loadVoices?: () => Promise<VoiceLibrary>;
}) {
  const draft = conversation.chat.referenceDraft!;
  const latest = useRef(draft); latest.current = draft;
  const latestChat = useRef(conversation.chat); latestChat.current = conversation.chat;
  const [showReview, setShowReview] = useState(!!conversation.chat.referenceReview);
  const [showQueue, setShowQueue] = useState(!!conversation.chat.referenceQueue);
  const [planning, setPlanning] = useState(false);
  const planningLock = useRef(false);
  const active = useRef(true);
  const scope = `${userId}:${conversation.chat.id}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const uploadLock = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<ReferenceVoice[]>([]);
  const [voiceLoading, setVoiceLoading] = useState(true);
  const [voiceAttempt, setVoiceAttempt] = useState(0);
  const slot = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLDivElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let alive = true; setVoiceLoading(true); setVoices([]);
    void loadVoices().then(library => {
      if (!alive) return;
      setVoices([
        ...library.libraryVoices.map(voice => ({ id: voice.voice_id, name: voice.name, source: 'curated' as const })),
        ...library.myVoices.map(voice => ({ id: voice.voice_id, name: voice.name, source: 'private' as const })),
      ].filter(voice => voice.id && voice.name));
    }).catch(() => { if (alive) setVoices([]); }).finally(() => { if (alive) setVoiceLoading(false); });
    return () => { alive = false; };
  }, [loadVoices, userId, voiceAttempt]);
  useLayoutEffect(() => {
    if (!slot.current || !section.current) return;
    const publish = () => {
      const bounds = slot.current!.getBoundingClientRect();
      conversation.presentAvatar(conversation.chat.id, { state: uploading || planning ? 'reading' : 'idle', bounds: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }, inert: !!slot.current?.closest('[inert]') });
    };
    publish();
    const observer = new ResizeObserver(publish); observer.observe(slot.current); observer.observe(section.current);
    window.addEventListener('resize', publish);
    return () => { observer.disconnect(); window.removeEventListener('resize', publish); };
  }, [conversation.chat.id, conversation.presentAvatar, uploading, planning]);
  const update = (patch: Partial<CompanionReferenceDraft>) => {
    const next = { ...latest.current, ...patch }; latest.current = next;
    conversation.update({ referenceDraft: next });
  };
  const reviewAction = async (confirm = false) => {
    if (uploadLock.current || planningLock.current || !conversation.saved || conversation.saving || conversation.saveConflict) return;
    const startedScope = scope, snapshot = latest.current, chat = latestChat.current;
    planningLock.current = true; setPlanning(true); setError(''); conversation.setMediaPreparing(true);
    try {
      const hash = await fingerprintReferenceDraft(snapshot);
      if (!active.current || currentScope.current !== startedScope) return;
      if (latest.current !== snapshot || latestChat.current.referenceInputRevision !== chat.referenceInputRevision || latestChat.current.referenceReview !== chat.referenceReview) {
        setError('The brief or review changed while checking inputs. Prepare the sample again.'); return;
      }
      const review = confirm && chat.referenceReview
        ? confirmSampleReview(chat.referenceReview, hash, chat.referenceInputRevision ?? 0)
        : createSampleReview(snapshot, hash, chat.referenceInputRevision ?? 0, chat.referenceReview?.revision ?? 0);
      conversation.update({ referenceReview: review }); setShowReview(true);
    } catch (reason) { if (active.current && currentScope.current === startedScope) setError(reason instanceof Error ? reason.message : 'The sample could not be prepared. Please retry.'); }
    finally { if (active.current && currentScope.current === startedScope) { planningLock.current = false; setPlanning(false); conversation.setMediaPreparing(false); } }
  };
  const attach = async (files: File[], kind: 'photo' | 'video') => {
    if (!files.length || uploadLock.current || planningLock.current) return;
    if (kind === 'photo' && latest.current.photos.length + files.length > 5) { setError('You can attach up to five photos. Remove a photo before adding another.'); return; }
    const startedScope = scope;
    uploadLock.current = true; setUploading(true); conversation.setMediaPreparing(true); setError('');
    try {
      const media = [];
      for (const file of files) media.push(await prepareReferenceMedia(file, kind));
      if (!active.current || currentScope.current !== startedScope) return;
      if (kind === 'photo') update({ photos: [...latest.current.photos, ...media.map(item => ({ ...item, role: 'product' as const }))] });
      else update({ referenceVideo: media[0] });
    } catch (reason) { if (active.current && currentScope.current === startedScope) setError(reason instanceof Error ? reason.message : 'The file could not be prepared.'); }
    finally { if (active.current && currentScope.current === startedScope) { uploadLock.current = false; setUploading(false); conversation.setMediaPreparing(false); } }
  };
  let linkError = '';
  try { validateReferenceLink(draft.referenceLink); } catch (reason) { linkError = (reason as Error).message; }
  const selectedAvailable = !draft.voice || voices.some(voice => voice.id === draft.voice!.id && voice.source === draft.voice!.source);
  return <div ref={section} data-testid="companion-chat" data-chat-id={conversation.chat.id} className="flex h-full min-h-0 flex-col text-white [&_input::placeholder]:text-zinc-400 [&_textarea::placeholder]:text-zinc-400">
    <header className="relative shrink-0 border-b border-white/10 px-4 py-3 sm:px-8">
      <Button variant="ghost" aria-label="Open conversations" className={`${ghost} absolute left-3 top-3 !p-3 md:!hidden`} onClick={conversation.openNavigation}><PanelLeft className="h-4 w-4" /></Button>
      <div className="mx-auto flex w-fit flex-col items-center"><div ref={slot} aria-hidden="true" className="h-14 w-14" /><h1 className="!text-base !font-semibold !normal-case !tracking-normal">Grifon</h1></div>
      <Button variant="ghost" aria-label="New chat" className={`${ghost} absolute right-3 top-3 !p-3 md:!hidden`} disabled={uploading || planning} onClick={conversation.newChat}><Plus className="h-4 w-4" /></Button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-2xl space-y-5">
        {error && <p role="alert" className="flex items-start gap-3 text-sm text-amber-500"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</p>}
        {planning && <p role="status" className="text-sm text-zinc-300">Checking your saved brief and files… No generation or spending.</p>}
        {showQueue ? <CompanionReferenceQueue key={`${scope}:${conversation.chat.referenceQueue?.id ?? 'new'}`} conversation={conversation} userId={userId} onBack={() => { setShowQueue(false); setShowReview(true); }} /> : showReview && conversation.chat.referenceReview ? <CompanionReferenceReview review={conversation.chat.referenceReview} busy={planning || uploading} saved={conversation.saved && !conversation.saving && !conversation.saveConflict}
          onChange={review => conversation.update({ referenceReview: review })} onBack={() => setShowReview(false)} onPrepare={() => void reviewAction()} onConfirm={() => void reviewAction(true)} onQueue={() => setShowQueue(true)} hasQueue={!!conversation.chat.referenceQueue} /> : <>
        <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Reference brief">
          <h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Reference brief</h2>
          <p className="text-sm leading-relaxed text-zinc-300">Save your brief and assets, then try an editable sample plan. Real analysis and generation are not available here.</p>
          <p className="text-xs leading-relaxed text-zinc-400">Saved only in this browser on this device, under your account. Clearing browser data removes these drafts and files. Keep your originals.</p>
          <GoldButton className={`${control} w-full disabled:opacity-50 disabled:hover:scale-100`} disabled={planning || uploading || !conversation.saved || conversation.saving || conversation.saveConflict} onClick={() => void reviewAction()}>{planning ? 'Preparing sample…' : conversation.chat.referenceReview ? 'Prepare updated sample plan' : 'Prepare sample plan'}</GoldButton>
          <p className="text-xs text-zinc-400">Fixture example only, with English sample copy and invented PHP estimates. Actual spend is zero. Incomplete briefs are allowed for this demo.</p>
          {conversation.chat.referenceReview && <><Button variant="ghost" className={ghost} onClick={() => setShowReview(true)}>View previous sample plan</Button>{conversation.chat.referenceReview.stale && <p className="flex items-start gap-3 text-xs text-amber-500"><AlertTriangle className="h-5 w-5 shrink-0" />Your previous sample is stale. Preparing an updated sample replaces its edits and demo confirmation.</p>}</>}
          <Textarea id="reference-brief" label="Brief" value={draft.brief} maxLength={4000} onChange={event => update({ brief: event.target.value })} placeholder="What are we advertising, and what should viewers understand?" />
          <div className="grid gap-4 sm:grid-cols-2"><Input id="reference-brand" label="Brand name" value={draft.brandName} maxLength={200} onChange={event => update({ brandName: event.target.value })} /><Input id="reference-product" label="Product or service" value={draft.productName} maxLength={200} onChange={event => update({ productName: event.target.value })} /></div>
          <Input id="reference-audience" label="Audience" value={draft.audience} maxLength={1000} onChange={event => update({ audience: event.target.value })} />
          <Input id="reference-offer" label="Offer (optional)" value={draft.offer} maxLength={2000} onChange={event => update({ offer: event.target.value })} />
          <Input id="reference-cta" label="Call to action" value={draft.callToAction} maxLength={500} onChange={event => update({ callToAction: event.target.value })} />
          <label className="block text-sm text-zinc-400">Output language<select aria-label="Output language" className={selectStyle} value={draft.outputLanguage} onChange={event => update({ outputLanguage: event.target.value as CompanionReferenceDraft['outputLanguage'] })}>{['Taglish', 'Tagalog', 'English'].map(language => <option key={language}>{language}</option>)}</select></label>
          <label className="block text-sm text-zinc-400">Reference adaptation<select aria-label="Reference adaptation" className={selectStyle} value={draft.adaptationMode ?? 'adapt'} onChange={event => update({ adaptationMode: event.target.value as CompanionReferenceDraft['adaptationMode'] })}><option value="adapt">Adapt for brand</option><option value="close">Match closely</option></select></label>
          <label className="block text-sm text-zinc-400">Speech mode<select aria-label="Speech mode" className={selectStyle} value={draft.speechMode ?? 'spoken'} onChange={event => update({ speechMode: event.target.value as CompanionReferenceDraft['speechMode'] })}><option value="spoken">Spoken ad</option><option value="silent">No voiceover</option></select></label>
        </GlassPanel>
        <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Reference and photos">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">Reference and photos</h2>
          <p className="text-sm text-zinc-300">Your reference can be in any language. Its edit can guide an ad in your chosen output language.</p>
          <input ref={videoInput} aria-label="Reference video" className="hidden" type="file" accept="video/mp4,video/webm,video/quicktime" disabled={uploading || planning} onChange={event => { void attach(Array.from(event.target.files ?? []), 'video'); event.target.value = ''; }} />
          <Button variant="secondary" className={dropzone} disabled={uploading || planning} onClick={() => videoInput.current?.click()}>{draft.referenceVideo ? 'Replace reference video' : 'Add reference video'}</Button>
          <p className="text-xs text-zinc-400">MP4, WebM or MOV supported by your browser. Up to 100 MB and 3 minutes. Video stays on this device.</p>
          {draft.referenceVideo && <div className="space-y-2"><MediaPreview media={draft.referenceVideo} video /><div className="flex items-center gap-2"><p className="min-w-0 flex-1 truncate text-xs text-zinc-300">{draft.referenceVideo.name}</p><Button variant="ghost" className={ghost} disabled={uploading || planning} onClick={() => update({ referenceVideo: null })}>Remove video</Button></div></div>}
          <Input id="reference-link" label="Reference link (optional)" value={draft.referenceLink} maxLength={4000} aria-invalid={!!linkError} aria-describedby="reference-link-help" onChange={event => update({ referenceLink: event.target.value })} placeholder="https://…" />
          <p id="reference-link-help" className={`text-xs ${linkError ? 'text-amber-500' : 'text-zinc-400'}`}>{linkError || 'Links are saved as text. Grifon does not fetch or analyze them in this build.'}</p>
          <Input id="reference-language" label="Reference language (optional)" value={draft.referenceLanguage} maxLength={200} onChange={event => update({ referenceLanguage: event.target.value })} />
          <Textarea id="reference-instructions" label="What to preserve or pay attention to" value={draft.instructions} maxLength={4000} onChange={event => update({ instructions: event.target.value })} />
          <input ref={photoInput} aria-label="Add photos" className="hidden" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={uploading || planning} onChange={event => { void attach(Array.from(event.target.files ?? []), 'photo'); event.target.value = ''; }} />
          <Button variant="secondary" className={dropzone} disabled={uploading || planning} onClick={() => photoInput.current?.click()}>Add photos ({draft.photos.length}/5)</Button>
          <p className="text-xs text-zinc-400">Up to five JPEG, PNG or WebP photos, 10 MB each. Label each photo so its intended use stays clear.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{draft.photos.map(photo => <div key={photo.id} className="min-w-0 rounded-xl border border-white/10 p-2"><MediaPreview media={photo} /><p className="mt-2 truncate text-xs text-zinc-300">{photo.name}</p><label className="mt-2 block text-xs text-zinc-400">Photo role<select aria-label={`Role for ${photo.name}`} className={selectStyle} value={photo.role} onChange={event => update({ photos: latest.current.photos.map(item => item.id === photo.id ? { ...item, role: event.target.value as ReferencePhoto['role'] } : item) })}><option value="product">Product</option><option value="character">Character</option><option value="clothing">Clothing</option></select></label><Button variant="ghost" aria-label={`Remove ${photo.name}`} className={`${ghost} mt-1 flex w-full items-center justify-center gap-3`} disabled={uploading || planning} onClick={() => update({ photos: latest.current.photos.filter(item => item.id !== photo.id) })}><X className="h-5 w-5 shrink-0" />Remove</Button></div>)}</div>
          {uploading && <p role="status" className="text-sm text-zinc-300">Checking media on this device…</p>}
        </GlassPanel>
        <GlassPanel className="space-y-3 p-4 sm:p-5" aria-label="Selected voice">
          <h2 className="!text-base !font-semibold !normal-case !tracking-normal">One voice for this ad</h2>
          <label className="block text-sm text-zinc-400">Saved voice<select aria-label="Saved voice" className={selectStyle} disabled={voiceLoading} value={draft.voice ? `${draft.voice.source}:${draft.voice.id}` : ''} onChange={event => update({ voice: voices.find(voice => `${voice.source}:${voice.id}` === event.target.value) ?? null })}><option value="">Choose later</option>{!selectedAvailable && draft.voice && <option value={`${draft.voice.source}:${draft.voice.id}`}>{draft.voice.name} (saved selection)</option>}{(['curated', 'private'] as const).map(source => <optgroup key={source} label={source === 'curated' ? 'Grifon curated voices' : 'My voices'}>{voices.filter(voice => voice.source === source).map(voice => <option key={voice.id} value={`${source}:${voice.id}`}>{voice.name}</option>)}</optgroup>)}</select></label>
          <p className="text-xs leading-relaxed text-zinc-400">Voice selection is saved with this brief. No voice cloning, previews or speech generation run here.</p>
          {voiceLoading ? <p role="status" className="text-xs text-zinc-400">Loading saved voices…</p> : (!voices.length || !selectedAvailable) && <><p className="text-xs text-amber-500">{draft.voice ? 'Your selected voice is kept, but could not be confirmed in the current list.' : 'No saved voices are available right now. You can save the brief and choose later.'}</p><Button variant="secondary" className={ghost} onClick={() => setVoiceAttempt(value => value + 1)}>Refresh voices</Button></>}
        </GlassPanel>
        </>}
      </div>
    </div>
    <footer className="shrink-0 border-t border-white/10 bg-zinc-950 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-8">
      <div className="mx-auto max-w-2xl"><p role="status" id="companion-save-status" className="text-xs leading-relaxed text-zinc-400">{planning ? 'Preparing this sample locally. No generation or spending.' : uploading ? 'Media is still being checked. Keep this chat open until it is attached and saved.' : conversation.saveConflict ? 'Another tab saved newer chats. Save this chat as a copy to preserve both versions.' : conversation.saving ? 'Saving on this device…' : conversation.saved ? showQueue ? 'Demo queue saved on this device. No generation started.' : showReview ? 'Sample review saved on this device. No generation started.' : 'Reference brief saved on this device. No generation started.' : 'Draft could not be saved. Keep this tab open and retry.'}</p><Button variant={conversation.saved ? 'ghost' : 'secondary'} className={`${ghost} mt-2 w-full`} disabled={planning || uploading || conversation.saving} onClick={conversation.saveConflict ? conversation.recoverCopy : conversation.retrySave}>{conversation.saveConflict ? 'Save this chat as a copy' : conversation.saved ? showQueue ? 'Save demo queue' : showReview ? 'Save review' : 'Save brief' : 'Retry saving'}</Button></div>
    </footer>
  </div>;
}
