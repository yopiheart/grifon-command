import type { ServiceArchetype, RealEstateArchetype, ServiceSlot } from '../guidedPhotoSlots';
import type { ExpertBusinessType } from '../../utils/scriptGuardrails';

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
