# Oceanides choice story

## V2 illustrated recut

Neil asked for the source Reel's editing to shape each format. He called out
the character's visible eyes, scene changes during the story, and slow push-ins.
V2 stages the same café story as a comic with separate camera setups. The
character looks toward the door, reacts in the washroom, and changes gaze
as the choices appear. The established draft wording is split across the shots.

| Time | Shot and motion | Exact draft text |
| --- | --- | --- |
| 0-1.75s | Full-frame café wide. Slow push toward the worker and door. | Kuwento 01 · Ilustrasyon / May amoy sa CR. |
| 1.75-3.25s | Tight face insert in the café. Pupils track toward the door. | Magbubukas na yung café. |
| 3.25-4.5s | Hand turns the brass latch. Light widens at the jamb and a short camera bump accents the release around 4.05s. | — |
| 4.5-6.25s | Cut inside. The mop and bucket establish the cleaning beat while the camera moves toward the fixtures. | Bagong linis. |
| 6.25-8.25s | Reaction close-up. The worker looks down and the brow moves. | Pero bumalik yung amoy. |
| 8.25-10.25s | Full-frame paper insert. Ink circles are drawn around the two illustrated fixtures in sequence. | Saan kaya galing? |
| 10.25-11.5s | Low tile angle on the floor drain. | A · Floor drain |
| 11.5-12.75s | Separate close angle on the sink and faucet. | B · Lababo |
| 12.75-15.75s | Return to the worker. A then B enters under the face as the gaze changes. Both hold for about 2.1s. | Saan ka unang titingin? / A · Floor drain / B · Lababo |
| 15.75-19s | Hard cut to the dark sequel slate and transparent Oceanides mark. | Comment A o B. / Doon tayo magsisimula sa Part 2. |

The side-by-side review pairs Saveo's setting wide, character close-up,
paper insert, object detail, in-scene vote and end slate with the new shots.
V2 uses a 19-second timeline, original characters and local SVG/HTML. The
lower centered story captions sit below the action. The paper scene uses
dark ink and the closing slate uses the Oceanides palette. The draft is silent
for picture review. Source audio analysis and a platform playback check remain
unverified. [Saveo shot study](../../../workflows/reference_studies/saveo-audience-choice.md).

V2 is saved at `F:/CodexCreativeArchive/oceanides/organic/saveo-choice-proof-v2/`.
The 540x960, 24fps MP4 decoded through all 456 frames. The scene check matched
all nine authored cut times. The four source comparison beats of wide,
close-up, paper, and choice were also checked against the saved reference
frames. Ten layout samples and seventeen encoded samples cover the edit,
including the latch bump, both choice entrances, and the final hold.
The editable ZIP is `F:/CodexCreativeArchive/oceanides/organic/oceanides-saveo-choice-v2-editable.zip`.

V2 SHA-256
`3320f092af3752ffb381ab68a7c5355e61da11877fc276d2c61ca2f879e5211c`.

## V1 proof history

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
