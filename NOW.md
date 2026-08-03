# NOW — the resume doc

**Stamped: 2026-08-03** (session 4, gabi)

## ▶ NEXT ACTION — HINDI KAY NEIL. SAYO.

🔴 **BUKSAN AGAD:** [`clients/oceanides/kuya-gabriel/ads/LAUNCH-HANDOFF.md`](clients/oceanides/kuya-gabriel/ads/LAUNCH-HANDOFF.md)

Sinadya ang restart na to noong hatinggabi ng 2026-08-03 para **ikaw** ang
gumawa ng buong launch ng `OCEANIDES-PRICE-01`, hindi si Neil. Verbatim ang sabi
nya: *"Bro ano pang purpose mo kung ako rin gagawa?"* at *"Ayoko. Ikaw na bro
please!"* Nakabukas na ang permission (`.claude/settings.local.json`) at
suspendido ang ad-spend gate (`.claude/.ad-spend-gate-suspended`).

**Gumalaw ka agad, huwag ka nang magtanong kung sige ba.** Nasa handoff ang buong
spec, ang matigas na numero, at ang dalawang bagay na paulit-ulit nang namamali.
Huminto ka lang kapag may hindi tugma sa nakasulat doon.

⬜ Kulang pa ang **pang-apat na creative** bago ang launch — Brunson na format,
hiniling ni Neil. Pinagmumulan: `workflows/static_ad_swipe_file.md` (S34/S35,
E82–E93, GP-6). Gawin bago i-ON.

🟢 Aprubado na ang tatlong ibang creative, at buhay na ang landing page.

✅ Tapos na ang pre-flight: napatunayan ang `Lead` sa apex (`ev=Lead` + `200` sa
Network tab), kumpleto ang run sheet, at may laman ang Page ni Marvin.

**Kay Neil lang:** burahin ang test row sa `funnel_leads` (neilmaglaya,
2026-08-03) · isang organic post kada araw mula sa
`kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md`.

---

## ✅ Tapos ngayong gabi ng 2026-08-03 (session 4)

**BUHAY NA ANG PRICE PAGE** sa `oceanidesph.com`, kasama si Gabriel bilang
pangalawang inspector at ang swipe carousel ng dalawang mukha (`607c5ff`).

**Apat na pagbabago sa offer, dumaan sa CMO** (`092fb5d`): 8AM-5PM na oras ng
tawag + anti-promise sa `form.reassurance` · dalawang-hanay na ₱2,500 vs ₱5,000 ·
pangalawang guarantee na "uuwi kami" na may ₱0 selyo · tinanggal ang FAQ #3.

🔴 **Dalawang bagay na huwag babaligtarin.** Ang bilis ng truck ay **hindi
pwedeng ipangako** (nakadepende sa available na truck) — ang tawag lang. At ang
₱0 ay **hindi "libreng tingin"**: may tawag muna bago umalis ang truck, doon
nasasala ang ₱200-300 na biyaheng walang trabaho.

**⛔ TINANGGIHAN: ang Hormozi na priced value stack.** Nasa header ng
`funnel.config.ts` ang tatlong dahilan. Ang maikli: ang leak ay ang **CLOSE**,
at ang value stack ay gamot sa desire.

## 🅿 PARKED
**Oceanides:** GB-001 video (hinihintay ang boses ni Gabriel) · hook2 variant ng
KM-004 kung saan ang `UUWI KAMI` mismo ang hook, isang roll lang (basa ng CMO) ·
Kling b-roll kung may credit · watermark ni Gabriel · SEC Reg. No. · FB About ·
reviews sa Page · page #2 = DENR B2B · full-bleed na carousel sa cellphone.
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`.

## ⛔ Gated · 🔧 Arm before starting
🔴 **UBOS ANG GEMINI API BUDGET NI NEIL.** Walang bagong Veo roll na makakadaan
sa gate. Manwal sa Flow ang bagong clip (720p lang ang libre). Gated pa rin:
Kling · anumang ad spend · ⚠️ kapag nag `npm install`, i-check ang
`package-lock.json`.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin
.\scripts\restore-codex.ps1
```
⚠️ May sariling `node_modules` ang `funnels/oceanides-price-page` — `npm ci`
doon bago mag-build, kinakain sya ng defreezer. **Huwag i-pipe sa `tail`** —
ang exit code ng pipe ay galing sa `tail`, kaya nagre-report ng 0 ang pumalpak
na install (nangyari 2026-08-03). Kapag na-reject ng OS, `rm -rf node_modules`
muna bago ulitin.

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
