import React, { useEffect, useRef, useState } from 'react';
import {
  ImageUp, Sparkles, Zap, Lock, Wand2, Upload, User, Mic,
  Film, Gauge, Check, Loader2, Package, Wrench, Smartphone, Building2, RefreshCw,
  Settings2, ChevronDown, Play, Square, X, Languages,
} from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import ImageModal from '../ui/ImageModal';
import { DriftOrbs } from './motion';
import { RECOMMENDED_VOICES } from '../SignalModulator/pinoyReady';
import { generateAvatarImage } from '../../services/geminiService';
import { fetchVoices } from '../../services/voiceService';
import type { AutopilotInput } from '../../services/oneShotIntake';

// ===========================================================================
// TOKEN SYSTEM — one source of truth (see workflows/oneshot_composer_redesign.md).
// Every interactive control is h-11 (44px tap-target floor). Three radius tiers.
// Define BEFORE layout so the composer reads from these, never ad-hoc values.
// ===========================================================================
const CTRL_H = 'h-11';                                   // 44px floor — pills, tiles, selects (primary CTA may go h-12)
const R_CTRL = 'rounded-xl';                             // controls (12px)
const R_PANEL = 'rounded-2xl';                           // panels (16px)
const R_MODAL = 'rounded-3xl';                           // modals (24px)
const T_DISPLAY = 'text-4xl md:text-5xl font-black tracking-tight';
const T_CTRL = 'text-sm font-semibold';                  // control labels
const T_VALUE = 'text-xs font-mono';                     // current value
const T_LABEL = 'text-[10px] uppercase tracking-widest font-mono'; // meta labels only

/** A voice option for the picker. `name` is the chip label, `label` the dropdown row,
 * `preview` the ElevenLabs sample URL that powers the 3-sec play-preview (Grifon edge). */
type VoiceOpt = { id: string; name: string; label: string; preview?: string };

/** Free presenter generations per session before a generate costs a credit. */
const FREE_AVATAR_GENS = 3;

/** Curated stock fallback — only used when the account has no Filipino/cloned voices
 * (e.g. the auth-less preview). Stock voices have no preview clip (play-preview disabled). */
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

// --- Creative taxonomy: two orthogonal axes (unchanged — "format picker stays current") ---
// FORMAT = video genre; STRATEGY = persuasion angle. Both map onto AutopilotInput.scriptType,
// so there's NO backend change: UGC + Real-talk → Testimonial · UGC + Hype → MrBeast · Product UGC → Temu.
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

/** Close a popover/menu when clicking outside its wrapper. Only listens while
 * `enabled` (open) — otherwise a CLOSED popover's listener would fire on every
 * click and slam the OPEN sibling shut on mousedown, eating the real click. */
function useClickOutside<T extends HTMLElement>(onClose: () => void, enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, enabled]);
  return ref;
}

