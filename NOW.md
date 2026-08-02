# NOW

**Stamped: 2026-08-02** · Anchor: `e92fe78` (main) · **LIVE at APPROVED ang Oceanides page**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: web events config, tapos ang UNANG CAMPAIGN

**LIVE at VERIFIED.** https://oceanidesph.com (+ `www.`, 6/6 na 200) · domain
**verified sa Meta** · pixel buhay · approved lahat ni Neil. Paste this:

```
Ituloy natin ang Oceanides. Live at Meta-verified na ang oceanidesph.com.
Basahin mo muna ang workflows/funnel_deploys.md at ang
clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md (§Website campaign
infrastructure). Web events config muna, tapos ang unang campaign.
```

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish —
`clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ⛔ Kay Neil lang: isang hakbang na lang bago ang ads

**I-connect ang pixel sa domain, tapos i-configure ang web events.** Domain page →
**Connect assets** → dataset `1050997330667084`. Tapos Events Manager → **Aggregated
Event Measurement** → Configure Web Events → `oceanidesph.com` → **#1 ang `Lead`**.
Kapag di nagawa, ang iOS traffic ang unang mawawala sa attribution.

✅ auto-renewal ON · **domain VERIFIED** (meta-tag sa static `<head>`, asset
`1826135088763227`). 🔴 Huwag burahin ang tag sa `index.html`: tahimik ang
pagkasira, ang ads ang sisira hindi ang page.

### ✅ Tapos na (2026-08-02)
Gate 2 + privacy APPROVED · live e2e GREEN · **Pixel `1050997330667084`** · ad
account **`4165212657057538`** · Page `291924520660232` = ang m.me link.
**Advanced Matching OFF, walang CAPI**, sinadya (hashed PII, di sakop ng consent).
⏳ Full admin hiningi kay Boss Jay, portfolio `2966390243596032` — kung dumating
bago ang ~₱10-20k spend, lilipat tayo.

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

**Oceanides:** SEC Reg. No. · utang sa 100 taong nangakuan ng "libre ang tingin" ·
FB About: buong SEC name · 3-5 organic bago ang ad · logo-marquee · real-bookings
feed · **reviews sa FB Page** (bubuksan ang rating chip) · **page #2 = DENR
Compliance B2B**, hindi Health Check · 2 FB page, alin ang totoo.

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
