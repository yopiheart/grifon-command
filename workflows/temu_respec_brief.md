# TEMU formula re-spec — locked design brief

**Status: design brief locked via grifon-cmo + Neil pushback (2026-05-06 evening). Implementation deferred to v1.1; beta launches WITHOUT TEMU exposed.** Re-spec triggered by TEMU regression run findings: current formula generates MrBeast-style talking-head scaffolding (avatar + full Taglish VO + avatar in thumbnail) for what should be product-only fast-cut B-roll. Wrong category, wrong persuasion stack.

## What TEMU actually is

Scroll-Stop Product Drop Mode. 8–12 seconds. 7 cuts. Zero avatar. Zero VO. Pure product B-roll with text overlays composited by user in CapCut on top of trending audio. Persuasion stack: **Pattern Interrupt → Curiosity Gap → Scarcity → Frictionless CTA.** Different from MrBeast (Authority + Liking) and TESTIMONIAL (Social Proof) — different formula, different scaffolding.

Target sub-segment of Bryan: e-com sellers on Shopee/Lazada/TikTok Shop. Single SKU. P99–P999 impulse-buy price points. Visual categories (food, gadgets, beauty, home goods). NOT for service businesses, high-ticket, or trust-required categories.

## Locked design decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Skip Step 4 (Avatar) entirely when `scriptType === 'TEMU'` | No avatar in formula; saves Gemini call + removes hallucination surface |
| 2 | No VO output. Per-scene text-overlay copy delivered as DATA, never baked into images | Bryan rides trending audio; CapCut overlays animate; baked text would compound Gemini Flash Image's typography limitation across 7 scenes per ad |
| 3 | `RAW_OUTPUT_RULE` on all TEMU image gen — never embed text/captions/prices/labels/logos in the image | Edit-friendly: price changes = 1 CapCut text edit, zero Gemini re-gen, zero product drift |
| 4 | 7-scene structure mandate (Hook / Texture / Scale / In-Use / Variety / Proof / CTA), 1–2s per cut | TEMU pacing standard; ~10s total |
| 5 | Hands allowed on Scene 4 (in-use beat) only. No face, no full body, anywhere else | Product is the protagonist, not the user |
| 6 | Thumbnail = product hero only, raw. Overlay copy as separate data string | Same `RAW_OUTPUT_RULE`; Bryan composites in Canva/CapCut before posting |
| 7 | Kling 3.0 owns motion across all 7 scenes. Kling 2.6 only on Scene 1 keyframes (start + end frames) | Per Neil's architectural read; product motion vocabulary not human verbs |
| 8 | UI label in scriptType picker: `PRODUCT_DROP // SCROLL-STOP` with subtitle `For e-com SKUs. No talking head. Pure product cuts. ~10 seconds.` | Bryan needs to know what he's choosing before burning credits |
| 9 | Beta launches WITHOUT TEMU exposed. Disable option in Step 2 picker. Frame as "v1.1 first access" reciprocity hook | Prevents the "garbage AI output" objection landing on Day 1 of beta |

## 7-scene structure (mandate in system instruction, no flexibility)

| Scene | Role | Duration | Visual | Camera vocab |
|---|---|---|---|---|
| 1 | HOOK | 1.5–2s | Extreme close-up macro. Pattern interrupt — bag opening, beans pouring, steam rising, label reveal | macro, push-in, snap-zoom |
| 2 | TEXTURE | 1–1.5s | Tight detail (grain, packaging texture, valve close-up) | macro, slow rotation |
| 3 | SCALE/CONTEXT | 1–1.5s | Product in real environment (counter, scale, beside cup) | static wide, tilt-down |
| 4 | IN-USE | 1.5–2s | Product being used (pouring, scooping, brewing) — hands allowed, no face | over-shoulder, top-down |
| 5 | VARIETY/STACK | 1–1.5s | Multiple bags, color/flavor options, quantity reveal | parallax, dolly across |
| 6 | PROOF/SCARCITY | 1–1.5s | Hero glamour, dramatic light, product centered | slow rotation, rim-light reveal |
| 7 | CTA | 1–2s | Product + yellow basket arrow + clear CTA | static center, bounce-in arrow |

## Per-scene overlay copy spec (returned as data, not baked)

