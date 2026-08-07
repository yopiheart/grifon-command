# NOW — the resume doc

**Stamped: 2026-08-07** (session 11)

## ▶ NEXT ACTION — BASAHIN NI NEIL ANG 34 BABALA, TAPOS SAKA I-PROMOTE

✅ Tapos ang research → [`taglish_2026_model.md`](workflows/taglish_2026_model.md) ·
✅ Tapos ang lint (3 class rule, WARNING tier) · ✅ Tapos ang drift gate.

Tenga mo na ang natira. Babala lang ang tatlong class rule, at ganun ang panuntunan:
walang nagiging ERROR hangga't di mo nababasa ang totoong hits. Tingnan sa alinmang
funnel dir: `node scripts/lint-voice.mjs`.

- **KONYO: 0 hit** sa dalawa. Malinis ang na-review mong copy, at di nag-iingay.
- **PARTICLE: 24** · **MAHABA: 10.** Husgahan mo kung alin ang tama, ako na ang
  mag-a-adjust o magpo-promote sa ERROR.
- 🔴 **Isang desisyon:** `24 oras` → `24 hours` ang ginawa ng timeline rule mo. Pero
  **idyoma yun** (`24 Oras` sa GMA), hindi tagal. Carve-out ba para sa `24 oras`?

## 🔴 14 na ERROR sa LIVE na price-page, ayos na
53 rule lang ang kopya nya, 64 kay Paolo: **wala doon ang buong `KLASE, HINDI SALITA`
block** kasama ang `15 days` rule na sinigawan mo. Nahuli: `24 oras`, `30 araw`,
`sa iyo` ×7, `2 oras` ×5. Ayos na sa source; **di gagalaw ang live site** hangga't di
ka nagde-deploy (CLI, di git-connected). Bagong gate sa CI: `npm run check:voice-sync`.

## 🧠 Ang pinakamalaking natuklasan sa research
**May pangalan ang kalaban: Konyo.** English ang balangkas, Tagalog ang isinasabog,
hugis ng lahat ng "Bad" sa voice spec. May **test** imbes na listahan: *alisin ang
English, may Tagalog bang balangkas na natira?* Wala = Konyo. **Hindi lang panlasa**
(Neil): English ang dominante doon, kaya pwedeng mag-American accent ang Filipino
avatar sa Veo/TTS dahil sa ACCENT LOCK. Render bug, hindi lang register.

## 🔔 TAPOS DIN SESSION 11 — di na mapapalampas ang pulang CI
Reader ang sira ng 3-araw na pula, hindi detection: ~20 magkaparehong email sa
channel na natutong laktawan. Bagong `main-status` job sa
[`ci.yml`](.github/workflows/ci.yml): isang bukas na `ci-red` issue lang habang pula
ang main, kusang nagsasara pag green. Binabasa ito ng **Health Watch v2** tuwing
08:00 PHT, CRITICAL, kasama kung ilang araw nang bukas. Napatunayan sa live run ang
green at auto-close. **Kumpirmado rin ang CI read**, pero **walang `gh` sa cloud env**
— GitHub MCP tools pala ang daan. 📱 **Walang Routines sa phone**, kaya ang push mismo
ang buong deliverable. [`loops.md`](workflows/loops.md) Tier 0b + 6.

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
**Oceanides:** Week 02 pack · GB-001 · hook2 ng KM-004 · Kling b-roll · watermark ni
Gabriel · SEC Reg. No. · FB About · reviews · **AEM di pa verified**. ⏸ Pause ang daily.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED ·
`artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane · bump `@v5` ang
`checkout`/`setup-node`. **Sarado ang Rauch brief** (roadmap #27, wag i-re-evaluate).

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ Di napupunta sa PATH ang `gh` — buong path: `…\Programs\GitHubCLI\bin\gh.exe`.
⚠️ `npx playwright install chromium` — kinakain ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
