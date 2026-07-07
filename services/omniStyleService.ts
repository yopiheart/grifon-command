import { getSupabase } from './supabaseClient';
import { estimateSpokenSec } from '../utils/spokenDuration';
import {
  OMNI_STYLE_ROUTING,
  type OmniStyleId,
  type OmniPresetId,
  type OmniSceneTarget,
} from '../api/_lib/omniPresets';
import type { SceneBatchEntry } from '../types';

// services/omniStyleService.ts — the CLIENT orchestrator for the Omni "Applying
// style" pass (Slice 2). It is deliberately split into small, separately-exported
// PURE pieces (routing, slot derivation, the ladder state machine) so they can be
// unit-tested without any network, plus one network orchestrator (applyOmniStyle).
//
// TUNED-file boundary: this file NEVER imports the Omni prompt templates or
// fillPromptTemplate — it only sends `{presetId, slots}` to /api/gemini/omni-video
// and lets the SERVER assemble the (tuned) prompt. Only the routing table + types
// (which carry no prompt text) are imported, so no tuned wording reaches the
// browser bundle.

// ---------------------------------------------------------------------------
// Scene-type → Omni routing target
// ---------------------------------------------------------------------------

/**
 * Map a SceneBatchEntry.type to the Omni routing axis. The batch carries only
 * three scene types today (types.ts SceneBatchEntry): 'talking' | 'b-roll' |
 * 'cinematic'. Mapping is conservative — anything not clearly a talking face or
 * a product/b-roll clip returns null, meaning NO Omni pass (the scene keeps the
 * deterministic FFmpeg-only render):
 *   - 'talking'   → 'talking'   (talking-avatar face — Premium Reel / VOX)
 *   - 'b-roll'    → 'b-roll'    (product/b-roll — dolly-zoom in both bundles)
 *   - 'cinematic' → null        (ambiguous stylized montage — FFmpeg-only)
 *   - anything else → null
 * ('mixed' is reachable by the routing table but no current scene type derives
 * it — it stays in the return union for the Concierge per-scene override later.)
 */
export function mapSceneToOmniTarget(sceneType: string): OmniSceneTarget | null {
  if (sceneType === 'talking') return 'talking';
  if (sceneType === 'b-roll') return 'b-roll';
  return null;
}

// ---------------------------------------------------------------------------
// Deterministic slot derivation
// ---------------------------------------------------------------------------

/** Small English + Tagalog stopword set for the emphasis-word fallback. */
const STOPWORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'these', 'those',
  'you', 'your', 'it', 'its', 'we', 'our', 'they', 'them', 'so', 'as', 'at',
  'by', 'from', 'not', 'no', 'yes', 'do', 'does',
  // Tagalog / Taglish
  'ka', 'ako', 'ang', 'ng', 'mga', 'na', 'sa', 'ay', 'si', 'mo', 'ko', 'niya',
  'hindi', 'lang', 'pa', 'po', 'ni', 'kay', 'ito', 'iyon', 'yung', 'yun', 'din',
  'rin', 'nga', 'ba', 'kasi', 'para', 'kung', 'may', 'meron', 'wala',
]);

const stripToken = (t: string): string => t.replace(/[^\p{L}\p{N}]/gu, '');

/**
 * Pick the single emphasis/title word from a script line:
 *   1. First ALL-CAPS word of 3+ letters (the writer already shouted it), else
 *   2. The longest word not in {@link STOPWORDS}.
 * Always returned UPPERCASE. Empty line → ''.
 */
export function pickEmphasisWord(scriptLine: string): string {
  const tokens = (scriptLine ?? '')
    .split(/\s+/)
    .map(stripToken)
    .filter(Boolean);

  // 1. ALL-CAPS priority (must contain a cased letter, 3+ letters).
  for (const t of tokens) {
    const letters = t.replace(/[^\p{L}]/gu, '');
    if (letters.length >= 3 && t === t.toUpperCase() && t !== t.toLowerCase()) {
      return t.toUpperCase();
    }
  }

  // 2. Longest non-stopword.
  let best = '';
  for (const t of tokens) {
    if (STOPWORDS.has(t.toLowerCase())) continue;
    if (t.length > best.length) best = t;
  }
  return best.toUpperCase();
}

export interface OmniSlotContext {
  scriptLine: string;
  allScriptLines: string;
  brandPrimaryHex?: string;
  /* Storyboard scene description → the dolly-zoom subject_desc slot. */
  sceneDescription?: string;
  /* Picker chip overrides (Slice 3) — win over the derived word when non-blank. */
  emphasisOverride?: string;
  titleOverride?: string;
}

