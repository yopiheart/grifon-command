# NOW

**Stamped: 2026-08-01** · Anchor commit: `HEAD`

> The single resume doc. One screen, one next action. Read this first, before
> `launch_readiness.md` or any handoff file.
>
> **Freshness contract:** if the stamp above is more than ~5 days behind `git log -1`,
> this file is UNVERIFIED — re-derive state from `git log --oneline -15` and the open
> issues, then rewrite this file. A stale NOW.md is worse than none.
> Verified by `node tools/resume_doc_check.mjs` (SessionStart hook runs it `--quiet`).

---

## ▶ NEXT ACTION

**⛔ BLOCKER FIRST — [#96](https://github.com/yopiheart/grifon-command/issues/96): check the ElevenLabs key's `forced_alignment` permission BEFORE any paid render.**
The local `.env` key is valid (`/v1/voices` 200) but **scoped** — `/v1/forced-alignment` returns
401 *"missing the permission forced_alignment"*. `consolidate.ts` swallows that in a `console.warn`
and falls back to estimates. **If the production key is scoped the same way, `words` is never
produced, the shipped speech-anchor fix is inert, and a ₱550 smoke logs `anchor: "silence"`
everywhere and reads as "the fix failed."** One dashboard checkbox decides whether the smoke can
prove anything. (Unproven for production — only the local key was observable.)

Then: #91 + #94.1 are implemented, committed, suite green — but *nothing is proven until a
render runs.*

**1. Two decisions only Neil can make** (both explained in `4a7bd7b`'s commit body):
   - **Golden snapshot baseline** — `tests/unit/drawPlan.snapshot.test.ts.snap` header says
     *any diff = STOP and escalate*. 8 lines moved, verified twice as the same single field
     (`startSec` 0.3→0.4 ×7, 0→0.4 ×1). Bless or reject.
   - **Overlay drop-case** — a classic-preset callout on a scene whose VO starts >1.1s in now
     **vanishes** instead of flashing early; the subtitle still carries the line. Intentional
     restraint, or should those overlays be kept? (Keeping them costs caption chunks + b-roll
     subtitles — the trade is in the commit body.)

**2. Verify FREE first — the failing run's assets are recovered.** Run `apr_69e5adc6…`'s 9 clips +
   9 VO MP3s are downloaded and expiry-proof (R2 objects were alive; only the presigned URLs had
   lapsed, re-signed with the app's own creds). `tests/integration/restitch-real.test.ts` re-stitches
   real footage for **$0**. ⚠ Its `SpecScene` has **no `voiceWords` field** — must be added, or the
   harness runs `anchor: "silence"` and proves nothing. Measured expectation: `detectedSec`
   **5.5093 → ~3.49** (true speech ends ~3.43s; NOT ~2.96 — that earlier figure came from the
   issue's estimate and is wrong; treat ~2.96 as suspicious, not success).

**3. Only then the paid render** — for `#92` (needs fresh generation), reloading mid-run to catch
   `#89`/`#90` in the same pass. Listen for the real risk: **the last word must not be clipped**
   (the anchor removes ~2.0s).
   - Correct-by-design exceptions: `sfx_only` runs log `silence` everywhere (no VO), and any
     scene whose ElevenLabs alignment failed keeps `silence`.
   - **If it's `silence` everywhere → check `/api/voice/consolidate` for a `words` array BEFORE
     suspecting the render slices.**

## Punch list — remaining, in order

| # | Issue | State |
|---|---|---|
| ✅ | **#91** breathy tail · **#94.1** early overlay | Committed `4a7bd7b` + `8090420`. Awaiting smoke. |
| 3 | **#94.3** scene-2 double-renders overlay + captions | Not started. **Now carries the real fix for what Neil saw.** Also owns the true defect: the EDL writes `8 hours` while the script spells `Eight hours`, so the two burned layers disagree. |
| 4 | **#94.2** numerals | ⚠ **MISDIAGNOSED — re-scope before building.** DB pull proves the script said "**Eight** hours" (spelled) and only the EDL overlay said "8". Captions render from `scriptLine`, so nothing was dropped and the aligner never saw a numeral — the chosen "fix aligner token-matching" would change nothing. Real latent case is scene idx=2 (`"Tuwing 3 PM…"`, a genuine spoken numeral), **unverified**. Verify with the $0 restitch; fix only if it reproduces. Also: `phoneticNormalizer.ts` does NOT exist (deleted `2e70c5a`) — do not resurrect. |
| 5 | **#89** resume dashboard-flash · **#90** final-cut fake-fail | Not started. UX only; data-safe already. |
| 6 | **#92** hook-morph AI goo | Not started. |
| 7 | **#95** ElevenLabs v3 audio-tag pronunciation | Not started. Validate, then a non-tuned mapper. |
| 8 | **#93** talking-avatar framing/facing | ⛔ **TUNED** — own regression-armed session, Neil diff-approval. Never bundle. |

## ⛔ Gated — do not action without Neil

- **P5 engine-default flip** — after the punch list ([loop_arch_handoff.md](workflows/loop_arch_handoff.md)).
- **Hyperframes product swap** — verdict STANDS ([hyperframes_decision.md](workflows/hyperframes_decision.md)); workflow lane only.
- **Slice 2** video rate-limit re-scope (`api/gemini/video.ts`) — Neil sign-off; without it >5-scene ads self-throttle.

## 🔧 Arm before you start

```powershell
.\scripts\restore-git-identity.ps1    # else commits die "Author identity unknown"
.\scripts\restore-gh.ps1              # issues ARE the durable record; .tmp/ dies with the defreezer
```
`gh` may not land on the bash PATH — fallback: `$LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe`.

## 📍 Deeper context, only if needed

[launch_readiness.md](workflows/launch_readiness.md) (scoreboard, not resume) ·
[loop_arch_handoff.md](workflows/loop_arch_handoff.md) (engine + P5 gate) ·
[post_beta_roadmap.md](workflows/post_beta_roadmap.md) (**#25 Brand Brain** = first post-launch build)

## 🅿 Parked

Slice B sample batch · KM-003 Veo clips (~$4, needs hook1/hook2 pick) · TwelveLabs M1 vault ·
[oneshot_flow_fixes.md](workflows/oneshot_flow_fixes.md) verify-and-close ·
**#91 residual gap:** degraded resume (checkpoint absent) loses alignment silently — see #91 comment.

---

### How to maintain this file

**Overwrite it — never append.** No CURRENT/PREVIOUS blocks; that is `git log`'s job, and
appending is how the last resume doc rotted three pointers deep. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen.
