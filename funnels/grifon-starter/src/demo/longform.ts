import type { FunnelConfig } from '../config.types';
import { DEMO_BRAND } from './brand';

// ===========================================================================
// DEMO — 'longform' archetype (condensed F01 spine, Suby-style sales letter).
//
// 15 sections: hero → socialProofBar → caseStudyMetrics → originStory →
// testimonialWall → ctaBlock → objectionReversal → valueStack → guarantee →
// bonusStack → ctaBlock → psBlock → leadFormSection → faqAccordion →
// complianceFooter.
//
// Exercises EVERY section type in the union (together with minimal's heroOptin),
// which is what makes this config the layout regression test. Note the two
// ctaBlocks: both scroll to the single leadFormSection (L8).
// ===========================================================================

export const longform: FunnelConfig = {
  meta: {
    clientId: 'demo',
    funnelId: 'demo-longform-v1',
    archetype: 'longform',
    title: 'Demo Offer Co — The Predictable Pipeline Playbook',
    description:
      'How 400 service businesses replaced referral roulette with a pipeline they can forecast. Free playbook, 41 pages.',
  },
  brand: DEMO_BRAND,
  form: {
    fields: ['name', 'email', 'phone'],
    headline: 'Send Me The Predictable Pipeline Playbook',
    ctaLabel: 'Get The Playbook Free',
    reassurance: 'Instant delivery. No card. Unsubscribe in one click.',
    consent: {
      required: true,
      text: 'Yes, send me the playbook and follow-up emails about Demo Offer Co. I can unsubscribe at any time.',
      policyVersion: '2026-07-29',
    },
  },
  tracking: {},
  sections: [
    {
      type: 'hero',
      props: {
        eyebrow: 'For owner-led service businesses',
        headline: 'You don’t have a marketing problem. You have a forecasting problem.',
        subhead:
          'Referrals made your first ₱1M. They will not make your next ₱10M, because you cannot schedule them. Here is the system 400 businesses used to replace them.',
        ctaLabel: 'Get The Playbook Free',
      },
    },
    {
      type: 'socialProofBar',
      props: {
        rating: '4.9 out of 5',
        reviewCount: '412 owners',
        logos: ['Northwind Studio', 'Palma Group', 'Kite & Co', 'Verity Labs', 'Sandoval Bros'],
      },
    },
    {
      type: 'caseStudyMetrics',
      props: {
        heading: 'What happens when the pipeline becomes predictable',
        items: [
          { metric: '3.4×', caption: 'Median pipeline value 90 days after implementing the four-stage system.' },
          { metric: '₱18.2M', caption: 'Booked revenue across the 2026 cohort, tracked in their own CRMs.' },
          { metric: '11 days', caption: 'Average time from first campaign live to first booked call.' },
        ],
      },
    },
    {
      type: 'originStory',
      props: {
        heading: 'This started because we nearly went under in a good year',
        paragraphs: [
          'In 2021 we had our best quarter ever and almost missed payroll ten weeks later. Nothing had gone wrong — the referrals simply arrived in a different order than they had the quarter before.',
          'That was the whole business model, and we hadn’t noticed: we were not generating demand, we were receiving it. When it arrived we looked brilliant. When it didn’t, we looked at each other.',
          'So we rebuilt the front of the business around one question — what would have to be true for us to know, on the first of the month, roughly what the month would produce? The answer became four stages, and eventually this playbook.',
        ],
      },
    },
    {
      type: 'testimonialWall',
      props: {
        heading: 'From owners who were exactly where you are',
        items: [
          {
            quote:
              'We stopped taking whatever walked in the door. Three months later we raised prices 40% and lost one client, who we wanted to lose anyway.',
            name: 'Marisa Lorenzo',
            role: 'Founder, Northwind Studio',
          },
          {
            quote:
              'The forecasting section alone. I now know in the first week of the month whether I need to be worried, instead of finding out on the 28th.',
            name: 'Dan Ferreras',
            role: 'Managing Director, Palma Group',
          },
          {
            quote:
              'I had read four books on this and implemented none of them. This one has a checklist, so it actually got done.',
            name: 'Cheska Tan',
            role: 'Owner, Kite & Co',
          },
        ],
      },
    },
    {
      type: 'ctaBlock',
      props: {
        label: 'Send Me The Playbook',
        urgency: 'Free while the 2026 cohort is open.',
      },
    },
    {
      type: 'objectionReversal',
      props: {
        heading: '“We’ve tried running ads. It didn’t work.”',
        body: [
          'Almost certainly true, and almost certainly not an ads problem. Ads amplify whatever the offer already does — run them against an offer that only converts with a warm referral behind it and you have bought expensive proof of that.',
          'The playbook spends its first eleven pages on the offer for that reason, and does not mention a single ad platform until page 24.',
        ],
      },
    },
    {
      type: 'valueStack',
      props: {
        heading: 'What’s inside',
        items: [
          { label: 'The 41-page Predictable Pipeline Playbook', value: '₱4,900' },
          { label: 'The four-stage pipeline map (editable)', value: '₱2,500' },
          { label: 'Offer teardown worksheet', value: '₱1,500' },
          { label: '90-day implementation checklist', value: '₱1,500' },
          { label: 'Forecast calculator spreadsheet', value: '₱2,000' },
        ],
        totalLine: 'Total value ₱12,400 — yours free',
      },
    },
    {
      type: 'guarantee',
      props: {
        heading: 'Read it, or unsubscribe in one click',
        body: 'If the first framework doesn’t change how you think about your pipeline within twenty minutes, there is one link at the bottom of every email and no hard feelings. We would rather have a small list that reads us.',
      },
    },
    {
      type: 'bonusStack',
      props: {
        heading: 'Three bonuses included',
        bonuses: [
          {
            title: 'The Qualification Script',
            blurb: 'The nine questions that decide whether a call is worth taking, in the order to ask them.',
            value: 'Value ₱1,800',
          },
          {
            title: 'Pricing Ladder Template',
            blurb: 'Three tiers, built so the middle one is the one they choose. Includes the two lines that do the work.',
            value: 'Value ₱2,200',
          },
          {
            title: 'The Weekly Pipeline Review',
            blurb: 'A 20-minute meeting agenda that replaces the four meetings you are currently having about this.',
            value: 'Value ₱1,200',
          },
        ],
      },
    },
    {
      type: 'ctaBlock',
      props: {
        label: 'Get The Playbook + Bonuses',
        urgency: 'Delivered to your inbox in under two minutes.',
      },
    },
    {
      type: 'psBlock',
      props: {
        items: [
          'The playbook is free because the businesses we want to work with are the ones who implement it and then come back with a harder problem.',
          'If you only read one section, read the forecasting chapter on page 31. It is the one every owner emails us about.',
        ],
      },
    },
    {
      type: 'leadFormSection',
      props: {
        heading: 'Where should we send it?',
      },
    },
    {
      type: 'faqAccordion',
      props: {
        items: [
          {
            q: 'Is this really free?',
            a: 'Yes. There is no card, no trial, and no call booked at the end of it. You will get follow-up emails, and one link unsubscribes you from all of them.',
          },
          {
            q: 'Will this work for a business my size?',
            a: 'It is built for owner-led service businesses between roughly ₱250k and ₱10M a month. Below that the offer chapter matters most; above it, the forecasting chapter does.',
          },
          {
            q: 'How long does it take to implement?',
            a: 'The first stage takes an afternoon. The full four-stage system took our cohort a median of 90 days alongside their normal delivery work.',
          },
          {
            q: 'What do you do with my details?',
            a: 'We email you the playbook and related tips. We do not sell or share your details. Unsubscribe at any time from the link in every email.',
          },
        ],
      },
    },
    {
      type: 'complianceFooter',
      props: {
        brandLine: '© 2026 Demo Offer Co.',
        disclaimer:
          'Results shown are examples from specific businesses and are not typical. Nothing on this page is a guarantee of income or results. This site is not part of, or endorsed by, Meta.',
        links: [
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Contact', href: 'mailto:hello@example.com' },
        ],
      },
    },
  ],
  thankYou: {
    headline: 'The playbook is on its way.',
    body: 'It lands within two minutes. If you don’t see it, check Promotions or Spam and drag it into your inbox — that keeps the rest of the series arriving where you can find it.',
    magnetDelivery: 'Check your inbox',
    steps: [
      'Open the email from Demo Offer Co and download the playbook.',
      'Read the offer chapter first — pages 4 to 15.',
      'Block 90 minutes this week for the pipeline map. It does not work as a background task.',
    ],
    nextStep: {
      label: 'Watch The Pipeline Teardown',
      href: 'https://example.com/teardown',
      blurb: 'While you wait — a 20-minute teardown of a real pipeline, from first ad to booked call.',
    },
  },
};
