# Script-input wiring matrix — locked design brief

**Status: design brief locked via grifon-cmo + Neil approval (2026-05-06 evening). Ships pre-beta as polish bundle item #3e. ~half day grilled prompt work.**

## Trigger

Discovery that 3 wizard inputs are collected but the script generation prompt either ignores them or explicitly tells the model to ignore them:
- `clientDetails.offer` — the tripwire from Offer Optimizer (Bryan crafts tripwire/core/high-ticket → pastes tripwire into Step 2). The architectural bridge Neil designed; never wired into geminiService.
- `businessInfo.separator` — "Main Differentiator" ([Step2BusinessInfo.tsx:156-165](../components/Step2BusinessInfo.tsx#L156-L165)). Required field in Step 2; geminiService has zero references.
- `businessInfo.audience` — script prompt at [services/geminiService.ts:564](../services/geminiService.ts#L564) explicitly says: `"Do not ask the user for target audience details. You deduce the most profitable avatar based on the product provided."` But the wizard makes Bryan fill it in anyway.

Hand-picked beta of 5–10 Filipino SMB owners means highest-stakes first-impression scripts. Shipping beta with the offer→script bridge cut means every Bryan in the cohort sees a strategically weaker output than the product can produce. Sabri Suby reality check: "build a great offer, copy is just the megaphone" — and the megaphone wire to the offer is currently cut.

## Slotting matrix (locked, approved by Neil 2026-05-06 evening)

One slot per input per formula. Anywhere else dilutes or destroys the formula's persuasion stack.

| Input | MrBeast | TESTIMONIAL | TEMU (v1.1 re-spec) |
|---|---|---|---|
| **`clientDetails.offer`** (tripwire) | **Scene 7 CTA ONLY.** Inject offer STRUCTURE (scarcity + value adds + urgency), never the bare price. Example: "first 50 lang, kasama ang free shipping + recipe ebook." Hook stays curiosity-gap-pure. | **Scene 7 WARM CTA ONLY.** Same structural injection, gentler tone — recommendation framing not direct sell. "Try niyo na, sulit kahit first time bumili — first 50 may free shipping pa." | **Scene 6 (Proof/Scarcity) + Scene 7 (CTA) overlays.** Carry offer's scarcity/urgency words: `"FIRST 50 LANG"` / `"FREE SHIPPING"` / `"TAP YELLOW BASKET ↓"`. **Never the bare price** — price belongs on the Shopee/Lazada listing, not the ad. |
| **`businessInfo.separator`** (Main Differentiator) | **Scene 5 PROOF beat.** "Hindi tulad ng iba — kami `${separator}`." This is the "why believe?" slot. Never in hook (kills curiosity), never in CTA (offer owns that). | **Scene 6 SPECIFIC PROOF beat.** "Marami akong na-try na ibang [category], pero ito lang ang gumana sa akin kasi `${separator}`." Comparative moment is where differentiator earns its keep. | **Scene 5 VARIETY/STACK overlay.** Compress to 1-3 words: `"100% PLANT-BASED"` / `"BUKIDNON GROWN"` / `"NON-TOXIC"`. Differentiator becomes a visual badge, not a sentence. |
| **`businessInfo.audience`** | **System instruction REGISTER tuning ONLY** — never script body content. Inject as: `"Match vocabulary, idiom, and Taglish register to: ${audience}"`. Affects HOW the model talks, not WHAT it says. | **Same as MrBeast** + Scene 1 IDENTITY persona alignment ("Ako si Mark, OFW dad" matches OFW audience; "Ako si Tin, single mom" matches Filipino-mom audience). Audience NEVER named literally; speaker's persona implicitly matches. | **Visual register tuning** for Scene 4 In-Use beat: wardrobe, setting, lighting tone match audience context (Filipino moms → soft morning kitchen; OFWs → balikbayan-box framing). NEVER overlay text. |

## Hard constraints honored

- **Never mention price in video scripts.** Wire offer STRUCTURE (scarcity, urgency, value adds), not bare price. Standard direct-response: ad opens curiosity → landing page closes price.
- **Audience as register, never as content.** Naming audience back to them ("for Filipino moms 25–40 who shop on TikTok Shop, here's the coffee...") reads like a database merge field — Bryan-killer.
- **Hook curiosity-gap (MrBeast) stays untouched.** All inputs slot at proof/CTA beats; Scenes 1–2 remain mechanism-pure.

## Implementation handoff (grill-me + surgical-edit)

**1. services/geminiService.ts** (CLAUDE.md tuning gate — grill-me before any prompt edit)
- Remove "Do not ask the user for target audience details" instruction at [line 564](../services/geminiService.ts#L564). Replace with register-tuning instruction using `businessInfo.audience`.
- For each formula branch (MrBeast at [~line 766](../services/geminiService.ts#L766), Testimonial at [~line 752](../services/geminiService.ts#L752), Temu at [~line 723](../services/geminiService.ts#L723)): identify the Scene N prompt construction site and inject the per-input slot per the matrix. Surgical insertion at the right scene-prompt template, not a global "use everywhere" rule.
- Fallback handling: empty `offer` → Scene 7 CTA falls back to existing generic CTA. Empty `separator` → Scene 5/6 PROOF beat falls back to existing generic-proof phrasing.

**2. types.ts** — no change. All three fields already exist on `ClientDetails` / `BusinessInfo`.

**3. components/Step3AdScript.tsx** — no structural change. Form submission already passes both objects through to `generateAdScript`. The wiring change is purely on the prompt-construction side in geminiService.

## Open question — Neil's call before grill-me

`clientDetails.services` — vestigial early-iteration field, or upstream-fed by some module I haven't seen? If standalone, drop in 3f. If upstream-fed (like `offer` is from Offer Optimizer), wire it like offer per a similar matrix.

## Pre-grill-me checklist

Before grill-me runs, lock the unresolved decisions:
- [x] Slotting matrix approved (2026-05-06 evening)
- [ ] `clientDetails.services` decision (drop / wire / keep parked)
- [ ] Fallback rules for empty `offer` and empty `separator` (degrade gracefully ✓ already specified, but confirm)
- [ ] Audience register-tuning instruction phrasing — once line 564 is removed, exact replacement text
