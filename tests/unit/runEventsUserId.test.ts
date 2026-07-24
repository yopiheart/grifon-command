import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// The events sink's attribution contract (2026-07-24). COGS rows are written with the
// VERIFIED caller's id so the owner-scoped run_cogs roll-up can exclude spend logged
// against a forged x-run-id. The sink is best-effort: a row with NO userId must still be
// written (as user_id null), and nothing here may ever throw into the request path.
//
// Asserted against the real logRunEvent with a fake Supabase client at the insert seam.

import { logRunEvent } from '../../api/_lib/runEvents.js';

const fakeAdmin = (insert: ReturnType<typeof vi.fn>) =>
  ({ from: () => ({ insert }) }) as unknown as SupabaseClient;

describe('logRunEvent — cogs attribution', () => {
  it('writes the verified user_id on a cogs row', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    await logRunEvent(fakeAdmin(insert), {
      userId: 'user-owner-1',
      runId: 'apr_run123',
      event: 'cogs',
      meta: { kind: 'text', estUsd: 0.001 },
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-owner-1',
      run_id: 'apr_run123',
      event: 'cogs',
    });
  });

  it('still writes the row (user_id null) when no userId is supplied', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    await expect(
      logRunEvent(fakeAdmin(insert), { runId: 'apr_run123', event: 'cogs', meta: { estUsd: 0.001 } })
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({ user_id: null, run_id: 'apr_run123' });
  });

  it('a throwing insert is swallowed — telemetry never breaks the request path', async () => {
    const insert = vi.fn(async () => {
      throw new Error('supabase_down');
    });
    await expect(
      logRunEvent(fakeAdmin(insert), { userId: 'user-owner-1', runId: 'apr_run123', event: 'cogs' })
    ).resolves.toBeUndefined();
  });
});
