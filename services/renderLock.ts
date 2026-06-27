import type { LockablePresetId } from '../types';

// Pre-render look-lock — the single chokepoint between a user's locked look and
// the FinalRenderRequest sent to the render executor.
//
// Premortem #1 (drawplan-refactor resume doc): the locked preset id silently
// getting dropped on the GenerateVideo → App.tsx editorBatch → EditVideo →
// renderFinalVideo() hop. Funnelling ALL preset construction through this one
// pure function means the React threading is plain prop passing, and the only
// place a drop could happen is unit-tested here.

/**
 * Build the `FinalRenderRequest.preset` field from a (possibly absent) locked
 * preset id. A locked id → `{ id }` (server honors it verbatim via
 * `resolvePreset`'s explicit-id branch). No lock → `undefined` → server rotates
 * deterministically, i.e. today's behavior. Pure; no side effects.
 */
export function buildLockedPreset(
  lockedPresetId: LockablePresetId | null | undefined
): { id: LockablePresetId } | undefined {
  return lockedPresetId ? { id: lockedPresetId } : undefined;
}
