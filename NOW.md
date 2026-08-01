# NOW

**Stamped: 2026-08-01** · Anchor commit: `b16006c`

> The single resume doc. One screen, one next action. Read this first, before
> `launch_readiness.md` or any handoff file.
>
> **Freshness contract:** if the stamp above is more than ~5 days behind `git log -1`,
> this file is UNVERIFIED — re-derive state from `git log --oneline -15` and the open
> issues, then rewrite this file. A stale NOW.md is worse than none.

---

## ▶ NEXT ACTION

**The 7-issue fix pass on the Producer engine.** Neil eyeballed the finished smoke ad on
2026-08-01 and filed everything. His call: *"ayusin natin lahat."*

Work in this order — quick deterministic wins first, tuned work last and alone:

| # | Issue | Why this slot |
|---|---|---|
| 1 | **#91** last-scene breathy tail (trim to VO end) | Small deterministic `renderFfmpeg` fix |
| 2 | **#94** captions — overlay-before-VO, dropped numerals, scene-2 double text | Alignment fix; #91+#94 close half the quality gap to the KM lane |
| 3 | **#89** resume dashboard-flash | Data-safe already; UX only |
| 4 | **#90** final-cut *presents* as failing while succeeding | UX only |
| 5 | **#92** hook-morph AI goo | |
| 6 | **#95** ElevenLabs v3 audio-tag pronunciation | Validate first, then a **non-tuned** mapper |
| 7 | **#93** talking-avatar framing/facing rules | ⛔ **TUNED** — own regression-armed session, needs Neil diff-approval. Do NOT bundle. |

## ✅ Where we actually are

- **Launch gate #1 PASSED e2e (2026-07-31).** Producer smoke: gate-stop + full render, 0:35 ad
  on First Cut. No-double-spend PASS (`attempts=1` ×9 through reload). 429-UX did not reproduce
  (key is billed now).
- Engine is proven. The punch list above is the last quality pass before it lands as default.

## ⛔ Gated — do not action without Neil

- **P5 engine-default flip** — stays gated per [loop_arch_handoff.md](workflows/loop_arch_handoff.md).
  Lands only *after* the fix pass.
- **Hyperframes product swap** — re-asked 2026-08-01, verdict **STANDS**
  ([hyperframes_decision.md](workflows/hyperframes_decision.md)): workflow lane only, sanctioned
  bridge is Move 3's alpha-motion asset kit. Do not re-litigate.
- **Slice 2** — video rate-limit re-scope (per-clip → per-ad-launch, `api/gemini/video.ts`).
  Neil sign-off gate; without it >5-scene ads self-throttle.

## 🔧 Arm before you start

```powershell
.\scripts\restore-git-identity.ps1   # else the first commit dies "Author identity unknown"
.\scripts\restore-gh.ps1             # issues #89-#95 ARE the durable record; .tmp/ dies with the defreezer
```

Then: `gh issue list --state open`

## 📍 Deeper context, only if you need it

- [workflows/launch_readiness.md](workflows/launch_readiness.md) — the scoreboard (what's left before
  paying users). Not the resume doc.
- [workflows/loop_arch_handoff.md](workflows/loop_arch_handoff.md) — engine architecture + the P5 gate.
- [workflows/post_beta_roadmap.md](workflows/post_beta_roadmap.md) — deferred-but-endorsed, incl. the
  **Brand Brain** (first post-launch build, decided 2026-08-01).

## 🅿 Parked, not forgotten

Slice B sample batch · KM-003 Veo clips (~$4, needs hook1/hook2 pick) · TwelveLabs M1 vault ·
[oneshot_flow_fixes.md](workflows/oneshot_flow_fixes.md) verify-and-close.

---

### How to maintain this file

**Overwrite it — never append.** No CURRENT/PREVIOUS blocks, no history; that is what `git log`
is for, and appending is exactly how the old resume doc rotted three pointers deep. Rewriting it
is the **last** action of every session that changed the state of the work. Keep it one screen.
