import { useEffect, useState } from 'react';

const SESSION_KEY = 'grifon_exit_popup_shown';

const alreadyShown = (): boolean => {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false; // private mode — treat as not-yet-shown
  }
};

const markShown = (): void => {
  try {
    window.sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    /* sessionStorage unavailable — ignore */
  }
};

interface UseExitIntentOptions {
  /** Master switch. Pass `!isAuthenticated && FOUNDING_OFFER.enabled`. */
  enabled: boolean;
}

/**
 * Desktop-only exit-intent. Fires ONCE per session when the cursor leaves the
 * viewport toward the top (tab bar / close button). Deliberately has NO mobile
 * trigger — a mid-scroll/dwell popup reads as a spammy interruption, and PH is
 * mobile-first with an existing top banner + urgency bar. Arms only on real
 * pointer devices via matchMedia.
 */
export const useExitIntent = ({ enabled }: UseExitIntentOptions): { triggered: boolean; dismiss: () => void } => {
  const [triggered, setTriggered] = useState(false);

  const dismiss = () => {
    markShown();
    setTriggered(false);
  };

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    if (alreadyShown()) return;

    // Desktop only: must have a fine pointer that can hover (mouse, not touch).
    const canHover = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    if (!canHover) return;

    const handleMouseOut = (e: MouseEvent) => {
      // Cursor left the document toward the top edge.
      if (e.relatedTarget === null && e.clientY <= 0) {
        if (alreadyShown()) return;
        markShown();
        setTriggered(true);
      }
    };

    document.addEventListener('mouseout', handleMouseOut);
    return () => document.removeEventListener('mouseout', handleMouseOut);
  }, [enabled]);

  return { triggered, dismiss };
};
