# Independent offline player smoke

**PASS — 2026-10-08, Asia/Manila.** The smoke agent drove its own documented Codex CUA browser 2 tab against the vetted, memory-only loopback `/review` page. The root did not drive this test. No production source was changed, no helper process was started by the smoke agent, and no paid/provider call was made.

The finished HTML was 24,080,586 bytes, SHA256 `32f8e1c1990a2076ab70f43f7d2aaa29c7101b7d7b4f07d1e3774239025c4f62`. The source-byte fixture passed with exit code 0 and confirmed both embedded MP4s and posters are byte-for-byte copies of the completed local files. The player uses embedded media, system fonts, a restrictive CSP, and no remote resource element URL.

## Observed browser results

- Both landscape and portrait ran continuously from the beginning through `currentTime = duration = 31.2`, `ended = true`, and `Finished. Replay or download the film.` Samples during playback and the final brand hold were viewed.
- Native decoded video dimensions were 1920x1080 and 1080x1920. The portrait is independently composed; the live Script interface shot retained visible `Example project` disclosure.
- Play/pause, Restart in both formats, Play from the ending, mute/unmute, frame-aligned forward and backward scrubs, and all 12 exact chapter starts passed.
- A paused format switch retained 26.4 seconds. A playing switch retained progress (13.860632 to 14.394418 seconds) and resumed playback in the other composition.
- At the actual DOM viewport of 390x844, neither composition had horizontal overflow. Every measured control was at least 46 pixels in both dimensions; minimum actual height was 46 pixels and minimum width 78.25 pixels.
- Actual unscaled **390x844** JPEGs passed local Sharp metadata checks. Continuous charcoal ground, glass sheen/edge, solid near-white display type, gold controls, and legible copy were inspected.
- The CUA page warning/error log was empty.
- The test tab was closed and the temporary browser viewport override was reset. Root owns preview PID 23200; smoke did not terminate it.

## Actual UI downloads

The CUA download event was registered before each `Download MP4` click. The saved files were read and hashed, rather than accepting link presence as evidence.

| Format | Actual saved file | Bytes | SHA256 | Result |
|---|---|---:|---|---|
| Landscape | `C:/Users/ADMIN/Downloads/grifon-shader-launch-landscape.mp4` | 7,925,665 | `176f6b495914cc3ef101dbffbfe58acb1b03382895826e5f331e43a62bd7f6a1` | Exact source match |
| Portrait | `C:/Users/ADMIN/Downloads/grifon-shader-launch-portrait.mp4` | 8,567,773 | `0d3de0fe547aed299776c34ac8473dfa888c7e2036c3646c40f2c1574b9933a4` | Exact source match; below 12 MB |

## Evidence and sizing correction

- Required exact-size captures: `smoke-mobile-390x844-landscape.jpg` and `smoke-mobile-390x844-portrait.jpg`.
- Detailed measured state, playback, chapter and download receipt: `smoke-browser-receipt.json`.
- Embedded original-media integrity receipt: `smoke-source-checks.json`; reproducer: `smoke-source-checks.mjs`.
- Initial unclipped CUA `screenshot({fullPage:false})` and `getScreenshot()` returned **375x812** JPEGs even though the DOM reported 390x844. These extra captures are retained and their receipt dimensions were corrected from the JPEG headers. They do not satisfy the exact-size gate.
- The documented `screenshot({fullPage:false, clip:{x:0,y:0,width:390,height:844}})` returned real **390x844** JPEGs. No image resizing, raw CDP, security changes, or alternative browser driver was used.
- A native range entry at 3.35 seconds was rejected because it is not on the 1/30-second frame grid. The frame-aligned backward scrub at 3.4 seconds passed. This was a test-input correction, not a product error.
- A local Sharp metadata call initially rejected a cross-realm typed-array buffer; metadata was then read directly from the saved JPEG path. No pixels were transformed.

## Material limits

Direct hearing remains **PENDING**. Music/SFX enabled and disabled states were observed, but playback/levels are not listening evidence. Real Android/phone rendering remains **PENDING**; this was a Chromium mobile viewport test.

The documented CUA read-only evaluate scope does not expose Performance resource entries. The loaded DOM contains no remote resource URLs, the video source is embedded data, `connect-src 'none'` and `default-src 'none'` are active, and the page log had no warnings/errors. This is source/DOM offline evidence, not an independent network packet trace.
