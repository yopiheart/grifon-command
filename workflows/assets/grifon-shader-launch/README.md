# Grifon shader launch film

Private review deliverable from the authorized [production brief](../../grifon_shader_launch_brief.md), based on Phase 1 commit `d76f46af56ce9ddf0e6dfa7229c08a5bf9c48edb`. This is a new full film; previous accepted films, source audio, original shader study and application code are preserved.

The film carries one gold signal from fragmented type and a reflective orb through Research, Script and Storyboard, then into the clear-direction promise and canonical Grifon mark. Landscape and portrait are independently composed. Exact marketing copy lives only in `launch.json`; critical type and logo are editable DOM elements. Local Canvas 2D contours, orbit geometry, workflow diagrams and native screenshot crops supplement the three pinned free shader materials.

## Deliverables and evidence

- `landscape.mp4`: 1920x1080, best-quality landscape review.
- `portrait.mp4`: 1080x1920, attachment-sized portrait review, at most 12,000,000 bytes.
- Both: 31.2 seconds, 936 frames, 30 fps, H.264 yuv420p and stereo AAC at 48 kHz.
- [Offline player](../../../artifacts/grifon-shader-launch.html): both encoded films embedded, format switch, play/pause/restart, scrub, chapters, sound toggle and original-byte downloads. No WebGPU or network dependency for playback.
- `qa/landscape-encoded-contact-sheet.jpg` and `qa/portrait-encoded-contact-sheet.jpg`: frames decoded from finished MP4s, including samples inside motion windows and the full ending.
- `qa/encoded-report.json`: exact dimensions/frame counts/byte sizes/SHA-256, strict decode, encoded AAC levels, whole-frame movement samples and ending hold measurements.
- `qa/*-capture-check.json`: actual native GPU evidence, source hashes, exact fresh/reverse seeks, reading/safe-area checks, motion samples, copy-only and contact-time revision evidence.
- `qa/product-capture.json`: authentic component source/fixture/screenshot hashes and zero API/external request evidence.
- `qa/audio.json`, `qa/audio-cue-manifest.json`, `qa/audio-aac-headroom.json`: sources, sample-exact cue alignment, separate stems and original-fail/fix-pass AAC headroom evidence.
- `qa/recovery-archive.json`: private machine archive receipt, including ignored inputs/stems; it is not an off-device backup.

## Final correction pass

[Correction receipt](qa/corrections.json) binds the regenerated media and player to three focused fixes. The third workflow node now uses `.track-step:nth-child(3)` because the signal is a fourth sibling. The new DOM geometry verifier rejected the original selector in both formats, at contact, readable start/end and 14.4 seconds, before passing the fix. It measures actual node centers rather than using the animation formula as its expectation.

Three manually authored, opaque 1120x1920 text-free [example plates](assets/fixture-plates/plates-manifest.json) replace landscape text frames that cropped inside the unchanged Storyboard image slot. Landscape screenshots now use a 4.5 device scale factor; portrait remains 2. Full 5760x4050 landscape captures are preserved. The original editorial rectangles are extracted into three 1800x768 derivatives without resizing or sharpening; decoded RGB pixels match the source rectangles exactly. Only these framed landscape derivatives enter the renderer, avoiding the observed combined full-image decode failure. Application components, fixture copy, composition logic, animation contacts and soundtrack remain unchanged. Rebuilt music/SFX/premaster/master WAVs match the initial launch mix byte for byte.

`qa/corrections-before/` preserves original failure frames, source hashes and historical metadata from commit `f818c4952c88a5011257944717dbf82c89f2ef8d`. That initial version also remains in Git and its original private 204-entry archive. Its pass reviews and mobile receipts describe the initial media; they do not establish corrected final-mobile or final-recovery status. [Fresh parent CUA smoke](qa/parent-final-smoke.json) and [independent correction review](qa/parent-independent-correction-review.md) pass on the corrected exports. Parent owns final backup metadata, delivery and recovery updates.

