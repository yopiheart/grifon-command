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
