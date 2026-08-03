# NOW

**Stamped: 2026-08-03** · Anchor: `6c7a3c2` (main) · **v3 approved. Dalawang static gawa na. Boses ni Gabriel ang tanging haharang sa ad.**

> One screen, one next action. Read this first. **Freshness contract:** kapag >5 araw ang
> stamp sa likod ng `git log -1`, UNVERIFIED — i-derive ulit at isulat muli.
> `node tools/resume_doc_check.mjs` ang tseke. ⚠️ **ADVISORY sya, hindi humaharang.**

---

## ▶ NEXT ACTION — RUN ORDER (Neil, 2026-08-03). Huwag baligtarin.

🔴 **BASAHIN MUNA ANG `/kuya-marvin-ads` BAGO GUMALAW.**
🛑 **Naka-hold ang GB-001 video hanggang may boses si Gabriel** (boses ni Veo ang r4).
🔴 **WAG I-ON ANG CAMPAIGN HANGGAT WALA ANG TATLONG CREATIVE** — 2 static + 1 video.

### A · Mata ni Neil — $0, mga 5 minuto
1. **`clients/oceanides/out/warranty-proof.png`** — static #3 (30-araw warranty,
   totoong ba-1 litrato). Gawa, nababasa sa 375px, wala pang hatol. Copy + UTM
   nasa `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md` §Ad 2.
2. **Profile pic** → `kuya-gabriel/identity-lock/gabriel-profile-v2.png` — ipakita
   kay Gabriel, sa kanya ang huling salita (IDENTITY.md).
3. **Cover** → `gabriel-cover-v3.png` APPROVED na — i-upload, walang tanong.

### B · Organic — 5 araw, isang post kada araw, $0
4. `kuya-gabriel/organic/PAGE-POSTS-PRE-AD.md` — SULAT NA ANG LIMA, may larawan
   bawat isa. I-schedule sa Meta Business Suite Planner sa isang upuan (walang
   API lane para sa organic post — ads-only ang connector). Huwag baligtarin
   ang order. Kumpirmadong BLANGKO ang Page `291924520660232`.

### C · Boses — kasabay ng B; ITO ang nagbubukas ng ad
5. Consent na sakop ang BOSES (`kuya-marvin/consent-agreement-FINAL-2026-07-20.md`)
   → recording (`kuya-gabriel/voice/RECORDING-SCRIPT.md`, 30s, 3 take isang file)
   → ElevenLabs clone, itala ang voice ID sa `kuya-gabriel/voice/`
   → STS pass sa GB-001 v3 + rebuild (dito rin nawawala ang r4-vo roll).

### D · Bago ang unang piso
6. **Tatlong sagot ni Neil na naka-harang:** `maxPaidRolls` (harang ang LAHAT ng
   bayad na render) · Kling para sa 2 b-roll (bayad, gated) · ulitin ba ang r2/r3
   nang isang linya kada roll (PACING Fix 2, ~$6-8)?
7. Campaign build: `kuya-gabriel/ads/CAMPAIGN-RUN-SHEET.md` — paste-ready, 2 ad
   blocks may UTM. Kill gates at week-1 scoreboard nandoon.

---

## ✅ Tapos ngayong 2026-08-03 (session 2)

**Funnel LIVE at patunayan:** redeploy dala ang Lead fix → totoong submit sa apex →
**Lead = 1** sa network level AT sa Events Manager dataset · 390px walk malinis ·
test row burado. **GB-001-AD-v3.mp4 APPROVED ni Neil:** beat 6 = 1.5s totoong page
+ ticket na nababasa sa 375px · caption chunking sumusunod sa kuwit · logo sa end
card · pasado preflight + render_audit (grade B). **Static #3 warranty-proof**
rendered (navy + totoong litrato = format diversity vs paper ticket). **CI AYOS NA:**
lock desync (`a21c31b` nagpasakay ng 12-linyang removal) ang pumatay sa LAHAT ng
workflow mula Aug 2 — ibinalik sa `1537c90`, GREEN na, lesson + standing rule sa
`agent_lessons.md`. **Unit economics sa ledger:** ₱4,100 COGS / ₱900 margin (18%) /
break-even MER **5.6×** — ang pangalawang truckload ang margin machine (50%).

## 🅿 PARKED
**Oceanides:** SEC Reg. No. · FB About: buong SEC name · logo-marquee · reviews sa
Page · page #2 = DENR B2B · per-word invert ng `spotlight` (chunk-pop lang ang gawa)
· KM-003 eksaktong order value (₱4,000-4,500? — MER 3.1-3.5, kulang ang eksakto).
**Grifon:** #94.3 next · #94.2 NOT-REPRO · #92+#89/#90 ride Slice B · #93 ⛔ TUNED.
⚠️ **Client world:** navy + amber print, no glass, no `#FFCC00` — `clients/oceanides/DESIGN.md`.

## ⛔ Gated · 🔧 Arm before starting
Any paid render · Kling b-roll · **anumang ad spend** · ⚠️ kapag nag `npm install`,
i-check ang `package-lock.json` bago mag-commit (agent_lessons 2026-08-03).

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
