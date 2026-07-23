import { afterEach, describe, expect, it, vi } from 'vitest';

// Encodes audit HIGH #2: the dev-unmetered bypass must never be live on Vercel.
// supabaseAdmin.ts throws at module load if a GRIFON_DEV_UNMETERED[_VIDEO] flag is
// set while running on Vercel — every api/ proxy imports it, so the whole function
// fails to boot rather than silently unmetering prod.
describe('supabaseAdmin dev-unmetered prod guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('throws on import when VERCEL is set and GRIFON_DEV_UNMETERED=true', async () => {
    vi.resetModules();
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('GRIFON_DEV_UNMETERED', 'true');
    await expect(import('../../api/_lib/supabaseAdmin.js')).rejects.toThrow('DEV_UNMETERED_ON_VERCEL');
  });

  it('throws on import when VERCEL is set and GRIFON_DEV_UNMETERED_VIDEO=true', async () => {
    vi.resetModules();
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('GRIFON_DEV_UNMETERED_VIDEO', 'true');
    await expect(import('../../api/_lib/supabaseAdmin.js')).rejects.toThrow('DEV_UNMETERED_ON_VERCEL');
  });

  it('does not throw on Vercel when neither flag is set', async () => {
    vi.resetModules();
    vi.stubEnv('VERCEL', '1');
    await expect(import('../../api/_lib/supabaseAdmin.js')).resolves.toBeDefined();
  });

  it('does not throw locally (no VERCEL) even with the flag set', async () => {
    vi.resetModules();
    vi.stubEnv('GRIFON_DEV_UNMETERED', 'true');
    await expect(import('../../api/_lib/supabaseAdmin.js')).resolves.toBeDefined();
  });
});
