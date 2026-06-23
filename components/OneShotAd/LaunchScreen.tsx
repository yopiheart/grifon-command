import React, { useEffect, useRef, useState } from 'react';
import {
  ImageUp, ChevronRight, Sparkles, Zap, Lock, Wand2, Upload, User, Mic,
  Film, Gauge, Check, Loader2, Package, Wrench, Smartphone, Building2, RefreshCw, Maximize2, Settings2,
} from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import ImageModal from '../ui/ImageModal';
import Input from '../ui/Input';
import { DriftOrbs, ShimmerButton } from './motion';
import { RECOMMENDED_VOICES } from '../SignalModulator/pinoyReady';
import { generateAvatarImage } from '../../services/geminiService';
import { fetchVoices } from '../../services/voiceService';
import type { AutopilotInput } from '../../services/oneShotIntake';

/** A voice option for the picker. `name` is the chip label, `label` the dropdown row. */
type VoiceOpt = { id: string; name: string; label: string };

/** Free presenter generations per session before a generate costs a credit.
 * Each generate is a real image-gen call; a few free tries, then metered (seam). */
const FREE_AVATAR_GENS = 3;

/** Curated stock fallback — only used when the account has no cloned voices
 * (e.g. the auth-less preview). The real picker shows the user's own (Filipino) voices. */
const STOCK_FALLBACK: VoiceOpt[] = RECOMMENDED_VOICES.map((v) => ({
  id: v.id,
  name: v.name,
  label: `${v.name} — ${v.vibe} (stock)`,
}));

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });

// --- Creative taxonomy: two orthogonal axes ---------------------------------
// FORMAT = the video genre; STRATEGY = the persuasion angle. Both map onto the
// existing AutopilotInput.scriptType enum so there's NO backend change:
//   UGC + Real-talk → Testimonial · UGC + Hype → MrBeast · Product UGC → Temu.
type Format = 'ugc' | 'product_ugc' | 'commercial';
type Strategy = 'Testimonial' | 'MrBeast';

const FORMATS: { value: Format; label: string; desc: string; locked?: boolean }[] = [
  { value: 'ugc', label: 'UGC', desc: 'Selfie-style creator talking to camera' },
  { value: 'product_ugc', label: 'Product UGC', desc: 'Temu-style fast product hype' },
  { value: 'commercial', label: 'Commercial', desc: 'Cinematic spec ad (Seedance) · English only', locked: true },
];

const STRATEGIES: { value: Strategy; label: string; desc: string }[] = [
  { value: 'Testimonial', label: 'Real-talk', desc: 'Honest first-person review' },
  { value: 'MrBeast', label: 'Hype', desc: 'High-energy, big-promise hook' },
];

const VERTICALS: { value: string; label: string; Icon: typeof Package; locked?: boolean }[] = [
  { value: 'product', label: 'Product', Icon: Package },
  { value: 'service', label: 'Service', Icon: Wrench },
  { value: 'real_estate', label: 'Real Estate', Icon: Building2 },
  { value: 'app', label: 'App', Icon: Smartphone, locked: true },
];

