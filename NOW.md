# NOW

**Stamped: 2026-08-03** · Anchor: `c2855b4` (main) · **Oceanides: script pasado, hindi pa nagre-render**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES GB-001: i-render ULIT ang video sa pasadong script

🔴 **BASAHIN MUNA ANG SKILL BAGO GUMALAW.** `/kuya-marvin-ads`. Ito mismo ang
nilaktawan noong 2026-08-03 at nagkahalaga ng ~$4 na maling render. Sabi ni Neil:
*"nasa kuya marvin skill lahat yan diba... sana man lang tumingin ka muna dun."*

**Ang GB-001-AD-v1 ay BAGSAK, huwag i-upload.** Mas malakas ang strategy, mas
mahina ang craft. Anim na bagay: hook 15 salita (max 8), body 20-21 (max 12),
3 magkaibang lugar (dapat isang jobsite), hook sa `y=150` (feed-safe 285-1635),
walang caption, walang SFX, music sa 0.10.

✅ **May gate na ngayon, hindi na uulit** — `tools/ad_preflight.mjs` +
`.claude/hooks/veo-render-gate.sh` (PreToolUse, fail-closed: walang pasadong
`script.spec.json` = walang bayad na Veo render).

✅ **PASADO na ang bagong script:** `kuya-gabriel/ads/gb-001/script.spec.json`.
Hook 8 salita 1 pangungusap, 7 body line na 8-9 salita, isang jobsite, preset
**`spotlight`** (approved). Ang line 3 ay **APPROVED verbatim ni Neil** —
*"Isa ang presyo sa phone, iba na sa receipt."* → **SCENE 3.** Wag galawin.

### ⛔ Tatlong sagot ni Neil ang kailangan bago ang unang piso
1. **Basahin ang 7 linya sa `script.spec.json`** — pinakamura ngayon, walang plate pa.
2. **Alin ang isang jobsite?** Kalye + puting truck, o likod-bahay + tangke.
3. **~$4 ang bagong rolls.** Gated. `$0` naman ang caption/SFX/music/hook position.

**Pipeline:** `/kuya-marvin-ads` → plates (`marvin-avatar` + `kuya-gabriel/IDENTITY.md`,
🔴 laging isama ang no-smile line, hindi sya nahuhuli ng EXPRESSION LOCK) →
`veo-produce.mjs --formula optionb` → `build-cut.sh` → **`ad_preflight --build/--video`**
→ **`render_audit.mjs`** (sya lang ang NAKIKINIG) → Neil.

### ✅ Tapos at aprubado
**Static ad** `clients/oceanides/out/price-addons-ticket.png` — APPROVED, handa nang i-upload.
**Infra** buo: domain verified, pixel + AEM live, card OK, `Lead` = 1 kada submit (`3da6997`).
**Ledger** may laman na: KM-003 (₱1,284.92 · ~100 message · **1 order**), pattern A1-A4.
⏳ Kailangan pa: **redeploy ng funnel**, **test submit sa apex**, at **3-5 organic post**
(`kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md`) bago ang unang campaign.
Run sheet: `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md` (paste-ready, may UTM).

🔴 **TANONG NA HINDI KO MASAGOT:** may laman na ba ang Page `291924520660232`?
Kung oo, laktawan ang organic at dumiretso sa run sheet.

⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish —
`clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

📱 Work brief artifact: `https://claude.ai/code/artifact/9c0c6df5-46eb-4f75-8ea1-2631ef650d40`

## 🅿 PARKED

**Oceanides:** SEC Reg. No. · FB About: buong SEC name · logo-marquee ·
real-bookings feed · **reviews sa FB Page** (bubuksan ang rating chip) ·
**page #2 = DENR Compliance B2B** · 2 FB page, alin ang totoo · voice clone ni
Gabriel (Veo audio muna ngayon, hindi STS).

**Suby 27-min brief** (walang doc): FB-group VOC mining · creative-reps counter ·
print-ad seeding ng `static_ad_swipe_file.md`.

**Grifon punch list** (trigger: Neil says so): ✅ #91+#94.1 · #94.3 next · #94.2
NOT-REPRO · #96 ✅ · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.

### Voice + HOUSE MODEL (`assets/house-model/`, 2026-08-02)
LANGUAGE LOCK sa `_shared/taglish-voice.md`, 3 gate, naka-auto-fire (CLAUDE.md).
Naka-lock na Filipina model, 63 larawan — basahin ang README doon bago gumawa.

## ⛔ Gated — not without Neil · 🔧 Arm before starting
Any paid render · P5 engine-default flip · Hyperframes swap · **anumang ad spend**.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin (idagdag sa PATH)
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
