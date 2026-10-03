# Grifon / Spotlight

25-second product showcase, 24 fps. Portrait 1080x1920 and separately composed landscape 1920x1080. Created after Neil delegated the creative direction with "surprise me".

Play `portrait.mp4` or `landscape.mp4`. Editable source is `composition.template.html`; exact authored copy lives in `demo.json`. Actual encoded sample sheets and measurements live in `qa/`.

## Direction and boundaries

Product close-up and light reveal (0-6.7s) -> a nine-second Grifon sample excerpt (7.5-16.5s) -> spotlight statement (17-20.7s) -> canonical GrifonMark/URL (20.55-25s).

This is a product-output showcase, not the previously proposed app walkthrough. Matching saved-project screens were not available in this task. There is no fake UI, fabricated input-to-output run, generation-time claim, conversion claim or new provider generation. The opening product still comes from the same ad excerpt, not a claimed independent input photograph. Source footage retains its original burned Taglish captions; all new display copy is English.

The reference contributes a macro reveal, scale contrast, short typography and quiet brand ending. The actual Grifon sample supplies the product evidence that the previous Spark cards lacked. This is an adaptation, not an exact Apple shot recreation.

## Sources

- `media/sample.mp4`: first 270 frames of `public/samples/real_talk.mp4`, normal-speed 9s at 30 fps, re-encoded H.264 CRF18. Actual source inspection found 271 decoded frames and a 9.066992s stream; the final frame belongs to the next scene and caused a visible flash. Only that stray frame is omitted. The original is untouched. Source run `apr_34d06c7f`; `components/OneShotAd/recipes.ts` documents the source window as 17.47-26.50s but its 9.03s duration is approximate. This excerpt avoids the full ad's earlier documented morph defect. Fictional-product / AI-generated sample, not a customer testimonial.
- `media/product.jpg`: FFmpeg frame at 8s of the original excerpt. `media/product-end.jpg`: original frame269, held above the video during the exit. `media/presenter.jpg`: first frame, used only before playback starts.
- Logo: unchanged `public/logo.png`, thin transparent gold circle and Inter Black italic GRIFON. Fonts: `workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf` and `jbmono-600.ttf`.
- Music: existing `api/_lib/assets/music/testimonial.mp3`. Music only; no newly generated voiceover or Apple soundtrack. The silent sample stays silent under the music bed.
- Local Hyperframes 0.7.68 and GSAP 3.14.2; existing FFmpeg and FFprobe. No cloud rendering. Actual paid generation/analysis spend: $0.

## Reproduce

From the repository root, with existing dependencies installed:

```powershell
node workflows/assets/grifon-motion-spotlight/build.mjs
node workflows/assets/grifon-motion-spotlight/render.mjs check
node workflows/assets/grifon-motion-spotlight/render.mjs snapshot
node workflows/assets/grifon-motion-spotlight/render.mjs render
node workflows/assets/grifon-motion-spotlight/media-check.mjs
node workflows/assets/grifon-motion-spotlight/revision-check.mjs
```

The wrapper finds the existing pinned Hyperframes npm cache, FFmpeg, FFprobe and installed browser. Missing tools fail explicitly; nothing auto-installs or calls a provider. Optional environment overrides are in `render.mjs`. Scratch renders live under ignored `.tmp/grifon-motion-spotlight/`.

Revise one copy line in `demo.json`, rebuild, then rerender. `revision-check.mjs` uses a disposable spec and checks changed opening text, preserved later frames and a deliberately wrong later text as a negative control. Its numerical limits are recorded, not a universal pixel-identity guarantee.

The media contract is 600 frames, 25 seconds, correct dimensions, an AAC stereo music track, successful full decode, bounded audio level and no unintended near-black interval of 0.3s or longer. Check actual frames for readability and continuity as well. Continuous playback/listening and the user's creative acceptance must be reported separately from machine checks.
