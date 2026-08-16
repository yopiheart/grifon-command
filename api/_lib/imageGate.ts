import { GoogleGenAI, Type } from '@google/genai';

// ============================================================================
// api/_lib/imageGate.ts — the per-still QA gate for producer scene images.
//
// A faithful clone of api/_lib/omniGate.ts (video → still): EVAL INFRASTRUCTURE,
// not generation content. It does NOT shape any user-facing output — it only
// WATCHES a generated scene still and reports what it sees so the deterministic
// judge can flag identity drift / a garbled product label BEFORE the still
// poisons the ~$0.50–1.00 video render it seeds (plan §3.6, Phase P4).
//
// Design intent (owner decisions, ranked by harm):
//   1. identity drift — a reference-bearing scene must show the locked avatar.
//   2. garbled/illegible product label — a product scene's label must read.
//   3. composition — OBSERVED and recorded, but LOG-ONLY this phase (never flags).
//
// FLAG-ONLY + FAILS OPEN BY DESIGN: any gate INFRA failure (API error,
// unparseable JSON) returns pass:true (reason 'gate_unavailable') so eval
// flakiness never discards a paid still. The AI here EXTRACTS FACTS ONLY; the
// pure {@link judgeImageGate} owns every keep-vs-flag decision deterministically.
//
// **Main-loop review requested on IMAGE_GATE_PROMPT wording** — kept standalone,
// exactly like OMNI_GATE_PROMPT, so it can be reviewed on its own.
// ============================================================================

/** Vision-capable Gemini flash model reused for the still gate (same convention
 *  as OMNI_GATE_MODEL). Overridable for eval tuning; never invents a new id.
 *
 *  2026-08-15: 3.5-flash → 3.7-flash (Neil-approved), in lockstep with
 *  OMNI_GATE_MODEL. Output rate $9.00 → $3.75 per Mtok. ⚠️ Unlike the omni gate
 *  this one is NOT behaviorally inert — it drives the only automated reroll, so
 *  watch flag/reroll rates after this ships. ⏪ Instant rollback WITHOUT a deploy:
 *  set the IMAGE_GATE_MODEL env var back to 'gemini-3.5-flash' on Vercel. */
export const IMAGE_GATE_MODEL = process.env.IMAGE_GATE_MODEL || 'gemini-3.7-flash';

// ----------------------------------------------------------------------------
// IMAGE_GATE_PROMPT — EVAL infra. Main-loop review requested on this wording.
// Observations only — the model reports FACTS, never a pass/fail opinion.
// ----------------------------------------------------------------------------
export const IMAGE_GATE_PROMPT = `You are a strict image QA inspector. Look at the attached generated scene still and report only what is actually visible in it.

Return STRICT JSON and nothing else, in exactly this shape:
{
  "personPresent": boolean,
  "personMatchesReference": boolean | null,
  "productLabelText": string | null,
  "labelLegible": boolean | null,
  "lightingLooksProduced": boolean | null,
  "compositionNotes": string
}

Field rules:
- "personPresent": true if a human person is visible in the scene still, false if not.
- "personMatchesReference": if a REFERENCE person image was provided, answer true when the person in the scene still is clearly the same individual as the reference (same face, build, look), false when they are clearly a different person or an AI-warped re-render. If NO reference image was provided, answer null.
- "productLabelText": if a product with readable label/brand typography is visible, transcribe that text VERBATIM exactly as shown. If no product text is visible, answer null.
- "labelLegible": if a product label is present, answer true when its text is crisp and readable, false when it is warped, smeared, garbled, or gibberish. If no product label is present, answer null.
- "lightingLooksProduced": answer true when the light in this still reads as PRODUCED rather than ordinary — any of: a warm, amber or orange colour cast over the whole frame; a visible rim or edge light separating the subject from the background; a strong directional key throwing hard shadows; or an obviously graded, filmic, cinematic look. Answer false when the light reads as ordinary natural or ambient room light with no cast and no rim. Answer null only if you genuinely cannot tell. Judge the LIGHT, not the subject's attractiveness, and not how good the photo is.
- "compositionNotes": one short phrase describing framing/composition (e.g. "centered medium shot, product held at chest"). Keep it under 15 words.

Output the JSON object only. No markdown fences, no commentary.`;

