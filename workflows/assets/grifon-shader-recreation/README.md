# Grifon shader reference recreation

The film uses the measured shot order in `reference/independent-shot-map.md`
and the substitutions in `full-brief.md`. The source has 932 video frames at
30000/1001 fps: 31.097733 seconds of video and 31.146667 seconds of audio.
Frame ranges are zero-based and half-open. A frame starts at `n * 1001 / 30000`.

## Accepted opening

`grifon-opening-pilot-silent.mp4` is the frozen 222-frame opening. Its SHA256 is
`6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69`.
`qa/pilot-joint-gate-v3.json` binds its independent native-frame and actual
normal/quarter-speed playback reviews. The reports retain the remaining lens,
glass, honeycomb and gloss differences. The opening gate covers visual frames
0-221 only.

The editable opening uses `pilot.json` for English copy, phase boundaries,
camera keys, palette and material timing; `surfaces.frag` for procedural
surfaces; and `pilot.js` for the local GPU composition. `build-pilot.mjs`
generates signed glyph fields from the committed Inter contours.

The full film preserves the accepted opening. Editing its nine bound runtime
inputs requires a new render and visual review rather than rebinding the old
MP4. The producer verifies the original encoded-file and source hashes:

```powershell
node workflows/assets/grifon-shader-recreation/render-pilot.mjs verify
node workflows/assets/grifon-shader-recreation/qa/pilot-provenance-guard.mjs
```

The second command demonstrates the historical stale-media defect in an
isolated fixture and rejects changed shader input, changed encoded bytes and
an unknown command. `qa/pilot-source-receipt.json` distinguishes the historical
encode/readiness tools from the later verification guard revision.

## Audio evidence and editable mix

`audio.json` holds the clean Digital Clouds excerpt, sample offsets, fades and
linear mastering recipe. `audio-mix.mjs --build` regenerates the private local
masters; `--verify` validates their provenance and PCM/AAC measurements. The
existing source track is a required local workflow input. No provider call is
part of this mix.

`reference/autopsy-summary.md` separates raw model hypotheses from measured
evidence. The two approved calls are complete, single-attempt operations;
neither authorizes another run. Their combined token-based charge estimate is
US$0.06987, invoice unverified. The audio-only request used AUDIO input, but
exact song identity, vocal text, named SFX and perceived sonic resemblance
remain unverified. Metering and browser playback do not establish hearing.

## Full landscape source and export

`full.json` holds the continuation's copy, native frame cuts, catalog and shell
camera keys, and palette. Additional poses, geometry and material constants
live in `full.js`, which composes the procedural geometry and unchanged example UI
captures; `full-surfaces.frag` defines the surface materials. `build-full.mjs`
binds the local captures, canonical mark, fonts and outlines in its manifest.
The continuation is a separate GPU program so it can initialize independently
of the accepted opening.

```powershell
node workflows/assets/grifon-shader-recreation/build-full.mjs
node workflows/assets/grifon-shader-recreation/render-full.mjs render
node workflows/assets/grifon-shader-recreation/render-full.mjs mux
node workflows/assets/grifon-shader-recreation/render-full.mjs verify
node workflows/assets/grifon-shader-recreation/verify-full-guard.mjs
```

These commands use installed local GPU/browser/media tools and the existing
private music master. They make no provider call. Rendering captures frames
222-931 at their native times, checks nonlinear/fresh-browser replay, and
retains the complete capture receipt, then encodes the film. The separate
`encode` command reuses an unchanged bound capture sequence. Encoding stream-copies the accepted
opening into the full silent film, then verifies all 932 presentation timestamps
and every decoded opening frame. Muxing preserves the entire approved AAC
packet stream, priming, metadata and decoded PCM.

The AAC's measured stream/container duration is 31.146000 seconds; decoding
returns 1,495,040 sample frames, or 31.146667 seconds. The native video duration
is 31.097733 seconds. Those distinct measurements are retained in the receipts.
The verification command rejects a changed source or changed MP4 before it can
rebind the existing export. Source changes require a new render and review.
`qa/full-failed-review-1/` preserves the first full candidate's source/evidence;
its MP4, player and complete raw captures remain in the ignored private folder.
`qa/full-focused-failed-review-2/` and `qa/full-focused-failed-review-3/` preserve
the two subsequent focused drafts that remain on HOLD. Their private sample
and comparison images are preserved separately; neither represents a full-film pass.
The 131 frozen v4 payloads in `qa/full-focused-review-4-inputs/` remain
unchanged. Independent inspection of all 55 v4 pairs holds the joined shell
at frames 357-376; the other six signature families are established for a later
full-candidate gate. Its static source PASS does not approve visual fidelity.
The frozen v5 boundary in `qa/full-focused-review-5-inputs/` subsequently
passed independent 55-pair and shell source review. Its 51 non-shell samples
are byte-identical to v4; the four reviewed shell poses establish two openings
inside one broad curved body. Rim regularity and point spacing remain residuals.
This releases a fresh full capture; full native and paced gates remain separate.

