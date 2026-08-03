# NOW

**Stamped: 2026-08-03** · Anchor: `cf3a022` (main) · **GB-001 v2 buo na, hinihintay ang mata ni Neil**

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — PANOORIN NI NEIL ANG `GB-001-AD-v2.mp4`

🔴 **BASAHIN MUNA ANG `/kuya-marvin-ads` BAGO GUMALAW.** Pangalawang beses na to.

`clients/oceanides/kuya-gabriel/ads/gb-001/GB-001-AD-v2.mp4` — **22.1s**, 1080×1920.
Pasado ang dalawang gate: `ad_preflight --build/--video` at `render_audit` (grade **B**,
`vo_accent_ok`, walang dead air, `covers_face:false` sa lahat).

**Walong beat:** hook (mukha) · plunger b-roll · takot (mukha) · phone b-roll ·
**HTML quote card** · screen scroll ng totoong page · CTA (mukha) · end card.

### ⛔ Tatlong bagay na hinihintay ang sagot mo
1. **Kling para sa 2 b-roll** — still + FFmpeg zoom pa lang sila. **BAYAD**, gated,
   at hindi ko pa nagagamit ang lane kaya wala akong masabing presyo nang hindi humuhula.
2. **`maxPaidRolls`** — wala pa sa `script.spec.json`, kaya **naka-harang ang lahat ng
   bayad na render.** Ikaw ang magsasabi ng bilang. Sinadya.
3. Ulitin ba ang r2/r3 nang **isang linya kada roll** (PACING Fix 2, ~$6-8), o tanggapin
   ang kasalukuyang hugis? Sagutin lang matapos mong panoorin.

### 🔴 Ang aral ng 2026-08-03, at ang gate na ipinalit
Sampung tawag sa Veo noong **dalawa** lang ang inaprubahan. Ang script ay pumasa sa gate
pero **dalawang linya ang nakasaksak sa bawat 8s roll** — ang eksaktong bagay na binawi
mo noong 2026-07-27. Binibilang ng lumang gate ang salita kada LINYA, hindi ang linya
kada CLIP. Ngayon may bantay na (`797bdf0`):

- isang linya kada roll (basa sa `beatMap`) · `maxPaidRolls` na binibilang ng hook,
  pati ang hinarang ng RAI · b-roll ay dapat may Kling motion lane · kailangan ng HTML
  overlay + end card + zoom sa build

⚠️ **Butas pa rin:** kapag HTML overlay ang gamit, nilalaktawan ng gate ang feed-safe
check (naghahanap sya ng `band()`). Manwal na na-verify ang hook sa y=300-560.
At mali ang binabasa nyang `volume=` (nakukuha ang SFX 0.45, hindi ang music 0.20).

### ✅ Tapos at aprubado
**Static ad** `clients/oceanides/out/price-addons-ticket.png` — handa nang i-upload.
**3 plate + 2 b-roll** ni Gabriel — **inokay ni Neil**. Recipe: `make-plates.mjs`,
`make-broll.mjs`. **Infra** buo: domain, pixel, AEM, card, `Lead` = 1 kada submit.
**Ledger:** KM-003 (₱1,284.92 · ~100 message · 1 order).
⏳ Kailangan pa bago ang unang campaign: **redeploy ng funnel**, **test submit sa apex**,
at **3-5 organic post** — **BLANGKO pa ang Page `291924520660232`** (kumpirmado ni Neil).
Run sheet: `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md`.

⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`
ang batas, hindi ang Grifon `DESIGN.md`.

## 🅿 PARKED

**Oceanides:** SEC Reg. No. · FB About: buong SEC name · logo-marquee · real-bookings feed ·
reviews sa FB Page · page #2 = DENR Compliance B2B · **voice clone ni Gabriel** (Veo audio
muna — kaya galing sa Veo roll ang VO ng beat 6) · **per-word invert ng `spotlight`**
(chunk-pop lang ang gawa, kulang ng per-word timing).

**Suby 27-min brief:** FB-group VOC mining · creative-reps counter · print-ad seeding.

**Grifon punch list:** ✅ #91+#94.1 · #94.3 next · #94.2 NOT-REPRO · #96 ✅ ·
#92+#89/#90 ride Slice B · #93 ⛔ TUNED.

### Voice + HOUSE MODEL (`assets/house-model/`)
LANGUAGE LOCK sa `_shared/taglish-voice.md`, 3 gate, naka-auto-fire (CLAUDE.md).

## ⛔ Gated — not without Neil · 🔧 Arm before starting
Any paid render · Kling b-roll · P5 engine-default flip · **anumang ad spend**.

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1
.\scripts\restore-hyperframes.ps1   # ffmpeg -> .tools\ffmpeg\...\bin
.\scripts\restore-codex.ps1
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
