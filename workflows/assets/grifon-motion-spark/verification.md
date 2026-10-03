# Spark preview verification — 2026-09-17

**Creative status correction:** Neil questioned the connection to the Apple
reference. This preview's brand/encoding checks remain valid, but it has not
passed reference fidelity or user creative acceptance. The broader timeline
study and corrected product-evidence direction are in `reference-analysis.md`.
That replacement preview has not been rendered. The reference notes below
describe the original limited sampling, not the later 110-frame study.

## Scope and actual result

New reference-led motion study only. Existing demo, app code, skills, tuned prompts,
provider settings and hero film are unchanged. Zero paid generation, analysis, or
cloud rendering. Apple footage/music are not part of the delivered exports.

- Hyperframes 0.7.68 `check`: both formats pass lint, runtime and sampled layout /
  transition checks. Zero errors/warnings; pointer-events on decorative layers
  appear as informational Studio-selection notes, not faults.
- Final exports: portrait 1080x1920; landscape 1920x1080; 15 seconds, 24 fps,
  360 frames each, H.264 video and AAC audio. render.mjs FFprobe and full-decode
  contract passes. qa/*-media.json contains measured stream metadata.
- media-check.mjs: both full decodes pass; zero nearly-black intervals >= 0.3s
  under the stated threshold. This does not establish every frame's creative merit.
- Encoded audio: -13.83 LUFS integrated, -1.41 dBTP for both versions.
- Eleven actual encoded frames per format inspected, including 3.8s, 8.8s, 9.6s,
  11.8s transitions and 14.9s ending. qa/*-actual-mp4-sheet.jpg and *-export/ retain
  the evidence. 390px describe/build/ending samples support small-display review.
- `npm.cmd run check:codex`: 32 entrypoints, zero errors, all 26 tests pass.
  No app build/full application suite: no app source or dependencies changed.

## Independent review

First independent source/frame critic found a near-empty 3.8s handoff and
noncanonical hand-authored panel icons. Resolved by advancing panel entrances
and rendering canonical FileText/Image/SquarePlay from existing lucide-react.
Landscape website text was also enlarged for the small-display layout.

Fresh independent final critic: BRAND_PASS, 44/50; no actionable source/brand
findings. Inspected both actual MP4 frame sets, 390px endings, 200% icon/griffin
crops, and independently decoded both videos with FFmpeg (exit zero). Mark,
hairline ring, italic wordmark, approved text and new handoff pass.
The critic did not perform continuous playback or subjective listening.

## Text-revision evidence and exact limits

The first strict RGB-equality test failed on portrait 5.5s after DESCRIBE → CREATE:
a maximum one-level RGB difference appeared on the panel region. An unchanged
repeat control was pixel-identical; the cause of the difference is not established.
Do not describe it as random noise or claim the revision is pixel-identical.

The independent critic inspected both frames and measured max difference 1/255,
mean absolute channel difference 0.00973396, with no visible geometry/text change.
It confirmed a max-one-level / mean <= 0.02 criterion is an honest *sampled-frame*
preservation test for this task, paired with a meaningful changed-text control.
revision-check.mjs records exact results for ten samples and rejects a deliberate
BUILD → BROKEN edit in the second beat. Its JSON is authoritative for pass status.
This covers the tested replacement only, not every future line or every frame.

## Remaining human checks

These exports are a first creative preview. Neil has not yet accepted this new
direction. Full continuous playback, subjective audio listening and physical-phone
playback remain pending. Frame inspection and full decode are not substitutes.
No local browser playback attempt was made for this new preview; the prior demo's
local-file browser refusal was not worked around. Return the actual MP4 files for
the user to play directly.

The YouTube reference was visually sampled through its normal browser controls;
its music was not audited. Approximate observations and canonical URLs are in
brief.md. No pattern count, marketing claim, or tuned instruction was derived.
