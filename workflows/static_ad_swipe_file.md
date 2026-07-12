# Static Ad Swipe File

The compounding database of **static image ad** patterns worth stealing —
the still-image counterpart to `workflows/viral_swipe_file.md` (which is
*video*-only). Every reference ad gets a decoded entry (layout + the
persuasion lever it runs on + what Grifon can lift), patterns accumulate in the
index, and template proposals for **Image Ads Gen** (`generateAdCreatives` in
`services/geminiService.ts`) live as **Gated Proposals** until Neil approves.
Maintained by `grifon-creative-director` (visual DNA) + `grifon-cmo` (offer/lever
logic) when Neil drops a static ad to learn from. Feeds the
`grifon-ad-strategist` playbook (warm-retarget upsell angle).

**Ingest loop:** the **`static-autopsy`** skill drives it —
`tools/analyze_ad_image.mjs` has Gemini vision decode the ad and commits a
compressed copy of the source to `assets/ad-swipe/E<NN>-<brand-slug>.jpg`
(≤1080px / ~≤300KB JPEG), so the reference survives the cafe-PC defreezer. Each
entry links its image on the line under the heading (`![E<NN>](../assets/ad-swipe/E<NN>-<brand-slug>.jpg)`, relative from `workflows/`).
**Backfill rule (E1–E17):** a re-encountered ad that already has an entry does NOT
get a duplicate — attach its image to the existing entry via
`--ingest-only --entry E<n>` (no new entry, no Pattern bump).

**Cafe-PC rule:** commit every update immediately
(`swipe(static): add <slug>`). Uncommitted work dies with the reboot.

