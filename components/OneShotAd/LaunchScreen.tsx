import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ImageUp, Sparkles, Zap, Lock, Wand2, Upload, User, Mic,
  Film, Gauge, Check, Loader2, Package, Wrench, Smartphone, Building2, RefreshCw,
  Settings2, ChevronDown, ChevronLeft, ChevronRight, Play, Square, X, Languages,
  Maximize2, UploadCloud, Images, ZoomIn, Volume2, VolumeX, RotateCcw, PenLine, AlertTriangle,
} from 'lucide-react';
import { GlassPanel } from '../ui/GlassPanel';
import { useOneShotSfx } from '../../services/uiSoundService';
import { saveOneShotDraft, loadOneShotDraft, clearOneShotDraft } from '../../utils/oneShotDraft';
import ImageModal from '../ui/ImageModal';
import { DriftOrbs } from './motion';
import { RECOMMENDED_VOICES } from '../SignalModulator/pinoyReady';
import { describeBusinessAsset } from '../../services/geminiService';
import { fetchVoices } from '../../services/voiceService';
import { compressImageForUpload } from '../../utils/imageCompression';
import { analyzeImageQuality } from '../../utils/imageQuality';
import { getCachedResearchEntry } from '../../services/researchCacheStore';
import { researchCacheKey } from '../../services/producerOrchestrator';
import type { ProductionInput } from '../../services/oneShotIntake';
import type { BusinessInfo } from '../../types';
import {
  ARCHETYPE_META, ARCHETYPE_ORDER, ARCHETYPE_UPLOAD_SLOTS, inferServiceArchetype,
  RE_ARCHETYPE_META, RE_ARCHETYPE_ORDER, RE_UPLOAD_SLOTS, inferRealEstateArchetype,
  BAD_SAMPLE, SampleTile, PRODUCT_EXAMPLE, PRESENTER_EXAMPLE,
  type ServiceArchetype, type RealEstateArchetype, type ServiceSlot,
} from '../guidedPhotoSlots';

type ServicePhoto = NonNullable<BusinessInfo['servicePhotos']>[number];

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
type VoiceOpt = { id: string; name: string; label: string; sub?: string; preview?: string };

/** Curated stock fallback — only used when the account has no Filipino/cloned voices
 * (e.g. the auth-less preview). Stock voices have no preview clip (play-preview disabled). */
const STOCK_FALLBACK: VoiceOpt[] = RECOMMENDED_VOICES.map((v) => ({
  id: v.id,
  name: v.name,
  label: `${v.name} — ${v.vibe} (stock)`,
  sub: `${v.vibe} (stock)`,
}));

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('read failed'));
    r.readAsDataURL(file);
  });

// --- Creative taxonomy: two orthogonal axes (unchanged — "format picker stays current") ---
// FORMAT = video genre; STRATEGY = persuasion angle. Both map onto ProductionInput.scriptType,
// so there's NO backend change: UGC + Real-talk → Testimonial · UGC + Hype → MrBeast · Product UGC → Temu.
type Format = 'ugc' | 'product_ugc' | 'ugc_pro' | 'commercial';
type Strategy = 'Testimonial' | 'MrBeast';
// UGC Pro sub-format. 'auto' leaves businessInfo.ugcProFormat undefined so the server classifies.
type UgcProChoice = 'auto' | 'tryon' | 'transformation';

const FORMATS: { value: Format; label: string; desc: string; locked?: boolean }[] = [
  { value: 'ugc', label: 'UGC', desc: 'Selfie-style creator talking to camera' },
  { value: 'product_ugc', label: 'Product UGC', desc: 'Temu-style fast product hype' },
  { value: 'ugc_pro', label: 'UGC Pro', desc: 'Try-on & before/after creator formats' },
  { value: 'commercial', label: 'Commercial', desc: 'Cinematic spec ad (Seedance) · English only', locked: true },
];

const STRATEGIES: { value: Strategy; label: string; desc: string }[] = [
  { value: 'Testimonial', label: 'Real-talk', desc: 'Honest first-person review' },
  { value: 'MrBeast', label: 'Hype', desc: 'High-energy, big-promise hook' },
];

const UGC_PRO_SUBFORMATS: { value: UgcProChoice; label: string; desc: string }[] = [
  { value: 'auto', label: 'Auto', desc: 'AI picks try-on or before/after from your brief' },
  { value: 'tryon', label: 'Try-On', desc: 'Fashion & wearables — worn reveal' },
  { value: 'transformation', label: 'Transformation', desc: 'Before → after reveal' },
];

