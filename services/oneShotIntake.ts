import type { Avatar, BusinessInfo, ClientDetails, MarketResearchReport } from '../types';

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
export interface AutopilotInput {
  brandName: string;
  offer: string;
  price: string;
  productName: string;
  productDescription: string;
  /** Hero product image (base64 / data URL) — product-in-hand for size anchoring. */
  heroImageBase64: string;
  /** Presenter locked at intake (uploaded or generated+accepted) so the run honors the user's pick. */
  avatar: Avatar;
  /** Pinoy/pinay voice id chosen at intake. */
  voiceId: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Render resolution. 720p is the only unlocked tier today; 1080p is Business-gated (UI shows LOCKED). */
  resolution?: '720p' | '1080p';
  /** Script style — derived from the Format × Strategy axes and the chosen vertical. */
  scriptType: NonNullable<BusinessInfo['scriptType']>;
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
}

/** scriptType → the Step 2 businessType gate, so Services/RealEstate verticals route to the right style. */
function businessTypeFor(scriptType: AutopilotInput['scriptType']): NonNullable<BusinessInfo['businessType']> {
  if (scriptType === 'Services') return 'service';
  if (scriptType === 'RealEstate') return 'realestate';
  return 'product';
}

/**
 * Project the MarketMind report onto the wizard fields the way Director AI's
 * auto-prefill does (App.tsx) — research is load-bearing context for the script.
 */
export function mapReportToWizard(
  input: AutopilotInput,
  report: MarketResearchReport,
): { clientDetails: ClientDetails; businessInfo: BusinessInfo } {
  // Guided verticals (Service/RealEstate) carry per-slot real photos; Product uses the single hero.
  const guided = input.servicePhotos ?? [];
  const hasGuided = guided.length > 0;
  const productImageUrls = hasGuided
    ? guided.map((p) => p.url).slice(0, 5)
    : input.heroImageBase64 ? [input.heroImageBase64] : [];
  const productImageDescription = hasGuided
    ? buildServicePhotoDescription(guided) ?? input.productDescription
    : input.productDescription;

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
      businessType: businessTypeFor(input.scriptType),
      listingPrice: input.scriptType === 'RealEstate' ? input.price : undefined,
    },
  };
}
