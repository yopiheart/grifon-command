import React from 'react';
import { X } from 'lucide-react';
import { R_MODAL, T_CTRL } from './wizardTokens';
import { MAT_SLAB, MAT_VEIL } from './materialTokens';

// ===========================================================================
// Modal — centered glass shell (rounded-3xl), backdrop-click closes, scrolls
// inside on short viewports. Extracted verbatim from the One-Shot composer
// (LaunchScreen.tsx) for reuse by the advanced wizard's disclosure surfaces.
// `wide` widens to max-w-2xl (e.g. multi-column pickers).
// ===========================================================================

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  // SLAB behind a VEIL. A modal has taken the screen, so it stops being
  // translucent — Apple's own rule for a sheet at full height.
  <div className={`fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center ${MAT_VEIL}`} onClick={onClose}>
    <div
      className={`max-h-[90vh] w-full overflow-y-auto border border-white/10 p-5 ${MAT_SLAB} ${R_MODAL} ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className={`text-zinc-100 ${T_CTRL}`}>{title}</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-on-surface-sublabel hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;
