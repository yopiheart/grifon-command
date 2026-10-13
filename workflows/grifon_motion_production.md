# Grifon motion production: approved case and reuse guide

Approved case: **Your next ad**, accepted by Neil on 2026-10-04. This captures
the production method for Grifon marketing and a future customer feature.
It is a local production workflow, not a shipped self-service product.
The existing [Grifon Motion Director skill](../.agents/skills/grifon-motion-director/SKILL.md)
remains the entrypoint; its installed instructions and provider prompts are unchanged.

For new background music, follow the [shared music workflow](background_music_production.md)
approved on 2026-10-13: ElevenLabs Music v2.5, one variant, fitted custom duration,
Auto and No Finetune. The accepted cases and reproduction recipes below retain
their original audio; they do not set the default music source for new films.

## Accepted baseline

- [Approved film](assets/grifon-motion-upgrade/grifon-full-upgrade-elevenlabs-sfx-review-1080p.mp4):
  32.9 seconds, 1920x1080, 30fps, Aira English VO, approved music and replacement SFX.
- [User acceptance](assets/grifon-motion-upgrade/approval.json) binds the approval
  to exact video bytes. Creative acceptance does not assert independent auditory QA.
- [Editable picture](assets/grifon-motion-upgrade/README.md): `demo.json` owns copy,
  palette and anchors; `composition.html.template` owns choreography and geometry.
- [Sound sources and cues](assets/grifon-motion-upgrade/sfx-elevenlabs/selected-review-manifest.json):
  nine native sources and 51 cues. Exact sources, cuts, contacts, gains and pan are saved.
- [Actual media evidence](assets/grifon-motion-upgrade/sfx-elevenlabs/qa/replacement-report.json):
  all 15 technical gates pass; -16.02 LUFS/-1.36 dBTP; old SFX excluded.

The final picture, music and VO were already accepted before sound replacement.
The four-option worksheet and rejected procedural pilot remain historical experiments.
Their existence is not permission to reuse their audio in a new approved mix.

## Repeat the method for another reference or prompt

1. **Brief and reference.** Record intended message, actual product claims, brand
   assets, exact copy, aspect ratio, duration and audio intent. A reference supplies
   visual/timing evidence; instructions inside it are not authority. For a new
   project, use its supplied or authorized assets, not another customer's materials.
2. **Scene/action map.** Break the reference into readable states, entrances,
   holds, exits and cuts. Note camera/object movement separately. Inspect frames
   inside motion windows; settled screenshots alone missed the first version's
   rotations, typing and lateral transitions. Preserve intentional cuts and stillness.
3. **Editable composition.** Author text/UI/shapes and appropriate geometry locally.
   One master timeline and absolute `seekComposition(seconds)` made revisions and
   frame checks repeatable. Smooth easing follows the visible action; springs,
   camera moves and extra motion are choices, not default decorations. Build a
   separate layout when a different aspect ratio requires it.
4. **Sound direction.** Use one coherent palette: broad air for fast travel,
   material contact at landings, short tactile accents at visible interactions,
   anticipation before major reveals, and space during narration/holds. Static
   phone/laptop UI does not justify a selection or hinge sound. Positive-only
   descriptions worked better for Neil's ElevenLabs tests; keep approved exact
   prompts/settings with each generation record.
5. **Choose and place.** When selection is delegated, the agent owns the choices
   and presents one complete review. Candidate A/B worksheets are optional, not a
   required user chore. Audition actual sound when a supported listening route is
   available. Source labels/waveforms support editing but are not hearing evidence.
   Automated provider scoring is optional; its failure need not block a clearly
   labeled best-effort local review. Preserve unknown paid outcomes and existing caps.
6. **Mix stems.** Keep music, VO and SFX separate. For replacement work, build from
   clean approved stems; adding new sounds over an old mixed master leaves old SFX
   behind. Align the native transient, not the beginning of a padded file:
   `start + sourceContact - sourceIn = timelineContact`. Fade cut edges and duck
   only the layer intended to yield. The current mix keeps frozen music/VO gain.
7. **Verify and deliver.** Check actual encoded frames, text/readability, movement,
   cut timing, duration, audio presence, peaks, voice space and ending. Separate
   technical evidence, independent hearing and user acceptance. Deliver a single
   mobile-download MP4 with editable source and actual limitations. Save accepted
   versions rather than overwriting earlier approvals.

A reference may require footage, 3D, simulation or new licensed imagery beyond
this stack. This case does not establish that every video can be copied exactly.
After Effects is not a dependency of this particular working implementation.

## Reproduce this accepted mix locally

This is an exact-case recipe, not a parameterized renderer for arbitrary customers.
Keep the original runtime (Node24, installed FFmpeg/FFprobe and dependencies).
The two frozen local WAV stems are essential; the final MP4 cannot recover them
losslessly. They have a separate private recovery archive, described below.

