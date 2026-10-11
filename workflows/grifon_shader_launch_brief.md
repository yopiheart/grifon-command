# Grifon shader launch film

Production brief for the user-requested follow-up chat. This is a new film, not a revision of the accepted 32.9-second ElevenLabs study or the original eight-second shader study.

## Deliverables

- 31.2 seconds / 936 frames at 30 fps, H.264 and stereo AAC at 48 kHz.
- 1920x1080 landscape and an independently composed 1080x1920 portrait version.
- Editable local composition, one copy source, shared scene/action specification, cue manifest, separate music and SFX stems, contact sheet, and factual QA report.
- Offline NOIR player with format switching, play/pause, restart, scrub, chapters, audio control, and downloads. Controls at least 46 pixels. Build the standalone artifact from committed inputs.
- Private review only. No product feature, deployment, merge, ad launch, or public publication.

## Reference and creative intent

Reference: https://x.com/npm_i_shaders/status/2107467668009963819

The reference was inspected in the browser. Its native video reports approximately 31.15 seconds at 1920x1080. Observed beats include a fragmented dark opening, a reflective orb, pale material interludes, liquid embossed type, animated contour fields, angled editor screens, and a restrained logo ending. Reference audio has not been independently heard. An attempted browser media download failed; do not present a cached source file as available.

Carry the reference's rhythm, scale changes, material richness, and transition logic into Grifon's own story. Avoid a sequence of unrelated effect demonstrations. A gold signal should connect the opening, the workflow, and the final mark. Kinetic movement earns attention; settled frames earn understanding.

## Beat map and exact visible copy

| Time | Viewer purpose | Copy | Direction |
|---|---|---|---|
| 0-2.4 | Interrupt scrolling and establish the subject | Your next ad. | Brief fragmented reveal resolves into clean, readable type. Strong contrast and one decisive arrival. |
| 2.4-7.8 | Show what the ad is for | To launch a product. / To tell your story. / To grow your business. | Kinetic type, reflective metal and glass; each phrase gets a real readable interval. |
| 7.8-15.6 | Explain a connected process | Research / Know your audience. / Script / Shape your message. / Storyboard / Plan every scene. | One object or signal travels through the three steps. Avoid three unrelated entrances. |
| 15.6-22.5 | Give credible product evidence | Research / Script / Storyboard | Use public-safe authentic Grifon screens if available. Settle while the viewer reads. If only authored conceptual panels are available, identify them as conceptual in the report and avoid claiming product output. |
| 22.5-31.2 | Resolve into a clear next step and brand | Give your next ad a clear direction. / GRIFON / grifon.ai | Bold promise, restrained brand hold and finished audio tail. |

All marketing copy is English and drawn from the existing accepted film. The disclosure "Example project" is also required on fixture-based product captures. No invented discounts, performance metrics, pricing, or limited-time offer. The address is the call to action. Do not generate a new voiceover by default.

## Product capture inputs

The local inventory did not establish existing genuine Research/Script/Storyboard screenshots. Existing film panels are editorial concepts. Capture the unchanged real components instead, using the component-mount approach in tests/e2e/dashboard-states.spec.ts, a fresh browser context, a visible "Example project" disclosure, and blocked /api/** and remote requests.

- components/MarketResearch.tsx: demonstrate the genuine input interface with clearly identified example details. Do not click analysis/generation.
- components/Step3AdScript.tsx: supply a preloaded Script and a non-Cinematic BusinessInfo. Cinematic mounting automatically requests themes and is unsuitable for this no-spend capture.
- components/Step5Storyboard.tsx: supply nonempty Scene[] with manualUploadUrl pointing to Grifon-authored example frames. An empty storyboard with avatar/language can automatically generate and is unsuitable.
- types.ts defines the actual fixture shapes. Use existing accepted English copy, English language, Grifon brand, an empty offer, and no-op/state callbacks. Example storyboard frames can use workflows/assets/grifon-shader-study/qa/after-0.8.png, after-4.15.png, and after-6.8.png.

Save reproducible capture fixtures and their screenshots within the new film folder. Disclose in the report that content was manually prepared: the captures demonstrate existing controls, not generated research quality, instant generation, or an authenticated end-to-end run. Do not modify application components to make the film look better.

## Brand and rendering

Read DESIGN.md, brand-spec.md, and the Motion Director skill. Use the unchanged public/logo.png in a transparent thin gold ring with GRIFON in Inter Black italic. The website address is separate. Charcoal #09090B, Grifon Gold #FFCC00, near-white, and pale cream #F2F1EA form the palette. Keep critical copy and logo authored and editable.

Reuse the validated FlowingGradient, LiquidMetal, and FlutedGlass treatments and their pinned local shader runtime. Additional free effects require a small compatibility/determinism probe first. Procedural local geometry, masks, and textures are authorized fresh assets. No paid provider generation or analysis is authorized by this brief.

Import the validated scene/action contract from workflows/assets/grifon-motion-action-pilot/ rather than forking a second hardcoded clock. Scene purpose, reading window, transitions, actions, contact events, audio cue placement, and QA must reference that same specification. Await shader/GPU work before capture. Absolute-time seeks must survive non-linear and fresh-browser replay. Preserve the original composition assets.

## Audio

Use the clean Digital Clouds music source with its existing provenance and the nine selected ElevenLabs WAV sources, copied into the new film's assets with hashes. Never use the old mixed master as a music input. These SFX remain private-review-only because the sources predate the paid subscription; this film is not cleared for commercial publication.

Place a small number of purposeful sounds: air for large travel, tactile/UI contact for selections and landings, restrained material texture for rotation, and a resolving brand punctuation. Preserve breathing space. Align each native transient with the shared action contact, not merely the clip's start. Target approximately -16 LUFS and true peak at or below -1.5 dBTP. Record measurements; do not call them listening evidence.

## Review and finish

Run three bounded creative passes: story/readability, motion/materials, then audio/finish. Use actual encoded frames and full available playback. Test a copy-only revision and a contact-time revision; meaningful contract checks must reject invalid input. Verify both aspect ratios at a phone-sized display, strict decode, dimensions, exact frame count, audio presence, non-linear seek, motion windows, safe margins, ending hold, and download integrity. Obtain independent review and the required smoke-tester screenshot at 390x844.

Commit and push the completed work on its own codex/ branch, keep a draft PR, attach it, and update NOW.md in that checkout with actual results. Report any setup limitation honestly. Preserve all existing accepted assets, stems, manifests, archives, and other agents' work. Do not install dependencies or modify tuned skill/provider instructions as a side effect.

The parent chat will verify delivery, prepare the actual unsent Gmail draft with the portrait file attached and landscape/player links, and sleep the PC only after backups and unrelated active work are checked. The follow-up chat must not sleep or shut down the machine itself.
