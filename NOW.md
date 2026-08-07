# NOW — the resume doc

**Stamped: 2026-08-07** (session 11)

## ▶ NEXT ACTION — GAWING LINT ANG MODEL (class rules, warning muna)

✅ **Tapos na ang Taglish research** (utos ni Neil, session 9) →
[`taglish_2026_model.md`](workflows/taglish_2026_model.md), may sources.

Ang natitira ay gawing **gate** ang model. Blacklist pa rin ang
[`lint-voice.mjs`](funnels/oceanides-paolo/scripts/lint-voice.mjs) at laging huli
ng isang insidente. Tatlong **class** rule ang nakaspec na sa §8 ng model:

1. **Konyo detector** — `ang \w+ (is|are|was)`, `(the|my|your) \w+ ay`, `mas better`,
   `make` + Tagalog root. Ito ang pinaka-malinis, mekanikal talaga.
2. **Kulang sa particle** — mahabang Tagalog na linya na walang `naman/lang/na/kasi`.
3. **Malalim na verb** — 4+ pantig na `-in`/`-han`/`-an` na may katumbas sa affix machine.

⚠️ **Warning muna, hindi failure.** Pwedeng mag-false-positive ang tatlo, at ang
maingay na gate ay hindi na binabasa — parehong sakit ng Tier 0b. Kapag tama na
sila sa totoong copy, saka gawing failure. Tenga pa rin ni Neil ang huling gate.

## 🧠 Ang pinakamalaking natuklasan sa research
**May pangalan na ang kalaban: Konyo.** English ang balangkas, Tagalog ang isinasabog
— eksaktong hugis ng lahat ng "Bad" na halimbawa sa voice spec. At may **test** na
imbes na listahan: *alisin ang lahat ng English. May natitira bang Tagalog na
balangkas?* Wala = Konyo, ayusin ang frame, wag magpalit ng salita. Humuhuli ito ng
pangungusap na hindi pa naisusulat ninuman. **Kumpirmado rin ng linguistics ang rule
#1 ni Neil** (Tagalog ang frame) at ang STEP 0a table nya (surface ang magdidikta).

## 🔔 TAPOS DIN SESSION 11 — di na mapapalampas ang pulang CI
Hindi detection failure ang 3 araw na pula (08-04 → 08-07) — agad naging pula ang
CI. **Reader** ang sira: ~20 magkaparehong email sa channel na natutong laktawan.
Bagong `main-status` job sa [`ci.yml`](.github/workflows/ci.yml): **isang** bukas na
`ci-red` issue lang habang pula ang main, kusang nagsasara pag green. Binabasa ito
ng **Health Watch v2** tuwing 08:00 PHT, CRITICAL, **kasama kung ilang araw nang
bukas**. Napatunayan sa live run ang green at auto-close path.
**Kumpirmado rin ang CI read** (4:22 PM run): gumana, pero **walang `gh` sa cloud
env** — GitHub MCP tools pala ang daan, nakasulat na sa prompt. 📱 **Walang Routines
sa phone app**, kaya ang push mismo ang buong deliverable. [`loops.md`](workflows/loops.md) Tier 0b + 6.

## 🅿 PAOLO — itayo, wag buksan
Buhay pa ang gate: **pangako pa lang, walang load na dumaan, walang certificate na
hawak.** Nakatayo ang page (`funnels/oceanides-paolo/`), green ang build, **hindi
naka-deploy, patay ang pixel**, may dalawang `⟦PENDING⟧`.

1. 🔴 **TAWAGAN ANG SUPERVISOR NG FACILITY** — sya ang bara sa lahat
   ([`facility-call-script.md`](clients/oceanides/facility-call-script.md)). **Sa
   parehong message:** sino ang na-issuehan na ni Boss Jay ng DENR certificate? Yun
   ang tanging totoong listahan ng bumibiling Paolo, at libre sya.
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
6. ⛔ **Bawal ang CTA sa organic cards** — puro bayad na ad ang 78 sa
   `assets/ad-swipe/`, kaya may dalang axis ang corpus. Kailangan ng organic corpus.

## 🅿 PARKED
**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · **AEM di pa verified**.
⏸ Naka-pause ang daily; pambalik = alisin ang comment sa `schedule:`.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED ·
`artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · bump `@v5` ang
`checkout`/`setup-node`. **Sarado na ang Rauch brief** (roadmap #27, wag i-re-evaluate).

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Di napupunta sa PATH ang `gh` — buong path: `…\Programs\GitHubCLI\bin\gh.exe`.
⚠️ `npx playwright install chromium` — kinakain ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
