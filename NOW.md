# NOW

**Stamped: 2026-08-01** · Anchor commit: `fc6391a`

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION

**1. ⛔ BLOCKER — [#96](https://github.com/yopiheart/grifon-command/issues/96): check the ElevenLabs key's `forced_alignment` permission before ANY paid render.**
The local key is valid (`/v1/voices` 200) but scoped — `/v1/forced-alignment` → 401.
`consolidate.ts` swallows that in a `console.warn` and falls back to caption estimates. If the
**production** key is scoped the same, `words` is never produced, the shipped speech-anchor fix
is inert, and a ₱550 smoke logs `anchor: "silence"` everywhere — reading as "the fix failed"
when the cause is a dashboard checkbox. Only the local key was observable; production is unproven.

**2. Two decisions only Neil can make** (both argued in `4a7bd7b`'s commit body):
- **Golden snapshot** — `drawPlan.snapshot.test.ts.snap` says *any diff = escalate*. 8 lines
  moved, verified twice as one field (`startSec` 0.3→0.4 ×7, 0→0.4 ×1). Bless or reject.
- **Overlay drop-case** — a classic-preset callout on a scene whose VO starts >1.1s in now
  **vanishes** instead of flashing early (subtitle still carries the line). Restraint, or keep?

**3. Verify FREE before paying.** Run `apr_69e5adc6…`'s 9 clips + 9 VO MP3s are recovered and
expiry-proof (R2 objects were alive; only the presigned URLs lapsed). `restitch-real.test.ts`
re-stitches real footage for $0. ⚠ Its `SpecScene` has **no `voiceWords` field** — add it, or the
harness runs `anchor: "silence"` and proves nothing. Blocked on #96 for real alignment; fallback
is ffmpeg-measured onset/speech-end (verifies the render logic, not the aligner).
**Measured expectation: `detectedSec` 5.5093 → ~3.49.** NOT ~2.96 — that came from the issue's
estimate and is wrong; treat ~2.96 as suspicious, not success.

**4. Only then the paid render** — for `#92` (needs fresh generation), reloading mid-run to catch
`#89`/`#90` in the same pass. Real risk to listen for: **the last word must not be clipped**
(the anchor removes ~2.0s). Correct-by-design: `sfx_only` runs log `silence` (no VO).

## Punch list

| # | Issue | State |
|---|---|---|
| ✅ | **#91** tail · **#94.1** early overlay | Committed `4a7bd7b` + `8090420`. Unproven until a render. |
| 1 | **#96** alignment silently disabled by key scope | **NEW, blocks the smoke.** See above. |
| 2 | **#94.3** scene-2 double-renders overlay + captions | **Carries the real fix for what Neil saw.** Also owns: EDL writes `8 hours` while the script spells `Eight hours`, so the two burned layers disagree. |
| 3 | **#94.2** numerals | ⚠ **MISDIAGNOSED — re-scope first.** Script said "Eight" (spelled); only the EDL overlay said "8". Captions render from `scriptLine`, so nothing was dropped and the aligner never saw a numeral — the chosen "aligner token-matching" fix would change nothing. Real latent case is scene idx=2 (`"Tuwing 3 PM…"`), **unverified**. Full evidence in the #94 comment. `phoneticNormalizer.ts` does NOT exist (deleted `2e70c5a`). |
| 4 | **#89** resume flash · **#90** final-cut fake-fail | Not started. UX only; data-safe. |
| 5 | **#92** hook-morph goo · **#95** v3 audio tags | Not started. #95 = validate, then a non-tuned mapper. |
| 6 | **#93** talking-avatar framing | ⛔ **TUNED** — own regression-armed session, Neil diff-approval. Never bundle. |

## ⛔ Gated — not without Neil

**P5 engine-default flip** (after the punch list) · **Hyperframes product swap** (verdict STANDS,
workflow lane only) · **Slice 2** video rate-limit re-scope (`api/gemini/video.ts`; without it
>5-scene ads self-throttle).

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1    # else commits die "Author identity unknown"
.\scripts\restore-gh.ps1              # issues ARE the durable record
```
`gh` may miss the bash PATH — fallback `$LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe`.

## 📍 Deeper · 🅿 Parked

[launch_readiness.md](workflows/launch_readiness.md) (scoreboard, not resume) ·
[loop_arch_handoff.md](workflows/loop_arch_handoff.md) (engine + P5) ·
[post_beta_roadmap.md](workflows/post_beta_roadmap.md) (**#25 Brand Brain** = first post-launch build)

Parked: Slice B sample batch · KM-003 Veo clips (~$4, needs hook pick) · TwelveLabs M1 vault ·
[oneshot_flow_fixes.md](workflows/oneshot_flow_fixes.md) · **#91 residual:** degraded resume
(checkpoint absent) loses alignment silently — see the #91 comment.

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job; appending is how the last resume doc
rotted three pointers deep. Rewriting it is the **last** action of every session that changed the
state of the work. Keep it one screen — the verifier fails past 90 lines, and it caught this file
being appended to on the very first day it existed.
