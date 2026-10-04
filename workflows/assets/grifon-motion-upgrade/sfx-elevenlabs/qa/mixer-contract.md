# Independent offline mixer review

Date: 2026-10-04. Scope: `replace.mjs` and `README.md` only. No source fixes,
selected real assets, provider calls, downloads, generation, media render,
promotion, or helper process. Temporary self-test files are clearly labelled
nonrelease fixtures under ignored `.tmp/`.

Reviewed final source SHA256:
`202d1f3aeb7c4547f82cdb6037069850060c0de8277d8be1434c201c8ff32b62`.
README SHA256:
`6f7f93341e49e203407f3a2b5fd22a6078d2bc986cca4a448f3da54dbf49808b`.
Both hashes matched before and after the final controls. The earlier review
found issues in `43d41a83...`; those findings are resolved in this final version.

## Result: PASS narrow static review and tested offline controls

| Check | Result |
| --- | --- |
| Node 24.21.0 syntax check | PASS, exit 0 |
| Default invocation without manifest | PASS rejection, exit 1; explicit manifest required |
| Nonexistent manifest | PASS rejection, exit 1; existing manifest required |
| Built-in `--self-test` | PASS, exit 0; no media release |
| Labelled positive fixture manifest, default dry run | PASS, exit 0; no render |
| Same fixture with `--render` | PASS rejection, exit 1; fixture release forbidden |
| Fixed frozen music/voice contribution algebra | PASS, gain exactly `1.0752266011723428` |
| Cosine duck attack/release and minimum overlapping gain | PASS, -7 dB, 60/120 ms |
| SFX-only sample headroom scaling | PASS; frozen base preserved |
| Non-finite base/final mix and excessive frozen base | PASS rejection |
| Cue edge fades and silent tail | PASS in-memory synthetic math fixture |
| Existing NTFS hard-link write target | PASS rejection; own nonmedia link/files removed |
| Forced local WAV fixture decode | PASS; 2400 finite zero samples; no media release |
| Original reserved-input collision negative control | PASS; removing the guard causes exit 1 |

The built-in self-test rejects legacy paths/protected hashes, changed source
and candidate bytes, missing/empty/false gates, existing different releases,
and fixture rendering. It preserves the fixture release and creates no report
on rejected promotion. It additionally validates a positive labelled fixture,
rejects a one-sample contact offset and protected picture output, and rejects
reserved staging/report inputs before any write.

Commands run from the worktree root:

```powershell
node --check workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest .tmp/TEMPORARY-NONRELEASE-missing-manifest.json
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --self-test
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest .tmp/grifon-elevenlabs-mixer-fixtures/TEMPORARY-NONRELEASE-fixture-jTQyFD/TEMPORARY-selected.json
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest .tmp/grifon-elevenlabs-mixer-fixtures/TEMPORARY-NONRELEASE-fixture-jTQyFD/TEMPORARY-selected.json --render
node .tmp/grifon-elevenlabs-mixer-fixtures/ORIGINAL-COLLISION-NEGATIVE-CONTROL.mjs --self-test
```

The negative-control file differs only by pinning `HERE` to the source directory
and disabling `inputLocationAllowed`. Its self-test fails with
`Guard failed to reject: Reserved staging`, without reaching any media write.
The actual source remained unchanged. The optional decoder test initially hit
sandboxed child-process `EPERM`; approved read-only tool escalation then passed
the exact mixer decode function against the ignored silent WAV. This was an
execution restriction, not a decoder failure.

The new self-test fixture was
`.tmp/grifon-elevenlabs-mixer-fixtures/TEMPORARY-NONRELEASE-fixture-m8qToQ`.
Git confirms the fixture directory is ignored. The named temporary MP4 output
does not exist after validation and rejected rendering.

Static review confirms the mix equation is frozen music plus frozen voice,
each multiplied by the fixed gain, plus only explicitly selected new SFX
multiplied by that gain and an SFX-only headroom factor. The picture source is
mapped for video only. No old mixed master, premaster, old delta, old SFX, or
pilot contribution enters the replacement audio path.

## Resolved findings; no remaining actionable source findings in scope

1. **Input/write-target collisions:** canonical staging/report inputs are
   reserved. Rendering creates fresh per-run staging, and write reservations
   compare targets with the full input/release snapshot before writing.
2. **Filesystem aliases:** physical paths resolve existing junction/symlink
   ancestors. Writes reject alias paths and existing hard-linked files.
   The report is written to a fresh file and renamed into place.
3. **Existing-export case:** the snapshot filter is case-insensitive and covers
   `.mp4` and `.MP4`.

FFmpeg injects the `file,pipe` protocol whitelist before every input; FFprobe
uses it explicitly. Selected-source decoding forces WAV, MP3 or Ogg demuxers.
The local WAV path was exercised. Static review was also independently repeated
by a separate read-only explorer.

## Proof still required before a real selected render

- Lock the actual native WAV/MP3/Opus selections and cue manifest; establish
  source selection/provenance and contact fit by supported audition.
- Verify actual decode/trim lengths and the complete media gates on the
  selected render: unchanged input/export hashes, fixed stem contribution,
  finite PCM, phrase RMS margin, strict decode, identical H264, 987 frames,
  32.9 seconds, target format, loudness/true peak, faststart, and black/silent
  tail. No selected-render media gate has been exercised in this review.
- Complete full-film auditory QA with headphones, phone and mono. Hashes and
  RMS measurements do not establish taste, clarity or provenance.

Additional proof limits: actual junction/symlink fixtures, Windows alternate
streams, concurrent filesystem mutation, report-rename failure, and selected
MP3/Opus decoder paths were not exercised. No selected-render media gate was
passed by fixture validation alone.
