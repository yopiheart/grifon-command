# NOW - the resume doc
**Stamped: 2026-09-27, opening motion corrected in V04**

## Current state
Neil approved the 10.1s pilot, then delegated the full sequence. After reviewing
V03 he correctly flagged the first 13s as under-animated: no typing, missing
collage pan, and objects that stopped turning too early. V04 corrects those
motions in the complete 32.90s / 1920x1080 / 30fps composition, using the same
supplied ElevenLabs/Reception.ai reference.
Silent preview only: no music/SFX, final MP4 export, paid calls or AE dependency.
No other project's compositions/assets/settings used. Canonical logo retained.

## Deliverable and backup
Branch: codex/ae-elevenlabs-reference, based on codex/grifon-motion-spark.
Draft PR149: https://github.com/yopiheart/grifon-command/pull/149
Source: workflows/assets/grifon-reference-full/.
Verified player: http://127.0.0.1:4179/compare.html
Run: node workflows/assets/grifon-reference-full/serve.mjs
Builder: node tools/artifacts/build-grifon-reference-full.mjs
Portable twin: artifacts/grifon-reference-full.html (15.2 MiB).
Full-v03 and full-v04 source backups and untouched approved-closing input in backups/.
Preview proof: qa/full-preview.jpg. Exact visible wording: copy.js.
opening.js/css/html, objects.js and solids.js are source; builder refreshes index.html.
The approved pilot remains unchanged in grifon-reference-pilot, port4178.

## What changed
Opening now types character by character. Collages pan left through staggered
word/prop entrances; camera, phone and laptop are fresh CSS solids with depth and
1.19s turns, then still holds. Pixel masks retain the actual outgoing artwork.
Dense reference samples corrected opening handoffs and the Until now transition.
Dialogue and approved ending at22.8s retain their copy/keyframes. The builder
materializes the same closing offset for static timeline validation; pilot input
is unchanged. Canvas visibility is explicit and ends at22.8s.
Comparison has8 chapters, frame scrub, half speed and solo view. Failed composition
loading is handled instead of remaining on Loading. No Grifon product feature,
MCP or AE bridge was implemented.

## Actual verification
Strict Hyperframes0.7.68 check passed: zero errors/warnings,20/20 contrast checks.
New foreground-motion verifier fails all five motion checks on exact V03 and
passes V04: typing counts increase, collage travels58.74px left, all three hero
objects keep turning after entrance. Hold verified separately with identical
DOM transforms and foreground bounds;4 antialiased mask-edge pixels change.
Three cream background checks pass exactly. Editable text test:2234 changed
pixels, zero outside the line. Approved brand frame identical; cards differ at
3 pixels by1 channel level, within the existing documented rounding tolerance.
Parent CUA390x844: advancing half-speed opening, frame seeking, readable controls
and no horizontal overflow checked; screenshots emitted. Independent mobile
retry again had no browser connection; no independent UI pass claimed.
Artifact anchors, builder, JS syntax and diff whitespace pass. No app changes;
app build/test not run. Current evidence: qa/motion-results-v04.md and JSONs.

## Next action and limits
Neil reviews V04 opening motion in the same comparison page. Music/SFX and final
export stay deferred. Revised visual acceptance is pending. Small props are
vectors and hero objects CSS solids; lighting, typeface, easing and entrance blur
are approximations. Portable-file playback unverified
(file URLs blocked); localhost verified. CUA logs have an unattributed
MutationObserver error; Hyperframes runtime audit passes.

## Prior work retained
workflows/assets/grifon-ae-reference/ remains unchanged and untracked locally:
paused brief, reference/logo and unexecuted inspection script; no AEP ever made.
Spotlight/Spark/Motion Director and PR144/143 intact. KAPE01/PR145 unrelated.
