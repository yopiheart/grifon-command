import { describe, it, expect } from 'vitest';
import { UGCPRO_UPLOAD_SLOTS } from '../../components/guidedPhotoSlots.js';

// Intent (Slice 2 §4): the UGC Pro product-state slot lists are the source of truth for the
// One-Shot guided upload tiles. The load-bearing invariant is HERO-FIRST: LaunchScreen derives
// `heroImageBase64: servicePhotos[0]?.url` from hero-first ordering, so the hero slot MUST be the
// first element of every sub-format's list or the wrong photo becomes the research/identity anchor.

describe('UGCPRO_UPLOAD_SLOTS — hero-first invariant', () => {
  const keys = Object.keys(UGCPRO_UPLOAD_SLOTS) as (keyof typeof UGCPRO_UPLOAD_SLOTS)[];

  it('ships exactly the two Slice-1 sub-formats', () => {
    expect(keys.sort()).toEqual(['transformation', 'tryon']);
  });

  it.each(keys)("'%s' has hero as its FIRST slot", (key) => {
    expect(UGCPRO_UPLOAD_SLOTS[key][0].slot).toBe('hero');
  });

  it.each(keys)("'%s' lists hero exactly once", (key) => {
    const heroCount = UGCPRO_UPLOAD_SLOTS[key].filter((s) => s.slot === 'hero').length;
    expect(heroCount).toBe(1);
  });

  it('tryon anchors garment fit via a required onbody slot', () => {
    const slots = UGCPRO_UPLOAD_SLOTS.tryon.map((s) => s.slot);
    expect(slots).toContain('onbody');
  });

  it('transformation carries the before/after reveal slots', () => {
    const slots = UGCPRO_UPLOAD_SLOTS.transformation.map((s) => s.slot);
    expect(slots).toContain('before');
    expect(slots).toContain('after');
  });
});
