import type { AdReferenceBrief, Avatar, BusinessInfo, ClientDetails, MarketResearchReport } from '../types';

/** Slot-labeled description block from the guided photos — mirrors advanced mode's
 * buildServiceDescription so the per-scene router reads the same shape. Kept inline
 * to keep this module pure (no React/component imports). */
const buildServicePhotoDescription = (
  photos: NonNullable<BusinessInfo['servicePhotos']>,
): string | undefined =>
  photos.length ? photos.map((p) => `[${p.slot}] ${(p.description ?? '').trim()}`).join('\n\n') : undefined;

/**
 * Light intake layer for the One-Shot Ad module. Holds the intake payload type
 * and the pure projection from a MarketMind report → wizard state. Salvaged from
 * the (retired) autopilotOrchestrator so the One-Shot intake UI can drive main's
 * client-side `useOneShotGeneration` chain WITHOUT the heavy server-side engine.
 *
 * No service imports here — this stays a pure, unit-testable module.
 */

/** Everything the intake form (LaunchScreen) collects: 3 hero inputs + Customize-drawer defaults. */
export interface ProductionInput {
  brandName: string;
  offer: string;
  price: string;
  productName: string;
  productDescription: string;
  /** Hero product image (base64 / data URL) — product-in-hand for size anchoring. */
  heroImageBase64: string;
  /** AI-written visual description of the hero photo, captured at upload by
   * `describeBusinessAsset` (the same call the guided slot uploads already make).
   * Optional and best-effort: when it is absent the mapping falls back to
   * `productDescription`, which is what every run did before this field existed. */
  heroDescription?: string;
  /** Presenter locked at intake. When `avatar.url` is set (the user uploaded one)
   * the run honors it; when empty the user chose AUTO and AI Director casts the
   * spokesperson from the research persona post-research (see `castHints`). */
  avatar: Avatar;
  /** AUTO-cast demographic hints — optional constraints that shape AI Director's
   * casting when the user didn't upload a presenter. Ignored once `avatar.url` is set. */
  castHints?: { gender: 'Male' | 'Female' | 'Any'; ageRange: string; ethnicity: string };
  /** Pinoy/pinay voice id chosen at intake. */
  voiceId: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Script style — derived from the Format × Strategy axes and the chosen vertical. */
  scriptType: NonNullable<BusinessInfo['scriptType']>;
  /** The chosen vertical's businessType, emitted straight from LaunchScreen's `vertical`
   * state. When present it WINS over the scriptType-derived fallback, so a UGC Pro pick on
   * a service/real-estate vertical routes to the right style instead of always 'product'. */
  businessType?: 'product' | 'service' | 'realestate';
  /** UGC Pro sub-format when the user picked one explicitly (Try-On / Unboxing / Demo /
   * Transformation / Tutorial). Undefined on the 'Auto' choice so the server classifies the
   * sub-format from the brief. */
  ugcProFormat?: 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial';
  /** UGC Pro: audio-led ASMR flavor (whispered register, minimal VO). Off by default; carried
   * onto businessInfo.asmrFlag by mapReportToWizard. */
  asmrFlag?: boolean;
  /** Audio identity. Absent/'voiceover' = today's TTS pipeline. 'sfx_only' = NO voiceover:
   * music leads, SFX + burned overlay text carry the message (the Pure Hype recipe). */
  audioMode?: 'voiceover' | 'sfx_only';
  /** Phase 2: guided per-slot real photos for Service/RealEstate verticals (the slot IS the tag).
   * Feeds the per-scene real-photo router. Empty/absent for Product (which uses heroImageBase64). */
  servicePhotos?: BusinessInfo['servicePhotos'];
  /** Which beat the Service ad leads with (venue|work|practitioner). */
  serviceArchetype?: BusinessInfo['serviceArchetype'];
  /** Which beat the RealEstate ad leads with (listing|agent|developer). */
  realEstateArchetype?: BusinessInfo['realEstateArchetype'];
  /** Local-business research toggle (Service: user checkbox; RealEstate: always true). */
  isLocalService?: boolean;
  /** Service venue / property location — feeds local Market Research grounding. */
  businessAddress?: string;
  /** When true, ignore any cached market research for this product and run fresh (intake "Re-research"). */
  forceFreshResearch?: boolean;
  /** Optional reviewed reference packet; kept separate from generated research. */
  referenceBrief?: AdReferenceBrief;
}

