# NOW — the resume doc
**Stamped: 2026-09-03** (session 43)

## ▶ NEXT ACTION — ipa-print ang card, tapos i-redeploy ang funnel

Session 43 ay **Oceanides client work**. Branch:
`claude/oceanides-business-card-design-ppwhtx` (pushed, walang PR).

**1 · Ipa-print ang business card.** Tapos na at na-gate.
`clients/oceanides/card/` — ibigay sa printer ang `press-front.png` +
`press-back.png`. Buong spec: [`card/PRINT-SPEC.md`](clients/oceanides/card/PRINT-SPEC.md).
90x50mm trim + 3mm bleed, 350gsm, matte lam, double-sided, **100-200 lang muna**.
🔴 **Kumpirmahin muna kay CEO Agosto ang "Authorized Representative" ni Marvin**
bago ang malaking run — totoo lang yun kung may sulat na nagbibigay ng awtoridad.

**2 · I-redeploy ang `oceanides-price-page`.** Dalawang bagay ang naghihintay
sabay: **ang bagong logo** at **ang DENR claim sa footer** na inalis. Tapos na
ang source, hindi pa naka-live.

## ✅ SHIPPED — bagong logo, business card, at ang typeface

**ISA lang ang marka:** `clients/oceanides/brand/logo-source.png`. Binura ang
vector shield at ang `assets/logo.jpg` sa utos ni Neil. Ang `logo.jpg` ay **build
input** pala ng dalawang funnel — naka-repoint na lahat (tatlong lugar), at
ni-regenerate ang parehong `logo.webp`.

**Typeface: Archivo Expanded 800** (SIL OFL, naka-commit sa `brand/fonts/`).
Ang board ni Neil ay nasa `brand/type-inspo/` na may verdict kada pares — apat sa
anim ay bagsak sa licence o register. Ang panalo ay ang Archivo half ng sarili
nyang slide 05. **Anton pa rin ang video captions** — nakadikit sya sa drawPlan
constants at sa 98.5% retention; hatian ayon sa surface, nasa DESIGN.md.

**Kulay: walang binago.** Sinukat laban sa bagong logo — `surface` 15.7, `deep`
17.4, `void` 10.8. Tugma lahat. Ang amber ay **13 pixel sa 1,572,516** — wala sa
marka, pero signage color sya, hindi hango sa marka.

🔴 **Aral ng session:** ipinakita ko ang 40px na mush ng logo tapos hinatulan ko
agad na hindi kaya ang business card. **Mali** — apat na beses mas malaki ang card,
at malinis ang logo sa 12mm pataas. **Sukatin sa TOTOONG laki ng surface**, wag
i-generalize mula sa isang sukat.

## 🔴 OPEN — unshipped compliance landmine

`funnels/oceanides-paolo/src/funnel.config.ts:288-311` ay may
`'DENR-registered hauler'`, `'LLDA permit'`, at **parehong ID number ng ibang
kompanya** bilang receipt rows na nakapangalan sa Oceanides.

**HINDI** sya nasa `workflows/funnel_deploys.md`, kaya unshipped — landmine, hindi
leak. **Wag i-deploy ang oceanides-paolo hangga't nandyan ang mga row na yun.**

## ⏸ GRIFON PRODUCT — parked exactly where session 42 left it

Nothing in this session touched Grifon. `origin/main` is still at `4f76359` with
sessions 41 + 42 in full. The next product action is unchanged: **produce the next
sample** — either re-run the unboxing brand for a second data point on the 🎲
(`bbbed45` still has a sample of one), or go to **2 · Silid Home (Unboxing ASMR)** in
`workflows/sample_brand_briefs.md`, which exercises the same S2 pair under `asmrFlag`
and doubles as that data point. Neil picks.

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`,
`npm run dev`. Run at `/app?osaEngine=producer`, vertical `product`, presenter `Auto`,
BOTH photos. **Paste the offer, never type it** — a past run typed 113 of 153 chars and
lost the first sentence. Smoke login: `workflows/expert_manual_mode.md:440`.
