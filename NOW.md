# NOW - the resume doc
**Stamped: 2026-10-03, Oceanides STP draft ready; Aira/Megan sample spec pending**

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
Neil chose v4 samples, then requested Aira and Megan instead of Marvin.
Proposed exact library pair: Aira - Confident News Reporter (Filipino,
CkDT8SVS21XIVk5BcuDe), Megan - Crisp, Clean Educator (English,
5MxhuJFpo9hpzbxa88y6). Multiple Megan variants exist; educator needs confirmation.
Exact 33-word / 225-char line: stp-explainer/v4-sample-script.txt.
Pending spec: voice-v4-sample.spec.json; two takes, one per voice; estimated
450 existing ElevenLabs credits, hard approved cap proposed 600; no retries,
purchases or full narration. Full v2 spec marked superseded; no Marvin calls.
Read-only v4/model + library search 200; language en/fil supported, rates 1.
Both exact account voice lookups 400; add confirmed library voices before TTS.
Subscription read 401: remaining quota unavailable, no permissions changed.
Runner voice-v4-sample.mjs: free syntax/dry-run/pending-network-guard checks PASS;
artifact anchors/diff-check PASS. Both voices/rates checked before spending.
Exact pair/script/600-credit approval asked; zero paid calls. Private preflight in .tmp/.
After exact spec approval: resolve collection access, generate once per voice,
full MP3 decode/levels and Neil listens; then approve separate full VO spec.

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
