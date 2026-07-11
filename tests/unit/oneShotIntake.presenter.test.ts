import { describe, expect, it } from 'vitest';
import { resolvePersonStatePresenter } from '../../services/oneShotIntake.js';

const auto = { prompt: '', url: '', description: '', ethnicity: '', gender: 'Any' as const };

describe('person-state presenter resolution', () => {
  it('derives Auto presenter from After when Before and After are filled', () => {
    const result = resolvePersonStatePresenter({ avatar: auto, servicePhotos: [
      { slot: 'before', url: 'before-data' }, { slot: 'after', url: 'after-data' },
    ] });
    expect(result.derivedFromAfter).toBe(true);
    expect(result.avatar.url).toBe('after-data');
  });

  it('never overrides an explicit presenter', () => {
    const explicit = { ...auto, url: 'presenter-data' };
    expect(resolvePersonStatePresenter({ avatar: explicit, servicePhotos: [
      { slot: 'before', url: 'before-data' }, { slot: 'after', url: 'after-data' },
    ] })).toEqual({ avatar: explicit, derivedFromAfter: false });
  });

  it('leaves Auto unchanged without the person-state pair', () => {
    expect(resolvePersonStatePresenter({ avatar: auto, servicePhotos: [{ slot: 'after', url: 'after-data' }] }))
      .toEqual({ avatar: auto, derivedFromAfter: false });
  });
});
