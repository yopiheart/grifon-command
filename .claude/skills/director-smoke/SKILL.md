---
name: director-smoke
description: MANDATORY pre-flight for driving the Director AI wizard (the 8-step ad-creation flow) end-to-end as a smoke/manual test. Use BEFORE entering Director AI or filling ANY wizard field — whenever the task is to drive/test/smoke the wizard, render a full ad for testing, reach the AI Editor / FINAL_RENDER / Signal Modulator via a real wizard run, or "generate an N-scene ad" to exercise downstream pipelines. Enforces hero-image-FIRST, Market Research before Director, and NEVER manually typing brand/offer inputs. If you are about to click "Start with Director" for a test, this skill applies.
---

# Director AI smoke pre-flight (hero-FIRST)

**Why this exists:** Agents repeatedly drove the wizard wrong — invented a brand and
manually typed Step 1/2, or skipped Market Research — producing storyboards that don't
represent real beta-user output and wasting Veo/Kling render quota. Neil had to correct it
every time. This skill makes the rule trigger automatically. Source of truth + history:
[agent_lessons.md](../../../agent_lessons.md) (2026-05-24, refined 2026-05-26).

## The hard rules (do NOT improvise around these)

1. **NEVER manually type the brand name, offer, or Step 1/2 fields.** Those fields are
   meant to be **auto-prefilled** by the Market Research → "Send to Director AI" handoff.
   Typing them by hand means you're skipping Market Research and faking real-user flow.
   If a field is empty or shows `[object Object]` after Send-to-Director, that's a **real
   prefill bug — STOP and report it**, don't type around it.

2. **Hero image comes FIRST, and the brand is DERIVED from its label.** Don't invent a
   brand name and retrofit a photo. Find the photo first; read the brand off the label.

3. **Market Research (MarketMind) runs BEFORE Director AI** — always. Skipping it
   deterministically suppresses the script-angle picker at Step 3
   ([components/Step3AdScript.tsx](../../../components/Step3AdScript.tsx) ~L49-94) and
   starves Director of the market context that powers hook quality.

## The exact sequence

0. **Find a handheld hero product photo FIRST** — a *hand holding the product* (NOT a
   studio packshot, flat-lay, or gray-background shot) AND with a **readable brand label**.
   Handheld framing is what gives the storyboard a consistent product-size reference across
   scenes; a readable label is what lets Gemini Vision anchor product identity in Step 2.
   - Source a CC0/handheld photo with a visible label. If you can't find one for the brand
     you wanted, **abandon that brand** and use whatever brand's label appears on the best
     handheld photo you can source (Curology, The Ordinary, etc.). The cheapest internal
     smoke uses whatever real label you can get a good handheld shot of.
   - **Prefer to let Neil supply or approve the hero image** before generation — he has
     corrected brand-mismatched stock photos before.

1. **Derive the brand name from the visible label** on that photo.

2. **Run Market Research** with that label-matched brand + product name + description +
   price. Confirm the report surfaced (headlines/hooks/ads arrays present).

3. **Click "Send to Director AI"** from the Market Research result.

4. **VERIFY Step 1 + Step 2 auto-prefilled** — brand name, offer, product/service,
   audience, dream result, 3 AM worry, differentiator, features. No empties, no
   `[object Object]`. (If broken → STOP, it's a bug.)

5. **Upload the handheld hero at Step 2** → run AI Analysis → confirm it reads the right
   product + brand.

6. **Confirm the script-angle picker appears at Step 3** (proves Market Research context
   flowed through).

7. **Step 5 "VISUAL ASSETS MISSING" yellow banner is a HARD STOP**, not a warning to
   acknowledge and move past.

**If any check fails, PAUSE and ask Neil. Do not proceed to render.**

## Service businesses (no product)
Same gate with a hero/storefront photo — the Step 2 UI says "Service business? Upload hero
photo FIRST."
