export interface ClientDetails {
  brandName: string;
  offer: string;
}

export interface VisualTheme {
  id: string;
  name: string;
  vibe: string;
  texturePrompt: string;
  colorPalette: string;
}

export interface BusinessInfo {
  product: string;
  audience: string;
  benefit: string;
  painPoint: string;
  separator: string;
  features: string;
  productImageUrls?: string[]; 
  productImageDescription?: string;
  logoImageUrl?: string;
  brandColors?: string; 
  scriptType?: 'MrBeast' | 'Testimonial' | 'Temu' | 'Custom' | 'Cinematic';
  customScriptFile?: string[];
  selectedTheme?: VisualTheme;
}

export interface Script {
  hook1: string[];
  hook2: string[];
  body: string[];
  strategicAudit?: string;
}

export interface Avatar {
    prompt: string;
    url: string;
    description: string;
    ethnicity: string;
    /* Step 4 explicit pick; uploaded avatars infer from description instead */
    gender?: 'Male' | 'Female' | 'Any';
}

export interface Scene {
  scriptLine: string;
  sceneDescription: string;
  imagePrompt?: string; 
  startFramePrompt?: string; 
  endFramePrompt?: string; 
  transitionEffect?: string; 
  imageUrl?: string;
  endFrameImageUrl?: string;
  manualUploadUrl?: string;
  manualEndFrameUrl?: string;
  referenceImage?: 'avatar' | 'product' | 'both' | 'none';
  /* chainRole tracks the position in the cinematic relay chain */
  chainRole?: 'Metaphor_A' | 'Anchor_B' | 'Action_C' | 'Hero_D';
  /* Custom B-roll injection */
  customBrollUrl?: string;
}

export interface CinematicNarrativeScene {
  phase: string;
  action: string;
  emotion: string;
}

export interface StoryboardResponse {
  scenes: Scene[];
  strategicAudit: string;
}

export interface VideoPrompt {
  scriptLine: string;
  type: 'talking' | 'b-roll' | 'cinematic';
  prompt: string;
}

/**
 * One scene's payload when routing from Generate Video → Signal Modulator
 * for batch voice generation. Carries the scriptLine to TTS plus the rendered
 * MP4 URL so the Signal Modulator's Scene Pipeline tile can bundle MP3 + MP4
 * into a single ZIP for external merge (CapCut, etc.).
 */
export interface SceneBatchEntry {
  sceneIdx: number;
  scriptLine: string;
  renderedUrl?: string;
  type: 'talking' | 'b-roll' | 'cinematic';
}

/**
 * One scene fed to the server-side voice consolidator (`api/voice/consolidate.ts`).
 * Routing is by `type`: talking → speech-to-speech on the scene MP4's audio
 * track (preserves lip-sync), b-roll → TTS on `scriptLine`, cinematic → TTS if
 * `scriptLine` is non-empty else skipped. `videoUrl` (a signed MP4 URL) is
 * required for the talking STS path; without it a talking scene falls back to
 * TTS on `scriptLine`.
 */
export interface ConsolidationScene {
  sceneIdx: number;
  type: 'talking' | 'b-roll' | 'cinematic';
  scriptLine: string;
  videoUrl?: string;
}

/** One spoken word with its measured time window (seconds, relative to the
 * scene's VO MP3 start). From ElevenLabs forced alignment — REAL timings, not
 * the char-weight estimates the caption engine falls back to. */
export interface VoiceWord {
  text: string;
  start: number;
  end: number;
}

/**
 * Per-scene result of voice consolidation. `audioUrl` is a 24h Supabase-signed
 * MP3 URL (never a browser `blob:` URL — the render path must be server-reachable).
 * `audioUrl` is null when the scene was `skipped` (visual-only) or hit an `error`.
 * `words` is the forced-alignment of the scene's scriptLine against the produced
 * MP3 (works for both TTS and STS paths); absent when alignment failed — caption
 * timing then falls back to estimates.
 */
export interface ConsolidationResult {
  sceneIdx: number;
  audioUrl: string | null;
  words?: VoiceWord[];
  skipped?: boolean;
  error?: string;
}

