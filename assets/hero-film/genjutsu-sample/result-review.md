# Genjutsu result review — 2026-09-18

The existing job `3c388994-7613-424e-95f5-3d30227702cb` now reports completed.
The untouched provider file is `genjutsu-original.mp4`, SHA-256
`339a6b45ad0448e9e2e34e07df6a2444c1421002bbc2a05b3d2b2ae8db0adef9`.
The original test spec and execution record are historical and unchanged.

## Verdict

**FAIL for the exact camera-preservation test; useful provisional editorial footage.**
The generated room has substantially more convincing materials, glass reflections,
light and depth of field than the Blender source. However, it replaces the wider
orbit with a pronounced forward push and ends much closer to the bottle. It also
changes the pedestal into a taller two-tier plinth. It does not preserve the exact
source movement, pacing or set geometry.

At 0/1/2/3/4/5 seconds and the last decoded frame, one upright bottle remains
grounded, with a black cap, off-white sleeve and dark coffee above and below it.
No hand, duplicate bottle, gold coffee, or invented display content was observed.
KAPE 01 is readable near the end; the two smallest label lines are not reliably
certified at this resolution. No claim of exact label fidelity or between-frame
motion stability follows from these samples.

An independent smoke-tester inspected the same original and comparison and
returned the same split verdict. No paid video analyzer ran. Continuous browser
playback and subjective review remain pending. The browser blocked the local
video URL; no alternate browser route was used to bypass that restriction.

## Actual media evidence

- Native output: 854x480, 24 fps, 145 decoded frames, approximately 6.04 seconds,
  H.264, no audio stream. It is not a native 1080p deliverable.
- Source: 960x540, 24 fps, 144 decoded frames, 6 seconds, no audio.
- Both full FFmpeg decodes and the comparison decode passed. See media-checks.json.
- before-after.mp4 places the source on the left and output on the right,
  fitted without cropping. Comparison ends at the shorter input.
- comparison-sheet.jpg and output-0s.png through output-5s.png plus output-last.png
  retain sampled visual evidence. Source input hashes still match the approved spec.

## Editorial use and cost

Cut 04 uses source seconds 3.5–6.0 as its opening, then 0–3.0 as the studio beat.
Both are at natural speed. The full original is preserved for inspection; these
trims do not turn the failed exact transfer test into a pass.
Both inserts are explicitly marked EXTERNAL STUDIO / PROVISIONAL. They do not
replace actual Grifon UGC or cinematic proof.

No new generation or retry was submitted. This is the original one-free-attempt
job. Read-only balance on Sept 18 still reports zero credits and zero remaining
Genjutsu attempts. The approved additional-charge cap was USD 0; no new charge
was initiated or independently inferred from the balance.
Support ticket 269974's latest read was a delay notice and Discord referral,
not a technical explanation of recovery. No support message was sent this turn.
