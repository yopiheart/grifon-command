# Focused audio comparison: one approved attempt

The separate audio-only comparison completed once, with **AUDIO input modality confirmed**. Strict timing validation failed on one endpoint. No retry or additional provider call was made. Semantic findings remain hypotheses pending the main task's PCM cross-check and independent review.

## Confirmed execution and evidence

- Approved spec SHA-256: `cc4104c83b9a5d1b55acfdaea0b302afa2e08926095fafd9271d257143aa5d7c`. Exact approved prompt SHA-256: `5bbb7925a1f60fad306811bee33d41b9ccd14f7633d4958fa7a4253a6d82603b`. Neither was edited.
- All three source byte counts and hashes matched the spec. FFprobe confirmed one audio-only stream in each: A = AAC, B/C = MP3. B/C durations matched exactly. A's container displays 31.147 seconds, rounding the approved 31.146667-second duration within 0.001 seconds; the validator conservatively uses the approved duration.
- [Google's Firebase Gemini requirements](https://firebase.google.com/docs/ai-logic/input-file-requirements) list `audio/mp4`; cited for MIME support only. The [direct Generate Content audio guide](https://ai.google.dev/gemini-api/docs/generate-content/audio#technical-details-about-audio) allows multiple audio files. Exact uploads retained approved MIME types, entered ACTIVE state, and succeeded in countTokens before generation. No conversion, trimming, old mixed master, video frame, or extra analysis instruction was supplied.
- Model lookup confirmed `models/gemini-3.5-flash` with sufficient input/output limits. The existing private loader consumed authorized local credentials internally, without exposing or copying values.
- Provider configuration was temperature 0.2, JSON MIME, maximum 8,192 output tokens including thinking, and HTTP attempts: 1. Only the A/B/C markers and exact approved prompt accompanied the three files.
- Exclusive attempt ledger was persisted before provider calls and reserved one generation attempt before generateContent. Exact request count: 8,019 tokens; maximum additional charge at that count: US$0.0857565, below US$0.10.
- Completed usage: 6,427 input tokens (TEXT 744, AUDIO 5,683), 772 candidate tokens, 1,517 thinking tokens. Combined generated tokens: 2,289; total tokens: 8,716. Additional standard paid-tier estimate: **US$0.0302415**. Combined with the first autopsy: **US$0.06987**. Invoice/account charges remain unverified.
- Raw response and raw text were preserved unchanged. Parsed analysis, model/MIME preflight, upload receipts, request receipt, usage/cost receipt, validation result, and attempt ledger are saved here.

## Validation result

The local structure/time validator requires the exact approved fields, numeric decimal-second times, valid confidence/class enums, both candidates once, paired numeric/null candidate regions, ordered intervals, and times within each approved duration. Its offline self-check accepted uncertain/neither and rejected nine invalid fixtures. No response schema was added to the provider request.

Both execution and a free saved-result validation returned:

```text
reference.energy_and_changes[1]: interval exceeds 31.146667 seconds
```

The model's interval ends at 31.15 seconds, exceeding the approved duration by 0.003333 seconds. This small rounding error is recorded honestly; raw output and gate result were not changed to manufacture a pass. It does not validate the model's sound identities or tempo.

## Machine hypotheses requiring cross-check

- A contains vocal chops in the first eight seconds (medium confidence), contradicting the first autopsy's NO_VO hypothesis.
- A is electronic dance music at an estimated 126 BPM, with a change around eight seconds and a proposed riser from 7 to 8.5 seconds.
- B is estimated at 120 BPM and judged dissimilar.
- C is estimated at 126 BPM. The model chooses C and claims the underlying instrumental is identical to A, using “exact,” “identical,” and “perfectly” language. **No exact musical identity or perfect match has been independently established.** Do not treat this wording as evidence for adopting C.
- The model reports no silence intervals. This remains an observation to compare against deterministic silence/energy results.

The main task owns free audio-event measurements and independent review. This adapter did not use their tentative tempo values as model input. No direct human hearing, commercial clearance, soundtrack approval, or film-fidelity pass is claimed.

## Files and checks

- `../../audio-autopsy-run.mjs`: separate hash-locked one-attempt adapter, unchanged canonical private loader, exact approved audio inputs/prompt/configuration, local schema/time validator, replay ledger, and receipts. No canonical provider/tool/skill prompt, model ID, application code, film renderer, old asset, or old autopsy record was edited.
- This directory contains the new run's evidence and this report.
- Offline adapter inspection passed, exit 0. Saved-result validation failed as described above (shell exit 1; adapter's validation failure status is recorded).
- `npm.cmd run build` passed, exit 0; existing Browserslist/chunk-size warnings only.
- `npx.cmd vitest run` passed, exit 0: 116 files passed, 9 skipped; 1,432 tests passed, 32 skipped. Paid/live suites stayed disabled.

## Deviations

The brief requested no additional build/Vitest run. The executor's higher-priority standing instruction requires both after code edits, so that required pair was run once; both passed. No deviation from the approved paid inputs, prompt, model, cap, attempt count, or spend limit.

## Incomplete

Strict timing acceptance failed. Sound/vocal/tempo and candidate-identity claims are not independently verified. No additional analysis or retry is authorized. Preserve the result as a hypothesis and resolve candidate choice through the main task's free measurements and independent review.