// Service default when the picker did not sample/set a swatch. The Slice 3 picker
// feeds ctx.brandPrimaryHex (hero-image dominant color or the user's pick); this
// is only the fallback when that is absent.
const DEFAULT_BRAND_HEX = '#FFCC00';

/**
 * Derive the exact slot map a preset needs from the scene/ad context. Returns
 * ONLY the slots that preset declares (so fillPromptTemplate never sees noise).
 * Deterministic — no randomness — so the same input always yields the same
 * prompt. Slot semantics per workflows/omni_edit_styles_plan.md §Decision 7.
 */
export function deriveSlots(presetId: OmniPresetId, ctx: OmniSlotContext): Record<string, string> {
  const emphasis = pickEmphasisWord(ctx.scriptLine);
  const brandHex = ctx.brandPrimaryHex || DEFAULT_BRAND_HEX;

  switch (presetId) {
    case 'premium-reel-v2':
      return {
        transcript: ctx.scriptLine,
        emphasis_words: ctx.emphasisOverride?.trim() || emphasis,
        brand_primary_hex: brandHex,
      };
    case 'vox-explainer-v1':
      return {
        topic_context: ctx.allScriptLines,
        title_text: ctx.titleOverride?.trim() || emphasis,
      };
    case 'dolly-zoom-v1':
      // subject_desc: the storyboard scene description (the shot), falling back
      // to the spoken line when no description is threaded.
      return {
        subject_desc: ctx.sceneDescription?.trim() || ctx.scriptLine,
      };
    case 'display-text-pop-v1':
      return {
        display_words: emphasis,
        anchor_moment: `as the speaker says "${emphasis}"`,
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// Per-scene ladder state machine (PURE — the unit-test target)
// ---------------------------------------------------------------------------

export type LadderStatus = 'idle' | 'firing' | 'polling' | 'styled' | 'retrying' | 'fallback';

export type LadderEvent =
  | 'fire_ok'
  | 'fire_blocked'
  | 'fire_budget_exhausted'
  | 'fire_error'
  | 'poll_done_ok_gate_pass'
  | 'poll_done_ok_gate_fail'
  | 'poll_done_blocked'
  | 'poll_done_failed'
  | 'poll_timeout';

export interface LadderState {
  status: LadderStatus;
  /** Paid fire attempts started for this scene. Hard cap 2 (initial + 1 retry). */
  attemptsUsed: number;
  fallbackReason?: string;
}

/** The scene ladder begins with the first paid fire already in flight. */
export function initialLadderState(): LadderState {
  return { status: 'firing', attemptsUsed: 1 };
}

/** One failure event → retry once, then fall back. `attemptsUsed` increments as
 *  the retry fire is authorized, and is hard-capped at 2. */
function failOrRetry(attemptsUsed: number, reason: string): LadderState {
  if (attemptsUsed >= 2) {
    return { status: 'fallback', attemptsUsed, fallbackReason: reason };
  }
  return { status: 'retrying', attemptsUsed: attemptsUsed + 1 };
}

/**
 * PURE ladder transition. Policy (plan §Decision 6):
 *   - blocked / failed / timeout / gate-fail → ONE retry (re-fire same template);
 *     a second failure of any kind → fallback(reason).
 *   - budget_exhausted → immediate fallback, no retry.
 * `omni_styles_disabled` is handled one level up (the orchestrator short-circuits
 * to a fallback outcome without entering the ladder).
 */
export function nextLadderStep(state: LadderState, event: LadderEvent): LadderState {
  const { status, attemptsUsed } = state;

  // Fire-phase events apply while firing OR retrying (the retry is a re-fire).
  if (status === 'firing' || status === 'retrying') {
    switch (event) {
      case 'fire_ok':
        return { status: 'polling', attemptsUsed };
      case 'fire_budget_exhausted':
        return { status: 'fallback', attemptsUsed, fallbackReason: 'budget_exhausted' };
      case 'fire_blocked':
        return failOrRetry(attemptsUsed, 'blocked');
      case 'fire_error':
        return failOrRetry(attemptsUsed, 'error');
      default:
        return state; // poll events are not valid mid-fire
    }
  }

  if (status === 'polling') {
    switch (event) {
      case 'poll_done_ok_gate_pass':
        return { status: 'styled', attemptsUsed };
      case 'poll_done_ok_gate_fail':
        return failOrRetry(attemptsUsed, 'gate');
      case 'poll_done_blocked':
        return failOrRetry(attemptsUsed, 'blocked');
      case 'poll_done_failed':
        return failOrRetry(attemptsUsed, 'failed');
      case 'poll_timeout':
        return failOrRetry(attemptsUsed, 'timeout');
      default:
        return state;
    }
  }

  // styled / fallback / idle are terminal for the machine.
  return state;
}

// ---------------------------------------------------------------------------
// Network orchestrator
// ---------------------------------------------------------------------------

export interface OmniSceneOutcome {
  sceneIdx: number;
  outcome: 'styled' | 'fallback';
  styledUrl?: string;
  fallbackReason?: string;
  attemptsUsed: number;
}

export interface ApplyOmniStyleOpts {
  finishedAdId: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  brandPrimaryHex?: string;
  /* Picker chip overrides (Slice 3) — threaded into deriveSlots per scene. */
  slotOverrides?: { emphasisWord?: string; titleText?: string };
}

const POLL_INTERVAL_MS = 5_000;
const SCENE_DEADLINE_MS = 5 * 60 * 1000; // 5 min per scene

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

/** The fire endpoint only accepts 9:16 / 16:9; square maps to portrait. */
const coerceAspect = (ar: '9:16' | '16:9' | '1:1'): '9:16' | '16:9' =>
  ar === '16:9' ? '16:9' : '9:16';

/** Clip-second estimate for the per-clip cap (server rejects > 8s). */
const estimateClipSec = (scriptLine: string): number =>
  Math.min(8, Math.max(2, Math.round(estimateSpokenSec(scriptLine) || 4)));

interface FireResult {
  event: LadderEvent;
  interactionId?: string;
  disabled?: boolean;
}

async function fireOmni(
  token: string,
  body: Record<string, unknown>
): Promise<FireResult> {
  let res: Response;
  try {
    res = await fetch('/api/gemini/omni-video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    return { event: 'fire_error' };
  }
  if (res.status === 503) return { event: 'fire_error', disabled: true };
  let j: any = null;
  try {
    j = await res.json();
  } catch {
    /* leave null */
  }
  if (res.status === 202 && j?.interactionId) return { event: 'fire_ok', interactionId: j.interactionId };
  if (res.status === 200 && j?.error === 'omni_blocked') return { event: 'fire_blocked' };
  if (res.status === 402 && j?.error === 'omni_budget_exhausted') return { event: 'fire_budget_exhausted' };
  return { event: 'fire_error' };
}

async function pollToCompletion(
  token: string,
  interactionId: string
): Promise<{ event: LadderEvent; url?: string }> {
  const deadline = Date.now() + SCENE_DEADLINE_MS;
  // Consecutive hard-error budget: a blocked/broken interaction must not burn
  // the whole deadline in silence (live smoke 2026-07-06: a blocked-at-poll
  // interaction 502'd for minutes). Network hiccups reset the count on any
  // successful response; 429s don't count (genuinely transient).
  let hardErrors = 0;
  const MAX_CONSECUTIVE_HARD_ERRORS = 5;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    let res: Response;
    try {
      res = await fetch('/api/gemini/omni-video/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ interactionId }),
      });
    } catch {
      continue; // network hiccup — keep polling until the deadline
    }
    let j: any = null;
    try {
      j = await res.json();
    } catch {
      /* leave null */
    }
    if (!res.ok) {
      // Defense in depth: honor a block signal on any status shape.
      if (j?.error === 'omni_blocked') return { event: 'poll_done_blocked' };
      if (res.status === 429) continue; // rate-limited — genuinely transient
      hardErrors += 1;
      if (hardErrors >= MAX_CONSECUTIVE_HARD_ERRORS) return { event: 'poll_done_failed' };
      continue;
    }
    hardErrors = 0;
    if (!j) continue;
    if (!j.done) continue;
    if (j.error === 'omni_blocked') return { event: 'poll_done_blocked' };
    if (j.error) return { event: 'poll_done_failed' };
    if (j.url) {
      // Missing gate (fail-open) is treated as a pass — never discard paid output
      // over eval flakiness.
      const passed = j.gate?.pass !== false;
      return { event: passed ? 'poll_done_ok_gate_pass' : 'poll_done_ok_gate_fail', url: j.url };
    }
    return { event: 'poll_done_failed' };
  }
  return { event: 'poll_timeout' };
}

async function runSceneLadder(
  scene: SceneBatchEntry,
  presetId: OmniPresetId,
  opts: ApplyOmniStyleOpts,
  allScriptLines: string
): Promise<OmniSceneOutcome> {
  const slots = deriveSlots(presetId, {
    scriptLine: scene.scriptLine,
    allScriptLines,
    brandPrimaryHex: opts.brandPrimaryHex,
    sceneDescription: scene.sceneDescription,
    emphasisOverride: opts.slotOverrides?.emphasisWord,
    titleOverride: opts.slotOverrides?.titleText,
  });
  const token = await getAccessToken();
  const fireBody = {
    presetId,
    slots,
    videoUrl: scene.renderedUrl as string,
    aspectRatio: coerceAspect(opts.aspectRatio),
    estimatedDurationSec: estimateClipSec(scene.scriptLine),
    finishedAdId: opts.finishedAdId,
    sceneIdx: scene.sceneIdx,
  };

  let state = initialLadderState();
  let styledUrl: string | undefined;

  // Bounded loop: attemptsUsed caps at 2, so this terminates.
  while (state.status === 'firing' || state.status === 'retrying' || state.status === 'polling') {
    if (state.status === 'firing' || state.status === 'retrying') {
      const fired = await fireOmni(token, fireBody);
      if (fired.disabled) {
        return {
          sceneIdx: scene.sceneIdx,
          outcome: 'fallback',
          fallbackReason: 'omni_styles_disabled',
          attemptsUsed: state.attemptsUsed,
        };
      }
      state = nextLadderStep(state, fired.event);
      if (state.status === 'polling' && fired.interactionId) {
        const polled = await pollToCompletion(token, fired.interactionId);
        if (polled.url) styledUrl = polled.url;
        state = nextLadderStep(state, polled.event);
      }
    }
  }

  if (state.status === 'styled') {
    return { sceneIdx: scene.sceneIdx, outcome: 'styled', styledUrl, attemptsUsed: state.attemptsUsed };
  }
  return {
    sceneIdx: scene.sceneIdx,
    outcome: 'fallback',
    fallbackReason: state.fallbackReason ?? 'unknown',
    attemptsUsed: state.attemptsUsed,
  };
}

/**
 * Orchestrate the whole-ad Omni pass. Each scene with a non-null routed preset
 * runs its own fire→poll→gate ladder CONCURRENTLY (wall-clock ≈ slowest scene,
 * not the sum). Scenes that route to null (no Omni move) are omitted from the
 * outcomes and keep the standard FFmpeg-only render. `onOutcome` fires as each
 * scene resolves so the UI can flip its status chip live.
 */
export async function applyOmniStyle(
  batch: SceneBatchEntry[],
  styleId: OmniStyleId,
  opts: ApplyOmniStyleOpts,
  onOutcome?: (outcome: OmniSceneOutcome) => void
): Promise<OmniSceneOutcome[]> {
  const allScriptLines = batch
    .map((s) => s.scriptLine)
    .filter(Boolean)
    .join(' ');

  const tasks: Promise<OmniSceneOutcome>[] = [];
  for (const scene of batch) {
    if (!scene.renderedUrl) continue;
    const target = mapSceneToOmniTarget(scene.type);
    const presetId: OmniPresetId | null = target ? OMNI_STYLE_ROUTING[styleId][target] : null;
    if (!presetId) continue; // no Omni pass for this scene — standard edit
    tasks.push(
      runSceneLadder(scene, presetId, opts, allScriptLines).then((o) => {
        onOutcome?.(o);
        return o;
      })
    );
  }
  return Promise.all(tasks);
}

/**
 * Re-run the Omni ladder for a SINGLE scene (the user re-roll). Returns a
 * fallback outcome immediately if the scene has no Omni route. `allScriptLines`
 * is threaded so VOX's topic_context stays the full ad brief on a re-roll.
 */
export async function restyleScene(
  scene: SceneBatchEntry,
  styleId: OmniStyleId,
  opts: ApplyOmniStyleOpts,
  allScriptLines: string
): Promise<OmniSceneOutcome> {
  const target = mapSceneToOmniTarget(scene.type);
  const presetId: OmniPresetId | null = target ? OMNI_STYLE_ROUTING[styleId][target] : null;
  if (!presetId || !scene.renderedUrl) {
    return { sceneIdx: scene.sceneIdx, outcome: 'fallback', fallbackReason: 'no_omni_route', attemptsUsed: 0 };
  }
  return runSceneLadder(scene, presetId, opts, allScriptLines);
}
