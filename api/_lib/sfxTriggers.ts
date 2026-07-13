// Diegetic keyword layer (Slice 2, workflows/sfx_upgrade_plan.md). A pure,
// side-effect-free trigger table + evaluator: maps content mentions in the
// ElevenLabs forced-aligned VO (peso amounts, `% off`, `sale`, `libre`) to a
// diegetic cue anchored on the matched word's measured start. No I/O, no env
// reads, no imports from renderFfmpeg — renderFfmpeg imports THIS, never the
// reverse (and renderPresets never imports this module, so there is no cycle).
import type { FinalRenderScene, SfxBankId } from '../../types.js';
import type { PresetId } from './renderPresets.js';

/** FM2 constant-offset seam: a single global nudge on the anchor, tuned at the
 * Neil ear-gate (consistent late/early → move this one number). Ships at 0. */
export const CALIBRATION_OFFSET_SEC = 0;
/** Whole-ad ceiling on diegetic cues (across all classes). */
export const MAX_DIEGETIC_PER_AD = 3;
/** Whole-ad ceiling per diegetic class. */
export const DIEGETIC_MAX_PER_CLASS = 2;
/** Min gap (sec) vs ANY already-placed SFX; stricter than renderFfmpeg's
 * MIN_SFX_GAP (0.4) so a diegetic cue never crowds a proven P13 hit. */
export const DIEGETIC_MIN_GAP = 0.6;
/** Preceding CONTENT tokens scanned for a negator, sentence-bounded
 * (punctuation-only tokens don't consume a slot — see isNegated). */
export const NEGATION_WINDOW = 3;
/** Tagalog + English negators that suppress a match in the N-window. */
export const NEGATORS: ReadonlySet<string> = new Set([
  'walang', 'wala', 'hindi', 'wag', 'huwag', 'di', 'no', 'not', 'never', 'without',
]);

/** Visual motifs a cue class requires in the storyboard; FinalRenderScene carries
 * NO signal for any of these today (Omni Edit Style concepts) — entries with a
 * non-null requiredVisual are STRUCTURALLY DORMANT: the evaluator skips them
 * unconditionally (premortem FM1 storyboard-aware allowlist). */
export type CueVisual = 'ui-card' | 'typing' | 'freeze' | 'paper';

export type TriggerPattern =
  | { kind: 'word'; word: string }
  | { kind: 'peso-amount' }
  | { kind: 'percent-off' };

export interface DiegeticTrigger {
  sfxId: SfxBankId;
  patterns: readonly TriggerPattern[];
  allowedPresets: readonly PresetId[];
  gain: number;
  requiredVisual: CueVisual | null;
}

export interface DiegeticCue {
  sfxId: SfxBankId;
  anchorSec: number;
  gain: number;
  trigger: string;
}

/** The trigger table. chaching is LIVE (requiredVisual null). The 4 visual-motif
 * classes ship DORMANT: their gains pre-encode decision 4 (UI ticks 0.5, physical
 * foley 0.6) so going live is data-only once an EDL visual signal exists — until
 * then the evaluator skips them before any pattern matching (FM1). */
export const DIEGETIC_TRIGGERS: readonly DiegeticTrigger[] = [
  { sfxId: 'chaching',
    patterns: [{ kind: 'peso-amount' }, { kind: 'percent-off' },
               { kind: 'word', word: 'sale' }, { kind: 'word', word: 'libre' }],
    allowedPresets: ['impact', 'hype'], gain: 0.7, requiredVisual: null },
  { sfxId: 'notification', patterns: [], allowedPresets: ['impact', 'hype'], gain: 0.5, requiredVisual: 'ui-card' },
  { sfxId: 'typing',       patterns: [], allowedPresets: ['impact', 'hype'], gain: 0.5, requiredVisual: 'typing' },
  { sfxId: 'shutter',      patterns: [], allowedPresets: ['impact', 'hype'], gain: 0.6, requiredVisual: 'freeze' },
  { sfxId: 'paper',        patterns: [], allowedPresets: ['impact', 'hype'], gain: 0.6, requiredVisual: 'paper' },
];

/** Lowercase, then strip LEADING and TRAILING chars outside [\p{L}\p{N}₱%].
 * Deliberately NOT isPowerWord's strip-everything: interior punctuation survives
 * (so `grifon.ph/sale` stays one unsplittable token and ₱/% units keep their
 * digits). Edge-only stripping lets `SALE!` → `sale` while `50%` stays `50%`. */
export function normToken(t: string): string {
  return t
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}₱%]+/u, '')
    .replace(/[^\p{L}\p{N}₱%]+$/u, '');
}

const URL_TLD = 'com|ph|net|org|io|co|shop|store|xyz';
const URL_RE = new RegExp(
  `(^https?:\\/\\/)|(^www\\.)|([\\p{L}\\p{N}]\\.(?:${URL_TLD})(?:[\\/?#]|$))`,
  'iu',
);

/** True for `https?://`, `www.`, or a letter/digit followed by `.tld` (tld ∈
 * com|ph|net|org|io|co|shop|store|xyz) that ends or is followed by `/`, `?`, `#`.
 * A URL token can never anchor or participate in any match. */
export function isUrlToken(raw: string): boolean {
  return URL_RE.test(raw);
}

