---
name: brand-check
description: Diff proposed UI work against DESIGN.md and flag every brand mismatch. Use whenever the user asks to "review against brand guidelines", pastes a UI mock/screenshot/PR diff for fidelity check, or after any edit to components/*.tsx (and landing/pricing/marketing pages) before declaring the task done.
---

The check loop is where Boris Churnney's 2-3x quality multiplier lives. `verify-changes` covers build + smoke; this skill covers brand fidelity. Run it BEFORE declaring a UI task complete.

## Procedure

1. Read [DESIGN.md](../../../DESIGN.md) at the start of every brand-check pass. Tokens drift; the source of truth is one file.
2. Pull the proposed change — diff, screenshot, mock, or named component(s).
3. Walk the checklist below. Quote the offending line + file:line for every flag.
4. End with a single verdict: `BRAND_PASS`, `BRAND_PASS_WITH_NITS`, or `BRAND_FAIL` plus the count of each severity.

## Run as a separate critic (non-trivial work)

For a real PR/diff, a multi-component change, or any check that gates "is this UI task done" — do **not** run the checklist inline in the context that produced the work. A builder grading its own diff rationalizes its own class choices; that is the self-grading trap. Tuning a standalone critic to be harsh is tractable; tuning a builder to be self-critical is not. Spawn a fresh sub-agent as the critic instead:

- **Spawn it** via the Agent tool with `subagent_type: general-purpose` (a fresh context). Not `Explore` — that is a search agent, not a reviewer.
- **Hand it** only the diff / named component(s) and the path to `DESIGN.md`. Do **not** hand it your rationale for the choices — the critic judges blind, against the file.
- **Frame it adversarially:** *"You are an adversarial brand critic. Assume this diff has brand violations until proven clean. Walk every checklist item. Quote file:line for every flag."* Paste the checklist below into the sub-agent prompt.
- **The critic is report-only.** It returns the verdict + flagged lines and never edits. The builder fixes, then re-spawns the critic.

**Escape hatch:** a trivial one-line diff (single class swap, copy tweak) — inline review is fine; skip the sub-agent. The separate critic is for work big enough that self-grading bias matters.

*Optional — live verification:* the critic may drive Playwright (MCP available) against `npm run dev` to screenshot the real rendered component instead of reading the diff cold. If it does, treat each screenshot as a discrete observation — design the prompt to survive seeing the UI only in those snapshots.

## Checklist (flag any mismatch)

**Canvas & color**
- `bg-black` anywhere → must be `bg-zinc-950` (DESIGN.md "Don't use bg-black").
- Hex accent other than `#FFCC00` (Grifon Gold) on interactive elements — no blue/cyan/pink/green CTAs, focus rings, or hover borders.
- New accent color introduced — gold is the only driver.

**Panels & elevation**
- Form/tool/settings/data block NOT wrapped in `<GlassPanel>` (or the literal `bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl` recipe). Always use the primitive at [components/ui/GlassPanel.tsx](../../../components/ui/GlassPanel.tsx) when it fits.
- `box-shadow` / `shadow-lg` / `shadow-xl` on UI chrome — elevation is glass + blur, not drop shadows. Exception: demo-mockup browser/app frames inside marketing sections (gold-tinted or pure-black-falloff only).

**Buttons**
- Primary CTA NOT using `<GoldButton>` ([components/ui/GoldButton.tsx](../../../components/ui/GoldButton.tsx)) or its literal recipe.
- Wrong rounding: in-app primary CTA must be `rounded-xl`; marketing-surface primary/secondary/ghost must be `rounded-full`. Inputs/selects always `rounded-xl` regardless of surface.
- Ghost button missing `bg-zinc-950 border border-white/10` base + gold hover.

**Inputs**
- Native browser styling left intact — must be `bg-zinc-950 border border-white/10 rounded-xl focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`.
- Visible `<input type="file">` — must be hidden, surfaced via uploadDropzone pattern.

**Typography**
- Headline without the cinematic gradient on a marketing surface: `bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500`. Vertical (`to-b`) — flag any horizontal `to-r` headline gradient as wrong register.
- Sub-label not `text-[10px] text-zinc-500 font-mono uppercase tracking-widest` (JetBrains Mono control-panel feel).
- Body text not in the white → zinc-500 ladder.

**Icons**
- Any text-string / icon-font / emoji icon — must be `lucide-react` SVG.
- Hand-transcribed inline SVG (typed path data) without rendering and zooming to 200% to verify shape integrity. Brand marks (Google G, Apple, GitHub, Microsoft, etc.) must be copied from the brand's canonical reference, never re-typed from memory.

**Alignment & icon-text rhythm** *(added 2026-05-26 — see `agent_lessons.md` for the Google G incident)*
- Icon next to **bold/uppercase text** uses `w-5 h-5` (20px) + `gap-3` or `mr-3` (12px). Smaller pairings read as cramped — Cursor/Stripe/Claude all use this rhythm.
- Icon next to **normal-weight text** uses `w-4 h-4` (16px) + `gap-2` or `mr-2` (8px).
- Inside any `flex items-center` button or row containing an icon + text: verify the icon has `shrink-0` so it doesn't squash when the button width drops on mobile.
- Vertical centering verified at element zoom — open the rendered button in dev tools, inspect that `align-items: center` is actually centering icon top with text x-height, not icon top with text top.
- **Federated OAuth buttons get NEUTRAL surfaces, NOT brand accent colors.** A multicolor brand mark (Google's 4-color G, Apple's logo, GitHub's octocat) needs contrast that saturated colors don't provide — `#FFC107` Yellow goes invisible on `#FFCC00` Gold. Use `bg-zinc-950 border border-white/15` (ghost) or white-surface (Stripe pattern). Reserve the brand accent color for primary CTAs.
- Spacing-around-button rule: when stacking OAuth + email form, the divider ("OR CONTINUE WITH EMAIL") needs `mb-6` above and below so neither button crowds it.

**Visual fidelity audit (do before declaring any UI task complete)**
- Open `npm run dev`, navigate to the changed surface, **screenshot at BOTH 1280x900 AND 375x667** (iPhone SE class — still ~30% of Filipino mobile install base per [agent_lessons.md](../../../agent_lessons.md) 2026-05-24 Director-AI pre-flight rules).
- For each text+icon pair, zoom screenshots to 100-200% and check: (a) icon path renders fully, no crops/squashes; (b) icon vertically aligned with text baseline; (c) spacing reads premium (not cramped); (d) icon doesn't shift when button wraps at mobile width.
- For brand-mark icons specifically: zoom to 200% AND verify the official colors actually render distinctly against the button surface. If the brand color and button color collide (Google Yellow on Grifon Gold), the surface is wrong — fix the button, don't ship the muddy mark.
- Build-clean + page-scale screenshot does NOT count as visual verification. Many alignment failures are invisible at page scale and obvious at element zoom.

**Smell tests**
- Inline class blob that re-implements an existing primitive instead of importing GlassPanel/GoldButton — call this out as "use the primitive" even if classes are technically correct.
- New legacy-style accent (pink/cyan border) introduced on a touched component — DESIGN.md mandates purging these on any component you touch.

## Output format

```
brand-check: <component or diff name>
  CRITICAL (n): bg-black usage, non-gold accent, missing GlassPanel
    - components/Foo.tsx:42 — bg-black on root div, must be bg-zinc-950
    - components/Foo.tsx:88 — text-blue-400 on CTA, must be #FFCC00
  NIT (n): rounding, primitive inlining
    - components/Foo.tsx:51 — inline glass classes; replace with <GlassPanel>
  VERDICT: BRAND_FAIL — 2 critical, 1 nit
```

CRITICAL = breaks the brand register (black canvas, non-gold accent, missing primitive). NIT = correct in spirit but should use the primitive or token. PASS = no mismatches.

## Out of scope

- **Build/type-check/smoke** — that's `verify-changes`.
- **Copy quality / voice / hooks / CTAs** — that's `grifon-cmo`.
- **Gemini output quality** (storyboards, scripts, generated images) — separate future skill (`gemini-eval`); manual eyeballing for now.
- **Layout density / information architecture** — judgment call, not a brand-rule violation.
- **Legacy untouched components** — only check what the current change touches. Don't expand scope (`surgical-edit` rule).

## When this skill is the wrong tool

- User asks "is this code correct?" — that's `verify-changes`.
- User asks "is this on-brand for marketing voice?" — that's `grifon-cmo`.
- User pastes a Gemini-generated storyboard — manual eyeball, not this skill.
