# Grifon orbital launch

An authored Grifon adaptation of the editorial pacing in Abdullah.A's Pluto
launch introduction. The reference supplies visual direction; no reference
footage, Pluto identity or astronomy claim appears in this composition.
See [brief.md](brief.md) for exact copy and the success contract.

Native picture: **1920 x 1080, 60 fps, 1,389 frames, 23.15 seconds**.
The new `orbital-launch` treatment has seven contiguous shots. It does not
change the 12-second basic treatment or the shader film's locked opening.

Finished review candidate: [grifon-orbital-launch-v1.mp4](grifon-orbital-launch-v1.mp4).
The [contact sheet](grifon-orbital-launch-v1-contact-sheet.png) is sampled from
that encoded file. Its full audiovisual strict decode passed; all 1,389 video
packet payloads and timestamps match the picture master after audio muxing.
See [encoded-output-verification.json](encoded-output-verification.json).

## Measured benchmark

This reference needed a new authored treatment. From the earliest retained
download artifact to the first playable MP4: **39m07s**, including new authoring,
review waits and export. Exact user-message arrival is unavailable. Authoring
through the final source checkpoint took **19m35s**. Additional provider spend
was **US$0**; installed local rendering tools produced the output.
Encoded-file QA finished **45m53s** after intake; all benchmark checks, including
the disposable revision, finished **46m41s** after intake. Git/PR packaging
followed those measured boundaries.

| Operation | Observed time | Scope |
| --- | --- | --- |
| Cold full picture render | 8m49s | 1,389 frames, native 1080p/60 fps |
| Identical warm render | 16.47s | Verified cache, zero new captured frames |
| Root audio integration | 4.48s | Existing registered sources, 26 contacts |
| Repeated audio mix | 0.30s | Verified audio cache |
| Audio/video mux | 19.41s | Picture stream copied without re-encoding |
| Headline revision preview | 39.25s | 120 frames, 2 seconds, 960 x 540 draft |
| Repeated revision preview | 1.57s | Verified cache, zero new captured frames |

The disposable revision changed only `copy.motion` to "Make your next move.";
the delivered film retains "Bring it into motion.". Its audio key stayed
unchanged and the cached mix was reused. This demonstrates a bounded copy
revision, not a full-film revision export. The full revision check took
**6m09s** from the frozen baseline, including comparisons and coordination;
first disposable-project initialization to receipt was **21m07s**, including
the wait for the full-film cold benchmark. See [benchmark.json](benchmark.json)
and [revision-verification.json](revision-verification.json) for clock boundaries,
hashes, cache evidence and the small cross-browser raster control variance.

These timings describe this machine and reference. A different visual language
still needs authoring; there is no automatic conversion of arbitrary videos.

## Editable source

- `orbital.json`: editable visible copy, fixed native shot boundaries and
  frame contacts. Boundary metadata is validated against authored choreography;
  changing timing requires a separately authored treatment, not a metadata edit.
- `orbital.js`: deterministic absolute-frame choreography, authored sphere
  shader, 6,100 Fibonacci particles, collage, scan, typography and orbit paths.
- `orbital.html`: local-only composition and font declarations.
- `assets/manifest.json`: asset origins and SHA-256 digests. The logo is the
  unchanged canonical PNG, rendered inside a transparent thin gold ring;
  the wordmark uses Inter Black italic. Both fonts retain their SIL licenses.

The upstream JetBrains Mono SIL text is retained byte-for-byte, including one
trailing space on line 21. Staged `git diff --check` reports that vendor legal
text diagnostic; no whitespace rule is disabled and the hashed asset is intact.

The browser requires the already-installed local WebGL runtime. There are no
provider calls, generated AI assets or network assets during rendering. Picture
and audio are separate: a new sound recipe is authored against `contacts` and
attached through the existing `audio-plan.json` contract. A picture-only export
is explicitly silent until that master is mixed and muxed.

The authored soundtrack uses the registered Digital Clouds excerpt at
32.00-55.15 seconds and 26 new frame contacts. `audio-source-manifest.json`
and `audio-source-credits.md` retain the recording hashes and license sources.
Raw stock recordings and isolated stems are excluded from this source package.

## Reproduce locally

Use the repository's existing Node/Playwright/FFmpeg installation. Keep large
media and browser temporary files on the task drive. Do not overwrite an
existing project; `init` deliberately refuses to do so.

```powershell
$env:TEMP = 'F:/GrifonBenchmarks/pluto-2100297302497997167/tmp'
$env:TMP = $env:TEMP
node tools/motion-launch.mjs init --template orbital-launch --project F:/GrifonBenchmarks/pluto-2100297302497997167/project
node tools/motion-launch.mjs validate --project F:/GrifonBenchmarks/pluto-2100297302497997167/project
node tools/motion-launch.mjs serve --project F:/GrifonBenchmarks/pluto-2100297302497997167/project --format landscape --port 0
node tools/motion-launch.mjs render --project F:/GrifonBenchmarks/pluto-2100297302497997167/project --format landscape --from 75 --frames 120 --profile draft
node tools/motion-launch.mjs render --project F:/GrifonBenchmarks/pluto-2100297302497997167/project --format landscape --from 0 --frames 1389 --profile final
node tools/motion-launch.mjs audio mix --project F:/GrifonBenchmarks/pluto-2100297302497997167/project --source-root C:/Users/ADMIN/Desktop/grifon-command/workflows/assets/grifon-reference-full/assets/audio-v07/sources
```

Use the visual render's returned `path` and `receiptPath` for the final mux:

```powershell
node tools/motion-launch.mjs audio mux --project F:/GrifonBenchmarks/pluto-2100297302497997167/project --source-root C:/Users/ADMIN/Desktop/grifon-command/workflows/assets/grifon-reference-full/assets/audio-v07/sources --video <visual-path> --visual-receipt <receipt-path>
```

Replace both placeholders with the actual returned paths, quoting paths that
contain spaces. The mux validates current source/runtime receipts and copies
the native video stream. No manually guessed receipt or unverified old render
should be substituted.

`serve` is a loopback preview. Seek uses absolute native frames and supports
out-of-order scrubbing. Draft exports remain bounded to 120 frames and five
seconds, so this treatment's maximum draft is two seconds. The export receipt
binds source, installed runtime, window, captured frame hashes, native frame
count, strict decode and elapsed phases. Repeat the same render for a verified
cache hit; edit copy in the isolated project's `composition/orbital.json` for a
new source key. Customer turnaround includes reference intake, new authoring,
audio selection/mixing, rendering and review; a warm cache is not that number.

Only landscape is authored for this benchmark. Any portrait version needs its
own composition. This is an abstract motion study, not proof of generated
Grifon product output. Final creative acceptance and whole-film listening are
separate from technical export validation.

`visual-qa.json` and `independent-source-review.json` bind the final composition
to independent frame/brand/seek checks. `audio-evidence.json` records source
selection and measurements at the historical audio handoff; its pending project
integration fields are superseded by `benchmark.json` and the encoded-output
verification. Whole-film human playback and music/SFX listening remain pending.
