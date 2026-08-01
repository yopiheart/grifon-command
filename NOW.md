# NOW

**Stamped: 2026-08-01** · Anchor commit: `badc0bc` (main) · branch head: `23455fd`

> The single resume doc. One screen, one next action. Read this first.
> **Freshness contract:** if the stamp is >5 days behind `git log -1`, treat as UNVERIFIED —
> re-derive from `git log --oneline -15` + open issues and rewrite. Enforced by
> `node tools/resume_doc_check.mjs` (SessionStart runs it `--quiet`).

---

## ▶ NEXT ACTION — OCEANIDES: Gate 2 → deploy → unang campaign sa page

Tapos na ang buong page (landing + thank-you + form). Handoff at buong detalye:
`clients/oceanides/NEXT-SESSION-PRICE-PAGE.md`. Paste this to start:

```
Ituloy natin ang Oceanides. Basahin mo muna:
  clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
  clients/oceanides/DESIGN.md
Nasa branch feat/oceanides-price-page ang lahat, 36 commit. Hindi pa naka-merge.
Gate 2 read muna ni Neil, tapos deploy, tapos ang unang campaign papunta sa page.
```

⚠️ **Nasa `origin/feat/oceanides-price-page` ang trabaho, HINDI sa main.** Binubura
ng defreezer ang local branches; `origin/*` ang nabubuhay. Wag maghinuha mula sa main.
⚠️ **Client world:** matte navy + amber print, no glass, no `#FFCC00`, Taglish.
Ang `clients/oceanides/DESIGN.md` ang batas doon, hindi ang Grifon `DESIGN.md`.

### ⛔ Kay Neil lang (humaharang sa deploy at sa ads)

1. **Gate 2** — buong basa ng landing + thank-you. DRAFT ang copy hangga't wala nito.
2. **Oras ng tawag** — tatlong beses sinasabi ng thank-you na "tatawagan ka namin"
   at ni minsan hindi kung kailan. Kailangan ng kayang panindigan ni Zam.
3. **Meta Pixel ID** — `tracking: {}` ngayon, PATAY. Walang Lead data at walang
   maiipong retargeting audience kung mag-a-ads nang wala nito. Hindi mababawi.

### Session 2026-08-01 (`b26f533..23455fd`) — buong listahan nasa branch doc

Thank-you 4-chapter + isang rail · PH mobile validation (hugis lang, walang carrier
whitelist) at required na ang phone · **local `/api/lead` bridge** kaya nalalakad na
ang buong daan bago mag-deploy · marquee readability · footer + sticky-bar Messenger
(`m.me/OceanidesMalabanan`, verified) · FB profile+cover sa `page-assets/`.
**Desisyon:** wag palitan ang pangalan ng FB Page. **Nahuli ni Neil:** 11px Anton na
label (h1-h3 ay sapilitang Anton; label = `<p>`) → bagong `subhead` role sa DESIGN.md.

### 🅿 Parked sa Oceanides (hindi humaharang sa deploy)

**SEC Reg. No.** (nasa Certificate of Incorporation) · **ang TIN sa page** ay
nakapangalan kay Cepriano sa SEC docs, ipa-check sa BIR Form 2303 · **utang sa 100
taong nangakuan ng "libre ang tingin"** · FB About: idagdag ang buong SEC name ·
i-archive ang June 2025 post na AI ang mukha · 3-5 organic post bago ang unang ad ·
hose baseline · logo-marquee · real-bookings feed (post-launch, totoong data lang).

### Pagkatapos ng deploy: ang unang campaign

**Sa page, Leads ang objective, hindi Messenger.** Ang KM-003 ay 100 messages sa
₱13.33 pero ISANG order — ang close ang butas, at ang page mismo ang ayos doon.
Caveat: mas mahal ang website leads habang walang pixel data, kaya **cost per
BOOKING ang titingnan, hindi cost per message.** `grifon-ad-strategist` ang
magda-draft, si Neil ang magpapaputok.

## 🅿 PARKED — Grifon punch list (resume trigger: Neil says so)

- ✅ **#91**+**#94.1** fixed, $0. **#94.3** next (free, owns the real caption
  defect). **#94.2** → close NOT-REPRODUCIBLE.
- **#96** `forced_alignment` granted ✅ — remaining: make the failure loud.
- **#92**+**#89**/**#90** ride Slice B; **#93** ⛔ TUNED. Neil decisions bukas: golden-snapshot diff + overlay drop-case.

## ⛔ Gated — not without Neil

Any paid render · P5 engine-default flip · Hyperframes product swap · Slice 2 video
rate-limit re-scope · merging `feat/oceanides-price-page` · ang DEPLOY (Gate 2 muna) ·
anumang ad spend.

## 🔧 Arm before starting

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-gh.ps1     # gh may miss bash PATH → $LOCALAPPDATA/Programs/GitHubCLI/bin/gh.exe
```

---

### How to maintain this file

**Overwrite it — never append.** History is `git log`'s job. Rewriting it is the **last**
action of every session that changed the state of the work. Keep it one screen — the
verifier fails past 90 lines.