/** Scan back from matchIdx-1 over up to NEGATION_WINDOW CONTENT tokens: stop
 * early (return false) at a sentence boundary — a RAW token ending in `.`, `!`,
 * or `?` (best-effort — the aligner may strip punctuation, in which case the
 * N-window alone bounds the scan); return true if any scanned token's normToken
 * is a negator. Punctuation-only tokens (normToken '') never consume a window
 * slot — otherwise a stray `—` `…` `,` stream would push a real negator out of
 * the window and false-fire on a negated money line (FM1's dangerous direction). */
export function isNegated(rawTokens: readonly string[], matchIdx: number): boolean {
  let scanned = 0;
  for (let j = matchIdx - 1; j >= 0 && scanned < NEGATION_WINDOW; j--) {
    const raw = rawTokens[j];
    if (raw === undefined) continue;
    if (/[.!?]$/.test(raw)) return false;
    const norm = normToken(raw);
    if (norm === '') continue;
    if (NEGATORS.has(norm)) return true;
    scanned++;
  }
  return false;
}

/** First matching anchor index for `pat` starting at token `i`, or null.
 * Neighbor tokens consumed by a multi-token pattern must not be URL tokens. */
function matchPatternAt(
  pat: TriggerPattern,
  i: number,
  toks: readonly string[],
  raw: readonly string[],
): number | null {
  switch (pat.kind) {
    case 'word':
      return toks[i] === pat.word ? i : null;
    case 'peso-amount':
      // `₱499` / `₱1,499` in one token (normToken keeps interior commas — the
      // regex only needs ₱ then a digit), OR a bare `₱` then a digit token.
      if (/^₱\d/u.test(toks[i])) return i;
      if (
        toks[i] === '₱' &&
        i + 1 < toks.length &&
        /^\d/.test(toks[i + 1]) &&
        !isUrlToken(raw[i + 1])
      ) return i;
      return null;
    case 'percent-off':
      // `50%|off` anchors the number-percent token; `50|%|off` anchors the digit.
      if (
        /^\d+(\.\d+)?%$/.test(toks[i]) &&
        toks[i + 1] === 'off' &&
        !isUrlToken(raw[i + 1] ?? '')
      ) return i;
      if (
        toks[i] === '%' &&
        /^\d+(\.\d+)?$/.test(toks[i - 1] ?? '') &&
        toks[i + 1] === 'off' &&
        !isUrlToken(raw[i - 1] ?? '') &&
        !isUrlToken(raw[i + 1] ?? '')
      ) return i - 1;
      return null;
  }
}

/**
 * Plan the (≤1) diegetic cue for one scene. Invariants:
 * - Returns [] on the hook (Neil decision 2026-07-13 — hooks are the densest SFX
 *   moment already) and when the scene has no voiceWords (measured alignment
 *   ONLY — the autopilot path attaches none, so the layer is inert there; FM2).
 * - Skips DORMANT entries (non-null requiredVisual) BEFORE pattern matching — the
 *   structural allowlist, so an injected pattern on a dormant class never fires.
 * - First admissible (matched + non-negated + preset-allowed) match in token
 *   order wins → ≤1 cue per scene BY CONSTRUCTION.
 * - Deterministic and side-effect free.
 */
export function planDiegeticCues(
  scene: Pick<FinalRenderScene, 'voiceWords' | 'isHook'>,
  presetId: PresetId,
  table: readonly DiegeticTrigger[] = DIEGETIC_TRIGGERS,
): DiegeticCue[] {
  if (scene.isHook || !scene.voiceWords?.length) return [];
  const voiceWords = scene.voiceWords;
  const raw = voiceWords.map((w) => w.text);
  const toks = raw.map(normToken);

  for (let i = 0; i < toks.length; i++) {
    if (isUrlToken(raw[i])) continue;
    for (const entry of table) {
      if (entry.requiredVisual !== null) continue; // dormant → skip before matching
      if (!entry.allowedPresets.includes(presetId)) continue;
      for (const pat of entry.patterns) {
        const anchorIdx = matchPatternAt(pat, i, toks, raw);
        if (anchorIdx === null) continue;
        if (isNegated(raw, anchorIdx)) continue; // suppressed → keep scanning
        return [{
          sfxId: entry.sfxId,
          anchorSec: Math.max(0, voiceWords[anchorIdx].start + CALIBRATION_OFFSET_SEC),
          gain: entry.gain,
          trigger: raw[anchorIdx],
        }];
      }
    }
  }
  return [];
}

/** Ad-level caps seam: admit a planned cue only under the whole-ad cap, the
 * per-class cap, and the DIEGETIC_MIN_GAP vs any already-placed SFX. */
export function admitDiegeticCue(
  cueGlobalSec: number,
  sfxId: SfxBankId,
  placedSec: readonly number[],
  diegeticPlaced: number,
  diegeticUse: Partial<Record<SfxBankId, number>>,
): boolean {
  return (
    diegeticPlaced < MAX_DIEGETIC_PER_AD &&
    (diegeticUse[sfxId] ?? 0) < DIEGETIC_MAX_PER_CLASS &&
    !placedSec.some((t) => Math.abs(t - cueGlobalSec) < DIEGETIC_MIN_GAP)
  );
}