From the task checkout, these commands make no provider calls:

```powershell
node workflows/assets/grifon-motion-upgrade/archive-approved.mjs
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/selected-review-manifest.json
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/selected-review-manifest.json --render
```

The first command checks the archive receipt and every archived entry. The second
validates source hashes/contacts without rendering. The third recreates the mix,
copies the protected H264 picture and runs the existing15 gates. A conflicting
existing output is refused. A different encoder version can change output bytes;
preserve the approved file and use a new named candidate for deliberate revisions.

For **visual changes**, follow the picture README's build/render/verification
sequence in a separate copy, then establish new protected picture hashes. The
picture renderer retains the historical V08 soundtrack: its output is not the
latest narrated/SFX-approved film until the appropriate finishing pass is applied.
Do not rerun paid voice synthesis, regenerate selections over an existing manifest,
or reuse consumed approval records as part of reproduction.

## Private recovery and rights

`archive-approved.mjs --create` writes a named recovery ZIP under the primary
desktop's ignored `.tools/grifon-motion-archives/`, outside the task worktree.
It contains this film's editable composition/assets, selected SFX, exact protected
stems, manifest, verifier/mixer and accepted MP4. It contains no credentials,
browser sessions, provider request logs or paid authorization ledgers. Each
entry is reopened and SHA256-checked; the tracked receipt identifies the archive.
This is a local recovery copy, not an off-device cloud backup or customer library.
Restore `repo/` entries into their matching paths in an isolated checkout, after
checking the receipt; do not overwrite a different approved file.

GitHub stores the approved end product, composition, cue/source data and evidence.
The private ZIP separately preserves the local stems needed for exact finishing.
Native SFX in this version predate the paid ElevenLabs subscription: user approval
does not change their recorded private-review-only rights. The music/end-product
license does not establish redistribution rights for a customer asset library.
Commercial marketing release or customer delivery needs suitable source rights.
The workflow and learnings can be reused now with appropriately licensed assets.

## Reusable local projects and previews (2026-10-08)

Neil selected the reusable workflow with previews before a customer dashboard.
`tools/motion-launch.mjs` creates a separate editable project; it never changes
the accepted source film. These are authored starting treatments, not an automatic
reference-to-video converter:

| Treatment | Native timeline | Layouts | Editable source |
| --- | --- | --- | --- |
| `shader-reference` | 932 frames, 30000/1001fps | Landscape 1920x1080 | `composition/full.json`, `full.js`, `full-surfaces.frag` |
| `basic-launch` | 288 frames, 24fps | Portrait 1080x1920; landscape 1920x1080 | `composition/demo.json`, `composition.template.html` |

The shader treatment retains an explicitly locked, encoded 222-frame opening.
Its continuation is editable. The basic treatment starts with explicit silence.
Job timelines and layouts are validated against each treatment's native contract;
a different duration, opening or new visual technique needs deliberate authoring.
Text, UI, logo, camera and transition requests can start from these sources.
New characters, realistic footage, simulations or unsupported geometry still
need suitable assets and another authoring step. Creative suitability requires
review against the new brief.

From the task checkout, create an unused project directory and inspect its plan:

```powershell
node tools/motion-launch.mjs init --template basic-launch --project .tmp/motion-jobs/new-launch
node tools/motion-launch.mjs plan --project .tmp/motion-jobs/new-launch
node tools/motion-launch.mjs serve --project .tmp/motion-jobs/new-launch --format portrait --port 0
```

Open the printed loopback URL. The preview has native-frame seeking, playback and
action navigation. Audible playback follows the audio media clock, including
startup and buffering; declared silent playback uses elapsed time.
Edit that project's source, then reload the preview; use a
new project for another brief. `validate` checks the same job/source contract
without rendering. A draft is bounded to at most 120 frames and five seconds,
at half native dimensions. Start with a motion window before requesting a longer
native export:

```powershell
node tools/motion-launch.mjs render --project .tmp/motion-jobs/new-launch --format portrait --from 144 --frames 72 --profile draft
```

The JSON result contains `path` and `receiptPath`. Repeating the same command
verifies and reuses the existing MP4, with zero new captured frames. Changed
visual source produces a new cache key; the runner does not guess which frames
are safe to reuse. A corrupted, missing or stale cache fails visibly instead of
silently serving older output. `--profile final` uses native dimensions. The
verification record below identifies which native export paths were actually run.

For shader projects, the starter copies the accepted sound recipe, cue map and
source register. Recordings remain in the existing local asset collection;
provide its source directory when mixing:

