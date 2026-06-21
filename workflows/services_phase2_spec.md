# Workflow: Services Phase 2 — Real-Photo Accuracy (locked spec)

**Status:** spec LOCKED via grill-me 2026-06-21. Build not started (Slice 1 next).
**Goal:** generated storyboard scenes for **venue-led** service businesses must reflect the
user's **real uploaded place** (same place, scene-fitting camera angle — NOT a pixel clone),
and **stop rendering foreigners** in human scenes. Driven by the Naya Boutique Spa smoke
(2026-06-21) where: scenes invented a non-existent place, the hero photo never appeared, and the
problem-hook rendered a Western person.

## Root cause (confirmed in code)
`services/geminiService.ts:generateSceneImage` has 4 modes — `avatar` (ethnicity-locked),
`product` (NO humans, object is hero), `both`, `none` (NO humans, **no ethnicity injected**).
`utils/sceneRender.ts:43` only ever uses `productImageUrls[0]`, only in `product` mode; venue
photos 1+ are dormant. **There is no render mode for "a real Philippine PLACE that may contain a
Filipino person."** So venue b-roll → `none` → no reference photo + no ethnicity → invented place
+ foreigner. Product works because it's one rigid subject fed as a reference with an identity-lock.

## Hard constraint (non-negotiable)
**Product / Testimonial / MrBeast / Temu / Cinematic / avatar paths = UNTOUCHED.** Work-led
(Oceanides malabanan) already PASSED on representative generation — must not regress. Achieved by
isolation (new field, new render mode = additive 5th branch, existing 4 byte-identical) + an
archetype-aware path + a dual regression gate.

## Locked decisions (Q1–Q11)

- **Q1 — Upload data model:** new optional, service-only field on `BusinessInfo`:
  `servicePhotos?: { url: string; slot: 'exterior'|'interior'|'ambiance'|'staff'|'before'|'after' }[]`.
  `productImageUrls` untouched (hero stays `[0]`; can mirror the exterior for back-compat).
- **Q2 — Routing per archetype:**
  - **venue** → full real-photo routing + new VENUE render mode.
  - **work** → representative-by-default (current passing path); before/after-routing ONLY if those
    slots were uploaded. No before/after upload → exactly today's code path (zero regression).
  - **practitioner** → headshot/logo routing on intro/CTA only; minimal b-roll.
  - All → ethnicity fix (universal, additive).
- **Q3 — Scene tagging (storyboard, TUNED):** storyboard emits optional per-scene
  `venueSlot?: <same enum as servicePhotos.slot>`; renderer maps `scene.venueSlot` →
  `servicePhotos` entry → feeds it as the reference. `referenceImage` still selects the mode.
  Tagging must be narrative-aware ("fit sa scene": arrival→exterior, relief→interior, etc.).
- **Q4 — VENUE render mode (geminiService, TUNED, additive 5th branch) = PLACE_IDENTITY_LOCK +
  CAMERA_FREEDOM** (mirrors avatar mode's LOCKED-vs-VARIES split):
  - **LOCKED (from the routed reference photo, consistent across scenes):** the place's identity —
    layout, furniture/decor, palette, signage/logo, **tier**. Recognizably their REAL place. Preserve,
    never upgrade (composes with the Fix-2 anti-luxury guardrail).
  - **VARIES (authoritative per scene):** camera angle, distance, framing, crop, focal point — to fit
    the beat + add cinematic variety. Same place, different angle — NOT a static clone, NOT an invented
    place.
  - **ALLOWS a Filipino person in frame** (unlike product's NO-HUMANS); strictly `${ethnicity}`.
- **Q5 — Ethnicity fix (TUNED):** Services-scoped Filipino enforcement for any human in a scene; do
  NOT mutate the shared `none` mode (product b-roll stays human-free). = **Slice 1**.
- **Q6 — Missing slot fallback:** (a) closest available `servicePhoto`, else (b) current representative
  generation (true-to-tier). Never a broken/empty ref, never an invented grander place. No uploads →
  exactly today's path.
- **Q7 — Step 2 guided upload (components, non-tuned):** archetype-driven labeled slots (venue →
  exterior/interior/ambiance/staff; work → before/after; practitioner → headshot/logo) write to
  `servicePhotos`.
- **Q8 — Avatar-IN-venue carve-out (TUNED, ⚠️ watch):** avatar mode rule-4 ("environment = home, no
  cafes/offices") needs a Services carve-out so the customer avatar can appear inside the venue
  (identity-locked face, environment = the venue).
- **Q9 — Build sequence (vertical slices; each TUNED edit = separate Neil approval; no `/goal`
  condition may target tuned prompt/schema content):**
  1. **Ethnicity / foreigner fix** (smallest, universal, highest-confidence) — TUNED geminiService.
  2. `servicePhotos` types + Step 2 guided-upload slots — non-tuned.
  3. Scene `venueSlot` tagging — TUNED prompts.ts.
  4. VENUE render mode + avatar-in-venue carve-out — TUNED geminiService.
  5. `sceneRender` routing wiring — non-tuned.
  6. **Regression re-smoke BOTH:** Naya (venue, must improve) + Oceanides (work, must not drop) = ship gate.
- **Q10 — Tier:** services-wide (NOT Business-gated).
- **Q11 — Venue b-roll people:** background patrons = non-canonical (not identity-locked); avatar-in-
  venue = avatar mode + Q8 carve-out.

## #1 technical risk (from premortem)
"Same ROOM, new angle" is HARDER for the image model than "same rigid object" — room decor can drift
when the camera rotates. Mitigations: (1) anchor every scene to the actual photo of that space (per-scene
routing); (2) keep venue angle-variation MODERATE; (3) **dedicated smoke check** — render the same room
from 2 angles, confirm "recognizably the same place"; if it drifts, add a **fidelity dial** (tighter,
closer-to-source framing / less rotation) as fallback. This is the make-or-break measured at the Naya
re-smoke.

## Premortem (Neil, 2026-06-21)
Sole failure mode raised: uploaded images won't match the storyboard output. Clarified requirement:
**not an exact clone** — same place, improved/varied camera angle, as long as it still matches the upload
and fits the scene. Folded into Q4 (identity-lock + camera-freedom) + the room-consistency risk above.

## Smoke assets (defreezer note)
Naya Boutique Spa (venue): `.tmp/hero_smoke/naya-spa-{1,2,3}.jpg` (RE-DOWNLOAD next session — `.tmp`
is wiped). Oceanides (work regression baseline): per roadmap #12.
