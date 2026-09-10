# Living studio: local Blender feasibility pilot

Neil approved this small local pilot on 2026-09-10: one editable studio, three camera stills and a short camera preview. This is separate wrapper production preparation, not actual Grifon output, an approved final film, or approval for paid generation.

## Deliverables

- `studio.blend`: editable procedural geometry, materials, lights, three still cameras and a fourth animated camera. Built with Blender 5.2.1 LTS; no external textures. Four cameras share one scene.
- `01_Establish.png`, `02_Owner_workspace.png`, `03_Product.png`: 1280 x 720 Cycles stills. Plain bottle/label and empty displays are proxies.
- `shaded-camera-preview.mp4`: silent six-second Workbench shading preview, 144 frames at 24 fps, 960 x 540, H.264/yuv420p/fast-start. Different shading from the stills; not a finished film or a proposed film runtime.
- `scene-verification.json`: integer-frame bottle-center visibility plus six axis obstruction probes. The probes do not establish spherical clearance, whole-bottle silhouette visibility, subframe behavior or perceptual video quality.
- [Offline review page](../../../artifacts/grifon-studio-pilot.html): all three stills and preview embedded. Builder uses committed inputs only.

## Rebuild

Run from the repository root in PowerShell. These commands overwrite the pilot's own outputs. They make no network calls. Blender is an existing local installation; use the installed executable path on another machine. `--python-exit-code 1` is required: Blender otherwise can exit zero after a Python exception.

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --factory-startup --python-exit-code 1 --python tools/build_grifon_studio.py -- --mode stills
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background assets/hero-film/studio-pilot/studio.blend --python-exit-code 1 --python tools/build_grifon_studio.py -- --mode preview
& node_modules/ffmpeg-static/ffmpeg.exe -hide_banner -loglevel error -y -framerate 24 -start_number 1 -i .tmp/studio-pilot-frames/frame-%04d.png -frames:v 144 -c:v libx264 -crf 22 -pix_fmt yuv420p -movflags +faststart assets/hero-film/studio-pilot/shaded-camera-preview.mp4
Copy-Item .tmp/studio-pilot-frames/frame-0001.png assets/hero-film/studio-pilot/preview-poster.png
node tools/artifacts/build-studio-pilot.mjs
```

Each command must succeed before the next. PNG animation intermediates and Blender `.blend1` backups are not deliverables. The generator attempts installed CUDA devices for Cycles and otherwise uses CPU; rendering appearance/timing may vary with Blender/device versions. No production app code, tuned prompts, paid services, website assets or deployment settings are changed.

## Critique method

Bounded gauntlet-style still critique, maximum three rounds, single axis **trust through coherent physical staging**. Actual external reference: [Higgsfield Oval Office contact sheet](../../funnel-swipe/higgsfield-astra-2026-09-10/oval-contact.jpg), whose gray geometry and finished room show consistent physical staging. Reference source: https://x.com/higgsfield_ai/status/2095630197257367857 . This is a staging comparison, not an equal-maturity photorealism contest.

An independent Codex critic inspects stills and returns one actionable gap; no paid rubric scorer, fabricated score or winner claim. Round 1 found an unsupported luminous rail. Round 2 adds visible wall brackets. It also narrows clearance-report language after independent code review identified that six rays cannot prove full clearance. The human's taste decision remains open. Stills do not certify motion or audio.

Round 2 independent review passed and stopped the loop. The critic reopened the saved `.blend` and reran verification successfully: four cameras, 103 objects, 144 integer frames, no external image dependencies. FFmpeg decoded all 144 preview frames successfully; the run reported no black segment at `blackdetect=d=0.15:pix_th=0.01` and no freeze at `freezedetect=n=-55dB:d=0.5`. Those threshold checks do not certify aesthetic pacing or smoothness.

Independent browser smoke passed at 390 x 844 and 1440-pixel desktop width: no horizontal overflow, all three PNGs decoded, solid text and dark ground rendered, and the embedded MP4 played through six seconds without a decoding error. Browser scheduling dropped four displayed frames in the initial playback observation; this is not a perfect-smoothness certification. The viewport check is Chromium, not a physical Android WebView. Screenshots and the smoke report live under `qa/`. The standalone builder and artifact-anchor check passed; application build/tests were not run because the application was unchanged.

The original Astra full audiovisual autopsy gate remains open. It holds final timing/storyboard/sound decisions, not this independently approved local technical pilot. The free-plan and paid-output claims in the production brief are not established by this scene.
