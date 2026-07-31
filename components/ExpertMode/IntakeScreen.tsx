import React, { useEffect, useRef, useState } from 'react';
import { ImageUp, X, Check, Loader2, PenLine, AlertTriangle } from 'lucide-react';
import { StepShell } from '../ui/StepShell';
import { StepFooter } from '../ui/StepFooter';
import { TitledCard } from '../ui/TitledCard';
import { TextField } from '../ui/TextField';
import { SegButton } from '../ui/SegButton';
import {
  ARCHETYPE_UPLOAD_SLOTS, RE_UPLOAD_SLOTS, ARCHETYPE_ORDER, RE_ARCHETYPE_ORDER,
  inferServiceArchetype, inferRealEstateArchetype, PRODUCT_EXAMPLE, PRESENTER_EXAMPLE,
  type ServiceSlot, type ServiceArchetype, type RealEstateArchetype, type UploadSlot,
} from '../guidedPhotoSlots';
import { compressImageForUpload } from '../../utils/imageCompression';
import { analyzeImageQuality } from '../../utils/imageQuality';
import { describeBusinessAsset } from '../../services/geminiService';
import { fetchVoices } from '../../services/voiceService';
import type { ExpertIntake } from './types';
import { intakeReady } from './types';

// ===========================================================================
// Expert Mode — slim intake (slice 3). Collects the SAME assets/character One-Shot
// does (minus the 5 persuasion fields + Market Research): presenter, product/asset,
// settings. Reuses the shared guided-slot system + asset helpers — does not rebuild
// LaunchScreen. PRESENTATIONAL: owns its draft state; writes nothing global until the
// flow generates (slice 5).
// ===========================================================================

interface VoiceOpt { id: string; label: string }