/**
 * One scene fed to the final-render executor (`api/render/final.ts`). Pairs the
 * silent scene MP4 with its consolidated voice MP3 (Phase 1 output).
 *
 * Trim policy (deterministic per-type cap — Phase 1 fix):
 * - `keepFullClip` true (the hook): keep the whole clip so the product-reveal
 *   end-frame survives; the short VO is padded with trailing silence.
 * - `targetDurationSec` set (talking + regular b-roll): hard-cap the clip to the
 *   spoken-length estimate, cutting Veo's filler tail (which silencedetect can't).
 * - else `audioUrl` present: legacy silencedetect fallback.
 * - else `fallbackDurationSec` / full clip.
 */
export interface FinalRenderScene {
  sceneIdx: number;
  videoUrl: string;
  audioUrl?: string | null;
  /** Hard cap (sec) from the spoken-length estimate; cuts Veo filler tails. */
  targetDurationSec?: number | null;
  /** Keep the full clip (hook): preserves the visual reveal; pads short audio. */
  keepFullClip?: boolean;
  fallbackDurationSec?: number;
  // ---- Burn-in (from the EDL; times are scene-relative, clamped to the trim) ----
  /** Hook/callout/subtitle/punchline text burned via ffmpeg drawtext. */
  overlayText?: OverlayText[];
  /** Beat-aligned SFX cues mixed in at their anchorSec. */
  sfxCues?: SfxCue[];
  /** Planned transition INTO this scene. Threaded now; not yet rendered (Slice B). */
  transitionIn?: { type: TransitionType; durationSec: number };
  /** EDL camera-effect hint — rendered as a preset-gated zoom/pan/punch burn-in. */
  cameraEffect?: CameraEffect;
  // ---- Overlay/caption engine inputs ----
  /** Spoken line for this scene → drives the auto-captions (scenes 2+). */
  scriptLine?: string;
  /** Scene type from the batch — picks the caption band (talking→face-clear). */
  sceneType?: 'talking' | 'b-roll' | 'cinematic';
  /** Scene 1 = the hook (slide-up reveal + crimson wipe-box on the last word). */
  isHook?: boolean;
  /** Face-clear band (fractions of height) from browser detection; caption goes here. */
  captionRegion?: { yFracTop: number; yFracBottom: number };
  /** Measured word timings for this scene's VO (forced alignment). When present,
   * caption chunks pace on REAL speech times; absent → even-spread estimate. */
  voiceWords?: VoiceWord[];
}

/** End-card burn-in for the LAST scene: the offer recap line.
 * Price-anchor callout removed 2026-06-13 (Neil): PH advertisers hide price in
 * ads to drive curiosity DMs — and the fixed-band overlay sat on the
 * presenter's face. Don't reintroduce without a face-aware placement AND a
 * marketing case. */
export interface FinalRenderEndCard {
  /** Offer recap line, e.g. "FIRST 50: FREE DRIP BAG". Prefilled from the wizard offer. */
  recapText?: string;
}

