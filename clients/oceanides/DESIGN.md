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

**Personnel retirement — 2026-10-11:** Neil removed Gabriel from the company and
stopped all projects/assets using his identity. Do not reuse, restore, generate,
or publish his likeness, voice, campaign or profile assets. This supersedes older
consent/approval notes. Historical financial records do not authorize reuse.

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
| `subhead` | **Anton**, 1.375rem mobile / 1.75rem desktop | Ang hakbang sa PAGITAN ng display at body. Kulay = `on-surface`, hindi accent — istraktura ito, hindi diin. Idinagdag 2026-08-01 (tingnan sa ibaba kung bakit) |
| `body-md` | **Inter** 400–800 | sentence case; 700–800 emphasis; `on-surface-muted` sa navy. 16px ang default; 17–18px sa mahabang babasahin |
| `label-strong` | Inter 800–900, 10–12px | uppercase, `letter-spacing 1–1.2px`, `sky` sa navy. **`<p>` o `<span>` LANG, kailanman hindi `<h1>`–`<h3>`** |
| `data-mono` | JetBrains Mono | internal dashboards/tickets LANG — hindi customer-facing creative |

### 🔴 Ang bitag: sapilitang Anton ang `h1`–`h3` (nahuli ni Neil 2026-08-01)

May global rule sa `index.css` na ang `h1, h2, h3` ay Anton + UPPERCASE. Kaya
**ang laman ng h-tag ay hindi kailanman magiging Inter**, kahit anong Tailwind
class ang ilagay mo.

Ang nangyari: isang maliit na label ang ginawang `<h3>` na may
`text-[11px] font-black uppercase`. Ang inaasahan ay 11px na Inter label. Ang
lumabas ay **Anton sa 11px** — condensed display face na sinisiksik sa laki ng
fine print, kaya mukhang sira, hindi lang maliit. (`font-black` naman ay walang
epekto: isang weight ang Anton.) Sabi ni Neil sa unang tingin: *"ang liliit ng
text? ung kulay blue at orange?"*

Dalawang rule na lumabas dito:

1. **Label = `<p>`. Heading = h-tag.** Kung maliit at uppercase, hindi sya
   h-tag. Lahat ng ibang maliit na label sa funnel (`SocialProofBar`,
   `ClientsMarquee`, `FieldInspector`) ay `<p>` — sundan sila.
2. **Kapag walang bagay sa laddder na bagay sa role, iyon ay gap ng sistema,
   hindi lisensya para pilitin ang pinakamalapit.** Walang `subhead` noon sa
   table sa itaas, kaya ang pinakamalapit na hinawakan ay `label-strong` — at
   ang maling role ang nagdala ng maling face, maling laki, at maling kulay
   nang sabay. Ang `subhead` na row ang pagsasara ng gap na iyon.

- **Anton ang display sa LAHAT ng surface** — stills, video captions
  (`build-captions.mjs` IMPACT chunk-pop grammar, exact drawPlan constants
  doon), dashboards. Iisang boses.
- Fallback stacks: Anton → `'Roboto Condensed','Arial Narrow',Impact` · Inter
  → `'Helvetica Neue',Arial`. **Sa artifacts** (CSP blocks font CDNs): walang
  Google Fonts `<link>` — condensed system stack o inline `@font-face` data
  URI lang. Sa `templates/` (nire-render lokal): Google Fonts OK.
- **Copy voice:** Taglish, kalmadong-eksperto —
  [`taglish-voice.md`](../../.claude/skills/_shared/taglish-voice.md). Mahabang
  copy ay kay `grifon-cmo`; ang design ay bumabalot.
  ⛔ **Hindi ratio ang rule, PAGHAHATI** (naitama 2026-08-06; ang lumang "50/50"
  dito ay superseded ng CLAUDE.md at ng `taglish-voice.md` §Mixing Ratio: *"Ang
  panuntunan ay hindi porsyento"*). English ang bagay at logistics (septic tank,
  price, truck, schedule, receipt); Tagalog ang pantao — ang awa, ang diagnosis,
  ang close. Kapag hinabol mo ang numero, napapalitan mo ang magandang Tagalog
  ng English na walang dahilan. Ang KM-003 hook ay purong Tagalog at **98.5% ang
  retention** sa 7,047 na tao; babagsak sya sa 50/50 na test.

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

## Layout: isang rail (Neil, 2026-07-30)

> *"Ung before & after headline/text hindi na igitna eto lang ang naiiba. Please
> sana matandaan mo lahat ng to. Dapat aligned yan bro."*

