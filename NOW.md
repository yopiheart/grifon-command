# NOW — the resume doc

**Stamped: 2026-08-07** (session 11)

## ▶ NEXT ACTION — MATUTO NG TOTOONG TAGLISH, GALING SA SOURCES

Utos ni Neil, session 9: *"its time for you to learn taglish na ginagamit ngayon
2026 na uso at popular na madaling intindihin… mag research at maghanap ng
sources. Ung tone nalang ung iaadjust mo depende sa brand voice / target market."*

Hindi pa nasisimulan. Blacklist lang ang meron
([`lint-voice.mjs`](funnels/oceanides-paolo/scripts/lint-voice.mjs)), at bawat
entry doon ay dinagdag pagkatapos mahuli ni Neil, kaya laging huli ng isang
insidente. Kailangan ng **positibong modelo** galing sa totoong Taglish ng 2026,
hindi mas mahabang listahan ng bawal. Tono na lang ang iaayos kada brand.

## 🔔 TAPOS SESSION 11 — di na mapapalampas ang pulang CI

Hindi detection failure ang 3 araw na pula (08-04 → 08-07) — agad naging pula ang
CI. **Reader** ang sira: ~20 magkaparehong email sa channel na natutong laktawan.
Bagong `main-status` job sa [`ci.yml`](.github/workflows/ci.yml): **isang** bukas
na `ci-red` issue lang habang pula ang main, kusang nagsasara pag green (push-to-
main lang, hindi PR). Binabasa ito ng **Health Watch v2** tuwing 08:00 PHT,
CRITICAL, **kasama kung ilang araw nang bukas** — yun ang di kayang laktawan.
Napatunayan sa totoong run ang green at **auto-close** path; ang aral na nagastos
ng isang pulang run ay nasa [`loops.md`](workflows/loops.md) Tier 0b.

### ⏳ ISA LANG ANG HINDI KO MAPAPATUNAYAN MAG-ISA
Pinaandar ko ang manual run ng Health Watch v2, **4:22 PM** (`last_fired_at`
08:22:34Z). **Desktop Routines UI, buksan ang 4:22 PM MANUAL** — di ang 3:04 PM
(luma yun, bago pa ang edit ko). May CI section ba, o *"CI status unavailable"*?
Kung unavailable, walang `gh` ang cloud env; ang palit ay ipasa ang CI state sa
committed file. **Di sya mag-a-assume ng green** kahit alin doon, kaya safe muna.
📱 **Walang Routines sa phone app** — ang push mismo ang buong deliverable doon.

**Galing sa Rauch / Vercel "Eve" brief — SARADO na, wag nang i-re-evaluate.** ~90%
nandito na (CLAUDE.md = `instructions.md`, 28 skills, `tools/`, WAT); ang channel
insight sa itaas lang ang totoong bago. Verdict + rejections:
[`post_beta_roadmap.md`](workflows/post_beta_roadmap.md) #27. Pang-7 na brief na
to at pare-pareho ang tinatanggihan (alisin daw ang human gate) — skim na lang.

## 🔴 Ang mali na 3x naulit (session 9)
**Maling bar, hindi maling gawa** ([`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md)).
Puro **bayad na ad** ang 78 sa `assets/ad-swipe/`, kaya may dalang axis ang corpus.
⛔ **Wag lagyan ng CTA ang organic cards** — kailangan muna ng organic corpus.

## 🅿 PAOLO — itayo, wag buksan
Buhay pa ang gate: **pangako pa lang, walang load na dumaan, walang certificate
na hawak.** Nakatayo ang page (`funnels/oceanides-paolo/`), green ang build,
**hindi naka-deploy, patay ang pixel**, may dalawang `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Sa
   parehong message:** sino ang na-issuehan na ni Boss Jay ng DENR certificate?
   Yun ang tanging totoong listahan ng bumibiling Paolo, at libre sya.
2. Punan ang dalawang `⟦PENDING⟧`, tapos deploy → env var (kamay ni Neil) →
   **redeploy**, kundi walang epekto ang env.
3. Dalawang alok, naka-preselect ang mas mahal. Presyo muna sa facility.
4. Checkout. ⏳ PayMongo keys ng Oceanides. ⛔ Hindi ang key ng Grifon.
5. Bagong creative at targeting. ⏳ Aling siyudad ang una, isa lang.

**Nagawa na, wag ulitin:** avatar, value stack, grill, pixel-leak, copy, page,
trust card (`paolo-trust-a/b`, di pa nai-publish, 82 ang numero ng critic).
## 🔴 Huwag kalimutan
1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at
   referral, **hindi FB ad.** Pinakamalaking hula pa rin ng plano.

## 🅿 PARKED at 🔧 bukas na maliliit
**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · **AEM di pa verified**.
⏸ Naka-pause ang daily; pambalik = alisin ang comment sa `schedule:`.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED
· `artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane, di pa masusukat ang gate.
**Maliliit:** bump `@v5` ang `checkout`/`setup-node` (naka-Node 20 pa sila).

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Di napupunta sa PATH ang `gh` — buong path: `…\Programs\GitHubCLI\bin\gh.exe`.
⚠️ `npx playwright install chromium` — kinakain ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