export interface FinalRenderRequest {
  scenes: FinalRenderScene[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Style-keyed background-music bed (chosen in code from EDL meta.scriptStyleDetected).
   * `bedUrl` (optional) is a generated bed from api/music/compose; when present and
   * reachable it overrides the static `style` bed, else the render falls back to it. */
  music?: { style: 'mrbeast' | 'temu' | 'testimonial'; enabled: boolean; bedUrl?: string };
  /** Explicit edit-style override; absent → server rotates deterministically. */
  preset?: { id?: 'classic' | 'impact' | 'hype' | 'clean' };
  /** Offer-recap overlay held to the end of the last scene. */
  endCard?: FinalRenderEndCard;
}

/** Returned immediately by the fire endpoint; the client polls with this jobId. */
export interface FinalRenderJob {
  jobId: string;
}

/** Request to api/music/compose: generate (or reuse) an instrumental bed for an ad.
 * `videoUrls` are the ad's scene clips — the server derives the per-ad cache seed
 * from them (rotationSeed), identical to the render. */
export interface MusicComposeRequest {
  style: 'mrbeast' | 'temu' | 'testimonial';
  videoUrls: string[];
  lengthMs: number;
}

/** Response from api/music/compose. `cached` is true when an existing per-ad bed
 * was reused (no generation, no quota consumed). */
export interface MusicComposeResponse {
  bedUrl: string;
  cached: boolean;
}

export type FinalRenderStatus = 'processing' | 'done' | 'failed';

/** Poll result + persisted status sidecar (gemini-videos/${uid}/final/${jobId}.status.json). */
export interface FinalRenderResult {
  done: boolean;
  status?: FinalRenderStatus;
  url?: string;
  downloadUrl?: string;
  error?: string;
}

export interface AllData {
    clientDetails: ClientDetails;
    businessInfo: BusinessInfo;
    finalScript: string[];
    avatar: Avatar | null;
    storyboard: Scene[];
    videoPrompts: VideoPrompt[];
    thumbnailUrl?: string | null;
    aspectRatio?: '9:16' | '16:9' | null;
}

export interface MarketResearchInput {
  brandName?: string;
  productName: string;
  productDescription: string;
  priceOffer: string;
  isLocalService: boolean;
  businessAddress?: string; // Required if isLocalService is true
  uploadedImages: string[]; // Array of Base64 strings
}

export interface MarketResearchHook {
  type: 'Pattern Interrupt' | 'Direct Pain' | 'Result Reveal' | 'Question' | 'Before-After';
  visual: string;
  spokenLine: string;
}

export interface MarketResearchCompetitor {
  competitor: string;
  weakness: string;
  exploitationAngle: string;
}

export interface MarketResearchAdAngle {
  format: 'UGC' | 'Testimonial' | 'Founder POV' | 'Demo' | 'Reaction';
  angle: string;
  openingLine: string;
  whyItWorks: string;
}

export interface MarketResearchGraveyardEntry {
  tried: string;
  whyFailed: string;
}

/**
 * Structured output from MarketMind (generateMarketResearch).
 * Every field is consumed programmatically by Director AI, Influencer Forge,
 * and Caption & Headline. The narrativeReport field carries a markdown render
 * of all sections combined — that's what the user reads in the UI.
 */
export interface MarketResearchReport {
  // CORE
  subject: string;
  winningAvatar: string;
  // 1. DEEP DIVE AVATAR
  demographics: string;
  dayInTheLife: string;
  // 2. BLEEDING NECK
  bleedingNeck: string;
  deepFear: string;
  threeAmThought: string;
  // 3. GRAVEYARD
  graveyard: MarketResearchGraveyardEntry[];
  objectionToUs: string;
  // 4. HEAVEN ISLAND
  magicGenie: string;
  emotionalPayoff: string;
  statusUpgrade: string;
  // 5. BIG IDEA (Sabri Suby Big Domino)
  bigIdea: string;
  // 6. HEADLINES (5, ordered: pain | dream | curiosity | social-proof | contrarian)
  headlines: string[];
  // 7. VIDEO HOOKS (5, one of each type)
  videoHooks: MarketResearchHook[];
  // 8. VILLAIN
  villain: string;
  // 9. COMPETITOR MATRIX (3)
  competitorMatrix: MarketResearchCompetitor[];
  // 10. FB AD LIBRARY ANGLES (3, ready-to-brief Director AI)
  fbAdLibraryAngles: MarketResearchAdAngle[];
  // EVIDENCE & EDGE
  rawEvidence: string[];
  contrarianTruth: string;
  // RENDERED NARRATIVE (human-readable markdown of all sections)
  narrativeReport: string;
}

export interface OfferOptimizerInput {
  productName: string;
  currentPrice: string;
  targetAudience: string; // Brief description or from market research
  marketResearchText: string; // Content from uploaded file or pasted text
  language: 'English' | 'Taglish';
}

export interface OfferTierValueStackItem {
  item: string;
  value: string; // "₱X,XXX"
}

export interface OfferTierHormoziLogic {
  dreamOutcome: string;    // What they get
  likelihood: string;      // Why this delivers
  timeDelay: string;       // Speed to result
  effort: string;          // What they DON'T have to do
}

export interface OfferTier {
  name: string;                                // Mechanism name (e.g., "The 7-Day Niche Ladder")
  pitch: string;                               // 1-2 sentence production-ready pitch
  valueStack: OfferTierValueStackItem[];
  totalValue: string;                          // "₱X,XXX" — anchor
  actualPrice: string;                         // "₱X,XXX" — real number, no [placeholders]
  noBrainerLogic: string;                      // Why this is a steal
  scarcity: string;                            // Concrete window/quantity, no [placeholders]
  guarantee: string;                           // Risk reversal copy
  hormoziLogic: OfferTierHormoziLogic;
  probability: 'High' | 'Medium' | 'Low';
}

export interface OfferConversionAssets {
  brandName: string;
  productServiceList: string[];
  target: string;
  achieveOrEliminate: string;
  mainBenefit: string;
  mainProblem: string;
  mainPainPoint: string;
  mainDifferentiator: string;
  mainFeatures: string[];
  brandPalette: string[];                      // hex codes
}

/**
 * Bridge handoff: the projection of an Offer Stack into Director AI wizard fields.
 * Read by App.tsx auto-prefill (clientDetails.offer + BusinessInfo) when the wizard is pristine.
 */
export interface DirectorPayload {
  offer: string;                               // 1-2 sentence pitch → clientDetails.offer
  productName: string;                         // → BusinessInfo.product
  targetAudience: string;                      // → BusinessInfo.audience
  mainBenefit: string;                         // → BusinessInfo.benefit
  painPoint: string;                           // → BusinessInfo.painPoint
  usp: string;                                 // → BusinessInfo.separator
}

/**
 * Structured output from Offer Optimizer (generateOfferOptimization).
 * Each OfferTier carries its Hormozi rationale + concrete pricing/scarcity/guarantee.
 * directorPayload feeds the Director AI auto-prefill when the user clicks Send to Director.
 */
export interface OfferOptimizerResult {
  analysis: string;                            // Pricing/CPA rationale paragraph
  tripwire: OfferTier;
  coreOffer: OfferTier;
  highTicket: OfferTier;
  conversionAssets: OfferConversionAssets;
  directorPayload: DirectorPayload;
}

export interface VideoEditInput {
  scriptText: string; // From file upload or text area
  sceneImages: string[]; // Array of base64 strings (Screenshots/Keyframes)
  instructions?: string; // Optional user notes
}

/**
 * Remotion AI Editor — Phase 1 half (a) types.
 *
 * Drives the upgraded "From Render Batch" mode of [EditVideo]: takes the
 * rendered scene MP4s from [SceneBatchEntry] plus the matching Signal
 * Modulator audio outputs and returns a machine-actionable Edit Decision
 * List that Phase 2's Remotion executor will consume verbatim.
 *
 * The brain function `generateEditDecisionList` is currently a STUB that
 * returns a hardcoded fixture EDL. Phase 1 half (b) replaces the stub with
 * a real Gemini call once the TUNED prompt is signed off.
 */
export type SfxBankId =
  | 'whoosh'
  | 'glitch'
  | 'pop'
  | 'ding'
  | 'riser'
  | 'drop'
  | 'snap'
  | 'swish'
  | 'boom'
  | 'sparkle';

export type TransitionType = 'cut' | 'flash' | 'whip' | 'zoom' | 'particles';

export type CameraEffect = 'zoom-in' | 'zoom-out' | 'pan' | 'shake' | 'none';

export type OverlayStyle = 'hook' | 'callout' | 'subtitle' | 'punchline';

export type OverlayPosition = 'top' | 'center' | 'bottom';

export type EditTargetPlatform = 'tiktok' | 'reels' | 'shorts' | 'youtube';

export interface OverlayText {
  text: string;
  startSec: number;
  endSec: number;
  style: OverlayStyle;
  position: OverlayPosition;
}

export interface SfxCue {
  sfxId: SfxBankId;
  anchorSec: number;
  reason: string;
}

export interface EditScene {
  sceneIdx: number;                 // Matches SceneBatchEntry.sceneIdx
  sourceVideoUrl: string;           // From SceneBatchEntry.renderedUrl
  sourceAudioUrl: string;           // From audioOverlays
  keepSegments: { startSec: number; endSec: number }[]; // What to KEEP from source
  voiceOffsetSec: number;           // Where new voice starts in output timeline
  transitionIn?: { type: TransitionType; durationSec: number };
  overlayText?: OverlayText[];
  sfxCues?: SfxCue[];
  cameraEffect?: CameraEffect;
  notes: string;
}

export interface EditDecisionInput {
  sceneBatch: SceneBatchEntry[];
  audioOverlays: { sceneIdx: number; audioUrl: string }[];
  finalScript: string;
  storyboard?: Scene[];
  targetPlatform: EditTargetPlatform;
  aspectRatio: '9:16' | '16:9' | '1:1';
  brandContext?: { brandName: string; voiceTone: string };
}

export interface EditDecisionList {
  meta: {
    totalDurationSec: number;
    aspectRatio: '9:16' | '16:9' | '1:1';
    targetPlatform: EditTargetPlatform;
    hookStrategy: string;
    formulaApplied: ('mrbeast' | 'sabri-suby' | 'cialdini')[];
    scriptStyleDetected: 'mrbeast' | 'temu' | 'testimonial';
  };
  scenes: EditScene[];
  globalSfxPicks: SfxBankId[];
  formulaCheck: {
    rulesApplied: string[];
    weaknessesFlagged: string[];
  };
}

export interface ImageEditorInput {
  userDescription: string;
  uploadedImages: string[]; // Base64 strings
  aspectRatio: '1:1' | '4:5' | '3:4' | '16:9' | '9:16';
  quality: '1k'; // Fixed to 1k
}

export interface OptimizedPromptResponse {
  purpose: string;
  finalPrompt: string;
  notes: string;
}

export interface CaptionHeadlineInput {
  adFiles: string[]; // Base64 Array
  adFileType: 'image' | 'video';
  marketResearchText: string;
  language: 'English' | 'Taglish';
}

export interface DayContent {
  day: number;
  title: string;
  imagePrompt: string;
  caption: string;
  emotionVibe: string;
  logoPlacement: string;
  productPlacement: string;
  imageUrl?: string;
}

export interface AdVariant {
  id: number;
  templateType: "Press Clip" | "Benefit Anatomy" | "Split-Screen";
  headline: string;
  imagePrompt: string;
  caption: string;
  hookLogic: string;
  imageUrl?: string;
}

export interface UplinkData {
  brandIdentityName: string;
  originalPrice: string;
  offerPrice: string;
  inventoryList: string;
  targetDemographic: string;
  ageRange: string;
  ethnicityProfile: string;
  primaryBenefit: string;
  problemSolved: string;
  marketPainPoint: string;
  uvp: string;
  keyFeatures: string;
  hexCodes: string;
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  resolution: '1K' | '2K';
  language: 'ENGLISH' | 'TAGLISH';
  logoAsset?: string;
  productAssets: string[];
  avatarAsset?: string;
}

export interface CinematicSpecConfig {
  sideAsset: string;      // Slot 1: SIDE_PROFILE
  frontAsset: string;     // Slot 2: FRONT_PERSPECTIVE
  heroAsset: string;      // Slot 3: HERO_FINALE
  macroAsset?: string;    // Slot 4: MACRO_DETAIL
  logoAsset?: string;     // Slot 5: BRAND_LOGO
  camera: 'RED V RAPTOR' | 'SONY VENICE' | 'IMAX 70MM' | 'ARRI ALEXA 35' | 'PANAVISION DXL2' | 'ARRIFLEX 16SR';
  lens: 'Lensbaby' | 'Hawk V-Lite' | 'Laowa Macro' | 'Canon K-35' | 'Panavision C-Series' | 'Cooke S4' | 'Petzval' | 'Helios' | 'Zeiss Ultra Prime';
  focalLength: '8mm' | '14mm' | '24mm' | '50mm';
  aspectRatio: '9:16' | '1:1' | '16:9';
  resolution: '1K' | '2K' | '4K';
  concept: string; 
  subjectFilter: 'product' | 'lifestyle';
}

export type MonetizationGame = 'MEDIA_GAME' | 'COMMODITY_VIBE' | 'PRODUCT_EDUCATION' | 'B2B_AUTHORITY';

export interface InfluencerConfig {
  sourceType: 'UPLOAD' | 'NEURAL_GEN';
  uploadedPhoto?: string; // Base64
  gender: 'MALE' | 'FEMALE' | 'ANY';
  ethnicity: 'Filipino/Asian' | 'Caucasian' | 'Latino' | 'African' | 'European';
  ageRange: string;
  wardrobe: 'PROFESSIONAL' | 'CASUAL' | 'STREETWEAR' | 'ELEGANT' | 'MINIMALIST';
  brandColor: string;
  environment: 'OUTDOOR' | 'OFFICE' | 'INDOOR' | 'MATCH_UPLOAD';
  lightingPreset: 'AUTHORITY' | 'NEON_VLOG' | 'NATURAL_STUDIO' | 'DARK_MINIMALIST';
  studioColor?: string; // Hex for background lights
  camera: 'IPHONE_15_PRO' | 'SONY_A7IV' | 'RED_KOMODO';
  lens?: '35MM_VLOG' | '50MM_PRIME' | '85MM_CINEMATIC';
  aspectRatio: '9:16' | '4:5' | '1:1' | '16:9';
  quality: '1K' | '2K' | '4K';
  language?: 'ENGLISH' | 'TAGLISH' | 'FILIPINO';
  archetype?: 'AUTHORITY' | 'STORYTELLER' | 'TREND_HACKER';
  format?: 'SHORT_FORM' | 'LONG_FORM';
  monetizationGame?: MonetizationGame;
}

export interface OdysseyDay {
  dayNumber: number;
  mission: string;
  status: 'LOCKED' | 'PENDING' | 'SYNTHESIZED';
  script?: InfluencerScriptResponse;
  storyboard?: Scene[];
}

export interface OdysseyState {
  currentDay: number;
  game: MonetizationGame;
  seriesContext: string;
  history: OdysseyDay[];
}

export interface InfluencerStrategicInput {
  subject: string;
  offer: string;
  dreamCustomer: string;
  bleedingNeck: string;
  deepFear: string;
  magicGenie: string;
  rawEvidence: string;
  contrarianTruth: string;
}

export interface InfluencerScriptResponse {
  hook: string;
  body: string[];
  strategicAudit: string;
  daySummary?: string; // For series context continuity
}

export interface CinematicStudioResponse {
  images: {
    metaphor: string;
    anchor: string;
    action: string;
    hero: string;
  };
  prompts: {
    metaphor: string;
    anchor: string;
    action: string;
    hero: string;
  };
  soundscape: string;
}

export type VideoModelType =
  | 'Veo_3.1_Fast'
  | 'Veo_3.1_Quality'
  | 'Veo_3.1_Lite'
  | 'Kling_3_0'
  | 'Kling_O1'
  | 'Seedance_2_0_Fast'
  | 'Seedance_2_0_Quality';

export interface VideoGenConfig {
  model: VideoModelType;
  duration: number;
  resolution: string;
  aspectRatio: string;
  audioEnabled: boolean;
  prompt: string;
  startFrame?: string;
  endFrame?: string;
  elements: string[]; // Array of base64 strings
}

export interface VideoLibraryItem {
  path: string;
  url: string;
  downloadUrl: string;
  /** Tiny first-frame JPEG (signed). Lets the gallery show a thumbnail without
   * downloading the full MP4. Absent on older renders / when extraction failed. */
  posterUrl?: string;
  mimeType: string;
  prompt: string;
  sceneIdx?: number;
  model?: VideoModelType;
  aspectRatio?: string;
  duration?: number;
  createdAt: string;
  sizeBytes?: number;
}

// --- SIGNAL_MODULATOR TYPES ---
export type StabilityMode = 'creative' | 'natural' | 'robust';

export interface StockVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  labels?: { language?: string; gender?: string; accent?: string; [k: string]: unknown };
}

