# NOW - the resume doc
**Stamped: 2026-10-03, Oceanides STP visual draft ready; voice approval pending**

## Current work
Branch: `codex/oceanides-stp-explainer`, based on profile head `d3d08102`.
Draft PR153: https://github.com/yopiheart/grifon-command/pull/153, stacked on PR152.
No merge, deployment or public publication requested.

## STP meeting explainer
Neil requested a video inspired by https://www.youtube.com/watch?v=w_60iJEAf4c
and selected Taglish narration. Reference inspected as cutaway/component-focus
inspiration; no borrowed footage/audio/geometry or FujiClean product claims.
Source: clients/oceanides/stp-explainer/{scene.html,story.json,render.mjs}.
Output: output/Oceanides-STP-Explainer-Visual-Draft-1080p.mp4.
Free local Three.js/Playwright/FFmpeg production: 1920x1080, 16:9, 30fps,
129 seconds, 12 scenes. Visual draft is SILENT; no paid provider calls.
Rebuild: node clients/oceanides/stp-explainer/render.mjs; --frames-only for QA.
Official three@0.180.0 is vendored with its MIT license; one upstream whitespace
indent normalized to pass diff-check. Root manifests/dependencies unchanged.

Generic domestic-wastewater STP: screening, settling, aerobic biology,
clarification/return and excess sludge, finishing treatment, testing and care.
Septage intake is distinguished from building wastewater. No Oceanides-owned
facility/equipment, supplier/model/capacity, potable-water, universal industrial
waste capability, guaranteed compliance or maintenance-free promise.
Oceanides is the main contact and coordinates specialists through turnover.
Primary EPA, FujiClean and EMB evidence URLs are recorded in story.json.
Client DESIGN.md scoped minimal profile direction extends to this companion.

Verification: all 12 individual story frames inspected; independent final brand
review PASS_WITH_NITS, 44/50, zero critical. Two optional nits remain for final
polish: blue editorial topics in comparison/benefits and larger outlet caution.
Full MP4 decode passed: 3,870 frames, H.264/yuv420p, 1920x1080/30fps, 129s,
8,440,596 bytes, no audio. Export motion sampled: camera, aeration and sludge
changed 457,896 / 5,651 / 702 pixels respectively; exported frames inspected.
Render has no page errors. Node syntax, exact narration hash/timeline and
artifact-anchor check PASS. git diff-check PASS. App code untouched; app suites
not repeated. Private evidence: .tmp/oceanides-stp/{frames,motion}/.
Final video SHA256: 0af94d651dbc93eddd425c2c44eebd4728edeb4900325438168d453a28ba9185.
Native projector hardware and narrated playback have not been tested.
Neil asks whether the video conveys reduced siphoning and whether Blender is
needed. Current model is real procedural 3D in Three.js. Current benefits are
general; no pump-out reduction is promised. Clarify onsite liquid treatment vs
continued sludge removal, with any reduction dependent on actual site/system.

## Required next step: voice approval
Exact text: stp-explainer/narration-for-approval.txt (213 words / 1,398 chars).
Input hash and settings: stp-explainer/voice.spec.json, status PENDING_USER_APPROVAL.
Async question sent: approve exact script + one existing Kuya Marvin clone TTS
generation, max 1,500 existing ElevenLabs credits, no retries or purchases.
Do not generate until Neil explicitly approves this spec. Existing runner:
clients/oceanides/kuya-marvin/test-rigs/audio-post.mjs tts; multilingual_v2,
voice jL41fXY8JXGEarmJ5g3f, stability .75, similarity .85. No runner edits.
After approval: hash-check exact story VO joined with two LF newlines; one call;
listen to complete take, locally align scenes, polish noted typography, render
final H.264/AAC, decode/levels/motion/sync QA. Changed paid input needs fresh approval.

## Company profile retained
Draft PR152: https://github.com/yopiheart/grifon-command/pull/152, stacked on PR151.
Eight-slide 16:9 and seven-page A4 versions include Septage Treatment Facility.
Current output under clients/oceanides/company-profile/output/:
- pptx/Oceanides-Company-Profile-Widescreen-Septage-Final.pptx
- pdf/Oceanides-Company-Profile-Widescreen-Septage-Final.pdf
- pdf/Oceanides-Company-Profile-Print-Septage-Final.pdf
- pptx/Oceanides-Company-Profile-Print-Septage-Final.pptx
Minimal direction: paper/ink/navy/ocean blue, Segoe display/topics + Arial body,
subtle waves and a single transparent logo. D18 in workflows/design_swipe_file.md.
Four generated illustration disclosures retained; actual siphoning proof separate.
Native text/export/content/geometry checks PASS; independent review zero must-fix.
PowerPoint/projector hardware untested. No merge/deployment.
Contacts: 0917 671 6383 (Globe), marketing@oceanidessepticandpest.com;
Tramo Street Corner Dandan, Pasay City, Philippines 1300.
CTA: site assessment, written quotation and procurement requirements.

## Logo and other ongoing work retained
PR151: https://github.com/yopiheart/grifon-command/pull/151. Canonical logo.jpg
matches Neil's attachment; derivatives updated, superseded PNG removed.
Logo builds/tests PASS: 1,401 tests and both funnels; no deployment.
Recovery tooling PR150 targets PR146's codex/oneshot-recovery branch.
PR146 head 39a30613: preview retry succeeded; SSO blocks app smoke.
CI 36863242626 SUCCESS after confirmed GitHub payment. No production deploy/merge.
Next: PR146 release review; PR150 needs main-target CI after it lands.
Motion PR143 -> PR144 -> PR149 remains on its branches.
Untracked remote attachments and reference/media directories were not staged.
