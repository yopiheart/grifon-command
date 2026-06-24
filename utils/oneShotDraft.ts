/**
 * oneShotDraft — in-memory snapshot of the One-Shot Ad brief.
 *
 * The One-Shot composer holds its brief in local component state, so navigating
 * away (e.g. "Clone your own voice" → Signal Modulator) would unmount it and
 * lose everything the user already filled in. This tiny module-scoped store
 * survives that detour: the composer saves a snapshot at nav-time and restores
 * it on the way back. It is deliberately in-memory only (NOT localStorage) —
 * base64 hero/avatar images would blow the storage quota, and a within-session
 * round-trip is all this needs to cover. A full page reload / defreezer wipe
 * legitimately starts fresh.
 *
 * Lifecycle: saved on the clone-voice detour → restored on the next mount →
 * cleared on launch or an explicit back-to-Command-Center.
 */
import type { BusinessInfo } from '../types';
import type { AutopilotInput } from '../services/oneShotIntake';
import type { ServiceArchetype, RealEstateArchetype } from '../components/guidedPhotoSlots';

type ServicePhoto = NonNullable<BusinessInfo['servicePhotos']>[number];

export interface OneShotDraft {
  hero: string;
  offer: string;
  brandName: string;
  price: string;
  forceFresh: boolean;
  servicePhotos: ServicePhoto[];
  serviceArchetype: ServiceArchetype;
  reArchetype: RealEstateArchetype;
  localService: boolean;
  businessAddress: string;
  vertical: string;
  format: 'ugc' | 'product_ugc' | 'commercial';
  strategy: 'Testimonial' | 'MrBeast';
  avatarMode: 'generate' | 'upload';
  gender: 'Any' | 'Male' | 'Female';
  ageRange: string;
  ethnicity: string;
  avatarUrl: string;
  avatarGens: number;
  language: AutopilotInput['language'];
  aspectRatio: AutopilotInput['aspectRatio'];
  resolution: NonNullable<AutopilotInput['resolution']>;
  voiceId: string;
}

let draft: OneShotDraft | null = null;

export const saveOneShotDraft = (d: OneShotDraft): void => { draft = d; };
export const loadOneShotDraft = (): OneShotDraft | null => draft;
export const clearOneShotDraft = (): void => { draft = null; };
