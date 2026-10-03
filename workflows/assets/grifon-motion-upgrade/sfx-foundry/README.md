# Original SFX pilot and library blueprint

Neil approved the film's music and Aira voiceover, then requested stronger SFX
impact and a reusable library for commercial ads, UGC and cinematic videos.
This adds a 24-design production catalog, eight original procedural pilot
effects and a separate film audition. The original approved export is retained.
No paid synthesis, new stock downloads or FilmCrux samples are used.

The target is convincing weight, material, timing and space. A claim of AAA or
FilmCrux-equivalent quality requires listening evidence; it is not established
by waveform measurements. The assistant has not auditioned FilmCrux demos or
the new sounds. Neil's headphone/phone comparison is the creative gate.

## Why this pass changes sound design

The earlier V08 cue sheet shows 99 stock-derived placements. Its rotation-air
cues at 2.63/5.65/8.61 are only about 349ms; the phone contact is about 33ms;
message arrivals are 25-29ms; the closing confirmation lasts about 43ms.
These measured durations support testing more body and controlled tails.
They do not by themselves establish the subjective cause of weak impact.

The new film uses longer movement bodies, defined product contacts, restrained
weight at the sphere, tactile card arrivals and a logo decay. It avoids making
every cue larger. New layers yield to the already approved narration.

## Library plan

[catalog.json](catalog.json) contains 24 distinct designs and their intended
use, duration range, production method and acceptance criteria.

| Family | Starter designs | Suitable use |
| --- | --- | --- |
| Movement | Micro swish, snap whoosh, hero sweep, pivot suction | Cuts, rotations, entrances, anticipation |
| Impacts | Product weight, workflow punch, textured slam, sub boom | Hero contacts and selected story peaks |
| Tension | Short riser, long crescendo, descending brake, synthetic horn | Builds and changes of pace |
| Tonal | Warm pluck, glass sparkle, sphere reveal, logo resolve | Benefits, polished reveals, brand ending |
| Practical Foley | Cloth swipe, package tear, product placement, latch click | UGC, unboxing, physical demonstrations |
| Motion/UI | Micro select, card snap, restrained error, counter tick | Tactile feedback and motion graphics |

Eight designs are generated in this pilot; sixteen remain planned, including
the four practical Foley designs, which require original recordings. A dry
variant, a wet variant and a light/heavy treatment are future production work,
not additional completed files in this pilot.

Each effect may contain anticipation, a precise transient, material/body and
a controlled tail. Small UI feedback needs fewer layers. Core weight is
centered; useful low-mid harmonics should survive on small speakers, and
stereo texture should survive mono collapse. Reproducible local source is in
[build-pilot.mjs](build-pilot.mjs); file hashes, sync points and signal checks
are recorded in [the generated manifest](pilot/manifest.json).
Scoped Git attributes preserve source/recipe LF bytes on Windows so the
recorded source hashes survive checkouts.

## Reproduce and audition

Run from this worktree's repository root with installed Node24. The generator
uses built-in Node modules and writes original 48kHz/24-bit stereo PCM WAVs.

```powershell
node workflows/assets/grifon-motion-upgrade/sfx-foundry/build-pilot.mjs
node workflows/assets/grifon-motion-upgrade/sfx-foundry/remix-pilot.mjs
node workflows/assets/grifon-motion-upgrade/sfx-foundry/remix-pilot.mjs --render
```

The remix default validates offline; rendering uses the already installed
FFmpeg/FFprobe. Existing music/voice/master stems remain in this project's
ignored `.tmp/grifon-english-vo-v02/` folder and are hash locked in
[film-cues.json](film-cues.json). Missing stems are a reproduction input issue;
do not substitute another project's assets or synthesize a new VO.

The new file is `../grifon-full-upgrade-sfx-pilot-1080p.mp4`. The renderer
checks an ignored candidate before promotion. The old approved film is never
overwritten. The baseline PCM master is frozen; only the edited SFX difference
is added at the existing linear master gain. Music and narration are not
renormalized, retimed, equalized or regenerated. Composite AAC re-encoding
can change final encoded samples, so separate encoded VO byte identity is
not claimed.

Listen at matched playback volume to the old and new full films. Assess hero
contacts at 3.82/6.84/9.80, the sphere at 14.27 and the logo at 29.28. A pass
needs convincing action fit and weight on headphones AND phone speakers,
with every spoken word clear and without harshness or repetitive hit spam.
Signal checks and mono/band-limited measurements support, but do not replace,
that audition. The [remix report](qa/remix-report.json) records actual results.

The completed local candidate is 32.900s/987frames/1080p30, measuring
-15.99LUFS/-2.75dBTP. Its H264 picture payload matches the approved film.
The original master gain is +0.63dB; only the SFX difference is added, with
no full-mix renormalization. The logo's body-energy duration increases from
45ms to 660ms under the recorded shared-bin threshold; this measures energy,
not perceived impact. The three revised weight sounds retain 18.5-25.0%
of their mono FFT energy in 300-3400Hz after the initial bass-heavy pilot was
revised. This proxy does not establish physical phone audibility.
The final file SHA256 is
`1928f4f158f84f9c94de754bb814686a4404e35bff369109307f92c20180c522`.
Independent actual-file and source checks are recorded separately in
[independent-smoke.md](qa/independent-smoke.md). Listening approval remains
pending; the current approved narrated film is preserved.

## Provenance and future generation

The standalone pilot contains original local DSP audio, source, recipes and
measurements. It contains no FilmCrux, Mixkit or other third-party audio
samples. Existing stock audio remains part of the film's approved composite;
that does not authorize distributing it as a new standalone asset library.
This pilot is an internal Grifon creative asset, not a shipped product feature.

The inspected [FilmCrux bundle page](https://www.filmcrux.com/store/p/audio-bundle)
separates cinematic sound design, practical Foley/diegetic effects and music.
Those functions inform this production plan; no proprietary sound is cloned.
Realistic cloth, packaging and surface contact should use original recordings
or individually vetted sources. [Freesound's licensing FAQ](https://freesound.org/help/faq/)
describes the different source licenses and remix obligations.

[ElevenLabs text-to-SFX](https://elevenlabs.io/docs/overview/capabilities/sound-effects)
is an optional future route for material/ambient textures. It uses credits;
the inspected documentation quotes 40 credits/second with an explicit duration.
No AI SFX request is made in this pilot. A paid test would need its own exact
inputs, pass/fail criteria and cost cap. [Commercial rights depend on the plan
and service terms](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform);
free generation is not automatically licensed for commercial ads.
