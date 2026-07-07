// api/_lib/omniBeta.ts — beta allowlist gate for the Omni Edit Styles feature.
//
// Server-only (never bundled; the var carries NO VITE_ prefix). Deploy contract:
// OMNI_STYLES_BETA_ALLOWLIST is set in Vercel BEFORE the feature merges to main,
// scoping the paid Omni pass to a hand-picked cohort during beta. Each entry is a
// user email OR a user id (comma-separated). Deleting the var = public launch
// (an unset/empty var opens the feature to everyone who otherwise qualifies).

/**
 * Decide whether a user is inside the Omni beta cohort.
 *   - `rawAllowlist` undefined / empty / whitespace-only → true (no beta wall).
 *   - otherwise: comma-split, trim, drop empties, compare case-insensitively;
 *     allowed iff the user's email OR id matches an entry.
 */
export function isOmniBetaAllowed(
  rawAllowlist: string | undefined,
  user: { id: string; email?: string | null }
): boolean {
  if (!rawAllowlist || !rawAllowlist.trim()) return true;
  const entries = rawAllowlist
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (entries.length === 0) return true;
  const email = user.email?.toLowerCase();
  const id = user.id.toLowerCase();
  return entries.some((e) => e === id || (email !== undefined && e === email));
}
