import type { BattlePlan } from './config.types';

// ===========================================================================
// The magnet itself — 9 Ad Battle Plans, one per niche option in the form's
// `niche` qualifier. Keys are the EXACT option strings; the thank-you page
// looks the lead's answer up here and falls back to 'Other'.
//
// Source of truth: workflows/funnel_forge_battleplan_content.md. Every hook and
// angle there cites a swipe-file pattern; those citations are internal evidence
// notes and are stripped from this user-facing copy.
//
// Teaching voice is simple English (house rule); the script skeletons are
// TAGLISH and VERBATIM — they are ads a Filipino owner will actually run, and
// ads stay Taglish. Do not translate or "improve" them.
// ===========================================================================

const BLOCK_HOOK = 'Your winning hook';
const BLOCK_ANGLE = 'The angle that’s winning right now';
const BLOCK_AD = 'Your first ad this week';
const BLOCK_SHORTCUT = 'The shortcut';

/** Same closing bridge on every variant — the plan says WHAT, Grifon does it. */
const SHORTCUT =
  'This plan tells you WHAT to run. Grifon makes it — script, image, and caption in minutes. Paste this plan, press generate. Free to start.';

/** Assembles one variant so the nine below read as data, not as nine layouts. */
const plan = (niche: string, hook: string[], angle: string[], skeleton: string): BattlePlan => ({
  title: `Your Ad Battle Plan — ${niche}`,
  blocks: [
    { heading: BLOCK_HOOK, body: hook },
    { heading: BLOCK_ANGLE, body: angle },
    { heading: BLOCK_AD, body: [`SKELETON: ${skeleton}`] },
    { heading: BLOCK_SHORTCUT, body: [SHORTCUT] },
  ],
});

export const BATTLE_PLANS: Record<string, BattlePlan> = {
  'Food & Beverage': plan(
    'Food & Beverage',
    [
      'Numbers beat adjectives. Not "masarap" — count something real.',
      'Example: "3 tindahan. 1 lutong bahay na recipe. 500 orders kada linggo."',
    ],
    [
      'Your best-seller’s numbers ARE the ad. People scroll past "quality food"; they stop at a number that feels earned.',
    ],
    '[Bilang] na [produkto] ang nabenta namin nitong [panahon]. Walang sikreto — [totoong dahilan]. Subukan mo ang [best-seller] — [simpleng CTA: order/punta/DM].'
  ),

  'Fashion & Beauty': plan(
    'Fashion & Beauty',
    ['Let a real customer say it. A quoted line from a real buyer outperforms your own claim.'],
    [
      'Proof-by-association: real reviews, real photos, worn by real people. Zero stock photos — feed-native shots win.',
    ],
    '"[Totoong quote ng customer]" — [pangalan/initials]. [Ilang] na ang bumili ng [produkto]. Ikaw na ang susunod — [CTA].'
  ),

  'Health & Wellness': plan(
    'Health & Wellness',
    [
      'Put the guarantee IN the headline, not the fine print:',
      '"Kung walang pagbabago sa [panahon], ibabalik namin ang bayad mo."',
    ],
    [
      'In a scam-scared niche, removing risk outsells promising results. Never invent medical claims — the guarantee is the claim.',
    ],
    '[Pangako na may guarantee sa unang linya]. [Paano ito gumagana — 1 linya]. [Totoong proof: bilang ng clients / years]. [CTA na walang pressure: "subukan mo, walang risk"].'
  ),

  'Home Services': plan(
    'Home Services',
    [
      'Name the ugly problem bluntly in line one — the thing the customer is embarrassed about.',
      'Example: "May amoy na ba ang [problema] sa bahay mo?"',
    ],
    [
      'Before → during → after with REAL job photos, plus one number ("[X] na bahay ngayong buwan"). Real artifacts only — no stock shots.',
    ],
    '[Tanong na tumutusok sa problema]. [Gaano kabilis ang ayos]. [Totoong before/after photo]. [Bilang ng na-serbisyuhan]. [CTA: "Message mo kami ngayon — libre ang tingin."]'
  ),

  'Professional Services': plan(
    'Professional Services',
    ['YOU are the proof. Face + one earned credential in the first line. People hire people, not logos.'],
    ['Founder-as-proof: your photo, your real numbers, one client result with permission. No stock handshake photos.'],
    'Ako si [pangalan], [credential na totoo]. Sa loob ng [panahon], [na-tulungan kong bilang] na [klase ng client] na [resulta]. Kung [pain ng client], usap tayo — [CTA].'
  ),

  'Online Store (E-commerce)': plan(
    'Online Store (E-commerce)',
    [
      'Stack what they GET as a checklist with one anchor number:',
      '"✅ [item] ✅ [freebie] ✅ [garantiya] — ₱[presyo] lang."',
    ],
    ['The offer stack IS the creative. Make the value stack visibly larger than the price.'],
    '[Produkto] + [freebie] + [free shipping/garantiya] = [kabuuang halaga]. Ngayon: [presyo]. [Totoong bilang ng nabenta/reviews]. [CTA: Order na — COD available.]'
  ),

  'Coaching & Education': plan(
    'Coaching & Education',
    [
      'Give the first lesson FREE in the ad itself. Teach one real thing in 3 lines — the ad that teaches, sells.',
    ],
    ['Generosity-first: free value builds the authority that sells the paid program.'],
    '[Isang totoong tip — buo, hindi teaser]. Gusto mo ng [buong version/libreng guide]? [CTA]. [Isang linya kung sino ka at bakit ka dapat pakinggan].'
  ),

  'Real Estate': plan(
    'Real Estate',
    [
      'Specificity sells property: "[sqm], [lokasyon], [payment terms] — [presyo/buwan]."',
      'Vague "dream home" ads lose to exact numbers.',
    ],
    [
      'Numbers + trust markers (licensed broker no., developer name, actual turnover dates). This niche is fraud-scared — every claim checkable.',
    ],
    '[Lokasyon]: [sqm] / [beds] / ₱[monthly] kada buwan. [Turnover date]. [License/developer proof]. [CTA: "Free tripping — book mo dito."]'
  ),

  Other: plan(
    'Other',
    [
      'Open with the customer’s exact words for their problem — the sentence they say to themselves at 3AM.',
      'If your first line could fit any business, rewrite it.',
    ],
    ['Risk-reversal + offer stack + one real number. The universal direct-response spine.'],
    '[Pain sa mismong salita ng customer]. [Ano ang inaalok mo — 1 linya]. [Isang totoong numero bilang proof]. [Garantiya kung kaya mo]. [Isang malinaw na CTA].'
  ),
};
