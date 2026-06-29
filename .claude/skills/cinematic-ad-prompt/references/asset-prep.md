# Asset Prep & Iteration Discipline (Step 1 + Step 3)

Shared by `cinematic-ad-prompt` and `seedance-shotlist-director`. This is the part that separates ultra-real ads from AI slop: **you lock your assets BEFORE you prompt video, and you treat video as a high-volume harvest, not a one-pass render.** Distilled from the "3-Step Workflow to Make Ultra-Realistic AI Ads" brief (by Adil) and consistent with our Seedance / Codex (gpt-image-2) doctrine (`seedance-4k.md`).

> Core truth: *"The finished ad is just the best few seconds out of 100 tries cut together. Iteration is the skill."* And: *"A face that looks great as a still might fall apart the moment it moves."* Build references first, stress-test them, then harvest.

## The contrarian rule that governs everything

**Don't over-prompt with text. Lock with assets.** High-fidelity comes from **structural reference sheets + 2D map layouts + multi-layered image attachments**, not from piling on adjectives in the video generator. Long descriptive text burns credits and gives generic output. Write *less* text; attach *better* assets.

This is why the workflow is: **generate assets (images) → freeze them → feed them to Seedance as image-to-video.** Images are cheap; videos aren't.

---

## Step 1 — Lock the assets

### A. Character sheet (freeze the human's geometry)

Generate the human ONCE as a clean reference sheet, then every shot pulls from it so the face/wardrobe never drifts. **No real-face uploads** — you *generate* the person via **Codex `gpt-image-2`** (the `codex-image` skill). The sample sheets Neil provided are the exact target:

**Layout — 3 panels, neutral grey seamless background:**
1. **Tight close-up** — pore-level face: vellus hair, asymmetric moles, capillary flush, real catch-lights in the eyes. This panel is what locks identity.
2. **Front full-body** — full wardrobe, head to shoes, arms relaxed at sides, neutral stance.
3. **Back full-body** — same wardrobe from behind (lets the video engine hold the character during turns/walk-aways).

**Rules:**
- **Neutral grey seamless**, even light — kill background clutter so the generator focuses on the person.
- **Erase stray/extra faces** from the sheet (image editor) so the video model locks ONE identity — extra faces cause drift.
- **State-variants = separate sheets.** If the character changes mid-ad (dry → drenched after a run; calm → bloodied; day look → night look), **build a second sheet for that state** and swap it in at the transition. Don't fight one reference with text. *"If your character has to change mid-sentence, don't fight one reference — build a second."*
- **Side characters:** spin styling variations from the same Codex `gpt-image-2` sheet recipe (one prompt per variant) — fast auxiliary casting without a full sheet each.

**Codex (gpt-image-2) prompt skeleton for a character sheet:**
```
A character reference sheet on a neutral mid-grey seamless background, even soft studio light. Three panels side by side:
(1) tight head-and-shoulders close-up — pore-level photoreal skin, vellus hair, faint freckles, living eyes with catch-lights;
(2) full-body front, standing relaxed, arms at sides;
(3) full-body back, same pose.
Same person in all three, identical wardrobe: [describe wardrobe precisely]. [Age, build, hair, distinguishing features].
Photoreal, no 3D render. One person only — no other faces anywhere in the frame.
```

### B. Product sheet (freeze the product's geometry) — Codex (gpt-image-2)

Multi-angle perspective sheet so the product holds shape under camera moves. The sneaker sample = the target: **lateral L, lateral R, top-down, 3/4 hero, heel/back, sole.**

```
A product reference sheet on a clean light-grey seamless, soft even studio light. Multiple angles of the SAME [product]:
lateral left, lateral right, top-down, 3/4 front hero, heel/back, and underside/sole.
Photoreal, crisp, accurate proportions. Logo/label reads exactly "[BRAND]", razor-sharp and correctly spelled. Consistent colorway across every angle: [colors].
```
Use Codex (gpt-image-2) for anything with **readable text** (labels, packaging) and **precise layout** — it's the strongest at both.

### C. Location plates — 3/4 angle, not flat-on

Generate environments at a **3/4 perspective** so the video engine has real geometric depth to hold during pans/dollies. A dead-on flat wall gives the engine nothing to track and warps under motion. *"If your location looks fake or plasticky, no prompting will ever save it."* Build the key locations as their own stills first.

### D. Map / blueprint schematics (spatial anchoring) — Codex (gpt-image-2)

