---
version: 1.0
name: Oceanides / Kuya Marvin
description: Trust-premium local-service brand. Matte print world — navy + amber, walang glass. Taglish kalmadong-eksperto.
colors:
  primary: "#F5B301"
  surface: "#0E2C5E"
  surface-deep: "#0A1F45"
  surface-void: "#071630"
  ocean: "#1C63AD"
  sky: "#5AA6E6"
  sky-deep: "#3E8FD0"
  on-surface: "#FFFFFF"
  on-surface-muted: "#DFE8F5"
  on-surface-dim: "#8FB3DD"
  paper: "#F4F6FA"
  on-paper: "#0B1B33"
  good: "#1B8A3C"
  good-on-dark: "#3ED36B"
  danger: "#D7263D"
typography:
  headline-display:
    fontFamily: Anton, Roboto Condensed, Arial Narrow, Impact
    fontWeight: 400
    textTransform: uppercase
    lineHeight: 0.95
    letterSpacing: 0.5px
  body-md:
    fontFamily: Inter, Helvetica Neue, Arial
    fontWeight: 400
  label-strong:
    fontFamily: Inter
    fontWeight: 800
    letterSpacing: 1.2px
    textTransform: uppercase
  data-mono:
    fontFamily: JetBrains Mono
    fontWeight: 500
    letterSpacing: 0.14em
    textTransform: uppercase
components:
  eyebrowChip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface-deep}"
    fontWeight: 900
    rounded: 4px
  photoScrim:
    background: "linear-gradient(90deg, rgba(10,31,69,0), rgba(10,31,69,.96))"
  hazardBand:
    background: "repeating-linear-gradient(-45deg, {colors.primary} 0 16px, {colors.surface-deep} 16px 32px)"
    scope: internal-ops-only
  phonePill:
    backgroundColor: "{colors.primary}"
    iconColor: "{colors.surface-deep}"
---

# OCEANIDES DESIGN.md — Kuya Marvin / Oceanides Malabanan

Ang design system ng Oceanides client work — **ito ang source of truth** para sa
lahat ng Oceanides visual: static templates, video ad overlays/captions,
internal dashboards/artifacts, page assets. Kapag Oceanides ang trabaho, ITO
ang i-diff-an, hindi ang Grifon [DESIGN.md](../../DESIGN.md) — magkaibang
mundo ang dalawa at sinadya iyon. Formalized 2026-07-27 mula sa de facto
tokens ng `templates/` + production rules ng `kuya-marvin-ads` skill;
structure ay reverse-engineered mula sa Grifon DESIGN.md (frontmatter tokens,
contrast floor, exception discipline, Do's/Don'ts).

## Overview

**Clipboard sa trak, hindi sci-fi deck.** Kung ang Grifon ay "Unreal Engine
meets Hollywood" (glass, glow, OLED black), ang Oceanides ay **print at
pintura**: matte navy panels, amber signage, dashed work-order rules, totoong
litrato ni Marvin. Ang pakiramdam na habol: **kapitbahay na eksperto na may
kumpletong papeles** — SEC-Rehistrado, DENR, presyo-bago-magsimula. Premium
sa TIWALA, hindi sa kinang.

Tatlong batas na namamana ng lahat ng surface:

1. **"Hindi Mukhang Ad."** Ang makintab na ad-plate sa ibabaw ng UGC video ay
   itinataas ang bantay na ibinababa ng creative (aral ng KM-003 thumbnail).
   Bawal ang MrBeast/Grifon formula plates sa Marvin content. Totoo > perpekto.
2. **Walang glass.** Walang `backdrop-filter`, walang frosted panels — hindi
   ito ang mundo ni Marvin, at bonus: mobile-safe by default (ang Android
   WebView breakages sa Grifon CLAUDE.md artifact checklist ay hindi na issue).
   Elevation ay tonal fill + print devices (dashed rules, tabs, stamps).
3. **Walang fake proof.** Walang imbentong numero, fake countdown, fake
   testimonial. Ang trust receipts ay totoong papeles lang.

## Colors

Isang amber accent sa ibabaw ng navy ladder — signage sa gabi.

