import React from 'react';

// ===========================================================================
// goldEmphasis — renders `**wrapped**` runs in amber inside an Anton headline.
//
// clients/oceanides/DESIGN.md names this as a component of the system:
// "gold-emphasis Anton headline (1-2 amber words)". Anton ships a SINGLE weight
// ("walang bold/italic variants; huwag i-fake"), so the brand cannot emphasise
// with weight the way a normal type system does — COLOUR is the only emphasis
// channel it has. That makes this helper load-bearing, not decoration.
//
// The `**…**` convention keeps FunnelConfig headlines plain strings: config
// carries copy, never markup, and never JSX.
//
// Discipline: 1-2 runs per headline. Amber is the ONLY accent in the system, so
// spending it on five words spends the scroll-stop it exists to buy.
// ===========================================================================

const TOKEN = /\*\*(.+?)\*\*/g;

export const goldEmphasis = (text: string): React.ReactNode => {
  if (!text.includes('**')) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(text.slice(cursor, at));
    out.push(
      <span key={`${at}-${match[1]}`} className="text-brand-primary">
        {match[1]}
      </span>,
    );
    cursor = at + match[0].length;
  }

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
};
