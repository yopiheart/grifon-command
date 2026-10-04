# Local full SFX replacement mechanics

## Agent-selected full review export

Neil explicitly delegated the remaining choices: "Bro ikaw nalng pumili, okay na
yan. Nakakapagod kung pipili pa ko". The completed private review is
`../grifon-full-upgrade-elevenlabs-sfx-review-1080p.mp4` (32.9s, 1080p30).
`selected-review-manifest.json` records nine native sources and 51 precisely
placed cues, including individual type accents. `select-review.mjs` reproduces
the editorial plan without any provider calls; it never overwrites a selection.
Old SFX contribute no samples. Protected music/VO gain and video payload remain.

`qa/replacement-report.json` records all15 actual technical gates passing:
987 frames, stereo AAC48k, faststart, strict decode, exact H264 payload, unchanged
protected inputs/releases, new-SFX-only VO ducking, -16.02LUFS/-1.36dBTP and
the silent black tail. No new provider generation or credits were used.

This is an agent-selected review, not an independent auditory-quality pass.
Pencil4 retains its recorded machine verdict; other choices use the creative
brief, source descriptions and measured timing. The root cannot hear browser
playback. User delegation removes candidate-choice handoffs, but does not turn
technical measurements into listening evidence. Existing free-plan source rights
still limit this file to private review; it is not a commercial release.

## Mixer

`replace.mjs` makes no provider calls, downloads or new generations. Selection,
provenance and auditory approval of ElevenLabs History files are separate work.
Native selected WAV, MP3 and Opus bytes remain unchanged and are locked by SHA256.
WAV/MP3/Ogg-Opus demuxers are explicit. FFmpeg and FFprobe inputs allow only
local `file,pipe` protocols; disguised playlists cannot invoke network protocols.

The only mix contributors are the frozen `music-ducked.wav`, frozen
`voice-positioned.wav`, and explicitly selected new SFX. Music and voice retain
their exact timeline and the existing master contribution of
`1.0752266011723428` (+0.63 dB). The old mixed master, premaster, old SFX and
procedural pilot never enter this mix. Existing exports cannot be replaced by
a different candidate.

The manifest is an explicit input, owned with the selected cues/spec:

```json
{
  "schemaVersion": 1,
  "mode": "new-only-sfx-replacement",
  "output": "workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-elevenlabs-sfx-1080p.mp4",
  "assets": [
    {
      "id": "selected-history-contact",
      "path": "workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/inputs/selected-history-contact.mp3",
      "sha256": "REPLACE_WITH_EXACT_NATIVE_FILE_SHA256",
      "sourceLabel": "ElevenLabs History: exact selected item/candidate label"
    }
  ],
  "cues": [
    {
      "id": "camera-contact",
      "assetId": "selected-history-contact",
      "sourceInSeconds": 0.1,
      "sourceOutSeconds": 0.6,
      "startSeconds": 3.77,
      "sourceContactSeconds": 0.15,
      "timelineContactSeconds": 3.82,
      "gainDb": -6,
      "pan": 0
    }
  ]
}
```

This is a schema illustration, not a selected source or approved cue. All paths
are repo-relative. Source times refer to decoded 48 kHz audio before trimming;
the contact equation must match at integer sample precision. Each cue has its
own gain. Optional `pan` is stereo balance from -1 to 1, preserving the center
source level and attenuating the opposite channel without crossfeed.

New sources alone are decoded/resampled to stereo 48 kHz float PCM. Cue trims
have 3 ms cosine edge fades. New SFX alone duck by 7 dB over the exact frozen
voice phrase windows, with 60 ms cosine attack and 120 ms release. A single
headroom factor can reduce only the new SFX contribution; music/VO gain stays
fixed. No full-mix EQ, compression, normalization or synthesis occurs.

From the repository root:

```powershell
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest <selected-manifest.json>
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --self-test
node workflows/assets/grifon-motion-upgrade/sfx-elevenlabs/replace.mjs --manifest <selected-manifest.json> --render
```

Default validation rejects missing sources, changed hashes, legacy assets,
unsafe paths, invalid cue trims/contact timing and protected output paths.
Physical path containment resolves junctions/symlinks; write targets cannot use
aliases or existing hardlinks. The staging directory and QA report path are reserved and cannot be
selected as sources or manifests. Every existing `.mp4`/`.MP4` export is protected.
`--self-test` uses ignored, explicitly labeled nonrelease fixtures and rejects
fixture rendering. It does not create a fake SFX video release.