- 1–5 words max. 4th–5th grade Taglish. No full sentences.
- Scene 1 = curiosity-gap hook (`"GRABE THIS COFFEE"` / `"WAIT FOR IT"` / `"BUKIDNON DROP"`)
- Scenes 2–5 = single-word claims (`"PREMIUM"` / `"FRESH"` / `"BUKIDNON GROWN"` / `"RESEALABLE"`)
- Scene 6 = scarcity or proof (`"P349 ONLY"` — Bryan supplies the price; AI never invents)
- Scene 7 = clear action (`"TAP YELLOW BASKET ↓"`)
- Thumbnail overlay = 3–5 words, separate string, follows existing thumbnail rules (gold #FFCC00 + white)

## Implementation handoff (grill-me + surgical-edit checklist)

**1. types.ts**
- Add `sceneOverlays: string[]` (one per scene) and `thumbnailOverlay: string` to script type. Either new `ProductDropScript` interface or optional fields on existing `Script` type. Keep `finalScript[]` as legacy/MrBeast/TESTIMONIAL field.

**2. App.tsx**
- When `businessInfo.scriptType === 'TEMU'`: Step 3 `onNext` jumps directly to Step 5. StepIndicator hides Step 4 or labels it `// SKIPPED`.
- `avatar` state stays null for the entire TEMU flow.

**3. services/geminiService.ts** (CLAUDE.md tuning gate — explicit approval required per change)
- `generateScript` — TEMU branch outputs `sceneOverlays[]` not VO lines. New system instruction: 7-scene structure, per-scene role (Hook / Texture / Scale / In-Use / Variety / Proof / CTA), text-overlay rules per spec above.
- `generateStoryboard` — TEMU branch with `NO_HUMAN_RULE` (no faces, no full bodies; hands only on Scene 4), `PRODUCT_FOCUS_RULE` (product centered or hero in every scene), `MOTION_VOCABULARY_RULE` (zoom, rotation, parallax, macro reveal — no human verbs), `RAW_OUTPUT_RULE` (never embed text/captions/prices/labels/logos in the image). Drop avatar locks (`IDENTITY_LOCK`, `APPEARANCE_LOCK_RULE`, `ENVIRONMENT_SYNC`).
- `generateThumbnail` — TEMU branch: product-hero prompt path, no avatar, `RAW_OUTPUT_RULE`. Generate `thumbnailOverlay: string` separately.
- `generateVideoPrompts` — TEMU branch: Kling 3.0 motion vocabulary across all scenes. Scene 1 retains Kling 2.6 keyframe pattern.

**4. components/Step5Storyboard.tsx**
- When TEMU, don't pass `avatar` to `generateSceneImage`. `referenceImageMode` defaults to product-only.
- Hide avatar-related UI affordances.

**5. components/Step2BusinessInfo.tsx (or wherever scriptType picker lives)**
- Update label to `PRODUCT_DROP // SCROLL-STOP`. Subtitle: `For e-com SKUs. No talking head. Pure product cuts. ~10 seconds.` Tooltip: `Best for single products P99–P999. Skip if you sell services or high-ticket.`
- For beta launch: gate as disabled with `// COMING_IN_V1.1` label until re-spec ships.

**6. components/Step6Thumbnail.tsx**
- When TEMU, render product-only preview. Hide avatar-blend toggle if it exists.

**7. components/Step7FinalOutput.tsx (Step 8 in UI)**
- Under each scene tile + thumbnail, render overlay copy as zinc-300 mono with `[ COPY ]` button (matches DEPLOY_AUDIO copy-button pattern from Signal Modulator).
- Add `overlays.txt` to `EXPORT_BUNDLE.zip` with all per-scene overlays + thumbnail overlay + usage notes (paste into CapCut, gold-on-dark / white-on-light, animate-in per cut).

## Sequencing (post-persistence-ship)

1. **Pre-beta polish bundle (~half day):** punch list item #3 in `launch_readiness.md` (JWT + toast + nudge + TEMU gate + script-input wiring).
2. **Beta launches with MrBeast + TESTIMONIAL only.** 5–10 hand-picked Filipino owners. Frame TEMU as v1.1 first-access for beta cohort.
3. **Week 1 of beta — TEMU re-spec ship.** ~1.5–2 days grilled engineering against this brief. Drop to beta users with reciprocity framing.
4. **Week 2 of beta — measure.** Which formula gets more wizard completions? Which produces ads beta users actually run? Answers whether TEMU should be the default for the e-com sub-segment of Bryan.

---

## CMO strategy read — 2026-07-09 (Slice 3 gate, evidence: swipe-file E8–E11 / P12–P14)

*The grifon-cmo half of the Slice 3 evidence gate (the autopsy half is the P12+P13 Gated
Proposal in `viral_swipe_file.md`). Feeds the tuned-prompt drafts; changes nothing by itself.*

**Why the format converts:** (1) zero consumption cost — no face, no language barrier,
product @0s, 1–2s cuts that re-earn attention (Suby: consumption precedes conversion);
(2) the product IS the hook — novelty + impulse price acts as built-in risk reversal;
(3) visual value stacking — one feature/use per cut (E9 flat-pack→assembled in <3s; E11
two durability proofs in a 3s window = show-don't-tell Authority); (4) believability lives
in real hands/lived-in spaces, not the voice — AI TTS wins anyway (P14), which is exactly
Grifon's answer to Bryan's "AI garbage" objection: spend realism budget on b-roll, not VO.

**Overlay register (direction):** ONE static title card on frame 1 (product name or Taglish
POV line, 1–8 words) — NOT churning deal text (4/4 evidence). Text identifies; footage
persuades. Price/deal copy only on the closing card — matches our existing end-card
mechanism and the no-price-in-scripts rule. Product names stay English inside Taglish lines.

**Format A — Rapid Fire (TTS VO), the "spec-rattle stack"** — for products that need
EXPLAINING: spoken imperative hook + product @0s → durability/material proof beat →
benefit-per-cut (VO names it, footage shows it) → versatility → held end-card CTA.
Template: E11. **Format B — Pure Hype (no VO), the "show-don't-tell impulse loop"** — for
visually self-evident products: title card + product @0s → fast transformation beat (<3s)
→ reveal-per-cut variety → aspirational context beat → end-card. Templates: E8–E10.
Targeting rule: benefit must be SAID → A; benefit is SEEN → B (the existing Temu sub-type
classifier's Utility/Reaction axis approximates this — candidate for later auto-routing).

**Our deliberate divergence from the reference:** TEMU drops ship weak/no CTA (3/4 none) —
they can afford it at app scale; our SMBs can't. Both formats keep the HELD end-card CTA
as default. Also: E8–E10 used zero SFX hits (music only) — Format B SFX should be
action-synced and sparse, not the default whoosh-per-overlay map.
