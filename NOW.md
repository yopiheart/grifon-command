# NOW — the resume doc

**Stamped: 2026-08-07** (session 10)

## ▶ NEXT ACTION — MATUTO NG TOTOONG TAGLISH, GALING SA SOURCES

Utos ni Neil, session 9: *"its time for you to learn taglish na ginagamit ngayon
2026 na uso at popular na madaling intindihin… mag research at maghanap ng
sources. Ung tone nalang ung iaadjust mo depende sa brand voice / target market."*

Hindi pa nasisimulan. Blacklist lang ang meron
([`lint-voice.mjs`](funnels/oceanides-paolo/scripts/lint-voice.mjs)), at bawat
entry doon ay dinagdag pagkatapos mahuli ni Neil, kaya laging huli ng isang
insidente. Kailangan ng **positibong modelo** galing sa totoong Taglish ng 2026,
hindi mas mahabang listahan ng bawal. Tono na lang ang iaayos kada brand.

## ✅ Tapos ngayong 2026-08-07 (session 10) — docs lang, walang app code
Ramp agent-engineering brief, sinukat sa codebase. ~70% nandyan na.

1. **Record sa [`post_beta_roadmap.md`](workflows/post_beta_roadmap.md) #27** —
   bagong parked item: **AI SRE** (agent na nagbabasa ng production incident,
   nag-diagnose, nagbubukas ng issue). Handa na ang lahat ng kailangan nya, wala
   lang users. Trigger: unang bayad na cohort. ⛔ Wag i-re-evaluate ang brief na to.
2. **Rule 9 sa [`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md)** —
   dalawang round na sinunod ang sabi ng critic at hindi gumalaw ang score = STOP.
   Basahin ang trace, wag mag-round tatlo. Yan mismo ang 82 · 82 · 82/83 ng session 9.
3. **36 handoff docs → [`workflows/archive/`](workflows/archive/README.md)**, may
   nakasulat nang panuntunan para di na muling magtambak. 262 link na-check, 4
   lang ang sira at binurang code naman ang tinuturo.

⚠️ Pangatlong beses nang dumating ang *"wag mong bilangin ang token"* (Kun Chen,
OpenAI Dev Day, Ramp). Nasa #27 na kung bakit di sya bagay dito. Tapos na.
🔴 **Health Watch push: di pa kumpirmado mula 2026-07-19** — araw-araw tumatakbo,
walang nakumpirmang nagbabasa. Step 1 ng #27, minuto lang.

## 🔴 Ang mali na tatlong beses naulit noong session 9

**Maling bar, hindi maling gawa.** Buong kwento nasa
[`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md).
**May dalang axis ang corpus mismo:** puro **bayad na ad** ang 78 sa
`assets/ad-swipe/`, kaya bar ng ad ang kahit anong kunin doon.
⛔ **Wag lagyan ng CTA ang organic cards.** Kailangan muna ng hiwalay na organic
corpus. Wala pa tayo nun.

## 🅿 PAOLO — itayo, wag buksan

Buhay pa ang gate: **pangako pa lang, walang load na dumaan, walang certificate
na hawak.** Nakatayo ang page (`funnels/oceanides-paolo/`), green ang build,
**hindi naka-deploy, patay ang pixel**, may dalawang `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat.
   [`facility-call-script.md`](clients/oceanides/facility-call-script.md).
1b. 🔴 **Sa parehong message:** sino ang mga na-issuehan na ni Boss Jay ng DENR
   certificate? Yun ang tanging totoong listahan ng bumibiling Paolo, at libre sya.
2. Punan ang dalawang `⟦PENDING⟧`, tapos deploy → env var (kamay ni Neil) →
   **redeploy**, kundi walang epekto ang env.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout. ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar ni Paolo, value stack, grill, pixel-leak, copy,
page, trust card (`paolo-trust-a/b`, **hindi pa nai-publish** — numero ng critic
ang 82, hindi resulta sa merkado).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — galing sa procurement
   at referral, **hindi sa FB ad.** Pinakamalaking hula pa rin ng plano.

## 🅿 PARKED
**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · **AEM Configure Web
Events hindi pa na-verify**.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED
· `artifact-noir` Steps 1-4 · 0 pa rin ang codex-sol lane, di pa masusukat ang gate.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ `npx playwright install chromium` — kinakain sya ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