Hindi ito panlasa. **Print world ito**, at ang print ay nakapatong sa isang
kaliwang rail. Ang naka-gitnang column ay dating deck, hindi papel.

| Bahagi | Lapad | Puwesto |
|---|---|---|
| **Content sections** (presyo, kwento, objection, before/after, FAQ, form, P.S.) | `prose` (46rem) | Kaliwa. **Walang exception.** |
| **Bands** (hero, proof strip, footer) | `shell` (72rem) | Pwedeng gitna. Strip sila, hindi babasahing column. |
| **Hero** | `shell` | 🔴 **Ito lang ang naka-gitna.** Isang sandali, tapos bumabalik sa rail ang buong page. |

**Ang nangyaring pagkakamali:** nasa `shell` ang before/after habang nasa `prose`
ang lahat ng iba, kaya **208px ang layo ng gilid nya.** Hindi to makikita kapag
isang file lang ang binabasa mo. Lumalabas lang kapag nag-scroll ka at tumatalon
ang teksto sa gilid.

⚙️ **May bantay na ito ngayon:** `funnels/oceanides-price-page/scripts/lint-layout.mjs`,
naka-wire sa `prebuild`. Babagsak ang build kapag may section na lumihis sa rail
o nag-center nang walang karapatan. **Huwag itong ayusin sa pamamagitan ng
pagdagdag sa exception list** — ayusin ang section.

Katabi nya ang `lint-voice.mjs` na siyang bumabantay sa copy laban sa
[`taglish-voice.md`](../../.claude/skills/_shared/taglish-voice.md). Parehong
dahilan ang dalawa: **hindi umaasa sa pagtanda, gate ang gamit.**

## Registered artifacts (i-redeploy sa SAME URLs)

- **KM Value Week 01 — Posting Pack (2026-08-04):** ang weekly run sheet para sa admin
  ni Neil: 7 organic posts (Fibo-model value week), bawat isa may embedded na litrato
  (JPEG data URI, save-able), buong caption na may copy button, schedule (6PM kada araw),
  at mga bawal. **Ang HTML twin ang ipinapasa sa admin** (labas ng org ang admin, kaya
  hindi gagana sa kanya ang claude.ai link).
  `https://claude.ai/code/artifact/b07b1da9-eb0b-4787-b2ce-12a571e5f8de`
  🔗 **ANG LINK PARA SA ADMIN: `https://oceanidesph.com/pack/km-week-01.html`** — pangatlong
  kopya, naka-host sa price-page Vercel project (`public/pack/`, may noindex), kasi hindi
  kayang buksan ng labas-ng-org ang claude.ai link. Ang build script ang nagsusulat ng
  LAHAT ng kopya; pagkatapos ng rebuild, i-redeploy din ang funnel.
  Twin: [`artifacts/km-value-week-01.html`](../../artifacts/km-value-week-01.html) ·
  Build: `node tools/artifacts/build-km-week01-runsheet.mjs` (source of truth ng captions:
  `kuya-marvin/organic/VALUE-WEEK-01.md`; images: `organic/cards/` + `organic/stills-week01/`).
  Pumasa sa 390×844 gate 2026-08-04. ⚠️ Playwright MCP sa machine na to ay hinaharangan ang
  `file://` — ang smoke ng local HTML ay kailangan ng throwaway local HTTP server.

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

  🔴 **Tatlong aral sa `mcp`-capability artifacts** (2026-07-29, tatlong deploy
  bago gumana — huwag nang ulitin):
  1. **DISPLAY NAME ang tawag sa `callTool`, hindi ang tool-prefix segment.**
     Ang `claude_ai_Meta_Ads` ay `not_in_manifest`; **`Meta Ads`** ang tama.
     Nag-resolve nang tama ang MANIFEST sa segment — ang CALL lang ang mali,
     kaya mukhang tama ang lahat mula sa labas. **Huwag hulaan: kunin ang
     pangalan sa `listTools()` bago tumawag** (tingnan ang `resolveServer()`).
  2. **`callTool` ang pangunahing daan, hindi `watchTool`.** Tinatanggihan ang
     `watchTool` kapag may `readOnlyHint:false` ang tool, at kapag iyon lang
     ang daan mo, walang numerong lalabas. Gamitin ang `callTool` +
     `setInterval`; ang `watchTool` ay enhancement lang.
  3. **Ipakita ang error `code` sa screen.** Ang generic na "hindi ma-reach"
     na banner ay nagpabulag sa dalawang deploy. Isang `listTools()` diagnostic
     box ang nagsabi ng sagot sa isang tingin.
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