## Final results

| Export | Dimensions | Bytes | SHA-256 |
|---|---|---:|---|
| `landscape.mp4` | 1920x1080 | 7,952,020 | `c3d2399b64fe85a1ddbec82cdbe45af261462ffe8a176113115fa7cedd201dfc` |
| `portrait.mp4` | 1080x1920 | 8,568,284 | `2b1413d0a490d0bd2d7974eed190d69f0bae21275f05f651f6fb694e7a0cd5f5` |

Both contain exactly 936 frames at 30 fps / 31.2 seconds, strictly decode, and measure -16.0 LUFS / -1.9 dBTP in the actual encoded stereo AAC. The final spec SHA-256 is `121d2b5cd0bb099bce8a0467eb35dbd9655915b25e4442402f2910d27442ec3c`.

The 24,116,406-byte player reproduces exactly from the corrected inputs; SHA-256 `1707c07152c64aebfb5757e86fef446577fca433ceddee0470f7a8ec3a378207`. Both embedded MP4s and posters match their source bytes. [Pass 1](qa/pass1-review.md), [Pass 2](qa/pass2-review.md) and [Pass 3](qa/pass3-review.md) are historical reviews of the initial version; the focused correction receipt and refreshed encoded report describe the current media.

[Initial independent source review](qa/independent-code-review.md) cleared four original correctness findings and the Canvas raster fix. All 34 contract tests pass again. Each corrected format has four final-node geometry cases, 12 exact fresh/nonlinear scene seeks, seven target motion checks, safe-area checks, an exact native ending hold, copy-only pixels inside the intended line, and a contact/cue revision test. Each complete 936-frame cache and every served source hash passed verification. The refreshed real-component receipt verifies eight genuine screenshots, three exact crop derivatives and zero API/external requests.

[Independent final correction review](qa/parent-independent-correction-review.md) inspected the corrected source diff, full-size samples and decoded frames, matched their source/media hashes and found no actionable issue within the correction scope. This is separate from the self-inspection and parent browser smoke.

Independent correction-pass application build and 1,432 unit tests pass (32 skipped with paid/live switches off), alongside artifact-anchor, domain-language, PowerShell ASCII and Codex control checks. See `qa/application-correction-checks.json`. Initial bundle-leak, voice-sync and prompt-parity evidence remains in `qa/application-checks.json`; application components, provider/tuned instructions, dependency manifests and the original accepted films are unchanged.

[Initial independent mobile smoke](qa/smoke-report.md) and `qa/smoke-mobile-*` screenshots are historical. The [fresh parent CUA smoke](qa/parent-final-smoke.json) passes both corrected full 31.2-second playbacks at a 390x844 viewport, all 12 chapters, scrubbing, sound toggle, a playing format switch and actual downloads matching the final MP4 hashes above. Both `qa/parent-final-mobile-390x844-*` screenshots have independently verified 390x844 dimensions. Controls measure at least 46 px; there is no horizontal overflow or console error. Playback was muted, so it is not direct-listening evidence. `qa/smoke-source-checks.json` additionally verifies exact current embedded MP4/poster bytes and offline player structure.

## Reproduce locally

Reuse the installed primary Node 24/npm 11, Playwright, Sharp, esbuild, FFmpeg/FFprobe and pinned shader runtime. Do not install, authenticate, download raw audio or call providers. These PowerShell commands run from this isolated checkout's root:

```powershell
$env:GRIFON_TOOL_ROOT = 'C:/Users/ADMIN/Desktop/grifon-command'
node workflows/assets/grifon-shader-launch/prepare-assets.mjs
node workflows/assets/grifon-shader-launch/capture-ui.mjs
node workflows/assets/grifon-shader-launch/build.mjs --check
node workflows/assets/grifon-shader-launch/contract.test.mjs
node workflows/assets/grifon-shader-launch/render.mjs check landscape
node workflows/assets/grifon-shader-launch/render.mjs check portrait
node workflows/assets/grifon-shader-launch/render.mjs render landscape
node workflows/assets/grifon-shader-launch/render.mjs render portrait
node workflows/assets/grifon-shader-launch/media-check.mjs
node tools/artifacts/build-grifon-shader-launch.mjs
node tools/artifacts/build-grifon-shader-launch.mjs --check
node workflows/assets/grifon-shader-launch/preview.mjs
```

