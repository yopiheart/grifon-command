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

## 🔴 TATLONG ARAW NA PULA ANG CI — ayos na (2026-08-07)
**Hindi utang sa Gemini.** Node 24 / npm 11 ang cafe PC, Node 20 / npm 10 ang CI,
magkaiba ang isinusulat nilang lockfile — kaya namatay ang lahat ng workflow sa
`npm ci` bago pa umabot sa API call. Node 24 na rin ang CI + naka-pin ang
`engines`. ✅ Green sa `0a7c7a7`. Kwento + panuntunan:
[`loops.md`](workflows/loops.md) Tier 0b.
⏸ **Naka-pause ang Oceanides daily** (hiling ni Neil, kumpirmado sa Routines UI).
⚠️ Pero **huminto na pala ito noong Aug 4** dahil sa lockfile, bago pa ang pause —
**tingnan ang mirror** bago akalaing sinadya ang gap. Pambalik: alisin ang comment
sa `schedule:`. (Tier 3b)

## ✅ Tapos din ngayong 2026-08-07 (session 10) — Ramp brief, ~70% nandyan na
[`post_beta_roadmap.md`](workflows/post_beta_roadmap.md) **#27** = record + parked
na **AI SRE** (⛔ wag i-re-evaluate) · **rule 9** sa
[`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md) = di gumalaw ang
score sa dalawang round → basahin ang trace · **36 handoff docs → [`archive/`](workflows/archive/README.md)**, link 29 → 5.

✅ **Health Watch: KUMPIRMADO** — umaabot ang push, at may nahuli agad. **Sarado
na ang leak:** SECURITY DEFINER views (`run_cogs`, `run_attribution_anomalies`)
na lumalampas sa RLS, may SELECT ang `anon` — ang key na nasa browser bundle.
Napatunayan bago ayusin: 5 row nakita ng anon (may `user_id`), 0 sa `events`.
Migration `harden_telemetry_views_security_invoker` + `supabase/events.sql`. Anon
= denied, service_role = ok, wala nang ERROR advisor.
🔧 Bukas: dobleng index sa `funnel_leads` · burahin sa **Routines UI** ang Health
Watch v1 + ~11 patay na `send_later` (walang delete action ang tool dito).

## 🔴 Ang mali na tatlong beses naulit noong session 9
**Maling bar, hindi maling gawa** ([`gauntlet_loop_decision.md`](workflows/gauntlet_loop_decision.md)).
**May dalang axis ang corpus mismo:** puro **bayad na ad** ang 78 sa
`assets/ad-swipe/`. ⛔ **Wag lagyan ng CTA ang organic cards** — kailangan muna
ng hiwalay na organic corpus. Wala pa tayo nun.

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
trust card (`paolo-trust-a/b`, **di pa nai-publish** — numero ng critic ang 82).

## 🔴 Huwag kalimutan
1. **Route density ang lever, hindi presyo.** Isang siyudad muna.
2. **Bawal ang CASH refund** sa tripwire. Credit, at isang taon ang bisa.
3. **Patay na ang ₱900 break-even.** Kay Paolo: **₱4,900 kada 1-load na trabaho**.
4. **Coordinate radius ang geo**, lat `14.54` lng `121.02`.
5. ⚠️ **Enterprise ang malalaking pangalan sa client list** — procurement at
   referral, **hindi FB ad.** Pinakamalaking hula pa rin ng plano.

## 🅿 PARKED
**Oceanides:** Week 02 pack · GB-001 video · hook2 ng KM-004 · Kling b-roll ·
watermark ni Gabriel · SEC Reg. No. · FB About · reviews · **AEM hindi pa verified**.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED
· `artifact-noir` Steps 1-4 · 0 pa ang codex-sol lane, di pa masusukat ang gate.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET** para sa video. Manwal sa Flow. Gated: Kling.
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1`
⚠️ `npx playwright install chromium` — kinakain sya ng defreezer kada session.
⚠️ Sariling `node_modules` ang bawat funnel · **wag i-pipe ang build output**.

### How to maintain this file
**Overwrite, never append.** Rewriting it is the last action of any session that
changed the work. Verifier fails past 90 lines.