/**
 * Structured-output schema for the gate call — the SHAPE the prompt above already
 * asks for, restated where the decoder can enforce it.
 *
 * Added 2026-07-26 after the fail-open root cause was measured (39-call replay of the
 * stills that actually failed on run apr_876ef559): `responseMimeType: 'application/json'`
 * ALONE is a hint, not constrained decoding. 23% of responses came back with correct,
 * complete observations wrapped in damaged framing — a missing '}', one or five surplus
 * '}', or a stray '"' before the close — every one of them on a clean finishReason STOP
 * with normal output-token counts. The verdicts were sound; only the punctuation was not.
 *
 * The three tri-state fields stay NULLABLE on purpose: null means "unverifiable", which
 * is the conservative path {@link judgeImageGate} never flags on. Forcing a boolean here
 * would turn "I could not tell" into a hard claim and manufacture identity_drift flags.
 */
export const IMAGE_GATE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    personPresent: { type: Type.BOOLEAN },
    personMatchesReference: { type: Type.BOOLEAN, nullable: true },
    productLabelText: { type: Type.STRING, nullable: true },
    labelLegible: { type: Type.BOOLEAN, nullable: true },
    lightingLooksProduced: { type: Type.BOOLEAN, nullable: true },
    compositionNotes: { type: Type.STRING },
  },
  required: [
    'personPresent',
    'personMatchesReference',
    'productLabelText',
    'labelLegible',
    'lightingLooksProduced',
    'compositionNotes',
  ],
};

/** Reference modes that imply the locked avatar/person must appear in the scene.
 *  'avatar_state' added 2026-08-16 WITH the mode itself — it was missed on the first pass,
 *  which left the two beats of a person transformation (the before hook and the after reveal)
 *  with NO identity check at all. Those are the exact beats that rendered a stranger on two
 *  consecutive live runs, so they are the last place the check should have been absent. */
const IDENTITY_MODES = new Set(['avatar', 'both', 'avatar_venue', 'avatar_state']);

export interface ImageGateObservations {
  personPresent: boolean;
  /** null when no reference image was supplied to the gate. */
  personMatchesReference: boolean | null;
  /** Verbatim product label text read off the still, or null when none visible. */
  productLabelText: string | null;
  labelLegible: boolean | null;
  /** true = produced/cinematic light (warm cast, rim light, hard key, graded look).
   *  null = unverifiable, which never flags. Added 2026-08-16. */
  lightingLooksProduced: boolean | null;
  compositionNotes: string;
}

export interface ImageGateVerdict {
  pass: boolean;
  /** Machine flags: 'identity_drift' | 'garbled_label'. Composition is never flagged. */
  flags: string[];
  /** Log-only composition observation (recorded, never gates this phase). */
  compositionNotes?: string;
  /** Set to 'gate_unavailable' on the fail-open path. */
  reason?: string;
  /** WHY the fail-open happened, short and safe to log (never the image, never a key).
   *  Exists because 'gate_unavailable' alone made every non-run look identical, so a 22% and a
   *  37.5% fail-open rate across two live runs could not be explained, only counted. */
  detail?: string;
}

/** The full gate result the handler returns: raw observations + the pure verdict.
 *  observations is null on the fail-open path. */
export interface ImageGateResult {
  observations: ImageGateObservations | null;
  verdict: ImageGateVerdict;
}

export interface ImageGateExpectations {
  /** The scene's reference-image mode — drives whether identity is expected. */
  referenceMode: string;
  /** The product name/label the still is expected to render, when applicable. */
  expectedLabelText?: string;
}

/**
 * Recover the object text from a response whose brace/quote framing is damaged at the
 * tail. Defence in depth behind {@link IMAGE_GATE_SCHEMA}: the schema should stop the
 * damage happening, this survives it if the decoder ever slips again.
 *
 * Walks from the first `{` with string- and escape-awareness, so a brace INSIDE a string
 * is never miscounted. That awareness is the whole point — the previous `lastIndexOf('}')`
 * could not tell a real closer from a stray one, and it is what discarded 23% of the
 * verdicts. All four malformations measured on 2026-07-26 are handled:
 *
 *   surplus braces  `{…}\n}` and `{…}\n}\n}\n}\n}\n}`  -> stop at the depth-0 close, ignore the rest
 *   missing brace   `{…"notes": "centered"`             -> close what is still open
 *   stray quote     `{…"notes": "centered"\n"\n}`       -> drop the unterminated string, then close
 *
 * Returns null when there is no `{` at all, or when the text opens nothing to repair —
 * the caller then fails open exactly as before. Exported for direct unit testing.
 */
