import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { resolveMusicBed } from '../../api/_lib/renderFfmpeg.js';

// Slice 4 / A5: there is no ugcpro.mp3 in api/_lib/assets/music/, so a UGC Pro render whose
// generated ElevenLabs bed fails used to ship SILENT (musicPath → null → warn+skip). A static
// alias borrows testimonial.mp3 for 'ugcpro' — but only when ugcpro.mp3 is absent. A real
// ugcpro.mp3 dropped in later must automatically win (the direct hit is tried first).
// `resolveMusicBed` takes an injected resolver, so this mocks findAsset without touching the FS.

const has = (present: Record<string, string>) => (rel: string): string | null => present[rel] ?? null;
const mp3 = (name: string) => join('music', `${name}.mp3`); // mirror resolveMusicBed's key exactly (platform sep)

describe("resolveMusicBed — 'ugcpro' static-bed alias", () => {
  it('falls back to testimonial.mp3 when ugcpro.mp3 is absent', () => {
    const resolve = has({ [mp3('testimonial')]: '/assets/music/testimonial.mp3' });
    expect(resolveMusicBed('ugcpro', resolve)).toBe('/assets/music/testimonial.mp3');
  });

  it('prefers a real ugcpro.mp3 when present (alias never consulted)', () => {
    const resolve = has({
      [mp3('ugcpro')]: '/assets/music/ugcpro.mp3',
      [mp3('testimonial')]: '/assets/music/testimonial.mp3',
    });
    expect(resolveMusicBed('ugcpro', resolve)).toBe('/assets/music/ugcpro.mp3');
  });

  it('returns null when neither the style bed nor its alias resolves', () => {
    const resolve = has({});
    expect(resolveMusicBed('ugcpro', resolve)).toBeNull();
  });

  it('a non-aliased style with no bed returns null (no accidental fallback)', () => {
    const resolve = has({ [mp3('testimonial')]: '/assets/music/testimonial.mp3' });
    expect(resolveMusicBed('mrbeast', resolve)).toBeNull();
  });

  it('a style with its own bed resolves directly (mrbeast/temu unaffected)', () => {
    const resolve = has({ [mp3('mrbeast')]: '/assets/music/mrbeast.mp3' });
    expect(resolveMusicBed('mrbeast', resolve)).toBe('/assets/music/mrbeast.mp3');
  });
});
