# Reference autopsy: shader launch film

Source: https://x.com/npm_i_shaders/status/2107467668009963819.
Media ID: 2107467613437935618. Niche: developer/design-tool launch film.
Selection reason: Neil supplied this as the close-recreation benchmark; no ad
longevity, views, conversion performance or winning-ad status is established.

The visual sequence is measured and actionable. Audio interpretation remains
partly unverified. The two approved model results are preserved with their failed
gates; neither is silently repaired or accepted as ground truth.

## Visual evidence

Native source: 1920x1080, 932 video frames at 30000/1001. Video duration
31.097733s; audio/container 31.146667s. SHA256:
`47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089`.
The native AAC was extracted without re-encoding and its payload matched exactly.
Source video/audio are ignored private inspection assets, excluded from exports.

The [independent shot map](independent-shot-map.md) records every native-frame
boundary, camera/framing state, transition and subject. Root inspected the full
source contact sheets; the independent reviewer examined all 932 decoded frames,
cut neighborhoods and detailed sequences. Exact timing uses frame n *1001/30000.

| Interval | Measured visual grammar | Recreation implication |
|---|---|---|
| 0-0.868s | Dark horizontally broken character field expands into a lens. | Begin with material motion, without an invented title card. |
| 0.868-2.736s | Huge cropped refractive lens; title pitch entry, abrupt warm material change, opposite pitch into an open hemisphere. | Keep the sphere/title connected through both poses. |
| 2.736-4.605s | Eight fast treatments of one hollow rounded ring; first seven share framing. | Reuse one geometry, change material at the actual boundaries. |
| 4.605-7.407s | Flare into one large raised phrase; palette/material and surrounding trails change, then grayscale. | Smooth relief and organic corner growth are signature features. |
| 7.407-10.244s | Three fast material subjects, blurred bridge, dense cropped catalog pulling back and diving into a small lens. | Preserve density and perspective motion; avoid isolated generic feature cards. |
| 10.244-11.478s | Huge pastel lens with one centered capability line. | Preserve macro scale and curved lower rim. |
| 11.478-16.550s | Character-field reprise, folded/point material macros, four 0.10-0.13s geometric changes, black break, diagonal particle ribbon, four ~0.4s glyph macros. | Repetition and abrupt material cadence drive this section. |
| 16.550-21.355s | Tilted real editor; same preview reflows desktop/mobile, spin into another treatment, canvas edit, finished canvas, pullback and glitch erasure. | Use truthful Grifon Example project captures with the same framing and timing. |
| ~21.855-28.462s | Small centered wordmark, huge lower-cropped atmospheric sphere, long slow hold, tilted recession/fade. | Keep the end lockup small and give it the measured hold. |
| 28.462-31.098s | Black video tail; audio/container extends to31.146667s. | Do not invent a CTA hold through the final frame. |

This is visibly synthetic motion design plus captured interface footage. There
is no human performance to grade for believability. No real-human/likely-AI
believability corroboration count is assigned.

The detailed angle/subject inventory is the shot map: full-frame materials,
frontal shared ring, cropped lens/glyph macros, dense catalog perspective,
tilted editor and static-position end mark. Recreation routes are local
GLSL/Three geometry, local glyph distance fields and genuine component captures.
No paid image/video generation is needed for those routes.

## Audio: facts and hypotheses

Direct hearing is unavailable in this Codex model. The supported audio-input
probe returned that audio content is unsupported. An unmuted browser and a
waveform do not establish listening. Gemini audio findings are explicitly
model-assisted hypotheses, and the two calls disagree about vocals and tempo.

| Claim | Evidence and status |
|---|---|
| Native reference audio was supplied. | First call used the original MP4. The focused second call explicitly reports AUDIO input modality for the native AAC and both clean candidates. |
| No vocals versus vocal chops. | First model said NO_VO; focused model proposed words in the first8s at medium confidence. Unresolved: no accepted verbatim transcript. |
| 120BPM / perfect beat sync. | First model claim is unsupported. Free onset analysis finds no supporting120BPM peak; cut proximity alone is insufficient because onset windows cover much of the timeline. |
| 126BPM. | Focused model estimate. Free signal periodicity has a stronger~130.04/min candidate with slower ambiguities. Neither is accepted as a heard tempo. |
| Riser7-8.5s. | Focused model hypothesis. Measured spectral/energy changes cannot independently name that sound. |
| Digital Clouds is the exact instrumental. | Independent PCM/spectral comparison does not establish this model claim: no coherent distinctive matching sequence across candidate offsets and tested rates. Added vocals/SFX or processing could mask a fingerprint; absence is not proved. Do not adopt the claim as soundtrack identity. |
| Silence. | No reference interval below-50dBFS lasting at least0.3s was measured; a quieter tail below-40dBFS occurs~30.795-31.145s. This is signal evidence, not a sonic description. |

Free measurements and uncertainty are in [audio-events/summary.json](audio-events/summary.json)
and [audio-events/track-comparison.json](audio-events/track-comparison.json).
148 positive-flux changes were detected with STFT timing uncertainty of about
21.3ms. A change at0.0613s supports an onset near the first model's0.06s marker;
it does not identify static, a shutter, or another named SFX.

The original soundtrack is not placed in Grifon exports. No clean candidate has
an accepted sonic-fidelity pass. A weak similarity ranking is not an exact match.
The [track-fit report](audio-events/track-fit-report.md) records useful provisional
choices: C/Digital Clouds28.905-36.305s fits the opening energy more closely;
B/Close Up63.070-94.217s fits full-length energy more closely. Whole-track
periodicity of C is closer to A than B is, but this is not a heard tempo or a
separate tempo measurement of the proposed opening excerpt. Compressed/noisy
same-source controls recovered coherent alignments; actual A/B/C did not.

## Approved executions and limits

| Run | Approved bound | Actual estimated charge | Result |
|---|---|---|---|
| Original whole-video autopsy | One Gemini3.5Flash call, maxUS$0.25, 16,384 output tokens, unchanged canonical prompt, no retry. | US$0.0396285 | Canonical specificity FAIL; source frames contradict timing claims. |
| Focused audio comparison | One separate Gemini3.5Flash call, maxadditionalUS$0.10, 8,192 output tokens, exact native AAC + Close Up + Digital Clouds and approved audio prompt, no retry. | US$0.0302415 | AUDIO modality confirmed. Strict timing FAIL:31.15s endpoint exceeds31.146667s by3.33ms; sound/identity claims remain unverified. |

Combined estimated charge: **US$0.06987**. Account/invoice charges were not
inspected. Exact prompts, inputs, hashes, usage and single-attempt ledgers remain
in [autopsy/run-report.md](autopsy/run-report.md) and
[audio-autopsy/run-report.md](audio-autopsy/run-report.md).
No retries, alternate providers or additional generation are authorized.

No generic model result is appended as an accepted Swipe File entry, no Pattern
Index count is incremented, and no tuned prompt/preset/model setting is changed.
This measured case note and the explicit low-confidence audio findings supply
the current recreation brief without contaminating the pattern library.