export interface PresenterResolution {
  avatar: Avatar;
  derivedFromAfter: boolean;
}

/** Keep a person-state transformation on one face when Presenter is still Auto. */
export function resolvePersonStatePresenter(input: Pick<ProductionInput, 'avatar' | 'servicePhotos'>): PresenterResolution {
  if (input.avatar?.url) return { avatar: input.avatar, derivedFromAfter: false };
  const photos = input.servicePhotos ?? [];
  const hasBefore = photos.some((photo) => photo.slot === 'before' && photo.url);
  const after = photos.find((photo) => photo.slot === 'after' && photo.url);
  if (!hasBefore || !after) return { avatar: input.avatar, derivedFromAfter: false };
  return {
    avatar: {
      prompt: '',
      url: after.url,
      description: after.description?.trim() || "The person in the user's After photo",
      ethnicity: input.avatar?.ethnicity ?? '',
      gender: input.avatar?.gender ?? 'Any',
    },
    derivedFromAfter: true,
  };
}

/** The vertical's businessType gate, so Services/RealEstate verticals route to the right style.
 * An explicit `input.businessType` (emitted by LaunchScreen's vertical) WINS; otherwise fall
 * back to today's scriptType derivation (Services/RealEstate), defaulting to 'product'. */
function businessTypeFor(input: ProductionInput): NonNullable<BusinessInfo['businessType']> {
  if (input.businessType) return input.businessType;   // vertical wins when supplied
  if (input.scriptType === 'Services') return 'service';
  if (input.scriptType === 'RealEstate') return 'realestate';
  return 'product';
}

/**
 * Project the MarketMind report onto the wizard fields the way Director AI's
 * auto-prefill does (App.tsx) — research is load-bearing context for the script.
 */
export function mapReportToWizard(
  input: ProductionInput,
  report: MarketResearchReport,
): { clientDetails: ClientDetails; businessInfo: BusinessInfo } {
  // Guided verticals (Service/RealEstate) carry per-slot real photos; Product uses the single hero.
  const guided = input.servicePhotos ?? [];
  const hasGuided = guided.length > 0;
  const productImageUrls = hasGuided
    ? guided.map((p) => p.url).slice(0, 5)
    : input.heroImageBase64 ? [input.heroImageBase64] : [];
  // `productImageDescription` is consumed as a description of what the product LOOKS LIKE —
  // buildStoryboardPrompt reads it as the writer's only clue about physical form, and the
  // storyboard flow is text-only (api/gemini/text.ts sends `contents: prompt`, no image), so
  // whatever lands here is all the writer will ever know. The guided verticals already fill it
  // from describeBusinessAsset. The Product path used to fall straight through to
  // `productDescription`, which LaunchScreen sets to the OFFER — so a skincare run was told its
  // product "looks like" a ₱499 launch promo, and the storyboard invented a retail box to fill
  // the gap (run apr_fa7cedc3, scene 8). Prefer the hero's real description; fall back only
  // when the best-effort describe produced nothing.
  const productImageDescription = hasGuided
    ? buildServicePhotoDescription(guided) ?? input.productDescription
    : input.heroDescription?.trim() || input.productDescription;

  return {
    clientDetails: { brandName: input.brandName, offer: input.offer },
    businessInfo: {
      product: input.productName,
      audience: report.winningAvatar || report.demographics || '',
      benefit: report.emotionalPayoff || report.magicGenie || input.offer,
      painPoint: report.bleedingNeck || report.threeAmThought || '',
      separator: report.contrarianTruth || report.villain || '',
      features: input.productDescription,
      productImageUrls,
      productImageDescription,
      servicePhotos: hasGuided ? guided : undefined,
      serviceArchetype: input.serviceArchetype,
      realEstateArchetype: input.realEstateArchetype,
      scriptType: input.scriptType,
      ugcProFormat: input.ugcProFormat,
      asmrFlag: input.asmrFlag,
      businessType: businessTypeFor(input),
      listingPrice: input.scriptType === 'RealEstate' ? input.price : undefined,
    },
  };
}
