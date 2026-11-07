# Oceanides choice story V1

2026-11-07. Draft copy and silent portrait motion proof for Neil's review.
The viewer is a business operator who notices a recurring washroom issue
before opening. The fictional café gives the scene stakes. The vote decides
which place to look at first in a possible sequel.
[Saveo source study](../../../workflows/reference_studies/saveo-audience-choice.md).

| Time | Exact draft copy | What the viewer sees |
| --- | --- | --- |
| 0-3s | May amoy sa CR. / Magbubukas na yung café. | A café worker approaches the washroom door. A restrained push leads toward the door. |
| 3-6s | Bagong linis. / Pero bumalik yung amoy. | Cut inside to a mop, bucket, sink and floor drain. The framing moves in slightly. |
| 6-9s | Saan kaya galing? | A ring marks the floor drain, then a second ring marks the sink. Both locations stay visible. |
| 9-14s | Saan ka unang titingin? / A · Floor drain / B · Lababo / Comment A o B. / Doon tayo magsisimula sa Part 2. | Matched close crops present the choices simultaneously. The sequel line enters at 10.4s and the choice holds through the end. |

`Kuwento 01 · Ilustrasyon` appears under the transparent Oceanides mark
throughout. Slashes represent line breaks. The two framed crops contain artwork,
with the option names on the navy background. The comment prompt has the final
hold. If the story is posted, prepare both routes and follow the observed
vote. A crew member should review any inspection or diagnosis depicted in a sequel.

## Editable sources and verification

Local draft archive at
`F:/CodexCreativeArchive/oceanides/organic/saveo-choice-proof-v1/`.
Use `beats.json` for exact copy, `cafe.svg` and `washroom.svg` for illustration,
and `composition.html` for timing and layout. `build.mjs` renders the editable
composition using the installed Playwright, Sharp and FFmpeg tools.
`node build.mjs --stills-only` checks the layout without rendering the movie.
Run the full build in a working copy to reproduce the 14s proof.

The proof uses 540x960 at 24fps. The pass checks cover text bounds in all four
beats, copy editability, full 336-frame decode, and sampled encoded transition
frames. Actual Reels interface playback and the new copy await review.
Any final audio generation uses its own approved spec after picture lock.

Proof SHA-256
`4aa28e97bba7ef1914da9ab3c178ba6702e81692e76145f4d33ac8776e0f5968`.
