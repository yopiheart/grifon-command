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
| S1 | **Risk-reversal headline / guarantee** — the promise IS the guarantee ("kick-off in 5 days OR all your money back"; "TRY RISK-FREE"; "30-day money-back"). Removes the buy-risk at the headline, not the fine print. | 7 (E1, E2, E3; E11, E26-var Grüns; E12, E17 IM8) | proposed |
| S2 | **Authority portrait hero** — founder cut-out, confident pose, gold rim-light on black; the *person* is the proof when there's no physical product. | 4 (E1–E4) | observed |
| S3 | **Ticket / tier comparison** — Free (dull, glass) vs paid (gold, glowing) cards side by side; anchoring makes the upgrade obvious. | 2 (E3, E2-partial) | observed |
| S4 | **Offer-stack checklist** — gold/green ✅ list of what they GET (calls, templates, bonuses) + guarantee tag. Reciprocity + commitment. | 2 (E2, E3) | observed |
| S5 | **Gold-on-black SaaS palette** — `#FFCC00`-class gold + near-black, glassy cards, gold lozenge "VIP/PRO" badge, gold gradient CTA bar. (Already Grifon's palette.) | 4 (E1–E4) | observed |
| S6 | **CTA-bar color A/B test** — same creative shipped with gold / green / blue "Learn more" bars across the set; they're testing button color, not just creative. | 3 (E1 gold, E2 green, E4 blue) | observed |
| S7 | **Fake-DM / manufactured interaction / manufactured scarcity** — "pre-approved," blurred meeting invite, "selecting a few people," staged AMA-sticker Q&A dressed as organic. **ANTI-PATTERN for Grifon** — recorded so we copy the *layout* (cohort offer, AMA-reply format) but never the fabrication. | 3 (E4, E1-urgency; E19 Grüns fake-AMA) | observed (do-not-replicate) |
| S8 | **Hyper-specific audience callout** — name the exact buyer in the hook ("If you own a *[niche]* doing *[revenue]*"; "on GLP-1"; "Women 40+"; "Postpartum…"). Self-identification + specificity (Sabri Suby dream-buyer). ONE template → N variants off a swapped variable. | **9 across 3 brands** (E5 service; E8/E11, E19, E20, E25, E26 Grüns; E13 IM8) | **proposed — strongest pattern, drives GP-2** |
| S9 | **Anti-design text-only pattern interrupt** — flat solid bg, centered white sans, zero imagery/logo/CTA button; reads as a personal note, not an ad. **Contradicts S5 + Grifon's cinematic brand** — adopt the copy mechanic; test the bare visual only as a deliberate experiment. | 2 across 2 brands (E5; E24 Grüns) | observed (brand-conflict) |
| S10 | **Value-first lead magnet (TOF)** — gives a free asset ("Scaling Roadmap", "FREE Starter Kit") to a cold dream-buyer. Top-of-funnel; the opposite end from the E1–E4 bottom-funnel upsell. | 2 (E5; E12 IM8) | observed |
| S11 | **Trend-hijack** — ride a live cultural wave so the ad feels like the moment, not a pitch (GLP-1 / Ozempic). Grifon's wave is **"AI"**. | 7 (E7, E8, E10, E29 Grüns; E14, E16 IM8; E18 Cursor) | observed |
| S12 | **Pattern-interrupt hook** — curiosity/novelty/apology/gross-out that doesn't read as an ad ("We NEVER do this", "WE'RE SO SORRY", "RABBIT POOPS?", "We're back."). | 4 (E6, E7, E21, E24 — all Grüns; single-brand-heavy) | observed |
| S13 | **Mascot / recall device** — a repeated motif (gummy bear) carries instant brand ID; E23 upgrades it from motif to *actor* (mascot golfing in the buyer's world). Grifon's mark + gold light-sweep is the under-used equivalent. | 2 (E6–E11; E23 mascot-as-actor — one brand) | observed |
| S14 | **Full-canvas color A/B** — test the *whole background* color (green/yellow/blue/beige), not just the CTA. Extends S6. | 2 (E6–E11; E21 dark-green/white re-skin — one brand) | observed |
| S15 | **Stat-stack proof** — numerals as proof, stacked ("21 vitamins. 20 cal. 1 net carb."; "60+ ingredients"). | 5 (E8, E10, E23, E26 Grüns; E14 IM8) | observed |
| S16 | **Borrowed authority** — social proof by association (celebrity / sports partnership: Inter Miami CF; Lisa Rinna campaign). Grifon = client logos / testimonials / "trusted by N PH businesses." | 2 across 2 brands (E15 IM8; E22 Grüns × Lisa Rinna) | observed |
| S17 | **"Imagine…" future-pace + objection-handling** — paint the after-state, defuse the fear ("Imagine your GLP-1 journey, without the side effects"). | 1 (E16 IM8) | observed |
| S18 | **Style axis: premium-editorial vs flat-graphic** — IM8 (crimson, serif, lifestyle photography, restraint) vs Grüns (loud color-block, mascot, discount). **Grifon = the premium lane** (cinematic gold/black). | brand-level (Grüns flat E6–E11; IM8 premium E12–E17) | observed |
| S19 | **Placement / multi-ratio + safe-zone** — ship one creative as 4:5 (feed) + 1:1 + 9:16 (stories/reels), keeping text in the 9:16 central ~60% safe band; more ratios = more Andromeda inventory. See the Placement strategy section. | cross-set observation (+E18) | observed |
| S20 | **Product-UI-as-hero** — the actual product interface (a real screen/control, not a screenshot collage) is the ad's hero image; the feature demo IS the creative. Honest proof — fits the trust line. Grifon analog: One-Shot composer / wizard UI as the hero. | 1 (E18 Cursor) | observed |
| S21 | **Native-format camouflage** — the ad dresses as organic platform UI (IG story AMA sticker, Close-Friends badge, caption cards, handle overlay) to bypass banner blindness. Slides into S7 the moment the interaction is faked — Grifon version uses REAL community questions only. | 2 (E19, E27 Grüns) | observed |
| S22 | **Category-king flex** — publicly acknowledge copycats/doubters to frame the brand as the original ("we see you, copycats."; "We hereby accept your apology."). Late-stage play — only works once you ARE the category leader. | 1 (E22 + variants, Grüns) | observed |
| S23 | **Real-scarcity nostalgia drop** — limited-edition collab with a legacy childhood brand (Grüns × Popsicle Firecracker), run as a full campaign system (flavor graphic + UGC + meme + text-only sellout apology). Scarcity is REAL (sold out, no restock) — passes the trust line. | 1 (E27 campaign, Grüns) | observed |
| S24 | **Format-enemy positioning** — villainize the incumbent *format/ritual*, not a competitor brand ("STOP CHOKING DOWN GRASS IN A GLASS. Measure. Blend. Gag. Scrub."; "STOP PUNISHING YOURSELF WITH POWDERS."). Grifon's enemy: the ₱30K agency retainer / DIY all-nighter. | 2 (E28; E29-var Grüns) | observed |
| S25 | **Uncanny meme creative** — toys/dolls/hand-drawn doodles ARE the whole ad (Barbie split-meme, marker-doodle pack shot). Feed-native, cheap, honest (nobody mistakes a doll for a fake testimonial). | 2 (E29, E30 Grüns) | observed |
| S26 | **Taboo/crude register** — bodily-function, profanity, and anatomical hooks matched per segment ("RABBIT POOPS?", "DON'T GHOST YOUR BALLS.", "F*CK YOU, HAIR LOSS"). Strong scroll-stop, brand-safety risk; off Grifon's premium register — the *mechanic* (name the unspoken pain bluntly) ports, the words don't. | 3 (E20, E21, E30 — one brand, below the independent-brand bar) | observed |

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

### 2026-07-12 — E30 Grüns "F*CK YOU, HAIR LOSS" (fb-ad-library, DTC supplement / greens gummies)
![E30](../assets/ad-swipe/E30-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, hand-illustrated product-hero.
**Layout:** the entire ad is a green marker doodle on white — huge hand-lettered headline top, benefit subhead + FDA fine print center, hand-drawn pouch bottom with 7 gummy bears peeking over its top edge.
**Copy (verbatim):** "F*CK YOU, HAIR LOSS" — "SUPPORT HEALTHY HAIR WITH ESSENTIAL NUTRIENTS LIKE BIOTIN, IRON, ZINC AND VITAMIN D*" — no CTA.
**Visual DNA:** `#00682B` doodle green + `#FFF200` logo yellow on plain white; zero photography, everything hand-lettered; loud flat-graphic register (S18 flat lane).
**Levers:** aggressive-empathy profanity hook (says the buyer's inner monologue verbatim) + mascot repetition (bears over the pouch lip, S13).
**Weaknesses / trust flags:** profanity risks ad-account/brand-safety flags; nothing fabricated.
**So What for Grifon:** the register is off-brand, but "print the user's inner monologue verbatim" ports cleanly (the cleaned-up "sayang ang ₱15K boost" energy). GP-3 family.
**Patterns:** corroborates S13, S18 (flat lane); new candidates S25 (hand-made creative), S26 (taboo register); contradicts none.

### 2026-07-12 — E29 Grüns "HOW I FEEL WHEN I POOP ONCE A WEEK / …FIBERMAXXING AND POOPING ONCE A DAY" (fb-ad-library, DTC supplement / greens gummies)
![E29](../assets/ad-swipe/E29-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, meme split-comparison.
**Layout:** white seamless bg; twin headlines top-left/top-right; left = frazzled Barbie doll clutching a bloated belly with a poop emoji on it; right = glam Barbie in sunglasses holding the green Grüns pack.
**Copy (verbatim):** "HOW I FEEL WHEN I POOP ONCE A WEEK" / "HOW I FEEL WHEN I'M FIBERMAXXING AND POOPING ONCE A DAY" — no CTA.
**Visual DNA:** `#FFFFFF` bg, `#E51A82` Barbie-pink outfits, Grüns-green pack; deadpan studio toy photography.
**Levers:** fibermaxxing trend-hijack (S11) + before/after transformation in one frame + meme-native format.
**Weaknesses / trust flags:** none — the doll makes the "transformation" honest (no fake human testimonial).
**So What for Grifon:** meme before/after is the cheapest honest transformation proof. Variant folder runs the same doll device against powders ("STOP PUNISHING YOURSELF WITH POWDERS." — gagging Barbie with green shake vs happy gummy Barbie), doubling as S24. GP-3.
**Patterns:** corroborates S11, S12 (meme interrupt); new candidates S25, S24 (via powders variant); contradicts none.

### 2026-07-12 — E28 Grüns "STOP CHOKING DOWN GRASS IN A GLASS." (fb-ad-library, DTC supplement / greens gummies)
![E28](../assets/ad-swipe/E28-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 9:16, old-way/new-way split.
**Layout:** top half black — headline + green-juice glass with a big red ✗ + pain-loop micro-copy; bottom half green — "INSTEAD TRY" + "GUMMY BEARS WITH BENEFITS.*" + gummy bear with green ✓.
**Copy (verbatim):** "STOP CHOKING DOWN GRASS IN A GLASS." — "Measure. Blend. Gag. Scrub. Repeat tomorrow." — "INSTEAD TRY GUMMY BEARS WITH BENEFITS.*"
**Visual DNA:** `#000000`/`#009E49` split canvas, `#F3D03B` yellow display type, `#E30613` red ✗; flat-graphic lane.
**Levers:** format-enemy positioning (villainize the incumbent ritual, not a brand) + pain-loop micro-copy (four verbs of drudgery) + ✗/✓ binary contrast. *Corrected a Gemini misread: it matched S3 (tier compare) — this is old-way-vs-new-way, not a pricing-tier compare; filed under new candidate S24 instead.*
**Weaknesses / trust flags:** none noted.
**So What for Grifon:** writes itself — "Stop choking down agency retainers. Brief. Wait. Revise. Repeat next month." Grifon's format-enemy is the retainer/DIY all-nighter. GP-3/GP-2 angle.
**Patterns:** corroborates S13; new candidate S24; contradicts none.

### 2026-07-12 — E27 Grüns × Popsicle "This new flavor took me back to my childhood." (fb-ad-library, DTC supplement / greens gummies)
![E27](../assets/ad-swipe/E27-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. Campaign spans 6 stash folders: flavor-picker graphic ("CHOOSE YOUR FLAVOR"), "YOUR GLP-1'S NEW BESTIE" raspberry-lemonade red flat, "SHOP OUR 4TH OF JULY SALE," beach UGC, a crying stick-figure meme ("how do u even taste like my childhood???" — that variant failed the specificity gate 2×, logged), and a text-only "WE'RE SORRY…" sellout note (device filed under E24). · **Format:** 4:5, UGC hand-held product still.
**Layout:** hand holds the red/white/blue Grüns × Popsicle Firecracker pouch over a lawn; two white caption cards — question top, lament right.
**Copy (verbatim):** "This new flavor took me back to my childhood. How are these greens gummies?" — "So sad they are a limited edition 😭" — no CTA.
**Visual DNA:** Popsicle co-brand `#E52325` red + `#1D70B8` blue on `#4E8752` grass; native-UGC register (S21).
**Levers:** nostalgia collab (borrowed childhood-brand equity kills the "healthy tastes bad" objection) + limited-drop scarcity. *Gemini flagged "manufactured scarcity" — cross-checked against the companion sellout note ("one of our fastest-moving flavors ever, and we're not making more"): the scarcity reads REAL. Trust line: usable only while true.*
**Weaknesses / trust flags:** benefits copy illegible at pouch bottom; no on-creative CTA.
**So What for Grifon:** a real limited drop (founding-member cohort, launch-window pricing) run as a full campaign SYSTEM — graphic + UGC + meme + signed note, one message. GP-4/GP-3.
**Patterns:** corroborates S11 (seasonal/nostalgia wave), S12; new candidates S21, S23; contradicts none.

### 2026-07-12 — E26 Grüns "POSTPARTUM?" iceberg (fb-ad-library, DTC supplement / greens gummies)
![E26](../assets/ad-swipe/E26-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, benefit-anatomy on a visual metaphor.
**Layout:** sky/sea scene; headline top; iceberg center — above the waterline chips "Poor sleep / Growing a new human / Tiredness"; below the waterline the hidden bulk + long copy; pouch + yellow "UP TO 61% OFF + FREE GIFTS" starburst bottom.
**Copy (verbatim):** "POSTPARTUM?" — "But it's also hair shedding, feeling foggy, occasional constipation, bones working harder, and immune changes." — "Support your body with 21 vitamins and minerals, every single day.*"
**Visual DNA:** `#5FA8D3` sky / `#0F4C81` deep water, `#FFD166` badge, green pouch; flat-graphic lane.
**Levers:** audience callout (postpartum moms, S8) + iceberg hidden-problem metaphor (surface symptoms vs what's really going on) + stat proof (S15).
**Weaknesses / trust flags:** none noted.
**Variants (same audience, 2 more folders):** "Dear Postpartum Mom," letter-format on sky (empathetic long-copy note, green CTA pill) and "not a prenatal" repeat-text wallpaper with a **30-DAY Money-back badge** (S1).
**So What for Grifon:** the iceberg surface-vs-hidden layout is a ready template — "Ads not converting? [surface] But it's also the hook, the offer, the targeting… [hidden]." Grüns runs 3 distinct creatives on ONE segment — per-segment mini-campaigns, not one-off ads. GP-4.
**Patterns:** corroborates S8, S15, S1 (variant badge); new candidate none (metaphor-infographic layout worth watching); contradicts none.

### 2026-07-12 — E25 Grüns "Perimenopause impacting sexual desire?" (fb-ad-library, DTC supplement / greens gummies)
![E25](../assets/ad-swipe/E25-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, lifestyle photo.
**Layout:** photo of a couple's bare feet entwined in bed fills the frame; gold headline lower third; two body lines below; two green gummies "spooning" bottom-right mirror the couple; FDA fine print.
**Copy (verbatim):** "Perimenopause impacting sexual desire?" — "Zinc helps support healthy sexual function and intimacy.*" — "Support your body with essential nutrients." — no CTA.
**Visual DNA:** muted blue-gray linens `#8FA9C4`, `#F5C134` gold headline; quieter, photo-led register than the flat Grüns lane.
**Levers:** taboo-direct audience callout (midlife women, S8) + product-staging metaphor (the gummies act out the promise).
**Weaknesses / trust flags:** none noted.
**Variants (same segment, 2 more folders):** "Support Your Body Through Perimenopause" benefit-chip graphic (B vitamins / fiber / vitamin E / D3&K2 + "55k+ 5 star reviews") and "MIDLIFE NIGHT SWEATS HIT HARD" illustrated night scene — provocative photo + chips + illustration = one segment, three creative systems.
**So What for Grifon:** name the awkward pain the audience won't say out loud, tastefully — and build a per-segment creative SYSTEM (S8 playbook + GP-4), not a single ad.
**Patterns:** corroborates S8, S13, S15 (chips variant); new candidate none; contradicts none.

### 2026-07-12 — E24 Grüns "We're back." (fb-ad-library, DTC supplement / greens gummies)
![E24](../assets/ad-swipe/E24-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, text-only-callout.
**Layout:** near-black canvas; centered 😬 emoji, bold headline, four-line body, signed "— Grüns". No product, no logo lockup, no CTA button.
**Copy (verbatim):** "We're back." — "And we're giving you 61% OFF your first order plus free gifts, because that's the least we can do for your gut'" — "— Grüns"
**Visual DNA:** `#0B1511` near-black, white sans text; the emoji is the only color. Pure anti-design (S9).
**Levers:** pattern-interrupt personal note (reads as an announcement, not an ad) + compensatory-discount framing (the discount has a *reason*).
**Weaknesses / trust flags:** zero brand recall if you don't read; typo/stray apostrophe in body ("your gut'") — shipped anyway.
**Variant (same device):** "WE'RE SORRY… but we underestimated how much you'd love Popsicle® Firecracker" — the same signed text-only black note as the E27 campaign's sellout apology (also corroborates E7's apology hook, S12).
**So What for Grifon:** 2nd brand running text-only anti-design → S9 is now cross-brand. The signed-note format ("— Grifon") is a near-free, high-trust announcement template for launches/comebacks; give every discount a stated reason.
**Patterns:** corroborates S9 (2nd brand), S12; new candidate none; contradicts S5 (deliberately, like E5).

### 2026-07-12 — E23 Grüns "2 KINDS OF GREENS." golfing bear (fb-ad-library, DTC supplement / greens gummies)
![E23](../assets/ad-swipe/E23-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, 3D mascot scene.
**Layout:** golf-course photo; hook line top-left; giant cream numeral "2" left; 3D-rendered gummy bear in white cap + green polo mid-swing over a golf ball; yellow display line lower third; two-line sign-off bottom.
**Copy (verbatim):** "60+ ingredients, including the greens you're definitely not eating out here." — "2 KINDS OF GREENS." — "Grüns handles the nutrition.* You handle the short game."
**Visual DNA:** `#F2C938` yellow display + `#FDF6E2` cream on course greens; premium 3D mascot render.
**Levers:** mascot-as-character activation (S13 upgraded from motif to actor) + "greens" double-meaning wordplay + contextual hobby targeting (golfers — S8-adjacent interest callout).
**Weaknesses / trust flags:** none noted.
**So What for Grifon:** dropping the mascot INTO the buyer's world creates interest-targeted ad sets with zero new offer work — the griffin mark could golf/cook/close deals the same way (S13's noted under-use).
**Patterns:** corroborates S13 (as actor), S15 ("60+ ingredients"); new candidate none; contradicts none.

### 2026-07-12 — E22 Grüns "we see you, copycats." feat. Lisa Rinna (fb-ad-library, DTC supplement / greens gummies)
![E22](../assets/ad-swipe/E22-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, color-block quadrant grid.
**Layout:** green/yellow quadrants; lowercase headline top-left; top-right photo of Lisa Rinna inspecting a gummy through a magnifying glass with script "Lisa Rinna" annotation + arrow; two giant gummies left; copy right; grüns logotype bottom-right.
**Copy (verbatim):** "we see you, copycats." — "Keep it coming." — "No one does greens gummies better."
**Visual DNA:** `#00723F` green + `#FCD116` yellow color-block (S14 family); flat-graphic lane.
**Levers:** borrowed authority (celebrity, S16 — 2nd brand after IM8's Inter Miami) + category-king flex (acknowledging copycats frames you as the original).
**Weaknesses / trust flags:** none noted.
**Variants (same confidence campaign, 3 more folders):** chat-bubble timeline "we'd copy us too." (receipts-style origin story); strikethrough "'Gummies are BS, and would never work'" → "We hereby accept your apology." (objection-crush flex); Rinna Miranda-parody "You have the right to remain healthy. Anything you blend can and will be used against you."
**So What for Grifon:** category-king flex is a LATER-stage play (you must be the leader first) — but the objection-strikethrough device ("AI ads look generic" struck through, red pen) is usable now. GP-3.
**Patterns:** corroborates S16 (2nd brand), S12, S13; new candidate S22; contradicts none.

### 2026-07-12 — E21 Grüns "RABBIT POOPS?" (fb-ad-library, DTC supplement / greens gummies)
![E21](../assets/ad-swipe/E21-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, product-hero with shock prop.
**Layout:** dark-green canvas; cream display headline top; centered studio photo of a pile of rabbit-pellet-like poops; bottom row = pouch thumbnail + two-line fix + green CTA pill.
**Copy (verbatim):** "RABBIT POOPS?" — "You may need more fiber. Try Grüns and get 6g of fiber daily." — CTA "Get up to 61% off + free gifts" (green pill `#008543`).
**Visual DNA:** `#1E3020` canvas, `#F5EFE4` cream type; deadpan premium product-photography treatment of a gross subject — the contrast IS the joke.
**Levers:** gross-out visceral pattern-interrupt (show the symptom as an object instead of saying it) + stat proof ("6g of fiber daily", S15-adjacent).
**Weaknesses / trust flags:** none — symptom depiction is honest, no fake claims.
**Variant:** white/photo-canvas re-skin ("if your poop looks like this… you probably need more fiber", UGC hand of gummies below) — same concept, opposite canvas = the full-canvas color A/B (S14) caught in the wild.
**So What for Grifon:** "make the invisible problem visible as an object" ports without the crudeness — e.g. the stack of 47 seen-zoned customer DMs as the hero image. GP-3.
**Patterns:** corroborates S12, S13, S14; new candidate S26; contradicts none.

### 2026-07-12 — E20 Grüns "DON'T GHOST YOUR BALLS." (fb-ad-library, DTC supplement / greens gummies)
![E20](../assets/ad-swipe/E20-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 4:5, photo-led shock callout.
**Layout:** close-crop photo of a seated man's athletic shorts (crotch-level, deliberately suggestive) fills the canvas; stacked centered type mid-frame — white line 1, yellow line 2; subhead below; green CTA pill; grüns logo; FDA fine print bottom.
**Copy (verbatim):** "DON'T GHOST YOUR BALLS." — "THEY NEED VITAMINS TOO." — "Support male reproductive health with daily nutrition.*" — CTA "GET UP TO 61% OFF + FREE GIFTS" (`#0F8A5F` pill).
**Visual DNA:** `#4A5335` olive shorts as full-bleed canvas, `#F4D03F` yellow payoff line; photo + big type, flat lane.
**Levers:** taboo anatomical humor as scroll-stop + hyper-specific audience callout (men ignoring reproductive health, S8) + discount CTA.
**Weaknesses / trust flags:** brand-safety risk; nothing fabricated.
**So What for Grifon:** the real signal is SEGMENT-OPENING — Grüns uses a taboo hook to unlock a brand-new audience (men/fertility) for the same product. The segmentation move is the steal, not the register. GP-3.
**Patterns:** corroborates S8; new candidate S26; contradicts none.

### 2026-07-12 — E19 Grüns fake-AMA story "Any tips for a guy trying to have a kid?" (fb-ad-library, DTC supplement / greens gummies)
![E19](../assets/ad-swipe/E19-gruns.jpg)
**Why swiped:** AD FILES stash batch 2026-07-12 — Meta Ad Library pull; Downloads folder dies on reboot so ingest now. · **Format:** 9:16, native IG-story replica.
**Layout:** full fake IG story — "glp_matt" handle + green Close-Friends star badge top; white AMA sticker "Ask me anything!" + question card upper third; shirtless guy holding the green pouch beside his face; three white caption cards stacked over the lower half answering the question.
**Copy (verbatim):** "Any tips for a guy trying to have a kid?" — "Yeah dude, my gf kept telling me nutrition matters a lot. Apparently sperm takes like 74 days to develop, so what you're eating now actually counts." — "…selenium, zinc, antioxidants… support male reproductive health." — "You can get up to 61% off + free gifts rn"
**Visual DNA:** `#1B7A43` pouch green + `#FCD116` mascot yellow; `#00E676` Close-Friends badge — platform-UI mimicry is the aesthetic (S21).
**Levers:** native Q&A-sticker camouflage (ad disguised as an organic story reply) + male-fertility audience callout (S8) + specificity proof ("sperm takes like 74 days to develop").
**Weaknesses / trust flags:** the Q&A interaction is MANUFACTURED — a staged sticker dressed as organic. S7-class: steal the format, never fake the interaction.
**So What for Grifon:** the honest version = screenshot a REAL community/support question (with permission) and answer it in-story as Zam/Neil. Also note: paired with E20, Grüns attacks the same new segment (male fertility) in two registers at once.
**Patterns:** corroborates S7 (3rd corroboration — anti-pattern confirmed cross-brand), S8, S13; new candidate S21; contradicts none.

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
![E8](../assets/ad-swipe/E8-gruns.jpg)
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
