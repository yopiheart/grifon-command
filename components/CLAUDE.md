# components/ — React UI Modules

All UI lives here. Wizard and module state lives in [`../App.tsx`](../App.tsx) and is passed as props — there is no Context, Redux, or Zustand. Don't add one.

## Hard Rules (from [`../DESIGN.md`](../DESIGN.md))

- **Canvas:** `bg-zinc-950` (never `bg-black`)
- **Primary accent:** `#FFCC00` (Grifon Gold) — active states, main buttons, focus rings
- **Panels:** wrap forms and tool settings in [`<GlassPanel>`](ui/GlassPanel.tsx)
- **Primary button:** [`<GoldButton>`](ui/GoldButton.tsx). Ghost button: `bg-zinc-950 border border-white/10` with gold hover.
- **Inputs:** `bg-zinc-950 border border-white/10 rounded-xl focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`
- **Icons:** only `lucide-react` SVG icons, exported through [`icons.tsx`](icons.tsx) — never raw text strings
- **Headers:** `bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500` (vertical fade — multi-line page titles read like a movie title card)
- **Sub-labels:** `text-[10px] text-zinc-500 font-mono uppercase tracking-widest`

## Reusable Primitives ([`ui/`](ui/))

`GlassPanel`, `GoldButton`, `Button`, `Card`, `Input`, `Textarea`, `Badge`, `Loader`, `AnimatedBorder`, `AudioRecorder`, `ImageModal`, `ErrorBoundary`, `LegalPageLayout`, `PlaceholderTool`. **Use them. Don't recreate inline.**

## Conventions

- **Wizard:** [`Step1ClientDetails`](Step1ClientDetails.tsx) → [`Step7FinalOutput`](Step7FinalOutput.tsx). Step 6 forks ([`Step6Thumbnail`](Step6Thumbnail.tsx) and [`Step6VideoPrompts`](Step6VideoPrompts.tsx)) — preserve the fork; don't collapse without checking [`../App.tsx`](../App.tsx)'s flow logic.
- **Step components are presentational.** They take `data` + `setData` props. Service calls happen in `App.tsx` event handlers, not inside steps.
- **Dashboard modules** are switched on `activeModule` string state in [`../App.tsx`](../App.tsx). One file per module unless complexity warrants a folder (see [`SignalModulator/`](SignalModulator/)).
- **Domain vocabulary is load-bearing.** Avatar (wizard) ≠ Influencer (Influencer Forge); wizard Script ≠ Influencer Script; Storyboard ≠ Cinematic Relay. See [`../UBIQUITOUS_LANGUAGE.md`](../UBIQUITOUS_LANGUAGE.md).

## Adding a Module

1. Create `components/MyModule.tsx` using [`ui/`](ui/) primitives.
2. Wire it into [`Dashboard.tsx`](Dashboard.tsx) and the `activeModule` switch in [`../App.tsx`](../App.tsx).
3. Lift state into `App.tsx` (or local hooks for ephemeral state) — do not introduce Context/Redux.
4. If the module exceeds ~300 lines or has multiple sub-views, promote to a folder pattern (see [`SignalModulator/`](SignalModulator/)).
