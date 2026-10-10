import React, { useEffect, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { AlertTriangle, ArrowLeft, Download, Upload, ZoomIn, X } from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { TextField as Input, TextArea as Textarea } from '../ui/TextField';
import ImageModal from '../ui/ImageModal';
import { CTRL_H, R_CTRL, T_CTRL, T_DISPLAY } from '../ui/wizardTokens';
import { ReferenceBriefPanel } from './ReferenceBriefPanel';
import { createSaasDemoBrief, MAX_SAAS_DEMO_BYTES, parseSaasDemoBrief, readSaasScreenshot, saasDemoGaps, validateSaasDemoBrief, type SaasDemoBrief, type SaasScreenshotSlot } from '../../services/saasDemoBrief';
import { loadSaasDemoDraft, saveSaasDemoDraft } from '../../utils/saasDemoDraft';

const ghost = `${CTRL_H} ${R_CTRL} ${T_CTRL} inline-flex items-center justify-center gap-3 border border-white/10 bg-zinc-950 px-4 text-zinc-300 transition-colors hover:border-[#FFCC00] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00] disabled:cursor-not-allowed disabled:opacity-50`;
const inputClass = 'placeholder:!text-zinc-400';
const titleCase = (slot: string) => slot[0].toUpperCase() + slot.slice(1);

export const SaasDemoPreparation: React.FC<{ ownerId: string; onBack: () => void }> = ({ ownerId, onBack }) => {
  const [brief, setBrief] = useState(createSaasDemoBrief);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('Loading this account’s preparation…');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ dataUrl: string; mimeType: string }>();
  const [uploading, setUploading] = useState<Partial<Record<SaasScreenshotSlot, boolean>>>({});
  const importInput = useRef<HTMLInputElement>(null);
  const revision = useRef(0);
  const importSequence = useRef(0);
  const referenceEpoch = useRef(0);
  const displayedReferenceEpoch = referenceEpoch.current;
  const uploadSequence = useRef({ setup: 0, action: 0, result: 0 });
  const mounted = useRef(true);
  const gaps = saasDemoGaps(brief);
  const assetsBusy = Object.values(uploading).some(Boolean);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    void loadSaasDemoDraft(ownerId).then(saved => {
      if (!active) return;
      if (saved) { ++referenceEpoch.current; setBrief(saved); }
      setStatus(saved ? 'Loaded this account’s preparation from this device.' : 'No saved preparation for this account on this device.');
    }).catch(e => { if (active) { setError(e.message); setStatus('Device load failed. Changes can still be exported.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; mounted.current = false; ++importSequence.current; };
  }, [ownerId]);

  const edit = (update: (previous: SaasDemoBrief) => SaasDemoBrief) => {
    ++revision.current;
    setBrief(update);
    setError('');
    setStatus('Unsaved changes on this screen.');
  };
  const fact = (key: keyof SaasDemoBrief['productFacts'], value: string) => edit(previous => ({ ...previous, productFacts: { ...previous.productFacts, [key]: value } }));
  const screenshotText = (slot: SaasScreenshotSlot, field: 'caption' | 'sourceUrl' | 'capturedAt' | 'ownerNote', value: string) => edit(previous => ({ ...previous, screenshots: previous.screenshots.map(s => s.slot === slot ? { ...s, [field]: value } : s) }));

  const upload = async (slot: SaasScreenshotSlot, file?: File) => {
    if (!file) return;
    const sequence = ++uploadSequence.current[slot];
    ++revision.current;
    setUploading(previous => ({ ...previous, [slot]: true }));
    setError('');
    try {
      const image = await readSaasScreenshot(file);
      if (!mounted.current || sequence !== uploadSequence.current[slot]) return;
      edit(previous => ({ ...previous, screenshots: previous.screenshots.map(s => s.slot === slot ? { ...s, image } : s) }));
    } catch (e) { if (mounted.current && sequence === uploadSequence.current[slot]) setError(e instanceof Error ? e.message : 'Screenshot could not be read.'); }
    finally { if (mounted.current && sequence === uploadSequence.current[slot]) setUploading(previous => ({ ...previous, [slot]: false })); }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    const sequence = ++importSequence.current;
    const startedAt = revision.current;
    for (const slot of ['setup', 'action', 'result'] as const) ++uploadSequence.current[slot];
    setUploading({});
    setError('');
    try {
      if (file.size > MAX_SAAS_DEMO_BYTES) throw new Error('Software preparation: Brief exceeds 4.5 MiB.');
      const imported = await parseSaasDemoBrief(await file.text());
      if (!mounted.current || sequence !== importSequence.current) return;
      if (startedAt !== revision.current) { setStatus('Import cancelled because you edited the current preparation. Choose the file again to replace it.'); return; }
      for (const slot of ['setup', 'action', 'result'] as const) ++uploadSequence.current[slot];
      setUploading({});
      ++referenceEpoch.current;
      edit(() => imported);
      setStatus('Imported for local review. Save to keep it on this device.');
    } catch (e) { if (mounted.current && sequence === importSequence.current && startedAt === revision.current) setError(e instanceof Error ? e.message : 'Preparation import failed.'); }
  };

  const save = async () => {
    const startedAt = revision.current;
    setSaving(true); setError(''); setStatus('Saving preparation…');
    try {
      await saveSaasDemoDraft(ownerId, brief);
      if (mounted.current) setStatus(startedAt === revision.current ? 'Saved on this device for this account.' : 'Earlier snapshot saved. New changes are unsaved.');
    } catch (e) { if (mounted.current) { setError(e instanceof Error ? e.message : 'Device save failed.'); setStatus('Save failed. Changes remain on this screen.'); } }
    finally { if (mounted.current) setSaving(false); }
  };
  const exportBrief = () => {
    try {
      const checked = validateSaasDemoBrief(brief);
      saveAs(new Blob([JSON.stringify(checked, null, 2)], { type: 'application/json' }), 'grifon-software-preparation.json');
      setError(''); setStatus('Exported a preparation-only snapshot. Missing evidence remains listed below.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Preparation export failed.'); }
  };

  return <div className="min-h-screen bg-zinc-950 px-4 py-8 pb-28 text-white md:pb-10">
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-4 border-b border-white/10 pb-6">
        <button type="button" onClick={onBack} className={ghost}><ArrowLeft className="h-5 w-5 shrink-0" />Back to ad composer</button>
        <h1 className={T_DISPLAY}>Prepare software demo</h1>
        <p className="max-w-2xl text-sm text-zinc-400">Collect real product screens and a reviewable brief. This preparation screen does not generate a video.</p>
      </header>
      <p role="status" aria-live="polite" className="break-words text-sm text-zinc-300">{status}</p>
      {error && <p role="alert" className="flex items-start gap-2 break-words text-sm text-amber-500"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      <fieldset disabled={loading} className="min-w-0 space-y-6 disabled:opacity-60">
        <GlassPanel className="space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Owner-recorded product facts</h2>
          <p className="text-sm text-zinc-400">Record only what the product and your own screen capture show. These entries are not independently verified.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="saas-brand" label="Brand name" value={brief.productFacts.brandName} maxLength={200} onChange={e => fact('brandName', e.target.value)} className={inputClass} />
            <Input id="saas-product" label="Product name" value={brief.productFacts.productName} maxLength={200} onChange={e => fact('productName', e.target.value)} className={inputClass} />
          </div>
          <Input id="saas-site" label="Official website" type="url" placeholder="https://" value={brief.productFacts.officialWebsite} maxLength={2048} onChange={e => fact('officialWebsite', e.target.value)} className={inputClass} />
          <Textarea id="saas-offer" label="Use case or offer" value={brief.productFacts.useCaseOrOffer} maxLength={2000} onChange={e => fact('useCaseOrOffer', e.target.value)} className={inputClass} />
        </GlassPanel>
        <GlassPanel className="space-y-4 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Hypotheses to test</h2>
          <p className="text-sm text-zinc-400">Audience and creative ideas are assumptions until your campaign results support them.</p>
          <Textarea id="saas-audience" label="Audience hypothesis" value={brief.audienceHypothesis} maxLength={2000} onChange={e => edit(p => ({ ...p, audienceHypothesis: e.target.value }))} className={inputClass} />
          <Textarea id="saas-creative" label="Creative hypothesis" value={brief.creativeHypothesis} maxLength={2000} onChange={e => edit(p => ({ ...p, creativeHypothesis: e.target.value }))} className={inputClass} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="saas-cta" label="CTA text" value={brief.cta.text} maxLength={200} onChange={e => edit(p => ({ ...p, cta: { ...p.cta, text: e.target.value } }))} className={inputClass} />
            <Input id="saas-cta-destination" label="CTA destination" type="url" value={brief.cta.destinationUrl} maxLength={2048} onChange={e => edit(p => ({ ...p, cta: { ...p.cta, destinationUrl: e.target.value } }))} className={inputClass} />
          </div>
        </GlassPanel>
        <ReferenceBriefPanel preparationOnly key={displayedReferenceEpoch} value={brief.referenceBrief} onChange={referenceBrief => { if (mounted.current && displayedReferenceEpoch === referenceEpoch.current) edit(p => ({ ...p, referenceBrief })); }} subject={{ brandName: brief.productFacts.brandName, productName: brief.productFacts.productName, offer: brief.productFacts.useCaseOrOffer }} />
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Real product screenshots</h2>
          <p className="text-sm text-zinc-400">Use your original PNG or JPEG files, up to 1 MiB each. Images stay unchanged on this device. Remove private account information before uploading.</p>
          {brief.screenshots.map(screenshot => {
            const label = titleCase(screenshot.slot);
            return <GlassPanel key={screenshot.slot} className="min-w-0 space-y-4 p-5 sm:p-6">
              <h3 className="text-base font-semibold">{label}</h3>
              <p className="text-sm text-zinc-400">{screenshot.slot === 'setup' ? 'The starting screen and its context.' : screenshot.slot === 'action' ? 'The actual feature or action being demonstrated.' : 'The visible result of that action.'}</p>
              <div className="relative inline-flex"><input id={`saas-${screenshot.slot}-file`} type="file" accept="image/png,image/jpeg" aria-label={`${label} screenshot file`} className="peer sr-only" onChange={e => { void upload(screenshot.slot, e.target.files?.[0]); e.target.value = ''; }} /><label htmlFor={`saas-${screenshot.slot}-file`} className={`${ghost} cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[#FFCC00]`}><Upload className="h-5 w-5 shrink-0" />{uploading[screenshot.slot] ? 'Checking screenshot…' : 'Upload screenshot'}</label></div>
              {screenshot.image && <>
                <button type="button" aria-label={`Review ${screenshot.slot} screenshot`} onClick={() => setPreview(screenshot.image!)} className={`relative block w-full overflow-hidden border border-white/10 bg-zinc-950 p-2 ${R_CTRL} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00]`}>
                  <img src={screenshot.image.dataUrl} alt={`${label} product screenshot`} className="h-48 w-full object-contain sm:h-64" />
                  <span className="mt-2 inline-flex items-center gap-3 text-sm font-semibold text-[#FFCC00]"><ZoomIn className="h-5 w-5 shrink-0" />Review screenshot</span>
                </button>
                <button type="button" aria-label={`Remove ${screenshot.slot} screenshot`} className={ghost} onClick={() => { ++uploadSequence.current[screenshot.slot]; setUploading(p => ({ ...p, [screenshot.slot]: false })); edit(p => ({ ...p, screenshots: p.screenshots.map(s => s.slot === screenshot.slot ? { ...s, image: undefined } : s) })); }}><X className="h-5 w-5 shrink-0" />Remove screenshot</button>
              </>}
              <Input id={`saas-${screenshot.slot}-caption`} label={`${label} caption`} value={screenshot.caption} maxLength={500} onChange={e => screenshotText(screenshot.slot, 'caption', e.target.value)} className={inputClass} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id={`saas-${screenshot.slot}-source`} label={`${label} source URL`} type="url" value={screenshot.sourceUrl} maxLength={2048} onChange={e => screenshotText(screenshot.slot, 'sourceUrl', e.target.value)} className={inputClass} />
                <Input id={`saas-${screenshot.slot}-time`} label={`${label} captured at (ISO)`} placeholder="2026-10-08T01:00:00Z" value={screenshot.capturedAt} maxLength={40} onChange={e => screenshotText(screenshot.slot, 'capturedAt', e.target.value)} className={inputClass} />
              </div>
              <Textarea id={`saas-${screenshot.slot}-note`} label={`${label} owner observation`} value={screenshot.ownerNote} maxLength={1000} onChange={e => screenshotText(screenshot.slot, 'ownerNote', e.target.value)} className={inputClass} />
            </GlassPanel>;
          })}
        </div>
        <GlassPanel className="min-w-0 space-y-3 break-words p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Evidence gaps</h2>
          <p className="text-sm text-zinc-400">Preparation only. Saving or exporting does not approve generation or establish product claims.</p>
          {gaps.length ? <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">{gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul> : <p className="text-sm text-zinc-300">No missing fields found. Production support and review are still required.</p>}
        </GlassPanel>
        <div className="flex flex-wrap gap-3">
          <GoldButton type="button" onClick={() => { void save(); }} disabled={saving || assetsBusy} className={`${CTRL_H} ${R_CTRL} focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00] disabled:cursor-not-allowed disabled:opacity-50`}>{saving ? 'Saving…' : 'Save preparation'}</GoldButton>
          <button type="button" onClick={exportBrief} disabled={assetsBusy} className={ghost}><Download className="h-5 w-5 shrink-0" />Export preparation</button>
          <button type="button" onClick={() => importInput.current?.click()} disabled={saving || assetsBusy} className={ghost}><Upload className="h-5 w-5 shrink-0" />Import preparation</button>
          <input ref={importInput} type="file" accept="application/json,.json" aria-label="Preparation file" className="hidden" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </fieldset>
      {preview && <ImageModal imageUrl={preview.dataUrl} filename={`original-product-screenshot.${preview.mimeType === 'image/jpeg' ? 'jpg' : 'png'}`} onClose={() => setPreview(undefined)} />}
    </div>
  </div>;
};