const VERTICALS: { value: string; label: string; desc: string; Icon: typeof Package; locked?: boolean }[] = [
  { value: 'product', label: 'Product', desc: 'Gadgets, fashion, food, beauty', Icon: Package },
  { value: 'service', label: 'Service', desc: 'Salon, resto, café, gym, clinic', Icon: Wrench },
  { value: 'real_estate', label: 'Real Estate', desc: 'House, condo, lot — sale or rent', Icon: Building2 },
  { value: 'app', label: 'App', desc: 'Mobile app / SaaS', Icon: Smartphone, locked: true },
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

/** True below Tailwind's `sm` breakpoint (640px) — drives mobile-only layout
 * swaps (Settings → bottom-sheet, Format → swipe carousel). SSR-safe. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

export const LaunchScreen: React.FC<{
  onLaunch: (input: ProductionInput) => void;
  /** Pro+ unlock for Director (step-by-step) mode. Free/Starter get the upsell. */
  directorUnlocked: boolean;
  onUpgrade: () => void;
  /** Switch to the advanced 8-step wizard — the brief carries over. */
  onSwitchToSteps: () => void;
  /** Switch to Expert Mode (Director's Cut). Dev-unlock gated for v1 — undefined hides the door. */
  onSwitchToExpert?: () => void;
  /** Back to Command Center — renders the canonical left-aligned module header. */
  onBack?: () => void;
  /** Open Signal Modulator's Voice Cloning tab to record/clone a custom voice. */
  onCloneVoice?: () => void;
}> = ({ onLaunch, directorUnlocked, onUpgrade, onSwitchToSteps, onSwitchToExpert, onBack, onCloneVoice }) => {
  // Premium cinematic click cues — One-Shot only, ON by default, mutable.
  const sfx = useOneShotSfx();
  const isMobile = useIsMobile();

  // Restore an in-flight brief if the user bounced out mid-session (e.g. to clone
  // a voice). Held in memory by oneShotDraft; saved at nav-time, cleared on launch
  // or an explicit back-to-Command-Center. Read once per mount.
  const restored = useRef(loadOneShotDraft()).current;

  // --- Brief --------------------------------------------------------------
  const [hero, setHero] = useState<string>(restored?.hero ?? '');          // Product vertical: single product-in-hand photo
  const [offer, setOffer] = useState(restored?.offer ?? '');
  const [brandName, setBrandName] = useState(restored?.brandName ?? '');
  const [price, setPrice] = useState(restored?.price ?? '');
  const [forceFresh, setForceFresh] = useState(restored?.forceFresh ?? false);

  // --- Guided assets (Service / RealEstate verticals — per-slot real photos) ---
  const [servicePhotos, setServicePhotos] = useState<ServicePhoto[]>(restored?.servicePhotos ?? []);
  const [serviceArchetype, setServiceArchetype] = useState<ServiceArchetype>(restored?.serviceArchetype ?? 'venue');
  const [reArchetype, setReArchetype] = useState<RealEstateArchetype>(restored?.reArchetype ?? 'listing');
  const [slotBusy, setSlotBusy] = useState(false);
  const [assetErr, setAssetErr] = useState('');
  // Soft upload-quality nudges, keyed by 'hero' | 'avatar' | <ServiceSlot>. Never blocks an upload.
  const [quality, setQuality] = useState<Record<string, string[]>>({});
  const checkQuality = (key: string, dataUrl: string) => {
    void analyzeImageQuality(dataUrl)
      .then((q) => setQuality((s) => ({ ...s, [key]: q.warnings })))
      .catch(() => { /* measurement failures never block an upload */ });
  };
  const clearQuality = (key: string) =>
    setQuality((s) => { const { [key]: _drop, ...rest } = s; return rest; });
  // Local-service grounding for Market Research (Service: opt-in checkbox; RealEstate: location is required).
  const [localService, setLocalService] = useState(restored?.localService ?? false);
  const [businessAddress, setBusinessAddress] = useState(restored?.businessAddress ?? '');

  // --- Creative axes ------------------------------------------------------
  const [vertical, setVertical] = useState(restored?.vertical ?? 'product');
  const [format, setFormat] = useState<Format>(restored?.format ?? 'ugc');
  const [strategy, setStrategy] = useState<Strategy>(restored?.strategy ?? 'Testimonial');
  // UGC Pro sub-format pick. 'auto' → the server classifies the sub-format from the brief.
  const [ugcProChoice, setUgcProChoice] = useState<UgcProChoice>(restored?.ugcProChoice ?? 'auto');

  // --- Presenter — AUTO (AI Director casts from the research persona) or upload.
  // No generation at intake: casting fires AFTER Market Research so it uses the
  // full target-market formula (the gender/age/ethnicity below are optional hints).
  const [presenterMode, setPresenterMode] = useState<'auto' | 'upload'>(restored?.presenterMode ?? 'auto');
  // Casting hints are BLANK by default so an untouched AUTO = AI Director casts
  // purely from the research persona (the formula at full strength). Power users
  // can pin a look under "Advanced".
  const [gender, setGender] = useState<'Any' | 'Male' | 'Female'>(restored?.gender ?? 'Any');
  const [ageRange, setAgeRange] = useState(restored?.ageRange ?? '');
  const [ethnicity, setEthnicity] = useState(restored?.ethnicity ?? '');
  const [showCastHints, setShowCastHints] = useState<boolean>(
    !!(restored?.ethnicity || restored?.ageRange || (restored?.gender && restored.gender !== 'Any')),
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(restored?.avatarUrl ?? '');
  const [avatarErr, setAvatarErr] = useState('');

  // --- Settings -----------------------------------------------------------
  const [language, setLanguage] = useState<ProductionInput['language']>(restored?.language ?? 'Taglish');
  const [aspectRatio, setAspectRatio] = useState<ProductionInput['aspectRatio']>(restored?.aspectRatio ?? '9:16');
  const [resolution, setResolution] = useState<NonNullable<ProductionInput['resolution']>>(restored?.resolution ?? '720p');

  // --- Voice picker (Filipino library first, then clones; stock fallback) --
  const [voiceId, setVoiceId] = useState<string>(restored?.voiceId ?? STOCK_FALLBACK[0]?.id ?? '');
  const [voiceOpts, setVoiceOpts] = useState<VoiceOpt[]>(STOCK_FALLBACK);
  const [voicesFromMine, setVoicesFromMine] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetchVoices().then((lib) => {
      if (!alive) return;
      const filipino: VoiceOpt[] = lib.libraryVoices.map((v) => ({ id: v.voice_id, name: v.name, label: v.description ? `${v.name} — ${v.description}` : v.name, sub: v.description || undefined, preview: v.preview_url }));
      const mine: VoiceOpt[] = lib.myVoices.map((v) => ({ id: v.voice_id, name: v.name, label: `${v.name} (your clone)`, sub: 'Your clone', preview: v.preview_url }));
      const opts = [...filipino, ...mine];
      if (opts.length === 0) return; // keep stock fallback
      setVoiceOpts(opts);
      setVoicesFromMine(true);
      // Keep a restored/valid selection; only default to the first when the
      // current pick isn't in the freshly-loaded list.
      setVoiceId((prev) => (opts.some((o) => o.id === prev) ? prev : opts[0].id));
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

  // --- UI surfaces (niche + settings popovers, format/asset modals) -------
  const [menu, setMenu] = useState<null | 'niche' | 'settings'>(null);
  const [showFormat, setShowFormat] = useState(false);
  const [assetModal, setAssetModal] = useState<null | 'product' | 'avatar'>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false); // two-tap guard on Reset

  // Vertical takes precedence (Services/RealEstate are their own styles); within
  // Product, Format × Strategy picks the formula. All map onto the scriptType enum.
  const scriptType: NonNullable<ProductionInput['scriptType']> =
    vertical === 'service' ? 'Services'
      : vertical === 'real_estate' ? 'RealEstate'
        : format === 'product_ugc' ? 'Temu'
          : format === 'ugc_pro' ? 'UGCPro'
            : strategy;

  const formatLabel = FORMATS.find((f) => f.value === format)?.label ?? 'UGC';
  const activeVertical = VERTICALS.find((v) => v.value === vertical) ?? VERTICALS[0];
  const formatLocked = vertical !== 'product'; // Service/RealEstate drive their own formula

  // Service/RealEstate use the guided per-slot real-photo upload ("Assets");
  // Product uses a single product-in-hand photo. (One-Shot collects the SAME
  // inputs as advanced mode, just on one page — Director AI does the rest.)
  const isService = vertical === 'service';
  const isRealEstate = vertical === 'real_estate';
  const isGuided = isService || isRealEstate;
  const guidedSlots = isRealEstate ? RE_UPLOAD_SLOTS[reArchetype] : ARCHETYPE_UPLOAD_SLOTS[serviceArchetype];
  const guidedArchetypeTabs = isRealEstate
    ? RE_ARCHETYPE_ORDER.map((a) => ({ key: a, ...RE_ARCHETYPE_META[a], active: reArchetype === a, onSelect: () => setReArchetype(a) }))
    : ARCHETYPE_ORDER.map((a) => ({ key: a, ...ARCHETYPE_META[a], active: serviceArchetype === a, onSelect: () => setServiceArchetype(a) }));

  // Smart-default the archetype off the offer once, when entering a guided vertical.
  useEffect(() => {
    if (isService) setServiceArchetype(inferServiceArchetype(offer));
    if (isRealEstate) setReArchetype(inferRealEstateArchetype(offer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertical]);

  // Guided slot upload: the slot dropped into IS the tag. Describe is best-effort
  // (a 401/quota must not block the upload — research re-derives context anyway).
  const uploadSlot = async (file: File, slot: ServiceSlot) => {
    setSlotBusy(true);
    setAssetErr('');
    try {
      const c = await compressImageForUpload(file);
      let description: string | undefined;
      try { description = await describeBusinessAsset(c.base64, c.mimeType); } catch { /* best-effort */ }
      const order = guidedSlots.map((s) => s.slot);
      setServicePhotos((prev) =>
        [...prev.filter((p) => p.slot !== slot), { url: c.dataUrl, slot, description }]
          .sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot)),
      );
      checkQuality(slot, c.dataUrl);
    } catch {
      setAssetErr('Could not read that image — try another.');
    } finally {
      setSlotBusy(false);
    }
  };
  const removeSlotPhoto = (slot: ServiceSlot) => {
    setServicePhotos((prev) => prev.filter((p) => p.slot !== slot));
    clearQuality(slot);
  };

  // Seedance (Commercial) can't speak a native Filipino accent → Commercial is
  // English-only, and the two are mutually exclusive.
  const chooseFormat = (f: Format) => {
    setFormat(f);
    if (f === 'commercial') setLanguage('English');
  };
  const chooseLanguage = (l: ProductionInput['language']) => {
    setLanguage(l);
    if (l === 'Taglish' && format === 'commercial') setFormat('ugc');
  };

  // AUTO mode is always ready (AI Director casts post-research); UPLOAD needs a photo.
  const presenterReady = presenterMode === 'auto' || !!avatarUrl;
  // Commercial (Seedance) handles its own audio. Service/RealEstate (formatLocked)
  // run UGC-style and always need a voice.
  const voiceNeeded = formatLocked || format !== 'commercial';
  // Product → one product photo; Service/RealEstate → at least one guided asset.
  const assetReady = isGuided ? servicePhotos.length > 0 : !!hero;
  // RealEstate must have the property location; everything else just needs brand+price.
  const addressReady = !isRealEstate || !!businessAddress.trim();
  // Brand + price are load-bearing — they feed Market Research (which writes the
  // whole script). Required, not optional.
  const ready = !!(assetReady && offer.trim() && brandName.trim() && price.trim() && addressReady && presenterReady && (!voiceNeeded || voiceId));
  const reason = !assetReady ? (isGuided ? 'Add your photos' : 'Add a product photo')
    : !offer.trim() ? 'Describe your offer'
      : !brandName.trim() ? 'Add your brand'
        : !price.trim() ? 'Add your price'
          : !addressReady ? 'Add the property location'
            : !presenterReady ? 'Upload your presenter photo'
              : voiceNeeded && !voiceId ? 'Pick a voice'
                : '';

  // Research-reuse hint: the intake sends productName = brand, so the cache key the
  // orchestrator writes/reads is keyed on the brand for both parts. If that key already
  // has research (a prior One-Shot or a Recon run) and the user hasn't forced a fresh run,
  // surface it so they know the target market stays locked instead of re-drifting.
  const savedResearch = useMemo(
    () => (forceFresh ? null : getCachedResearchEntry(researchCacheKey(brandName, brandName))),
    [brandName, forceFresh],
  );

  const launch = () => {
    if (!ready) return;
    clearOneShotDraft(); // brief is consumed — a fresh One-Shot starts clean
    const brand = brandName.trim();
    onLaunch({
      brandName: brand,
      offer: offer.trim(),
      price: price.trim(),
      productName: brand,
      productDescription: offer.trim(),
      // Guided verticals anchor research on the hero-slot photo; Product on the single hero.
      heroImageBase64: isGuided ? (servicePhotos[0]?.url ?? '') : hero,
      // UPLOAD → the run honors the user's photo. AUTO → empty url so AI Director
      // casts the spokesperson from the research persona, shaped by castHints.
      avatar: presenterMode === 'upload'
        ? { url: avatarUrl, description: ethnicity.trim() ? `A ${ethnicity.trim()} presenter` : 'An uploaded presenter', ethnicity, gender, prompt: '' }
        : { url: '', description: '', ethnicity: '', gender: 'Any', prompt: '' },
      castHints: presenterMode === 'auto' ? { gender, ageRange, ethnicity } : undefined,
      voiceId,
      language,
      aspectRatio,
      resolution,
      scriptType,
      // Explicit UGC Pro sub-format override; 'auto' (or any non-UGC-Pro format) leaves it
      // undefined so the server classifies the sub-format from the brief.
      ugcProFormat: format === 'ugc_pro' && ugcProChoice !== 'auto' ? ugcProChoice : undefined,
      servicePhotos: isGuided ? servicePhotos : undefined,
      serviceArchetype: isService ? serviceArchetype : undefined,
      realEstateArchetype: isRealEstate ? reArchetype : undefined,
      // RealEstate is always local (location required); Service is opt-in via the checkbox.
      isLocalService: isRealEstate ? true : isService ? localService : false,
      businessAddress: (isRealEstate || (isService && localService)) ? businessAddress.trim() : undefined,
      forceFreshResearch: forceFresh,
    });
  };

  // Has the user put anything in the brief yet? Drives the Reset affordance +
  // the "don't persist an empty form" guard.
  const dirty = !!(
    offer.trim() || brandName.trim() || price.trim() || hero || avatarUrl ||
    servicePhotos.length || businessAddress.trim()
  );

  // Autosave (debounced) — the brief survives reload / lost connection / a closed
  // browser. Skips an untouched form so a fresh visit never leaves a phantom draft.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      saveOneShotDraft({
        hero, offer, brandName, price, forceFresh,
        servicePhotos, serviceArchetype, reArchetype, localService, businessAddress,
        vertical, format, strategy, ugcProChoice,
        presenterMode, gender, ageRange, ethnicity, avatarUrl,
        language, aspectRatio, resolution, voiceId,
      });
    }, 700);
    return () => clearTimeout(t);
  }, [
    dirty, hero, offer, brandName, price, forceFresh,
    servicePhotos, serviceArchetype, reArchetype, localService, businessAddress,
    vertical, format, strategy, ugcProChoice,
    presenterMode, gender, ageRange, ethnicity, avatarUrl,
    language, aspectRatio, resolution, voiceId,
  ]);

  // Reset — wipe the whole brief back to defaults + drop the saved draft. Guarded
  // by a two-tap confirm (destructive: nukes typed details + uploads).
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetAll = () => {
    setHero(''); setOffer(''); setBrandName(''); setPrice(''); setForceFresh(false);
    setServicePhotos([]); setServiceArchetype('venue'); setReArchetype('listing');
    setLocalService(false); setBusinessAddress('');
    setVertical('product'); setFormat('ugc'); setStrategy('Testimonial'); setUgcProChoice('auto');
    setPresenterMode('auto'); setGender('Any'); setAgeRange(''); setEthnicity(''); setShowCastHints(false);
    setAvatarUrl('');
    setLanguage('Taglish'); setAspectRatio('9:16'); setResolution('720p');
    setVoiceId(voiceOpts[0]?.id ?? STOCK_FALLBACK[0]?.id ?? '');
    clearOneShotDraft();
    setConfirmReset(false);
    sfx.play('select');
  };
  const onResetClick = () => {
    if (confirmReset) { resetAll(); return; }
    setConfirmReset(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setConfirmReset(false), 3000);
  };
  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  // Settings body — shared by the desktop popover and the mobile bottom-sheet so
  // there's ONE definition. On mobile the Modal owns the width + the single scroll
  // container, so the fixed desktop widths are dropped there.
  const settingsInner = (
    <div className={`grid grid-cols-1 gap-4 ${isMobile ? '' : voiceNeeded ? 'w-[min(88vw,34rem)] sm:grid-cols-2' : 'w-72'}`}>
      <div className="space-y-4">
        <SettingRow label="Aspect" icon={Gauge}>
          <Segmented value={aspectRatio} onChange={(v) => { setAspectRatio(v as ProductionInput['aspectRatio']); sfx.play('select'); }} opts={['9:16', '1:1', '16:9']} />
        </SettingRow>

        <SettingRow label="Video quality" icon={Gauge}>
          <div className="flex gap-2">
            <SegBtn active={resolution === '720p'} onClick={() => { setResolution('720p'); sfx.play('select'); }}>720p</SegBtn>
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
          <p className="mt-1 text-[10px] text-zinc-500">Resolution of the final rendered video.</p>
        </SettingRow>

        <SettingRow label="Language" icon={Languages}>
          <Segmented
            value={language}
            onChange={(v) => { chooseLanguage(v as ProductionInput['language']); sfx.play('select'); }}
            opts={format === 'commercial' ? ['English'] : ['Taglish', 'English']}
          />
          {format === 'commercial' && (
            <p className="mt-1 text-[10px] text-amber-400/80">Commercial is English-only (Taglish not supported by the cinematic engine).</p>
          )}
        </SettingRow>
      </div>

      {voiceNeeded && (
        <div className="min-w-0">
          <SettingRow label="Voice" icon={Mic}>
            <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1 sm:max-h-72">
              {voiceOpts.map((v) => (
                <VoiceRow
                  key={v.id}
                  opt={v}
                  selected={voiceId === v.id}
                  playing={previewId === v.id}
                  onSelect={() => { setVoiceId(v.id); sfx.play('select'); }}
                  onPreview={() => playPreview(v)}
                />
              ))}
            </div>
            {/* Clone-your-own-voice on-ramp → Signal Modulator Voice Cloning tab.
                Always visible; cloning's own paywall/flag messaging gates ineligible users. */}
            {onCloneVoice && (
              <button
                type="button"
                onClick={() => {
                  sfx.play('open');
                  // Snapshot the brief so it survives the detour to Voice Cloning
                  // and is restored when the user comes back.
                  saveOneShotDraft({
                    hero, offer, brandName, price, forceFresh,
                    servicePhotos, serviceArchetype, reArchetype, localService, businessAddress,
                    vertical, format, strategy, ugcProChoice,
                    presenterMode, gender, ageRange, ethnicity, avatarUrl,
                    language, aspectRatio, resolution, voiceId,
                  });
                  onCloneVoice();
                }}
                className={`mt-2 flex w-full items-center justify-center gap-2 border border-dashed border-[#FFCC00]/40 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase text-[#FFCC00] transition-all hover:bg-[#FFCC00]/10`}
              >
                <Mic className="h-3.5 w-3.5 shrink-0" /> Clone your own voice
              </button>
            )}
            {!voicesFromMine && (
              <p className="mt-1.5 text-[11px] text-amber-400/80">
                No Filipino voices found — using a stock voice. Your Filipino library loads here in the live app.
              </p>
            )}
          </SettingRow>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 pb-28 text-white md:pb-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,204,0,0.07),transparent_60%)]" />
      <DriftOrbs />

      <div className="relative mx-auto w-full max-w-4xl">
        {/* Canonical module header — left-aligned, matches Recon / War Room / Director AI */}
        <header className="mb-8 flex flex-col items-start gap-4 border-b border-white/10 pb-6">
          <div className="flex w-full items-center justify-between">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 transition-colors hover:text-white md:text-xs"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" /> <span className="hidden md:inline">Command Center</span><span className="md:hidden">Back</span>
              </button>
            ) : <span />}
            <div className="flex shrink-0 items-center gap-2">
              {/* Reset — two-tap guard; only shown once the brief has content.
                  Ghost (never competes with the gold "Make My Ad" CTA). */}
              {dirty && (
                <button
                  type="button"
                  onClick={onResetClick}
                  aria-label="Reset the whole brief"
                  title="Wipe all details, settings, presenter and uploads"
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 transition-all ${T_LABEL} ${
                    confirmReset ? 'border-red-500/50 text-red-300 hover:bg-red-500/10' : 'border-white/10 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>{confirmReset ? 'Tap to wipe' : 'Reset'}</span>
                </button>
              )}
              {/* One-Shot cinematic SFX toggle — labeled pill so it's discoverable
                  (scoped to this module only). Gold fill when on. */}
              <button
                type="button"
                onClick={sfx.toggle}
                aria-label={sfx.enabled ? 'Mute click sounds' : 'Unmute click sounds'}
                title={sfx.enabled ? 'Sound on — tap to mute' : 'Sound off — tap to unmute'}
                className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 transition-all ${T_LABEL} ${
                  sfx.enabled ? 'border-[#FFCC00]/40 bg-[#FFCC00]/10 text-[#FFCC00] hover:bg-[#FFCC00]/20' : 'border-white/10 text-zinc-400 hover:border-white/30'
                }`}
              >
                {sfx.enabled ? <Volume2 className="h-4 w-4 shrink-0" /> : <VolumeX className="h-4 w-4 shrink-0" />}
                <span>{sfx.enabled ? 'Sound on' : 'Sound off'}</span>
              </button>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2">
            <h1 className={`uppercase text-transparent bg-clip-text bg-gradient-to-b from-zinc-100 to-zinc-500 ${T_DISPLAY}`}>
              Turn any product into a video ad
            </h1>
            <p className={`text-zinc-500 ${T_LABEL}`}>// One shot · No grind</p>
          </div>
        </header>

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

          {/* Niche-specific location (RealEstate: required; Service: opt-in local) */}
          {isRealEstate && (
            <div className="mt-3">
              <MiniInput placeholder="Property location / address (required)" value={businessAddress} onChange={setBusinessAddress} />
            </div>
          )}
          {isService && (
            <div className="mt-3 space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
                <input type="checkbox" checked={localService} onChange={(e) => setLocalService(e.target.checked)} className="h-4 w-4 shrink-0 accent-[#FFCC00]" />
                Is this a local service? <span className="text-zinc-500">— adds local market research</span>
              </label>
              {localService && <MiniInput placeholder="Business address" value={businessAddress} onChange={setBusinessAddress} />}
            </div>
          )}

          {/* AI-research reassurance + re-research toggle */}
          <p className={`mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-500 ${T_LABEL}`}>
            <span className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]/70" />{' '}
              {savedResearch
                ? savedResearch.report.subject?.trim()
                  ? `Using your saved research on ${savedResearch.report.subject.trim()} (from ${new Date(savedResearch.savedAt).toLocaleDateString()})`
                  : `Using your saved research (from ${new Date(savedResearch.savedAt).toLocaleDateString()})`
                : 'AI researches your market automatically'}
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

          {/* ---- Control row: Niche ▾ · Format ▾ · Settings ▾ (labeled control panel) ---- */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Niche — dropdown so it scales (App/etc.) without widening the row */}
            <div className="flex flex-col gap-1">
              <label className={`text-zinc-400 ${T_LABEL}`}>// Niche</label>
              <Popover
                open={menu === 'niche'}
                onOpen={() => setMenu('niche')}
                onClose={() => setMenu(null)}
                fullWidth
                trigger={
                  <>
                    <span className="inline-flex items-center gap-2 truncate">
                      <activeVertical.Icon className="h-4 w-4 shrink-0" /> {activeVertical.label}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  </>
                }
              >
                <div className="w-56 space-y-1.5">
                  <p className={`text-zinc-500 ${T_LABEL}`}>// What are you advertising?</p>
                  {VERTICALS.map(({ value, label, desc, Icon, locked }) => (
                    <button
                      key={value}
                      type="button"
                      disabled={locked}
                      onClick={() => { if (!locked) { setVertical(value); setMenu(null); } }}
                      className={`relative flex w-full items-center gap-2 border px-3 py-2 ${R_CTRL} ${T_CTRL} transition-all ${
                        locked
                          ? 'cursor-not-allowed border-white/5 text-zinc-600'
                          : vertical === value
                            ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                            : 'border-white/10 text-zinc-300 hover:border-white/30'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex flex-col items-start text-left">
                        {label}
                        <span className={`text-[11px] font-normal leading-snug ${locked ? 'text-zinc-700' : 'text-zinc-500'}`}>{desc}</span>
                      </span>
                      {locked && <SoonBadge />}
                    </button>
                  ))}
                </div>
              </Popover>
            </div>

            {/* Format — opens the sample picker box */}
            <div className="flex flex-col gap-1">
              <label className={`text-zinc-400 ${T_LABEL}`}>// Format</label>
              <button
                type="button"
                disabled={formatLocked}
                onClick={() => { setShowFormat(true); sfx.play('open'); }}
                className={`inline-flex w-full items-center justify-between gap-2 border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${
                  formatLocked
                    ? 'cursor-not-allowed border-white/5 text-zinc-600'
                    : showFormat
                      ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
                      : 'border-white/10 text-zinc-300 hover:border-white/30'
                }`}
                title={formatLocked ? 'Format is set automatically for this niche' : 'Pick a format'}
              >
                <span className="inline-flex items-center gap-2 truncate"><Film className="h-4 w-4 shrink-0" /> {formatLocked ? 'Auto' : formatLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
              </button>
            </div>

            {/* Settings ▾ — desktop: right-aligned popover · mobile: bottom-sheet
                (the absolute popover got cut off / un-scrollable on short phones). */}
            <div className="flex flex-col gap-1">
              <label className={`text-zinc-400 ${T_LABEL}`}>// Settings</label>
              {isMobile ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setMenu('settings'); sfx.play('open'); }}
                    className={`inline-flex w-full items-center justify-between gap-2 border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${
                      menu === 'settings' ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2"><Settings2 className="h-4 w-4 shrink-0" /> Settings</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  </button>
                  {menu === 'settings' && (
                    <Modal title="Settings" wide onClose={() => setMenu(null)}>{settingsInner}</Modal>
                  )}
                </>
              ) : (
                <Popover
                  open={menu === 'settings'}
                  onOpen={() => { setMenu('settings'); sfx.play('open'); }}
                  onClose={() => setMenu(null)}
                  align="right"
                  fullWidth
                  trigger={
                    <>
                      <span className="inline-flex items-center gap-2"><Settings2 className="h-4 w-4 shrink-0" /> Settings</span>
                      <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                    </>
                  }
                >
                  {settingsInner}
                </Popover>
              )}
            </div>
          </div>

          {/* ---- Asset tiles: PRODUCT/ASSETS · PRESENTER (full-width rows on mobile) ---- */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AssetTile
              label={isGuided ? 'Assets' : 'Product'}
              icon={isGuided ? Images : ImageUp}
              thumb={isGuided ? servicePhotos[0]?.url : hero}
              busy={slotBusy}
              count={isGuided ? servicePhotos.length : undefined}
              onClick={() => setAssetModal('product')}
            />
            <AssetTile
              label="Presenter"
              icon={presenterMode === 'auto' ? Wand2 : User}
              thumb={presenterMode === 'upload' ? avatarUrl : undefined}
              sub={presenterMode === 'auto' ? 'AI Director casts it · tap to set' : (avatarUrl ? 'Tap to change' : 'Tap to upload')}
              forceFilled={presenterMode === 'auto' || !!avatarUrl}
              onClick={() => setAssetModal('avatar')}
            />
          </div>

          {/* ---- GENERATE --------------------------------------------------- */}
          <div className="mt-6 max-md:sticky max-md:bottom-3 max-md:z-30">
            <button
              type="button"
              disabled={!ready}
              onClick={() => { if (ready) sfx.play('confirm'); launch(); }}
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
                className={`mt-3 flex w-full items-center justify-center gap-2 whitespace-nowrap border border-white/10 bg-zinc-950 ${CTRL_H} ${R_CTRL} ${T_LABEL} font-bold text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}
              >
                <Settings2 className="h-3.5 w-3.5 shrink-0" /> Control every scene — Director mode
              </button>
            ) : (
              <button
                type="button"
                onClick={onUpgrade}
                className={`mt-3 flex w-full items-center justify-center gap-2 whitespace-nowrap border border-white/10 bg-zinc-950 ${CTRL_H} ${R_CTRL} ${T_LABEL} font-bold text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}
              >
                <Lock className="h-3 w-3 shrink-0" /> Control every scene — <span className="text-[#FFCC00]">Pro</span>
              </button>
            )}
            {/* Expert Mode (Director's Cut) — bring-your-own-script. Dev-unlock gated
                for v1: only rendered when App passes onSwitchToExpert (devUnlock). */}
            {onSwitchToExpert && (
              <button
                type="button"
                onClick={onSwitchToExpert}
                className={`mt-3 flex w-full items-center justify-center gap-2 whitespace-nowrap border border-white/10 bg-zinc-950 ${CTRL_H} ${R_CTRL} ${T_LABEL} font-bold text-zinc-400 transition-colors hover:border-[#FFCC00]/50 hover:text-white`}
              >
                <PenLine className="h-3.5 w-3.5 shrink-0" /> I&apos;ll write my own script — Director&apos;s Cut
              </button>
            )}
          </div>
        </GlassPanel>
      </div>

      {/* ---- Format picker box (Higgsfield-style; per-format sample slots) ---- */}
      {showFormat && (
        <Modal title="Pick the format that hits" wide onClose={() => setShowFormat(false)}>
          <p className="mb-4 text-sm text-zinc-400">Choose the type of video that fits your product and audience.</p>
          {/* Mobile: horizontal swipe carousel (stays one screen tall, scales to many
              formats) · Desktop: 3-up grid. */}
          {isMobile ? (
            <FormatCarousel formats={FORMATS} activeValue={format} onChoose={(v) => { chooseFormat(v); sfx.play('select'); }} />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FORMATS.map((f) => (
                <FormatCard
                  key={f.value}
                  f={f}
                  active={format === f.value}
                  onChoose={() => { chooseFormat(f.value); sfx.play('select'); }}
                />
              ))}
            </div>
          )}

          {/* Strategy + CTA pinned together so BOTH stay visible without scrolling
              past a tall preview card (UGC adds the Strategy row). */}
          <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 border-t border-white/10 bg-zinc-900/95 px-5 pb-5 pt-3 backdrop-blur-xl">
            {format === 'ugc' && (
              <div className="mb-3">
                <p className={`mb-1.5 text-zinc-500 ${T_LABEL}`}>// Strategy</p>
                <div className="flex gap-2">
                  {STRATEGIES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setStrategy(s.value); sfx.play('select'); }}
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
            {format === 'ugc_pro' && (
              <div className="mb-3">
                <p className={`mb-1.5 text-zinc-500 ${T_LABEL}`}>// Sub-format</p>
                <div className="flex gap-2">
                  {UGC_PRO_SUBFORMATS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => { setUgcProChoice(s.value); sfx.play('select'); }}
                      title={s.desc}
                      className={`flex-1 border px-3 ${CTRL_H} ${R_CTRL} ${T_VALUE} uppercase transition-all ${
                        ugcProChoice === s.value ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]' : 'border-white/10 text-zinc-300 hover:border-white/30'
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
              className={`flex w-full items-center justify-center gap-2 whitespace-nowrap ${CTRL_H} ${R_CTRL} ${T_CTRL} bg-[#FFCC00] text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]`}
            >
              <Check className="h-4 w-4 shrink-0" /> Use {formatLabel}
            </button>
          </div>
        </Modal>
      )}

      {/* ---- Product modal — single product photo (Product vertical) ---- */}
      {assetModal === 'product' && !isGuided && (
        <Modal title="Product photo" onClose={() => setAssetModal(null)}>
          {/* Reference guide — handheld, brand + whole product visible (phone shot is fine) */}
          <p className={`mb-2 text-zinc-500 ${T_LABEL}`}>// Aim for this — product in hand, brand visible · tap <ZoomIn className="inline h-3 w-3 align-text-bottom" /> to zoom ↓</p>
          <div className="mx-auto mb-3 grid max-w-[260px] grid-cols-2 gap-3">
            <SampleTile src={PRODUCT_EXAMPLE} caption="In hand · brand clear" good onZoom={setViewImage} />
            <SampleTile src={BAD_SAMPLE.src} caption="Dark & blurry" good={false} onZoom={setViewImage} />
          </div>
          <UploadDropzone
            thumb={hero}
            hint="A plain phone shot is fine — just hold the product so the brand name and whole product are clear."
            onFile={async (f) => { const d = await fileToDataUrl(f); setHero(d); checkQuality('hero', d); }}
            onClear={() => { setHero(''); clearQuality('hero'); }}
            onView={hero ? () => setViewImage(hero) : undefined}
          />
          <QualityNudge warnings={hero ? quality.hero : undefined} />
        </Modal>
      )}

      {/* ---- Assets modal — guided per-slot real photos (Service / RealEstate) ---- */}
      {assetModal === 'product' && isGuided && (
        <Modal title={isRealEstate ? 'Property photos' : 'Service photos'} wide onClose={() => setAssetModal(null)}>
          {/* Clarify the role: these are anchors, not the performer (presenter is separate) */}
          <p className="mb-4 text-[11px] leading-snug text-zinc-400">
            Real photos of your {isRealEstate ? 'property' : 'business'} — these anchor the AI's scenes so they look like the real place. Your on-camera presenter is set separately.
          </p>
          {/* What does the ad lead with? — archetype picker */}
          <p className={`mb-1.5 text-zinc-400 ${T_LABEL}`}>// What should the ad lead with?</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {guidedArchetypeTabs.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onSelect}
                className={`border px-3 py-2.5 text-left ${R_CTRL} transition-all ${
                  a.active ? 'border-[#FFCC00] bg-[#FFCC00]/10' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <span className={`block ${T_CTRL} ${a.active ? 'text-[#FFCC00]' : 'text-zinc-200'}`}>{a.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{a.sub}</span>
              </button>
            ))}
          </div>

          {/* Guided slots — each shows ITS OWN example (dimmed, tap ⌕ to zoom). The slot you drop into IS the tag. */}
          <p className={`mb-2 mt-4 text-zinc-500 ${T_LABEL}`}>// Tap VIEW SAMPLE on a slot to see the full reference · clear &amp; bright wins ↓</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {guidedSlots.map(({ slot, label, hint, example }) => {
              const existing = servicePhotos.find((p) => p.slot === slot);
              return (
                <div key={`${slot}-${label}`} className="flex flex-col">
                  {/* "View sample" — visible, tappable gold pill above the box; keeps the
                      upload box clean/full; click to see the WHOLE reference image. */}
                  {example && !existing && (
                    <button
                      type="button"
                      onClick={() => setViewImage(example)}
                      aria-label={`View ${label} sample`}
                      className="mb-1.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wide text-[#FFCC00] transition-all hover:bg-[#FFCC00]/20"
                    >
                      <ZoomIn className="h-3 w-3 shrink-0" /> View sample
                    </button>
                  )}
                  {/* Clean, full upload box — a tap always uploads */}
                  <label className={`relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden border transition-all ${R_CTRL} ${
                    existing ? 'border-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.25)]' : 'border-dashed border-white/15 bg-zinc-950/50 hover:border-[#FFCC00] hover:bg-zinc-800/60'
                  }`}>
                    {existing ? (
                      <>
                        <img src={existing.url} alt={label} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={(ev) => { ev.preventDefault(); setViewImage(existing.url); }}
                          aria-label="View full"
                          className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-md bg-black/70 text-zinc-200 hover:text-[#FFCC00]"
                        >
                          <Maximize2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(ev) => { ev.preventDefault(); removeSlotPhoto(slot); }}
                          aria-label="Remove"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600/90 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1 p-2 text-center text-zinc-400">
                        {slotBusy ? <Loader2 className="h-5 w-5 animate-spin text-[#FFCC00]" /> : <UploadCloud className="h-5 w-5" />}
                        <span className="text-[9px] font-mono uppercase tracking-tighter">+ Add</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadSlot(f, slot); e.target.value = ''; }} />
                  </label>
                  <p className="mt-1 text-center text-[9px] font-mono font-bold uppercase leading-tight text-white">{label}</p>
                  <p className="text-center text-[8px] font-mono leading-tight text-zinc-500">{hint}</p>
                  <QualityNudge warnings={existing ? quality[slot] : undefined} className="mt-1" />
                </div>
              );
            })}
          </div>
          {assetErr && <p className="mt-2 text-[11px] text-amber-400/80">{assetErr}</p>}

          <button
            type="button"
            onClick={() => setAssetModal(null)}
            className={`mt-5 flex w-full items-center justify-center gap-2 ${CTRL_H} ${R_CTRL} ${T_CTRL} bg-[#FFCC00] text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]`}
          >
            <Check className="h-4 w-4 shrink-0" /> Done — {servicePhotos.length} photo{servicePhotos.length === 1 ? '' : 's'}
          </button>
        </Modal>
      )}

      {/* ---- Presenter modal — AUTO (AI Director casts from research) or Upload ---- */}
      {assetModal === 'avatar' && (
        <Modal title="Presenter" onClose={() => setAssetModal(null)}>
          <div className="mb-4 flex gap-2">
            <ModeTab active={presenterMode === 'auto'} onClick={() => setPresenterMode('auto')} icon={Wand2}>AI Director</ModeTab>
            <ModeTab active={presenterMode === 'upload'} onClick={() => setPresenterMode('upload')} icon={Upload}>Upload</ModeTab>
          </div>

          {presenterMode === 'auto' ? (
            <div className="space-y-4">
              {/* The pitch: cast from YOUR market, not a stock face. */}
              <div className={`border border-[#FFCC00]/30 bg-[#FFCC00]/[0.05] p-4 ${R_PANEL}`}>
                <div className="mb-1.5 flex items-center gap-2 text-[#FFCC00]">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span className={T_LABEL}>// AI Director casts it · Recommended</span>
                </div>
                <p className="text-sm leading-snug text-zinc-300">
                  Grifon's AI Director picks the perfect spokesperson for your market — cast from your live market research, not a generic stock face.
                  {isRealEstate ? ' For real estate it dresses them as a trustworthy local agent.' : isService ? ' For services it casts the right practitioner.' : ''}
                </p>
                <p className="mt-2 text-[11px] leading-snug text-zinc-500">
                  You'll meet them in your finished ad — you can swap or upload your own anytime after.
                </p>
              </div>

              {/* Advanced — pin a specific look. Hidden by default so the magic stays
                  "AI decides"; blank fields = the Director casts purely from research. */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowCastHints((v) => !v)}
                  className={`flex w-full items-center justify-between gap-2 border border-white/10 bg-zinc-950 px-4 ${CTRL_H} ${R_CTRL} ${T_LABEL} text-zinc-400 transition-colors hover:border-white/30 hover:text-white`}
                >
                  <span className="inline-flex items-center gap-2"><Settings2 className="h-3.5 w-3.5 shrink-0" /> Advanced · specify look (optional)</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${showCastHints ? 'rotate-180' : ''}`} />
                </button>
                {showCastHints && (
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      {(['Any', 'Male', 'Female'] as const).map((g) => (
                        <SegBtn key={g} active={gender === g} onClick={() => setGender(g)}>{g}</SegBtn>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <MiniInput placeholder="e.g. Filipino" value={ethnicity} onChange={setEthnicity} />
                      <MiniInput placeholder="e.g. 25-34" value={ageRange} onChange={setAgeRange} />
                    </div>
                    <p className="text-[11px] leading-snug text-zinc-500">Leave blank to let AI Director cast from your market research.</p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => { sfx.play('select'); setAssetModal(null); }}
                className={`flex w-full items-center justify-center gap-2 whitespace-nowrap ${CTRL_H} ${R_CTRL} ${T_CTRL} bg-[#FFCC00] text-black transition-all hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]`}
              >
                <Check className="h-4 w-4 shrink-0" /> Done — AI casts it
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Guide — the framing/clarity the AI reads best: head-to-chest, face fills frame, good light.
                  Full-body sources make the face too small to identity-lock (smoke Finding 2b). */}
              <p className={`text-zinc-500 ${T_LABEL}`}>// Aim for this — head-to-chest, face fills frame ↓</p>
              <div className="mx-auto grid max-w-[260px] grid-cols-2 gap-3">
                <SampleTile src={PRESENTER_EXAMPLE} caption="Head-to-chest · clear" good onZoom={setViewImage} />
                <SampleTile src={BAD_SAMPLE.src} caption={BAD_SAMPLE.caption} good={false} onZoom={setViewImage} />
              </div>
              <UploadDropzone
                thumb={avatarUrl}
                hint="Frame the presenter head-to-chest with the face clearly visible (your real agent / practitioner / yourself). Avoid full-body shots — the face gets too small to match across scenes."
                onFile={async (f) => { const d = await fileToDataUrl(f); setAvatarUrl(d); setAvatarErr(''); checkQuality('avatar', d); }}
                onClear={() => { setAvatarUrl(''); clearQuality('avatar'); }}
                onView={avatarUrl ? () => setViewImage(avatarUrl) : undefined}
              />
              {avatarErr && <p className="text-center text-[11px] text-amber-400/80">{avatarErr}</p>}
              <QualityNudge warnings={avatarUrl ? quality.avatar : undefined} />
              <button
                type="button"
                onClick={() => { sfx.play('select'); setAssetModal(null); }}
                disabled={!avatarUrl}
                className={`flex w-full items-center justify-center gap-2 whitespace-nowrap ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${
                  avatarUrl ? 'bg-[#FFCC00] text-black hover:shadow-[0_0_20px_rgba(255,204,0,0.4)]' : 'cursor-not-allowed bg-zinc-800 text-zinc-500'
                }`}
              >
                <Check className="h-4 w-4 shrink-0" /> Use this presenter
              </button>
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
  /** Fill the parent column (labeled control row) instead of shrinking on desktop. */
  fullWidth?: boolean;
}> = ({ open, onOpen, onClose, trigger, children, align = 'left', disabled, fullWidth }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose, open);
  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? onClose() : onOpen())}
        className={`inline-flex w-full items-center gap-2 border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${fullWidth ? 'justify-between' : 'justify-center md:w-auto'} ${
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
        <div className={`absolute z-40 mt-2 max-h-[70vh] overflow-y-auto border border-white/10 bg-zinc-900/90 p-3 backdrop-blur-xl ${R_PANEL} ${align === 'right' ? 'right-0' : 'left-0'} max-md:left-0 max-md:right-0`}>
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
    <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
      {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#FFCC00]" /> : <span className="h-3.5 w-3.5 shrink-0" />}
      {/* Two lines so the full identity (name + gender/age/vibe) stays visible
          instead of truncating the gender off the end of one line. */}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-xs font-medium ${selected ? 'text-[#FFCC00]' : 'text-zinc-200'}`}>{opt.name}</span>
        {opt.sub && <span className={`block truncate text-[10px] font-mono ${selected ? 'text-[#FFCC00]/70' : 'text-zinc-500'}`}>{opt.sub}</span>}
      </span>
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
  /** For guided "Assets" — number of slots filled (drives the sub-label + badge). */
  count?: number;
  /** Override the auto sub-label (e.g. the AUTO-presenter explainer). */
  sub?: string;
  /** Treat the tile as filled/active even without a thumb (e.g. AUTO presenter). */
  forceFilled?: boolean;
  onClick: () => void;
}> = ({ label, icon: Icon, thumb, busy, count, sub: subOverride, forceFilled, onClick }) => {
  const filled = forceFilled || (count !== undefined ? count > 0 : !!thumb);
  const sub = subOverride ?? (count !== undefined
    ? (count > 0 ? `${count} photo${count === 1 ? '' : 's'} · tap to edit` : 'Tap to add')
    : (thumb ? 'Tap to change' : 'Tap to add'));
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-20 items-center gap-3 overflow-hidden border px-3 text-left transition-all ${R_CTRL} ${
        filled ? 'border-[#FFCC00]/60 bg-[#FFCC00]/[0.06]' : 'border-dashed border-white/20 hover:border-[#FFCC00]/60'
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
        <span className={`mt-0.5 block text-zinc-500 ${T_LABEL}`}>{sub}</span>
      </div>
      {filled && !busy && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFCC00] text-black">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
};

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

/** Soft upload-quality nudges (dark / blurry / low-res). Advisory — renders nothing when clean. */
const QualityNudge: React.FC<{ warnings?: string[]; className?: string }> = ({ warnings, className }) => {
  if (!warnings || warnings.length === 0) return null;
  return (
    <div className={`flex flex-col gap-0.5 ${className ?? ''}`}>
      {warnings.map((w, i) => (
        <p key={i} className="flex items-start gap-1 text-[10px] leading-tight text-amber-400/80">
          <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {w}
        </p>
      ))}
    </div>
  );
};

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

/** One format option card — shared by the desktop grid and the mobile carousel. */
const FormatCard: React.FC<{
  f: (typeof FORMATS)[number];
  active: boolean;
  onChoose: () => void;
  className?: string;
}> = ({ f, active, onChoose, className }) => (
  <button
    type="button"
    disabled={f.locked}
    onClick={() => { if (!f.locked) onChoose(); }}
    className={`group relative flex flex-col overflow-hidden border text-left transition-all ${R_PANEL} ${className ?? ''} ${
      f.locked
        ? 'cursor-not-allowed border-white/5'
        : active
          ? 'border-[#FFCC00] bg-[#FFCC00]/[0.06]'
          : 'border-white/10 hover:border-white/30'
    }`}
  >
    {/* Sample preview slot — 9:16 to preview the real vertical-video shape, capped
        on mobile so the modal's CTA stays in view (empty until clips land). */}
    <div className="relative flex aspect-[9/16] max-h-[36vh] w-full items-center justify-center bg-zinc-950/60 sm:max-h-[58vh]">
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

/** Mobile format picker — snap-scrolling row with dot indicators + arrow buttons.
 * Stays one screen tall no matter how many formats land (vs. a deep vertical stack). */
const FormatCarousel: React.FC<{
  formats: typeof FORMATS;
  activeValue: Format;
  onChoose: (v: Format) => void;
}> = ({ formats, activeValue, onChoose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  const scrollToIdx = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(formats.length - 1, i));
    const child = el.children[clamped] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const ch = c as HTMLElement;
      const cc = ch.offsetLeft + ch.clientWidth / 2;
      const d = Math.abs(cc - center);
      if (d < best) { best = d; nearest = i; }
    });
    setIdx(nearest);
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {formats.map((f) => (
          <FormatCard
            key={f.value}
            f={f}
            active={activeValue === f.value}
            onChoose={() => onChoose(f.value)}
            className="w-[82%] shrink-0 snap-center"
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => scrollToIdx(idx - 1)}
          disabled={idx === 0}
          aria-label="Previous format"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all enabled:hover:border-[#FFCC00]/50 enabled:hover:text-[#FFCC00] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {formats.map((f, i) => (
            <button
              key={f.value}
              type="button"
              onClick={() => scrollToIdx(i)}
              aria-label={`Go to ${f.label}`}
              className="flex items-center justify-center p-2"
            >
              <span className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#FFCC00]' : 'w-1.5 bg-white/20'}`} />
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToIdx(idx + 1)}
          disabled={idx === formats.length - 1}
          aria-label="Next format"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition-all enabled:hover:border-[#FFCC00]/50 enabled:hover:text-[#FFCC00] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