When objects must stay in fixed positions across multiple generations (a prop next to a fire hydrant; product on the left third every shot), feed a **2D top-down layout/blueprint** first, then tie the prompt's spatial prose to that schematic. Forces scale + position consistency without burning credits on reroll lottery.

---

### E. Storyboard grid sheet (fast, credit-cheap previz)

Instead of N separate keyframes, generate **one** Codex `gpt-image-2` image containing **all N panels in a grid** — a whole storyboard on a single sheet. Cheapest way to concept a full ad (especially motion design / logo ads) before spending on per-shot fidelity or any video.

```
Storyboard sheet, [N] sequential panels in a clean grid, thin borders, each panel labelled "Frame 1"…"Frame N".
Frame 1: [scene/beat]. Frame 2: [beat]. … Frame N: [logo-lock / brand name].
Each panel: [camera angle], [motion state], [mood/lighting]. Consistent [color palette / brand system] throughout.
Visual style: [cinematic | classicMD | highMD]. [aspect] per panel.
```

**Trade-off:** the grid sheet is *concepting* — fast and cheap to iterate the whole arc. For the actual render, generate the chosen panels as **full-resolution per-shot keyframes** (the recipes above) and drive Seedance from those. Use the sheet to lock the story; use per-shot keyframes to lock the fidelity.

## Asset testing — the single-variable validation test

Before committing to full production, **stress-test each asset under an identical motion baseline**, changing **one variable at a time**:
- Run candidate character A vs B through the *same* simple motion prompt (e.g. "slow walk toward camera, slight head turn"). Keep everything else identical. See which face/body holds up under motion.
- Same for locations and products.
- *"An image that looks impeccable as a still will frequently tear apart the moment motion physics are applied."* A still is a hypothesis; the baseline video run is the test. Only promote assets that survive.

This costs a few cheap generations and saves dozens of wasted production renders.

---

## Step 3 — Iteration discipline (how the shots actually get made)

### Granular choreography — move-by-move, never abstract
Don't write behavioral abstractions; write **physical instructions frame-by-frame**:
- ❌ "he dances" → ✅ "two head nods on the beat, shoulder rolls one at a time, a knee dip, a finger snap, a quarter spin."
- ❌ "she reacts" → ✅ "eyes widen, half-step back, hand rises to mouth, then stills."
The engine renders what you choreograph. Vague verbs give generic motion.

### Micro-splicing reality (set expectations)
AI video does **not** render a flawless full scene in one pass. The high-budget look = generate **many** takes and **harvest split-second** keepers, then splice. From the brief's own ratios: a single kitchen scene came from ~3 prompts → ~9 generations → spliced from 9 clips. **Plan for volume**: budget credits for iteration, and design prompts so each gives you *harvestable* moments, not one fragile 15s take you're married to.

### Audio injection for motion sync (operational)
You can upload a raw audio track into the video generator as a structural layer so the physics model aligns movement cadence to the beat. Useful for dance/action/rhythmic ads. (Operational technique — note it; the prompt still names the beats via granular choreography.)

### High-fidelity masking (post, operational — note only)
To change wardrobe/structure while preserving pristine skin, composite edited low-fi assets under the original high-texture shot in an image editor. This is post-production craft, not prompt-authoring — flag it when relevant; don't try to express it as a single generator prompt.

---

## Engine roles for assets (consistent with `seedance-4k.md`)

| Job | Engine |
|---|---|
| ALL images — character sheets, product sheets, on-screen text/labels, canvas/semantic edits, map/blueprint layouts, first/last keyframes, side-character variants | **Codex CLI `gpt-image-2`** (the `codex-image` skill; billed to the ChatGPT plan, local-only) |
| The actual 4K video render (image-to-video from the locked assets) | **Seedance 2.0 API** (no real faces, no Tagalog speech — see `seedance-4k.md`) |

## Pre-flight before you prompt any video
- [ ] Hero character locked as a 3-panel sheet (close-up + front + back), neutral grey, one face only.
- [ ] State-variants built as separate sheets where the character changes.
- [ ] Product locked as a multi-angle sheet (Codex (gpt-image-2)), label sharp + correct.
- [ ] Key locations generated at 3/4 angle; map schematic made if positions must stay fixed.
- [ ] Each asset survived the single-variable motion baseline test.
- [ ] Choreography written move-by-move (no "he dances").
- [ ] Credit budget set for micro-splicing (many takes → harvest seconds).