export function extractJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let openQuoteAt = -1;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      openQuoteAt = i;
    } else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      return s.slice(start, i + 1); // the real end — anything after it is surplus
    }
  }
  if (depth <= 0) return null; // nothing left open: not a repairable tail
  // Ran out of input mid-object. If we are stranded inside a string, that string is the
  // damage (the stray-quote case) — cut it away. A dangling comma would then be the last
  // thing left, and that is not valid JSON either, so drop it too.
  const cut = (inString && openQuoteAt > start ? s.slice(start, openQuoteAt) : s.slice(start))
    .trimEnd()
    .replace(/,$/, '');
  // Only repair something that actually carries a property. A bare '{' is garbage, not a
  // damaged observation object, and closing it into '{}' would parse — turning a fail-open
  // into a silent all-defaults verdict (personPresent:false), which is far worse than null.
  if (!cut.includes(':')) return null;
  return cut + '}'.repeat(depth);
}

/**
 * Tolerant extraction of the observations from a raw model response. Strips
 * markdown fences and grabs the first balanced-looking `{...}` object, coercing
 * every field defensively so a malformed type never over-flags. Returns null
 * when nothing parseable is found (caller fails open).
 */
export function parseImageGateResponse(raw: string): ImageGateObservations | null {
  if (!raw) return null;
  const s = raw.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
  const candidate = extractJsonObject(s);
  if (candidate === null) return null;
  try {
    const obj = JSON.parse(candidate);
    if (!obj || typeof obj !== 'object') return null;
    const label =
      typeof obj.productLabelText === 'string' && obj.productLabelText.trim()
        ? obj.productLabelText.trim()
        : null;
    return {
      personPresent: obj.personPresent === true,
      personMatchesReference:
        typeof obj.personMatchesReference === 'boolean' ? obj.personMatchesReference : null,
      productLabelText: label,
      labelLegible: typeof obj.labelLegible === 'boolean' ? obj.labelLegible : null,
      // Anything that is not an explicit boolean becomes null = unverifiable, which never
      // flags. An older gate response that predates this field therefore stays passing.
      lightingLooksProduced:
        typeof obj.lightingLooksProduced === 'boolean' ? obj.lightingLooksProduced : null,
      compositionNotes: typeof obj.compositionNotes === 'string' ? obj.compositionNotes : '',
    };
  } catch {
    return null;
  }
}

/** Normalize label text for comparison — lowercase, alphanumerics only. */
const normLabel = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Classic Levenshtein distance (small strings only — product labels). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * PURE gate policy. Given parsed observations and the scene's expectations,
 * decide pass/fail with machine flags. Ranked by harm (owner decision):
 *   - 'identity_drift' : a reference-bearing scene shows no person, or a person
 *     that clearly is NOT the locked avatar.
 *   - 'garbled_label'  : an expected product label is illegible, or the read
 *     text is CLEARLY garbled vs the expected name (conservative — near-matches
 *     never flag; a null read never flags on mismatch alone).
 *   - composition      : recorded in `compositionNotes`, NEVER flagged this phase.
 * Fully deterministic + network-free so it is unit-testable in isolation.
 */
export function judgeImageGate(
  observations: ImageGateObservations,
  expectations: ImageGateExpectations
): ImageGateVerdict {
  const flags: string[] = [];

  // ── Identity (rank 1) ──────────────────────────────────────────────────────
  if (IDENTITY_MODES.has(expectations.referenceMode)) {
    if (observations.personPresent === false) {
      flags.push('identity_drift');
    } else if (observations.personMatchesReference === false) {
      // null (unverifiable) never flags — conservative.
      flags.push('identity_drift');
    }
  }

  // ── Product label (rank 2) ─────────────────────────────────────────────────
  const expected = normLabel(expectations.expectedLabelText ?? '');
  if (expected) {
    let garbled = false;
    if (observations.labelLegible === false) {
      garbled = true;
    } else if (observations.productLabelText) {
      // Only judge garble when the model actually READ label text; a null read
      // means the product simply wasn't framed — not a garble, never flags.
      const read = normLabel(observations.productLabelText);
      if (read && !expected.includes(read) && !read.includes(expected)) {
        const sim = 1 - levenshtein(read, expected) / Math.max(read.length, expected.length);
        if (sim < 0.5) garbled = true; // CLEAR garble only — near-matches pass.
      }
    }
    if (garbled) flags.push('garbled_label');
  }

  // ── Produced/cinematic light on an identity scene (rank 3, NEW 2026-08-16) ──
  // Colour-grade drift is the longest-running unfixed defect on this pipeline (4+
  // corroborations) and it MOVES between scenes, so tuned-prompt guardrails keep missing it:
  // it was in the hook, then in scene 4 of the next run. A watcher catches what a rule cannot
  // predict the location of.
  //
  // SCOPED TO IDENTITY SCENES ON PURPOSE, and this is the whole judgement call: a produced
  // relight is only a defect when it is relighting a LOCKED FACE, because that is what pulls
  // the render away from the reference and reads as AI. A deliberately cinematic product or
  // venue shot is a legitimate look and must not be flagged. Scoping this way also avoids
  // plumbing a new "expected register" field through five files for a soft signal.
  //
  // null (unverifiable) never flags — the same conservative path as every field above.
  if (IDENTITY_MODES.has(expectations.referenceMode) && observations.lightingLooksProduced === true) {
    flags.push('cinematic_grade');
  }

  return {
    pass: flags.length === 0,
    flags,
    compositionNotes: observations.compositionNotes || undefined,
  };
}

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

