# Hero review cut 02

This is a 40-second rough editorial assembly, not a finished motion film.
The C-series fictional owner appears in held stills. The six-second studio beat
is the earlier Blender shaded camera preview, with its proxy bottle and empty
displays clearly labeled. Actual Grifon UI, plan, UGC and cinematic exports are
missing. Short deterministic local tones mark edit beats; there is no final
voice-over, music score or product audio.

- `hero-review-16x9.mp4`: 1920x1080 assembly, 24fps, H264/yuv420p, AAC48kmono.
- `mobile-review.mp4`: 720x1280 review container retaining the full landscape
  picture with larger metadata. This does not change the final film ratio.
- `timing.json`: shot list, timings, source references and landscape hash.
- `mobile-notes.json`: mobile-copy scope.
- `../../../artifacts/grifon-hero-film-review.html`: self-contained offline page.

From repository root, using an existing npm installation:

```powershell
node tools/artifacts/build-hero-film-review.mjs --runtime-root C:/Users/Administrator/Desktop/grifon-command
node tools/artifacts/build-hero-film-mobile-review.mjs --runtime-root C:/Users/Administrator/Desktop/grifon-command
```

Omit `--runtime-root` if this checkout has its own root dependencies. Default
rebuilds use committed source images/data and the preserved studio pilot.
Temporary frame/clip/WAV intermediates are ignored and regenerated. The
optional `--reuse-frames` flag is only for audio/template revisions when the
current local frames have already been produced and verified.

The old storyboard animatic and all rejected casting originals remain intact.
No paid provider, new Blender render, app change or publishing action occurred.
