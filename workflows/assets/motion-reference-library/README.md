# Motion reference library — Kendel batch

Saved and visually analyzed on 2026-09-25 for Neil's Grifon launch-film research.
These are taste references selected by Neil, not evidence of ad performance.
The five filenames credit Kendel.jpg; social permalinks were not supplied.
The product names below were read from the videos, not guessed from filenames.

## Watch and inspect

| ID | Product visible in the film | Length | Viewing copy | Main use for Grifon |
| --- | --- | ---: | --- | --- |
| K01 | Commas Studios | 35.55s | [Play](proxies/K01-five-years.mp4) | A UI detail becomes a full product, then a feature card |
| K02 | Noctal / Lana | 72.10s | [Play](proxies/K02-creative-freedom.mp4) | Floating UI, depth, an object connecting several scenes |
| K03 | Pluto | 162.05s | [Play](proxies/K03-the-formula.mp4) | A recurring visual metaphor that becomes the brand |
| K04 | Button | 56.10s | [Play](proxies/K04-closet-swap.mp4) | Clean object choreography, typography, action-to-result transitions |
| K05 | SourceReady | 39.80s | [Play](proxies/K05-sourceready.mp4) | Fast, legible product demonstrations and motivated close-ups |

[Detailed autopsy of all five](AUTOPSY.md) · [Verified file manifest](manifest.json)

## What is saved

- `originals/`: all five unchanged supplied MP4s, copied into this repository's
  working directory. Source/copy SHA-256 hashes matched. **Local only, ignored
  by Git**; the largest original is 247,589,624 bytes.
- `proxies/`: 720p H.264 viewing copies with AAC audio, retained for Git backup.
  They preserve aspect ratio and timeline, but are lossy and not production
  masters. K03 is approximately 67.8 MiB; all files are under GitHub's 100 MiB limit.
- `sheets/`: full-duration 1 fps overviews plus fifteen 2-second detail strips
  at 10 fps, all visually inspected for this report.
- `evidence/`: scene-change candidates and local ASR drafts. Candidate cuts
  are not counted as shots. ASR is not a verified transcript; see autopsy caveats.
- `audio/` and `frames/`: ignored intermediate analysis files.

No originals were deleted, overwritten, uploaded to an AI service, or embedded
in the Grifon film. No paid model, Higgsfield tool, or application prompt change
was used for this intake. FFmpeg here decodes and prepares evidence; it is not
the Grifon animation renderer.

## Evidence quality

The review covers the whole timeline through sampled frames, with closer
inspection of three motion windows per film. It is **not a frame-by-frame
inspection of every frame or an audited full listening pass**. FFmpeg's fps
filter rounds/selects source frames onto the sampling grid: overview labels
have roughly one-second resolution; detailed observations are approximate to
0.1 seconds. Do not use these sheets to claim exact source-frame cut times.

We can observe screen-space movement, scale, perspective, blur and occlusion.
We cannot identify the source authoring software, actual camera layer, rig,
lens, plugins or easing curve from an MP4. AE implementation suggestions in
the report are our proposed reconstruction methods, not recovered project data.

## Repeatable intake

Run from the repository root with existing `ffmpeg-static` installed:

```powershell
node workflows/assets/motion-reference-library/ingest.mjs
node workflows/assets/motion-reference-library/detail-strips.mjs
```

The intake currently describes this supplied batch and its Downloads filenames;
it is not a customer-facing arbitrary-upload tool. A local, isolated speech
recognizer produced optional draft evidence; root application dependencies
were not changed. Future analysis can use the retained proxies if raw files
are unavailable. Preserve source identity, evidence limits and user intent
before proposing any reusable motion rule.

## Completion and remaining gaps

File preservation, all-five visual autopsy and 15 detail windows are complete.
Canonical social URLs, exact fonts, original AE projects and audited music/SFX
identification remain unavailable. None blocks using the documented visual
mechanics as inspiration. Audio production and final Grifon quality approval
remain separate from this reference-library deliverable.
