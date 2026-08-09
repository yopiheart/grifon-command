# Grifon promo — motion-promo canvas lane (bake-off vs Hyperframes)

**Built 2026-08-10. $0. ~35 min wall-clock. Same script as the Neil-approved
Hyperframes launch video v3 (2026-07-22), different renderer.** Same words on
purpose: the comparison is about the tool, not the copy.

| | |
|---|---|
| Output | `GRIFON-PROMO-canvas-v1.mp4` — 20.00s · 720x1280 · 30fps · 600 frames |
| Player | `GRIFON-PROMO-canvas-v1.html` — self-contained, scrubbable, Inter inlined as a data URI (no external hosts, so it also satisfies the artifact CSP) |
| Engine | `engine.js` — one pure `drawFrame(ctx, t)`; same file drives the player and the encode |
| Renderer | `render.js` — resumable frame writer (`@napi-rs/canvas`) |
| Strip | `scene-strip.jpg` — 12-frame contact sheet |

## Re-render

Nothing is vendored into the product. Scaffold in a scratch dir:

```bash
npm i @napi-rs/canvas                      # prebuilt binary, no compiler
node render.js frames all                  # 600 frames, ~56s
node render.js frames missing              # resume check
node_modules/ffmpeg-static/ffmpeg.exe -y -framerate 30 -i frames/f_%04d.png \
  -i api/_lib/assets/music/mrbeast.mp3 -shortest \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium -movflags +faststart \
  -af "afade=t=in:st=0:d=0.5,afade=t=out:st=18.5:d=1.5,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k out.mp4
```

`render.js` registers `api/_lib/assets/fonts/Inter-Black.ttf` as the `Inter`
family — Inter is not installed on the cafe PC, and without that line the whole
film silently falls back to Arial.

## Two things this run taught us

**1. Inter Black has no `₱` (U+20B1).** `fillText('₱')` painted a tofu box, and
the first contact sheet had one sitting on every single price. Montserrat and
Anton in the same folder do carry the glyph, but they are a different weight and
width, so swapping fonts mid-word makes the price look pasted on. The fix is
`drawPeso()` in `engine.js`: a Latin P with two bars across the stem, sized off
the same font metrics as the digits. Deterministic, no font dependency, and it
passed the vision gate below. **Any future canvas work that prints pesos needs
this — do not assume the glyph exists.**

**2. Beat openings were 0.3s too slow.** Every scene spent a third of a second
arriving after a hard cut, which reads as dropped frames rather than as a cut.
Caught on the first contact sheet, fixed by pulling every entrance forward. This
is exactly why the skill says to look at stills before rendering 600 frames.

## Gates

- **Contact sheet, twice** — first pass caught the two defects above; second pass
  caught a shockwave ring sitting as a crisp hairline across the wordmark.
- **Text integrity** (`tools/render_audit.mjs`, Gemini vision on extracted stills):
  **PASS, letter-perfect.** `₱30K/MO`, `₱5,000`, `₱997`, `SA AGENCY?`,
  `UNANG AD — LIBRE`, `GUMAWA NG UNANG AD — LIBRE`, `GRIFON.AI`,
  `PARA SA NEGOSYANTENG PINOY`. The hand-drawn peso read as a peso, not as `P`.
  `covers_face: false`. Duration confirmed 20.00s / 600 frames by ffmpeg.
- **Style:** DESIGN.md world, NOT the skill's house style. The skill mandates pure
  `#000` and a rotating neon cyan/violet/magenta spectrum; this uses zinc-950
  `#09090b` and one accent, Grifon Gold `#FFCC00`. DESIGN.md wins. What was kept
  from the skill is palette-independent craft: shape-following bloom, breathing
  light, hard cuts, 2-3 frame snaps, arranged-not-scattered.

## Standing verdict (unchanged by this build)

Hyperframes remains the production lane — see
[`workflows/hyperframes_decision.md`](../../hyperframes_decision.md). It has real
CSS text, web fonts, `<video>` in frame, site capture, and a Neil-approved
template. This canvas lane can't do video-in-video at all, which is what the
approved launch video's phone-frame beat depends on.

Where the canvas lane is genuinely better: **it needs no browser.** No Chrome, no
`npx hyperframes init`, no 168 MB of matting weights. `npm i @napi-rs/canvas`
plus the ffmpeg already in `node_modules` and it renders. That makes it the
fallback when Hyperframes cannot be restored, and the only one of the two whose
output is a live scrubbable page that can ship inside a Claude Artifact.

Neither ever enters the product runtime.
