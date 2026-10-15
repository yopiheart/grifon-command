import { AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import { GlassPanel } from '../ui/GlassPanel';
import { GoldButton } from '../ui/GoldButton';
import { editSampleReview, reviewErrors, sampleQuoteTotals, type ReferenceReview, type SampleQuote } from '../../services/companionReferenceReview';

const control = 'min-h-11 !rounded-xl !text-sm !font-semibold disabled:opacity-50 disabled:hover:scale-100';
const ghost = `${control} !bg-zinc-950 border border-white/10 !text-zinc-400 hover:!text-white hover:!border-[#FFCC00]`;
const money = (cents: number) => `PHP ${(cents / 100).toFixed(2)}`;

export function CompanionReferenceReview({ review, busy, saved, onChange, onBack, onPrepare, onConfirm, onQueue, hasQueue, queueLabel = 'Preview demo queue', cloudMode = false, cloudLinked = false }: {
  review: ReferenceReview;
  busy: boolean;
  saved: boolean;
  onChange: (review: ReferenceReview) => void;
  onBack: () => void;
  onPrepare: () => void;
  onConfirm: () => void;
  onQueue: () => void;
  hasQueue: boolean;
  queueLabel?: string;
  cloudMode?: boolean;
  cloudLinked?: boolean;
}) {
  const errors = reviewErrors(review);
  let totals: ReturnType<typeof sampleQuoteTotals> | null = null;
  try { totals = sampleQuoteTotals(review.quote); } catch { /* Retain editable invalid amounts with visible errors. */ }
  const edit = (patch: Parameters<typeof editSampleReview>[1]) => onChange(editSampleReview(review, patch));
  const editQuote = (patch: Partial<SampleQuote>) => edit({ quote: { ...review.quote, ...patch } });
  return <div className="space-y-5" aria-label="Sample plan review">
    <Button variant="ghost" className={`${ghost} flex items-center gap-3`} onClick={onBack} disabled={busy}><ArrowLeft className="h-5 w-5 shrink-0" />Edit brief</Button>
    <GlassPanel className="space-y-3 p-4 sm:p-5">
      <h2 className="!text-lg !font-semibold !normal-case !tracking-normal">Sample plan review</h2>
      <p className="text-sm font-semibold text-[#FFCC00]">Fixture demo · actual spend PHP 0.00</p>
      <p className="text-sm leading-relaxed text-zinc-300">This editable example tests the review flow. No AI, market research or reference analysis ran. Supplied videos and photos have not been interpreted. No generation can start here.</p>
      <p className="text-sm text-zinc-300">Target language: {review.outputLanguage}. {review.speechMode === 'spoken' ? 'Sample speech is English and has not been localized.' : 'No voiceover in this plan.'}</p>
      <p className="text-xs text-zinc-400">Revision {review.revision} · {review.adaptationMode === 'close' ? 'Match closely requested' : 'Adapt for brand requested'}. Reference resemblance is not evaluated in this demo.</p>
      {review.stale && <div role="alert" className="flex items-start gap-2 text-sm text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" /><p>The brief changed. This is the previous sample plan. Prepare an updated sample plan to replace it before confirming.</p></div>}
      {(review.stale || (cloudMode && !cloudLinked)) && <GoldButton className={`${control} w-full`} disabled={busy || !saved} onClick={onPrepare}>{busy ? 'Preparing sample…' : 'Prepare updated sample plan'}</GoldButton>}
      {review.missing.length > 0 && <div className="flex items-start gap-2 text-xs leading-relaxed text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" /><p>Still needed for real planning: {review.missing.join(', ')}. You can confirm this incomplete example only as a demo.</p></div>}
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">User-supplied brief snapshot</summary><dl className="space-y-3 text-sm">{review.facts.map(fact => <div key={fact.label}><dt className="text-zinc-400">{fact.label}</dt><dd className="whitespace-pre-wrap break-words text-zinc-200">{fact.value || 'Not supplied'}</dd></div>)}</dl><p className="mt-3 text-xs text-zinc-400">These are supplied notes, not verified research or approved ad claims.</p></details>
    </GlassPanel>
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      <Textarea id="sample-direction" label="Direction" maxLength={4000} value={review.direction} disabled={busy} onChange={event => edit({ direction: event.target.value })} />
      <h3 className="!text-base !font-semibold !normal-case !tracking-normal">Script and visual plan</h3>
      <p className="text-xs text-zinc-400">Illustrative consecutive scene timing, up to 60 seconds. Real speech duration and reference cuts still need validation.</p>
      {review.scenes.map((scene, index) => {
        const update = (patch: Partial<typeof scene>) => edit({ scenes: review.scenes.map(item => item.id === scene.id ? { ...item, ...patch } : item) });
        return <div key={scene.id} className="space-y-3 rounded-xl border border-white/10 p-3">
          <h4 className="text-sm font-semibold">Scene {index + 1}</h4>
          <div className="grid grid-cols-2 gap-3"><Input id={`scene-${index}-start`} label={`Scene ${index + 1} start (seconds)`} inputMode="decimal" maxLength={10} value={scene.start} disabled={busy} onChange={event => update({ start: event.target.value })} /><Input id={`scene-${index}-end`} label={`Scene ${index + 1} end (seconds)`} inputMode="decimal" maxLength={10} value={scene.end} disabled={busy} onChange={event => update({ end: event.target.value })} /></div>
          {review.speechMode === 'spoken' ? <Textarea id={`scene-${index}-script`} label={`Scene ${index + 1} sample speech`} maxLength={2000} value={scene.script} disabled={busy} onChange={event => update({ script: event.target.value })} /> : <p className="text-xs text-zinc-400">No spoken line. Describe on-screen text in the visual plan if needed.</p>}
          <Textarea id={`scene-${index}-visual`} label={`Scene ${index + 1} visual plan`} maxLength={2000} value={scene.visual} disabled={busy} onChange={event => update({ visual: event.target.value })} />
        </div>;
      })}
    </GlassPanel>
    <GlassPanel className="space-y-3 p-4 sm:p-5" aria-label="Sample audio plan">
      <h3 className="!text-base !font-semibold !normal-case !tracking-normal">Voice and audio plan</h3>
      <p className="text-sm text-zinc-300">Saved voice: {review.voice?.name || 'Not selected'}{review.speechMode === 'silent' ? ' · unused in this no-voiceover plan' : ''}</p>
      <p className="text-xs leading-relaxed text-zinc-400">Voice availability and compatibility have not been checked for this sample.</p>
      <dl className="space-y-3 text-sm">{(['speech', 'music', 'sfx'] as const).map(key => <div key={key}><dt className="font-semibold">{({ speech: 'Speech', music: 'Background music', sfx: 'Sound effects' })[key]}</dt><dd className="mt-1 leading-relaxed text-zinc-400">{review.audio[key]}</dd></div>)}</dl>
    </GlassPanel>
    <GlassPanel className="space-y-4 p-4 sm:p-5" aria-label="Illustrative cost estimate">
      <h3 className="!text-base !font-semibold !normal-case !tracking-normal">Illustrative cost estimate</h3>
      <p className="text-sm leading-relaxed text-zinc-300">Demo PHP amounts only. These are invented test values, not provider rates or a purchasable quote. Changing duration or content does not automatically reprice this sample.</p>
      <dl className="space-y-3 text-sm">{review.quote.items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto] gap-3"><dt className="min-w-0 text-zinc-300">{item.label}</dt><dd className="text-right text-zinc-400">PHP {item.lowPesos}–{item.highPesos}</dd></div>)}<div className="grid grid-cols-[1fr_auto] gap-3 border-t border-white/10 pt-3"><dt className="text-zinc-300">Contingency</dt><dd className="text-right text-zinc-400">PHP {review.quote.contingencyPesos}</dd></div></dl>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">Edit demo estimate</summary><div className="space-y-4">
      {review.quote.items.map(item => <div key={item.id} className="space-y-2 border-b border-white/10 pb-4"><p className="text-sm font-semibold">{item.label}</p><div className="grid grid-cols-2 gap-3"><Input id={`quote-${item.id}-low`} label={`${item.label} minimum (PHP)`} inputMode="decimal" maxLength={20} value={item.lowPesos} disabled={busy} onChange={event => editQuote({ items: review.quote.items.map(row => row.id === item.id ? { ...row, lowPesos: event.target.value } : row) })} /><Input id={`quote-${item.id}-high`} label={`${item.label} maximum (PHP)`} inputMode="decimal" maxLength={20} value={item.highPesos} disabled={busy} onChange={event => editQuote({ items: review.quote.items.map(row => row.id === item.id ? { ...row, highPesos: event.target.value } : row) })} /></div></div>)}
      <Input id="quote-contingency" label="Illustrative contingency (PHP)" inputMode="decimal" maxLength={20} value={review.quote.contingencyPesos} disabled={busy} onChange={event => editQuote({ contingencyPesos: event.target.value })} />
      </div></details>
      <Input id="quote-cap" label="Maximum demo cap (PHP)" inputMode="decimal" maxLength={20} value={review.quote.maxDemoCapPesos} disabled={busy} onChange={event => editQuote({ maxDemoCapPesos: event.target.value })} />
      {totals && <p data-testid="sample-cost-total" className="text-sm font-semibold">Illustrative total including contingency: {money(totals.lowCents)}–{money(totals.highCents)}. Demo cap: {money(totals.capCents)}.</p>}
      <p className="text-sm font-semibold text-[#FFCC00]">Actual spend: PHP 0.00. No payment or budget is authorized.</p>
    </GlassPanel>
    <GlassPanel className="space-y-3 p-4 sm:p-5">
      {errors.length > 0 && <div role="alert" className="flex items-start gap-2 text-sm text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" /><ul className="space-y-2">{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
      {review.confirmation && <p role="status" className="flex items-start gap-2 text-sm text-zinc-200"><Check className="h-4 w-4 shrink-0 text-[#FFCC00]" />{saved ? `Sample plan confirmed for revision ${review.revision}. Nothing will be generated or charged.` : 'Demo confirmation is not saved yet. Keep this tab open and check the save status.'}</p>}
      {!review.confirmation && <GoldButton className={`${control} w-full`} disabled={busy || !saved || errors.length > 0 || (cloudMode && !cloudLinked)} onClick={onConfirm}>{busy ? 'Checking sample inputs…' : 'Confirm sample plan'}</GoldButton>}
      {review.confirmation && <GoldButton className={`${control} w-full`} disabled={busy || !saved} onClick={onQueue}>{queueLabel}</GoldButton>}
      {!review.confirmation && hasQueue && <Button variant="ghost" className={`${ghost} w-full`} onClick={onQueue}>{queueLabel}</Button>}
      <p className="text-xs leading-relaxed text-zinc-400">{cloudMode ? cloudLinked ? 'These inputs are saved privately in cloud storage. Review edits and demo confirmation stay on this device until Start cloud fixture job is accepted; that job freezes this approved plan and exact input snapshot. Any change requires review again.' : 'These current inputs are not confirmed in cloud storage. Prepare an updated sample plan to save or verify them before confirming the current cloud fixture plan. Review edits stay on this device; this review cannot start a cloud job until its inputs match a saved snapshot.' : 'Demo confirmation records these inputs, this plan revision and the illustrative estimate on this device. Any change requires review again.'}</p>
    </GlassPanel>
  </div>;
}
