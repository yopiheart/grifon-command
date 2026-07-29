import type { FunnelConfig } from '../config.types';
import { DEMO_BRAND } from './brand';

// ===========================================================================
// DEMO — 'minimal' archetype (F03 anatomy, Hormozi-style squeeze).
// heroOptin (form is the fold) → socialProofBar → complianceFooter.
//
// Copy is structurally real placeholder for an obviously-fake product, not
// lorem ipsum: the point of a demo config is to exercise the layout at real
// string lengths so line breaks and card heights are honest at 390px.
// ===========================================================================

export const minimal: FunnelConfig = {
  meta: {
    clientId: 'demo',
    funnelId: 'demo-minimal-v1',
    archetype: 'minimal',
    title: 'Demo Offer Co — The 5 Scaling Frameworks',
    description:
      'The five frameworks we use to take a service business from referral-dependent to predictable. Free, 12 pages, no fluff.',
  },
  brand: DEMO_BRAND,
  form: {
    fields: ['name', 'email'],
    headline: 'Free Gift: Get Our 5 Scaling Frameworks',
    ctaLabel: 'Send Me The Frameworks',
    reassurance: 'No spam. Unsubscribe in one click.',
    consent: {
      required: true,
      text: 'Yes, email me the frameworks and occasional tips. I can unsubscribe at any time.',
      policyVersion: '2026-07-29',
    },
    // L3 qualifiers — two selects, stored into the lead's utm jsonb so the list
    // can be segmented before anyone is ever contacted.
    qualifiers: [
      {
        id: 'revenue_band',
        label: 'Monthly revenue',
        options: ['Pre-revenue', 'Under ₱250k', '₱250k – ₱1M', '₱1M+'],
        required: true,
      },
      {
        id: 'biggest_bottleneck',
        label: 'Biggest bottleneck right now',
        options: ['Getting leads', 'Closing leads', 'Delivery capacity', 'Cash flow'],
        required: false,
      },
    ],
  },
  tracking: {},
  sections: [
    {
      type: 'heroOptin',
      props: {
        eyebrow: 'Free Framework Pack',
        headline: 'Stop guessing which lever to pull next.',
        subhead:
          'Five one-page frameworks for the decisions that actually move a service business: pricing, offer, lead flow, delivery, and the hire you make next.',
      },
    },
    {
      type: 'socialProofBar',
      props: {
        rating: '4.9 out of 5',
        reviewCount: '312 owners',
        logos: ['Northwind Studio', 'Palma Group', 'Kite & Co', 'Verity Labs'],
      },
    },
    {
      type: 'complianceFooter',
      props: {
        brandLine: '© 2026 Demo Offer Co.',
        disclaimer:
          'Results shown are examples from specific businesses and are not typical. Nothing here is a guarantee of income. This site is not part of, or endorsed by, Meta.',
        links: [
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Contact', href: 'mailto:hello@example.com' },
        ],
      },
    },
  ],
  thankYou: {
    headline: 'Your frameworks are on the way.',
    body: 'Check your inbox in the next two minutes. If it hasn’t landed, look in Promotions or Spam and drag it across — that keeps the rest of the series arriving.',
    magnetDelivery: 'Check your inbox',
    steps: [
      'Open the email from Demo Offer Co and download the pack.',
      'Start with Framework #1 — it takes about nine minutes.',
      'Reply to that email with your biggest bottleneck. A real person reads it.',
    ],
    nextStep: {
      label: 'Watch The 12-Minute Walkthrough',
      href: 'https://example.com/walkthrough',
      blurb: 'While you wait — here’s the frameworks being applied to a real business, end to end.',
    },
  },
};