export const LaunchScreen: React.FC<{
  onLaunch: (input: AutopilotInput) => void;
  /** Pro+ unlock for Director (step-by-step) mode. Free/Starter get the upsell. */
  directorUnlocked: boolean;
  onUpgrade: () => void;
  /** Switch to the advanced 8-step wizard — the brief carries over. */
  onSwitchToSteps: () => void;
}> = ({ onLaunch, directorUnlocked, onUpgrade, onSwitchToSteps }) => {
  const heroRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const [hero, setHero] = useState<string>('');
  const [heroWarn, setHeroWarn] = useState<string>('');
  const [offer, setOffer] = useState('');
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');

  // Customize drawer (smart defaults — every field below has a sane default so
  // a user who never opens the drawer can still launch).
  const [open, setOpen] = useState(false);
  const [vertical, setVertical] = useState('product');
  const [format, setFormat] = useState<Format>('ugc');
  const [strategy, setStrategy] = useState<Strategy>('Testimonial');

  // Presenter: generate (reuse Director AI) OR upload.
  const [avatarMode, setAvatarMode] = useState<'generate' | 'upload'>('generate');
  const [gender, setGender] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [ageRange, setAgeRange] = useState('25-34');
  const [ethnicity, setEthnicity] = useState('Filipino');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');
  const [avatarGens, setAvatarGens] = useState(0);
  const [viewImage, setViewImage] = useState<string | null>(null);

  const [voiceId, setVoiceId] = useState<string>(STOCK_FALLBACK[0]?.id ?? '');
  // Voice picker: show the curated FILIPINO library (libraryVoices — the proven
  // Pinoy/Pinay voices) first, then the user's own clones (myVoices). Stock
  // English voices are only a fallback when neither exists (e.g. the auth-less preview).
  const [voiceOpts, setVoiceOpts] = useState<VoiceOpt[]>(STOCK_FALLBACK);
  const [voicesFromMine, setVoicesFromMine] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchVoices().then((lib) => {
      if (!alive) return;
      const filipino: VoiceOpt[] = lib.libraryVoices.map((v) => ({ id: v.voice_id, name: v.name, label: v.description ? `${v.name} — ${v.description}` : v.name }));
      const mine: VoiceOpt[] = lib.myVoices.map((v) => ({ id: v.voice_id, name: v.name, label: `${v.name} (your clone)` }));
      const opts = [...filipino, ...mine];
      if (opts.length === 0) return; // keep the stock fallback
      setVoiceOpts(opts);
      setVoicesFromMine(true);
      setVoiceId(opts[0].id);
    });
    return () => {
      alive = false;
    };
  }, []);
  const [language, setLanguage] = useState<AutopilotInput['language']>('Taglish');
  const [aspectRatio, setAspectRatio] = useState<AutopilotInput['aspectRatio']>('9:16');
  const [resolution, setResolution] = useState<NonNullable<AutopilotInput['resolution']>>('720p');
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [forceFresh, setForceFresh] = useState(false);

  // Vertical takes precedence (Services/RealEstate are their own styles); within
  // Product, Format × Strategy picks the formula. All map onto the scriptType enum.
  const scriptType: NonNullable<AutopilotInput['scriptType']> =
    vertical === 'service' ? 'Services'
      : vertical === 'real_estate' ? 'RealEstate'
        : format === 'product_ugc' ? 'Temu'
          : strategy;

  const voiceName = voiceOpts.find((v) => v.id === voiceId)?.name ?? 'Voice';
  const formatLabel = FORMATS.find((f) => f.value === format)?.label ?? 'UGC';

  // Seedance (Commercial) can't speak a native Filipino accent → Commercial is
  // English-only, and the two are mutually exclusive: choosing Commercial forces
  // English; choosing Taglish drops you back to UGC.
  const chooseFormat = (f: Format) => {
    setFormat(f);
    if (f === 'commercial') setLanguage('English');
  };
  const chooseLanguage = (l: AutopilotInput['language']) => {
    setLanguage(l);
    if (l === 'Taglish' && format === 'commercial') setFormat('ugc');
  };

  const presenterReady = !!avatarUrl;
  const voiceNeeded = format !== 'commercial'; // Commercial (Seedance) handles its own audio
  const ready = !!(hero && offer.trim() && brandName.trim() && price.trim() && presenterReady && (!voiceNeeded || voiceId));

  const onHero = async (f?: File) => {
    if (!f) return;
    const url = await fileToDataUrl(f);
    setHero(url);
    // v1 size-anchor guard (copy-based; Gemini Vision upgrade is a follow-up).
    setHeroWarn('For best results this should be a product-in-hand shot — it keeps the product size consistent across scenes.');
  };

  const genAvatar = async () => {
    if (!ethnicity.trim() || !ageRange.trim()) {
      setAvatarErr('Add ethnicity + age first.');
      return;
    }
    setAvatarBusy(true);
    setAvatarErr('');
    try {
      // generateAvatarImage portrait only accepts 9:16 | 16:9.
      const ar: '9:16' | '16:9' = aspectRatio === '16:9' ? '16:9' : '9:16';
      const { url } = await generateAvatarImage(`${ethnicity} consumers`, gender, ageRange, ethnicity, ar, '1K', []);
      setAvatarUrl(url);
      // TODO(billing): once metered, a generation past FREE_AVATAR_GENS deducts 1 credit here.
      setAvatarGens((n) => n + 1);
    } catch {
      setAvatarErr('Generation failed — try again or upload a photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const launch = () => {
    if (!ready) return;
    onLaunch({
      brandName: brandName.trim(),
      offer: offer.trim(),
      price: price.trim(),
      productName: productName.trim() || brandName.trim(),
      productDescription: productDescription.trim() || offer.trim(),
      heroImageBase64: hero,
      avatar: { url: avatarUrl, description: `A ${ethnicity} presenter`, ethnicity, prompt: '' },
      voiceId,
      language,
      aspectRatio,
      resolution,
      scriptType,
      forceFreshResearch: forceFresh,
    });
  };

  const reveal = () => setOpen(true);

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,204,0,0.07),transparent_60%)]" />
      <DriftOrbs />
      <div className="relative mx-auto w-full max-w-xl">
        <p className="mb-2 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-500">// ONE SHOT · NO GRIND</p>
        <h1 className="mb-8 text-center text-4xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500">
          One-Shot Ad
        </h1>

        <GlassPanel className="p-6 sm:p-8">
          {/* Hero dropzone */}
          <button
            type="button"
            onClick={() => heroRef.current?.click()}
            className={`group relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-2xl border transition-all ${
              hero ? 'border-[#FFCC00] shadow-[0_0_30px_rgba(255,204,0,0.3)]' : 'border-dashed border-white/20 hover:border-[#FFCC00]/60'
            }`}
          >
            {hero ? (
              <img src={hero} alt="Hero product" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-3 text-zinc-500">
                <ImageUp className="h-8 w-8 group-hover:text-[#FFCC00]" />
                <span className="text-xs font-mono uppercase tracking-widest">Drop your product · one photo</span>
              </div>
            )}
          </button>
          <input ref={heroRef} type="file" accept="image/*" className="hidden" onChange={(e) => onHero(e.target.files?.[0])} />
          {heroWarn && <p className="mt-2 text-[11px] text-amber-400/80">{heroWarn}</p>}

          <div className="mt-5 space-y-4">
            <Input label="Your offer" placeholder="e.g. Buy 1 Take 1 this week" value={offer} onChange={(e) => setOffer(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Brand" placeholder="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              <Input label="Price" placeholder="₱199" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>

          {/* The old manual Step-1/Step-2 research is now automatic (orchestrator stage 1) — reassure the user.
              Research is cached per product + reused; the toggle forces a fresh run. */}
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 shrink-0 text-[#FFCC00]/70" /> AI researches your market automatically
            </span>
            <button
              type="button"
              onClick={() => setForceFresh((f) => !f)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all ${
                forceFresh ? 'border-[#FFCC00]/40 text-[#FFCC00]' : 'border-white/10 text-zinc-500 hover:text-[#FFCC00] hover:border-[#FFCC00]/40'
              }`}
            >
              <RefreshCw className="h-2.5 w-2.5 shrink-0" /> {forceFresh ? 'Fresh research' : 'Re-research'}
            </button>
          </p>

          {/* Summary chips — nothing required is hidden behind the drawer. Tap any to edit. */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip icon={User} active={presenterReady} warn={!presenterReady} onClick={reveal}>
              {presenterReady ? 'Presenter ready' : 'Add presenter'}
            </Chip>
            {voiceNeeded && <Chip icon={Mic} active onClick={reveal}>{voiceName}</Chip>}
            <Chip icon={Film} active onClick={reveal}>{formatLabel}</Chip>
            <Chip icon={Gauge} active onClick={reveal}>{resolution}</Chip>
          </div>

          {/* Customize drawer */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-4 flex w-full items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-[#FFCC00]"
          >
            <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} /> Customize
          </button>
          <div className={`grid transition-all duration-300 ${open ? 'mt-4 grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
            <div className="overflow-hidden">
              <div className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-4">

                {/* What are you advertising? (vertical scaffold — Product live) */}
                <Field label="What are you advertising?">
                  <div className="grid grid-cols-4 gap-2">
                    {VERTICALS.map(({ value, label, Icon, locked }) => (
                      <button
                        key={value}
                        type="button"
                        disabled={locked}
                        onClick={() => !locked && setVertical(value)}
                        className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[10px] font-mono uppercase tracking-wide transition-all ${
                          locked
                            ? 'cursor-not-allowed border-white/5 text-zinc-600'
                            : vertical === value
                              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                              : 'border-white/10 text-zinc-400 hover:border-white/30'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                        {locked && <SoonBadge />}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Format × Strategy */}
                <Field label="Format">
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        disabled={f.locked}
                        onClick={() => !f.locked && chooseFormat(f.value)}
                        title={f.desc}
                        className={`relative rounded-lg border px-2 py-2 text-xs font-mono uppercase tracking-wide transition-all ${
                          f.locked
                            ? 'cursor-not-allowed border-white/5 text-zinc-600'
                            : format === f.value
                              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                              : 'border-white/10 text-zinc-400 hover:border-white/30'
                        }`}
                      >
                        {f.label}
                        {f.locked && <BusinessBadge />}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-500">{FORMATS.find((f) => f.value === format)?.desc}</p>
                </Field>

                {format === 'ugc' && (
                  <Field label="Strategy">
                    <div className="flex gap-2">
                      {STRATEGIES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setStrategy(s.value)}
                          className={`flex-1 rounded-lg border px-2 py-2 text-left transition-all ${
                            strategy === s.value ? 'border-[#FFCC00] bg-[#FFCC00]/10' : 'border-white/10 hover:border-white/30'
                          }`}
                        >
                          <span className={`block text-xs font-mono uppercase tracking-wide ${strategy === s.value ? 'text-[#FFCC00]' : 'text-zinc-300'}`}>{s.label}</span>
                          <span className="mt-0.5 block text-[10px] text-zinc-500">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                {/* Presenter — generate (reuse Director AI) or upload */}
                <Field label="Presenter">
                  <div className="mb-2 flex gap-2">
                    <ModeTab active={avatarMode === 'generate'} onClick={() => setAvatarMode('generate')} icon={Wand2}>Generate</ModeTab>
                    <ModeTab active={avatarMode === 'upload'} onClick={() => setAvatarMode('upload')} icon={Upload}>Upload</ModeTab>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => avatarMode === 'upload' && avatarRef.current?.click()}
                        className="flex h-full w-full items-center justify-center hover:opacity-90"
                      >
                        {avatarBusy ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#FFCC00]" />
                        ) : avatarUrl ? (
                          <img src={avatarUrl} alt="Presenter" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-zinc-600" />
                        )}
                      </button>
                      {avatarUrl && !avatarBusy && (
                        <button
                          type="button"
                          onClick={() => setViewImage(avatarUrl)}
                          aria-label="View full presenter"
                          className="absolute bottom-0.5 right-0.5 rounded-md bg-black/70 p-1 text-zinc-200 hover:text-[#FFCC00]"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={avatarRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) { setAvatarUrl(await fileToDataUrl(f)); setAvatarErr(''); }
                      }}
                    />

                    {avatarMode === 'generate' ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-1.5">
                          {(['Any', 'Male', 'Female'] as const).map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGender(g)}
                              className={`flex-1 rounded-lg px-2 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-all ${
                                gender === g ? 'bg-[#FFCC00] text-black' : 'border border-white/10 text-zinc-400 hover:border-white/30'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={ethnicity}
                            onChange={(e) => setEthnicity(e.target.value)}
                            placeholder="Ethnicity"
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-2 text-xs text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]"
                          />
                          <input
                            value={ageRange}
                            onChange={(e) => setAgeRange(e.target.value)}
                            placeholder="Age (e.g. 25-34)"
                            className="w-full rounded-xl border border-white/10 bg-zinc-950 p-2 text-xs text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={genAvatar}
                            disabled={avatarBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wide text-[#FFCC00] transition-all hover:bg-[#FFCC00]/20 disabled:opacity-50"
                          >
                            {avatarBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            {avatarUrl ? 'Regenerate' : 'Generate presenter'}
                            {avatarGens >= FREE_AVATAR_GENS ? ' · 1 credit' : ''}
                          </button>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                            {avatarGens < FREE_AVATAR_GENS ? `${FREE_AVATAR_GENS - avatarGens} free left` : 'extra gens use 1 credit'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="text-[11px] text-zinc-400">Tap the box to upload a presenter photo (face clearly visible).</p>
                      </div>
                    )}
                  </div>
                  {avatarErr && <p className="mt-1.5 text-[11px] text-amber-400/80">{avatarErr}</p>}
                </Field>

                {/* Voice — Filipino library first, then your clones; hidden for Commercial (Seedance handles its own audio) */}
                {voiceNeeded && (
                  <Field label="Voice">
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 p-2 text-xs text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]"
                    >
                      {voiceOpts.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    {!voicesFromMine && (
                      <p className="mt-1.5 text-[11px] text-amber-400/80">
                        No Filipino voices found — using a stock voice for now. (In the live app your Filipino library loads here.)
                      </p>
                    )}
                  </Field>
                )}

                {/* Settings */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Language">
                    <Select value={language} onChange={(v) => chooseLanguage(v as AutopilotInput['language'])} opts={format === 'commercial' ? ['English'] : ['Taglish', 'English']} />
                  </Field>
                  <Field label="Aspect">
                    <Select value={aspectRatio} onChange={(v) => setAspectRatio(v as AutopilotInput['aspectRatio'])} opts={['9:16', '1:1', '16:9']} />
                  </Field>
                </div>

                <Field label="Quality">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolution('720p')}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-mono uppercase tracking-wide transition-all ${
                        resolution === '720p' ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:border-white/30'
                      }`}
                    >
                      720p
                    </button>
                    <button
                      type="button"
                      disabled
                      title="1080p unlocks on the Business plan"
                      className="relative flex-1 cursor-not-allowed rounded-lg border border-white/5 px-2 py-2 text-xs font-mono uppercase tracking-wide text-zinc-600"
                    >
                      1080p
                      <BusinessBadge />
                    </button>
                  </div>
                </Field>

                {/* Optional overrides */}
                <details className="group">
                  <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-widest text-zinc-500 hover:text-zinc-300">// Advanced (optional)</summary>
                  <div className="mt-3 space-y-3">
                    <Input label="Product name" placeholder="(defaults to brand)" value={productName} onChange={(e) => setProductName(e.target.value)} />
                    <Input label="Product details" placeholder="(defaults to your offer)" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
                  </div>
                </details>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <ShimmerButton disabled={!ready} onClick={launch}>
              <span className="inline-flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" /> Make My Ad
              </span>
            </ShimmerButton>
            {!ready && (
              <p className="mt-2 text-center text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                {!hero ? 'Add a product photo'
                  : !offer.trim() ? 'Add your offer'
                  : !brandName.trim() ? 'Add your brand'
                  : !price.trim() ? 'Add your price'
                  : !presenterReady ? 'Add a presenter (Customize ▸ Presenter)'
                  : 'Almost there…'}
              </p>
            )}

            {/* Director (step-by-step) mode — the brief above carries over. Pro+ unlock;
                Free/Starter get the upsell. */}
            {directorUnlocked ? (
              <button
                type="button"
                onClick={onSwitchToSteps}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
              >
                <Settings2 className="h-3.5 w-3.5" /> Control every scene — Director mode
              </button>
            ) : (
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-950 px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white"
              >
                <Lock className="h-3 w-3" /> Control every scene — <span className="text-[#FFCC00]">Pro</span>
              </button>
            )}
          </div>
        </GlassPanel>
      </div>
      {viewImage && <ImageModal imageUrl={viewImage} onClose={() => setViewImage(null)} />}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-[10px] font-mono uppercase tracking-widest text-zinc-400">// {label}</label>
    {children}
  </div>
);

const Select: React.FC<{ value: string; onChange: (v: string) => void; opts: string[] }> = ({ value, onChange, opts }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl border border-white/10 bg-zinc-950 p-2 text-xs text-white focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]"
  >
    {opts.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

const Chip: React.FC<{ icon: typeof User; active?: boolean; warn?: boolean; onClick: () => void; children: React.ReactNode }> = ({ icon: Icon, active, warn, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wide transition-all ${
      warn
        ? 'border-amber-400/50 text-amber-400 hover:border-amber-400'
        : active
          ? 'border-[#FFCC00]/40 text-[#FFCC00]'
          : 'border-white/10 text-zinc-400 hover:border-white/30'
    }`}
  >
    <Icon className="h-3 w-3" />
    {children}
    {active && !warn && <Check className="h-3 w-3 opacity-60" />}
  </button>
);

const ModeTab: React.FC<{ active: boolean; onClick: () => void; icon: typeof Wand2; children: React.ReactNode }> = ({ active, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[10px] font-mono uppercase tracking-wide transition-all ${
      active ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:border-white/30'
    }`}
  >
    <Icon className="h-3 w-3" />
    {children}
  </button>
);

const BusinessBadge: React.FC = () => (
  <span className="absolute -right-1 -top-1.5 inline-flex items-center gap-0.5 rounded-full border border-[#FFCC00]/40 bg-zinc-950 px-1 py-px text-[9px] font-mono uppercase tracking-wide text-[#FFCC00]">
    <Lock className="h-2 w-2" /> Biz
  </span>
);

const SoonBadge: React.FC = () => (
  <span className="absolute -right-1 -top-1.5 rounded-full border border-white/15 bg-zinc-950 px-1 py-px text-[9px] font-mono uppercase tracking-wide text-zinc-500">
    Soon
  </span>
);
