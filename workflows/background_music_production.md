# Background music for video production

Standing direction approved by Neil on 2026-10-13. Applies to new motion,
Genjutsu, Blender, launch, spec-ad, UGC and other video production in this repo.
This is an agent production workflow, not a shipped application integration.

## Approved defaults

| Control | Default |
| --- | --- |
| Provider/model | ElevenLabs Music v2.5, selected explicitly |
| Variants | 1 |
| Duration | Custom duration fitted to the actual video timeline |
| Auto | Lyrics: Auto (verified in the live UI on 2026-10-13) |
| Finetune | No Finetune |
| Vocals | Instrumental by default; vocal textures or singing only when the concept calls for them |

Create an original, purpose-directed score for each new video. Do not silently
substitute saved project music, a stock track or an arbitrary procedural bed.
Reuse the approved score for revisions of that same film when it still fits;
this preference does not require a new purchase for every preview or render.
Existing accepted films and their reproduction sources remain preserved.
Keep the separate SFX workflow: the music model does not replace precise contact
sounds, transition swooshes, zoom accents or narration.

The supplied screenshot's 45 seconds and 675 credits are examples, not a fixed
duration or price. Its wand toggle was visible as On, but prompt enhancement
was not selected as a standing preference. The first Orbital generation spec
explicitly approved auto-improve On for that call. The live UI identifies the
separate Auto control as Lyrics, independent of custom duration; it does not
map to the API's output format.

## Confirmed taste

- Grifon motion/launch: sleek and premium with groove. First palette to try:
  clean electronic groove, tight bass, crisp percussion and airy synths.
- Reveal: controlled build, a brief pause, then a fuller beat.
- UGC/talking-head: voice first; warm, subtle music beneath speech, lifting at
  the product reveal or ending.
- Instrumental is the shared default. Other client brands, Blender scenes and
  spec ads still need a fitting brief; the Grifon launch palette is not a
  universal genre prescription. BPM and instruments follow the actual edit.

## Creator method and limits

Burak Tuyan's [post](https://x.com/buraktuyan/status/2109648553027006523),
[full prompt reply](https://x.com/buraktuyan/status/2109648555740701119) and
[method reply](https://x.com/buraktuyan/status/2109648557812621668) were read on
2026-10-13. His dialogue-led ad was edited first, then scored around timestamps.
The prompt describes changing instrumentation, energy, silence windows and a
closing brand hold. The period-comedy instrumentation belongs to that ad.
He supplied Claude with timing and style; the resulting music worked despite
not following every instruction. He also often starts with music and cuts to
its rhythm when dialogue does not dictate timing.

For a locked or dialogue-led video, use picture-first scoring. For a music-led
concept, agree on the rhythmic structure early. Timestamp instructions guide
generation; enforce exact silences, contacts and the ending in the final edit.
Do not claim auditory verification from a prompt, waveform or transcript.

## Repeatable production sequence

1. Read the brief and editable timeline. Record final duration, frame rate,
   speech windows, main reveal, transitions and end-card hold. Build a cue map
   using decimal seconds and native frame numbers, with explicit units.
2. Choose a musical direction fitting that video: genre, mood, instrumentation,
   tempo and production texture. Describe the arrangement and deliberate space
   for voice and SFX. Keep music arrangement cues separate from SFX contacts.
3. Prepare an exact paid spec: purpose, input video/assets and hashes, prompt or
   composition plan, all settings, duration, one variant, output evidence,
   pass/fail criteria and maximum cost. Check the current account quote and
   rights for the intended use. Obtain approval under AGENTS.md before spending.
   One variant does not authorize retries; changed inputs need new approval.
4. Generate once under that spec and preserve the native result, settings,
   receipt and provenance. Recover an uncertain provider outcome before retrying.
5. Fit the score to the scene map. Keep original music, edited music, SFX and VO
   separate; align reveal emphasis, edit the brief pause, duck beneath speech,
   fade edits and give the end card a deliberate musical resolution.
6. Review the actual encoded video with audio. Check speech intelligibility,
   cue timing, music/SFX balance, clipping, awkward loops and ending. Verify
   technical properties separately from listening and creative acceptance.
   If no listening route is available, label listening as unverified.
7. Deliver the complete video plus editable source, source/edited music and cue
   map. Save accepted versions and the reason for revisions. Reuse the successful
   process and taste brief; do not turn a prior customer's track into a default.

## Creative acceptance and premortem

Neil's final failure priorities: music that mismatches the video's vibe, sounds
low quality, or misses pacing, reveals and the way the video works. He expects
the agent to own expert musical decisions, not delegate each choice back to him.
The taste interview is complete; apply these priorities to the finished film.

| Failure | Required review and correction |
| --- | --- |
| Wrong vibe | Compare the actual score against the video's emotion, brand, movement and reference; reject a stylish track that does not fit this film. |
| Low quality | Listen for muddy balance, harshness, synthetic artifacts, weak development and awkward edits; distinguish source defects from fixable mix problems. |
| Wrong pacing or reveal | Audition picture and audio together; compare build, pause, beat entry and ending against the cue map and correct their placement in the edit. |
| Voice or SFX masked | Check intelligibility and meaningful contacts in the full mix, including a phone-speaker review where available; adjust arrangement, ducking and levels. |

Pass: the music fits this film, supports its rhythm and reveal, leaves speech
clear and SFX audible, and resolves deliberately. Technical checks alone cannot
pass creative quality. If the generated source cannot be made suitable by
editing, state the defect and propose a specific correction; a further paid
generation still needs its approved spec and budget. Never silently substitute
an unrelated track or call an unlistened result creatively verified.

## Verified provider guidance

The [Music product guide](https://elevenlabs.io/docs/eleven-creative/products/music)
documents model selection, variants, duration and optional finetunes. Select
v2.5 explicitly rather than relying on the website or API default. Verify live
controls and the quote before generation.

The [prompting guide](https://elevenlabs.io/docs/overview/capabilities/music/best-practices)
recommends specifying genre, mood, instruments, tempo and production texture,
then describing arrangement changes. Use a clear instrumental direction when
the brief has no vocals. Preserve Neil's preference for positive descriptions.

For a future implementation, the [Compose API](https://elevenlabs.io/docs/api-reference/music/compose)
documents `music_v2_5`, `music_length_ms`, and optional `finetune_id`.
Prompt and composition-plan inputs are alternatives. `force_instrumental` is
available with a prompt. No application model, prompt or generation settings
were changed by this workflow record; implementation needs its approved diff.

## 2026 style research: evidence versus recommendation

[Epidemic Sound's 2026 outlook](https://www.epidemicsound.com/blog/music-trends-2026/),
published December 19, 2025 by its Music Curation Team, forecasts pluggnB,
organic instrumentation/minimalism, Afrofuturist sounds, rock/metal revival and
cross-genre blends. This is a curation forecast, not measured rankings of music
in launch videos, spec ads or UGC. No such ranking was established in this research.

Use those directions as discovery inputs, not mandatory trends. The clean
electronic Grifon palette and warm UGC bed above are approved creative choices,
not claims that either is the most-used genre in 2026. Other possible directions
include spacious organic-electronic product scores and energetic breakbeat or
rock hybrids for an appropriate spec-ad brief; those remain proposals.