Rendering creates fresh per-run staging under ignored
`.tmp/grifon-elevenlabs-replacement`.
Promotion requires the exact complete gate set and a final rehash of the
manifest, native sources, frozen inputs and every existing export. Gates cover
finite PCM, voice above new SFX average energy in every phrase, copied H264,
strict decode, 987 frames/32.9 seconds/1920x1080/30fps, stereo AAC 48 kHz,
faststart, -16 LUFS ±1, true peak ≤-1 dBTP, and a silent/exactly black final
0.2 seconds. Failed candidates stay local without promotion.

Actual rendering writes `qa/replacement-report.json` with source labels/hashes,
cue timing/gains, SFX-only scaling, phrase levels and media evidence. The report
is staged fresh and renamed, rather than truncating an existing inode. It records
zero provider calls and auditory QA pending. File hashes and
PCM contributions establish structural preservation; a newly encoded AAC
composite cannot prove exact separated music/voice samples or listening quality.

36 native WAVs are now saved in `inputs/`: four History variants for each of
nine task-specific positive-only prompt families. `history-candidates.json`
records their exact prompts, candidate numbers, hashes and native formats.
`qa/import-spec-review.md` records independent decode, provenance-chain and
offline refusal checks. `cue-plan.json` and `qa/visual-anchor-check.md` map the
actual approved choreography; they contain no selected audio verdict.

The frozen `paid-spec.json` was approved by the direct human reply
"Approve: 250 credits + US$0.50 caps"; its original planning status is retained.
Its maximum is 250 existing
ElevenLabs credits for three optional missing-family batches, plus US$0.50 for
bounded native-audio comparisons and one mix assessment. Downloading existing
History results consumed no new generation credits. Two Gemini comparisons
consumed US$0.039258: pencil returned a complete four-candidate verdict; card-pop
was truncated and has no usable selection. Both billed attempts and full
reservations remain in the original shared ledger. `paid-spec-revised.json`
proposes LOW thinking and one explicit manual repeat, with14 total comparisons
including the two used; the same spending caps remain. This exact revision
was approved by the direct reply "Approve LOW + one manual repeat; same spending caps".
The saved approval binds to revised spec SHA
`c7f9c8f0eac1ece2585ae031c4005657184467d397c208ee27a6cf7d108affeb`.
Do not run a live provider operation merely
because files or CLI flags exist. The consumed Aira take approval does not
cover these operations.

On resume, the approved LOW manual card-pop repeat reached token preflight
(2316 tokens) and invoked generation, but failed without a result or usage.
Its complete US$0.03072 reservation remains held. There are three submitted
generation attempts, US$0.09216 reserved in total, US$0.039258 known actual cost
plus the unknown third outcome. Further comparisons stop until that outcome is
resolved. No automatic retry or new ElevenLabs generation occurred. This is
prepared tooling and source preservation, not a finished replacement mix.

On resume, the browser showed Starter active and37,769 credits. The existing36
History assets were created before that upgrade. ElevenLabs' publishing policy
states paid rights apply to content generated during the subscription, not
earlier free-plan generations. This remains a review workflow; replace any
free-plan sources before commercial use. Source:
https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform
Browser playback is
not audible to the root agent; technical measurements cannot establish taste.
Recorded Gemini native-audio assessment can inform choices after approval,
with mono/downsampling limitations; human listening and creative approval of
the new mix remain necessary for creative sign-off. The agent-selected full
private review above is exported; independent listening remains unverified.

## Private listening worksheet

`grifon-sfx-listening-test-abcd.mp4` is a 22.4-second A/B/C/D audition, not a
final selection or a commercial deliverable. Each take has a one-second labeled
hold followed by the same approved 2.5-7.1s camera/phone excerpt. A-D use native
candidates1-4 respectively for rotation-air, camera-contact and phone-contact.
There is no implied ranking. Sources remain unselected in the original catalog.

`audition.mjs` assembles this locally without providers. It locks the existing
music, VO, picture and timing hashes; excludes the old mixed audio entirely;
applies the same per-family 20ms RMS target and a common SFX headroom factor to
all variants; preserves the approved stem gain; and ducks only new SFX under VO.
Native waveform anchors are provisional contact aids, not hearing evidence.
The private review sources predate Starter and remain unsuitable for commercial
release under the recorded licensing evidence.

`qa/listening-test.json` records source cuts, gains, hashes and actual export
checks: 672 frames, 1920x1080, stereo AAC48k, strict decode, -18.4LUFS and
-1.6dBTP. A rendered label/frame was inspected. Listening/taste remains pending.
The test deliberately contains only two device scenes; it does not approve the
other families or replace the required full-film listening review.
