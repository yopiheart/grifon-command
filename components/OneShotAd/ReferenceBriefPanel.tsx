import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, Upload, X } from 'lucide-react';
import type { AdReferenceBrief } from '../../types';
import { conceptIsUsable, displayedDateElapsedDays, MAX_REFERENCE_PACKET_BYTES, parseReferencePacket, referenceLimits, resolveSelectedReference, validateReferenceBrief } from '../../services/adReconBrief';
import { GlassPanel } from '../ui/GlassPanel';
import { CTRL_H, R_CTRL, T_CTRL } from '../ui/wizardTokens';

export const ReferenceBriefPanel: React.FC<{
  value?: AdReferenceBrief;
  onChange: (value?: AdReferenceBrief) => void;
  subject: { brandName: string; productName: string; offer: string };
  preparationOnly?: boolean;
}> = ({ value, onChange, subject, preparationOnly = false }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const importSequence = useRef(0);
  const [importError, setImportError] = useState('');
  let brief: AdReferenceBrief | undefined;
  let error = importError;
  try {
    if (value) brief = validateReferenceBrief(value);
    resolveSelectedReference(brief, subject);
  } catch (e) { error = e instanceof Error ? e.message : 'Invalid reference packet.'; }
  const packet = brief?.packet;

  const importFile = async (file?: File) => {
    const sequence = ++importSequence.current;
    if (!file) return;
    try {
      if (file.size > MAX_REFERENCE_PACKET_BYTES) throw new Error('Ad references: Packet exceeds 64 KiB.');
      const packet = parseReferencePacket(await file.text());
      if (sequence !== importSequence.current) return;
      setImportError('');
      onChange({ packet, acceptedLimits: false });
    } catch (e) {
      if (sequence === importSequence.current) setImportError(e instanceof Error ? e.message : 'Invalid reference packet.');
    }
  };

  return (
    <section aria-label="Ad references" className="mt-5">
      <GlassPanel className="min-w-0 space-y-3 break-words p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-white">Ad references <span className="text-xs font-normal text-zinc-400">(optional)</span></p>
            <p className="mt-1 text-xs text-zinc-400">Review a local research packet before choosing a concept.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-label="Import reference packet" onClick={() => fileInput.current?.click()} className={`${CTRL_H} ${R_CTRL} ${T_CTRL} flex items-center gap-3 whitespace-nowrap border border-white/10 bg-zinc-950 px-3 text-zinc-300 hover:border-[#FFCC00] hover:text-white`}>
              <Upload className="h-5 w-5 shrink-0" /> Import packet
            </button>
            {value && <button type="button" aria-label="Remove references" onClick={() => { ++importSequence.current; setImportError(''); onChange(undefined); }} className={`${CTRL_H} ${R_CTRL} ${T_CTRL} flex items-center gap-3 whitespace-nowrap border border-white/10 bg-zinc-950 px-3 text-zinc-400 hover:border-[#FFCC00] hover:text-white`}><X className="h-5 w-5 shrink-0" /> Remove</button>}
          </div>
        </div>
        <input ref={fileInput} type="file" accept="application/json,.json" className="hidden" aria-label="Reference packet file" onChange={e => { void importFile(e.target.files?.[0]); e.target.value = ''; }} />
        {error && <p role="alert" className="flex items-start gap-2 text-xs text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</p>}
        {packet && <>
          <p className="text-xs text-zinc-300">{packet.subject.brandName} · {packet.subject.productName} · {packet.subject.offer}</p>
          <p className="text-xs text-zinc-400">Audience: {packet.subject.audience}</p>
          {packet.evidenceMode === 'synthetic' && <p className="flex items-start gap-2 text-xs text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" />Synthetic fixture — review only, not production-ready.</p>}
          <details className="text-xs text-zinc-400" open>
            <summary className="min-h-11 cursor-pointer py-3 text-zinc-300">Collection limits · observed {packet.observedAt.slice(0, 10)}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4">{referenceLimits(packet).map((line, i) => <li key={i}>{line}</li>)}</ul>
          </details>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 py-2 text-xs text-zinc-300">
            <input type="checkbox" checked={brief!.acceptedLimits} onChange={e => { ++importSequence.current; onChange({ ...brief!, acceptedLimits: e.target.checked, selectedConceptId: undefined }); }} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FFCC00]" />
            I reviewed these observations and collection limits
          </label>
          <div className="space-y-3">
            {packet.concepts.map(concept => {
              const selected = brief!.selectedConceptId === concept.id;
              const usable = conceptIsUsable(packet, concept);
              return <article key={concept.id} className={`min-w-0 space-y-2 break-words rounded-2xl border p-3 ${selected ? 'border-[#FFCC00]/60' : 'border-white/10'}`}>
                <p className="text-sm font-semibold text-white">{concept.title} <span className="text-xs font-normal text-zinc-400">· {concept.format}</span></p>
                <p className="text-xs text-zinc-300"><span className="font-semibold">Customer problem:</span> {concept.customerProblem}</p>
                <p className="text-xs text-zinc-300"><span className="font-semibold">Selling angle:</span> {concept.sellingAngle}</p>
                <p className="text-xs text-zinc-300"><span className="font-semibold">Hook idea:</span> {concept.hook}</p>
                <p className="text-xs text-zinc-300"><span className="font-semibold">Our proof plan:</span> {concept.originalProof}</p>
                <p className="text-xs text-zinc-400">Required assets: {concept.requiredAssets.join('; ')}</p>
                <p className="text-xs text-zinc-300"><span className="font-semibold">Test hypothesis:</span> {concept.testHypothesis}</p>
                <details className="text-xs text-zinc-400">
                  <summary className="min-h-11 cursor-pointer py-3 text-zinc-300">Source-linked observations</summary>
                  {packet.sources.filter(s => concept.sourceIds.includes(s.id)).map(source => {
                    const age = displayedDateElapsedDays(source);
                    return <div key={source.id} className="space-y-1 pb-2">
                      <a href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[#FFCC00] underline">{packet.competitors.find(c => c.id === source.competitorId)?.name} · Library {source.libraryId}</a>
                      <p>{source.scope} observation · activity {source.activity} · observed {source.observedAt.slice(0, 10)} · displayed start {source.startDate ?? 'unknown'}{age === null ? '' : ` (${age} elapsed days at observation)`}</p>
                      <ul className="list-disc pl-4">{source.observations.filter(o => concept.observationIds.includes(o.id)).map(o => <li key={o.id}>{o.text}</li>)}</ul>
                    </div>;
                  })}
                </details>
                {!usable && <p className="flex items-start gap-2 text-xs text-amber-500"><AlertTriangle className="h-4 w-4 shrink-0" />Blocked: this concept needs usable collection evidence.</p>}
                <button type="button" aria-label={`${selected ? 'Selected' : 'Select'} ${concept.title}`} disabled={!usable || !brief!.acceptedLimits} onClick={() => { ++importSequence.current; onChange({ ...brief!, selectedConceptId: concept.id }); }} className={`${CTRL_H} ${R_CTRL} ${T_CTRL} flex w-full items-center justify-center gap-3 whitespace-nowrap border px-3 transition-colors ${selected ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 bg-zinc-950 text-zinc-300 hover:border-[#FFCC00]'} disabled:cursor-not-allowed disabled:opacity-50`}>
                  {selected && <Check className="h-5 w-5 shrink-0" />}{selected ? 'Selected' : 'Use concept'}
                </button>
              </article>;
            })}
          </div>
          <p className="text-xs text-zinc-400">{preparationOnly ? 'Selecting a concept records a direction for review. Software video generation is not available in this preparation screen.' : 'Selecting a concept prepares the brief. Make My Ad starts production separately.'}</p>
        </>}
      </GlassPanel>
    </section>
  );
};
