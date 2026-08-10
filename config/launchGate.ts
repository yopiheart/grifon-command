// ===========================================================================
// LAUNCH GATE — shared constants + pure helpers for the pre-launch curtain.
//
// Imported by BOTH sides of the wire:
//   browser  — services/launchGate.ts, components/LaunchLock.tsx
//   server   — api/gate.ts (Vercel Function)
//
// It therefore must stay free of `import.meta.env`, DOM globals, and Node
// built-ins. Anything environment-specific lives in the two callers, not here.
//
// The curtain is POSITIONING, not a security boundary. The real boundary is
// still Supabase auth + plan gating; this only decides who sees the marketing
// site before launch. What it DOES buy: invite codes never ship in the browser
// bundle (they are matched server-side against LAUNCH_INVITE_CODES), so they
// stay secret and stay revocable by editing one env var.
// ===========================================================================

/** Logical partition keys for the waitlist rows in public.funnel_leads. */
export const WAITLIST_CLIENT_ID = 'grifon';
export const WAITLIST_FUNNEL_ID = 'grifon-launch-waitlist';

/**
 * The VERBATIM line shown under the waitlist email field.
 *
 * Consent doctrine (workflows/consent_capture_plan.md): the proof of consent is
 * the SERVER-stamped record of the exact copy the visitor saw. So this string is
 * rendered by LaunchLock and stamped onto funnel_leads.consent_text by
 * api/gate.ts — one constant, never two drifting copies. Editing it changes what
 * new rows record; existing rows keep the text they were actually shown.
 */
export const WAITLIST_CONSENT_TEXT =
  'Email me when a seat opens. Grifon launch updates only, no spam, unsubscribe anytime.';

/**
 * Canonical form of an invite code: uppercase, A-Z/0-9/dash only.
 *
 * Applied to BOTH the visitor's input and the env list before comparing, so
 * `founder-01`, ` Founder 01 ` and `FOUNDER-01` are the same code. Length is
 * capped so a huge string can't be pushed through the comparison loop.
 */
export const normalizeInviteCode = (raw: string): string =>
  raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 64);

/**
 * Parse the LAUNCH_INVITE_CODES env var into a deduped list of canonical codes.
 * Accepts commas, whitespace, or newlines as separators so pasting a column out
 * of a spreadsheet into the Vercel env field just works.
 */
export const parseInviteCodes = (raw: string | null | undefined): string[] => {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const code = normalizeInviteCode(part);
    if (code) seen.add(code);
  }
  return [...seen];
};

/** Is this input one of the configured codes? Both sides normalized first. */
export const matchesInviteCode = (input: string, codes: readonly string[]): boolean => {
  const candidate = normalizeInviteCode(input);
  return candidate.length > 0 && codes.includes(candidate);
};
