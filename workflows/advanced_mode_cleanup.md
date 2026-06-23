# Advanced Mode Cleanup — port One-Shot's clean UI to the 8-step wizard

**Owner:** Neil. **Status:** Planned (not started). **Created:** 2026-06-23.

**Problem:** The advanced 8-step Director wizard (Step1–7 + storyboard) feels
"rambol rambol" — disorganized, inconsistent, and you have to scroll deep. The
One-Shot Ad composer ([components/OneShotAd/LaunchScreen.tsx](../components/OneShotAd/LaunchScreen.tsx))
is super clean and mostly fits one screen. Goal: make the wizard read as clean
and organized as One-Shot.

**Reframe (CD):** Advanced mode is *deep by design* — experts manually control
every field. The goal is **organized density**, NOT "zero scroll." Win =
grouping + collapsing optional stuff + consistent density, so each step fits ~one
screen or scrolls a little — not an endless stack.

## What makes One-Shot clean (port these)

1. **Token system — the #1 lever.** One-Shot defines, once at the top of
   `LaunchScreen.tsx`: `h-11` control floor, 3 radius tiers (control `rounded-xl`
   / panel `rounded-2xl` / modal `rounded-3xl`), a spacing scale (gap-2/3/4/6),
   and a type ladder. That single discipline is ~80% of the cleanliness. The
   wizard steps each invented their own heights/paddings → that's the "rambol."
   **First task: extract those tokens into a shared place (`components/ui/` or
   codify in [DESIGN.md](../DESIGN.md)) and adopt across Step1–7.**
2. **Control-panel pattern (collapse, don't sprawl).** One-Shot hides
   Aspect/Quality/Language/Voice inside a labeled **Settings ▾ popover** instead
   of laying everything out. Move secondary/optional wizard fields into popovers,
   accordions, or modals (progressive disclosure).
3. **Two-column layouts** (like the One-Shot voice-list-in-its-own-column fix) to
   cut vertical length where fields are short.
4. **Reuse shared primitives.** Already started: Step2 now pulls from
   [components/guidedPhotoSlots.tsx](../components/guidedPhotoSlots.tsx) and got
   the per-slot guides for free. Extend the same: shared labeled-control, shared
   titled GlassPanel sections, one upload component.
5. **Sticky primary CTA + a "why disabled" reason** so the next action is always
   visible without scrolling to find it.
6. **Gold discipline + glass sections** — group each step's fields into 2–3
   titled glass cards instead of one long stack.

## Approach — one step at a time (do NOT rewrite all 7 blind)

1. **Extract One-Shot's token system** (`h-11` control floor, 3 radius tiers,
   spacing/type scale) into a shared place so every step reads from one source.
2. **Redo ONE step as the reference** — suggest **Step 2**
   ([Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx)), since it's
   already partly modernized via `guidedPhotoSlots`. Get Neil's sign-off on that
   one, then roll the same pattern to the rest.
3. **Apply per step:** labeled control panel + popovers for secondary settings,
   progressive disclosure for optional fields, 2-column layouts, titled glass
   cards per group, sticky CTA.

## Constraints

- **Presentational only.** Do NOT change wizard state logic in
  [App.tsx](../App.tsx) or any tuned prompts (`geminiService.ts`,
  `api/_lib/prompts.ts`). Follow `.claude/skills/surgical-edit/`.
- **Advanced mode is Google-OAuth gated — no headless smoke.** Neil eyeballs
  live, so it's build-gate + his manual check, **step by step with commits**.
  Don't `/clear` mid-refactor expecting continuity.
- Run `.claude/skills/brand-check/` on each step before declaring it done.

## Kickoff message (paste into the next session)

> **Goal:** Reorganize the advanced 8-step wizard (Step1–7 + storyboard) so it's
> clean and organized like the One-Shot composer — not "rambol rambol," minimal
> scrolling. One-Shot `LaunchScreen.tsx` is the design gold standard; reuse its
> patterns. See `workflows/advanced_mode_cleanup.md`.
>
> **Before coding, run `/grill-me`** to lock the plan (don't outrun your
> headlights on a 7-step surface). Then propose a `/goal` per CLAUDE.md.
>
> **Approach (one step at a time, not all 7 blind):**
> 1. First extract One-Shot's token system (`h-11` control floor, 3 radius tiers,
>    spacing/type scale) into a shared place (`components/ui/` or DESIGN.md).
> 2. Then redo **Step 2** as the reference (already partly modernized via
>    `guidedPhotoSlots`), get sign-off, then roll the pattern to the rest.
> 3. Apply: labeled control panel + popovers for secondary settings, progressive
>    disclosure for optional fields, 2-column layouts, titled glass cards per
>    group, sticky CTA.
>
> **Constraints:** Presentational only — don't change wizard state in `App.tsx`
> or any tuned prompts. Advanced mode is Google-OAuth gated (no headless smoke) —
> Neil eyeballs live, so build-gate + his manual check, step by step. Follow
> `surgical-edit` and `brand-check`.
>
> Start by reading `components/OneShotAd/LaunchScreen.tsx` (the reference),
> `DESIGN.md`, and `components/Step1ClientDetails.tsx` → `Step7FinalOutput.tsx`
> to map the current sprawl.

## References

- Gold standard: [components/OneShotAd/LaunchScreen.tsx](../components/OneShotAd/LaunchScreen.tsx) — token block at top, labeled Niche/Format/Settings control panel, popovers/modals.
- Shared slot system already extracted: [components/guidedPhotoSlots.tsx](../components/guidedPhotoSlots.tsx).
- Design tokens: [DESIGN.md](../DESIGN.md).
- Wizard steps: `components/Step1ClientDetails.tsx` → `Step7FinalOutput.tsx` (Step 6 forks into `Step6Thumbnail` + `Step6VideoPrompts`).
