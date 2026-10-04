# Accepted audio preservation

Overall status: **PASS**.

Objective preservation of accepted V08 audio; not a perceived-sound review or approval of new visuals.

Command: `node workflows/assets/grifon-motion-upgrade/qa/audio-preservation.mjs`.

Approved AAC payload SHA256: `095701ccc7fe7292c70f888a1145c15736fa64648f98c71ef24f1f195d536998`.

| Check | Baseline V08 | New full upgrade |
| --- | --- | --- |
| Media identity/decode | PASS | PASS |
| Integrated loudness | -16.03 LUFS | -16.03 LUFS |
| True peak | -1.35 dBTP | -1.35 dBTP |

Declared cue-anchor audit: **PASS**; directly checks 93 of 99 original cue placements, including character schedules, contact cues and final fade.

This compares declared demo anchors with accepted audio cues; it does not prove that rendered objects contact at those anchors. Remaining authored texture cues are preserved by the exact AAC payload check.

PENDING: the agent cannot directly hear the available audio input.

No original media or source file is modified. The verifier writes only its JSON/Markdown evidence. Exact AAC identity and level measurements do not prove perceived excitement, taste, or picture synchronization.