**The trust line (non-negotiable, both skills' hard constraint):** we steal
*structure and lever*, never the lie. No fake DMs, no fake countdowns, no
invented stats, no manufactured scarcity. Bryan's #1 objection is "just another
AI tool that lies" — trust is the brand asset. Real guarantee, real cohort cap,
real proof, or it doesn't ship.

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations / in a Gated
Proposal) → `applied` (shipped as an Image Ads Gen template or CMO playbook).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| S1 | **Risk-reversal headline / guarantee** — the promise IS the guarantee ("kick-off in 5 days OR all your money back"; "TRY RISK-FREE"; "30-day money-back"). Removes the buy-risk at the headline, not the fine print. | 6 (E1, E2, E3; E11 Grüns; E12, E17 IM8) | proposed |
| S2 | **Authority portrait hero** — founder cut-out, confident pose, gold rim-light on black; the *person* is the proof when there's no physical product. | 4 (E1–E4) | observed |
| S3 | **Ticket / tier comparison** — Free (dull, glass) vs paid (gold, glowing) cards side by side; anchoring makes the upgrade obvious. | 2 (E3, E2-partial) | observed |
| S4 | **Offer-stack checklist** — gold/green ✅ list of what they GET (calls, templates, bonuses) + guarantee tag. Reciprocity + commitment. | 2 (E2, E3) | observed |
| S5 | **Gold-on-black SaaS palette** — `#FFCC00`-class gold + near-black, glassy cards, gold lozenge "VIP/PRO" badge, gold gradient CTA bar. (Already Grifon's palette.) | 4 (E1–E4) | observed |
| S6 | **CTA-bar color A/B test** — same creative shipped with gold / green / blue "Learn more" bars across the set; they're testing button color, not just creative. | 3 (E1 gold, E2 green, E4 blue) | observed |
| S7 | **Fake-DM / manufactured scarcity** — "pre-approved," blurred meeting invite, "selecting a few people." **ANTI-PATTERN for Grifon** — recorded so we copy the *layout* (cohort offer) but never the fabrication. | 2 (E4, E1-urgency) | observed (do-not-replicate) |
| S8 | **Hyper-specific audience callout** — name the exact buyer in the hook ("If you own a *[niche]* doing *[revenue]*"; "on GLP-1"; "Women 40+"; "Postpartum…"). Self-identification + specificity (Sabri Suby dream-buyer). ONE template → N variants off a swapped variable. | **5 across 3 brands** (E5 service; E8/E11 Grüns; E13 IM8) | **proposed — strongest pattern, drives GP-2** |
| S9 | **Anti-design text-only pattern interrupt** — flat solid bg, centered white sans, zero imagery/logo/CTA button; reads as a personal note, not an ad. **Contradicts S5 + Grifon's cinematic brand** — adopt the copy mechanic; test the bare visual only as a deliberate experiment. | 1 (E5) | observed (brand-conflict) |
| S10 | **Value-first lead magnet (TOF)** — gives a free asset ("Scaling Roadmap", "FREE Starter Kit") to a cold dream-buyer. Top-of-funnel; the opposite end from the E1–E4 bottom-funnel upsell. | 2 (E5; E12 IM8) | observed |
| S11 | **Trend-hijack** — ride a live cultural wave so the ad feels like the moment, not a pitch (GLP-1 / Ozempic). Grifon's wave is **"AI"**. | 6 (E7, E8, E10 Grüns; E14, E16 IM8; E18 Cursor) | observed |
| S12 | **Pattern-interrupt hook** — curiosity/novelty/fake-apology that doesn't read as an ad ("We NEVER do this", "WE'RE SO SORRY"). | 2 (E6, E7 Grüns) | observed |
| S13 | **Mascot / recall device** — a repeated motif (gummy bear) carries instant brand ID. Grifon's mark + gold light-sweep is the under-used equivalent. | 1 (E6–E11 Grüns, one brand) | observed |
| S14 | **Full-canvas color A/B** — test the *whole background* color (green/yellow/blue/beige), not just the CTA. Extends S6. | 1 (E6–E11 Grüns, one brand) | observed |
| S15 | **Stat-stack proof** — numerals as proof, stacked ("21 vitamins. 20 cal. 1 net carb."). | 3 (E8, E10 Grüns; E14 IM8) | observed |
| S16 | **Borrowed authority** — social proof by association (celebrity / sports partnership: Inter Miami CF). Grifon = client logos / testimonials / "trusted by N PH businesses." | 1 (E15 IM8) | observed |
| S17 | **"Imagine…" future-pace + objection-handling** — paint the after-state, defuse the fear ("Imagine your GLP-1 journey, without the side effects"). | 1 (E16 IM8) | observed |
| S18 | **Style axis: premium-editorial vs flat-graphic** — IM8 (crimson, serif, lifestyle photography, restraint) vs Grüns (loud color-block, mascot, discount). **Grifon = the premium lane** (cinematic gold/black). | brand-level (Grüns flat E6–E11; IM8 premium E12–E17) | observed |
| S19 | **Placement / multi-ratio + safe-zone** — ship one creative as 4:5 (feed) + 1:1 + 9:16 (stories/reels), keeping text in the 9:16 central ~60% safe band; more ratios = more Andromeda inventory. See the Placement strategy section. | cross-set observation (+E18) | observed |
| S20 | **Product-UI-as-hero** — the actual product interface (a real screen/control, not a screenshot collage) is the ad's hero image; the feature demo IS the creative. Honest proof — fits the trust line. Grifon analog: One-Shot composer / wizard UI as the hero. | 1 (E18 Cursor) | observed |

## Gated Proposals

*Image Ads Gen template changes awaiting Neil. Editing `generateAdCreatives`
touches the **TUNED** `services/geminiService.ts` (locked per `services/CLAUDE.md`)
— neither skill applies this autonomously. Approve → surgical edit + vitest +
verify.*

### GP-1 — Add a "SaaS Offer / Upsell" template family to Image Ads Gen

**Why:** Image Ads Gen ships exactly 3 templates today — `Press Clip`,
`Benefit Anatomy`, `Split-Screen` (`services/geminiService.ts:2440`) — all
**physical-product** angles (they assume a device/product on screen; "screen
must face the viewer," "labels pointing to product features"). A
**software/service** offer has nothing to photograph: the hero is the *promise,
the guarantee, and the person*. This family covers the warm-retarget **Free→Pro→
Business** upsell that has no creative template today. Decoded from E1–E4 below.

**Funnel slot:** warm retargeting (registered-but-not-upgraded), CMO Priority #2
(Free→Pro) and #1 (Business/Autopilot). Distinct from cold free-signup ads.

**Proposed templates** (each = CMO angle + CD visual recipe):

**1. `Guarantee Hero`** *(from E1)* — risk-reversal as the headline.
- **CMO angle:** headline = the outcome fused to the guarantee. Pattern:
  "*<dream outcome> in <real timeframe> — or <real reversal>*." `hookLogic` =
  Risk-reversal + Authority. Guardrail: reversal must be a real, honored policy;
  timeframe must be deliverable.
- **CD recipe:** founder/avatar cut-out centered, confident pose, **gold
  rim-light + radial spotlight on `bg-zinc-950`**; gold lozenge brand badge over
  chest line; headline in white Inter ExtraBold with the guarantee clause in
  `#FFCC00`; gold-gradient pill CTA. Portrait sourced from the wizard **Avatar**
  / uploaded founder photo (Zam/Neil for Grifon's own ads).

**2. `Ticket Compare`** *(from E3)* — anchoring via tier contrast.
- **CMO angle:** two/three cards — current tier (dull) vs target tier (gold).
  Target card lists what they GET (outcome verbs, not features) + the guarantee
  line. `hookLogic` = Anchoring + Commitment-consistency. Guardrail: every line
  must be a real tier benefit; no unlimited promises (hard constraint).
- **CD recipe:** stacked glassy ticket cards (notched edges), free card
  `bg-zinc-900/80 border-white/10` muted, paid card gold border + gold glow
  `shadow-[0_0_20px_rgba(255,204,0,0.4)]` + gold "PRO/VIP" lozenge; headline
  "CHOOSE WHAT YOU WANT"; gold CTA bar.

**3. `Offer Stack Checklist`** *(from E2)* — reciprocity + guarantee.
- **CMO angle:** headline = the guarantee ("I'll give all your money back
  if…"); ✅ list of what they GET (calls, templates, bonuses); close with the
  penny-back tag. `hookLogic` = Reciprocity + Risk-reversal. Guardrail: bonuses
  listed must actually exist.
- **CD recipe:** smaller portrait top, gold/`#FFCC00` check rows on black, each
  row white Inter; guarantee tag in a gold-glow text line; gold CTA bar. (Note
  E2 shipped a **green** CTA bar — wire CTA-bar color as a variant field, S6.)

**4. `Authority Promise`** *(replaces E4's fake-DM)* — the clean, honest version.
- **CMO angle:** one face + one outcome headline, MrBeast-clean (3–6 words). If
  scarcity is used it's a **real** cohort cap ("12 seats this cohort"), never a
  fabricated DM. `hookLogic` = Authority + (optional real) Scarcity.
- **CD recipe:** large founder portrait, arms-wide/open pose, big gold
  `AI`-lozenge-style logotype, single white+gold headline, gold CTA bar. No
  mock UI, no fake invite (that's the E4 anti-pattern, S7).

**Build scope / open decisions (for the gated task):**
- `templateType` enum gains 4 values **or** a `family: "product" | "saas-offer"`
  selector so the generator picks the right set (cleaner than 7 flat types).
- New input needs: **guarantee text**, **tier names + what-you-get per tier**,
  **authority/founder image source**. Decide: derive from existing `UplinkData`
  (`originalPrice`/`offerPrice`/`keyFeatures`) or extend `UplinkData` + the
  `AdVariant` schema in `types.ts` (schema change → vitest under `tests/unit/`).
- Keep the existing `CRITICAL VISUAL RULE` for product templates; SaaS family
  swaps it for an **APPEARANCE/PORTRAIT rule** (founder faces viewer, consistent
  identity).
- All four inherit the **trust guardrail** in the prompt so the model cannot
  emit fake DMs, fake countdowns, or invented numbers.

### GP-2 — Add a "Niche Callout" text-only template to Image Ads Gen

**Why:** E5 (Sabri Suby / King Kong) — a minimalist self-ID callout that's a
long-running winner. Cheapest creative to produce (pure typography; arguably no
image model needed) and the **highest-leverage for Grifon**: spin one template
into N PH-niche variants for Bryan's sub-segments (coffee shop, salon, e-com
seller, real-estate, resto, online coach). **Funnel slot:** cold TOF lead magnet
— CMO Priority #3 (free-signup from cold traffic).

- **CMO angle:** copy = "If you run a *[specific PH niche]* *[doing $X / real
  qualifier]*, we built *[the free asset]* for you." Fill the niche variable per
  ad set. `hookLogic` = Specificity + Self-identification + pattern-interrupt.
  This *already* matches our copy rules ("write to ONE person"; "if the hook
  fits any SaaS, rewrite"). Guardrail: the qualifier and the free asset must be
  real.
- **CD decision (flag, decide at build):** the flat-navy anti-design (S9)
  **conflicts with DESIGN.md** (cinematic gold-on-black; "if it could belong to
  any brand it's wrong"). Two ships: **(i) Grifon-cinematic** — `bg-zinc-950`,
  white Inter, the niche + qualifier in `#FFCC00`, subtle gold glow (on-brand,
  recommended default); **(ii) bare pattern-interrupt** — flat dark, no brand,
  white text only (off-brand by design, run purely as a scroll-stop A/B).
  Recommend ship (i) default + (ii) as the variant.
- **Build scope:** smallest of any template — a typography-only generator that
  can skip the image model entirely. New `callout` family (or a type in
  `saas-offer`) + `niche` / `qualifier` / `leadMagnet` inputs. Same TUNED gating
  as GP-1.

### GP-3 — "Product Graphic" family (flat-graphic, Grüns-style)

**Why:** E6–E11 (Grüns). Flat brand-color canvas + bold display hook + product
hero + mascot motif + discount roundel + ✅ benefit checklist + scarcity bar. The
*loud / value* energy. E8 maps almost exactly onto the existing **Benefit
Anatomy** template — so GP-3 partly *upgrades* what's already there.
- **CMO:** hook types = curiosity pattern-interrupt (S12), trend-hijack (S11),
  audience callout (S8), stat-stack (S15). Guardrail: stats real; no fake
  scarcity; FDA/claim-style lines only if true (Grifon: no fake proof, ever).
- **CD:** flat brand-color background (color is an A/B variable, S14), condensed
  bold type as hero, product/asset hero, **Grifon mark as recall motif** (S13),
  reusable discount-roundel + scarcity-bar components. ⚠️ This is the *loud* lane
  — off Grifon's premium brand; reserve for value/discount offers, default to
  GP-4 for brand consistency.
- **Build:** same `captureToPng` pipeline; product shot from `generateSceneImage`
  (text-free) + graphic text overlay. Family `product-graphic`.

### GP-4 — "Premium Lifestyle" family (IM8-style) — Grifon's natural lane

**Why:** E9, E12–E17 (IM8 + Grüns-premium). Premium photoreal lifestyle/product-
in-light + restrained type + benefit chips + a single gold CTA + optional
social-proof strip. This is the lane Grifon's cinematic gold/black already lives
in — highest brand fit.
- **CMO:** hooks = audience callout (S8), "Imagine…" future-pace (S17), pain-state
  (E17), trend-hijack (S11), borrowed authority (S16). Outcome-framed, never
  feature-listed.
- **CD:** `generateSceneImage` makes the premium lifestyle/product shot (text-
  free — its strength), then `captureToPng` overlays: headline with a **gold→
  transparent scrim for guaranteed contrast** (fixes IM8's readability wobble),
  benefit chips, ONE gold `#FFCC00` CTA (fixes IM8's drifting CTA colors), Grifon
  corner motif. Family `product-lifestyle`. Multi-ratio + safe-zone aware (S19).
- **Note:** GP-4 and GP-1 (SaaS upsell) share the *exact* architecture
  (text-free background + branded overlay) — build GP-1 and GP-4 reuse the same
  composite path.

## Cross-Vertical Pattern Map

These patterns are **not** about supplements or coaching — they're portable
persuasion templates. The same engine + the family selector spins variants for
any Grifon vertical. This is the reusable map (and the answer to "can we apply
this to Grifon / personal brand / SaaS / services / app / real estate").

| Pattern | Grifon translation across verticals |
| --- | --- |
| **Audience callout** (S8) | SaaS: "For PH coaches who hate posting." · Real estate: "For agents doing 2+ closings/mo." · Services: "For salons booked solid but invisible online." |
| **Trend-hijack** (S11) | Ride **"AI"**: "Your AI marketing team for the price of one boosted post." Personal brand: "I replaced my agency with AI — here's the system." |
| **"Imagine… without [pain]"** (S17) | "Imagine launching a winning ad — without the ₱30K agency or the all-nighter." (app / services / personal brand identical) |
| **Benefit anatomy / checklist** (S4, S15) | Outcome ✅ list (never feature-list): "Ad script ✓ Storyboard ✓ Voiceover ✓ Caption ✓ — one sitting." Real estate: listing-feature checklist. |
| **Borrowed authority** (S16) | Client logos, "trusted by N PH businesses," a testimonial card. Personal brand: "as seen on / N followers." |
| **Risk-reversal / free starter** (S1, S10) | Free plan, "try risk-free," 30-day guarantee (GP-1 Guarantee Hero). |
| **Pain-state hook** (E17) | Name Bryan's bleeding neck: "The end of 'I spent ₱15K on ads and got 2 sales.'" |

## Placement & Aspect-Ratio Strategy

Shipping one creative in multiple ratios is deliberate **placement optimization**,
not indecision (Neil's observation, 2026-06-20). Each placement has a native
shape; give only one ratio and the platform auto-crops the rest, chopping the
headline/CTA. Fix = supply the right ratio per placement (Meta **placement asset
customization**).

| Ratio | Placement | Why |
| --- | --- | --- |
| **4:5** (1080×1350) | Feed (default) | Tallest in-feed = most thumb-stopping real estate, often lower CPM |
| **1:1** (1080×1080) | Feed / Explore | Universal, never cropped oddly |
| **9:16** (1080×1920) | Stories / Reels / TikTok | Full-screen immersive |

**9:16 safe zone:** top ~14% (header) and bottom ~20–35% (caption + CTA + icon
rail) are covered by UI — keep all text/product in the central **~60% safe band**.

**Build implication:** because templates render via `captureToPng`, exporting all
three ratios is nearly free — re-render the same React card at each canvas size
with safe-zone padding tokens. **Bake safe-zone awareness in from GP-2; multi-ratio
export turns Grifon from "makes an image" into "makes a placement-ready ad set."**
More ratios also = more inventory for Andromeda to retrieve against. Logged to the
`grifon-ad-strategist` playbook.

## Entries

Append newest at the top. Each entry's second line is its committed image
(`![E<NN>](../assets/ad-swipe/E<NN>-<brand-slug>.jpg)`) — E1–E17 backfill their
image link as they're re-encountered via `--ingest-only`.

### 2026-07-12 — E18 Cursor "Choose the best model for every task." (fb-ad-library, SaaS dev tool)
![E18](../assets/ad-swipe/E18-cursor.jpg)
**Why swiped:** first tool-ingested entry (static-autopsy pipeline verification) + Cursor is a top-tier SaaS advertiser in Grifon's own category register. · **Format:** 9:16 story, product-hero/feature-showcase.
**Layout:** dark-gray abstract 3D geometric background; white Cursor logo top-center; centered white sans-serif headline below it; a floating light-gray dropdown-menu UI card dead-center listing five AI models with "Composer 2.5" highlighted in orange + checkmark. All text inside the 9:16 central safe band.
**Copy (verbatim):** "Choose the best model for every task." — no CTA on-creative (relies on the platform button).
**Visual DNA:** `#E05B35` orange accent (active selection) on grays (`#EAEAEA` card, `#2B2B2B` shadow, white text); SF-Pro/Inter-class type, mixed case, medium weight; symmetrical centered composition, generous negative space; premium-editorial register (S18 premium lane).
**Levers:** model-optionality promise ("Choose the best model for every task.") + name-dropping recognizable model families (Opus, GPT, Sonnet, Codex) to ride the AI wave. *Corrected a Gemini misread: it flagged the version numbers as "speculative/future-pacing" — they're real current models; the lever is optionality + trend-riding, not future-pacing.*
**Weaknesses / trust flags:** no on-creative CTA; too abstract for non-technical buyers. Trust flags: none.
**So What for Grifon:** the product's real UI as the ad's hero is the honest-proof version of a product shot — Grifon can run its own One-Shot composer / wizard UI as the hero of an image ad (fits the trust line: show the actual product). Premium-editorial gray+accent also shows S18's premium lane works with a non-gold accent — Grifon keeps gold.
**Patterns:** corroborates S11 (AI trend-riding via model names), S19 (9:16 safe-band discipline); new candidate: **S20 product-UI-as-hero**; contradicts: none.

### 2026-06-20 — E6 Grüns "We NEVER do this!" (IG, DTC supplement / greens gummies)
**Levers:** pattern-interrupt curiosity hook (S12) + discount roundel ("61% OFF + FREE GIFTS") + scarcity bar ("ENDING SOON") + product pouch hero + gummy-bear mascot (S13) on flat green (S14).
**So What:** GP-3 flat-graphic. The "we never do this" curiosity hook is platform- and vertical-agnostic — reusable for a Grifon limited-offer. **Patterns:** S12, S13, S14, S6 (scarcity bar).

### 2026-06-20 — E7 Grüns "WE'RE SO SORRY!" (IG, DTC supplement)
**Levers:** fake-apology pattern-interrupt (S12) + reciprocity ("make it right" → 61% off) + education (serving = 12 cups raw broccoli fiber) + GLP-1 trend-hijack (S11).
**So What:** the apology-reframe is a strong cold hook; GP-3. **Patterns:** S11, S12.

### 2026-06-20 — E8 Grüns "Help keep your sh*t moving on GLP-1" (IG, DTC supplement)
**Levers:** crude/relatable problem callout + **audience callout "on GLP-1"** (S8) + GLP-1 trend (S11) + benefit anatomy (✅ more fiber than 2 cups broccoli / 20+ vitamins / 20 cal, S15) + "52% OFF" bar + FDA fine print.
**So What:** this *is* the existing **Benefit Anatomy** template, premium-ized → GP-3 upgrades it. **Patterns:** S8, S11, S15.

### 2026-06-20 — E9 Grüns "Ozempic's New Bestie" (IG, DTC supplement — premium variant)
**Levers:** trend-association headline (S11) + premium minimal aesthetic (beige, green serif, single giant gummy hero) + crude humor ("1 pack a day → More 💩").
**So What:** proves even Grüns goes *premium* for a segment → the style axis (S18). GP-4-adjacent. **Patterns:** S11, S18 (premium).

### 2026-06-20 — E10 Grüns "Shedding pounds? Don't shed your nutrition." (IG, DTC supplement)
**Levers:** wordplay hook + weight-loss/GLP-1 trend (S11) + stat-stack ("21 vitamins. 20 cal. 1 net carb.", S15) on flat yellow (S14).
**So What:** stat-stack proof transfers cleanly to SaaS ("3 modules. 1 ad. 0 agency."). GP-3. **Patterns:** S11, S14, S15.

### 2026-06-20 — E11 Grüns "Postpartum hair shedding is a whole thing" (IG, DTC supplement)
**Levers:** **hyper-specific audience callout** (postpartum moms, S8) + ingredient education (biotin/zinc/iron/A/D) + "61% off + free gifts" + **30-DAY money-back badge** (S1) on flat blue (S14).
**So What:** audience callout corroborates S8; guarantee badge is a reusable component. GP-3. **Patterns:** S8, S1, S14.

### 2026-06-20 — E12 IM8 "Claim Your FREE Starter Kit" (IG, premium DTC supplement)
**Levers:** reciprocity / tripwire (free starter kit, S10) + premium gifting (red box + gold bow) + aspirational context (gym) + white serif restraint.
**So What:** free-starter TOF offer in the *premium* lane → GP-4. **Patterns:** S10, S1 (free), S18 (premium).

### 2026-06-20 — E13 IM8 "The Daily Foundation for Women 40+" (IG, premium DTC supplement)
**Levers:** **audience callout** (Women 40+, S8) + relatable-model-as-authority (target holds product, smiles) + single orange "SHOP NOW" pill on red gradient.
**So What:** audience callout (3rd brand → S8 now proposed). Model-as-proof = a Grifon avatar holding the "result." GP-4. **Patterns:** S8, S18.

### 2026-06-20 — E14 IM8 "Every Nutrient Your GLP-1 Depletes. Zero Nausea." (IG, premium DTC supplement)
**Levers:** trend-hijack (S11) + problem/solution (depletes → replenishes) + detailed benefit anatomy (✅ D3 250% DV, B12, Mg, Zn/Ca/Fe, probiotics, MSM, S15) + objection-handling ("zero nausea") + red CTA.
**So What:** premium **Benefit Anatomy** for an informed buyer → GP-4. **Patterns:** S8 (GLP-1 audience), S11, S15.

### 2026-06-20 — E15 IM8 "The Squad Has a New Daily Drink" (IG, premium DTC — Inter Miami CF)
**Levers:** **borrowed authority** (official partner of Inter Miami CF / Messi's club, S16) + announcement/news hook + premium product duo on dark.
**So What:** social proof by association → Grifon = client logos / testimonials / "trusted by N PH businesses." GP-4. **Patterns:** S16, S18.

### 2026-06-20 — E16 IM8 "Imagine Your GLP-1 Journey, Without the Side Effects" (IG, premium DTC supplement)
**Levers:** **"Imagine…" future-pace** + objection-handling (S17) + benefit chips (Gut feels normal / Energy stays / Hair full / Weight loss continues / Skin firm) + GLP-1 audience (S8/S11) + airy hands-passing-pen lifestyle.
**So What:** the "Imagine… without [pain]" hook + chip-row layout is a strong GP-4 template — maps to "Imagine launching an ad without the ₱30K agency." **Patterns:** S17, S11, S8.

### 2026-06-20 — E17 IM8 "The End of 'I'm Too Tired'" (IG, premium DTC supplement)
**Levers:** pain-state callout ("I'm too tired") + outcome ("smooth sustained energy, natural, all day") + **risk-reversal** ("TRY IM8 RISK-FREE", S1) on premium stone lifestyle.
**So What:** name-the-bleeding-neck hook + risk-free = a GP-4 template; for Grifon, name Bryan's pain directly. **Patterns:** S1, S18.

### 2026-06-20 — E5 Sabri Suby / King Kong "Scaling Roadmap" niche callout (FB/IG, B2B lead-gen) — 3 niche variants
**Why swiped:** Neil flagged it as a best-performing, long-running **active** ad from the Sabri Suby / King Kong stable (Sabri Suby = *Sell Like Crazy*, already canon in `grifon-cmo`). Long duration + still live = proven. **Format:** 4:5 / 1:1 feed static, text-only.
**Layout:** flat navy background, **no imagery, no logo, no CTA button**; one centered white sans paragraph; the **niche** and the **revenue qualifier** bolded. Observed variants (same creative, one swapped variable): "*machining* or *CNC business*," "*gutter installation company*," "*SEO agency*" — each "…doing $1M+ a year, we made this Scaling Roadmap for you."
**Levers:** Specificity + Self-identification (Sabri Suby dream-buyer callout) + Pattern-interrupt (looks like a personal message, not an ad) + Value-first lead magnet (free Scaling Roadmap).
**Weaknesses:** zero brand recall; rides entirely on copy; flat design conflicts with a cinematic brand.
**So What for Grifon:** the `Niche Callout` template (GP-2). The copy mechanic is pure CMO gold and matches rules we already run — spin per PH niche for Bryan's sub-segments. Decide cinematic-render vs bare pattern-interrupt at build.
**Patterns:** new candidates S8, S9, S10; corroborates the Sabri Suby specificity canon CMO already uses. Contradicts S5 (anti-design vs gold-on-black) — recorded as a deliberate brand decision, not an accident.

### 2026-06-20 — E1 Iman Gadzhi "Kick-Off in 5 Days or Money Back" (IG Sponsored, AI workshop/info-product)
**Why swiped:** long-running scaled upsell for a software/workshop offer; warm-audience retarget ("You already committed to watching the workshop…"). **Format:** 4:5 feed static.
**Layout:** authority portrait (arms crossed, glasses, black blazer) on gold-spotlit black → gold "AI INCOME [VIP] WORKSHOP" lozenge → headline "Get Your AI Online Business Ready to **Kick-Off in 5 Days** or **I Give All Your Money Back**" → gold-gradient pill CTA "UPGRADE TO VIP BEFORE IT'S TOO LATE" → gold "Learn more" bar.
**Levers:** Authority (portrait) + Risk-reversal (money back) + Urgency ("before it's too late").
**So What for Grifon:** the `Guarantee Hero` template (GP-1 #1). Risk-reversal headline > feature headline for warm upsell. Keep urgency only if a real deadline exists.
**Patterns:** S1, S2, S5, S6 (gold CTA); urgency edge of S7 (keep real).

### 2026-06-20 — E2 Iman Gadzhi "I'll Give All Your Money Back" + checklist (IG Sponsored)
**Why swiped:** pure risk-reversal + bonus-stack variant of the same campaign. **Format:** 4:5 feed static.
**Layout:** portrait (gray tee, open-hand shrug) → headline "**I'll give all your money back** if you're not 100% with the VIP Experience:" → ✅ list (Upgrade to VIP / Attend the 5 Implementation Calls / Get your business running / Compete for 5 MacBooks + 5 FaceTime Calls) → "💸 Still wasn't worth it? Get every single penny back" → gold-glow CTA "Click the button and upgrade now" → **green** "Learn more" bar.
**Levers:** Risk-reversal (dominant) + Reciprocity (MacBook bonuses) + Commitment (checklist).
**So What for Grifon:** the `Offer Stack Checklist` template (GP-1 #3). Note the green CTA bar — confirms they A/B CTA-bar color (S6); wire it as a variant field. Our bonuses must be real.
**Patterns:** S1, S2, S4, S5, S6 (green CTA).

### 2026-06-20 — E3 Iman Gadzhi "Choose What You Want — Free vs VIP Ticket" (IG Sponsored, @corybored repost)
**Why swiped:** the cleanest tier-anchoring creative in the set. **Format:** 4:5 feed static.
**Layout:** "CHOOSE WHAT YOU WANT WITH THIS WORKSHOP" → **FREE TICKET** card (dark/glass: "Learn the step-by-step / Do it yourself, no close guidance") → **VIP TICKET** card (gold, glowing: "We build your AI Business together, live / all the templates and workflows / ready to kick-off in 5 days / all your money back if not 100% satisfied") → "Click the button below to upgrade to VIP" → gold "Learn more" bar.
**Levers:** Anchoring/contrast (dull free vs gold VIP) + Commitment-consistency + Risk-reversal (in the VIP card).
**So What for Grifon:** the `Ticket Compare` template (GP-1 #2). Maps 1:1 onto Free → Pro → Business. The paid card must out-glow the free card (gold border + glow). No unlimited promises.
**Patterns:** S1 (in card), S3, S5, S6 (gold CTA).

### 2026-06-20 — E4 Iman Gadzhi "I'm Selecting a Few People" (IG Sponsored, reel-format static)
**Why swiped:** the scarcity/close creative — and the **anti-pattern** we record to NOT copy. **Format:** vertical reel still.
**Layout:** big gold "AI INCOME VIP WORKSHOP" logotype + arms-wide portrait → "I'M SELECTING A **FEW PEOPLE** to join me in **5 Private Implementation Calls**" → **mock DM / calendar invite** ("JANUARY 11 -12PM EST, Meeting ID…, Join Now") + "You've got pre-approved. All upside. No risk." → **blue** "Learn more" bar (Messenger-style).
**Levers:** Scarcity ("few people") + Social proof ("pre-approved") + Liking ("join me") — but executed via a **fabricated DM/invite**.
**So What for Grifon:** take the *cohort-offer layout* into `Authority Promise` (GP-1 #4) — but **strip the fake DM and "pre-approved."** Scarcity only as a real seat cap. This is S7, do-not-replicate. Blue CTA bar = third color in the A/B set (S6).
**Patterns:** S2, S5, S6 (blue CTA), **S7 (anti-pattern)**.
