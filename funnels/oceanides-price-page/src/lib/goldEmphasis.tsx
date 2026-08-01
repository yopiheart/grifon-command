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
//
// The colour is `accent-text`, not `primary`, because it is GROUND-RELATIVE:
// amber on navy is 8.8:1, but amber on the paper chapters is 1.7:1 and a hard
// ban in the DESIGN.md contrast floor. On paper the token resolves to ocean
// (#1C63AD, 5.7:1). The name of the helper stays `goldEmphasis` — every heading
// on the page calls it, and the concept is "the one emphasis run", not the hex.
// ===========================================================================

// `==…==` is the second channel (2026-08-01, hiniling ni Neil galing sa Suby
// longform evidence): a HIGHLIGHTER stroke — amber fill, surface-deep text,
// the literal marker-pen-on-paper device of the print world. Amber bg + navy
// text is 8.8:1 sa lahat ng ground, kaya ground-agnostic sya (walang paper
// branching, di tulad ng accent TEXT). box-decoration-break:clone keeps the
// fill padding on every wrapped line, hindi lang sa una.
//
// Discipline, pareho sa amber runs: iisang highlight kada section, sa linya
// na sinasabi ang buong benta. Kapag lahat naka-highlight, walang naka-highlight.
const TOKEN = /\*\*(.+?)\*\*|==(.+?)==/g;

export const goldEmphasis = (text: string): React.ReactNode => {
  if (!text.includes('**') && !text.includes('==')) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TOKEN)) {
    const at = match.index ?? 0;
    if (at > cursor) out.push(text.slice(cursor, at));
    if (match[1] !== undefined) {
      out.push(
        <span key={`${at}-${match[1]}`} className="text-brand-accent-text">
          {match[1]}
        </span>,
      );
    } else {
      out.push(
        <mark
          key={`${at}-${match[2]}`}
          className="bg-brand-primary px-1 py-px text-brand-elevated [-webkit-box-decoration-break:clone] [box-decoration-break:clone]"
        >
          {match[2]}
        </mark>,
      );
    }
    cursor = at + match[0].length;
  }

  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
};
