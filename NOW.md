# NOW — the resume doc

**Stamped: 2026-08-08** (session 14)

## ▶ SARADO NA ANG PINTUAN NG `grifon.ai`. BUHAY ANG LOCK.

Live 08-08, patunay sa `events`: `launch_gate_redeem`=`FOUNDER-01`, `launch_gate_reject`=`ASDASD`.
Tatlong code: **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**. Ipadala bilang link,
`grifon.ai/i/FOUNDER-01` — kusang bumubukas, binubura ang code sa address bar. **Isa kada tao**
para may tala kung sino ang pumasok: `select ts, event, meta->>'code' from events where
module='launch_gate' order by ts desc;` (waitlist: `funnel_leads`, `funnel_id='grifon-launch-waitlist'`).

Pang-bawi ng isang code: alisin sa `LAUNCH_INVITE_CODES`, **redeploy**. Pang-patay ng buong lock:
alisin ang `VITE_LAUNCH_LOCK`, **redeploy**. Walang epekto ang pag-save kung walang redeploy.
Sa **pintuan lang** (`login`/`app`/`checkout`), bukas pa rin ang buong marketing site.
May pass ka na, 6 na buwan (`grifon_launch_pass_v1`) — **incognito** kung titingnan ulit ang lock.

## ▶ NEXT ACTION — DALAWANG MAY DEADLINE

1. 🔴 **Node 20 pa ang Vercel runtime.** Fail ang builds simula **Oct 1, 2026**. Node 24 na ang
   `engines` at lahat ng CI, Vercel lang ang naiwan (range ang `">=24"`, hindi namamap, kaya
   nanalo ang default). Dialog → Upgrade → redeploy. Bantayan ang `api/render/final.ts` +
   `api/voice/consolidate.ts`, sila lang ang may `ffmpeg-static`.
2. 🔴 **FREE ang Supabase, tapos na ang grace period.** *"…will not be able to serve requests
   when you use up your quota."* Pag naubos, patay ang auth at buong app, hindi lang ang lock.

**Di pa merged:** **PR #103** `fix/voice-lint-particle-surface` (34 babala → 0, ERROR tier na ang
KONYO/PARTICLE/MAHABA) · **PR #102** `feat/script-audit-domain-lint` (`utils/scriptAudit.ts` +
`npm run check:domain`, 7 hit). Merged na ang wallpaper branch (08-09).
**Dalawang desisyon mo:** (1) papalitan ba ang pangalan ng `generateInfluencerAvatar`? Export yun
ng `geminiService`, hindi ko ginalaw, 6 sa 7 hit ng domain lint ay dito. (2) ⚠️ Nasa `_template`
ang ERROR tier, kaya **ganun na rin ang lahat ng susunod na funnel.**

⚠️ **Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel** — kailangan ng totoong script gen
para marating ang review mode. Text budget lang yun, hindi video.

## 🅿 PAOLO — itayo, wag buksan   ← dito ang totoong pera

Pangako pa lang: **walang load na dumaan, walang certificate na hawak.** Nakatayo ang page
(`funnels/oceanides-paolo/`), green ang build, **hindi naka-deploy, patay ang pixel**, 2 `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Sa parehong
   message:** sino ang na-issuehan na ni Boss Jay ng DENR certificate? Yun ang tanging totoong
   listahan ng bumibiling Paolo, at libre sya.
2. Punan ang `⟦PENDING⟧`, deploy → env var (kamay ni Neil) → **redeploy**, kundi walang epekto.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout: ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar, value stack, grill, pixel-leak, copy, page, trust card
(`paolo-trust-a/b`, di pa nai-publish, 82 ang critic).

## 🔴 IBANG REGISTER ANG CHAT KAY NEIL

Sa **customer copy**, iwasan ang English jargon. Sa **chat kay Neil, English ang technical terms**
— hook, retention, frame, syllable, build, lint. Mas mataas ang English, magaan ang Tagalog
(pandikit lang: yung, kaso, pero, kasi). **Walang formulang naglo-lock** sa ads (ledger **A6**).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at referral, **hindi FB ad.**
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa `assets/ad-swipe/`.
7. 🔧 **Tingnan ang EXIT CODE, wag lang i-grep ang output.**
8. 🔧 **Wag `git add -A` habang may smoke agent** — nasama ang throwaway script nya (08-08).

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · hook2 ng KM-004 · Kling b-roll · watermark ni Gabriel ·
SEC Reg. No. · FB About · reviews · **AEM di pa verified**. ⏸ Pause ang daily.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED ·
`artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · bump `@v5` ang `checkout`/`setup-node` ·
**sarado ang Rauch brief** (roadmap #27, wag i-re-evaluate).

## ⛔ Gated · 🔧 Arm before starting

🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Di napupunta sa PATH ang `gh` — buong path:
`C:\Users\Administrator\AppData\Local\Programs\GitHubCLI\bin\gh.exe` (patunay 08-08, gana).
⚠️ `npx playwright install chromium` — kinakain ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that changed the
work. Verifier fails past 90 lines.
