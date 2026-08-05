import React from 'react';
import { EyebrowChip } from './EyebrowChip';
import { goldEmphasis } from '../lib/goldEmphasis';

// ===========================================================================
// SectionHeading — ONE heading treatment for the whole page.
//
// Neil, 2026-07-30: "make sure lumitaw ung mga headlines sa lahat ng section
// katulad ng sa hero." The template gives each section its own inline <h2> at
// `text-2xl font-bold`, which is Inter semantics — on Anton, `font-bold`
// silently does NOTHING (single weight; DESIGN.md: "walang bold/italic
// variants; huwag i-fake"), so every heading below the hero landed a full tier
// quieter than it should. That is the actual reason the page read as plain.
//
// This fixes it in one place:
//   - Anton scale that reads as a sibling of the hero, not a subhead
//   - `**amber**` runs through goldEmphasis — the brand's only emphasis channel
//   - an optional eyebrowChip, so a section can announce itself the way the
//     hero does
//   - an amber rule under the chip: the print device that replaces the
//     drop-shadows and glows a glass system would use
//
// `align` defaults to left. The brand is a print world and print sets on a left
// rail; centred columns read as a slide deck.
// ===========================================================================

interface SectionHeadingProps {
  children: string;
  eyebrow?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({
  children,
  eyebrow,
  align = 'left',
  className = '',
}) => (
  <div className={`${align === 'center' ? 'text-center' : ''} ${className}`}>
    {eyebrow && (
      <div className="mb-4">
        <EyebrowChip>{eyebrow}</EyebrowChip>
      </div>
    )}
    <h2 className="text-[1.75rem] leading-[0.95] md:text-[2.75rem]">{goldEmphasis(children)}</h2>
    <span
      aria-hidden
      className={`mt-5 block h-[3px] w-14 bg-brand-primary ${align === 'center' ? 'mx-auto' : ''}`}
    />
  </div>
);