const UploadTile: React.FC<{
  url?: string;
  example?: string;
  label: string;
  hint?: string;
  busy?: boolean;
  warnings?: string[];
  onPick: (file: File) => void;
  onClear?: () => void;
}> = ({ url, example, label, hint, busy, warnings, onPick, onClear }) => {
  const ref = useRef<HTMLInputElement | null>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-zinc-950 transition-colors hover:border-[#FFCC00]/50"
      >
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : example ? (
          <img src={example} alt="" className="h-full w-full object-cover opacity-25" />
        ) : null}
        {!url && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-on-surface-sublabel">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageUp className="h-5 w-5" />}
          </span>
        )}
        {url && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-[#FFCC00] p-0.5 text-black">
            <Check className="h-3 w-3" />
          </span>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }}
        />
      </button>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-mono uppercase tracking-widest text-zinc-400">{label}</p>
          {hint && <p className="truncate text-[10px] text-on-surface-sublabel">{hint}</p>}
        </div>
        {url && onClear && (
          <button type="button" onClick={onClear} className="shrink-0 text-on-surface-sublabel hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {url && warnings && warnings.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {warnings.map((w, i) => (
            <p key={i} className="flex items-start gap-1 text-[10px] leading-tight text-amber-500/80">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export const IntakeScreen: React.FC<{
  intake: ExpertIntake;
  setIntake: React.Dispatch<React.SetStateAction<ExpertIntake>>;
  onBack: () => void;
  onNext: () => void;
}> = ({ intake, setIntake, onBack, onNext }) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [voices, setVoices] = useState<VoiceOpt[]>([]);
  // Per-tile upload-quality nudges, keyed by 'hero' | 'avatar' | <ServiceSlot>. Soft, never blocks.
  const [quality, setQuality] = useState<Record<string, string[]>>({});

  // Best-effort quality check on a freshly compressed upload; stores nudges under `key`.
  const checkQuality = (key: string, dataUrl: string) => {
    void analyzeImageQuality(dataUrl)
      .then((q) => setQuality((s) => ({ ...s, [key]: q.warnings })))
      .catch(() => { /* measurement failures never block an upload */ });
  };
  const clearQuality = (key: string) =>
    setQuality((s) => { const { [key]: _drop, ...rest } = s; return rest; });

  const isProduct = intake.businessType === 'product';
  const isRealEstate = intake.businessType === 'realestate';
  const isGuided = !isProduct;

  // Voice library (Filipino + clones); non-blocking.
  useEffect(() => {
    let alive = true;
    void fetchVoices().then((lib) => {
      if (!alive) return;
      const opts: VoiceOpt[] = [
        ...lib.libraryVoices.map((v) => ({ id: v.voice_id, label: v.description ? `${v.name} — ${v.description}` : v.name })),
        ...lib.myVoices.map((v) => ({ id: v.voice_id, label: `${v.name} (your clone)` })),
      ];
      setVoices(opts);
      if (opts.length && !intake.voiceId) setIntake((s) => ({ ...s, voiceId: opts[0].id }));
    }).catch(() => { /* stock voice resolves server-side */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smart-default the guided archetype from the product name when entering a guided vertical.
  useEffect(() => {
    if (intake.businessType === 'service') {
      setIntake((s) => ({ ...s, serviceArchetype: inferServiceArchetype(s.productName) }));
    } else if (isRealEstate) {
      setIntake((s) => ({ ...s, realEstateArchetype: inferRealEstateArchetype(s.productName) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake.businessType]);

  const guidedSlots: UploadSlot[] = isRealEstate
    ? RE_UPLOAD_SLOTS[intake.realEstateArchetype]
    : ARCHETYPE_UPLOAD_SLOTS[intake.serviceArchetype];

  const compress = async (file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> => {
    const c = await compressImageForUpload(file);
    return { dataUrl: c.dataUrl, base64: c.base64, mimeType: c.mimeType };
  };

  const onHero = async (file: File) => {
    setBusy('hero');
    try {
      const c = await compress(file);
      let description: string | undefined;
      try { description = await describeBusinessAsset(c.base64, c.mimeType); } catch { /* best-effort */ }
      setIntake((s) => ({ ...s, productHeroUrl: c.dataUrl, productHeroDescription: description }));
      checkQuality('hero', c.dataUrl);
    } catch { /* ignore */ } finally { setBusy(null); }
  };

  const onAvatar = async (file: File) => {
    setBusy('avatar');
    try {
      const c = await compress(file);
      setIntake((s) => ({ ...s, avatarUrl: c.dataUrl }));
      checkQuality('avatar', c.dataUrl);
    } catch { /* ignore */ } finally { setBusy(null); }
  };

  const onSlot = async (file: File, slot: ServiceSlot) => {
    setBusy(slot);
    try {
      const c = await compress(file);
      let description: string | undefined;
      try { description = await describeBusinessAsset(c.base64, c.mimeType); } catch { /* best-effort */ }
      const order = guidedSlots.map((g) => g.slot);
      setIntake((s) => ({
        ...s,
        servicePhotos: [...s.servicePhotos.filter((p) => p.slot !== slot), { url: c.dataUrl, slot, description }]
          .sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot)),
      }));
      checkQuality(slot, c.dataUrl);
    } catch { /* ignore */ } finally { setBusy(null); }
  };

  const clearSlot = (slot: ServiceSlot) => {
    setIntake((s) => ({ ...s, servicePhotos: s.servicePhotos.filter((p) => p.slot !== slot) }));
    clearQuality(slot);
  };

  const archetypeOptions = isRealEstate
    ? RE_ARCHETYPE_ORDER.map((a) => ({ value: a, label: a }))
    : ARCHETYPE_ORDER.map((a) => ({ value: a, label: a }));

  const ready = intakeReady(intake);

  return (
    <StepShell
      sublabel="DIRECTOR'S CUT · INTAKE"
      title={<>Bring Your Assets</>}
      panelClassName="max-w-4xl mx-auto"
    >
      <div className="flex flex-col gap-5">
        <TitledCard title="BUSINESS TYPE">
          <SegButton<ExpertIntake['businessType']>
            value={intake.businessType}
            onChange={(v) => setIntake((s) => ({ ...s, businessType: v }))}
            options={[
              { value: 'product', label: 'Product' },
              { value: 'service', label: 'Service' },
              { value: 'realestate', label: 'Real Estate' },
            ]}
          />
        </TitledCard>

        <TitledCard title="IDENTITY" bodyClassName="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Brand name"
            placeholder="e.g. Bukidnon Brew"
            value={intake.brandName}
            onChange={(e) => setIntake((s) => ({ ...s, brandName: e.target.value }))}
          />
          <TextField
            label={isProduct ? 'Product name' : isRealEstate ? 'Listing / project' : 'Service'}
            placeholder={isProduct ? 'e.g. Barako Cold Brew' : isRealEstate ? 'e.g. 2BR condo, BGC' : 'e.g. Premium hair spa'}
            value={intake.productName}
            onChange={(e) => setIntake((s) => ({ ...s, productName: e.target.value }))}
          />
        </TitledCard>

        <TitledCard
          title="ASSETS"
          right={isGuided ? (
            <SegButton
              value={isRealEstate ? intake.realEstateArchetype : intake.serviceArchetype}
              onChange={(v) => setIntake((s) => isRealEstate
                ? { ...s, realEstateArchetype: v as RealEstateArchetype }
                : { ...s, serviceArchetype: v as ServiceArchetype })}
              options={archetypeOptions}
              className="w-auto"
            />
          ) : undefined}
        >
          {isProduct ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <UploadTile
                url={intake.productHeroUrl}
                example={PRODUCT_EXAMPLE}
                label="Product in hand"
                hint="brand visible"
                busy={busy === 'hero'}
                warnings={quality.hero}
                onPick={onHero}
                onClear={() => { setIntake((s) => ({ ...s, productHeroUrl: undefined, productHeroDescription: undefined })); clearQuality('hero'); }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {guidedSlots.map((g) => {
                const photo = intake.servicePhotos.find((p) => p.slot === g.slot);
                return (
                  <UploadTile
                    key={g.slot}
                    url={photo?.url}
                    example={g.example}
                    label={g.label}
                    hint={g.hint}
                    busy={busy === g.slot}
                    warnings={quality[g.slot]}
                    onPick={(f) => onSlot(f, g.slot)}
                    onClear={() => clearSlot(g.slot)}
                  />
                );
              })}
            </div>
          )}
        </TitledCard>

        <TitledCard
          title="PRESENTER"
          right={
            <SegButton<ExpertIntake['presenterMode']>
              value={intake.presenterMode}
              onChange={(v) => setIntake((s) => ({ ...s, presenterMode: v }))}
              options={[{ value: 'auto', label: 'Auto-cast' }, { value: 'upload', label: 'Upload' }]}
              className="w-auto"
            />
          }
        >
          {intake.presenterMode === 'auto' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <SegButton<ExpertIntake['castGender']>
                value={intake.castGender}
                onChange={(v) => setIntake((s) => ({ ...s, castGender: v }))}
                options={[{ value: 'Any', label: 'Any' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
              />
              <TextField
                placeholder="Age range (optional)"
                value={intake.castAge ?? ''}
                onChange={(e) => setIntake((s) => ({ ...s, castAge: e.target.value }))}
              />
              <TextField
                placeholder="Ethnicity (optional)"
                value={intake.castEthnicity ?? ''}
                onChange={(e) => setIntake((s) => ({ ...s, castEthnicity: e.target.value }))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <UploadTile
                url={intake.avatarUrl}
                example={PRESENTER_EXAMPLE}
                label="Your presenter"
                hint="head-to-chest · face fills frame"
                busy={busy === 'avatar'}
                warnings={quality.avatar}
                onPick={onAvatar}
                onClear={() => { setIntake((s) => ({ ...s, avatarUrl: undefined })); clearQuality('avatar'); }}
              />
              <p className="col-span-full text-[11px] leading-relaxed text-zinc-400 sm:col-span-3">
                Frame the presenter <span className="text-zinc-300">head-to-chest</span> in bright light so
                the face fills the frame — a plain iPhone shot is fine. Avoid full-body shots: the face gets
                too small for the AI to match across scenes.{' '}
                <span className="text-amber-500">A single photo often looks less real in motion</span> —
                Auto-cast is recommended unless you can provide raw photos of your presenter from several
                angles.
              </p>
            </div>
          )}
        </TitledCard>

        <TitledCard title="SETTINGS" bodyClassName="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">Aspect</p>
            <SegButton<ExpertIntake['aspectRatio']>
              value={intake.aspectRatio}
              onChange={(v) => setIntake((s) => ({ ...s, aspectRatio: v }))}
              options={[{ value: '9:16', label: '9:16' }, { value: '16:9', label: '16:9' }]}
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">Language</p>
            <SegButton<ExpertIntake['language']>
              value={intake.language}
              onChange={(v) => setIntake((s) => ({ ...s, language: v }))}
              options={[{ value: 'Taglish', label: 'Taglish' }, { value: 'English', label: 'English' }]}
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-on-surface-sublabel">Voice</p>
            <select
              value={intake.voiceId ?? ''}
              onChange={(e) => setIntake((s) => ({ ...s, voiceId: e.target.value }))}
              className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-200 focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]"
            >
              {voices.length === 0 && <option value="">Default voice</option>}
              {voices.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </div>
        </TitledCard>
      </div>

      <StepFooter
        onBack={onBack}
        backLabel="BACK"
        onNext={onNext}
        nextDisabled={!ready}
        nextLabel="WRITE MY SCRIPT"
        nextIcon={<PenLine className="h-4 w-4" />}
      />
    </StepShell>
  );
};

export default IntakeScreen;
