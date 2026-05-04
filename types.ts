export interface ClientDetails {
  brandName: string;
  offer: string;
  services: string;
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
  goal: string;
  benefit: string;
  problem: string;
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
  referenceImage?: 'avatar' | 'product' | 'none';
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
  productName: string;
  productDescription: string;
  priceOffer: string;
  isLocalService: boolean;
  businessAddress?: string; // Required if isLocalService is true
  uploadedImages: string[]; // Array of Base64 strings
}

export interface OfferOptimizerInput {
  productName: string;
  currentPrice: string;
  targetAudience: string; // Brief description or from market research
  marketResearchText: string; // Content from uploaded file or pasted text
  language: 'English' | 'Taglish';
}

export interface VideoEditInput {
  scriptText: string; // From file upload or text area
  sceneImages: string[]; // Array of base64 strings (Screenshots/Keyframes)
  instructions?: string; // Optional user notes
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

export type VideoModelType = 'Kling_O1' | 'Kling_2.5_Turbo' | 'Kling_2.6' | 'Veo_3.1_Fast' | 'Veo_3.1_Quality' | 'Veo_3.1_Lite';

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