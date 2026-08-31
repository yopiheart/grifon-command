import { describe, it, expect } from 'vitest';
import { clampAsmrSceneRefs } from '../../services/producerOrchestrator.js';
import type { Scene } from '../../types.js';

// Intent: ASMR is voiceover over b-roll, not a talking head.
//
// The storyboard prompt's ASMR TREATMENT asks for "hands and textures over faces"
// (api/_lib/prompts.ts). It cannot win. Any scene carrying an identity reference goes
// through DUAL_REFERENCE_LOCK (services/geminiService.ts), whose FACE_TO_CAMERA clause
// is "REQUIRED when the avatar speaks the script line" and BANS face-away — and every
// scene has a script line. Two instructions, opposite orders, and the one worded
// REQUIRED/BANNED wins.
//
// Observed on run apr_dddc492a (Silid Home, 2026-08-31): all three `both` scenes
// rendered a face their own imagePrompt never asked for ("Hands positioned on either
// side of the packaging... static freeze-frame"), while the single `product` scene
// obeyed its prompt exactly. 3 of 3 against, 1 of 1 for.
//
// So the route is decided in code, not asked of the model twice. The LAST scene is the
// spoken CTA — the one beat that genuinely wants the presenter — and keeps its reference.

const scene = (overrides: Partial<Scene> = {}): Scene => ({
  scriptLine: 'Rinig mo yong tape rip habang binubuksan natin',
  sceneDescription: 'Hands on the sealed packaging',
  imagePrompt: 'Hands positioned on either side of the packaging, static freeze-frame',
  referenceImage: 'both',
  ...overrides,
});

/** The shape the Silid Home run actually stored: S1-S3 tactile on `both`, S4 the CTA. */
const asmrFourBeat = (): Scene[] => [
  scene({ referenceImage: 'both' }),
  scene({ referenceImage: 'both' }),
  scene({ referenceImage: 'product' }),
  scene({ referenceImage: 'both', scriptLine: 'Tara, click mo yong link sa baba ngayon' }),
];

describe('clampAsmrSceneRefs — the tactile beats leave the avatar behind', () => {
  it('routes every identity-mode scene except the last to product', () => {
    const out = clampAsmrSceneRefs(asmrFourBeat(), true);

    expect(out[0].referenceImage).toBe('product');
    expect(out[1].referenceImage).toBe('product');
    expect(out[2].referenceImage).toBe('product');
  });

  it('leaves the final CTA scene on its presenter reference', () => {
    const out = clampAsmrSceneRefs(asmrFourBeat(), true);

    expect(out[3].referenceImage).toBe('both');
  });

  it('never drops a reference the run cannot replace — no product photo, no clamp', () => {
    const out = clampAsmrSceneRefs(asmrFourBeat(), false);

    expect(out.map((s) => s.referenceImage)).toEqual(['both', 'both', 'product', 'both']);
  });

  it('leaves non-identity modes alone', () => {
    const scenes = [
      scene({ referenceImage: 'none' }),
      scene({ referenceImage: 'product' }),
      scene({ referenceImage: 'both' }),
    ];

    const out = clampAsmrSceneRefs(scenes, true);

    expect(out[0].referenceImage).toBe('none');
    expect(out[1].referenceImage).toBe('product');
  });

  it('clamps an avatar-only tactile scene too, not just both', () => {
    const scenes = [scene({ referenceImage: 'avatar' }), scene({ referenceImage: 'both' })];

    const out = clampAsmrSceneRefs(scenes, true);

    expect(out[0].referenceImage).toBe('product');
  });

  it('keeps every other field untouched', () => {
    const before = asmrFourBeat();
    const out = clampAsmrSceneRefs(before, true);

    expect(out[0].scriptLine).toBe(before[0].scriptLine);
    expect(out[0].imagePrompt).toBe(before[0].imagePrompt);
    expect(out[0].sceneDescription).toBe(before[0].sceneDescription);
  });

  it('does not mutate the scenes it was handed', () => {
    const before = asmrFourBeat();
    clampAsmrSceneRefs(before, true);

    expect(before[0].referenceImage).toBe('both');
  });

  it('leaves a single-scene storyboard alone — that one scene IS the CTA', () => {
    const out = clampAsmrSceneRefs([scene({ referenceImage: 'both' })], true);

    expect(out[0].referenceImage).toBe('both');
  });
});
