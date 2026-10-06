# Held-card Reading review, 2026-10-06

Owner rejected the previous gaze-only Reading because it resembled Idle. Passing
trajectory checks did not establish a recognizable action. This revision adds a
visibly held message card with one supporting wing and one tracing wing.

Independent reviewer `/root/reaction_review`: observable Reading gate PASS and
BRAND_PASS, zero remaining findings. First two card candidates failed the visual
gate: the chin hid the header and the pose read as presenting a card. Refined2
exposes the full card border/header; the left wing holds its edge and the right
tip advances through rows. Dip/focus and glance-up poses are visible in timeline
captures. Reading differs from Idle and Working's two-button pad at mobile size.
Soft silhouette and attached fur remain intact in sampled poses.

The 10% Reading-only local-Z wing extension keeps fixed shoulders and transforms
wing shell, gold interior and fur together. Original geometry files are unchanged.
Implementation checks sampled 2,082 wing contacts (maximum positional error
4.44e-16) within the card, plus 48 non-Reading poses matching the previous source.
Other states retain extension 1. This math does not replace visual contact review.

Independent smoke: 13/13 checks, exit 0, unchanged runtime hashes. Original
e61c18ba fails the held-card/wing-action contract. Fixed checks cover support,
trace/line motion, natural blinking, pause/resume, cleanup, reduced-motion static
hold and unchanged other states. No normal console/page errors. Build and unit
suite pass: 116 files / 1,432 tests, existing 9 files / 32 tests skipped.

Delivery uses the final 12 seconds of refined2-reading-12s.webm, beginning at
2.80s. The MP4 crops the 390x844 actual browser capture to the character stage
(358x328, x16/y191; YUV chroma alignment may round y to190), then scales to536x492.
GIF preserves 25fps with a 192-color palette. These are viewing choices, not
browser-performance evidence. Both derivatives passed full FFmpeg decode.

Independent visual judgment covers sampled poses; user taste and continuous
aesthetic quality remain pending. Desktop mobile emulation is not phone hardware.
No paid calls, deployment, actual agent/microphone binding or source-rig changes.