export interface UserVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  description?: string;
  created_at: string;
}

export interface LibraryVoice {
  voice_id: string;
  name: string;
  preview_url?: string;
  description?: string;
}

export interface VoiceLibrary {
  stockVoices: StockVoice[];
  myVoices: UserVoice[];
  libraryVoices: LibraryVoice[];
  quotaUsed: number;
  quotaMax: number;
}

export type BudgetPlan = 'free' | 'creator' | 'pro' | 'business';

export interface BudgetBucket {
  used: number;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export interface BudgetStatus {
  plan: BudgetPlan;
  tts: BudgetBucket;
  sts: BudgetBucket;
  clone: BudgetBucket;
}

export interface HistoryTake {
  id: string;
  kind: 'tts' | 'voice-changer';
  voiceId: string;
  voiceName: string;
  text?: string;
  sourceFile?: string;
  sourceLabel?: string;
  stabilityMode: StabilityMode;
  audioUrl: string;
  createdAt: number;
  regensRemaining: number;
}

export interface TtsRequest {
  voiceId: string;
  text: string;
  stabilityMode: StabilityMode;
}

export interface VoiceChangerRequest {
  voiceId: string;
  sourceFile: string;
  stabilityMode: StabilityMode;
}

export interface CloneVoiceRequest {
  voiceName: string;
  description?: string;
  consent: true;
  audio: string;
}

export interface CloneVoiceResponse {
  voice_id: string;
  voice_name: string;
}