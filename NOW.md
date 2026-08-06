# NOW — the resume doc

**Stamped: 2026-08-06** (session 9)

## ▶ NEXT ACTION — MATUTO NG TOTOONG TAGLISH, GALING SA SOURCES

Utos ni Neil sa dulo ng session 9: *"its time for you to learn taglish na
ginagamit ngayon 2026 na uso at popular na madaling intindihin. Siguro kailangan
mong mag research at maghanap ng sources para matuto ka mag taglish. Ung tone
nalang ung iaadjust mo depende sa brand voice / target market fit."*

Hindi pa sya nasisimulan. **Blacklist ang meron tayo ngayon**
([`lint-voice.mjs`](funnels/oceanides-paolo/scripts/lint-voice.mjs)), at bawat
entry doon ay idinagdag pagkatapos mahuli ni Neil. Bago ang slop kada beses, kaya
laging huli ng isang insidente ang blacklist. Ang kailangan ay **positibong
modelo** galing sa totoong Taglish ng 2026, hindi mas mahabang listahan ng bawal.
Tapos tono na lang ang iaayos kada brand.

## 🔴 ANG MALI NA TATLONG BESES NANG NAULIT NGAYONG SESSION

**Maling bar, hindi maling gawa.** Tatlong beses, iisang hugis:

1. Sinukat ang organic cards sa **attention** gayong **conversion** ang bara.
2. Sinabing "hindi problema ang creative natin" mula sa **5 ad na sample** na
   walang kahit isang brand na nagbebenta sa tiwala. Totoong bar: **82**, hindi 68.
3. 🆕 Kumuha ng inspiration sa `assets/ad-swipe/` at ipinatong sa **organic
   cards**. Sabi ni Neil: *"kaya ang nangyayari para kang nagbebenta sa pag
   popost ng organic."*

**Ang bagong panuntunan: may dalang axis ang corpus mismo.** Puro **bayad na ad**
ang 78 na nasa `assets/ad-swipe/`. Kahit anong bar na kunin doon ay bar ng ad.
⛔ **Wag lagyan ng CTA ang organic cards** — hindi yun ang trabaho nila.
Nagbebenta si Fibo Lim / Brunson / Hormozi **sa loob ng** value content, hindi sa
pamamagitan ng pagdikit ng button. **Kailangan ng hiwalay na organic corpus**
bago pa masukat ang organic. Wala pa tayo nun.

## ✅ Tapos ngayong 2026-08-06 (session 9)

**Gauntlet build run** ([`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md)):
Paolo trust card **63/68 → 82**, `strong`, tabla sa Stripe. Isang bagay lang ang
gumawa nun — **receipts strip** (totoong DENR na numero) + tapat na disclaimer.
Dalawang magkaibang hook: 82 at 82. **Walang naiambag ang hook.**

🆕 **Bagong failure mode:** hypothesis lang ang `biggest_gap`, hindi sanhi.
Inayos nang eksakto ang pinangalanan nito, tatlong round, **hindi gumalaw ang
score** (82 → 82 → 82/83). Bagong reklamo lang sa parehong numero. Inayos ng
rubric scorer ang position bias, **hindi ang confabulation.**

**Voice fix, 74 hit sa 5 file:** `15 araw`→`15 days` (38) · `48 oras`→`48 hours`
(20) · `3 buwan`→`3 months` (10) · `30 araw`→`30 days` (5) ·
`dokumentasyon`→`papel` · `sa yo`/`sa iyo`→`sayo` (23). **Klase ang idinagdag sa
linter, hindi salita.** Tatlo pa ang nahuli nito na hindi ko naabot ng kamay.
⚠️ **Bukas pa: `isang taon`** (6 hit). Sagot ni Neil ang hinihintay.

**Na-merge sa `main`** ang 47-commit na branch. Walang app code, green ang root
build at ang funnel build.

## 🅿 PAOLO — itayo, wag buksan

Buhay pa rin ang gate: **pangako pa lang, walang load na dumaan, walang
certificate na hawak.** Sarado lang sya kapag may isang load na diretsong
binayaran ni Neil sa facility **at** may hawak nang certificate.

Nakatayo ang page (`funnels/oceanides-paolo/`), green ang build, **hindi
naka-deploy, patay ang pixel**, may dalawang `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang humaharang sa lahat.
   [`facility-call-script.md`](clients/oceanides/facility-call-script.md).
1b. 🔴 **Sa parehong message:** sino ang mga na-issuehan na ni Boss Jay ng DENR
   certificate? Yun ang tanging totoong listahan ng bumibiling Paolo, at libre sya.
2. Punan ang dalawang `⟦PENDING⟧`, tapos deploy → env var (kamay ni Neil) →
   **redeploy**, kundi walang epekto ang env.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout. ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar ni Paolo, value stack, grill, pixel-leak, copy,
page, at ang trust card (`paolo-trust-a-urgency.png`, `paolo-trust-b-admit.png`,
**hindi pa nai-publish** — numero ng critic ang 82, hindi resulta sa merkado).

## 🔴 Huwag kalimutan

1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list.** Galing sa procurement
   at referral, **hindi sa Facebook ad.** Pinakamalaking hula pa rin ng plano.

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
