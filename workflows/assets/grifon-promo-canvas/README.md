# Grifon promo — motion-promo canvas lane (bake-off vs Hyperframes)

**Built 2026-08-10. $0. Same beats as the Neil-approved Hyperframes launch video
v3 (2026-07-22), different renderer.** Structure held constant on purpose so the
comparison is about the tool. The *copy* then diverged, deliberately — see
"Register + copy" below.

| | |
|---|---|
| Output | `GRIFON-PROMO-canvas-v2.mp4` — 20.00s · 720x1280 · 30fps · 600 frames |
| Player | `GRIFON-PROMO-canvas-v2.html` — self-contained (fonts + logo inlined as data URIs, no external hosts, so it also satisfies the artifact CSP) |
| Engine | `engine.js` — one pure `drawFrame(ctx, t)`; the same file drives the player and the encode |
| Renderer | `render.js` — resumable frame writer (`@napi-rs/canvas`) |
| Fonts | `fonts/` — Inter 700/900 + JetBrains Mono 600/800, committed so a post-defreezer session renders offline |
| Strip | `scene-strip.jpg` — 12-frame contact sheet |

## Re-render

Nothing is vendored into the product. From this directory:

```bash
npm i @napi-rs/canvas                      # prebuilt binary, no compiler
node render.js frames all                  # 600 frames, ~58s
node render.js frames missing              # resume check
node_modules/ffmpeg-static/ffmpeg.exe -y -framerate 30 -i frames/f_%04d.png \
  -i api/_lib/assets/music/mrbeast.mp3 -shortest \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium -movflags +faststart \
  -af "afade=t=in:st=0:d=0.5,afade=t=out:st=18.5:d=1.5,loudnorm=I=-14:TP=-1.5:LRA=11" \
  -c:a aac -b:a 192k out.mp4
```

`render.js` registers the TTFs in `fonts/` and decodes `public/logo.png` once
before any frame is drawn. Both degrade loudly (a warning + a visible fallback)
rather than silently shipping the wrong thing — v1 did exactly that.

## Register + copy (decided 2026-08-10)

**Taglish, throughout.** Placement decides register, and this asset's hook is a
cold Problem-Aware pain callout, which makes it a paid/organic ad to Bryan —
Taglish per the Neil-verified table in `taglish-voice.md` STEP 0a. The
`grifon.ai` landing hero is a *different asset* (English, warmer stage) and
should be built as a variant, not a translation.

Both earlier cuts mixed registers, which the CMO rules forbid: the approved v3
was a Taglish hook with an English body and CTA; this lane's v1 flipped only the
CTA. v2 is one register end to end.

Three copy decisions worth keeping:

- **`DESCRIBE / BUILD / LAUNCH` stays English (Neil, 2026-08-10).** An earlier
  draft "corrected" this to `SABIHIN MO / GAGAWA KAMI / ILABAS MO`. That was
  wrong three ways: borrowed verbs in a Tagalog frame are explicitly allowed
  (`i-launch mo` is what a Filipino marketer actually says), `GAGAWA KAMI` moves
  agency to Grifon and feeds the "AI garbage" objection, and six words do not
  read in a 1.5s beat. **These are labels, not sentences** — the never-mix rule
  governs voice, not the names of product steps, which is the same reason
  `GRIFON.AI` and `30 MINUTES` stay English.
- **`MEET` → `ETO ANG`.** Unlike the step labels, that one *is* a full English
  verb phrase addressing the viewer.
- **Our price is gone.** v1 slammed `₱997`. CMO hard constraint: never put our
  price in a video script. The competitor anchors (`₱30K/MO`, `₱5,000`) stay —
  those are the villain's numbers and they are the positioning. `LIBRE.` is the
  stronger slam anyway: Reciprocity, and a much smaller first commitment.

⚠️ **Open claim to confirm before this runs as a paid ad.** The offer beat says
`LIBRE` / `Walang bayad para subukan`, matching the live site's own CTA
(`CREATE MY FIRST AD — FREE`, `components/landing/sections/Hero.tsx`). But
`utils/planGate.ts` sets `free.video_ads = 0` — the Free tier renders no video at
all. Site copy and plan gate disagree **today, independent of this video**.
Paying to amplify a promise the product may not honor is a refund-and-trust
problem. Resolve the gate or the copy first.

## Three things this build taught us

**1. Inter Black has no `₱` (U+20B1).** `fillText('₱')` painted a tofu box, and
the first contact sheet had one on every single price. Montserrat and Anton in
`api/_lib/assets/fonts/` do carry the glyph but are a different weight and width,
so swapping mid-word makes the price look pasted on. The fix is `drawPeso()` in
`engine.js`: a Latin P with two bars across the stem, sized off the same font
metrics as the digits. **Any future canvas work that prints pesos needs this —
do not assume the glyph exists.**

**2. Registering one font weight silently breaks every other weight.** v1
registered only `Inter-Black.ttf`, so every `700` call rendered at 900 with no
error. And DESIGN.md's `label-caps` role — the `//` chips, buttons, watermark and
technical data — is **JetBrains Mono**, which the repo does not ship at all;
`index.html` states this as a LAW. v2 pulls the real families into `fonts/` and
registers them per weight.

**3. Beat openings were 0.3s too slow.** Every scene spent a third of a second
arriving after a hard cut, which reads as dropped frames rather than as a cut.
Caught on the first contact sheet — which is exactly why the skill says to look
at stills before rendering 600 frames.

## Gates

- **Contact sheet, three passes** — caught the peso tofu, the slow openings, and
  a shockwave ring sitting as a crisp hairline across the wordmark.
- **Text integrity** (`tools/render_audit.mjs`, Gemini vision on extracted
  stills): **PASS.** `₱30K/MO` and `₱5,000` present and letter-perfect, and the
  hand-drawn peso read as a peso rather than as `P`. `997` **absent** (price rule).
  Zero em dashes on screen. `ETO ANG`, `DESCRIBE`, `BUILD`, `LAUNCH`, `LIBRE`,
  `GUMAWA NG UNANG AD`, `GRIFON.AI`, `PARA SA NEGOSYANTENG PINOY` all confirmed.
  Duration 20.00s / 600 frames by ffmpeg.
- **Brand:** zinc-950 `#09090b` (DESIGN.md: never pure black) + Grifon Gold
  `#FFCC00` as the single accent; Inter for headlines, JetBrains Mono for
  label-caps; the real griffin mark from `public/logo.png` in the end card, in
  the white-mark-inside-gold-ring lockup the brand already uses on
  `logo-badge.png`. **NOT the skill's house style**, which mandates pure `#000`
  and a rotating neon spectrum. What was kept from the skill is
  palette-independent craft: shape-following bloom, breathing light, hard cuts,
  2-3 frame snaps, arranged-not-scattered.

## Standing verdict (unchanged by this build)

Hyperframes remains the production lane — see
[`workflows/hyperframes_decision.md`](../../hyperframes_decision.md). It has real
CSS text, web fonts, `<video>` in frame, and site capture. **This canvas lane
cannot do video-in-video at all**, which is what the approved launch video's
phone-frame beat depends on, and that beat is its strongest.

Where the canvas lane genuinely wins: **it needs no browser.** No Chrome, no
`npx hyperframes init`, no 168 MB of matting weights — `npm i @napi-rs/canvas`
plus the ffmpeg already in `node_modules`. That makes it the fallback when
Hyperframes cannot be restored, and the only one of the two whose output is a
live scrubbable page that can ship inside a Claude Artifact.

Neither ever enters the product runtime.
