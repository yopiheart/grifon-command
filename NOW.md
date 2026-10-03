# NOW - the resume doc
**Stamped: 2026-10-03, corrected personal voice; STP music preview ready**

## Current work
Branch: `codex/oceanides-stp-explainer`, based on profile head `d3d08102`.
Draft PR153: https://github.com/yopiheart/grifon-command/pull/153, stacked on PR152.
No merge, deployment or public publication requested.

## Corrected voice and client context
Neil clarified Aira and Megan means ONE saved personal clone, `airaandmeagan`.
Exact account voice: `mPEHjC4AussYOrtIPSUB`, category cloned, language fil.
Read-only voice and v4 model preflight HTTP 200; model supports Filipino/English.
No new paid calls this preparation. Clone speech with v4 is not yet tested.
Previous separate Aira/Megan library samples are retained as historical tests,
with a correction in voice-v4-sample.spec.json; do not use in the final video.
Prior approval covered those two samples only, cap 600, estimated 448 credits.
Both succeeded without retries; provider headers 14 each, actual debit unverified.

The client pays quarterly for both wastewater and accumulated solids removal,
including manual cleaning, confirmed by Neil. Actual bill/volume are unknown.
Sir August will introduce the sample live, play the narrated video, then discuss
site fit and quotation. Proposed live wording is in meeting-presenter.txt.
An STP may reduce liquid hauling if suitable treatment and a permitted outlet
exist; screenings/sludge removal continue. No guaranteed savings or universal
elimination of siphoning. Compare current service including solids cleaning
with installation, power, service, testing and residual-solids handling costs.

## Current video preview and preparation
Folder: clients/oceanides/stp-explainer/.
Source: story.json, scene.html, render.mjs; 12 scenes, 139-second draft timeline.
Current output: output/Oceanides-STP-Cost-Explainer-Music-Preview-1080p.mp4.
1920x1080, 16:9, 30fps, H.264/yuv420p + AAC stereo. MUSIC ONLY; narration pending.
New silent visual export also retained; previous 129-second exports preserved.
Licensed existing music: api/_lib/assets/music/testimonial.mp3, Inspirational
Piano / Pixabay Content License; source/hash in voice-personal.spec.json.
No added SFX. Four-second loop crossfade; two-second in/three-second out fades.
Measured preview bed -34.1 LUFS, true peak -15.4dBFS. No paid music generation.
mix-audio.mjs prepares ducking against normalized voice when it exists.

Pending voice-personal.spec.json: exact 224-word / 1,455-character Taglish script,
one v4 call with twelve inputs using the SAME personal clone and timestamps.
Estimate 1,455 existing credits, proposed cap 1,600; no retries/purchases.
Exact script: narration-for-approval.txt; request/text/voice/music hashes frozen.
voice-personal.mjs --dry-run is free. --generate requires recorded direct human
approval of this exact spec; completed status/exclusive receipt stop rerolls.
Then sync-personal.mjs uses returned segments to pad scenes without time stretch,
render.mjs --narrated builds aligned visuals, mix-audio.mjs --voice ducks the bed.
No guessed/evenly-spread speech timing. Raw and mixed takes need human listening.

Verification: 12 source frames independently reviewed, BRAND_PASS 43/50, zero
flags. Changed exported close inspected. Full preview decode PASS: 4,170 frames,
139s, 11,617,300 bytes. SHA256:
fbeb771c2dc3042f83ee3a96577541c8f5d6faa5309a6f26f8f27a05a6a781be.
Node syntax, exact spec/dry run, contiguous timeline and five negative spend
guards PASS (pending, wrong voice, changed budget/text, completed; zero network).
Artifact anchors/diff-check PASS. Actual voice alignment/ducking not exercised
yet; projector hardware untested. Client artifacts only; app suites not repeated.
Private evidence: .tmp/oceanides-stp/{frames-cost,export-cost,audio-cost,
prep-negative-tests,personal-voice-preflight.json,personal-voice-model.json}.
Next required step: exact full-narration paid-spec approval; then generate once,
align, mix, decode/measure and listen before client use.

## Company profile and logo retained
Draft PR152: https://github.com/yopiheart/grifon-command/pull/152, stacked on PR151.
Current profile files under clients/oceanides/company-profile/output/:
- pptx/Oceanides-Company-Profile-Widescreen-STP-Confirmed.pptx
- pdf/Oceanides-Company-Profile-Widescreen-STP-Confirmed.pdf
- pdf/Oceanides-Company-Profile-Print-STP-Confirmed.pdf
- pptx/Oceanides-Company-Profile-Print-STP-Confirmed.pptx
Eight widescreen slides / seven A4 pages; on-site STP offer, transparent logo,
native minimal type, disclosures and actual proof. Prior brand 47/50, zero flags;
PPTX finalization/import and PDF contact/content/font checks passed previously.
Contacts: 0917 671 6383 (Globe), marketing@oceanidessepticandpest.com;
Tramo Street Corner Dandan, Pasay City, Philippines 1300.
PR151 canonical logo update retained; previous builds and 1,401 tests passed.
Recovery PR150 targets PR146 oneshot branch. PR146 CI 36863242626 succeeded
after GitHub payment, preview succeeded; SSO blocks app smoke, no production deploy.
Next: PR146 release review; PR150 needs main-target CI after it lands.
Motion PR143 -> PR144 -> PR149 retained. Untracked attachments/reference assets
remain outside this change and were not staged.
