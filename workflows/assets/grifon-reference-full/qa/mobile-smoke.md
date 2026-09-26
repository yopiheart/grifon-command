# Full reference preview mobile smoke

- Result: BLOCKED (browser setup); not passed and not an observed product failure.
- Target: http://127.0.0.1:4179/compare.html
- Requested viewport: 390 x 844.
- Scope: independent controls/layout check of the new 32.9-second preview.

## Actual evidence

The CUA attempt to create a new background tab returned `Browser is not available: iab`. A fresh `cua.getState()` returned `apps: []` and `browsers: []`. The documented browser troubleshooting guidance was read; no alternative connected browser surface was exposed.

No page loaded in this check. No viewport override was applied, no pre-existing pilot tab was touched, and no helper process was started. Only this QA note was written; animation and application source were not changed.

## Pending verification

- Loading completes and both reference/composition panels render.
- Readable mobile controls and no horizontal overflow.
- Play and Restart, all eight chapter buttons, frame scrub, and speed selection.
- Watch Grifon solo mode and restoration to comparison mode.
- Playback through the full sequence, including freezes or unexpected blank frames.
- Console errors attributable to this version.
- Mobile screenshot evidence: unavailable because the browser connection was absent. No screenshot was captured or saved by this check.

The earlier 10.1-second pilot's successful mobile check does not validate this new complete preview. Repeat this gate when a CUA browser becomes available.

## Targeted read-only source review

The parent reported an active browser connection in the parent session and is performing its own UI check. That does not change this independent browser-check blocker.

Reviewed only `compare.html` and `index.html` for initialization, seek behavior and viewport sizing. No obvious normal-path defect was identified: comparison playback samples the reference current time; seeking is clamped to 0 through 32.9 seconds and pauses playback; clip visibility is recomputed; canvas drawing is recalculated when returning to an earlier time; mobile panels/controls wrap, and the composition root scales to fit its iframe.

One failure-path finding (static evidence, not reproduced in browser): `index.html` lines 246-247 reject `compositionReady` if an initial image cannot decode. `compare.html` lines 21-22 have no rejection handler or ready-function check, so a missing/broken logo can leave Play disabled as `Loading` indefinitely. Missing iframe/animation scripts also lack an explicit composition failure state. This does not establish a failure with the currently present assets.

No animation or application source was edited.

## Parent resolution and separate UI evidence

The parent added composition readiness/error handling and a bounded load timeout.
The finding above describes the earlier source. The parent separately inspected
390x844 playback, chapters, frame scrub, speed, solo mode and overflow, emitting
screenshots in chat. Final backward-seek and closing-background checks passed.
See results.md for actual scope; this does not convert this agent's unavailable
browser session into an independent mobile UI pass.
