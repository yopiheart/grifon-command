# NOW - the resume doc
**Stamped: 2026-09-17, Grifon Spotlight preview**

## Current state
Neil delegated creative direction: "G surprise me!". Built the new 25-second
Spotlight product showcase in workflows/assets/grifon-motion-spotlight/.
Portrait 1080x1920 and independently composed landscape 1920x1080, 24fps,
600 frames each, H.264/AAC. Editable template, demo.json, source assets,
render/check/revision commands, actual encoded sheets and README included.
Product macro reveal -> real nine-second Grifon sample -> spotlight statement
-> canonical GrifonMark / GRIFON.AI. Uses local Hyperframes/FFmpeg and existing
music. No paid calls, app edits, tuned changes, deployment or publishing.

The proposed app walkthrough became an honest product-output showcase because
matching saved-project capture evidence was not secured. No fake UI or implied
instant generation. Original sample, old Spark and first demo are preserved.
A matching-project walkthrough remains a separate possible next direction,
not a hidden claim in this export.

## Evidence and corrections
Final Hyperframes checks pass both layouts. FFprobe counts correct 600 frames,
25s and audio; full decode succeeds. Final measurements and hashes are in
qa/media-check.json. Text revision passes ten sampled comparisons and a wrong
later-copy negative control. check:codex passes 32 entrypoints and all 26 tests.

Independent review caught the sample returning to a person after the product.
Actual source inspection: 271 decoded frames at 30 fps, last frame begins next scene
(despite recipes.ts describing approximately 9.03s). Only the new task-local copy
is trimmed to 270 frames / 9s; original frame269 holds above the video at 16.5s.
Fresh independent final critic: BRAND_PASS_WITH_NITS, 42/50; no critical findings. Final boundary sheets include frames 396,397,398,402,408,415,598,599.
The first source-match check failed due to YUV odd-coordinate crop rounding;
RGB crop handling fixed it without loosening the <=4 mean-channel limit.
Source-match frozen control is rejected. See verification.md for actual scope.

Portrait is the phone-feed version. Landscape source captions need landscape
playback; do not claim readability in a 375px-wide landscape thumbnail.
Continuous playback, subjective listening and Neil's creative acceptance remain
pending; no browser workaround. The delivered mix is music-only.

## Handoff
Branch: codex/grifon-motion-spark, stacked on codex/grifon-motion-director.
Draft PR144: https://github.com/yopiheart/grifon-command/pull/144
Draft PR143: https://github.com/yopiheart/grifon-command/pull/143
The original installed Motion Director skill remains unchanged.
Earlier reference analysis: workflows/assets/grifon-motion-spark/reference-analysis.md.
Its 110 half-second frames and audio scans cover the supplied YouTube timeline;
it is one-off evidence, not a validated winning pattern. No pattern counts changed.
