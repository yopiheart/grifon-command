/**
 * Tailwind config — migrated out of the `index.html` inline `tailwind.config = {}`
 * block on 2026-07-25, when the `cdn.tailwindcss.com` Play CDN was replaced with a
 * real PostCSS build. The `theme.extend` below is a VERBATIM port of that inline
 * block: same roles, same hex values, same transitional aliases. Nothing was
 * retuned in the move — a value change here is a DESIGN.md change and needs its
 * own commit.
 *
 * To regenerate the canonical tokens: `npm run design:tailwind`
 * (output: design.tokens.json), then mirror the `colors` block below.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  /**
   * The Play CDN scanned the live DOM at runtime, so it could never miss a class.
   * A PostCSS build scans source text instead, so this list has to cover every
   * file that can contribute a class name. `className=` currently appears only in
   * `components/` and `App.tsx`, but token modules (`components/ui/*Tokens.ts`)
   * hold bare class strings, and `index.html` styles `<body>` directly.
   *
   * `tests/` and `api/` are deliberately absent — neither renders UI.
   */
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './config/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './dev/**/*.{ts,tsx}',
  ],

  /**
   * The material tiers are the one part of index.css that Tailwind can DELETE.
   * Custom CSS inside `@layer components` is tree-shaken against `content`, so a
   * tier whose class name stopped being detected would vanish from the bundle and
   * take every glass surface in the app with it — silently, with a green build.
   *
   * All six are currently found via their `materialTokens.ts` literals, so this
   * list is redundant today. It is here so that a future refactor of those
   * constants (`MAT_CHROME` → a computed name, a `clsx` map, anything) cannot
   * quietly strip the material system. Cheap insurance: six class names.
   *
   * Everything else in index.css sits OUTSIDE `@layer`, and unlayered CSS is
   * never tree-shaken — the a11y guards, the `animate-*` reduced-motion
   * overrides, `.lens-ring`, `.rail-hue` and the `osa-*`/`aura-*` keyframes all
   * survive without help.
   */
  safelist: [
    'mat-chrome',
    'mat-plate',
    'mat-plate-inset',
    'mat-slab',
    'mat-veil',
    'scroll-edge',
  ],

  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        oswald: ['Oswald', 'sans-serif'],
        // serif-accent (DESIGN.md): marketing headline accent words + marquees ONLY
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        // --- DESIGN.md roles (canonical) ---
        'primary':             '#FFCC00',
        'surface':             '#09090B',
        'surface-elevated':    '#18181B',
        'on-surface':          '#FFFFFF',
        'on-surface-muted':    '#D4D4D8',
        'on-surface-dim':      '#A1A1AA',
        'on-surface-sublabel': '#82828B',

        // --- Transitional aliases (legacy names → DESIGN.md values) ---
        // The old `brand-primary` was purple (#D67BFF) — purged per design directive.
        // Delete each alias as its consumers migrate to role names.
        'brand-primary':       '#FFCC00', // was purple; now gold
        'brand-yellow':        '#FFCC00', // alias of primary
        'brand-yellow-dark':   '#B28F00',
        'brand-green':         '#10B981', // success signal; not in DESIGN.md
        'brand-light':         '#D4D4D8', // → on-surface-muted
        'brand-dark':          '#09090B', // → surface (was #050505)
        'brand-secondary':     '#71717A', // → on-surface-sublabel
        'background-dark':     '#09090B', // → surface (was #050505)
        'background-light':    '#18181B', // → surface-elevated (was #111111)
        'input-bg':            'rgba(255, 255, 255, 0.05)',
        'text-primary':        '#FFFFFF', // → on-surface
        'text-secondary':      '#A1A1AA', // → on-surface-dim
        'border-color':        'rgba(255, 255, 255, 0.08)',
        // Marketing light band exception (DESIGN.md) — max ONE band per marketing page
        'proof-band':          '#F2F1EA',
      },
    },
  },

  plugins: [],
};
