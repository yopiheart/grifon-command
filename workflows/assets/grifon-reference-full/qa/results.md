# Full-sequence verification — 2026-09-27

Scope: 32.90s, 1920x1080, 30fps silent browser composition and synchronized
comparison. No video export, audio, paid generation, app changes or publication.
The user approved the pilot; the full opening/middle awaits visual review.

## Final results

- Hyperframes 0.7.68 check at 0.6, 2.3, 3.5, 4.9, 6.2, 7.75, 8.85, 11.4, 13.15,
  15.4, 19.4, 22, 24.2, 28.5 and 30.6 passed: zero errors/warnings, 17/17 sampled
  contrast checks. Info only: noninteractive canvas, font alias, intentionally
  larger dialogue container. Text remains inside the composition.
- Fifteen opening/middle snapshots include both sides of a wipe and orb contraction.
  Final evidence: final-v03/, plus baseline/ for the closing.
- Scene-reset regression: three cream scenes must have exact cream pixels in a
  background patch. All fail on final-v02/ (max channel delta145), and all pass on
  final-v03/ (delta0). No tolerance added. The historical defect remains available.
- Text edit: changed only "Your next ad." to "Your new ad." in a disposable copy.
  Fresh captures differ at3,586 pixels, all inside the edited line; zero differences
  outside. See frame-verification.json.
- Approved ending: fresh brand capture is pixel-identical to the pilot. The moving
  card frame differs at3 of2,073,600 pixels by one8-bit channel level. Initial zero
  tolerance rejected this; the card comparison allows one level for raster/shifted
  interpolation rounding and retains raw differences. Brand and outside-edit
  region checks remain exact.
- Parent CUA at390x844: panels load; all8 chapter times checked; Home+ArrowRight
  scrub reached frame1 /0.033333s;0.5x speed, Restart and solo view checked.
  Scroll/client width375 within390 viewport (scrollbar), no horizontal overflow.
- Muted playback advanced through32.9s and paused at the endpoint. Representative
  live frames and transition captures inspected; not a claim that every frame was
  observed during uninterrupted real-time playback.
- Final backward seek28.5→7.45s verified the black closing and restored cream.
  Mobile screenshots emitted in chat; browser API exposed no saved image path.
  Temporary viewport override reset before handoff.
- Independent tester had no browser connection; its source review found a missing
  composition failure path. Player now catches rejection, checks readiness and
  times out a stalled load after15s. This fallback was source-reviewed, not tested
  through a broken-asset browser fixture. No independent mobile UI pass claimed.
- Source JS syntax, standalone builder and artifact-anchor check passed. No app
  source changed; application build/test not run.

## Corrections and limits

Fixed a pencil/text collision, low-contrast conversation text, stale blue canvas
after pixel-wipe captures, and canvas visibility leaking into the ending. Wipes
now use editable DOM tiles and canvas has explicit visibility intervals. The last
22.8s hide was confirmed with fresh closing captures and a passing contrast check.
Intermediate snapshots are historical QA, not final output. One navigation-timeout
check was rerun successfully; it was not treated as a passed run.

CUA logs retain an unattributed MutationObserver.observe error as in the pilot.
No such code is authored here; Hyperframes runtime passed. Origin unconfirmed.
Portable twin built, but file:// playback unverified because browser policy blocks
file URLs. No workaround attempted. Localhost source is the verified route.

Vector objects replace the reference photographs. Gradients, font identity and
curves approximate the source; entrance blur is not physical shutter-based motion
blur. Conversation is an editorial concept, not actual product UI. No claim of
exact reconstruction, a general-purpose engine or full creative acceptance.

## Reproduction

Use installed Hyperframes snapshot with --describe false (no provider analysis).
Pass the installed Sharp module path as the first argument to verification scripts.
verify-scene-resets.mjs accepts an optional second argument: final-v02 is the
failing historical control; final-v03 is final. These scripts read PNGs, not videos.
