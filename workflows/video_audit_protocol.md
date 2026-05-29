# Video Audit Protocol — Gemini-as-ears, Claude-as-brain

> **Supersedes** the "Grifon Director AI Video Auditor" **Gem** (retired 2026-05-29).
> The Gem's weakness was stale Knowledge — it confabulated file paths and re-proposed
> already-shipped layers (agent_lessons 2026-05-26). This protocol keeps the Gem's
> good prompt design but drives **raw Gemini 3.5 Flash through the Playwright browser**,
> so Claude injects current context every render and there is no Knowledge to rot.

## The combo

- **Playwright = eyes.** Navigates, screenshots rendered frames, captures signed MP4 URLs.
- **Gemini 3.5 Flash = ears.** Claude cannot ingest video/audio; Gemini hears the clip and
  emits **text**. Claude reads that text back. (Neil signs into his Gemini account once in
  the Playwright Chromium when we reach the audit step — not before.)
- **Opus 4.8 = brain.** Authors the audit prompt fresh each time, reads the structured
  verdict, and maps findings → fixes using **current code state** (never Gemini's guess at
  file paths).

## When to run

After **any** video render during testing — before that clip propagates to the next module
(Signal Modulator / EDL). Operationalizes the 2026-05-26 "watch every video before Signal
Modulator" rule. Never auto-propagate a render downstream without an audit + Neil's approval.

## Division of labor (load-bearing)

- **Gemini = observation layer.** *What failed*, with timestamps + quoted on-screen text.
- **Claude = integration layer.** *Where to fix*, against the live code.
- **Hard ban in the prompt:** Gemini must NOT emit filenames, function names, file paths, or
  "where to integrate." It can't read our code; it pattern-matches plausible paths and
  hallucinates them. Mapping to code is Claude's job, period.

## Ensemble + tiebreak (CRITICAL gates)

- For any launch-blocking verdict (e.g. the CTA accent gate), run **2–3 passes** and take the
  **union** of findings — single-pass multimodal is stochastic (pass 1 catches accent, pass 2
  catches label drift).
- **Human ear is ground truth.** A model auditing another model's audio can also hallucinate —
  it can assert a Filipino accent that isn't there. If the 2–3 passes **disagree** on a
  launch-blocking gate, **Neil listens and renders the final verdict.** Gemini gives recall;
  Neil gives the call when it's borderline.

## Structured output (so Claude can union mechanically)

Ask Gemini to return, per scene, a JSON-ish block — prose is harder to union across passes:

```json
{
  "scene": 4,
  "accent": "FIL" | "AM" | "MIXED",
  "accent_confidence": "high" | "med" | "low",
  "brand_text_on_screen": "<exact rendered text, verbatim — do NOT auto-correct>",
  "dead_air_sec": 0.0,
  "effect_present": true | false,
  "findings": ["short observation with a timestamp", "..."],
  "severity": "CRITICAL" | "MAJOR" | "MINOR" | "OK"
}
```

## Copy-paste audit prompt (Claude pastes this into Gemini each render)

> You are a video QA observer. You will be given a rendered ad clip plus the text prompt that
> generated it. Report ONLY what you observe — do NOT propose code changes, filenames, function
> names, file paths, or "where to integrate." You cannot see our codebase; any path you name is
> a hallucination.
>
> For each scene/clip return the JSON block below. Be precise:
> - **accent**: Is the spoken voice a natural Filipino accent (FIL), an American accent (AM), or
>   mixed? Judge from how the words are pronounced, not the language of the words. Give confidence.
> - **brand_text_on_screen**: Quote the exact text rendered on screen VERBATIM. If it says
>   "Currology" do not "correct" it to "Curology" — quote what is actually shown. Flag any
>   discrepancy from the prompt's named brand.
> - **dead_air_sec**: Seconds of trailing silence after the last spoken word.
> - **effect_present**: Did the intended visual effect/transition actually happen, or is it just
>   camera motion on a static frame?
> - **findings**: Each with a timestamp.
> - **severity**: CRITICAL if it would block shipping this clip.
>
> The clip is target duration ___s, engine ___ (Veo 3.1 / Kling Omni / Kling 3.0).
> The prompt that generated it: ___
> The intended spoken line (verify the audio actually says THIS line, not a neighbor's): "___"
>
> Return JSON only.

> Note the last bullet: this protocol is also the cheapest probe for **#4 line displacement** —
> ask Gemini to confirm the clip's audio speaks ITS OWN scene's line, not the previous scene's.

## Calibration

`Gemini 3.5 flash video audit.md` (repo root) is the canonical style example. Treat its
*architectural recommendations* as STYLE, not current state — most layers it names may have
shipped or been reverted since. Use it for tone/structure of findings, not as truth about code.