- **Primary (`#F5B301`, "Amber"):** ANG accent — eyebrows, CTA chips, gold
  emphasis words, hazard bands. Bakit amber at hindi asul na CTA: sa dagat ng
  asul, ang amber ang pumipigil ng scroll; at hazard/signage color siya —
  tamang-tama sa serbisyong "may problema ka, aayusin namin."
- **Surface ladder (navy):** `surface` `#0E2C5E` panels · `surface-deep`
  `#0A1F45` grounds/scrims/text-on-amber · `surface-void` `#071630` pinakadulo
  ng gradients. **Huwag pure `#000000` o charcoal** — ang itim ay Grifon;
  ang navy ang nagpapa-Oceanides ng frame kahit walang logo.
- **Ocean/sky (`#1C63AD` / `#5AA6E6` / `#3E8FD0`):** gradients, labels,
  secondary panels. Ang `sky-deep` ay gradient partner — hindi small text
  (4.7:1 lang, borderline; tingnan ang floor).
- **Paper (`#F4F6FA`):** ang light surfaces ng stills (checklists,
  before/after, news-graphic templates). Doon, ang text ladder ay
  `on-paper` `#0B1B33` / `#5B6B85` meta.
- **Semantic ≠ accent:** `good` para sa ✓/go (`#3ED36B` sa navy, `#1B8A3C` sa
  paper), `danger` `#D7263D` para sa ✗/kill/stamps. Huwag gamitin ang amber
  para sa status — "amber = tingnan mo ito," hindi "tama ito."

### Contrast floor (sinukat 2026-07-27, WCAG relative luminance vs `surface-deep` `#0A1F45`)

| Role | Hex | Ratio | Verdict |
|---|---|---|---|
| `on-surface` | `#FFFFFF` | 16.2:1 | pass |
| `on-surface-muted` | `#DFE8F5` | 13.1:1 | pass |
| `primary` (amber text/chips) | `#F5B301` | 8.8:1 | pass |
| `on-surface-dim` | `#8FB3DD` | 7.5:1 | pass — ito ang pinakamadilim na text step sa navy |
| `sky` | `#5AA6E6` | 6.2:1 | pass (labels OK) |
| `sky-deep` | `#3E8FD0` | 4.7:1 | borderline — gradients/malaking display lang, hindi maliit na text |
| ~~`#5B6B85`~~ sa navy | | **3.0:1** | **BAWAL bilang text sa navy** — paper surfaces lang (4.9:1 sa `paper`) |
| white sa ibabaw ng amber | | **1.9:1** | **BAWAL** — laging `surface-deep` ang text sa amber chips (8.8:1) |
| amber text sa ibabaw ng `paper` | | **1.7:1** | **BAWAL** — sa paper, ang accent TEXT ay `ocean` `#1C63AD` (5.7:1); ang amber sa paper ay fills/chips lang na may navy text |

### Paper-surface exception (stills lang)

Ang mga template na may `paper` ground (checklist, before/after, news graphic)
ay nagba-baligtad ng ladder: `on-paper` headings, `#5B6B85` meta, solid white
cards na may `rgba(11,27,51,.1)` border. Accent text doon ay **ocean**, hindi
amber (floor sa itaas). Walang paper surface sa video overlays o dashboards.

## Typography

| Role | Face | Rules |
| --- | --- | --- |
| `headline-display` | **Anton** (single weight — walang bold/italic variants; huwag i-fake) | UPPERCASE, `line-height .9–.95`, `letter-spacing .5px`; emphasis = kulay (`primary`), hindi weight |
| `body-md` | **Inter** 400–800 | sentence case; 700–800 emphasis; `on-surface-muted` sa navy |
| `label-strong` | Inter 800–900, 10–12px | uppercase, `letter-spacing 1–1.2px`, `sky` sa navy |
| `data-mono` | JetBrains Mono | internal dashboards/tickets LANG — hindi customer-facing creative |

- **Anton ang display sa LAHAT ng surface** — stills, video captions
  (`build-captions.mjs` IMPACT chunk-pop grammar, exact drawPlan constants
  doon), dashboards. Iisang boses.
