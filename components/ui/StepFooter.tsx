import React from 'react';
import { GoldButton } from './GoldButton';
import { MAT_CHROME_MOBILE } from './materialTokens';

// ===========================================================================
// StepFooter — the shared wizard nav bar: ghost BACK on the left, gold CONFIRM
// (GoldButton, so the existing tick/toast behavior is preserved) on the right,
// with an optional center slot. Standardized padding kills the per-step footer
// drift; sticks to the bottom on mobile so the CTA is always reachable.
//
// Escape hatches (Risk R4):
//  • center      — node between BACK and CONFIRM (e.g. export/secondary action).
//  • hideBack    — Step 1 has no back.
//  • renderNext  — fully custom right slot when CONFIRM isn't a plain button.
//
// PRESENTATIONAL ONLY: callers pass their existing onBack/onNext handlers
// verbatim — this relocates the buttons, it does not change what they do.
// ===========================================================================

export const StepFooter: React.FC<{
  onBack?: () => void;
  backLabel?: string;
  hideBack?: boolean;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextIcon?: React.ReactNode;
  center?: React.ReactNode;
  renderNext?: React.ReactNode;
}> = ({
  onBack,
  backLabel = 'BACK',
  hideBack,
  onNext,
  nextLabel = 'CONFIRM',
  nextDisabled,
  nextIcon,
  center,
  renderNext,
}) => (
  // On mobile this bar detaches and floats over the form it belongs to, so
  // that — and only that — is when it earns the CHROME tier (`mat-chrome-mobile`
  // is breakpoint-scoped in index.css). On desktop it stays an in-flow rule at
  // the bottom of the panel: content, not chrome.
  <div className={`mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6 max-md:sticky max-md:bottom-3 max-md:z-30 max-md:rounded-2xl max-md:border-t-0 max-md:p-3 ${MAT_CHROME_MOBILE}`}>
    {hideBack ? (
      <span />
    ) : (
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-white/10 px-8 py-3 text-xs font-mono uppercase tracking-widest text-zinc-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        {backLabel}
      </button>
    )}

    {center && <div className="min-w-0 flex-1 text-center">{center}</div>}

    {renderNext ?? (
      <GoldButton
        onClick={onNext}
        disabled={nextDisabled}
        className="flex items-center justify-center gap-2 rounded-full px-12"
      >
        {nextIcon}
        {nextLabel}
      </GoldButton>
    )}
  </div>
);

export default StepFooter;
