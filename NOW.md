# NOW — the resume doc
**Stamped: 2026-08-16** (session 25)

## 🔴 THE BLOCKER: `git clone` no longer finishes on cafe wifi
3 days lost across 3 shops. **Not SQL, not Supabase, not the Boris setup** — the repo is
**1.5 GB** (134 MB in June 2026). At the ~30 KiB/s measured 2026-08-16 that is ~13 hours,
and `git clone` has no resume, so every dropped connection restarts from zero.

The app is 6 MB. The 1.5 GB is media: `clients/oceanides` **1,131 MB**, `assets/wallpapers`
**145 MB**. July alone added **993 MB**. Everything text — every doc, skill, hook, config —
is 4.7 MB across 322 files.

**FIXED, on `claude/receiving-objects-hang-toggiy` (`a678914`, NOT merged to main).**
Lite clone = `--filter=blob:none --no-checkout` + sparse-checkout excluding media:

```
68 MB · 1,689 commits · every remote branch · 30 skills / 8 hooks / 2 agents / 4 Actions
npm run build PASSED · npm test 1,214 passed, 0 failed
```

⚠️ `--filter=blob:none` **alone is a trap** — the checkout backfills every blob and you get
**3.2 GB**, worse than a normal clone. `--no-checkout` + sparse is what does the work.

Shipped in that branch: [`workflows/cafe_session.md`](workflows/cafe_session.md) (Daan A =
lite clone ~8 min, Daan B = portable rig on a USB SSD ~1 min), `scripts/cafe-start.ps1`,
a parameterized `spawn-worktrees.ps1` (it was hardcoded to two deleted branches and errored
every session), and `.gitignore` rules for 193 MB of provably-derived renders.

▶ **NEXT: Neil runs the lite clone at the shop and confirms VS Code opens.** Nothing else
starts until he is unblocked.

## ⚠ OPEN DECISION — the repo still grows ~400 MB/month
The lite clone buys time, it is not a cure. Two things left, both Neil's call:
1. **`clients/*/ads/*/clips/`** — the heaviest (25 MB each) but **paid Veo generations**.
   Deliberately NOT gitignored: ignoring them without another home guarantees the defreezer
   eats them. Needs a destination first (Drive / R2 / Git LFS).
2. **`git filter-repo`** to strip the 1.5 GB from history. Irreversible, needs a force push,
   breaks every existing clone and branch. **Never without Neil saying so.**

## ▶ THEN — one real run on the deployed code, watched by Neil
**SHIPPED 2026-08-14 17:47 — the EDL has its eyes back in production** (`a841f69`, `--no-ff`).
Files API URI minted per clip, uploads fanned out with `allSettled`, `EDL_MAX_ATTACHED_VIDEOS`
0 → 10. Design + 48h-retention reasoning: [`edl_files_api_plan.md`](workflows/edl_files_api_plan.md).
**⏪ ONE-COMMAND ROLLBACK:** `git revert -m 1 a841f69` → safe blind state; that is the whole reason
it went in as a merge. Measured pre-merge: ONE `files/*` part → **200, not 429** · **TEN** →
**200** on ~155s of video vs ~60s for a real 10-scene ad, so there is headroom.
⚠️ **STILL UNPROVEN, AND DO NOT CLAIM IT:** that an edit made WITH eyes beats the blind one. The
blind pilot scored well and passed both gates. All that is proven is that the model accepts the
video and does not 429. **Only a watched live run answers the quality question.**
**✅ CANARY ON A SCHEDULE (`0e326ef`).** Tier 3 nightly runs the EDL video-attach check at 02:00
PHT; a red night opens an issue naming the containment step. **First fire = first real proof.**
⚠️ 2 non-blocking follow-ups left in the plan doc; **#1 (`research-tier.ab`) FIXED 2026-08-15.**
▶ **RUN SHEET READY, run NOT started** (plan doc): same fixture as the blind pilot so the eyes are
the only variable · unmeter flag CANNOT run on prod · **>5 `talking` scenes kills the run** (Veo 5/hr).

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gates 5 (dead-air trim) + 6 (hook hold) **Neil-passed**, so `MID_GAP_TRIM_ENABLED` is out of the
dark. `apr_2f930418` = 10 scenes for **~$4.96 ≈ ₱288** (the COGS baseline everything above cites).
Write-up: [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## 🚀 DEPLOYED TO PROD 2026-08-15 — `18d6310` (merge, `--no-ff`)
**⏪ ONE-COMMAND ROLLBACK: `git revert -m 1 18d6310`.** Deploy `dpl_DGZKBNQ…` READY. Two things:
**1. Both QA gates → `gemini-3.7-flash`**, $9.00→$3.75/Mtok. ⚠️ Watch reroll rates — the image
gate drives the only auto-reroll. Env vars `OMNI_GATE_MODEL`/`IMAGE_GATE_MODEL` still override
for an instant no-deploy rollback of just the gates.
**2. 🔴 PROD BUG FIXED — grounded JSON was being discarded.** `cleanJson` picked object-vs-array
by which brace came first, so grounded Market Research output was thrown away.