- Fallback stacks: Anton → `'Roboto Condensed','Arial Narrow',Impact` · Inter
  → `'Helvetica Neue',Arial`. **Sa artifacts** (CSP blocks font CDNs): walang
  Google Fonts `<link>` — condensed system stack o inline `@font-face` data
  URI lang. Sa `templates/` (nire-render lokal): Google Fonts OK.
- **Copy voice:** Taglish 50/50 kalmadong-eksperto —
  [`taglish-voice.md`](../../.claude/skills/_shared/taglish-voice.md). Mahabang
  copy ay kay `grifon-cmo`; ang design ay bumabalot.

## Materials & elevation — print, hindi glass

- **Panel = tonal fill:** `surface` o gradient `ocean → surface-deep`, solid.
  Separation via kulay at 1px borders (`rgba(255,255,255,.1)` sa navy), hindi
  blur, hindi drop-shadow bilang pangunahing device (payagan ang malalim na
  `rgba(0,0,0,…)` falloff sa dashboards, pero ang print devices ang bida).
- **Print devices ang elevation language:** dashed ticket borders · amber
  section tabs (`eyebrowChip` sa mas malaki) · hazard bands · rubber stamp
  (`danger` double-border, nakatagilid ~-7°) · signature lines. Ang mga ito
  ang katumbas ng Grifon material tiers.
- **Photo + scrim:** litrato sa isang panig, `photoScrim` sa panig ng text;
  text laging sa scrim side. Ito ang tanging "cinematic" move ng brand.

## Components (galing sa live templates — kopyahin, huwag mag-imbento)

- **eyebrowChip** — amber bg, `surface-deep` text, 900, ~10px, uppercase,
  `letter-spacing 1px`, `border-radius 4px`. Ang signature element ng brand.
- **Gold-emphasis headline** — Anton white na may 1–2 salitang amber
  (`Libreng` Septic Health Check · LAUNCH `WORK ORDER`).
- **phonePill** — bilog na amber na may `surface-deep` phone icon + white
  number + `sky` carrier label (cover/endcard).
- **Checklist row** — kahon (2px border, radius 2–3px) + label; tapos =
  `good` na may ✔, hindi amber.
- **hazardBand** — amber/`surface-deep` diagonal, 14px. **Internal ops lang**
  (dashboards, tickets) — huwag sa customer-facing creative.
- **Stamp** — `danger` double border + uppercase mono, rotated. Status device
  ng internal docs (PAUSED, PAID, APPROVED).

## Surface map + hard rules

