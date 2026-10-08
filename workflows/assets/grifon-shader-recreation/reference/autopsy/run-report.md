# Approved single autopsy result

The approved autopsy completed once. **The canonical specificity gate failed.** No retry or extra paid analysis was made. This result does not approve reference fidelity, sound-event labels, or film production.

## Confirmed

- Input was the unchanged 11,514,975-byte source MP4, SHA-256 `47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089`, with its existing native audio supplied intact.
- Canonical analyzer SHA-256 remained `04e3002f3583071de59b0050e5d83111b6f1a6acf176d2be0700fa0a51d93d30`. The adapter extracted its prompt and specificity function unchanged. Runtime prompt SHA-256: `e553ae978ca4b6d18d14e68f5f0de423dd6f4e75513fbfdc5e52b9c9549f378a`; validator SHA-256: `c1c3b775069688396a63238b695993673d38c801fa049dc7594eb4b8b4672261`.
- Live read-only model lookup confirmed `models/gemini-3.5-flash`, 1,048,576 input-token limit, 65,536 output-token limit, and generateContent/countTokens support.
- [Google's Generate Content thinking guide](https://ai.google.dev/gemini-api/docs/generate-content/thinking#token-limits-and-max_output_tokens) confirms that the maximum response-token setting includes thinking tokens and is an infrastructure-enforced hard cutoff. [Current standard pricing](https://ai.google.dev/gemini-api/docs/pricing) is US$1.50 per million input tokens and US$9 per million output tokens including thinking. Checked 2026-10-08.
- Installed `@google/genai` 1.46.0 declares attempts as total attempts including the original; its implementation uses `retries: attempts - 1`. The client used attempts: 1.
- Exact uploaded file plus unchanged prompt counted as 4,711 input tokens before generation. Maximum approved run cost at that count: US$0.1545225, below the US$0.25 limit.
- An exclusive attempt ledger was written before any provider call. The generation attempt was reserved and persisted before generateContent. The ledger records exactly one generation attempt.
- Completed usage: 4,339 input tokens, 1,695 candidate tokens, 1,985 thinking tokens. Combined generated tokens: 3,680. Total: 8,019. Reconciled standard paid-tier estimate: **US$0.0396285**. Invoice/account charges were not inspected.
- Canonical validator returned one problem: `why_it_works[1] evidence has no measured value`. Raw response, raw text, parsed analysis, request/config receipt, upload receipt, model lookup, specificity result, and usage/cost receipt are preserved beside this report.
- `node workflows/assets/grifon-shader-recreation/autopsy-run.mjs` passed offline input/configuration inspection.
- `npm.cmd run build` passed, exit 0. Existing warnings: outdated Browserslist data and large output chunk.
- `npx.cmd vitest run` passed, exit 0: 116 files passed, 9 skipped; 1,432 tests passed, 32 skipped. Paid/live suites were not enabled.

## Unverified findings and limits

The model proposes `NO_VO`, an electronic house track at 120 BPM, static buzz, a camera-shutter click, and a vinyl-scratch/beat-drop event. These remain machine-analysis hypotheses. The result supplies suspicious 0.06/0.10/0.17-second cue stamps and an estimated 30.7-second duration, versus the measured 31.146667-second container duration in the approved spec. Do not silently reinterpret those stamps as 6/10/17 seconds.

The response's input usage details list TEXT and VIDEO, without a separate AUDIO entry. The original file's audio was supplied, but that receipt alone does not independently prove audio decoding or correct sound classification. Direct hearing is unavailable in this runtime. Frame-indexed comparison, cue confidence, and independent reference review remain with the main task. No exact transcript, tempo, sound identity, or beat synchronization is approved by this output.

The shell tool reported a failing exit code (1) for the analysis invocation, consistent with the recorded specificity failure; the adapter sets its generic-output exit code to 3. The preserved specificity result, rather than the shell code alone, establishes why the run failed.

## Files changed

- `../../autopsy-run.mjs`: task-local, hash-locked adapter; unchanged canonical prompt/model/schema/temperature; approved maximum-output and zero-retry bounds; preflight count; persistent replay guard; redacted evidence receipts. No canonical tool, film renderer, previous asset, application code, or tuned file was changed.
- This directory: one-run evidence and this report. Raw JSON was not edited to manufacture a specificity pass.

## Deviations

None from the approved paid specification. Credential resolution reused the existing analyzer's private loader against the primary repository's existing local configuration because the worktree had no local configuration. No credential value was displayed, copied to an artifact, or placed in a shell argument.

## Could not complete

The specificity pass criterion was not achieved. Reliable, timecoded semantic music/SFX identification is therefore unresolved; no retry is authorized. The exact source remains available for manual/audio verification and deterministic measurement without another provider generation.
