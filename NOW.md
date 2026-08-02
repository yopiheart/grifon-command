# NOW

**Stamped: 2026-08-03** · Anchor: `3da6997` (main) · **Oceanides: creative na lang**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: gawin ang 2 creative, tapos ang UNANG CAMPAIGN

Infra TAPOS na lahat: domain live + Meta-verified, pixel buhay, web events
configured, may card na ang ad account. **Creative na lang ang kulang.**

🔴 **MARVIN → GABRIEL ANG PIVOT** (Neil, 2026-07-30). Sinadyang PAUSED ang KM-003
ad, hindi sya namatay: `single_all_ad_off`, ₱1,284.92 lifetime, 2 araw lang.
Si **Gabriel Gatchalian** ang bagong field inspector (`clients/oceanides/kuya-gabriel/`,
consent PIRMADO 2026-08-01) at sya ang nasa price page. **Wag ilabas si Marvin sa
bagong ad.** ⚠️ Utang: 100 taong nangakuan ng "libre ang tingin" — libre pa rin.

**APPROVED NA ANG ANGLE (Neil, 2026-08-03):** *nakasulat ang presyo bago dumating
ang truck.* Walang numero sa ad (standing rule, offer doc §9) — ang **page** ang
nagsasabi ng presyo. Panatilihin ang hook na `Hindi barado. Puno na.` (98.5% sa
0:03, pinakamababang CPM sa account). Palitan ang dulo: doon mismo sa 9.2s-18.4s
nawala ang **41%**, at doon nakaupo ang lumang "libre ang tingin."

Dalawang creative, nasa chat ang buong copy: **15-20s na video kay Gabriel** (hindi
36.8s) + **static ng add-on ticket**. Pre-flight: **3-5 organic post** sa Page
`291924520660232` bago ang unang ad, parehong gate ng KM-003.

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish —
`clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ✅ Tapos na (2026-08-02/03)
Gate 2 + privacy APPROVED · live e2e GREEN · **Pixel `1050997330667084`** (44
PageView, `Lead` verified) · ad account **`4165212657057538`** + card · Page
`291924520660232` = ang m.me link · AEM configured, `Lead` = #1.
**Advanced Matching OFF, walang CAPI**, sinadya. `Lead` = **isang beses kada
submit** na ngayon (`3da6997`) — ⏳ kailangan pa ng redeploy.
⏳ Full admin hiningi kay Boss Jay, portfolio `2966390243596032` — kung dumating
bago ang ~₱10-20k spend, lilipat tayo.
🔴 Huwag burahin ang `facebook-domain-verification` tag sa `index.html`.

### 3 desisyon (`workflows/oceanides_business_model.md`)
Segmented payment + QR-first collection · **disposal slip kada byahe** (may risk:
nakalimbag na "legal na tapunan" pero crew ang nagmamaneho) · ₱499 Health Check.

### Voice: LANGUAGE LOCK, naka-auto-fire na
`_shared/taglish-voice.md` §LANGUAGE LOCK. Tatlong gate: `taglish-guard.sh` ·
`lint-voice.mjs` sa `_template/` · `gemini-eval`. Detalye sa CLAUDE.md.

### 🆕 HOUSE MODEL (`assets/house-model/`, 2026-08-02)
Naka-lock na Filipina model: 63 larawan, 3 anchor, 4 lane + 7 grade
(`tools/grade.mjs`, `luts/`). **Basahin ang README doon bago gumawa ng bago** —
10 tuntunin (shoulder rule, eye dead zone, hands, anchor kada rendering, makeup
M0-M4), naka-lock bilang block sa `build-*.mjs`. Kopyahin ang pattern, hindi ang
prompt. ⚠️ Photoshoot lane = **sinasadyang mukhang ad**: beauty/premium lang,
mali sa testimonial. Walang campaign na naghihintay — sasabihin ni Neil.

## 🅿 PARKED

**Oceanides:** SEC Reg. No. · FB About: buong SEC name · logo-marquee ·
real-bookings feed · **reviews sa FB Page** (bubuksan ang rating chip) ·
**page #2 = DENR Compliance B2B**, hindi Health Check · 2 FB page, alin ang totoo.

**Suby 27-min brief** (walang doc): FB-group VOC mining · creative-reps counter sa
`ad_performance_ledger.md` · print-ad seeding ng `static_ad_swipe_file.md` · wala
sa `grifon-cmo` ang 5-carriers lens.

**Grifon punch list** (trigger: Neil says so): ✅ #91+#94.1 · #94.3 next · #94.2
NOT-REPRO · #96 ✅ · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.

## ⛔ Gated — not without Neil · 🔧 Arm before starting
Any paid render · P5 engine-default flip · Hyperframes swap · **anumang ad spend**.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
