# Burn-in assets (server-side ffmpeg)

These files are read by [`../renderFfmpeg.ts`](../renderFfmpeg.ts) at render time and bundled
into the Vercel function via `vercel.json` → `api/render/final.ts` `includeFiles`.

Every lookup is `existsSync`-guarded: a **missing file degrades gracefully** (the cue/music/
caption is skipped, the render still succeeds). So the pipeline builds and the synthetic
harness (`scripts/burnin-spike.mjs`) runs even before the real audio assets land.

## Layout

```
fonts/  Anton-Regular.ttf   # bundled (SIL OFL) — caption/overlay font. OFL.txt kept alongside.
sfx/    <SfxBankId>.mp3      # 10 files; filename MUST equal the SfxBankId (types.ts SfxBankId)
music/  <style>.mp3          # 3 beds keyed to EDL meta.scriptStyleDetected
```

## What Neil drops in

**`sfx/` — 10 files, exact names:**
`whoosh.mp3` `glitch.mp3` `pop.mp3` `ding.mp3` `riser.mp3`
`drop.mp3` `snap.mp3` `swish.mp3` `boom.mp3` `sparkle.mp3`

**`music/` — 3 beds, exact names:**
`mrbeast.mp3` `temu.mp3` `testimonial.mp3`

## Format + licensing requirements

- 48 kHz stereo MP3 (WAV also fine). SFX ≤ ~2 s. Music beds ≥ 40 s (looped/trimmed to the
  final length in code).
- **License MUST permit commercial redistribution** — these are baked into customer ads that
  get published commercially. CC0 / public-domain, or a paid commercial/broadcast license.
  "Free for personal use" is NOT sufficient.
- Keep a one-line provenance note (source + license) per file when you add them.
