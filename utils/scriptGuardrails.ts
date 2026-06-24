// Expert Mode (Director's Cut) — client mirror of the script guardrails.
//
// ⚠️ MIRROR of api/_lib/prompts.ts (the TUNED server prompt) — keep the numbers in sync.
// This file exposes the SAME caps + per-format scene templates the server enforces, so the
// bring-your-own-script editor can hard-cap input BEFORE generation. Never edit the tuned server
// prompt to match this file — if the server rules change, update THIS mirror instead.
//
// Source of the numbers: buildStoryboardPrompt / buildAdScriptPrompt format structures
// (MrBeast / Testimonial / Temu / Services / RealEstate) + the hook/body word discipline
// ("hook ≤12 words / ≤2 sentences; body 7–12 words/line"), and the per-plan SCENE_CAP COGS dial.

import { SCENE_CAP, type PlanId } from './planGate';
import { estimateSpokenSec } from './spokenDuration';

/** Formats offered in Expert Mode's Script Studio. Cinematic is excluded (no spoken script). */
export type ExpertFormatId = 'MrBeast' | 'Testimonial' | 'Temu' | 'Services' | 'RealEstate' | 'Custom';

export type ExpertBusinessType = 'product' | 'service' | 'realestate';

/** Target ad length the expert picks; maps to a recommended scene count within the plan cap. */
export type TargetDurationSec = 15 | 20 | 30;

// ── Word discipline (mirror of the tuned hook/body caps) ───────────────────────────────────────
export const HOOK_WORD_CAP = 12;
export const HOOK_SENTENCE_CAP = 2;
export const BODY_WORD_CAP = 12;
/** Soft lower bound (advisory only — not hard-blocked). */
export const BODY_WORD_MIN = 7;

export interface SceneBeat {
  /** Beat label shown on the scene box, e.g. "Hook", "Discovery", "CTA". */
  label: string;
  /** One-line of what this beat must do. */
  hint: string;
  /** Hard word cap for this box (typing past it is blocked by the editor). */
  wordCap: number;
  /** Hook-only: max sentences. */
  sentenceCap?: number;
}

export interface ExpertFormat {
  id: ExpertFormatId;
  name: string;
  /** One-line strategy shown on the format card (CMO copy — what it's FOR, not the engine). */
  strategy: string;
  /** Pacing badge, e.g. "Fast cuts · 3–6s". */
  pacing: string;
  /** Which businessType(s) offer this format. */
  businessTypes: ExpertBusinessType[];
  /** Canonical (max-length) beat template; trimmed down to the chosen scene count. */
  beats: SceneBeat[];
}

const hook = (hint: string): SceneBeat => ({
  label: 'Hook',
  hint,
  wordCap: HOOK_WORD_CAP,
  sentenceCap: HOOK_SENTENCE_CAP,
});
const beat = (label: string, hint: string): SceneBeat => ({ label, hint, wordCap: BODY_WORD_CAP });

