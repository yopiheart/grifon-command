import React, { useEffect, useRef } from 'react';
import { CTRL_H, R_CTRL, R_PANEL, T_CTRL } from './wizardTokens';

// ===========================================================================
// Popover — a pill trigger (h-11) that toggles a rounded-2xl dropdown panel.
// Extracted verbatim from the One-Shot composer (LaunchScreen.tsx) so the
// advanced wizard can reuse the same progressive-disclosure surface. Used to
// tuck SECONDARY/optional controls away while keeping the current value visible
// on the collapsed trigger (anti-dumbing rule — see the redesign plan).
// ===========================================================================

/** Close a popover/menu when clicking outside its wrapper. Only listens while
 * `enabled` (open) — otherwise a CLOSED popover's listener would fire on every
 * click and slam the OPEN sibling shut on mousedown, eating the real click. */
export function useClickOutside<T extends HTMLElement>(onClose: () => void, enabled: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!enabled) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose, enabled]);
  return ref;
}

/** A pill button that toggles a dropdown panel. h-11 trigger; panel is rounded-2xl. */
export const Popover: React.FC<{
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
  /** Fill the parent column (labeled control row) instead of shrinking on desktop. */
  fullWidth?: boolean;
}> = ({ open, onOpen, onClose, trigger, children, align = 'left', disabled, fullWidth }) => {
  const ref = useClickOutside<HTMLDivElement>(onClose, open);
  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : 'shrink-0'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? onClose() : onOpen())}
        className={`inline-flex w-full items-center gap-2 border px-4 ${CTRL_H} ${R_CTRL} ${T_CTRL} transition-all ${fullWidth ? 'justify-between' : 'justify-center md:w-auto'} ${
          disabled
            ? 'cursor-not-allowed border-white/5 text-zinc-600'
            : open
              ? 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]'
              : 'border-white/10 text-zinc-300 hover:border-white/30'
        }`}
      >
        {trigger}
      </button>
      {open && !disabled && (
        <div className={`absolute z-40 mt-2 max-h-[70vh] overflow-y-auto border border-white/10 bg-zinc-900/90 p-3 backdrop-blur-xl ${R_PANEL} ${align === 'right' ? 'right-0' : 'left-0'} max-md:left-0 max-md:right-0`}>
          {children}
        </div>
      )}
    </div>
  );
};

export default Popover;
