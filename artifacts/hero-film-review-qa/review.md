# Independent final preparation-bundle smoke

2026-09-13. **PASS for the review-page and rough-cut delivery contract. Not a final taste, finished-film or actual Grifon-output pass.**

## Page and media

- Configured Playwright MCP at 390x844 and 1440x1000. All six navigation anchors, two detail toggles and eleven embedded images work. Eight shot cards present. Zero browser console errors/warnings. Continuous dark ground, visible cards and solid bright headings inspected.
- Initial long mobile heading exceeded its content box. After the author's font/wrap fix, final mobile heading clientWidth=scrollWidth=339, no checked text/container overflow. Desktop document width=1440; no horizontal overflow.
- Final HTML reloaded after all changes. Embedded data-URI video played from start to ended=true at 40 seconds, unmuted, media error=null, 960 decoded frames, zero dropped frames, 48641 audio bytes decoded.
- Full FFmpeg decode succeeded for landscape 1920x1080 and portrait 720x1280, both 40.00 seconds, 24fps H.264/yuv420p with 48kHz mono AAC. Exact landscape visual cuts measured at 5,9,13,19,27,34,38 seconds; requested before/at-boundary seeks all succeeded. Final two-second CTA is present and explicitly provisional in page notes.
- Portrait file separately loaded after final audio update: playback advanced with audio decoding and no error; sample seeks at 2,11,15,23,30,39 seconds succeeded. Full landscape frames remain visible; larger external notes, missing-proof labels and paid-video CTA wording are readable at 390px width. It is a review container, not a vertical replacement film.

## Audio and proof boundaries

- Final temporary cue signal measured at -20.9dB peak, -41.2dB full-file mean. This is synthesized cue audio, not provider audio, voice-over or final score.
- Initial cue tails entered declared silent placeholders. The author moved cues; decoded interiors 9.05-12.95s and 19.05-33.95s now measure -91dB (16-bit silence floor). Codec behavior at exact boundaries is not claimed bit-perfect silent.
- Actual UI/plan, UGC and cinematic exports are explicitly missing. No generated UI, fabricated output or repaired proof is presented. C03 is photo setup; C04 laptop work and C05 pause are labeled external stills, not motion evidence.
- Studio at 13-19 seconds is the existing shaded pilot, with proxy product/external labels. Its unfinished nature is documented. It does not substitute for the real-output proof slots.
- Current C-series is described as internally selected under delegated judgment, not user taste-approved. Mixed source resolution and pending real motion are explicit. No native-1080p/4K product-output claim.

## Source review

Reviewed current landscape/mobile builders, template and shot data. Both use local sources, sharp and ffmpeg. Stills use contain framing; studio uses scaled full 16:9 source. Eight exact-frame trims and concat preserve the 40-second contract. Temporary cues are generated locally. HTML embeds its assets, escapes text and uses shared artifact gates; artifact gates pass. No paid/provider dispatch or app/tuned mutation in these builders. No remaining actionable issue found within this scoped delivery review.

## Evidence and limits

- Final screenshots: mobile.png, mobile-top.png, desktop.png, desktop-top.png. Portrait samples: portrait-2.png, portrait-11.png, portrait-15.png, portrait-23.png, portrait-30.png, portrait-39.png. Landscape samples show the unchanged verified visual sequence; captured before audio-only refresh.
- Chromium viewport emulation, not physical Android WebView/device QA. Browser video decoder/audio-signal checks do not equal subjective listening approval. Landscape small metadata is inherently too small at phone width; the portrait review copy and page notes carry readable metadata.
- Portrait playback was sampled/seeking-tested plus full-file decoded; final uninterrupted 40-second browser playback was performed on the embedded landscape version. For portrait inspection only, the browser media element was displayed at 390px width/auto height after loading local bytes as a blob; media files were not modified.
- No generated-ad/provider test, actual UI capture, voice/listening quality, final motion, conversion, live Free journey or website integration validated. No final creative/taste approval claimed.
- Temporary loopback helper PID 2120 stopped; only reviewer's two browser tabs closed. Only QA files changed by reviewer; no app/source edits or paid calls.

Final SHA256:

- HTML: E29D0753B1B3AE9769F35568A34FEBCB424A1B0EA1B6A8E227D0FAA8DCA8A680
- Landscape: C589F57A8361D099BF6664A2B0027755317FBE69EAFDA093D0FF0E156FEC2F5B
- Portrait: A0A92CFF86AE8372E402B99F5FA42C3195245B88BFD489516419F91581F46A91