The subsequent full candidate `15cbddf0` passed the production checks but
failed the independent 932-frame native gate at precisely 400, 403, 636 and
639. The fourth pattern change at 407 aligns. Its completed source/evidence
boundary is preserved in `qa/full-failed-review-2/`, with its exports, widget,
private pair and all 710 raw continuation frames in the private counterpart.
`reference/full-timing-correction-brief-v3.md` bounds the correction to two
runtime lines and those four frames. The corrected render and its independent
native/paced reviews are recorded separately below; failed evidence stays intact.

The corrected candidate `c99c93c8` has fresh source-bound captures and passes
the production checks. Exactly 400, 403, 636 and 639 differ from the preserved
710-frame raw sequence; all 706 other continuation PNGs and the 222 decoded
opening frames match. Independent two-line source review passes. The new
932-frame native review and actual paced review pass as a close visual adaptation.
`qa/full-joint-gate-v3.json` binds the final film, standalone player and completed
independent reports without rewriting the production-time pending verdict.
The native critic inspected all 932 chronological pairs, with enlarged details
and a separate 49-cut team review. The timed runner played one aligned silent
comparison stream naturally at 1x and 0.25x; the team inspected every retained
capture (136 normal, 452 slow) across 55 sheets. These are actual playback
snapshots, not a claim of observing every display refresh. One quarter-speed
drop near frame 3 is documented; normal playback had none and there were no
later drops. Grain, glow, shape, density and stripe-position residuals remain
in the independent reports. The soundtrack remains SONIC_UNVERIFIED.

## Private visual comparison

`build-paired-review.mjs` creates the opening comparison; the full counterpart
is `build-full-paired-review.mjs`. Both require the native local reference and
produce a silent stream with source left and Grifon right. One stream preserves
the presented-frame alignment used by the timed review.

```powershell
node workflows/assets/grifon-shader-recreation/review-server.mjs
```

The local server prints its loopback URL. `/paired` is the opening; `/paired-full`
is the full comparison when its bound inputs exist. `/` is a paused detail
comparison. Historical timed evidence records the exact served page, media,
receipt and before/after hashes, since working paths may later change.
The full builder rejects changed continuation sources before media work,
validates a unique staging MP4, then creates an immutable page/media/receipt
generation. The server validates and pins that generation in memory on its
first full request. Restart the local server after building a new full pair.
Failed rebuilds retain the previously validated generation.

```powershell
node workflows/assets/grifon-shader-recreation/qa/pair-provenance-guard.mjs --synthetic-only
```

This repeatable fixture check covers publication failures, binding rejection
and stable HTTP ranges. Native media work is mocked; the original stale-source
defect witness is retained as timestamp/hash-bound history in its QA report.

The reference MP4/AAC, full decoded PNG sequences, raw local music and private
paired streams are ignored. Reference and failed-pilot recovery archives have
separate byte/CRC receipts under `reference/`. Older exports remain preserved.

## Standalone delivery

`tools/artifacts/build-grifon-shader-recreation.mjs` builds
`artifacts/grifon-shader-recreation.html` from the finished Grifon landscape MP4,
its native poster and bound QA/audio recipe. `--check` requires byte-identical
regeneration of the page and build receipt. The offline page contains the
Grifon film and poster, and downloads the original embedded MP4 bytes.

The final player passed all 33 smoke assertions at 390x844 and 1280x844,
including offline playback, controls and byte-identical MP4 downloads.
`reference/player-mobile-review-v3.md` and `qa/player-final-v3/` retain its
review, screenshots and report. Full native/timed visual reviews also pass
with the stated residuals. Technical audio integrity passed 12 checks;
heard resemblance, song identity and named SFX remain unverified. Product views use
unchanged Script/Storyboard captures with manually prepared example content
and a visible Example project disclosure. Publication, deployment and merge
are separate user actions.

`qa/player-mobile-smoke.mjs` requires explicit `--artifact` and `--film`
SHA256 values for the frozen HTML and MP4, plus `--out` with a new QA folder
name. It rejects missing/malformed hashes, changed bytes or an existing output
folder before browser launch. Every candidate retains its own screenshots,
downloads and report; the preserved first-player checks remain historical.
