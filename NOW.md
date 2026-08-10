# NOW — the resume doc

**Stamped: 2026-08-10** (session 17)

## ▶ THE `grifon.ai` DOOR IS SHUT. THE LOCK IS LIVE.

Live 08-08. Codes **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**, sent as `grifon.ai/i/FOUNDER-01` —
redeems on arrival, scrubs itself from the bar. Audit: `select ts,event,meta->>'code' from events
where module='launch_gate' order by ts desc;` (waitlist: `funnel_leads`). Revoke via
`LAUNCH_INVITE_CODES`, kill via `VITE_LAUNCH_LOCK`; **neither works without a redeploy.**

## ▶ NEXT ACTION — THE SAMPLE BATCH

🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — `SAMPLES` still empty.
**Scene count DECIDED 08-10: 4**, matching `SCENE_CAP` on Starter/Pro, so a sample is what the
customer actually buys. **~₱273 per ad, ~₱3,280 for all 12**; `npm run cost:estimate` is live.
First three: `real_talk`, `before_after`, `unboxing_asmr`; the landing hero comes from the same
batch. ⚠️ Kling pricing is still calibrated off one paid render.

**Gates after the 08-10 code trace — SIX left, not seven; full detail in the workflow doc.**
✅ 1-4 (08-09) · ✅ **10 was a duplicate of 4** · 🔶 **6 dial shipped, values pending you** ·
⬜ 5 (your jump-cut call) · ⬜ 7 [#92](https://github.com/yopiheart/grifon-command/issues/92) ·
⛔ 8 [#93](https://github.com/yopiheart/grifon-command/issues/93) TUNED ·
⚠️ **9 is NOT a caption bug** — now TUNED script compliance ·
⬜ 11 [#104](https://github.com/yopiheart/grifon-command/issues/104)+[#59](https://github.com/yopiheart/grifon-command/issues/59).

**Three filed root causes in a row were wrong on inspection** (#91, #94.2, **mine**). The aligner
never drops a word, and `scripts/check-alignment-numerals.mjs` proved it **VERBATIM** (`"₱149"` =
one token), so the fix you approved would have broken a working mapping. **Read before editing.**

## 🔴 WAITING ON YOU — these three unblock the rest

1. **Gate 6 values.** Dial is in (`hook.revealHoldSec`), every preset still 0.5 = zero visual
   change. Proposed **0.35** impact/hype, **0.7** clean, **0.5 frozen** classic — or ride it on
   the first pilot render and judge by eye.
2. **Gate 5 jump cut.** Cutting silence mid-scene makes the video jump. Accept the jump cut
   (fast, UGC-native) or require a cutaway? Nothing moves on gate 5 until this lands.
3. **The reassurance line.** CTA is fixed (`START MY FIRST AD — FREE`, Hero + ReceiptsRail), but
   `components/landing/microcopy.ts` still says *"Free plan · No card required · Upgrade anytime"*
   — a free plan EXISTS, never what it gives. Proposed: **`Free plan · No card · See it before
   you pay`** (turns the limit into the offer, and it is true). One file, three surfaces.

**Also open:** **PR #103** + **PR #102**, both unmerged. Rename `generateInfluencerAvatar`?
⚠️ The ERROR tier lives in `_template`, so the next funnel inherits it. Step 3's `SCRIPT_AUDIT`
panel still has no live eyeball. 📚 **CMO canon training PARKED** →
[`cmo_canon_training.md`](workflows/cmo_canon_training.md): Cialdini + Schwartz are already in
the skill, the real holes are **positioning**, **sales as a discipline**, and **no ledger of its
own**. **Resume by typing `/grill-me` yourself.**

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
credit only, valid one year. **The ₱900 break-even is dead**; for Paolo it is **₱4,900 per
1-load job**. **Geo is a coordinate radius**, lat `14.54` lng `121.02`. ⚠️ **The big names on the
client list are Enterprise** — procurement and referral, **not FB ads**. ⛔ **No CTAs on organic
cards** — all 78 in `assets/ad-swipe/` are paid ads.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · KM-004 hook2 · Kling b-roll · Gabriel's watermark ·
SEC Reg. No. · FB About · reviews · **AEM unverified**. ⏸ Daily posting paused.
**Grifon:** #89/#90 ride Slice B · `artifact-noir` Steps 1-4 · codex-sol lane still at 0 ·
`@v5` bump · `/viral-autopsy` on 3 Savic. **Remotion + Hyperframes closed.** Canvas promo done.

## ⛔ Gated · 🔧 Arm before starting

🔴 **GEMINI API VIDEO BUDGET IS EXHAUSTED.** Manual via Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ `gh` is not on PATH: `C:\Users\Administrator\AppData\Local\Programs\GitHubCLI\bin\gh.exe`
⚠️ `npx playwright install chromium` every session · each funnel has its own `node_modules` ·
**never pipe build output** · **the Bash tool is network-sandboxed, use PowerShell.**
⚠️ `scripts/check-alignment-numerals.mjs` **costs real ElevenLabs calls** — answer already
recorded in `format_sample_readiness.md`. Do not re-run casually.

### Maintain: **overwrite, never append.** Last step of any session that changed state. Max 90.
### Language: repo artifacts are ENGLISH (this file, commit subjects, workflow docs). Ads stay Taglish.
