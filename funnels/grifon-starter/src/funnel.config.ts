import type { FunnelConfig } from './config.types';
import { BATTLE_PLANS } from './battlePlans.js';

// ===========================================================================
// grifon-starter-v1 — THE ACTIVE CONFIG (Grifon's own lead funnel).
//
// Offer: the free Ad Battle Plan, delivered ON the thank-you page (no email
// sender is wired yet) and routed by the lead's `niche` answer. Copy is
// approved verbatim in workflows/funnel_forge_copy_grifon_starter.md; the plan
// content itself lives in src/battlePlans.ts. Everything downstream — sections,
// lead form, thank-you bridge, api/lead.ts's server-stamped identity — reads
// from this single export.
// ===========================================================================

/** The niche question drives the magnet, so its options ARE the variant keys. */
const NICHES = [
  'Food & Beverage',
  'Fashion & Beauty',
  'Health & Wellness',
  'Home Services',
  'Professional Services',
  'Online Store (E-commerce)',
  'Coaching & Education',
  'Real Estate',
  'Other',
];

export const funnelConfig: FunnelConfig = {
  meta: {
    clientId: 'grifon',
    funnelId: 'grifon-starter-v1',
    archetype: 'minimal',
    title: 'Grifon — Free Ad Battle Plan',
    description:
      'Answer 4 quick questions about your business and get a free Ad Battle Plan: the hook that fits your niche, the ad angle that is winning right now, and the first ad you should run this week.',
  },
  // Straight from the root DESIGN.md frontmatter — this funnel is Grifon's own,
  // so the app's design system IS the brand block.
  brand: {
    colors: {
      primary: '#FFCC00',
      surface: '#09090B',
      surfaceElevated: '#18181B',
      onSurface: '#FFFFFF',
      onSurfaceMuted: '#D4D4D8',
      onSurfaceDim: '#A1A1AA',
      proofBand: '#F2F1EA',
    },
    fonts: {
      display: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      accent: "'Instrument Serif', Georgia, 'Times New Roman', serif",
    },
    rounded: 'md',
  },
  form: {
    // No phone: this funnel never calls anyone, and less friction is worth more
    // than a number we would not use.
    fields: ['name', 'email'],
    headline: 'Answer 4 quick questions.',
    ctaLabel: 'Get My Battle Plan →',
    reassurance: 'Free. No credit card. Your plan appears instantly.',
    // L4 — unchecked by default. The Battle Plan is delivered either way; the
    // box only gates the weekly nurture, which is why it is not required.
    consent: {
      required: false,
      text: 'Yes — send my Ad Battle Plan plus a short weekly breakdown of one winning ad. Unsubscribe anytime with one tap. Your details are protected under the Data Privacy Act of 2012 and our Privacy Policy. You’ll get your Battle Plan either way.',
      policyVersion: 'funnel-dpa-v1-2026-07',
    },
    // L3 — the quiz. `niche` doubles as the magnet router (see thankYou.magnet).
    qualifiers: [
      { id: 'niche', label: 'What’s your business?', options: NICHES, required: true },
      {
        id: 'budget',
        label: 'Monthly ad budget?',
        options: ['Wala pa', 'Under ₱5K', '₱5K–₱20K', '₱20K–₱50K', '₱50K+'],
        required: true,
      },
      {
        id: 'problem',
        label: 'Biggest problem right now?',
        options: [
          'No time to make content',
          'Ads don’t convert',
          'Don’t know what to post',
          'Agency is too expensive',
        ],
        required: true,
      },
    ],
  },
  tracking: {},
  sections: [
    {
      type: 'heroOptin',
      props: {
        eyebrow: 'FREE FOR FILIPINO BUSINESS OWNERS',
        headline: 'Get Your Free Ad Battle Plan — Made For Your Business, In 60 Seconds.',
        subhead:
          'Answer 4 quick questions about your business. We’ll show you your free Battle Plan — instantly: the hook that fits your niche, the ad angle that’s winning right now, and the first ad you should run this week.',
      },
    },
    {
      type: 'socialProofBar',
      props: {
        // L9 authority — a real number off our own swipe files. No star rating
        // or review count: fabricated proof is on the do-not-replicate list.
        line: 'Built by Grifon — the AI that has already decoded 90+ winning ads and studied the funnels of the world’s best marketers.',
      },
    },
    {
      type: 'complianceFooter',
      props: {
        brandLine: 'GRIFON — AI Marketing, Philippines',
        disclaimer:
          'Results vary by business. The Battle Plan is educational marketing guidance, not a guarantee of sales.',
        links: [
          { label: 'Privacy Policy', href: 'https://grifon.ai/privacy' },
          { label: 'Terms', href: 'https://grifon.ai/terms' },
        ],
      },
    },
  ],
  thankYou: {
    headline: 'Your Battle Plan is ready.',
    body: 'Here it is — the hook, the angle, and the first ad to run this week for your business.',
    magnetDelivery: 'Your free Ad Battle Plan',
    // The magnet renders here, between the headline and the ONE bridge CTA (L1).
    magnet: {
      qualifierId: 'niche',
      variants: BATTLE_PLANS,
      fallback: 'Other',
    },
    nextStep: {
      label: 'Make This Ad Free With Grifon →',
      href: 'https://grifon.ai/?utm_source=funnel&utm_medium=thankyou&utm_campaign=grifon-starter-v1',
    },
  },
};
