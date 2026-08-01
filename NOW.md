# NOW

**Stamped: 2026-08-01** · Anchor commit: `ecb64c5`
*(Since `abbe72f`: voice/language doctrine only — `taglish-voice.md` STEP 0, `vo-direction.md`,
the client-work carve-out, session clock. No punch-list state changed.)*

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION

**#94.3 — the scene-2 double-render. Free to verify, and it now owns the only real caption defect.**

The `$0` harness works again (`abbe72f`) and the failing run's footage is recovered locally, so
this needs no paid render. Task: audit the burn-in layer selection in `api/_lib/renderFfmpeg.ts`
— establish which overlay/caption classes are *supposed* to burn on RAW (`preset=none`) at all,
then re-stitch and eyeball. **It also owns the real defect behind #94.2:** the EDL writes
`8 hours` while the script spells `Eight hours`, so when both layers burn you see two different
renderings of the same sentence.

Re-run the harness with:
```powershell
node .tmp/mkspec.mjs <scratchpad> words   # or rebuild from workflows/ notes if .tmp is gone
$env:RUN_RESTITCH='1'; npx vitest run tests/integration/restitch-real.test.ts
```
Assets die with the defreezer — recover via Supabase `producer_runs` + R2 re-presign (the run is
`apr_69e5adc6-6072-403d-bd15-b22ebe0c65e5`), then re-derive alignment via `/v1/forced-alignment`.

**Two Neil decisions still open** (argued in `4a7bd7b`'s body): the golden-snapshot diff (8 lines,
one field) and the overlay drop-case. ⚠ On the real footage the overlay did **not** vanish — it
just started on time — so the drop-case is theoretical for short-hold overlays only.

## ✅ Verified $0 — do NOT re-verify in a paid batch

- **#91** baseline **35.80s → 33.70s** (−2.10s). Baseline reproduces the reported bad duration
  exactly; the cut matches the ffmpeg-measured tail (~2.08s).
- **#94.1** at 0.5s into scene 2 (VO onset 1.419s) the baseline frame shows the overlay burned in;
  the fixed frame is clean.

## Punch list

| # | Issue | State |
|---|---|---|
| ✅ | **#91** · **#94.1** | Committed `4a7bd7b`+`8090420`, **verified $0** `abbe72f`. |
| 1 | **#94.3** double-render | **NEXT.** Free. Owns the `8` vs `Eight` layer disagreement. |
| 2 | **#94.2** numerals | **CLOSE AS NOT-REPRODUCIBLE.** Script said "Eight"; only the EDL overlay said "8"; the aligner returns `"3"` fine on the real numeral case. Nothing to fix — evidence in the #94 comment. |
| 3 | **#95** v3 audio tags | Free-ish (TTS calls only, no render). Validate, then a non-tuned mapper. |
| 4 | **#92** hook-morph · **#89**/**#90** resume-UX | **Deferred to the Slice B batch** (Neil 2026-08-01) — needs fresh generation; #89/#90 caught by reloading mid-run. See `sample_batch_test_spec.md`. |
| 5 | **#96** alignment silently disabled by key scope | Key now has `forced_alignment` ✅. Remaining: make the failure LOUD (a `console.warn` should not be how a permanent caption degradation announces itself). |
| 6 | **#93** talking-avatar framing | ⛔ **TUNED** — own regression-armed session, Neil diff-approval. Never bundle. |

## ⛔ Gated — not without Neil

**P5 engine-default flip** (after the punch list) · **Hyperframes product swap** (verdict STANDS,
workflow lane only) · **Slice 2** video rate-limit re-scope · **any paid render**.

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

## 📍 Deeper · 🅿 Parked

[launch_readiness.md](workflows/launch_readiness.md) (scoreboard, not resume) ·
[sample_batch_test_spec.md](workflows/sample_batch_test_spec.md) (**one batch, 3 deliverables**) ·
[post_beta_roadmap.md](workflows/post_beta_roadmap.md) (**#25 Brand Brain** = first post-launch build)

Parked: KM-003 Veo clips · TwelveLabs M1 vault · `oneshot_flow_fixes.md` · **#91 residual:**
degraded resume (checkpoint absent) loses alignment silently · `burnin-render.test.ts` is
probably SSRF-blocked too (same local-server pattern) — untested.

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job; appending is how the last resume doc
rotted three pointers deep. Rewriting it is the **last** action of every session that changed the
state of the work. Keep it one screen — the verifier fails past 90 lines, and it caught this file
being appended to on the very first day it existed.
