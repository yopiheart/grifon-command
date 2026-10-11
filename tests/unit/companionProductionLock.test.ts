import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canSettleCompanionRun, withCompanionProductionLock } from '../../services/companionProductionLock.js';
import type { ProductionRun } from '../../services/producerOrchestrator.js';

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
describe('companion browser production exclusion', () => {
  it('fails closed without browser coordination support', async () => {
    vi.stubGlobal('navigator', {});
    const action = vi.fn();
    await expect(withCompanionProductionLock('alice', 'run:one', action)).rejects.toThrow('updated browser');
    expect(action).not.toHaveBeenCalled();
  });
  it('rejects an occupied run without queuing a stale paid action', async () => {
    const request = vi.fn(async (_name, options, callback) => { expect(options).toEqual({ ifAvailable: true }); return callback(null); });
    vi.stubGlobal('navigator', { locks: { request } });
    const action = vi.fn();
    await expect(withCompanionProductionLock('alice', 'run:one', action)).rejects.toThrow('another tab');
    expect(action).not.toHaveBeenCalled();
    expect(request.mock.calls[0][0]).toBe('grifon-production:alice:run:one');
  });
  it('holds the acquired lock through completion and releases a failure', async () => {
    let held = false;
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => {
      held = true;
      try { return await callback({}); } finally { held = false; }
    } } });
    await expect(withCompanionProductionLock('alice', 'chat:one', async () => {
      expect(held).toBe(true);
      await Promise.resolve();
      expect(held).toBe(true);
      throw new Error('provider failed');
    })).rejects.toThrow('provider failed');
    expect(held).toBe(false);
  });
  it('keeps an unresolved dispatch receipt after rejection and blocks another visit', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) } });
    await expect(withCompanionProductionLock('alice', 'run:one', async receipt => {
      receipt.begin();
      throw new Error('network outcome unknown');
    })).rejects.toThrow('network outcome unknown');
    const next = vi.fn();
    await expect(withCompanionProductionLock('alice', 'run:one', next)).rejects.toThrow('could not be confirmed');
    expect(next).not.toHaveBeenCalled();
  });
  it('does not treat a normally resolved action as proof the paid work is durable', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) } });
    await withCompanionProductionLock('alice', 'run:one', async receipt => { receipt.begin(); });
    await expect(withCompanionProductionLock('alice', 'run:one', vi.fn())).rejects.toThrow('could not be confirmed');
  });
  it('allows another operation only after explicit verified settlement', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) } });
    await withCompanionProductionLock('alice', 'run:one', async receipt => { receipt.begin(); receipt.settle(); });
    const next = vi.fn(async () => 'ready');
    await expect(withCompanionProductionLock('alice', 'run:one', next)).resolves.toBe('ready');
    expect(next).toHaveBeenCalledOnce();
  });
  it('does not dispatch if durable receipt storage fails', async () => {
    vi.stubGlobal('navigator', { locks: { request: async (_name: string, _options: unknown, callback: (lock: object) => Promise<unknown>) => callback({}) } });
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('storage denied'); } });
    const dispatch = vi.fn();
    await expect(withCompanionProductionLock('alice', 'run:one', async receipt => { receipt.begin(); dispatch(); })).rejects.toThrow('safely save');
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('retains the receipt when completed work is absent from the saved checkpoint', async () => {
    const completed = { runId: 'run-one', userId: 'alice', status: 'review', gate: 'storyboard', input: {}, stages: [{ id: 'scene_images', status: 'done' }], scenes: [{ sceneIdx: 0, status: 'pending', imageUrl: 'https://fixture/image.png' }] } as ProductionRun;
    const lostStage = { ...completed, stages: [{ id: 'scene_images', status: 'pending' }] } as ProductionRun;
    const lostImage = { ...completed, scenes: [{ sceneIdx: 0, status: 'pending' }] } as ProductionRun;
    expect(canSettleCompanionRun(completed, lostStage)).toBe(false);
    expect(canSettleCompanionRun(completed, lostImage)).toBe(false);
    expect(canSettleCompanionRun(completed, structuredClone(completed))).toBe(true);
  });
  it('allows a drained image pool only when every resulting frame is durable', () => {
    const stopped = { runId: 'run-one', userId: 'alice', status: 'running', input: {}, stages: [{ id: 'scene_images', status: 'running' }], scenes: [{ sceneIdx: 0, status: 'pending', imageUrl: 'https://fixture/image.png' }], storyboard: [{}] } as ProductionRun;
    expect(canSettleCompanionRun(stopped, structuredClone(stopped))).toBe(true);
    const ambiguous = { ...stopped, stages: [{ id: 'script', status: 'running' }] } as ProductionRun;
    expect(canSettleCompanionRun(ambiguous, structuredClone(ambiguous))).toBe(false);
    const missingEnd = { ...stopped, storyboard: [{ endFramePrompt: 'fixture' }] } as ProductionRun;
    expect(canSettleCompanionRun(missingEnd, structuredClone(missingEnd))).toBe(false);
  });
  it('permits explicit regeneration of a stored quality-flagged image but retains uncertain failures', () => {
    const flagged = { runId: 'run-one', userId: 'alice', status: 'review', gate: 'storyboard', input: {}, stages: [{ id: 'scene_images', status: 'done' }], scenes: [{ sceneIdx: 0, status: 'flagged', flaggedReason: 'image_check: wrong_aspect', imageUrl: 'https://fixture/image.png' }] } as ProductionRun;
    expect(canSettleCompanionRun(flagged, structuredClone(flagged))).toBe(true);
    const missing = { ...flagged, scenes: [{ ...flagged.scenes[0], imageUrl: undefined }] };
    expect(canSettleCompanionRun(missing, structuredClone(missing))).toBe(false);
    const ambiguous = { ...flagged, scenes: [{ ...flagged.scenes[0], flaggedReason: 'image: network timeout' }] };
    expect(canSettleCompanionRun(ambiguous, structuredClone(ambiguous))).toBe(false);
    const staleFlag = { ...flagged, scenes: [{ ...flagged.scenes[0], flaggedReason: 'image_check: too_small' }] };
    expect(canSettleCompanionRun(flagged, staleFlag)).toBe(false);
  });
  it('requires matching resume artifacts even when every saved stage says done', () => {
    const completed = { runId: 'run-one', userId: 'alice', status: 'review', gate: 'storyboard', input: {}, stages: [{ id: 'scene_images', status: 'done' }], scenes: [], finalScript: 'approved script', storyboard: [{ scriptLine: 'approved scene' }] } as unknown as ProductionRun;
    expect(canSettleCompanionRun(completed, { ...completed, finalScript: 'old script' } as unknown as ProductionRun)).toBe(false);
    expect(canSettleCompanionRun(completed, { ...completed, storyboard: [{ scriptLine: 'old scene' }] } as unknown as ProductionRun)).toBe(false);
    expect(canSettleCompanionRun(completed, { ...completed, finalScript: undefined })).toBe(false);
  });
  it('allows a completed and saved degraded stage that resume will skip', () => {
    const completed = { runId: 'run-one', userId: 'alice', status: 'review', gate: 'storyboard', input: {}, scenes: [], stages: [{ id: 'video_prompts', status: 'done', error: 'degraded: known failure' }] } as ProductionRun;
    expect(canSettleCompanionRun(completed, structuredClone(completed))).toBe(true);
    expect(canSettleCompanionRun(completed, { ...completed, stages: [{ id: 'video_prompts', status: 'done' }] } as ProductionRun)).toBe(false);
  });
});
