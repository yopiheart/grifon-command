# NOW - the resume doc
**Stamped: 2026-09-17, Grifon Spark reference-led motion preview**

## Current state
Branch: `codex/grifon-motion-spark`, stacked on `codex/grifon-motion-director`.
Draft PR #144: https://github.com/yopiheart/grifon-command/pull/144
Preview/source commit `0dd51ebd` is pushed; this handoff update follows it.
Motion Director installation remains in draft PR #143; its exact approved skill
patch was installed unchanged. Neil liked the first demo and approved a second
preview based on his Apple Facebook ad and YouTube reference.
New project: workflows/assets/grifon-motion-spark/.
15s / 24 fps / 360 frames, portrait 1080x1920 and landscape 1920x1080.
DESCRIBE / BUILD / LAUNCH with light-led glass cards, canonical mark and URL.
This is a motion study, not actual Grifon app output. Editable source, MP4s,
frame sheets, brief, reproduction commands and verification evidence are saved.
No app changes, tuned edits, paid calls, publishing, merge or deployment.

## Checks and limitations
Hyperframes lint/runtime/sampled layout and transitions pass both formats.
Both exports fully decode; zero nearly-black intervals >= 0.3s at test threshold.
Both AAC tracks measure -13.83 LUFS and -1.41 dBTP.
Fresh independent brand/source/frame review: BRAND_PASS, 44/50, no open findings.
The earlier dark handoff and noncanonical icons were corrected before final export.
390px ending samples and 200% logo/icon inspection pass.
Text-revision test passes ten samples under a recorded one-level RGB / 0.02 mean
limit; an unintended BUILD -> BROKEN edit is rejected. This is NOT a pixel-identical
claim: strict equality initially failed on a tiny panel difference, reviewed and
measured independently. See qa/revision-check.json and verification.md.
check:codex: 32 entrypoints, zero errors, all 26 tests pass.
No app build/full application suite needed; source/dependencies are unchanged.
Continuous playback, subjective listening, physical-phone review and Neil's
creative acceptance of this new preview remain pending. No local browser workaround.

## Related handoff
PR #143: https://github.com/yopiheart/grifon-command/pull/143
First demo/player: artifacts/grifon-motion-director-review.html.
Workflow defaults merged in #141; prompt audit in #139; release evidence in #140.
