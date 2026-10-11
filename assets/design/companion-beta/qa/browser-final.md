# Final browser smoke record

PASS within mocked scope: 45 unique UI cases are green across the two runs below. This was not a single all-green 45-case run.

| Run | Result | Actual exit |
| --- | --- | --- |
| [Initial targeted 45](resumed-final/report.json) | 44 pass, 1 fail: beta 10/10, glass 17/17, chat 17/18 | [1](resumed-final/exit.json) |
| [Repaired chat rerun](resumed-chat-final/report.json) | 18/18 pass; zero skips/flaky cases | [0](resumed-chat-final/exit.json) |
| [Final recovery](resumed-recovery/summary.md) | 18/18 pass across 9 flows at 375px/1280px | [0](resumed-recovery/final-exit.json) |

The initial chat failure asserted an immediate callback while the UI was still saving before the existing asynchronous checkpoint barrier. The two assertions now poll for exactly one reshoot/style call after explicit confirmation. Zero calls before approval and no unexpected requests remain asserted. The [failure report](resumed-final/report.json) and [page context](resumed-final/red-timing-context.md) remain available.

Key evidence:

- Stop/Resume and cross-tab contention do not create a second unsettled image request. Conflicting saves preserve both conversations; dismissing an unload warning preserves the draft.
- Fixture video playback advances and the downloaded file contains nonzero WebM bytes with EBML magic 1a45dfa3. This proves the mocked player/download path, not the quality of a generated ad.
- Guided-intake/device-local-history limits remain visible; long briefs and corrections do not silently generate.
- Manual free smoke through the Codex in-app browser passed New chat, Send, reload and draft/history restoration; that tab was closed.

Source binding: [comparison](browser-source-final.json). The UI runs predate the final two-line Gemini 422/429 transport classification; the UI fixture cases do not exercise it. Final recovery captured 27 source/harness files before and after with no drift. Independent transport review belongs to its separate report.

All helper processes owned by this smoke task have stopped; port 5173 is clear. The [final fixture server record](resumed-recovery/final-server-cleanup.json) records automatic cleanup of PID 21276.

Limits: these are mocked auth/providers/media/microphone cases in desktop Edge/Chromium, including mobile viewport sizes. Physical iPhone Safari/Android Chrome and the capped approved live-generation test remain outstanding. No paid/live call, deployment or invitation was performed.
