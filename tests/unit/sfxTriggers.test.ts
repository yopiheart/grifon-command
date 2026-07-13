import { describe, it, expect } from 'vitest';
import {
  planDiegeticCues,
  admitDiegeticCue,
  DIEGETIC_TRIGGERS,
  type DiegeticTrigger,
} from '../../api/_lib/sfxTriggers.js';
import { SFX_VARIANT_POOLS, ROTATION, PRESETS } from '../../api/_lib/renderPresets.js';
import type { PresetId } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene, VoiceWord } from '../../types.js';

// Independent token clock: word i starts at i * STEP (0.5-multiples are exact in
// float, so anchor literals below are byte-clean). Times are the test's own
// construction, never read back from the module under test.
const STEP = 0.5;
const vw = (text: string, start: number, end: number): VoiceWord => ({ text, start, end });

type DiegeticScene = Pick<FinalRenderScene, 'voiceWords' | 'isHook'>;

/** Build a scene from an explicit token list (spaces already split out). */
function sceneFromTokens(tokens: string[], isHook = false): DiegeticScene {
  return {
    voiceWords: tokens.map((t, i) => vw(t, i * STEP, i * STEP + 0.3)),
    isHook,
  };
}

/** Build a scene from a plain sentence (split on single spaces). */
function sceneFrom(sentence: string, isHook = false): DiegeticScene {
  return sceneFromTokens(sentence.split(' '), isHook);
}

const IMPACT: PresetId = 'impact';

describe('planDiegeticCues — fires (preset impact)', () => {
  it('1. "Bili na ₱499 lang" → one chaching cue at the ₱499 start', () => {
    // ₱499 is token index 2 → start 2 * 0.5 = 1.0 (independent literal).
    const cues = planDiegeticCues(sceneFrom('Bili na ₱499 lang'), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].sfxId).toBe('chaching');
    expect(cues[0].anchorSec).toBe(1.0);
    expect(cues[0].gain).toBe(0.7);
    expect(cues[0].trigger).toBe('₱499');
  });

  it('2. "₱1,499" single token → fires', () => {
    const cues = planDiegeticCues(sceneFromTokens(['₱1,499']), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].sfxId).toBe('chaching');
  });

  it('3. split tokens ₱ | 499 → fires anchored at the ₱ token (index 0 → 0)', () => {
    const cues = planDiegeticCues(sceneFromTokens(['₱', '499']), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].anchorSec).toBe(0);
    expect(cues[0].trigger).toBe('₱');
  });

  it('4. "499 pesos" and ₱ + non-digit token → no fire', () => {
    expect(planDiegeticCues(sceneFrom('499 pesos'), IMPACT)).toEqual([]);
    expect(planDiegeticCues(sceneFromTokens(['₱', 'pesos']), IMPACT)).toEqual([]);
  });

  it('5. tokens 50% | off → fires at the 50% token (index 0 → 0)', () => {
    const cues = planDiegeticCues(sceneFromTokens(['50%', 'off']), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].sfxId).toBe('chaching');
    expect(cues[0].anchorSec).toBe(0);
  });

  it('6. tokens 50 | % | off → fires anchored at the 50 token (index 0 → 0)', () => {
    const cues = planDiegeticCues(sceneFromTokens(['50', '%', 'off']), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].anchorSec).toBe(0);
    expect(cues[0].trigger).toBe('50');
  });

  it('7. 50% | discount, bare off, bare % → no fire', () => {
    expect(planDiegeticCues(sceneFromTokens(['50%', 'discount']), IMPACT)).toEqual([]);
    expect(planDiegeticCues(sceneFromTokens(['off']), IMPACT)).toEqual([]);
    expect(planDiegeticCues(sceneFromTokens(['%']), IMPACT)).toEqual([]);
  });

  it('8. SALE! fires (case+punct); wholesale / salesperson do not', () => {
    expect(planDiegeticCues(sceneFromTokens(['SALE!']), IMPACT)).toHaveLength(1);
    expect(planDiegeticCues(sceneFromTokens(['wholesale']), IMPACT)).toEqual([]);
    expect(planDiegeticCues(sceneFromTokens(['salesperson']), IMPACT)).toEqual([]);
  });

  it('9. libre → fires', () => {
    const cues = planDiegeticCues(sceneFromTokens(['libre']), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].sfxId).toBe('chaching');
  });
});

describe('planDiegeticCues — negation', () => {
  it('10. "walang libre" → suppressed', () => {
    expect(planDiegeticCues(sceneFrom('walang libre'), IMPACT)).toEqual([]);
  });

  it('11. "hindi ito sale" → suppressed', () => {
    expect(planDiegeticCues(sceneFrom('hindi ito sale'), IMPACT)).toEqual([]);
  });

  it('12. negator 4 tokens back → fires (documented N=3 recall trade)', () => {
    expect(planDiegeticCues(sceneFrom('wag kang bumili kasi sale'), IMPACT)).toHaveLength(1);
  });

  it('13. negator AFTER the match → fires', () => {
    expect(planDiegeticCues(sceneFrom('sale na hindi biro'), IMPACT)).toHaveLength(1);
  });

  it('14. a "."-terminated token bounds the scan → fires', () => {
    const cues = planDiegeticCues(
      sceneFromTokens(['Hindi', 'ako', 'sigurado.', 'Sale', 'na']),
      IMPACT,
    );
    expect(cues).toHaveLength(1);
    expect(cues[0].sfxId).toBe('chaching');
  });
});

