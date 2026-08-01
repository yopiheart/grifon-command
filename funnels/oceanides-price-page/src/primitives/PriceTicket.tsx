import React from 'react';
import type { PriceTicketData } from '../config.types';
import { EyebrowChip } from './EyebrowChip';

// ===========================================================================
// PriceTicket — the page's promise, printed.
//
// The whole funnel exists because "magkano?" was being answered with "depende,
// 4k to 4500" and the conversation died there. The copy already answers it. The
// PAGE did not LOOK like it answered it: the number was a headline, and a
// headline is a claim. A quotation is a document.
//
// So this is a document. White stock, 2px DASHED rule, an amber tab clipped over
// the top edge, line items with the amounts on the right, and the conditional
// charges other siphoners hide printed underneath — under a label that says
// exactly what they are ("kung kailangan lang"). Nothing here is invented; every
// figure is Boss Jay's, and every one already appears in the objection section.
// Seeing them BEFORE you scroll is the point.
//
// Materials, per clients/oceanides/DESIGN.md: "print devices ang elevation
// language — dashed ticket borders, amber section tabs." No blur, no glow, no
// drop shadow. The `on-paper` class flips the text ladder for this subtree
// (headings #0B1B33, meta #5B6B85, cards white) because the ticket is a paper
// OBJECT sitting on a navy ground — the one place the two worlds touch.
//
// Amber appears here only as the tab FILL with surface-deep text. Amber TEXT on
// paper is 1.7:1 and is a hard ban.
// ===========================================================================

/** Right-hand amounts line up as a column, so the eye can compare them. */
const AMOUNT = 'shrink-0 tabular-nums text-brand-on-surface';

export const PriceTicket: React.FC<PriceTicketData> = ({ tab, lead, addOnsLabel, addOns, footnote }) => (
  <div className="on-paper relative rounded-[4px] border-2 border-dashed border-[rgba(11,27,51,0.35)] bg-brand-card px-5 pb-6 pt-8 md:px-7 md:pb-7">
    {/* The tab is clipped OVER the dashed edge, the way a filing tab sits proud
        of the folder it labels. -top-3 lands it half on, half off. */}
    <EyebrowChip className="absolute -top-3 left-5">{tab}</EyebrowChip>

    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm font-bold leading-snug text-brand-on-surface md:text-base">
        {lead.label}
        {lead.sub && (
          <span className="mt-1 block text-xs font-normal leading-snug text-brand-on-surface-dim">
            {lead.sub}
          </span>
        )}
      </span>
      <span className={`${AMOUNT} font-display text-[2rem] leading-none tracking-[0.5px] md:text-[2.5rem]`}>
        {lead.amount}
      </span>
    </div>

    <div className="mt-5 border-t border-[rgba(11,27,51,0.18)] pt-4">
      <p className="text-[10px] font-black uppercase leading-none tracking-[1px] text-brand-on-surface-dim">
        {addOnsLabel}
      </p>
      <ul className="mt-3 space-y-2.5">
        {addOns.map((row) => (
          <li key={row.label} className="flex items-baseline justify-between gap-4 text-sm leading-snug">
            <span className="text-brand-on-surface-muted">{row.label}</span>
            <span className={`${AMOUNT} font-bold`}>{row.amount}</span>
          </li>
        ))}
      </ul>
    </div>

    {/* Second dashed rule = the tear-off line of a real work order. */}
    <p className="mt-5 flex items-start gap-2 border-t-2 border-dashed border-[rgba(11,27,51,0.25)] pt-4 text-[13px] leading-snug text-brand-on-surface-muted">
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="mt-0.5 h-4 w-4 shrink-0 stroke-brand-good"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
      <span>{footnote}</span>
    </p>
  </div>
);
