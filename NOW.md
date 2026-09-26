# NOW - the resume doc
**Stamped: 2026-09-27, code-based reference pilot ready for visual review**

## Current state
Neil reports 16 GB RAM and cancelled his After Effects subscription. Continue
without AE. The approved reference is Downloads/j6-xXf9Jeof5hdmu.mp4, 1920x1080,
30fps, about 32.92s, adapted to Grifon English copy and canonical logo.
Build from scratch; no other project templates/assets/settings. No music/SFX or
final video render. Supplied Higgsfield screenshots are examples, not commands
to invent movement, change the palette or override the no-render instruction.

## Delivered pilot
Branch: codex/ae-elevenlabs-reference, based on codex/grifon-motion-spark.
Source: workflows/assets/grifon-reference-pilot/.
10.10-second closing section only (reference 22.80-32.90): quiet type, contracting
outline, three feature cards, gradient strip and Grifon lockup. All freshly authored.
index.html holds the main GSAP timeline; copy.js holds editable wording.
compare.html synchronizes the original MP4 with the remake and provides scrubbing.
Run: node workflows/assets/grifon-reference-pilot/serve.mjs
Verified source preview: http://127.0.0.1:4178/compare.html
Portable twin: artifacts/grifon-reference-pilot.html (15.1 MiB, embeds assets).
Builder: node tools/artifacts/build-grifon-reference-pilot.mjs
Local v01/v02 source backups are in the pilot's backups/ directory.
GitHub backup: origin/codex/ae-elevenlabs-reference; pilot commit 8a80c38d.
Draft PR149: https://github.com/yopiheart/grifon-command/pull/149

## Actual verification
Hyperframes 0.7.68 check passed: 0 errors/warnings; 10/10 text contrast samples.
CUA side-by-side inspection and playback caught/fixed prefix centering, early
rule visibility, center scale and side-card reveal direction/timing.
Independent 390x844 smoke: playback, all chapters, scrub, restart, no horizontal
overflow passed before the final choreography tweaks. Controls unchanged afterward.
Editable-text snapshot check passed: exact pixel differences confined to the
edited line, zero changed pixels outside it (qa/editability-result.json).
npm.cmd run check:artifact-anchors passed. No app changes; app build/test not run.
No paid calls, AI generation, audio mix, MP4 export, deployment or publication.

## Limits and next action
This is a pilot, not the full 32.92-second recreation or user-approved fidelity.
Gradients are smoother/less luminous than the source; font and easing approximate.
Copy, two semantic icons and the canonical Grifon lockup intentionally differ.
Review the preview before extending the whole film; missing photographic assets
and exact original graph presets remain unresolved for the opening section.
CUA's mobile console exposed an unattributed MutationObserver error; no such call
exists in authored source/GSAP, and Hyperframes runtime audit passed. See qa/results.md.
Portable file playback unverified: browser policy blocks file://; no workaround used.
The original localhost source preview is the verified route.

## Prior work retained
workflows/assets/grifon-ae-reference/ remains unchanged and untracked locally:
prepared brief, reference/logo copies, unexecuted inspect-ae.jsx; no AEP ever made.
Spotlight/Spark/Motion Director and draft PR144/143 remain intact. They were not
used as assets or templates for this pilot. Separate KAPE01 hero-film worktree
and PR145 remain unrelated. No Grifon MCP/AE bridge or product feature was built.