describe('planDiegeticCues — url rejection', () => {
  it('15. token grifon.ph/sale → no fire', () => {
    expect(planDiegeticCues(sceneFromTokens(['grifon.ph/sale']), IMPACT)).toEqual([]);
  });

  it('16. "sale sa grifon.ph" → fires on sale (URL does not poison neighbors)', () => {
    const cues = planDiegeticCues(sceneFrom('sale sa grifon.ph'), IMPACT);
    expect(cues).toHaveLength(1);
    expect(cues[0].trigger).toBe('sale');
  });

  it('17. www.sale.com and https://sale.ph → no fire', () => {
    expect(planDiegeticCues(sceneFromTokens(['www.sale.com']), IMPACT)).toEqual([]);
    expect(planDiegeticCues(sceneFromTokens(['https://sale.ph']), IMPACT)).toEqual([]);
  });
});

describe('planDiegeticCues — register gate', () => {
  it('18. money scene on clean / classic → no fire', () => {
    expect(planDiegeticCues(sceneFrom('Bili na ₱499 lang'), 'clean')).toEqual([]);
    expect(planDiegeticCues(sceneFrom('Bili na ₱499 lang'), 'classic')).toEqual([]);
  });

  it('19. every testimonial-rotation preset is absent from every live allowedPresets', () => {
    const live = DIEGETIC_TRIGGERS.filter((t) => t.requiredVisual === null);
    for (const preset of ROTATION.testimonial) {
      for (const entry of live) {
        expect(entry.allowedPresets).not.toContain(preset);
      }
    }
  });
});

describe('planDiegeticCues — measured-only + hook', () => {
  it('20. missing / empty voiceWords → no fire', () => {
    expect(planDiegeticCues({ voiceWords: undefined }, IMPACT)).toEqual([]);
    expect(planDiegeticCues({ voiceWords: [] }, IMPACT)).toEqual([]);
  });

  it('21. isHook true + ₱499 words → no fire', () => {
    expect(planDiegeticCues(sceneFromTokens(['₱499'], true), IMPACT)).toEqual([]);
  });
});

describe('admitDiegeticCue — caps', () => {
  it('22. DIEGETIC_MIN_GAP 0.6: cue 0.4s away rejected, 0.7s away admitted', () => {
    expect(admitDiegeticCue(10.4, 'chaching', [10.0], 0, {})).toBe(false);
    expect(admitDiegeticCue(10.7, 'chaching', [10.0], 0, {})).toBe(true);
  });

  it('23. whole-ad cap: diegeticPlaced 3 → rejected', () => {
    expect(admitDiegeticCue(50, 'chaching', [], 3, {})).toBe(false);
  });

  it('24. per-class cap: chaching already placed twice → rejected', () => {
    expect(admitDiegeticCue(50, 'chaching', [], 0, { chaching: 2 })).toBe(false);
  });
});

describe('DIEGETIC_TRIGGERS — table + structural integrity', () => {
  it('25. every live entry sfxId has a pool of >= 4 variants', () => {
    const live = DIEGETIC_TRIGGERS.filter((t) => t.requiredVisual === null);
    for (const entry of live) {
      const pool = SFX_VARIANT_POOLS[entry.sfxId];
      expect(pool, `${entry.sfxId} missing from SFX_VARIANT_POOLS`).toBeDefined();
      expect(pool!.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('26. dormant entry with an injected word pattern still never fires', () => {
    const injected: DiegeticTrigger[] = [{
      sfxId: 'notification',
      patterns: [{ kind: 'word', word: 'ping' }],
      allowedPresets: ['impact'],
      gain: 0.5,
      requiredVisual: 'ui-card',
    }];
    expect(planDiegeticCues(sceneFromTokens(['ping']), IMPACT, injected)).toEqual([]);
  });

  it('27. no diegetic class id appears in any preset overlayMap', () => {
    const DIEGETIC_IDS = ['chaching', 'notification', 'paper', 'shutter', 'typing'];
    for (const preset of Object.values(PRESETS)) {
      const mapped = Object.values(preset.sfx.overlayMap);
      for (const id of DIEGETIC_IDS) {
        expect(mapped).not.toContain(id);
      }
    }
  });

  it('28. chaching gain is 0.7 and every gain is in (0, 1]', () => {
    const chaching = DIEGETIC_TRIGGERS.find((t) => t.sfxId === 'chaching');
    expect(chaching!.gain).toBe(0.7);
    for (const entry of DIEGETIC_TRIGGERS) {
      expect(entry.gain).toBeGreaterThan(0);
      expect(entry.gain).toBeLessThanOrEqual(1);
    }
  });

  it('29. deterministic: the same scene evaluated twice is deep-equal', () => {
    const scene = sceneFrom('Bili na ₱499 lang');
    expect(planDiegeticCues(scene, IMPACT)).toEqual(planDiegeticCues(scene, IMPACT));
  });
});
