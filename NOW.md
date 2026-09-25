# NOW - the resume doc
**Stamped: 2026-09-25, Grifon launch preview rendered and packaged; first VO take generated; local download pending**

## Current state
Branch `codex/grifon-ae-type-pilot`; draft PR https://github.com/yopiheart/grifon-command/pull/148.
Neil wants an original premium Grifon launch film in editable After Effects,
then faithful recreation of a selected reference and a reusable client workflow.
Higgsfield is reference-only, explicitly NOT a production provider. This session
is on the shop PC; personal PC is off. No deploy or merge authorized.

## Latest deliverable
`workflows/assets/grifon-ae-pilot/launch/Grifon-Your-Next-Ad-v3.mp4`:
30 seconds, 1920x1080, 30fps, all 900 frames decoded, AAC stereo 48 kHz.
Native AE Render Queue completed. Original music and SFX, no narration yet.
Measured -22.7 LUFS integrated, -9.4 dBFS true peak. This is a visual/score
preview, NOT the finished audio master or accepted reference-level creative.

Editable source: `launch/Grifon-Your-Next-Ad-v3.aep`.
Collected project: `launch/package/Grifon-Your-Next-Ad.aep`, with four relinked
Footage items and Fonts/license. All collected hashes match the sources.
Builders: build-grifon-launch.jsx, render-launch.jsx, package-launch.jsx.
Helpers: make-launch-audio.mjs, verify-launch.mjs. Evidence: launch/verification.json,
launch/package-verification.json, launch/review.md, launch/production.json.

Film has 13 editorial beats, native text/shapes and a camera with 21 position
keys. No skincare images or reference soundtrack. Actual LaunchScreen component
captured locally in empty state with an inert launch callback; NOT authenticated
customer output. Storyboard panels contain native graphics from this film.
The preview and editable AEP link have been shown in the conversation.

## Review and remaining work
Independent critic: BRAND_PASS_WITH_NITS on sampled v3 evidence. Fixed scrollbar
and truncated capture, inconsistent secondary lockup, peripheral tile fragments,
colliding headlines, and covered caption. Full 1fps overview, six full frames,
four 1.2-second 10fps transition strips inspected. Nit: the composer has small,
dim empty-form text, so it is a product glimpse, not a readable complete demo.
Full auditory review and continuous-playback creative acceptance remain open.

Reusable workflow captured in workflow-draft/SKILL.md. Not installed, not an MCP
server, and not validated on a second reference. Do not advertise client readiness.
The earlier skincare direction is rejected; STORYBOARD.md explicitly marks that.
All earlier typography/camera/animatic studies remain preserved, not current film.

## Voiceover: approved first take generated, local download pending
Neil approved Brian stock voice, direct ElevenLabs multilingual v2, maximum two
takes / 500 existing credits, no new purchase. Exact 155-character script remains
in launch/production.json. User signed in during this turn. Browser verified
10,000 credits before generation and 9,845 after. Exactly ONE generation via UI;
Brian and Multilingual v2, displayed defaults speed 1, stability .5, similarity
.75, style 0. Raw audio duration 10.631835 seconds from the audio element.

The first take exists and is playable on ElevenLabs Text to Speech. Download
button and supported browser audio-download call returned, but no local MP3 was
found. API history read returned 401, as subscription read had earlier. Do not
expand permissions or retry paid generation to solve a download issue. An async
question asks Neil to save the existing take to Downloads. Tab is left available.
Ledger records generated-download-pending, 155 credits used, one take left.
No local narration asset, phrase timing, pronunciation or auditory acceptance
yet. Do not claim the rendered MP4 includes narration. After local MP3 is available,
measure and inspect phrases, place separate VO layers in a new AE version, duck
music, render and verify before replacing the current deliverable.
ElevenLabs is optional infrastructure, not required for native AE animation.

## AE recovery notes
Earlier internal verification / no current context dialog appeared after saved
frames. Root cause unknown; no evidence it was caused by Dota. Later screenshot
import failure was a JPEG with PNG filename; actual full-page source is now JPG.
Separate aerender startup stalled, native Render Queue succeeded. Script dispatch
success is not completion: check status/output before retrying. A premature retry
overrode one prior success status with the preserve-output guard; current helper
recognizes already-completed items. Latest packaged project is open in AE.

## Reference library
workflows/assets/motion-reference-library contains five Kendel originals copied
locally with matching SHA in ignored originals, and tracked audio-preserving
720p proxies. 20 full-duration 1fps sheets and 15 detail strips inspected.
AUTOPSY.md, manifest, verification, PROCESS-NOTE.md and screenshot are retained.
Swipe File E19 links the corpus; no performance counts changed. SourceReady and
Button are the closest compact film guides. Canonical social URLs, actual rigs
and full auditory autopsy remain unverified. K01/K03/K05 local ASR rejected;
K02/K04 rough aids only. Saved notes do not automatically train the model.

## Email side task
Neil asked about PR run failed at startup emails. Genuine authenticated GitHub
notices, SPF/DKIM/DMARC passed. Multiple push/PR events on our branch explain the
frequency. Latest inspected run: startup_failure, BuildFailed, zero jobs, no
available logs. All four local workflow files parse as YAML; GitHub semantic
validity/root cause not established. No email, notification or CI settings changed.
Do not call CI green or claim application tests failed.

## Checks / runtime
Native build/render/package, full media decode, package hash checks, helper JS
syntax and git diff whitespace checks passed. No app code or tuned prompts changed;
app build/test suites are not applicable to this media checkpoint. Cloud Actions
currently has startup failures. No paid/live switches enabled.
Local Vite on 127.0.0.1:5173, session 4566, was started for capture. Temporary
capture harness and read-only diagnostics live in ignored .tmp. Files persist.
