# Workflow: Real Estate Ad Style (#13) — locked spec

**Status:** spec LOCKED via grill-me 2026-06-22. Build IN PROGRESS (slices 1–6 landed; smoke pending).
**Goal:** a new ad style tuned for Filipino real-estate sellers — an **agent-led property walkthrough**
that tours the listing (property as the hero), drives an **inquiry/viewing** CTA, and optionally shows a
listing price. Sequenced second of three new styles (after #12 Services, before #14 App/commercial).

## Key architecture insight (reuse, not rebuild)
A property *is* a real place, so RealEstate rides the **Services Phase 2 venue infrastructure** as-is:
- **Venue render mode** (`PLACE_IDENTITY_LOCK + CAMERA_FREEDOM`, `services/geminiService.ts`) — keyed off
  `referenceImageMode === 'venue'`, NOT scriptType → reused with zero changes.
- **Per-scene `venueSlot` → real-photo routing** (`utils/sceneRender.ts`) — not scriptType-gated → reused
  with zero changes. A property photo anchors each scene identically to a service venue photo.
This makes RealEstate mostly *additive*: new enum values + new prompt branches, existing paths untouched.

## Locked decisions (grill-me, 2026-06-22)
- **Archetypes (3):** `listing` (one house/condo/lot for sale or rent — property is hero), `agent`
  (broker personal brand), `developer` (pre-selling a project).
- **Script angle:** **Agent-led walkthrough** — first-person agent/seller touring the property
  ("Pasok tayo… ito ang sala"). Distinct VOICE from Services' first-person *customer* testimonial →
  a genuinely new ad-script branch.
- **Price + CTA:** **Optional price.** If `listingPrice` is supplied, the CTA beat may state it ONCE as
  given (no inventing/rounding/financing terms); if blank, the ad is inquiry-only and NEVER implies a
  peso figure. (Deliberately the opposite of Services, which renders no peso.)
- **Architecture & scope:** reuse venue infra, **services-wide** (NOT Business-gated). Reached via a third
  `businessType` `'realestate'` → scriptType `'RealEstate'`. Property photos reuse `servicePhotos` with
  property-specific slots.

## Hard constraint (non-negotiable)
**Product / Testimonial / MrBeast / Temu / Cinematic / Services paths = UNTOUCHED / byte-identical.**
Achieved by isolation: new enum values, new `else if (isRealEstate)` branches, and scriptType-scoped
guards. The venue render mode + sceneRender routing are reused unchanged (no new render branch needed).

## What changed (slice map)
1. **types.ts** (non-tuned) — `'RealEstate'` scriptType; `'realestate'` businessType;
   `realEstateArchetype?: 'listing'|'agent'|'developer'`; `listingPrice?: string`; extended
   `servicePhotos.slot` + scene `venueSlot` enums with property slots
   (`facade|living|kitchen|bedroom|bathroom|view|amenities|location|agent`).
2. **components/Step2BusinessInfo.tsx** (non-tuned) — third "Real Estate" businessType toggle →
   `[RealEstate, Custom]`; `RE_ARCHETYPE_META`/`RE_ARCHETYPE_ORDER`/`RE_UPLOAD_SLOTS`/
   `inferRealEstateArchetype` (mirrors the Services machinery); shared guided UI via `isGuided`
   (Services rendering byte-identical); optional listing-price input.
3. **api/_lib/prompts.ts** `buildAdScriptPrompt` (TUNED, approved) — additive `isRealEstate` branch:
   agent-led walkthrough 6-beat (hook → location/lifestyle → walkthrough → standout/differentiator →
   trust/disarm → price+inquiry CTA), `PRICE_RULE` gated on `listingPrice`. Marker:
   `REAL ESTATE WALKTHROUGH 6-BEAT`.
4. **api/_lib/prompts.ts** `buildStoryboardPrompt` (TUNED, approved) — additive `isRealEstate` strategy
   (agent walkthrough scene logic + archetype b-roll + PH ground-truth realism); `venueSlotRouting`
   extended to fire for RealEstate with a property-room slot legend. `agent` slot intentionally NOT
   routed through `venueSlot` (a headshot must not feed the place-identity-lock).
5. **services/geminiService.ts** (TUNED, approved) — `FILIPINO_CAST_LOCK` scope extended to RealEstate;
   avatar-mode **ENVIRONMENT rule 4 carve-out** so the agent can appear inside the property being toured
   (the Services Q8 carve-out, deferred there, required here) — scoped to `scriptType === 'RealEstate'`.
6. **tools/check-bundle-leak.mjs** + **services/CLAUDE.md** (non-tuned) — `REAL ESTATE WALKTHROUGH 6-BEAT`
   added to the crown-jewel marker list / grep (keep the two in sync).

## #1 technical risk (premortem)
Property scale / room-to-room **scene identity** — "same place, new angle" drift is harder across many
rooms than across one service venue (related to the Veo scale limits in roadmap #4). Mitigations: per-scene
anchoring to the actual room photo (already how `venueSlot` works); moderate angle variation; a dedicated
smoke check — render the same room from 2 angles and confirm "recognizably the same place"; add a fidelity
dial (tighter, closer-to-source framing) if it drifts. Second risk: the avatar-in-property carve-out must
not regress other avatar scenes — scoped strictly to `scriptType === 'RealEstate'`.

## Smoke plan (delegate to smoke-tester; director-smoke pre-flight)
Drive Director AI with a real Filipino listing (3–5 property photos across slots: facade/living/kitchen/
bedroom/view). Confirm: agent-led walkthrough script (agent voice, not customer); scenes anchored to the
*uploaded* rooms (not invented); Filipino agent; optional price rendered ONLY when supplied; inquiry CTA
(no checkout). Run the same-room/2-angles identity check. **Quality call is Neil's.**
Smoke assets live in `.tmp/` (defreezer-wiped) — re-source listing photos at smoke time.

## Status update (2026-06-22)
SHIPPED. Smoke PASSED with an uploaded Filipino agent: avatar-in-property landed (agent inside the real
sala/bedroom, identity + lanyard preserved), b-roll anchored to uploads, agent-led script with the
CMO-tuned legitimacy + affordability + keyword-DM beats. Post-smoke refinements added: `avatar_venue`
render mode (incl. exterior facade on the CTA shot), agent wardrobe (lanyard) on generated avatars.

## Follow-ups / deferred
- **MORE FORMATS (Neil, 2026-06-22):** add a **buyer/owner UGC-testimonial** Real Estate format — a client
  who BOUGHT a house sharing their experience (first-person buyer voice, softer "ask them how / inquire"
  CTA, pambahay OK). Expose alongside agent-led via a "Who's on camera?" toggle (Agent broker ↔ Happy
  buyer); the Testimonial/Services voice already exists to build on. Maybe a developer pre-selling format too.
- Curated `public/examples/realestate-{listing,agent,developer}.png` upload-sample images (tiles fall back
  to a lucide icon until present — same pattern as Services).
- Agent archetype: the `agent` slot photo currently syncs into `productImageUrls` but is not used as an
  avatar reference (avatar comes from Step 4). Revisit if agent-headshot fidelity matters for that archetype.
- End-card peso rendering: price currently flows through the script CTA beat; full end-card recap overlay of
  the price is a render-pipeline follow-up if needed.