Run captures sequentially. The render uses awaited absolute-time native WebGPU draws and `--disable-gpu-rasterization`, retaining Phase 1's demonstrated raster-stability fix. Rebuild the shader bundle with `build.mjs` after authorized composition material changes; `--check` compares it and all license notices exactly. Runtime versions: shaders 4.0.1, TypeGPU 0.12.3, tinyest 0.3.4, tsover-runtime 0.0.7, typed-binary 4.3.3, esbuild 0.27.0. The renderer refuses changed specification/source receipts before encoding.

Exact replay exposed browser raster history in transformed decorative SVG edges and rounded photo masks. Reset-and-redraw Canvas 2D geometry/crops removed those variations; settled identity transforms are omitted. The original failing frames/diagnostics remain in `qa/landscape-nonlinear-*` and `qa/landscape-contour-isolation.json`. The replay gate still requires identical PNG SHA-256 values in fresh browsers and after nonlinear seeks. Shader capture remains native WebGPU; the local canvas fix affects only decoration and unchanged screenshot pixels.

`launch-contract.mjs` binds the authored composition to the generic imported Phase 1 `action-spec.mjs`. Scene purpose, reveal, reading interval, transition, contacts, sound placement, QA and chapters all consume that one specification. Changing an audio/visual contact or copy requires regenerating the corresponding checks and exports. `audio.mjs` always rebuilds from clean music and immutable WAV sources, preserving separate music/SFX/master stems.

The offline player regenerates entirely from committed finished MP4s, posters and specification using `tools/artifacts/_gates.mjs`, system fonts, ASCII-safe HTML and an emitted-script syntax gate. `preview.mjs` serves only the vetted player bytes from memory at `/review` on loopback; all other paths/methods are 404.

Narrow `.gitattributes` rules preserve exact bytes throughout this new source/evidence folder and keep this player/builder LF on checkout. This prevents Windows automatic line-ending conversion from invalidating capture receipts or standalone regeneration. Existing application and earlier film rules are unchanged.

For final local recovery, after the finished player and all QA are complete:

```powershell
node workflows/assets/grifon-shader-launch/archive.mjs --create
```

This verifies raw source/stem hashes, both complete exports, persisted ZIP CRC and every decoded entry's SHA-256/bytes. It writes a fresh private archive under the existing primary `.tools/grifon-motion-archives/` and commits only its receipt. Raw recordings and isolated stems remain ignored.

## Honest limits

The Research, Script and Storyboard inserts show unchanged real components with manually prepared content. They are labeled **Example project** in the capture and composition. Fresh contexts block all API and remote requests. Script is preloaded and non-Cinematic; Storyboard is nonempty with manual images and `avatar:null`. No authenticated journey, generated example quality or instant end-to-end creation is claimed. Some dense interface text is supporting screen detail rather than primary marketing copy.

Music is the clean Digital Clouds source credited in `asset-provenance.json`. All nine selected ElevenLabs WAV sources predate the paid subscription: the film remains **PRIVATE REVIEW ONLY**, requiring source clearance before commercial publication. No new voiceover, provider generation, paid analysis or paid render was performed. Zero new spend.

Direct hearing is pending; waveform, timing and loudness checks are not listening evidence. Browser viewport checks are not a real Android-device check. The X reference could not be fetched during this session (403); the authorized brief supplies previously observed visual beats and records that its audio and downloadable source were not independently available. No claim of reproducing or beating unheard reference audio is made.