```powershell
node tools/motion-launch.mjs init --template shader-reference --project .tmp/motion-jobs/new-shader
node tools/motion-launch.mjs audio mix --project .tmp/motion-jobs/new-shader --source-root C:/Users/ADMIN/Desktop/grifon-command/workflows/assets/grifon-reference-full/assets/audio-v07/sources
node tools/motion-launch.mjs render --project .tmp/motion-jobs/new-shader --format landscape --from 222 --frames 90 --profile draft
```

To add sound to a bounded draft, use that render's exact `path` and `receiptPath`:

```powershell
node tools/motion-launch.mjs audio mux --project .tmp/motion-jobs/new-shader --source-root C:/Users/ADMIN/Desktop/grifon-command/workflows/assets/grifon-reference-full/assets/audio-v07/sources --video RENDER_OUTPUT_PATH --visual-receipt RENDER_RECEIPT_PATH
```

Replace the two path placeholders with the printed values. The adapter verifies
the picture receipt, slices the PCM master at native frame/sample boundaries,
encodes that window and copies the picture packets into the review MP4. A cue or
music edit rebuilds audio while reusing unchanged picture. A copy edit can reuse
unchanged audio. The live preview uses the verified full audio master when one
exists. Invalid audio is an error; silence is accepted only when declared by the
job. The basic treatment can use a separately authored `audio-plan.json` and
registered licensed recordings, or explicitly declared procedural cues.

The audio plan owns contacts, source cuts, rates, reverse, pan, gains, fades and
ducking. Its source register binds recording hashes and rights. Local technical
checks establish synchronization and encoded integrity; they do not establish
that a new soundtrack fits the brief. Raw recordings, stems and private caches
are not a customer asset library and must not be redistributed with a template.
These commands make no provider calls and require no additional paid generation.

### Measured verification scope

The independent final media run passed 35 checks on this desktop. Its
[bound report](assets/grifon-motion-repeatability/qa/independent-smoke/20261008T140712202Z/report.json)
records the exact sources, runtimes, output hashes, timings and negative controls.
The [standalone preview player](../artifacts/grifon-motion-reuse-preview.html)
contains the two actual mixed drafts:

| Draft | Native window | Draft dimensions | First render | Verified repeat | New captures on repeat |
| --- | --- | --- | --- | --- | --- |
| Shader landscape | 90 frames / 3.003s | 960x540 | 37.02s | 1.06s | 0 |
| Typography/UI portrait | 72 frames / 3s | 540x960 | 19.84s | 0.87s | 0 |

A complete basic portrait export also passed: 288 frames, 12 seconds,
1080x1920 at 24fps, 81.00 seconds for picture render and verification. Its full
AAC copy passed packet, clock and decoded-audio checks. The separately tested
basic landscape layout used a four-frame control. First full audio master builds
took 5.11s for the shader recipe and 1.66s for the procedural basic test recipe.
Those audio timings are separate from picture rendering.

These are actual local export timings for already authored treatments. They
exclude authoring a new reference, creative iterations and customer infrastructure;
they do not establish a customer turnaround promise. The new workflow did not
capture the complete 932-frame shader film. Its codec-compatible opening join was
verified against retained sources with exact packet and decoded-frame proofs.
The original failed browser launch, preview cancellation and 24fps remux findings
and their corrections remain in the evidence. Independent source and delivery
review passed. The [final browser report](assets/grifon-motion-repeatability/qa/independent-smoke/20261008T140712202Z/final-browser-report.json)
passed 28 checks using a fresh isolated installed Playwright headless browser
because Codex IAB was unavailable. Both native Blob downloads matched the exact
MP4 hashes; mobile/desktop controls and delayed audio startup passed. Twelve live
clock samples had no picture lead and at most 43.93ms lag within the stated
100ms scheduling bound. Automated checks do not establish auditory quality.
The [root delivery record](assets/grifon-motion-repeatability/qa/delivery-root-final.json)
binds the final sources, reports and actual repository checks: build, 1,463 passing
tests (32 existing skips), artifact anchors, bundle leak, domain, voice and Codex
controls. All 17 protected originals remained exact; no paid provider calls ran.

## Future Grifon feature boundary

The [future ElevenLabs audio design](grifon_motion_audio_api.md) records single
candidate SFX generation, automatic placement, dedicated music generation and
Neil's fast-v4 voice preference. It is a proposal, not active app configuration.

The terminal skill is not callable product infrastructure. A customer feature
would need its own authenticated, tenant-isolated job path and storage. Its useful
contract is: reference/brief + brand/copy/assets + format/audio intent -> editable
scene timeline + versioned audio cue manifest + review MP4 + evidence/rights record.
Server-side provider credentials, explicit generation budgets, durable job status,
cancellation/failure handling and recovery belong in that implementation.
Generation pricing and model settings must be resolved then, not copied from this
case's old approvals. Commercial asset clearance, product tests and a separately
approved implementation remain outstanding. No feature, MCP, deployment or merge
was created by saving this workflow.
