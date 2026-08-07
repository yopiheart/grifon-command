# NOW — the resume doc

**Stamped: 2026-08-08** (session 12)

## ▶ NEXT ACTION — I-REVIEW AT I-MERGE ANG DALAWANG PR

✅ Tapos na ang 34 babala. Nabasa, nahusgahan, naayos: **34 → 0.**
✅ ERROR tier na ang KONYO, PARTICLE at MAHABA — sa `_template` at sa dalawang funnel.

- **PR #103** `fix/voice-lint-particle-surface`. Apat na hakbang: surface-level ang legal
  exemption (−7) · mabigat na **UGAT** ang target ng MAHABA, hindi mahabang affix (−10) ·
  IMPERATIVE + terms micro-copy (−7) · `// voice-ok: <dahilan>` escape hatch (−6) · saka
  ang apat na totoong patay na linya. Beripikado na **totoong bumabagsak** ang bagong tier.
- **PR #102** `feat/script-audit-domain-lint`. Dalawang deterministic checker: na-check na
  rin ang output ng AI (`utils/scriptAudit.ts` — advisory, hindi humaharang), at na-check
  na ang glossary (`npm run check:domain`, 7 hit, WARNING tier).

**Dalawang desisyon mo:**
1. Papalitan ba ang pangalan ng `generateInfluencerAvatar`? Export yun ng `geminiService`,
   kaya hindi ko ginalaw. 6 sa 7 hit ng domain lint ay dito.
2. ⚠️ Nasa `_template` ang ERROR tier, kaya **ganun na rin ang lahat ng susunod na funnel.**
   Pagbalik sa babala: isang linya, ibalik ang `&& warns.length === 0`.

⚠️ **Wala pang live eyeball ang Step 3 `SCRIPT_AUDIT` panel** — kailangan ng totoong script
generation para marating ang review mode. Text budget lang yun, hindi video, kaya kaya pa.

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
Tagalog (pandikit lang: yung, kaso, pero, kasi). Register ng Gemini / Director AI at GPT ang
target. **Walang formulang naglo-lock** sa ads — rotation, depende sa market (ledger **A6**).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at referral,
   **hindi FB ad.** Pinakamalaking hula pa rin ng plano.
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa `assets/ad-swipe/`,
   kaya may dalang axis ang corpus. Kailangan ng organic corpus.
7. 🔧 **Tingnan ang EXIT CODE, wag lang i-grep ang output.** Nakaligtaan ko ang isang
   ERROR sa paolo dahil dito (08-08). Sarili kong `voice-ok` comment pala ang may em dash.

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
