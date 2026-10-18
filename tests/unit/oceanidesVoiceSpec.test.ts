import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLiveSpec } from '../../funnels/oceanides-price-page/dev/voice-lab/spec';

const draft = fileURLToPath(new URL('../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json', import.meta.url));
const temporary: string[] = [];
function copySpec(mutate: (spec: Record<string, any>) => void = () => {}) {
  const directory = mkdtempSync(join(tmpdir(), 'oceanides-spec-test-'));
  temporary.push(directory);
  const spec = JSON.parse(readFileSync(draft, 'utf8'));
  mutate(spec);
  const path = join(directory, 'spec.json');
  writeFileSync(path, JSON.stringify(spec));
  return { path, hash: createHash('sha256').update(readFileSync(path)).digest('hex') };
}
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}oceanides-spec-test-`)) throw new Error('Unexpected spec directory');
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Oceanides exact paid-spec gate (no provider connection)', () => {
  it('includes the approved exact opening in the hashed server-owned spec', () => {
    const result = loadLiveSpec(draft, {});
    expect(result.spec).toHaveProperty('openingMessage', 'Magandang araw po! Ako si Michael, AI assistant ng Oceanides. Anong service po ang kailangan n’yo?');
  });

  it.each([undefined, null, '', '   ', 'x'.repeat(501)])('rejects an invalid opening before any live start', openingMessage => {
    const { path } = copySpec(spec => { spec.openingMessage = openingMessage; });
    expect(() => loadLiveSpec(path, {})).toThrow('invalid_voice_spec');
  });

  it('is blocked by default even with an existing server credential', () => {
    expect(loadLiveSpec(draft, { XAI_API_KEY: 'TEST-NOT-A-CREDENTIAL' }).liveReady).toBe(false);
  });

  it('requires the explicit switch, exact current hash, and server credential together', () => {
    const { path, hash } = copySpec();
    expect(loadLiveSpec(path, { OCEANIDES_VOICE_LIVE: '1' }).liveReady).toBe(false);
    expect(loadLiveSpec(path, { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash }).liveReady).toBe(false);
    expect(loadLiveSpec(path, { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash, XAI_API_KEY: 'TEST-NOT-A-CREDENTIAL' }).liveReady).toBe(true);
  });

  it('invalidates an earlier hash when the draft changes', () => {
    const { path, hash } = copySpec();
    const spec = JSON.parse(readFileSync(path, 'utf8'));
    spec.instructions += '\nA changed instruction requires review.';
    writeFileSync(path, JSON.stringify(spec));
    const result = loadLiveSpec(path, { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash, XAI_API_KEY: 'TEST-NOT-A-CREDENTIAL' });
    expect(result.liveReady).toBe(false);
    expect(result.sha256).not.toBe(hash);
  });

  it.each([
    ['maxAttempts', 11], ['maxUsd', 6], ['sessionMs', 180001], ['maxTextInputs', 21],
  ])('rejects a draft that increases %s above the agreed ceiling', (key, value) => {
    const { path } = copySpec(spec => { spec.limits[key] = value; });
    expect(() => loadLiveSpec(path, {})).toThrow('invalid_budget_spec');
  });
});
