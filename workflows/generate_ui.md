# Workflow: Generate UI

**Objective:** Produce a new `.tsx` UI component (or module screen) that is visually and structurally consistent with the rest of the app.

Use this when:
- Building a new feature screen
- Adding a panel, modal, or form inside an existing module
- Rebuilding a legacy surface that still uses purged brand names (`brand-primary` was purple, now aliased to gold — see `index.html`)

## Required Inputs

- The feature or surface name (e.g. "Campaign Brief Form", "Pricing Comparison Panel").
- What the user needs to see or do on that surface.

## Source of truth

[`DESIGN.md`](../DESIGN.md) at project root. Read it **before** writing any UI. It defines:
- Color roles (`primary`, `surface`, `surface-elevated`, `on-surface`, `on-surface-muted`, `on-surface-dim`, `on-surface-sublabel`).
- Typography roles (`headline-display`, `headline-lg`, `body-lg`, `body-md`, `label-md`, `label-caps`).
- Rounded scale, spacing scale, component recipes, Do's and Don'ts.

The canonical machine-readable mirror lives in `design.tokens.json` (regenerated from `DESIGN.md`).

## Tools

- `npm run design:lint` — verify `DESIGN.md` is spec-compliant. Exit 0 = clean.
- `npm run design:tailwind` — regenerate `design.tokens.json` from `DESIGN.md`. Run this after editing `DESIGN.md`; then mirror the `colors` block into the inline `tailwind.config` in `index.html`.
- `npm run design:spec` — print the DESIGN.md spec itself (reference).

## Procedure

1. **Read `DESIGN.md`.** Open it and skim Overview + Components + Do's and Don'ts. Keep it in context while coding.
2. **Reuse before creating.** Check `components/ui/` for existing primitives: `GlassPanel`, `GoldButton`, `Button`, `Card`, `Badge`, `Input`, `Textarea`, `Loader`, `AnimatedBorder`, `ImageModal`. Compose from these before writing new ones.
3. **Reference roles, not hex.** In new code use role names: `bg-primary` (gold), `bg-surface`, `text-on-surface-muted`, etc. Do **not** use `bg-brand-primary` or `bg-background-dark` — those are legacy aliases kept only for backward compatibility; new work should bypass them.
4. **Icons.** `lucide-react` only. No icon fonts, no text-string icons, no raster.
5. **Enforce the Do's and Don'ts.** In particular: never `bg-black`; never conventional drop shadows for elevation (use glass + blur); never introduce new accent colors.
6. **Lint.** If you also edited `DESIGN.md`, run `npm run design:lint` — must return exit 0 before finalizing.
7. **Never touch `services/geminiService.ts`** when doing UI work.

## Outputs

- One or more `.tsx` files under `components/` that compose existing primitives, reference DESIGN.md roles, and pass `npm run design:lint` if `DESIGN.md` was modified.

## When the spec should change

If the design needs a new color, typography scale, or component pattern that doesn't exist in `DESIGN.md`:
1. Add it to `DESIGN.md` (YAML frontmatter + markdown body).
2. Run `npm run design:lint` — fix any errors/warnings.
3. Run `npm run design:tailwind` and mirror the new entries into the `tailwind.config` block in `index.html`.
4. Then write the component.

Never add a new accent color, radius, or spacing value directly in a component without first defining the role in `DESIGN.md`.
