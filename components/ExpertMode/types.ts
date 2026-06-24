import type { ServiceArchetype, RealEstateArchetype, ServiceSlot } from '../guidedPhotoSlots';
import type { ExpertBusinessType, ExpertFormatId } from '../../utils/scriptGuardrails';
import type { ClientDetails, BusinessInfo } from '../../types';

export type { ExpertBusinessType };

export interface ExpertServicePhoto {
  url: string;
  slot: ServiceSlot;
  description?: string;
}

/**
 * Everything the slim Expert-Mode intake collects (slice 3). Mirrors the One-Shot brief minus the
 * 5 persuasion fields (the expert's own script encodes those) and minus Market Research. Consumed
 * by Script Studio (slice 4) + the generation wiring (slice 5).
 */
export interface ExpertIntake {
  businessType: ExpertBusinessType;
  /** Brand identity — used for CTA + identity-lock, NOT a persuasion field. */
  brandName: string;
  /** Product / offer name — the subject the storyboard locks onto. */
  productName: string;

  // Product vertical: a single product-in-hand hero photo.
  productHeroUrl?: string;
  productHeroDescription?: string;

  // Service / RealEstate verticals: guided per-slot real photos (the slot IS the tag).
  servicePhotos: ExpertServicePhoto[];
  serviceArchetype: ServiceArchetype;
  realEstateArchetype: RealEstateArchetype;

  // Presenter — AUTO (AI Director casts) or an uploaded avatar.
  presenterMode: 'auto' | 'upload';
  avatarUrl?: string;
  castGender: 'Any' | 'Male' | 'Female';
  castAge?: string;
  castEthnicity?: string;

  // Settings.
  aspectRatio: '9:16' | '16:9';
  language: 'Taglish' | 'English';
  voiceId?: string;
}

export const emptyExpertIntake = (): ExpertIntake => ({
  businessType: 'product',
  brandName: '',
  productName: '',
  servicePhotos: [],
  serviceArchetype: 'venue',
  realEstateArchetype: 'listing',
  presenterMode: 'auto',
  castGender: 'Any',
  aspectRatio: '9:16',
  language: 'Taglish',
});

/** Intake is ready to proceed: identity + a presenter. Assets are recommended but not blocking. */
export const intakeReady = (i: ExpertIntake): boolean =>
  i.brandName.trim().length > 0 &&
  i.productName.trim().length > 0 &&
  (i.presenterMode === 'auto' || !!i.avatarUrl);

export type ShotIntent = 'auto' | 'talking-avatar' | 'b-roll' | 'product-highlight' | 'avatar-product';

/**
 * Per-scene direction the expert sets in Scene Direction (slice 5). Maps 1:1 to the script lines.
 * 'auto' shotIntent + empty description = let the AI Director decide (current behaviour).
 */
export interface SceneDirection {
  shotIntent: ShotIntent;
  /** Optional plain-language "direct this scene" note → optimizeImagePrompt → userImagePromptOverride. */
  description: string;
  /** Optional "anchor your own photo" for this scene → Scene.manualUploadUrl (skips AI render). */
  manualUploadUrl?: string;
}

export const emptySceneDirection = (): SceneDirection => ({ shotIntent: 'auto', description: '' });

/**
 * Project the slim intake onto the wizard's ClientDetails + BusinessInfo so the existing
 * generateStoryboard / render / video-prompt chain consumes it unchanged. The 5 persuasion fields
 * are intentionally blank — the expert's own script encodes them (R1: generateStoryboard tolerates
 * empty audience/benefit; product identity rides on productName + the asset photos).
 */
export const buildExpertWizardState = (
  intake: ExpertIntake,
  formatId: ExpertFormatId,
): { clientDetails: ClientDetails; businessInfo: BusinessInfo } => {
  // Hero-first product image list: the single product hero, else the guided slot photos.
  const productImageUrls = intake.productHeroUrl
    ? [intake.productHeroUrl]
    : intake.servicePhotos.map((p) => p.url);

  return {
    clientDetails: { brandName: intake.brandName, offer: intake.productName },
    businessInfo: {
      product: intake.productName,
      audience: '', benefit: '', painPoint: '', separator: '', features: '',
      productImageUrls,
      productImageDescription: intake.productHeroDescription,
      scriptType: formatId,
      businessType: intake.businessType,
      servicePhotos: intake.servicePhotos,
      serviceArchetype: intake.serviceArchetype,
      realEstateArchetype: intake.realEstateArchetype,
    },
  };
};