export const EXPERT_FORMATS: ExpertFormat[] = [
  {
    id: 'MrBeast',
    name: 'MrBeast',
    strategy: 'Curiosity hook + transformation arc. Best for launches & attention-grabbing offers.',
    pacing: 'Fast cuts · 3–6s',
    businessTypes: ['product'],
    beats: [
      hook('Pure curiosity gap — no brand, no price.'),
      beat('Identity', "Name the audience's world / who this is for."),
      beat('Struggle', 'The pain or problem they live with.'),
      beat('Discovery', 'Introduce the product as the turn.'),
      beat('Result + Proof', 'The outcome + one proof point.'),
      beat('CTA', 'High-energy call to action.'),
    ],
  },
  {
    id: 'Testimonial',
    name: 'Testimonial',
    strategy: 'First-person customer story. Builds trust by showing a real, relatable result.',
    pacing: 'Slower · 4–8s',
    businessTypes: ['product'],
    beats: [
      hook('Curiosity hook in the customer voice.'),
      beat('Intro', '"Ako si [name]…" — establish the real person.'),
      beat('Before', 'The pain before they found it.'),
      beat('Discovery', 'How they found the product.'),
      beat('Transformation', 'Pain → benefit shift.'),
      beat('Proof', 'One or two concrete features/results.'),
      beat('Objection Killer', 'Disarm the obvious doubt.'),
      beat('CTA', 'Warm, personal call to action.'),
    ],
  },
  {
    id: 'Temu',
    name: 'Temu Haul',
    strategy: 'Viral unboxing energy. Shock value, ASMR, or problem-solve — pick the vibe.',
    pacing: 'Fastest · 2.5–5s',
    businessTypes: ['product'],
    beats: [
      hook('Scroll-stopping unbox/reaction hook.'),
      beat('Reveal', 'The product reveal moment.'),
      beat('Highlight 1', 'First standout feature/benefit.'),
      beat('Highlight 2', 'Second standout feature/benefit.'),
      beat('Satisfying Payoff', 'The satisfying result / ASMR beat.'),
      beat('CTA', 'Quick, punchy call to action.'),
    ],
  },
  {
    id: 'Services',
    name: 'Services',
    strategy: 'A customer shares their experience. Books an appointment, not a purchase. No price.',
    pacing: 'Warm · 4–8s',
    businessTypes: ['service'],
    beats: [
      hook('Curiosity hook in the customer voice.'),
      beat('Intro', '"Ako si [customer name]…"'),
      beat('Problem', 'The pain point they had.'),
      beat('The Turn', 'The differentiator + trust disarm.'),
      beat('Relief', 'The benefit / how it felt.'),
      beat('Offer + CTA', 'Book / message — no peso amount.'),
    ],
  },
  {
    id: 'RealEstate',
    name: 'Real Estate',
    strategy: 'Agent tours the property. Drives inquiries; location, rooms, legitimacy cues.',
    pacing: 'Steady · 4–8s',
    businessTypes: ['realestate'],
    beats: [
      hook('Lifestyle or deal hook.'),
      beat('Location / Lifestyle', 'Where it is + the life it offers.'),
      beat('Walkthrough', 'The room/area tour.'),
      beat('Standout', 'The differentiator vs other listings.'),
      beat('Trust / Legitimacy', 'Kill the "scam" doubt (title, viewing).'),
      beat('Affordability + CTA', 'DM-first; optional DP/monthly reframe.'),
    ],
  },
  {
    id: 'Custom',
    name: 'Custom',
    strategy: 'Bring your own structure. Paste your beats — we storyboard within your plan limit.',
    pacing: 'Your call',
    businessTypes: ['product', 'service', 'realestate'],
    beats: [], // generated on demand by customBeats(n)
  },
];

/** Formats available for a given businessType. */
export const formatsFor = (businessType: ExpertBusinessType): ExpertFormat[] =>
  EXPERT_FORMATS.filter((f) => f.businessTypes.includes(businessType));

export const getExpertFormat = (id: ExpertFormatId): ExpertFormat | undefined =>
  EXPERT_FORMATS.find((f) => f.id === id);

/** Generic beats for the Custom format (scene 1 is always the hook). */
export const customBeats = (n: number): SceneBeat[] =>
  Array.from({ length: Math.max(0, n) }, (_, i) =>
    i === 0
      ? hook('Your scroll-stopping opener.')
      : i === n - 1
        ? beat('CTA', 'Your closing call to action.')
        : beat(`Scene ${i + 1}`, 'Your beat.'),
  );

/**
 * Recommended scene count for a target duration, bounded by the plan's SCENE_CAP.
 * ~5s/clip average → 15s≈3, 20s≈4, 30s≈6, then clamped to the plan cap (Starter/Pro 4, Business 6).
 */
