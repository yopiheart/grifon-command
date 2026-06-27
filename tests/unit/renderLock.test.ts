import { describe, it, expect } from 'vitest';
import { buildLockedPreset } from '../../services/renderLock.js';
import type { LockablePresetId } from '../../types.js';

// Premortem #1 guard (drawplan-refactor look-lock): prove the locked preset id
// survives into the render request's `preset` field, and that absence means
// "server rotates" (no preset override) — not a dropped/garbled id.

describe('buildLockedPreset', () => {
  it('wraps a locked id into the FinalRenderRequest.preset shape verbatim', () => {
    const ids: LockablePresetId[] = ['classic', 'impact', 'hype', 'clean'];
    for (const id of ids) {
      expect(buildLockedPreset(id)).toEqual({ id });
    }
  });

  it('returns undefined when no look is locked → server rotates (today behavior)', () => {
    expect(buildLockedPreset(undefined)).toBeUndefined();
    expect(buildLockedPreset(null)).toBeUndefined();
  });
});
