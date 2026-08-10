# NOW — the resume doc

**Stamped: 2026-08-10** (session 16)

## ▶ THE `grifon.ai` DOOR IS SHUT. THE LOCK IS LIVE.

Live 08-08. Codes: **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`** — send as a link
(`grifon.ai/i/FOUNDER-01`); it redeems on arrival and scrubs itself from the address bar.
**One per person**: `select ts,event,meta->>'code' from events where module='launch_gate' order by ts desc;`
(waitlist: `funnel_leads`). Revoke: drop it from `LAUNCH_INVITE_CODES`. Kill the lock: drop
`VITE_LAUNCH_LOCK`. **Neither does anything without a redeploy.** It gates the door only. Use
**incognito** to view it again — you already hold a 6-month pass.

## ▶ NEXT ACTION — THE SAMPLE BATCH

🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — 11 quality gates + 12
recipes, `SAMPLES` still empty. **Clear gates 5-11 before the batch**, because every hole in them
gets bought 12 times over. First three: `real_talk`, `before_after`, `unboxing_asmr`. The landing
hero comes from the same batch. (✅ 08-09: lead-in trim TTS · STS video cut · hook hold 1.0→0.5 ·
doubled line. Dead time `3.44s → 1.73s`.)

💰 **Corrected 08-10. NOT ₱6,600.** The old ₱550 came from a **9-scene** admin smoke, but
`SCENE_CAP` is **4** on Starter/Pro (6 on Business). Real: **~₱273 per ad, ~₱3,280 for all 12.**
**`npm run cost:estimate`** is the number — it reads live `routeModel`/`SCENE_CAP`, so it tracks
the code on its own. Open: (1) **how many scenes should a sample be?** 4 matches what a customer
actually buys. (2) **Kling pricing is unverified**, calibrated off a single paid render.
⚠️ `pricing_unit_economics.md` §2 has drifted (assumes Veo Fast @1080p; reality is 720p + Kling) —
a warning is in place. And **`pickSceneDuration()` rounds cinematic up to 10s** (asks for 6, Kling
offers `[5,10]`), so we pay double for footage we then trim. Your call, sits next to tuned routing.

🔴 **NEW BLOCKER — "FIRST AD FREE" contradicts itself.** The landing
(`components/landing/sections/Hero.tsx:75`) says `CREATE MY FIRST AD — FREE`, but
`free.video_ads = 0` in `utils/planGate.ts:19` — **the Free tier has no video.** This is live on
the site right now. **Decide which one is true before any paid ad runs.**

**Not merged:** **PR #103** `fix/voice-lint-particle-surface` (34 warnings → 0; KONYO/PARTICLE/MAHABA
→ ERROR tier) · **PR #102** `feat/script-audit-domain-lint` (`npm run check:domain`, 7 hits).
**Two decisions:** (1) rename `generateInfluencerAvatar`? A `geminiService` export, 6 of the 7
domain-lint hits. (2) ⚠️ The ERROR tier lives in `_template`, **so the next funnel inherits it.**
⚠️ Step 3's `SCRIPT_AUDIT` panel has no live eyeball yet.

🎬 **Canvas promo: done + merged 08-10** (`workflows/assets/grifon-promo-canvas/`, 20s, ₱0).
**Hyperframes is still the production lane**; this is the fallback for when it cannot be restored.
Lessons and copy decisions are in its README.

## 🅿 PAOLO — build it, do not open it   ← this is where the real money is

Promise only so far: **no load has run, no certificate in hand.** The page stands
(`funnels/oceanides-paolo/`), build is green, **not deployed, pixel off**, 2 `⟦PENDING⟧` left.

1. 🔴 **CALL THE FACILITY SUPERVISOR** — they block everything else
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **In the same
   message:** who has Boss Jay already issued a DENR certificate to? That is the only real list of
   paying Paolo buyers, and it costs nothing.
2. Fill the `⟦PENDING⟧`, deploy → env var (Neil's hands) → **redeploy**, or it has no effect.
3. Two offers, the pricier one preselected. Facility pricing first.
4. Checkout: ⏳ Oceanides' own PayMongo keys. ⛔ Never Grifon's key.
5. New creative and targeting. ⏳ Which city goes first — pick one.

**Already done, do not redo:** avatar, value stack, grill, pixel-leak, copy, page, trust card
(`paolo-trust-a/b`, unpublished, critic scored 82).

## 🔴 Do not forget

1. **Route density is the lever, not price.** One city first.
2. **No CASH refunds** on the tripwire. Credit only, valid one year.
3. **The ₱900 break-even is dead.** For Paolo: **₱4,900 per 1-load job**.
4. **Geo is a coordinate radius**, lat `14.54` lng `121.02`.
5. ⚠️ **The big names on the client list are Enterprise** — procurement and referral, **not FB ads.**
6. ⛔ **No CTAs on organic cards** — all 78 in `assets/ad-swipe/` are paid ads.

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · KM-004 hook2 · Kling b-roll · Gabriel's watermark ·
SEC Reg. No. · FB About · reviews · **AEM unverified**. ⏸ Daily posting paused.
**Grifon:** #94.2/#94.3 · #92+#89/#90 ride Slice B · #93 ⛔ TUNED · **#104+#59 hook starvation** ·
`artifact-noir` Steps 1-4 · codex-sol lane still at 0 · `@v5` bump · **Rauch brief closed** ·
`/viral-autopsy` on 3 Savic. **Remotion: closed, 2× (roadmap §10 + hyperframes_decision).**

## ⛔ Gated · 🔧 Arm before starting

🔴 **GEMINI API VIDEO BUDGET IS EXHAUSTED.** Manual via Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ `gh` is not on PATH: `C:\Users\Administrator\AppData\Local\Programs\GitHubCLI\bin\gh.exe`
⚠️ `npx playwright install chromium` every session · each funnel has its own `node_modules` ·
**never pipe build output** · **the Bash tool is network-sandboxed, use PowerShell.**

### Maintain: **overwrite, never append.** Last step of any session that changed state. Max 90.
### Language: repo artifacts are ENGLISH (this file, commit subjects, workflow docs). Ads stay Taglish.