export const recommendedSceneCount = (target: TargetDurationSec, plan: PlanId): number => {
  const cap = SCENE_CAP[plan];
  if (cap <= 0) return 0;
  const base = target <= 15 ? 3 : target <= 20 ? 4 : 6;
  return Math.min(base, cap);
};

/**
 * Trim/expand a beat template to exactly `n` boxes. Always keeps the first (hook) and last (CTA)
 * beats; fills the middle by sampling the template evenly. For Custom (empty template) returns
 * generic beats.
 */
export const beatsForCount = (format: ExpertFormat, n: number): SceneBeat[] => {
  if (n <= 0) return [];
  if (format.id === 'Custom' || format.beats.length === 0) return customBeats(n);
  const src = format.beats;
  if (n >= src.length) {
    // Pad with generic body beats before the CTA if the target exceeds the template.
    const head = src.slice(0, src.length - 1);
    const tail = src[src.length - 1];
    const extra = Array.from({ length: n - src.length }, (_, i) =>
      beat(`Scene ${head.length + i + 1}`, 'Additional beat.'),
    );
    return [...head, ...extra, tail];
  }
  if (n === 1) return [src[0]];
  if (n === 2) return [src[0], src[src.length - 1]];
  // Keep first + last, sample (n-2) evenly from the middle.
  const middle = src.slice(1, src.length - 1);
  const pick = n - 2;
  const step = middle.length / pick;
  const sampled = Array.from({ length: pick }, (_, i) => middle[Math.floor(i * step)]);
  return [src[0], ...sampled, src[src.length - 1]];
};

/** Word count of a line (whitespace-delimited, empties dropped). */
export const wordCount = (line: string): number =>
  (line ?? '').trim().split(/\s+/).filter(Boolean).length;

/** Sentence count (rough — splits on . ! ? …). */
export const sentenceCount = (line: string): number =>
  (line ?? '').trim().split(/[.!?…]+/).map((s) => s.trim()).filter(Boolean).length;

export interface BeatValidation {
  wordCount: number;
  overWordCap: boolean;
  overSentenceCap: boolean;
  estSeconds: number;
}

/** Validate one scene box against its beat caps + return the seconds estimate for the meter. */
export const validateBeat = (line: string, b: SceneBeat): BeatValidation => {
  const wc = wordCount(line);
  return {
    wordCount: wc,
    overWordCap: wc > b.wordCap,
    overSentenceCap: b.sentenceCap != null && sentenceCount(line) > b.sentenceCap,
    estSeconds: estimateSpokenSec(line),
  };
};

/** Total estimated spoken seconds across all scene lines (for the budget bar). */
export const totalEstSeconds = (lines: string[]): number =>
  lines.reduce((sum, l) => sum + estimateSpokenSec(l), 0);

// ── One-visual-per-beat guardrail (smoke Finding 3) ─────────────────────────────────────────────
// The render pipeline is 1 scene = 1 image: a beat that names several places renders only one of
// them (the storyboard AI picks a single venueSlot), so the other places silently vanish. This is a
// soft advisory — it nudges the expert to split the beat or name the hero shot; it never blocks.
const PLACE_WORDS = [
  'kitchen', 'bedroom', 'bathroom', 'living', 'dining', 'balcony', 'garden', 'pool', 'facade',
  'exterior', 'interior', 'lobby', 'office', 'storefront', 'rooftop', 'garage', 'hallway', 'view',
  'patio', 'terrace', 'yard', 'lanai', 'porch', 'basement', 'attic', 'studio', 'gym',
];

/**
 * True when a scene line names two or more distinct places — a sign the beat asks for multiple shots
 * the single-image render can't deliver. Word-boundary matched so "view" doesn't fire on "review".
 */
export const multiPlaceBeat = (line: string): boolean => {
  const l = (line ?? '').toLowerCase();
  let distinct = 0;
  for (const w of PLACE_WORDS) {
    if (new RegExp(`\\b${w}\\b`).test(l)) distinct += 1;
    if (distinct >= 2) return true;
  }
  return false;
};