/** Split a data URL (or bare base64) into its mime type + base64 payload. */
function splitImageData(s: string): { mimeType: string; data: string } {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(s);
  if (m) return { mimeType: m[1], data: m[2] };
  return { mimeType: 'image/png', data: s };
}

export interface RunImageGateParams {
  imageBase64: string;
  referenceImageBase64?: string;
  expectedLabelText?: string;
  referenceMode: string;
  model?: string;
}

/**
 * Make the vision call and return parsed OBSERVATIONS. Throws a typed infra
 * error on an API failure or an unparseable response — the caller ({@link gateImage})
 * turns any throw into a fail-open pass. EXTRACTS FACTS ONLY (no judgment here).
 */
export async function runImageGate(params: RunImageGateParams): Promise<ImageGateObservations> {
  const ai = getAi();
  const parts: any[] = [];
  if (params.referenceImageBase64) {
    const ref = splitImageData(params.referenceImageBase64);
    parts.push({ text: 'REFERENCE PERSON (the avatar the scene should match):' });
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
    parts.push({ text: 'GENERATED SCENE STILL (report on THIS image):' });
  }
  const still = splitImageData(params.imageBase64);
  parts.push({ inlineData: { mimeType: still.mimeType, data: still.data } });
  // Append the expected-label context so productLabelText has a target to read against.
  const labelHint = params.expectedLabelText
    ? `\n\nContext: the product in this scene is "${params.expectedLabelText}" — read any product label text verbatim.`
    : '';
  parts.push({ text: IMAGE_GATE_PROMPT + labelHint });

  const resp = await ai.models.generateContent({
    model: params.model || IMAGE_GATE_MODEL,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', responseSchema: IMAGE_GATE_SCHEMA },
  });
  const raw = (resp as any)?.text ?? '';
  const observations = parseImageGateResponse(raw);
  if (!observations) {
    // Distinguish the two failures — they have OPPOSITE fixes and were indistinguishable while
    // both collapsed into one 'gate_unavailable'. EMPTY means the model returned no text at all
    // (safety block, a stop before any output, an SDK shape we are not reading); UNPARSEABLE means
    // it spoke but not in JSON, which is a prompt/schema problem. The 2026-07-25 runs failed open
    // on 22% then 37.5% of scenes with no way to tell which — this is what makes that answerable.
    // finishReason is the single most diagnostic field for the empty case, so it rides along.
    const finish = (resp as any)?.candidates?.[0]?.finishReason ?? 'unknown';
    throw new Error(
      raw.trim()
        ? `IMAGE_GATE_UNPARSEABLE: finish=${finish} head=${raw.trim().slice(0, 60)}`
        : `IMAGE_GATE_EMPTY: finish=${finish}`,
    );
  }
  return observations;
}

/**
 * Run the still gate end-to-end: vision extract → pure judge, FAILING OPEN on
 * any infra/parse error (mirrors runOmniGate's doctrine exactly). Returns the
 * raw observations alongside the verdict so the handler can log both, and the
 * offline precision analysis can be run from producer_scenes.gate_verdict
 * BEFORE the gate is ever allowed reroll authority.
 */
export async function gateImage(params: RunImageGateParams): Promise<ImageGateResult> {
  try {
    const observations = await runImageGate(params);
    return {
      observations,
      verdict: judgeImageGate(observations, {
        referenceMode: params.referenceMode,
        expectedLabelText: params.expectedLabelText,
      }),
    };
  } catch (err: any) {
    // Truncated hard: this string lands in client telemetry, so it carries the cause and nothing
    // else — no image bytes, no key material, no unbounded model prose.
    const detail = String(err?.message ?? 'unknown').slice(0, 120);
    console.warn('[api/_lib/imageGate] gate infra failure — failing open:', detail);
    return { observations: null, verdict: { pass: true, flags: [], reason: 'gate_unavailable', detail } };
  }
}
