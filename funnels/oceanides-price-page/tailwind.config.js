/** @type {import('tailwindcss').Config} */
// Every brand-owned value resolves to a CSS custom property that `src/theme/brand.ts`
// writes onto :root from FunnelConfig.brand. Nothing here is a literal colour, so a
// funnel re-skin is a config edit, never a class edit.
//
// NOTE: these are raw hex vars, not `rgb(... / <alpha-value>)` triplets — Tailwind
// opacity modifiers (`bg-brand-primary/50`) will NOT work on them. Use the neutral
// white/black overlay utilities for translucency instead; that keeps the brand tokens
// authorable as plain hex in the config, which is the whole point.
export default {
  content: ['./index.html', './thank-you.html', './ops.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: 'var(--brand-primary)',
          surface: 'var(--brand-surface)',
          elevated: 'var(--brand-surface-elevated)',
          'on-surface': 'var(--brand-on-surface)',
          'on-surface-muted': 'var(--brand-on-surface-muted)',
          'on-surface-dim': 'var(--brand-on-surface-dim)',
          'proof-band': 'var(--brand-proof-band)',
          // Ground-relative tokens — these four flip inside .ground-paper /
          // .on-paper (see the ground ladder in src/index.css). Reading them
          // through a class is what keeps sections ground-agnostic: no section
          // ever branches on "am I on navy or paper?".
          ocean: 'var(--brand-ocean)',
          'accent-text': 'var(--brand-accent-text)',
          good: 'var(--brand-good)',
          card: 'var(--brand-card)',
          'card-border': 'var(--brand-card-border)',
          hairline: 'var(--brand-hairline)',
        },
      },
      fontFamily: {
        display: 'var(--brand-font-display)',
        body: 'var(--brand-font-body)',
        accent: 'var(--brand-font-accent)',
      },
      borderRadius: {
        brand: 'var(--brand-radius)',
      },
      maxWidth: {
        shell: '72rem',
        prose: '46rem',
      },
    },
  },
  plugins: [],
};
