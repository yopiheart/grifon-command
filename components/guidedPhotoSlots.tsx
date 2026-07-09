import React, { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import type { BusinessInfo } from '../types';

/**
 * Shared per-archetype guided-photo slot system (Phase 2). The single source of
 * truth for the Service/RealEstate upload slots, their Bryan-facing archetype
 * labels, the curated `/examples/*.png` reference shots, and the keyword
 * archetype inference. Consumed by the One-Shot composer's guided product modal
 * and (to dedup) the advanced-mode [Step2BusinessInfo].
 *
 * The slot a user drops into IS the photo's tag (implicit-by-slot
 * classification) → drives per-scene real-photo routing downstream. List order
 * is hero-first (productImageUrls is synced in this order for back-compat).
 *
 * NOTE: Step2BusinessInfo.tsx still defines an identical copy locally; fold it
 * into this module in a follow-up once advanced mode can be re-verified live.
 */

export type ServiceArchetype = NonNullable<BusinessInfo['serviceArchetype']>;
export type RealEstateArchetype = NonNullable<BusinessInfo['realEstateArchetype']>;
export type ServiceSlot = NonNullable<BusinessInfo['servicePhotos']>[number]['slot'];

export interface ArchetypeMeta {
  label: string;
  sub: string;
  lead: string;
  samples: { src: string; caption: string }[];
}
export interface UploadSlot {
  slot: ServiceSlot;
  label: string;
  hint: string;
  /** Per-slot reference example shown dimmed in the empty tile (tap to zoom). */
  example?: string;
}

/** Product (single upload) reference — handheld product-in-hand, brand visible. */
export const PRODUCT_EXAMPLE = '/examples/ex-product-handheld.png';

/**
 * Presenter (uploaded performer) reference — head-to-chest, bright, face fills the frame.
 * Shared by One-Shot's presenter modal and Expert Mode's presenter tile so the upload guidance
 * stays identical. A full-body source makes the face too small to identity-lock (smoke Finding 2b).
 */
export const PRESENTER_EXAMPLE = '/examples/services-practitioner.png';

// --- Services -------------------------------------------------------------
export const ARCHETYPE_META: Record<ServiceArchetype, ArchetypeMeta> = {
  venue: {
    label: 'Show off my place', sub: 'Salon, gym, resto, clinic', lead: 'Your place',
    samples: [{ src: '/examples/services-venue-clear.png', caption: 'Your place — clear & bright' }],
  },
  work: {
    label: 'Show the results', sub: 'Cleaning, repair, pest', lead: 'Your results',
    samples: [
      { src: '/examples/services-work-before.png', caption: 'Before' },
      { src: '/examples/services-work-after.png', caption: 'After' },
    ],
  },
  practitioner: {
    label: 'Feature me & my team', sub: 'Coach, consultant, agency', lead: 'You & your team',
    samples: [{ src: '/examples/services-practitioner.png', caption: 'You — friendly & clear' }],
  },
};
export const ARCHETYPE_ORDER: ServiceArchetype[] = ['venue', 'work', 'practitioner'];
export const BAD_SAMPLE = { src: '/examples/services-blurry-bad.png', caption: 'Dark & blurry' };

export const ARCHETYPE_UPLOAD_SLOTS: Record<ServiceArchetype, UploadSlot[]> = {
  // NOTE: slot labels avoid "You" — the on-camera presenter is set separately
  // (Presenter tile). These are REAL photos that anchor scenes to the actual place/people.
  // Each slot carries its OWN reference example so #previews == #uploads.
  venue: [
    { slot: 'exterior', label: 'Storefront', hint: 'facade + your sign/logo', example: '/examples/ex-storefront.png' },
    { slot: 'interior', label: 'Inside', hint: 'where the service happens', example: '/examples/services-venue-clear.png' },
    { slot: 'ambiance', label: 'The vibe', hint: 'what makes it feel good', example: '/examples/ex-ambiance.png' },
    { slot: 'staff', label: 'Staff', hint: 'real staff — optional', example: '/examples/ex-staff.png' },
  ],
  work: [
    { slot: 'before', label: 'Before', hint: 'the problem / mess', example: '/examples/services-work-before.png' },
    { slot: 'after', label: 'After', hint: 'the clean result', example: '/examples/services-work-after.png' },
    { slot: 'staff', label: 'Crew', hint: 'real crew — optional', example: '/examples/ex-staff.png' },
  ],
  practitioner: [
    { slot: 'staff', label: 'Team', hint: 'real team at work', example: '/examples/ex-team.png' },
    { slot: 'before', label: 'Proof: before', hint: 'optional', example: '/examples/services-work-before.png' },
    { slot: 'after', label: 'Proof: after', hint: 'optional', example: '/examples/services-work-after.png' },
  ],
};

// Smart-default the archetype from the user's own words. SCORE each bucket by
// keyword hits and take the highest. Ties / no match → 'venue'.
export const inferServiceArchetype = (text: string): ServiceArchetype => {
  const t = (text || '').toLowerCase();
  const score = (...words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const venue = score('spa', 'salon', 'barber', 'gym', 'fitness', 'clinic', 'derma', 'dental',
    'restaurant', 'resto', 'cafe', 'café', 'hotel', 'resort', 'parlor', 'massage', 'hilot',
    'kainan', 'eatery', 'lounge', 'studio', 'milk tea', 'milktea', 'bakery', 'panaderia',
    'karinderya', 'catering', 'food stall', 'foodpark');
  const work = score('clean', 'linis', 'pest', 'peste', 'siphon', 'malaban', 'repair', 'laundr',
    'labada', 'plumb', 'aircon', 'disinfect', 'declog', 'detailing', 'carwash', 'car wash',
    'exterm', 'hauling', 'pickup', 'pick-up', 'moving');
  const practitioner = score('coach', 'consult', 'advisor', 'tutor', 'agency', 'accountant',
    'lawyer', 'freelanc', 'mentor', 'strategist');
  if (venue >= work && venue >= practitioner && venue > 0) return 'venue';
  if (work >= practitioner && work > 0) return 'work';
  if (practitioner > 0) return 'practitioner';
  return 'venue';
};

// --- RealEstate (mirrors the Services machinery; property = a real place) ---
export const RE_ARCHETYPE_META: Record<RealEstateArchetype, ArchetypeMeta> = {
  listing: {
    label: 'Sell this property', sub: 'House, condo, lot — sale or rent', lead: 'The property',
    samples: [{ src: '/examples/realestate-listing.png', caption: 'The property — bright & wide' }],
  },
  agent: {
    label: 'Build my agent brand', sub: 'Broker / realtor personal brand', lead: 'You + your listings',
    samples: [{ src: '/examples/realestate-agent.png', caption: 'You — trusted & clear' }],
  },
  developer: {
    label: 'Launch a project', sub: 'Pre-selling / new development', lead: 'The development',
    samples: [{ src: '/examples/realestate-developer.png', caption: 'The project — unit / render' }],
  },
};
export const RE_ARCHETYPE_ORDER: RealEstateArchetype[] = ['listing', 'agent', 'developer'];

export const RE_UPLOAD_SLOTS: Record<RealEstateArchetype, UploadSlot[]> = {
  listing: [
    { slot: 'facade', label: 'Exterior', hint: 'facade / curb view', example: '/examples/ex-facade.png' },
    { slot: 'living', label: 'Living area', hint: 'sala / main space', example: '/examples/ex-living.png' },
    { slot: 'kitchen', label: 'Kitchen', hint: 'optional', example: '/examples/ex-kitchen.png' },
    { slot: 'bedroom', label: 'Bedroom', hint: 'optional', example: '/examples/ex-bedroom.png' },
    { slot: 'bathroom', label: 'Bathroom', hint: 'optional', example: '/examples/ex-bathroom.png' },
    { slot: 'view', label: 'View / balcony', hint: 'optional', example: '/examples/ex-view.png' },
  ],
  // No 'agent' slot — the broker IS the on-camera presenter (set in the Presenter
  // tile). These slots are the listings the agent brand showcases.
  agent: [
    { slot: 'facade', label: 'A listing', hint: 'exterior of a property you sell', example: '/examples/ex-facade.png' },
    { slot: 'living', label: 'Inside a listing', hint: 'optional', example: '/examples/ex-living.png' },
    { slot: 'view', label: 'Best feature', hint: 'optional', example: '/examples/ex-view.png' },
  ],
  developer: [
    { slot: 'facade', label: 'Building / render', hint: 'project exterior or render', example: '/examples/ex-facade.png' },
    { slot: 'living', label: 'Model unit', hint: 'showroom interior', example: '/examples/ex-living.png' },
    { slot: 'amenities', label: 'Amenities', hint: 'pool / gym / lobby', example: '/examples/ex-amenities.png' },
    { slot: 'location', label: 'Location', hint: 'neighborhood / map area', example: '/examples/ex-location.png' },
  ],
};

// --- UGC Pro (product) --------------------------------------------------
// Keyed by SUB-FORMAT (tryon | transformation), not archetype — the One-Shot
// LaunchScreen picks the list off the chosen UGC Pro sub-format. These are
// product-STATE photos (worn / before / after / packaging) that anchor the
// try-on drape or the before→after reveal so the model doesn't hallucinate them.
//
// INVARIANT: `hero` MUST be the FIRST element of every list. LaunchScreen derives
// `heroImageBase64: servicePhotos[0]?.url` from hero-first ordering — reorder and
// the wrong photo becomes the research/identity anchor. Do not move it.
//
// Only the hero slot carries a reference example (PRODUCT_EXAMPLE); the product-state
// slots have no curated sample under public/examples/ yet, so their `example` is
// omitted rather than pointing at a mismatched (e.g. cleaning before/after) asset.
export const UGCPRO_UPLOAD_SLOTS: Record<
  'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial',
  UploadSlot[]
> = {
  tryon: [
    { slot: 'hero', label: 'Product', hint: 'the item, brand visible', example: PRODUCT_EXAMPLE },
    { slot: 'onbody', label: 'Worn', hint: 'on a body — anchors fit & drape' },
    { slot: 'packaging', label: 'Packaging', hint: 'box / label — optional' },
  ],
  unboxing: [
    { slot: 'hero', label: 'Product', hint: 'the item, brand visible', example: PRODUCT_EXAMPLE },
    { slot: 'packaging', label: 'Packaging', hint: 'box / label — required, it is the co-star' },
    { slot: 'inuse', label: 'In use', hint: 'placed / worn — optional' },
  ],
  demo: [
    { slot: 'hero', label: 'Product', hint: 'the item, brand visible', example: PRODUCT_EXAMPLE },
    { slot: 'inuse', label: 'In use', hint: 'show it working — recommended' },
  ],
  transformation: [
    { slot: 'hero', label: 'Product', hint: 'the item, brand visible', example: PRODUCT_EXAMPLE },
    { slot: 'before', label: 'Before', hint: 'the starting state' },
    { slot: 'after', label: 'After', hint: 'the result' },
    { slot: 'inuse', label: 'In use', hint: 'applying it — optional' },
  ],
  tutorial: [
    { slot: 'hero', label: 'Product', hint: 'the item, brand visible', example: PRODUCT_EXAMPLE },
    { slot: 'inuse', label: 'In use', hint: 'a step in progress — optional' },
  ],
};

export const inferRealEstateArchetype = (text: string): RealEstateArchetype => {
  const t = (text || '').toLowerCase();
  const score = (...words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const agent = score('agent', 'broker', 'realtor', 'realty', 'salesperson', 'kasama mo', 'i help you find');
  const developer = score('pre-sell', 'preselling', 'pre-selling', 'developer', 'rfo', 'turnover',
    'model unit', 'showroom', 'subdivision', 'township', 'enclave', 'project launch', 'new development');
  const listing = score('house', 'condo', 'lot', 'townhouse', 'apartment', 'studio', 'bungalow',
    'duplex', 'bahay', 'lupa', 'for sale', 'for rent', 'resale', 'foreclosed', 'unit');
  if (agent >= developer && agent >= listing && agent > 0) return 'agent';
  if (developer >= listing && developer > 0) return 'developer';
  if (listing > 0) return 'listing';
  return 'listing';
};

// Rebuild productImageDescription from the CURRENT servicePhotos (slot-labeled).
export const buildServiceDescription = (
  photos: NonNullable<BusinessInfo['servicePhotos']>,
): string | undefined =>
  photos.length ? photos.map(p => `[${p.slot}] ${(p.description ?? '').trim()}`).join('\n\n') : undefined;

/** One reference-example tile. Icon fallback so a missing/late PNG never shows a
 * broken image. Pass `onZoom` to make the image clickable to view full. */
export const SampleTile: React.FC<{ src: string; caption: string; good: boolean; onZoom?: (src: string) => void }> = ({ src, caption, good, onZoom }) => {
  const [err, setErr] = useState(false);
  const FallbackIcon = good ? Sparkles : X;
  const clickable = !!onZoom && !err;
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={clickable ? () => onZoom!(src) : undefined}
        disabled={!clickable}
        aria-label={clickable ? `Preview ${caption}` : caption}
        className={`relative aspect-square w-full bg-zinc-900 border rounded-xl flex items-center justify-center overflow-hidden ${good ? 'border-[#FFCC00]/40' : 'border-red-900/50'} ${clickable ? 'cursor-zoom-in hover:border-[#FFCC00]' : ''}`}
      >
        {!err ? (
          <img src={src} alt={caption} onError={() => setErr(true)} className={`w-full h-full object-cover ${good ? '' : 'opacity-80'}`} />
        ) : (
          <FallbackIcon className={`w-8 h-8 ${good ? 'text-[#FFCC00]/60' : 'text-red-500/60'}`} />
        )}
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center ${good ? 'bg-[#FFCC00] text-zinc-950' : 'bg-red-600 text-white'}`}>
          {good ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </span>
      </button>
      <p className="text-[8px] text-zinc-500 font-mono uppercase tracking-tighter mt-1.5 text-center">{caption}</p>
    </div>
  );
};