export const LaunchScreen: React.FC<{
  onLaunch: (input: AutopilotInput) => void;
  /** Pro+ unlock for Director (step-by-step) mode. Free/Starter get the upsell. */
  directorUnlocked: boolean;
  onUpgrade: () => void;
  /** Switch to the advanced 8-step wizard — the brief carries over. */
  onSwitchToSteps: () => void;
}> = ({ onLaunch, directorUnlocked, onUpgrade, onSwitchToSteps }) => {
  // --- Brief --------------------------------------------------------------
  const [hero, setHero] = useState<string>('');
  const [offer, setOffer] = useState('');
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [forceFresh, setForceFresh] = useState(false);

  // --- Creative axes ------------------------------------------------------
  const [vertical, setVertical] = useState('product');
  const [format, setFormat] = useState<Format>('ugc');
  const [strategy, setStrategy] = useState<Strategy>('Testimonial');

  // --- Presenter (generate via Director AI, or upload) --------------------
  const [avatarMode, setAvatarMode] = useState<'generate' | 'upload'>('generate');
  const [gender, setGender] = useState<'Any' | 'Male' | 'Female'>('Any');
  const [ageRange, setAgeRange] = useState('25-34');
  const [ethnicity, setEthnicity] = useState('Filipino');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarErr, setAvatarErr] = useState('');
  const [avatarGens, setAvatarGens] = useState(0);

  // --- Settings -----------------------------------------------------------
  const [language, setLanguage] = useState<AutopilotInput['language']>('Taglish');
  const [aspectRatio, setAspectRatio] = useState<AutopilotInput['aspectRatio']>('9:16');
  const [resolution, setResolution] = useState<NonNullable<AutopilotInput['resolution']>>('720p');

  // --- Voice picker (Filipino library first, then clones; stock fallback) --
  const [voiceId, setVoiceId] = useState<string>(STOCK_FALLBACK[0]?.id ?? '');
  const [voiceOpts, setVoiceOpts] = useState<VoiceOpt[]>(STOCK_FALLBACK);
  const [voicesFromMine, setVoicesFromMine] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchVoices().then((lib) => {
      if (!alive) return;
      const filipino: VoiceOpt[] = lib.libraryVoices.map((v) => ({ id: v.voice_id, name: v.name, label: v.description ? `${v.name} — ${v.description}` : v.name, preview: v.preview_url }));
      const mine: VoiceOpt[] = lib.myVoices.map((v) => ({ id: v.voice_id, name: v.name, label: `${v.name} (your clone)`, preview: v.preview_url }));
      const opts = [...filipino, ...mine];
      if (opts.length === 0) return; // keep stock fallback
      setVoiceOpts(opts);
      setVoicesFromMine(true);
      setVoiceId(opts[0].id);
    });
    return () => { alive = false; };
  }, []);

  // --- Voice play-preview (3-sec ElevenLabs clip) -------------------------
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const stopPreview = () => {
    if (stopTimer.current) { clearTimeout(stopTimer.current); stopTimer.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPreviewId(null);
  };
  const playPreview = (opt: VoiceOpt) => {
    if (!opt.preview) return;
    if (previewId === opt.id) { stopPreview(); return; }
    stopPreview();
    const a = new Audio(opt.preview);
    audioRef.current = a;
    setPreviewId(opt.id);
    a.onended = stopPreview;
    void a.play().then(() => {
      // 3-second cap — a quick taste, not the whole sample.
      stopTimer.current = setTimeout(stopPreview, 3000);
    }).catch(stopPreview);
  };
  useEffect(() => () => stopPreview(), []); // cleanup on unmount

  // --- UI surfaces (settings popover + format/asset modals) ---------------
  const [menu, setMenu] = useState<null | 'settings'>(null);
  const [showFormat, setShowFormat] = useState(false);
  const [assetModal, setAssetModal] = useState<null | 'product' | 'avatar'>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);

  // Vertical takes precedence (Services/RealEstate are their own styles); within
  // Product, Format × Strategy picks the formula. All map onto the scriptType enum.
  const scriptType: NonNullable<AutopilotInput['scriptType']> =
    vertical === 'service' ? 'Services'
      : vertical === 'real_estate' ? 'RealEstate'
        : format === 'product_ugc' ? 'Temu'
          : strategy;

  const formatLabel = FORMATS.find((f) => f.value === format)?.label ?? 'UGC';
  const formatLocked = vertical !== 'product'; // Service/RealEstate drive their own formula

  // Seedance (Commercial) can't speak a native Filipino accent → Commercial is
  // English-only, and the two are mutually exclusive.
  const chooseFormat = (f: Format) => {
    setFormat(f);
    if (f === 'commercial') setLanguage('English');
  };
  const chooseLanguage = (l: AutopilotInput['language']) => {
    setLanguage(l);
    if (l === 'Taglish' && format === 'commercial') setFormat('ugc');
  };

  const presenterReady = !!avatarUrl;
  // Commercial (Seedance) handles its own audio. Service/RealEstate (formatLocked)
  // run UGC-style and always need a voice.
  const voiceNeeded = formatLocked || format !== 'commercial';
  // Brand + price are load-bearing — they feed Market Research (which writes the
  // whole script). Required, not optional.
  const ready = !!(hero && offer.trim() && brandName.trim() && price.trim() && presenterReady && (!voiceNeeded || voiceId));
  const reason = !hero ? 'Add a product photo'
    : !offer.trim() ? 'Describe your offer'
      : !brandName.trim() ? 'Add your brand'
        : !price.trim() ? 'Add your price'
          : !presenterReady ? 'Add a presenter'
            : voiceNeeded && !voiceId ? 'Pick a voice'
              : '';

  const genAvatar = async () => {
    if (!ethnicity.trim() || !ageRange.trim()) {
      setAvatarErr('Add ethnicity + age first.');
      return;
    }
    setAvatarBusy(true);
    setAvatarErr('');
    try {
      const ar: '9:16' | '16:9' = aspectRatio === '16:9' ? '16:9' : '9:16';
      const { url } = await generateAvatarImage(`${ethnicity} consumers`, gender, ageRange, ethnicity, ar, '1K', []);
      setAvatarUrl(url);
      setAvatarGens((n) => n + 1);
    } catch {
      setAvatarErr('Generation failed — try again or upload a photo.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const launch = () => {
    if (!ready) return;
    const brand = brandName.trim();
    onLaunch({
      brandName: brand,
      offer: offer.trim(),
      price: price.trim(),
      productName: brand,
      productDescription: offer.trim(),
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 pb-28 text-white md:pb-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,204,0,0.07),transparent_60%)]" />
      <DriftOrbs />

      <div className="relative mx-auto w-full max-w-4xl">
        <p className={`mb-3 text-center text-zinc-500 ${T_LABEL}`}>// ONE SHOT · NO GRIND</p>
        <h1 className={`mb-8 text-center uppercase text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 ${T_DISPLAY}`}>
          Turn any product<br className="hidden sm:block" /> into a video ad
        </h1>

        <GlassPanel className={`p-5 sm:p-7 ${R_PANEL}`}>
          {/* ---- Composer: the offer is the one thing we ask for up-front ---- */}
          <label className={`mb-2 block text-zinc-400 ${T_LABEL}`}>// Your offer</label>
          <textarea
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            rows={3}
            placeholder="Describe your offer… e.g. Buy 1 Take 1 milk tea this week — ₱99 only, malabar branch"
            className={`w-full resize-none border border-white/10 bg-zinc-950 p-4 text-sm text-white placeholder-zinc-600 transition-all focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00] ${R_CTRL}`}
          />

          {/* Brand + price feed Market Research — required */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <MiniInput placeholder="Brand name" value={brandName} onChange={setBrandName} />
            <MiniInput placeholder="Price ₱199" value={price} onChange={setPrice} />
          </div>

          {/* AI-research reassurance + re-research toggle */}
          <p className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 ${T_LABEL}`}>
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]/70" /> AI researches your market automatically
            </span>
            <button
              type="button"
              onClick={() => setForceFresh((f) => !f)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition-all ${
                forceFresh ? 'border-[#FFCC00]/40 text-[#FFCC00]' : 'border-white/10 text-zinc-500 hover:border-[#FFCC00]/40 hover:text-[#FFCC00]'
              }`}
            >
              <RefreshCw className="h-2.5 w-2.5 shrink-0" /> {forceFresh ? 'Fresh research' : 'Re-research'}
            </button>
          </p>

          {/* ---- Control row: Vertical · Format ▾ · Settings ▾ --------------- */}
          <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center">
            {/* Vertical pills — scroll-x on mobile, never a forced bar at 375px */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:flex-1 md:overflow-visible md:pb-0">
              {VERTICALS.map(({ value, label, Icon, locked }) => {
                const active = vertical === value;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setVertical(value)}
                    className={`relative inline-flex shrink-0 items-center gap-2 border px-3 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${
                      locked
                        ? 'cursor-not-allowed border-white/5 text-zinc-600'
                        : active
                          ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                          : 'border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" /> {label}
                    {locked && <SoonBadge />}
                  </button>
                );
              })}
            </div>

            {/* Format — opens a sample picker box (not a dropdown) */}
            <button
              type="button"
              disabled={formatLocked}
              onClick={() => setShowFormat(true)}
              className={`inline-flex shrink-0 items-center justify-center gap-2 border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all md:w-auto ${
                formatLocked
                  ? 'cursor-not-allowed border-white/5 text-zinc-600'
                  : showFormat
                    ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                    : 'border-white/10 text-zinc-300 hover:border-white/30'
              }`}
              title={formatLocked ? 'Format is set automatically for this vertical' : 'Pick a format'}
            >
              <Film className="h-4 w-4 shrink-0" />
              {formatLocked ? 'Auto' : formatLabel}
            </button>

            {/* Settings ▾ */}
            <Popover
              open={menu === 'settings'}
              onOpen={() => setMenu('settings')}
              onClose={() => setMenu(null)}
              align="right"
              trigger={
                <span className="inline-flex items-center gap-2">
                  <Settings2 className="h-4 w-4 shrink-0" /> Settings
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                </span>
              }
            >
              <div className="w-72 space-y-4">
                <SettingRow label="Aspect" icon={Gauge}>
                  <Segmented value={aspectRatio} onChange={(v) => setAspectRatio(v as AutopilotInput['aspectRatio'])} opts={['9:16', '1:1', '16:9']} />
                </SettingRow>

                <SettingRow label="Quality" icon={Gauge}>
                  <div className="flex gap-2">
                    <SegBtn active={resolution === '720p'} onClick={() => setResolution('720p')}>720p</SegBtn>
                    <button
                      type="button"
                      disabled
                      title="1080p unlocks on the Business plan"
                      className={`relative flex-1 cursor-not-allowed border border-white/5 px-2 text-zinc-600 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase`}
                    >
                      1080p
                      <BusinessBadge />
                    </button>
                  </div>
                </SettingRow>

                <SettingRow label="Language" icon={Languages}>
                  <Segmented
                    value={language}
                    onChange={(v) => chooseLanguage(v as AutopilotInput['language'])}
                    opts={format === 'commercial' ? ['English'] : ['Taglish', 'English']}
                  />
                </SettingRow>

                {voiceNeeded && (
                  <SettingRow label="Voice" icon={Mic}>
                    <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                      {voiceOpts.map((v) => (
                        <VoiceRow
                          key={v.id}
                          opt={v}
                          selected={voiceId === v.id}
                          playing={previewId === v.id}
                          onSelect={() => setVoiceId(v.id)}
                          onPreview={() => playPreview(v)}
                        />
                      ))}
                    </div>
                    {!voicesFromMine && (
                      <p className="mt-1.5 text-[11px] text-amber-400/80">
                        No Filipino voices found — using a stock voice. Your Filipino library loads here in the live app.
                      </p>
                    )}
                  </SettingRow>
                )}
              </div>
            </Popover>
          </div>

          {/* ---- Asset tiles: PRODUCT · AVATAR (full-width rows on mobile per spec) ---- */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AssetTile
              label="Product"
              icon={ImageUp}
              thumb={hero}
              onClick={() => setAssetModal('product')}
            />
            <AssetTile
              label="Presenter"
              icon={User}
              thumb={avatarUrl}
              busy={avatarBusy}
              onClick={() => setAssetModal('avatar')}
            />
          </div>

          {/* ---- GENERATE --------------------------------------------------- */}
          <div className="mt-6 max-md:sticky max-md:bottom-3 max-md:z-30">
            <button
              type="button"
              disabled={!ready}
              onClick={launch}
              className={`relative flex w-full items-center justify-center gap-2 ${R_CTRL} h-12 font-mono text-sm font-bold uppercase tracking-widest transition-all active:scale-[0.99] ${
                ready
                  ? 'bg-[#FFCC00] text-black shadow-[0_0_24px_rgba(255,204,0,0.4)] hover:shadow-[0_0_40px_rgba(255,204,0,0.6)]'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
              }`}
            >
              <Zap className="h-4 w-4 shrink-0" /> Make My Ad
            </button>
            <p className={`mt-2 flex items-center justify-center gap-1.5 text-center ${T_LABEL} ${ready ? 'text-zinc-400' : 'text-amber-400/80'}`}>
              {ready ? (
                <><Sparkles className="h-3 w-3 shrink-0 text-[#FFCC00]/70" /> One ad → script · storyboard · scenes · thumbnail</>
              ) : reason}
            </p>

            {/* Director (step-by-step) mode — the brief above carries over. */}
            {directorUnlocked ? (
              <button
                type="button"
                onClick={onSwitchToSteps}
                className={`mt-3 flex w-full items-center justify-center gap-2 border border-white/10 bg-zinc-950 ${CTRL_H} ${R_CTRL} ${T_LABEL} font-bold text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" /> Control every scene — Director mode
              </button>
            ) : (
              <button
                type="button"
                onClick={onUpgrade}
                className={`mt-3 flex w-full items-center justify-center gap-2 border border-white/10 bg-zinc-950 ${CTRL_H} ${R_CTRL} ${T_LABEL} font-bold text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}
              >
                <Lock className="h-3 w-3 shrink-0" /> Control every scene — <span className="text-[#FFCC00]">Pro</span>
              </button>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* ---- Format picker box (Higgsfield-style; per-format sample slots) ---- */}
      {showFormat && (
        <Modal title="Pick the format that hits" wide onClose={() => setShowFormat(false)}>
          <p className="mb-4 text-sm text-zinc-400">Choose the type of video that fits your product and audience.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {FORMATS.map((f) => {
              const active = format === f.value;
              return (
                <button
                  key={f.value}
                  type="button"
                  disabled={f.locked}
                  onClick={() => { if (!f.locked) chooseFormat(f.value); }}
                  className={`group relative flex flex-col overflow-hidden border text-left transition-all ${R_PANEL} ${
                    f.locked
                      ? 'cursor-not-allowed border-white/5'
                      : active
                        ? 'border-[#FFCC00] bg-[#FFCC00]/[0.06]'
                        : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {/* Sample preview slot — empty until Neil's reference clips land (no fake stock) */}
                  <div className="relative flex aspect-[4/5] w-full items-center justify-center bg-zinc-950/60">
                    <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                      <Film className="h-6 w-6" />
                      <span className={T_LABEL}>Sample soon</span>
                    </div>
                    {active && !f.locked && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFCC00] text-black">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    {f.locked && <BusinessBadge />}
                  </div>
                  <div className="p-3">
                    <span className={`block ${T_CTRL} ${active && !f.locked ? 'text-[#FFCC00]' : 'text-zinc-200'}`}>{f.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{f.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Strategy (UGC only) */}
          {format === 'ugc' && (
            <div className="mt-4">
              <p className={`mb-1.5 text-zinc-400 ${T_LABEL}`}>// Strategy</p>
              <div className="flex gap-2">
                {STRATEGIES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStrategy(s.value)}
                    title={s.desc}
                    className={`flex-1 border px-3 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase transition-all ${
                      strategy === s.value ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowFormat(false)}
            className={`mt-5 flex w-full items-center justify-center gap-2 ${CTRL_H} ${R_CTRL} ${T_CTRL} bg-[#FFCC00] text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]`}
          >
            <Check className="h-4 w-4 shrink-0" /> Use {formatLabel}
          </button>
        </Modal>
      )}

      {/* ---- Product modal (Phase 1: single upload; Phase 2 = per-vertical slots) ---- */}
      {assetModal === 'product' && (
        <Modal title="Product photo" onClose={() => setAssetModal(null)}>
          <UploadDropzone
            thumb={hero}
            hint="For best results use a product-in-hand shot — it keeps the product size consistent across scenes."
            onFile={async (f) => setHero(await fileToDataUrl(f))}
            onClear={() => setHero('')}
            onView={hero ? () => setViewImage(hero) : undefined}
          />
        </Modal>
      )}

      {/* ---- Presenter modal (clean vertical layout: preview → controls → CTA) ---- */}
      {assetModal === 'avatar' && (
        <Modal title="Presenter" onClose={() => setAssetModal(null)}>
          <div className="mb-4 flex gap-2">
            <ModeTab active={avatarMode === 'generate'} onClick={() => setAvatarMode('generate')} icon={Wand2}>Generate</ModeTab>
            <ModeTab active={avatarMode === 'upload'} onClick={() => setAvatarMode('upload')} icon={Upload}>Upload</ModeTab>
          </div>

          {avatarMode === 'upload' ? (
            <UploadDropzone
              thumb={avatarUrl}
              hint="Upload a presenter photo with the face clearly visible."
              onFile={async (f) => { setAvatarUrl(await fileToDataUrl(f)); setAvatarErr(''); }}
              onClear={() => setAvatarUrl('')}
              onView={avatarUrl ? () => setViewImage(avatarUrl) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {/* Preview block on top — generous, centered (no cramped tiny square) */}
              <div className={`relative mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center overflow-hidden border bg-zinc-950 ${R_PANEL} ${avatarUrl ? 'border-[#FFCC00]/60' : 'border-white/10'}`}>
                {avatarBusy ? (
                  <Loader2 className="h-7 w-7 animate-spin text-[#FFCC00]" />
                ) : avatarUrl ? (
                  <button type="button" onClick={() => setViewImage(avatarUrl)} className="h-full w-full">
                    <img src={avatarUrl} alt="Presenter" className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-zinc-600">
                    <User className="h-8 w-8" />
                    <span className={T_LABEL}>Preview</span>
                  </div>
                )}
              </div>

              {/* Gender — equal-height segmented (consistent with Settings) */}
              <div className="flex gap-2">
                {(['Any', 'Male', 'Female'] as const).map((g) => (
                  <SegBtn key={g} active={gender === g} onClick={() => setGender(g)}>{g}</SegBtn>
                ))}
              </div>

              {/* Ethnicity + Age — reuse the h-11 input primitive */}
              <div className="grid grid-cols-2 gap-2">
                <MiniInput placeholder="Ethnicity" value={ethnicity} onChange={setEthnicity} />
                <MiniInput placeholder="Age (e.g. 25-34)" value={ageRange} onChange={setAgeRange} />
              </div>

              {/* Generate CTA — full-width gold */}
              <button
                type="button"
                onClick={genAvatar}
                disabled={avatarBusy}
                className={`flex w-full items-center justify-center gap-2 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${
                  avatarBusy ? 'cursor-not-allowed bg-zinc-800 text-zinc-500' : 'bg-[#FFCC00] text-black hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]'
                }`}
              >
                {avatarBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <Wand2 className="h-4 w-4 shrink-0" />}
                {avatarUrl ? 'Regenerate presenter' : 'Generate presenter'}
                {avatarGens >= FREE_AVATAR_GENS ? ' · 1 credit' : ''}
              </button>
              <p className={`text-center text-zinc-500 ${T_LABEL}`}>
                {avatarGens < FREE_AVATAR_GENS ? `${FREE_AVATAR_GENS - avatarGens} free left` : 'extra gens use 1 credit'}
              </p>
              {avatarErr && <p className="text-center text-[11px] text-amber-400/80">{avatarErr}</p>}
            </div>
          )}
        </Modal>
      )}

      {viewImage && <ImageModal imageUrl={viewImage} onClose={() => setViewImage(null)} />}
    </div>
  );
};

// ===========================================================================
// Subcomponents
// ===========================================================================

const MiniInput: React.FC<{ placeholder: string; value: string; onChange: (v: string) => void }> = ({ placeholder, value, onChange }) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full border border-white/10 bg-zinc-950 px-3 text-sm text-white placeholder-zinc-600 focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00] ${CTRL_H} ${R_CTRL}`}
  />
);

/** A pill button that toggles a dropdown panel. h-11 trigger; panel is rounded-2xl. */
const Popover: React.FC<{
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
}> = ({ open, onOpen, onClose, trigger, children, align = 'left', disabled }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose, open);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? onClose() : onOpen())}
        className={`inline-flex w-full items-center justify-center border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all md:w-auto ${
          disabled
            ? 'cursor-not-allowed border-white/5 text-zinc-600'
            : open
              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
              : 'border-white/10 text-zinc-300 hover:border-white/30'
        }`}
      >
        {trigger}
      </button>
      {open && !disabled && (
        <div className={`absolute z-40 mt-2 border border-white/10 bg-zinc-900/90 p-3 backdrop-blur-xl ${R_PANEL} ${align === 'right' ? 'right-0' : 'left-0'} max-md:left-0 max-md:right-0`}>
          {children}
        </div>
      )}
    </div>
  );
};

const SettingRow: React.FC<{ label: string; icon: typeof Gauge; children: React.ReactNode }> = ({ label, icon: Icon, children }) => (
  <div>
    <label className={`mb-1.5 flex items-center gap-1.5 text-zinc-400 ${T_LABEL}`}>
      <Icon className="h-3 w-3 shrink-0" /> {label}
    </label>
    {children}
  </div>
);

const SegBtn: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ active, onClick, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex-1 border px-2 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase transition-all ${
      active ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:border-white/30'
    }`}
  >
    {children}
  </button>
);

const Segmented: React.FC<{ value: string; onChange: (v: string) => void; opts: string[] }> = ({ value, onChange, opts }) => (
  <div className="flex gap-2">
    {opts.map((o) => (
      <SegBtn key={o} active={value === o} onClick={() => onChange(o)}>{o}</SegBtn>
    ))}
  </div>
);

const VoiceRow: React.FC<{
  opt: VoiceOpt;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onPreview: () => void;
}> = ({ opt, selected, playing, onSelect, onPreview }) => (
  <div
    className={`flex items-center gap-2 border px-2 ${R_CTRL} transition-all ${
      selected ? 'border-[#FFCC00]/60 bg-[#FFCC00]/10' : 'border-white/10 hover:border-white/30'
    }`}
  >
    <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left">
      {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]" /> : <span className="h-3.5 w-3.5 shrink-0" />}
      <span className={`truncate text-xs ${selected ? 'text-[#FFCC00]' : 'text-zinc-300'}`}>{opt.label}</span>
    </button>
    <button
      type="button"
      onClick={onPreview}
      disabled={!opt.preview}
      title={opt.preview ? 'Play 3-sec preview' : 'No preview available'}
      aria-label={opt.preview ? 'Play 3-second voice preview' : 'No preview available'}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
        !opt.preview
          ? 'cursor-not-allowed border-white/5 text-zinc-600'
          : playing
            ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
            : 'border-[#FFCC00]/40 text-[#FFCC00] hover:bg-[#FFCC00]/10'
      }`}
    >
      {playing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
    </button>
  </div>
);

/** Asset +tile: thumbnail + gold check when filled, dashed prompt when empty. */
const AssetTile: React.FC<{
  label: string;
  icon: typeof User;
  thumb?: string;
  busy?: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, thumb, busy, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group relative flex h-20 items-center gap-3 overflow-hidden border px-3 text-left transition-all ${R_CTRL} ${
      thumb ? 'border-[#FFCC00]/60 bg-[#FFCC00]/[0.06]' : 'border-dashed border-white/20 hover:border-[#FFCC00]/60'
    }`}
  >
    <div className={`relative h-14 w-14 shrink-0 overflow-hidden border border-white/10 bg-zinc-900 ${R_CTRL}`}>
      {busy ? (
        <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#FFCC00]" /></div>
      ) : thumb ? (
        <img src={thumb} alt={label} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center"><Icon className="h-5 w-5 text-zinc-600 group-hover:text-[#FFCC00]" /></div>
      )}
    </div>
    <div className="min-w-0">
      <span className={`block text-zinc-200 ${T_CTRL}`}>{label}</span>
      <span className={`mt-0.5 block text-zinc-500 ${T_LABEL}`}>{thumb ? 'Tap to change' : 'Tap to add'}</span>
    </div>
    {thumb && !busy && (
      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFCC00] text-black">
        <Check className="h-3 w-3" />
      </span>
    )}
  </button>
);

/** Centered modal shell (rounded-3xl). Backdrop click closes. `wide` for the
 * format picker; scrolls inside on short viewports. */
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
    <div
      className={`max-h-[90vh] w-full overflow-y-auto border border-white/10 bg-zinc-900/80 p-5 backdrop-blur-xl ${R_MODAL} ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-zinc-100 ${T_CTRL}`}>{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-zinc-500 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/** Single-upload dropzone with optional clear + view. */
const UploadDropzone: React.FC<{
  thumb?: string;
  hint: string;
  onFile: (f: File) => void;
  onClear: () => void;
  onView?: () => void;
}> = ({ thumb, hint, onFile, onClear, onView }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden border transition-all ${R_PANEL} ${
          thumb ? 'border-[#FFCC00]/60' : 'border-dashed border-white/20 hover:border-[#FFCC00]/60'
        }`}
      >
        {thumb ? (
          <img src={thumb} alt="Upload" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <ImageUp className="h-8 w-8 group-hover:text-[#FFCC00]" />
            <span className={T_LABEL}>Tap to upload · one photo</span>
          </div>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <p className="mt-2 text-[11px] text-amber-400/80">{hint}</p>
      {thumb && (
        <div className="mt-2 flex gap-2">
          {onView && (
            <button type="button" onClick={onView} className={`flex-1 border border-white/10 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase text-zinc-300 transition-colors hover:border-white/30`}>
              View
            </button>
          )}
          <button type="button" onClick={onClear} className={`flex-1 border border-white/10 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase text-zinc-400 transition-colors hover:border-red-500/50 hover:text-red-300`}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

const ModeTab: React.FC<{ active: boolean; onClick: () => void; icon: typeof Wand2; children: React.ReactNode }> = ({ active, onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex flex-1 items-center justify-center gap-1.5 border px-3 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase transition-all ${
      active ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-400 hover:border-white/30'
    }`}
  >
    <Icon className="h-3.5 w-3.5 shrink-0" />
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
