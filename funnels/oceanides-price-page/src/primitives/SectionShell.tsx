import React from 'react';

// ===========================================================================
// SectionShell — the ONLY place vertical rhythm and max-width live.
//
// Sections never set their own page padding; they hand the shell a rhythm and
// a width and stay pure content. That is what keeps a 15-section longform page
// reading as one document instead of fifteen bolted-together strips, and what
// guarantees the mobile no-horizontal-scroll rule holds everywhere at once.
//
//   rhythm  shell = full section beat   band = tight strip (proof bars, footers)
//   width   shell = 72rem grid          prose = 46rem reading measure
// ===========================================================================

interface SectionShellProps {
  children: React.ReactNode;
  id?: string;
  rhythm?: 'shell' | 'band';
  width?: 'shell' | 'prose';
  /**
   * `proof` is the documented light band. For this instance the chapter GROUNDS
   * (src/index.css, painted by Landing.tsx) do that job page-wide; this stays
   * for template configs that want a single light section.
   */
  tone?: 'default' | 'proof';
  className?: string;
}

const RHYTHM = {
  shell: 'py-16 md:py-24',
  band: 'py-8 md:py-10',
} as const;

const WIDTH = {
  shell: 'max-w-shell',
  prose: 'max-w-prose',
} as const;

export const SectionShell: React.FC<SectionShellProps> = ({
  children,
  id,
  rhythm = 'shell',
  width = 'shell',
  tone = 'default',
  className = '',
}) => (
  <section
    id={id}
    // `ground-paper` carries the inverted text ladder with it, so a proof band
    // never needs `text-black` — which DESIGN.md bans outright anyway.
    className={`w-full ${RHYTHM[rhythm]} ${tone === 'proof' ? 'ground-paper' : ''} ${className}`}
  >
    <div className={`mx-auto w-full ${WIDTH[width]} px-5 md:px-8`}>{children}</div>
  </section>
);
