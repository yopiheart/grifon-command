import { GoogleGenAI } from '@google/genai';

// ============================================================================
// api/_lib/omniGate.ts — the per-output QA gate for Omni-styled scene clips.
//
// This is EVAL INFRASTRUCTURE, not generation content: it does NOT shape any
// user-facing output, it only WATCHES a finished Omni clip and reports what it
// sees so the client fallback ladder can decide keep-vs-reroll. It is kept in
// this clearly-marked standalone file so the wording of OMNI_GATE_PROMPT below
// can be reviewed on its own. **Main-loop review requested on the prompt text.**
//
// Design intent (Slice 2, per workflows/omni_edit_styles_plan.md §Decision 6):
//   - Directed text must render letter-perfect (missing → fail).
//   - No word-for-word subtitle captions invented by the model (present → fail).
//   - If the scene has a person, they must still look like the filmed human,
//     not an AI re-render (believability check on talking scenes only).
//
// FAIL-OPEN BY DESIGN: any gate INFRA failure (API error, unparseable JSON)
// returns pass:true so eval flakiness never silently eats an already-PAID
// styled clip. Only a clean, parsed verdict can fail a clip.
// ============================================================================

/** Vision-capable Gemini flash model reused for the gate (researchTextModel /
 *  MODEL_RESEARCH in this codebase). Overridable for eval tuning; never invents
 *  a new id. */
export const OMNI_GATE_MODEL = process.env.OMNI_GATE_MODEL || 'gemini-3.5-flash';

// ----------------------------------------------------------------------------
// OMNI_GATE_PROMPT — EVAL infra. Main-loop review requested on this wording.
// ----------------------------------------------------------------------------
export const OMNI_GATE_PROMPT = `You are a strict video QA inspector. Watch the attached short video clip and report only what is actually visible in it.

Return STRICT JSON and nothing else, in exactly this shape:
{
  "renderedText": string[],
  "hasCaptions": boolean,
  "believability": "real-human" | "likely-ai"
}

Field rules:
- "renderedText": list every readable word or short phrase that appears in the video as on-screen graphics or typography (title cards, kinetic type, callouts, labels, display text). One array entry per distinct word or phrase, spelled exactly as shown. If no text is rendered, return an empty array.
- "hasCaptions": true ONLY if the video shows word-by-word or line-by-line subtitle-style captions that track the spoken audio (the kind auto-caption tools burn in). Occasional title cards, labels, or emphasis words are NOT captions — those set this to false.
- "believability": your honest judgment of whether the person in the video (if any) looks like a real filmed human. Answer "real-human" if the person looks genuinely filmed and unaltered; answer "likely-ai" if the person looks AI-generated, re-rendered, warped, or synthetically re-animated. If there is no person in the clip, answer "real-human".

Output the JSON object only. No markdown fences, no commentary.`;

/**
 * Safety-filter classification shared by the omni fire + poll proxies. Blocks
 * are pre-generation, unbilled prompt × video interactions (see
 * workflows/omni_edit_presets.md §filter resilience). With background:true,
 * Google can defer the verdict to the GET — live-recorded shape (2026-07-06):
 * HTTP 400 `{"error":{"message":"Request blocked due to safety violations
 * (harmful content). Please modify your input and retry.","code":""}}`.
 */
export const looksBlocked = (raw: string): boolean =>
  /safety|blocked|block_reason|blockreason|harmful|prohibited/i.test(raw);

export interface OmniGateVerdict {
  renderedText: string[];
  hasCaptions: boolean;
  believability: 'real-human' | 'likely-ai';
}

export interface OmniGateExpectations {
  /** Words the directing preset asked the model to render — must all appear. */
  directedWords: string[];
  /** True for talking-scene presets — the person must stay believable. */
  expectPerson: boolean;
}

export interface OmniGateResult {
  pass: boolean;
  reasons: string[];
}

/**
 * Tolerant extraction of the gate verdict from a raw model response. Strips
 * markdown fences and grabs the first balanced-looking `{...}` object. Returns
 * null when nothing parseable is found (caller fails open).
 */
export function parseGateResponse(raw: string): OmniGateVerdict | null {
  if (!raw) return null;
  // Drop ```json ... ``` fences if present.
  let s = raw.replace(/```[a-zA-Z]*\n?/g, '').replace(/```/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  s = s.slice(start, end + 1);
  try {
    const obj = JSON.parse(s);
    if (!obj || typeof obj !== 'object') return null;
    return {
      renderedText: Array.isArray(obj.renderedText)
        ? obj.renderedText.filter((x: unknown) => typeof x === 'string')
        : [],
      hasCaptions: obj.hasCaptions === true,
      believability: obj.believability === 'likely-ai' ? 'likely-ai' : 'real-human',
    };
  } catch {
    return null;
  }
}

/**
 * PURE gate policy. Given a parsed verdict and the directing expectations,
 * decide pass/fail with machine reasons:
 *   - 'missing_directed_text' : a directed word never appears in renderedText.
 *   - 'invented_captions'     : the model burned in subtitle-style captions.
 *   - 'believability'         : a person-bearing scene no longer reads as filmed.
 */
export function judgeGate(
  verdict: OmniGateVerdict,
  expectations: OmniGateExpectations
): OmniGateResult {
  const reasons: string[] = [];

  const haystack = (Array.isArray(verdict.renderedText) ? verdict.renderedText : []).map((t) =>
    String(t).toLowerCase()
  );
  const directed = expectations.directedWords ?? [];
  const missing = directed.some((w) => {
    const needle = String(w).toLowerCase().trim();
    if (!needle) return false;
    return !haystack.some((h) => h.includes(needle));
  });
  if (missing) reasons.push('missing_directed_text');

  if (verdict.hasCaptions === true) reasons.push('invented_captions');

  if (expectations.expectPerson && verdict.believability !== 'real-human') {
    reasons.push('believability');
  }

  return { pass: reasons.length === 0, reasons };
}

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

/**
 * Run the vision gate on one Omni clip. Clips are ~1MB, so inline `video/mp4`
 * is fine (no Files-API round-trip needed). Returns the pure {@link judgeGate}
 * verdict on a clean parse, or FAILS OPEN (`pass:true`, reason `gate_unavailable`)
 * on any infra failure — never let eval flakiness discard a paid styled clip.
 */
export async function runOmniGate(
  videoBytes: Buffer,
  expectations: OmniGateExpectations
): Promise<OmniGateResult> {
  try {
    const ai = getAi();
    const resp = await ai.models.generateContent({
      model: OMNI_GATE_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'video/mp4', data: videoBytes.toString('base64') } },
            { text: OMNI_GATE_PROMPT },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    });
    const raw = (resp as any)?.text ?? '';
    const verdict = parseGateResponse(raw);
    if (!verdict) {
      console.warn('[api/_lib/omniGate] unparseable gate response — failing open');
      return { pass: true, reasons: ['gate_unavailable'] };
    }
    return judgeGate(verdict, expectations);
  } catch (err: any) {
    console.warn('[api/_lib/omniGate] gate infra failure — failing open:', err?.message);
    return { pass: true, reasons: ['gate_unavailable'] };
  }
}