| Surface | Engine | Hard rules |
| --- | --- | --- |
| **Static templates** (`templates/`, 4:5 & 1:1, cover, endcard) | HTML → `render.mjs` | tokens dito; Google Fonts OK; cover text block sa loob ng `x≤760` all-device crop |
| **Video ads** (KM-00x overlays + captions) | Hyperframes HTML + `build-captions.mjs` | **FACE-SAFE: walang text sa mukha ni Marvin, kailanman** · 4:5 feed-safe band — i-VERIFY sa frame, huwag hulaan · **hook overlay sa frame 0, walang fade-in** (frame 0 ang Meta thumbnail) · overlay dapat may kahulugan NAKA-MUTE · hook 5–8 words pattern interrupt · CTA walang peso sign · walang Grifon-style plates |
| **Internal dashboards / artifacts** | Artifact tool | Field-Ops-ticket language (ito ang piniling direction ni Neil 2026-07-27) · Taglish · `data-mono` allowed · **mandatory 390×844 smoke-tester gate + mobile-safe checklist sa CLAUDE.md** · walang client secrets/tokens · **placeholder/demo na numero ay dapat HALATANG peke** (tingnan ang Don'ts) |
| **Marvin mismo** (plates, stills) | `marvin-avatar` + identity-lock manifests | identity consistency ang batas — huwag i-style ang mukha; hindi token concern |

## Registered artifacts (i-redeploy sa SAME URLs)

- **KM-003 Page Launch — Run Sheet (2026-07-27):** ang limang organic post na
  kopya-paste habang nagpo-post sa phone, kasama ang pre-flight bago i-ON.
  `https://claude.ai/code/artifact/5952f7ba-859c-45b9-a295-fa8320c4d5d4`
  Source: `kuya-marvin/organic/PAGE-LAUNCH-POSTS.md`. Pumasa sa 390×844 gate.
- **KM-003 Launch dashboard — Field Ops Ticket (PINILI, on-brand recut 2026-07-27):**
  `https://claude.ai/code/artifact/b248874e-c6b2-4497-8fcc-a10c2666356f`
- **KM-003 LIVE Work Order (2026-07-28)** — ang tumatakbong dashboard: messages,
  gastos, kill-gate verdict, video funnel, per-day table. Kumukuha mismo sa Meta
  Ads via `mcp` capability (`ads_get_ad_entities`, 5-min refetch), hindi
  snapshot. Source: `kuya-marvin/ads/km-003/dashboard-live.html`. Pumasa sa
  390×844 gate.
  `https://claude.ai/code/artifact/4d411162-ba99-4e99-bd28-92ffc2dca6ba`
- KM-003 Launch dashboard — Abyss Command (option, hindi pinili):
  `https://claude.ai/code/artifact/51827976-482d-45d2-9f86-771aace25449`
- Kuya Marvin Messenger cheat sheet:
  `https://claude.ai/code/artifact/3c5a2aec-2c71-4866-b454-8a57530025de`

## Do's and Don'ts

**Do:**
- I-reference ang color roles (`primary`, `surface-deep`), hindi hex literals,
  sa bagong work; hilahin ang tokens sa frontmatter ng file na ito.
- Ayusin ang drift kapag hinawakan ang lumang file (`#FAB811` → `#F5B301`,
  `#5AA6E6`/`#3E8FD0` sa tamang role) — pero huwag mag-mass-edit.
- Basahin ulit ang file na ito bago gumawa ng bagong Oceanides visual.
- Idagdag dito (may petsa) ang bagong token/pattern na lumitaw sa totoong
  trabaho — doc muna, saka implementation.

**Don't:**
- 🔴 **Huwag ang asul na vacuum tanker.** (Neil, 2026-07-28) **Walang ganitong
  truck ang Oceanides** — imbentong sasakyan siya na lumabas sa mga
  identity-reference na generation (`identity-lock/marvin-taste-*`,
  `identity-lock/marvin-nano-*`, `Approved images from gpt 5.6/`). **Bawal sa
  lahat ng customer-facing surface**: post, ad, cover, profile, template.
  Ang **puting van** sa `profile-assets/` ang totoong fleet. Ang pagpapakita
  ng kagamitang wala ka ay hindi cosmetic na mali — sinungaling ang unang
  impresyon pagdating ng ibang truck. Identity-reference lang ang mga file na
  iyon (mukha ni Marvin), hindi asset ng sasakyan.
- 🔴 **Huwag ang kapani-paniwalang peke na numero sa demo/placeholder mode.**
  (Neil, 2026-07-28) Ang `?demo=1` ng live dashboard ay may ₱1,234.50 gastos at
  42 messages — makatuwirang laki para sa ₱500/araw na campaign. Nakita ni Neil
  ang smoke-test screenshot at inakalang totoo, at tama siyang magtaka: first
  day pa lang, ₱670 pa lang talaga. **Isang screenshot lang, wala nang konteksto
  ng URL.** Dalawang bagay ang kailangan: (1) **repdigit-9 na halaga**
  (`₱99,999`, `999`, `9.99%`) at petsang `1999` — walang campaign na ganito;
  (2) **`danger`-red na banner** na nasa taas bago ang unang panel. Bantayan din
  ang rounding: ang `₱9,999.99` ay nagiging `₱10,000` na mukhang totoo.
- Huwag ang Grifon system dito — walang `#FFCC00`, walang zinc/charcoal
  grounds, walang glass/backdrop-blur, walang MrBeast plates.
- Huwag ang safety orange `#FF8324` — deprecated (improvised bago naitala ang
  palette); ang hazard ay amber-on-navy.
- Huwag ang amber bilang status/semantic — `good`/`danger` ang status.
- Huwag maglagay ng text sa banned combos ng contrast floor (`#5B6B85` sa
  navy, white sa amber, amber text sa paper).
- Huwag takpan ang mukha ni Marvin, huwag i-fade ang hook overlay, huwag
  maglagay ng presyo sa CTA — production laws, hindi style preferences.
