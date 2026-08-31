import { describe, it, expect } from 'vitest';
import { buildAdScriptPrompt, buildStoryboardPrompt } from '../../api/_lib/prompts.js';
import type { BusinessInfo } from '../../types.js';

// Intent: the ASMR hardening must never leak into a format that already works.
//
// Both edits (2026-08-31) live inside `${businessInfo.asmrFlag ? ... : ''}`, so plain
// Unboxing, Try-On, Demo, Tutorial, Transformation and every non-UGCPro script type must
// come back untouched. Proved once by a 68-file byte diff (64 identical, 4 changed, all
// four `unboxing` + `asmr-true`); this test is what keeps it true.
//
// The two rules exist because of run apr_dddc492a and the run after it:
//   - The storyboard kept writing a seated person into S1-S3. Those scenes now render with
//     NO presenter reference (clampAsmrSceneRefs), so the person came back as a DIFFERENT
//     face from scene 4, and a bare plural "hands" with no owner rendered a second hand.
//   - The script said "tape rip" on a lift-off lid box that has no tape. It had copied the
//     first item out of the beats' texture MENU, and the script stage never sees the
//     packaging photo (productImageDescription reaches buildStoryboardPrompt only).

const bi = (o: Partial<BusinessInfo> = {}): BusinessInfo =>
  ({
    product: 'Silid Home',
    audience: 'Burnt-Out Condo Millennial Bea',
    benefit: 'Deep somatic relief',
    painPoint: 'My condo feels like a prison office',
    separator: 'Sampaguita soy wax',
    features: '45 hours burn, 200g, soy wax',
    scriptType: 'UGCPro',
    businessType: 'product',
    ...o,
  }) as BusinessInfo;

const script = (info: BusinessInfo, sub: 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial') =>
  buildAdScriptPrompt(
    { businessInfo: info, brandName: 'Silid Home', language: 'Taglish', offer: 'Sampaguita soy candle, 45 oras' } as never,
    undefined,
    sub,
  );

const board = (info: BusinessInfo) =>
  buildStoryboardPrompt({
    script: ['Pakinggan mo muna to', 'Rinig mo yong takip', 'Mabigat to', 'Tara, click mo yong link'],
    avatarDescription: 'A Filipina creator in her twenties',
    businessInfo: info,
    ethnicity: 'Filipino',
    language: 'Taglish',
  });

/** Strings that may appear ONLY when asmrFlag is on. */
const ASMR_ONLY_BOARD = ['HARD OVERRIDE', 'S1, S2 and S3 carry NO PERSON', 'free-floating hands'];
const ASMR_ONLY_SCRIPT = ['NAME ONLY A SOUND THIS PACKAGING CAN ACTUALLY MAKE', 'are a MENU, not an answer'];

const ALL_SUBS = ['tryon', 'unboxing', 'demo', 'transformation', 'tutorial'] as const;

describe('ASMR hardening is on when it should be', () => {
  it('the storyboard gets the no-person override', () => {
    const out = board(bi({ ugcProFormat: 'unboxing', asmrFlag: true } as Partial<BusinessInfo>));

    for (const s of ASMR_ONLY_BOARD) expect(out).toContain(s);
  });

  it('the script gets the sound-honesty rule', () => {
    const out = script(bi({ ugcProFormat: 'unboxing', asmrFlag: true } as Partial<BusinessInfo>), 'unboxing');

    for (const s of ASMR_ONLY_SCRIPT) expect(out).toContain(s);
  });
});

describe('ASMR hardening stays OFF everywhere else', () => {
  it('plain Unboxing — the format that already ships — is untouched', () => {
    const info = bi({ ugcProFormat: 'unboxing', asmrFlag: false } as Partial<BusinessInfo>);

    for (const s of ASMR_ONLY_BOARD) expect(board(info)).not.toContain(s);
    for (const s of ASMR_ONLY_SCRIPT) expect(script(info, 'unboxing')).not.toContain(s);
  });

  it('an absent flag reads the same as a false one', () => {
    const info = bi({ ugcProFormat: 'unboxing' } as Partial<BusinessInfo>);

    for (const s of ASMR_ONLY_BOARD) expect(board(info)).not.toContain(s);
    for (const s of ASMR_ONLY_SCRIPT) expect(script(info, 'unboxing')).not.toContain(s);
  });

  it('every other UGC Pro sub-format is untouched, flag on or off', () => {
    for (const sub of ALL_SUBS) {
      if (sub === 'unboxing') continue;

      for (const asmrFlag of [false, true]) {
        const info = bi({ ugcProFormat: sub, asmrFlag } as Partial<BusinessInfo>);

        for (const s of ASMR_ONLY_BOARD) expect(board(info), `board/${sub}/${asmrFlag}`).not.toContain(s);
        for (const s of ASMR_ONLY_SCRIPT) expect(script(info, sub), `script/${sub}/${asmrFlag}`).not.toContain(s);
      }
    }
  });

  it('non-UGCPro script types are untouched', () => {
    for (const scriptType of ['Testimonial', 'Temu', 'Services', 'RealEstate'] as const) {
      const info = bi({ scriptType } as Partial<BusinessInfo>);

      for (const s of ASMR_ONLY_BOARD) expect(board(info), `board/${scriptType}`).not.toContain(s);
      for (const s of ASMR_ONLY_SCRIPT) {
        expect(
          buildAdScriptPrompt(
            { businessInfo: info, brandName: 'Silid Home', language: 'Taglish', offer: 'Sampaguita soy candle' } as never,
          ),
          `script/${scriptType}`,
        ).not.toContain(s);
      }
    }
  });
});
