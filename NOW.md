# NOW — the resume doc

**Stamped: 2026-08-08** (session 13)

## ▶ NEXT ACTION — NASA MAIN NA ANG LOCK, PATAY. IKAW NA ANG SUSI.

**Merged na** ang `claude/grifon-lock-design-9pptxl` (08-08, ff, anim na CI gate pasado
locally bago i-push). **Walang nagbago sa `grifon.ai`** — dark ang lock hangga't walang env.

**Para buksan:** Vercel → Environment Variables → `VITE_LAUNCH_LOCK=true` **at**
`LAUNCH_INVITE_CODES=FOUNDER-01,...` (Production scope) → **REDEPLOY**. Pag-save lang =
walang epekto, build-time kasi ang flag. Pang-patay: alisin ang una, redeploy ulit.

Sa **pintuan lang** (`login` / `app` / `checkout`) — bukas pa rin ang buong marketing site,
gumagana lahat ng CTA, sa lock lang dadaong. Dalawang daanan: **access code** (server-side
ang match, 0 hit sa `dist/`) at **waitlist** (`funnel_leads`, totoong pwesto sa pila). Invite
link: `grifon.ai/i/FOUNDER-01`, kusang bumubukas, hindi tinatangay ang `utm_*`.
⚠️ **Hindi diretso sa lock ang hero CTA** — may "Anong business mo?" modal muna.

**Di pa merged:** **PR #103** `fix/voice-lint-particle-surface` (34 babala → 0, ERROR tier na
ang KONYO/PARTICLE/MAHABA) at **PR #102** `feat/script-audit-domain-lint`
(`utils/scriptAudit.ts` advisory + `npm run check:domain`, 7 hit).

**Dalawang desisyon mo, buhay pa:**
1. Papalitan ba ang pangalan ng `generateInfluencerAvatar`? Export yun ng `geminiService`,
   kaya hindi ko ginalaw. 6 sa 7 hit ng domain lint ay dito.
2. ⚠️ Nasa `_template` ang ERROR tier, kaya **ganun na rin ang lahat ng susunod na funnel.**

⚠️ **Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel** — kailangan ng totoong script
generation para marating ang review mode. Text budget lang yun, hindi video.

## 🅿 PAOLO — itayo, wag buksan   ← dito ang totoong pera

Buhay pa ang gate: **pangako pa lang, walang load na dumaan, walang certificate na hawak.**
Nakatayo ang page (`funnels/oceanides-paolo/`), green ang build, **hindi naka-deploy, patay
ang pixel**, may dalawang `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Sa parehong
   message:** sino ang na-issuehan na ni Boss Jay ng DENR certificate? Yun ang tanging
   totoong listahan ng bumibiling Paolo, at libre sya.
2. Punan ang dalawang `⟦PENDING⟧`, tapos deploy → env var (kamay ni Neil) → **redeploy**,
   kundi walang epekto ang env.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout. ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar, value stack, grill, pixel-leak, copy, page, trust card
(`paolo-trust-a/b`, di pa nai-publish, 82 ang numero ng critic).

## 🔴 IBANG REGISTER ANG CHAT KAY NEIL

Sa **customer copy**, iwasan ang English jargon. Sa **chat kay Neil, English ang technical
terms** — hook, retention, frame, syllable, build, lint. Mas mataas ang English, magaan ang
Tagalog (pandikit lang: yung, kaso, pero, kasi). **Walang formulang naglo-lock** sa ads —
rotation, depende sa market (ledger **A6**).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at referral,
   **hindi FB ad.** Pinakamalaking hula pa rin ng plano.
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa `assets/ad-swipe/`.
   🔧 **Tingnan ang EXIT CODE, wag lang i-grep ang output.**
8. 🔧 **Wag `git add -A` habang may smoke agent** — nasama ang throwaway script nya (08-08).

## 🅿 PARKED

**Oceanides:** Week 02 pack · GB-001 · hook2 ng KM-004 · Kling b-roll · watermark ni
Gabriel · SEC Reg. No. · FB About · reviews · **AEM di pa verified**. ⏸ Pause ang daily.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED ·
`artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · bump `@v5` ang `checkout`/`setup-node`.
**Sarado ang Rauch brief** (roadmap #27, wag i-re-evaluate).

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
