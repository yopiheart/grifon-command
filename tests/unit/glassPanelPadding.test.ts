import { describe, it, expect } from 'vitest';
import { declaresPadding, resolvePanelPadding } from '../../components/ui/GlassPanel.js';

// GlassPanel hardcoded `p-8` in its base classes. Tailwind utilities share one specificity
// level, so the winner is whichever rule lands LATER IN THE GENERATED STYLESHEET — and `.p-8`
// sorts after every other `p-<n>`. Measured in the built CSS 2026-07-25:
//   p-0 @46376  p-10 @46459  p-12 @46480  p-4 @46586  p-5 @46604  p-6 @46625  p-8 @46666
// Every one of the 43 override sites in components/ was therefore silently rendering at 32px,
// including p-10 and p-12 which lost to a SMALLER value. It only worked before because the
// Tailwind Play CDN emitted utilities in discovery order; PR #74's PostCSS build sorts them.
//
// The contract under test: if a caller states a full-padding intent, the panel emits no default,
// so only ONE padding rule exists and stylesheet order stops mattering at all.

describe('GlassPanel padding ownership', () => {
  it.each(['p-0', 'p-4', 'p-6', 'p-10', 'p-12'])('yields to a caller’s %s', (p) => {
    expect(resolvePanelPadding(`relative overflow-hidden ${p}`)).toBe('');
  });

  it('keeps its default when the caller says nothing about padding', () => {
    expect(resolvePanelPadding('relative overflow-hidden rounded-xl')).toBe('p-8');
    expect(resolvePanelPadding('')).toBe('p-8');
  });

  it('is not fooled by other utilities that merely CONTAIN "p-<n>"', () => {
    // The bug this prevents is the mirror of the original: a false positive here would strip
    // padding from a panel that never asked, breaking layout app-wide in the other direction.
    for (const cls of ['gap-8', 'snap-8', 'gap-8 space-y-4', 'top-8', 'w-full gap-6']) {
      expect(declaresPadding(cls)).toBe(false);
      expect(resolvePanelPadding(cls)).toBe('p-8');
    }
  });

  it('ignores responsive and state variants, which do not need the default removed', () => {
    // `md:p-4` lives in a media query and `hover:p-2` in a higher-specificity context — both
    // already beat a bare `p-8`, so the base breakpoint must KEEP its default padding.
    expect(resolvePanelPadding('md:p-4')).toBe('p-8');
    expect(resolvePanelPadding('hover:p-2 lg:p-12')).toBe('p-8');
    // …but a bare value alongside a variant still means the caller owns padding.
    expect(resolvePanelPadding('p-4 md:p-8')).toBe('');
  });

  it('matches a padding class anywhere in the string, not just at the edges', () => {
    expect(resolvePanelPadding('flex p-0 items-center')).toBe('');
    expect(resolvePanelPadding('h-full p-6 flex flex-col gap-6 overflow-hidden')).toBe('');
  });
});
