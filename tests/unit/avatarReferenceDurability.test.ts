import { describe, it, expect } from 'vitest';
import { hydrateInput } from '../../components/OneShotAd/ProducerFlow.js';
import type { ProductionRunRow } from '../../services/producerRunService.js';
import { slimCheckpointInput } from '../../services/producerRunService.js';

// The presenter reference cannot survive a checkpoint: slimCheckpointInput drops any data: string
// over 700KB to stay under api/producer/run's 2mb cap, and a 2K avatar exceeds that while the
// compressed hero (~160KB, measured on the live row) does not. producer_runs.avatar_url is the
// durable copy, and hydrateInput is what puts it back on resume.
//
// The bug this closes, measured on run apr_876ef559 (2026-07-25): with the reference gone, a regen
// rendered a person-free still wearing a BLANK product label, over a good image, for real money.

const big = (n: number) => `data:image/png;base64,${'A'.repeat(n)}`;
const AVATAR = big(1_200_000); // a 2K avatar: comfortably over the 700KB slim threshold
const HERO = big(160_000); // the compressed hero: comfortably under it

const row = (over: Partial<ProductionRunRow> = {}): ProductionRunRow =>
  ({
    input: { avatar: { url: 'stale-or-missing', description: 'host', ethnicity: 'Filipino', prompt: '' }, heroImageBase64: HERO },
    ...over,
  }) as unknown as ProductionRunRow;

describe('presenter reference durability across a checkpoint', () => {
  it('reproduces the loss: the slimmer keeps the hero and drops the avatar', async () => {
    // Not a hypothetical — this asymmetry is the whole bug, so it is pinned first.
    const slimmed = slimCheckpointInput({ avatar: { url: AVATAR }, heroImageBase64: HERO }) as any;

    expect(slimmed.heroImageBase64).toBe(HERO);
    expect('url' in slimmed.avatar).toBe(false); // the key is REMOVED, not emptied
  });

  it('hydrateInput restores the reference from its own column', async () => {
    const out = hydrateInput(row({ avatar_url: AVATAR }));

    expect(out.avatar.url).toBe(AVATAR);
    // A resumed run must now pass the same predicate the regen guard uses.
    expect(out.avatar.url.startsWith('data:')).toBe(true);
  });

  it('prefers the column over whatever survived in input — the slimmer only ever removes', async () => {
    const out = hydrateInput(row({ avatar_url: AVATAR, input: { avatar: { url: 'https://stale.example/old.png' } } } as any));
    expect(out.avatar.url).toBe(AVATAR);
  });

  it('leaves input untouched when the column is absent (pre-migration runs still work)', async () => {
    const out = hydrateInput(row());
    expect(out.avatar.url).toBe('stale-or-missing');
  });

  it('does not invent an avatar object when input has none', async () => {
    const out = hydrateInput({ input: { heroImageBase64: HERO }, avatar_url: AVATAR } as unknown as ProductionRunRow);
    expect((out as any).avatar).toBeUndefined();
  });

  it('does not mutate the source row', async () => {
    const r = row({ avatar_url: AVATAR });
    const before = (r.input as any).avatar.url;
    hydrateInput(r);
    expect((r.input as any).avatar.url).toBe(before);
  });
});
