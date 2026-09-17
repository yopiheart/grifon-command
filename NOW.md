# NOW - the resume doc
**Stamped: 2026-09-17, Grifon Motion Director skill and local demos**

## Current state
Branch: `codex/grifon-motion-director`.
Neil approved the implementation plan and then the exact installation patch
SHA-256 `2b542b8b135997e33a322856de8bd00d45c5bacf75fa3b37dfdbc046ce462074`.
The new `.agents/skills/grifon-motion-director/` skill is installed unchanged.
Existing application code, tuned prompts, other skills and hero-film work are untouched.
Portrait and landscape demos are ready: 12 seconds, 24 fps, 288 frames,
1080x1920 and 1920x1080, H.264/AAC with existing music, no voiceover.
Editable source and reproduction commands: workflows/assets/grifon-motion-director-demo/.
Offline player: artifacts/grifon-motion-director-review.html.

## Remaining review
CUA rejected the local file URL and expressly prohibited browser workarounds.
Mobile/desktop review-page screenshots, controls/overflow, full browser playback,
physical-phone playback and subjective listening are unverified; do not claim done.
Independent actual-MP4 frame review and 390px samples pass.
Neil's creative approval and fresh-session automatic skill-trigger testing remain open.
No publishing, merge, deployment, campaign changes, or paid generation occurred.

## Evidence
Installed check:codex: 32 entrypoints, zero errors, all 26 tests pass.
Hyperframes lint/runtime/layout checks pass both layouts, including transitions.
Both exports fully decode; final audio measures -13.82 LUFS and -1.41 dBTP.
The audio checker reproduces and rejects the original +5.27 dBTP clipping defect.
Ten browser-frame revision checks pass; unchanged beats are pixel-identical.
Independent source review resolved the initial logo mismatch; canonical mark used.
Three skill dry-run cases plus baseline outputs and static evaluation viewer saved.
Rubric-exposed dry runs are not a skill-superiority benchmark or live trigger test.
JS syntax and artifact-anchor checks pass; no app build/full suite needed for this scope.
The separate verification and smoke records include hashes and browser limitations.

## Related work
Workflow/personal-desktop updates are already merged in PR #141; no repeat needed.
Prompt-quality A+B+D merged in PR #139; release evidence remains PR #140.
