import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseServerRenderJobs,
  getSeenRenderJobs,
  hasSeenRenderJob,
  markRenderJobSeen,
} from '../../services/serverJobsService.js';

// In-memory localStorage so the seen-ledger logic is exercised regardless of the
// test environment (node or jsdom).
beforeEach(() => {
  const store = new Map<string, string>();
  const mock = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
  // @ts-ignore — minimal window shim for isBrowser()
  globalThis.window = globalThis.window || ({} as any);
  // @ts-ignore
  globalThis.window.localStorage = mock;
});

describe('parseServerRenderJobs', () => {
  it('keeps well-formed jobs and normalizes optional fields', () => {
    const out = parseServerRenderJobs({
      jobs: [
        { jobId: 'a', status: 'processing' },
        { jobId: 'b', status: 'done', url: 'https://x/v.mp4', downloadUrl: 'https://x/d.mp4', updatedAt: '2026-06-18T00:00:00Z' },
      ],
    });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ jobId: 'a', status: 'processing', url: undefined, downloadUrl: undefined, updatedAt: undefined });
    expect(out[1].url).toBe('https://x/v.mp4');
  });

  it('drops entries with a missing id or an invalid status', () => {
    const out = parseServerRenderJobs({
      jobs: [
        { jobId: 'a', status: 'done' },
        { status: 'done' }, // no id
        { jobId: 'c', status: 'queued' }, // invalid status
        { jobId: 'd' }, // no status
      ],
    });
    expect(out.map((j) => j.jobId)).toEqual(['a']);
  });

  it('returns [] for a missing/garbage payload instead of throwing', () => {
    expect(parseServerRenderJobs(undefined)).toEqual([]);
    expect(parseServerRenderJobs({})).toEqual([]);
    expect(parseServerRenderJobs({ jobs: 'nope' })).toEqual([]);
  });
});

describe('seen-ledger', () => {
  it('marks a job seen and reports it', () => {
    expect(hasSeenRenderJob('job-1')).toBe(false);
    markRenderJobSeen('job-1');
    expect(hasSeenRenderJob('job-1')).toBe(true);
    expect(getSeenRenderJobs()).toContain('job-1');
  });

  it('is idempotent — marking twice does not duplicate', () => {
    markRenderJobSeen('job-1');
    markRenderJobSeen('job-1');
    expect(getSeenRenderJobs().filter((id) => id === 'job-1')).toHaveLength(1);
  });

  it('caps the ledger at 50, dropping the oldest', () => {
    for (let i = 0; i < 60; i++) markRenderJobSeen(`job-${i}`);
    const seen = getSeenRenderJobs();
    expect(seen).toHaveLength(50);
    // newest retained, oldest evicted
    expect(seen).toContain('job-59');
    expect(seen).not.toContain('job-0');
  });
});
