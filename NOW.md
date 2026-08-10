# NOW — the resume doc
**Stamped: 2026-08-10** (session 18)

## ▶ THE `grifon.ai` DOOR IS SHUT. THE LOCK IS LIVE.

Live 08-08. Codes **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**, sent as `grifon.ai/i/FOUNDER-01` —
redeems on arrival, scrubs itself from the bar. Audit `events where module='launch_gate'`
(waitlist: `funnel_leads`). Revoke via `LAUNCH_INVITE_CODES`, kill via `VITE_LAUNCH_LOCK`;
**neither works without a redeploy.**

## ▶ NEXT ACTION — THE SAMPLE BATCH
🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — `SAMPLES` still empty.
**Scene count DECIDED 08-10: 4**, matching `SCENE_CAP` on Starter/Pro, so a sample is what the
customer actually buys. **~₱273 per ad, ~₱3,280 for all 12**; `npm run cost:estimate` is live.
First three: `real_talk`, `before_after`, `unboxing_asmr`; the landing hero comes from the same
batch. ⚠️ Kling pricing is still calibrated off one paid render.

**Gates after 08-10 — TWO left. Detail in the workflow doc.** ✅ 1-4 (08-09) · ✅ **6** at 0.35
impact/hype, 0.7 clean, 0.5 frozen classic · ✅ **10 was a duplicate of 4** · 🔶 **5 shipped
DARK** (below) · ⚠️ **9 is NOT a caption bug**, now TUNED script compliance · ⛔ 8
[#93](https://github.com/yopiheart/grifon-command/issues/93) TUNED · ⬜ 7
[#92](https://github.com/yopiheart/grifon-command/issues/92) · ⬜ 11
[#104](https://github.com/yopiheart/grifon-command/issues/104)+[#59](https://github.com/yopiheart/grifon-command/issues/59).

**Three filed root causes in a row were wrong on inspection** (#91, #94.2, **mine** — a paid probe
caught the last one before it broke a working mapping). **Read the path before editing it.**

## 🔴 YOUR MOVE — two things, both small, both blocking

**1. One eyeball unlocks gate 5.** `MID_GAP_TRIM_ENABLED` is built and OFF. Gaps ≥0.6s compress
to a 0.15s floor, max 2 per scene. Jump cuts accepted on talking scenes per your call;
b-roll/cinematic get audio-only compression, so no jump and no cost. A real-ffmpeg test proves the
hole is gone, not just the scene shortened. **No test can close whether lip-sync reads right on a
real talking head** — that is the flag flip, and it wants your eyes on one render.

**2. Two clicks arm the cloud reviewer** (PR in flight, below). Install the
[Claude GitHub App](https://github.com/apps/claude) on the repo, then `claude setup-token` → add
as repo Actions secret **`CLAUDE_CODE_OAUTH_TOKEN`** (bills the **Max plan**, not the API; an
`ANTHROPIC_API_KEY` would go pay-as-you-go). Until that secret exists the job no-ops by design.

Next code I can take without you: **gate 7** ([#92](https://github.com/yopiheart/grifon-command/issues/92)) —
speed-ramp the morph middle in `renderFfmpeg`, non-tuned. Gate 11 needs a regen and sits near TUNED.

## 🤖 NEW 08-10 — Tier 0c, the cloud-side REVIEWER
Branch **`feat/claude-review-tier0c`** → PR. Adds
[`.github/workflows/claude-review.yml`](.github/workflows/claude-review.yml): Claude reviews every
PR to `main` and posts ranked findings as **one sticky PR comment** (never the run log — that is
the reader failure this repo has paid for twice). Report-only, never blocks a merge, TUNED changes
flagged and explicitly not judged. Registered as **Tier 0c** in
[`loops.md`](workflows/loops.md).

**Why now:** the review rules already existed but only inside PreToolUse hooks that fire when a
session is alive on this PC. `grifon-starter` shipped live with 30 em dashes through that hole.
**And it is the gate on parallelism** — per Boris Cherny's *Steps of AI Adoption*, Grifon sits at
**step 1 (~1 agent)** with step-2 guardrails over-built; step 2's own bottleneck is *reviewing
output*, so worktree parallelism before this exists would multiply the jam, not clear it.
Unverified until it runs once: whether the action accepts `claude-fable-5` (fallback line is in
the file). **Earlier 08-10:** #103 (voice ERROR tier + suppression counter) and #102
(`check:domain`, now 0 hits) both merged.

⚠️ **`grifon-starter` is live with 30 em dashes** — no voice gate, correctly (English funnel), but
the em-dash rule is universal and the carve-out threw it out with the Taglish ones. ⚠️
`check:domain` scans comments, so documenting a rename re-trips the rule it satisfied. ⚠️ Step 3's
`SCRIPT_AUDIT` has no live eyeball.

📚 **CMO canon training PARKED** → [`cmo_canon_training.md`](workflows/cmo_canon_training.md):
Cialdini + Schwartz are already in the skill; the holes are **positioning**, **sales as a
discipline**, **no ledger of its own**. **Resume by typing `/grill-me` yourself.**

## 🅿 PAOLO — build it, do not open it   ← this is where the real money is
Promise only so far: **no load has run, no certificate in hand.** The page stands
(`funnels/oceanides-paolo/`), build green, **not deployed, pixel off**, 2 `⟦PENDING⟧` left.

1. 🔴 **CALL THE SUPERVISOR** — blocks everything else
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Same message:** who
   has Boss Jay already issued a DENR certificate to? Only real list of paying buyers, costs ₱0.
2. Fill the `⟦PENDING⟧`, deploy → env var (your hands) → **redeploy**, or it has no effect.
3. Two offers, pricier preselected, facility pricing first. ⏳ Checkout needs Oceanides' own
   PayMongo keys (⛔ never Grifon's). ⏳ New creative + targeting; pick the first city.
4. **Done, do not redo:** avatar, value stack, grill, pixel-leak, copy, page, trust card.

## 🔴 Do not forget

**Route density is the lever, not price** — one city first. **No CASH refunds** on the tripwire,
credit only, one year. **The ₱900 break-even is dead**; Paolo is **₱4,900 per 1-load job**. **Geo
is a coordinate radius**, lat `14.54` lng `121.02`. ⚠️ **The big client-list names are
Enterprise** — procurement and referral, **not FB ads**. ⛔ **No CTAs on organic cards**, all 78
in `assets/ad-swipe/` are paid ads.

## 🅿 PARKED
**Oceanides:** Week 02 pack · GB-001 · KM-004 hook2 · Kling b-roll · Gabriel's watermark · SEC
Reg. No. · FB About · reviews · **AEM unverified**. ⏸ Daily posting paused. **Grifon:** #89/#90
ride Slice B · `artifact-noir` Steps 1-4 · codex-sol lane at 0 · `@v5` bump · `/viral-autopsy` on
3 Savic · **worktree parallelism — locked behind Tier 0c**. **Remotion + Hyperframes closed.**

## ⛔ Gated · 🔧 Arm before starting
🔴 **GEMINI API VIDEO BUDGET IS EXHAUSTED.** Manual via Flow. Gated: Kling. Re-arm:
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` · `npx playwright
install chromium`. ⚠️ **Neither `gh` nor `claude` is on PATH** — `…\Programs\GitHubCLI\bin\gh.exe`
and `~\.vscode\extensions\anthropic.claude-code-<VER>\resources\native-binary\claude.exe` (the
version is IN the path, so it breaks on every extension update — re-list the dir). Each funnel has its
own `node_modules` · **never pipe build output** · **Bash is network-sandboxed, use PowerShell** ·
⚠️ `scripts/check-alignment-numerals.mjs` **costs real ElevenLabs calls**, answer already recorded.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH (this file, commit subjects, workflow docs); ads stay Taglish.
