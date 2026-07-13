import { describe, it, expect } from 'vitest';
import {
  safeZone, estWidth, fitText, wrapTwoLines, stripUnrenderable, evenSplit,
  chunkCaption, isPowerWord, hookTitleLayout, voiceChunkWindows, wordTimings,
  clampWindow, clampAnchor, snapSfxAnchor, pickSceneSfx,
  planScene, planEndCardLayers, effectiveCameraEffect, buildCameraFilter,
  planTransitions, buildTransitionFilters, buildTextFilter, buildBoxFilter,
  type SfxCandidate, type TextLayer,
} from '../../api/_lib/renderFfmpeg.js';
import {
  CLASSIC, IMPACT, HYPE, CLEAN, PUNCH, BARS, SPOTLIGHT,
} from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene, VoiceWord } from '../../types.js';

// ---------------------------------------------------------------------------
// GOLDEN BASELINE for the drawPlan.ts extraction (plan: "methodology gate").
//
// This snapshots the FULL output of the pure draw-planning engine across every
// preset and scene-type branch. It is captured from the ORIGINAL renderFfmpeg.ts
// BEFORE the structural extraction; the extraction (moving these pure functions
// into api/_lib/drawPlan.ts, with renderFfmpeg.ts re-exporting them) must leave
// every snapshot below byte-identical. Any diff = the tuned look changed =
// STOP and escalate (TUNED-file guardrail). This is the goal's transcript proof.
//
// Determinism note: planScene's hook gradient comes from pickHookPalette(seed);
// every call below pins an explicit variantSeed so output is reproducible. No
// Date.now()/Math.random() anywhere in the engine.
// ---------------------------------------------------------------------------

const PORTRAIT: [number, number] = [1080, 1920];
const LANDSCAPE: [number, number] = [1920, 1080];
const SQUARE: [number, number] = [1080, 1080];

const PRESETS = { CLASSIC, IMPACT, HYPE, CLEAN, PUNCH, BARS, SPOTLIGHT } as const;

const vw = (text: string, start: number, end: number): VoiceWord =>
  ({ text, start, end } as VoiceWord);

describe('drawPlan golden baseline — primitive helpers', () => {
  it('safeZone across all aspect ratios', () => {
    expect({
      portrait: safeZone(PORTRAIT),
      landscape: safeZone(LANDSCAPE),
      square: safeZone(SQUARE),
    }).toMatchSnapshot();
  });

  it('estWidth / isPowerWord / stripUnrenderable / evenSplit / wrapTwoLines', () => {
    expect({
      estWidth: [
        estWidth('ORDER NA', 120),
        estWidth('Sobrang lambot', 80, 0.5),
      ],
      isPowerWord: ['tignan', 'FREE', 'random', '50', 'b3st', 'connector'].map(
        (w) => [w, isPowerWord(w)]
      ),
      stripUnrenderable: [
        stripUnrenderable('Grabe 🔥 ang  resulta ✨'),
        stripUnrenderable("TIGNAN MO 'TO"),
        stripUnrenderable('first 50 — lang promise'),
      ],
      evenSplit: [
        evenSplit([1, 2, 3, 4, 5], 2),
        evenSplit([1, 2, 3, 4, 5, 6, 7], 3),
      ],
      wrapTwoLines: [
        wrapTwoLines('Sobrang lambot ng skin ko ngayon'),
        wrapTwoLines('Supercalifragilistic'),
      ],
    }).toMatchSnapshot();
  });

  it('fitText: fit / shrink / wrap', () => {
    expect({
      short: fitText('ORDER NA', 864, 120),
      shrinkWrap: fitText('Sobrang lambot ng skin ko ngayon promise talaga', 864, 80),
      anton: fitText('DERMA TESTED PROVEN RESULTS', 864, 88, IMPACT.caption.advRatio),
    }).toMatchSnapshot();
  });

  it('chunkCaption: pacing, particle pull-back, empties', () => {
    expect({
      timeCapped: chunkCaption('isa dalawa tatlo apat lima anim pito walo', 1.5),
      particlePull: chunkCaption('Grabe ang lambot ng skin ko ngayon talaga', 99),
      wordLevel: chunkCaption('hindi mo kailangan ng kape para gumana', 6, 2.5, 0.5),
      emptyEmoji: chunkCaption('🔥✨', 5),
    }).toMatchSnapshot();
  });

  it('hookTitleLayout: word stack, power-word highlight, cadence', () => {
    expect({
      impact: hookTitleLayout(['STOP SCROLLING', 'GRABE TO'], 110, IMPACT.hook.advRatio, 1080, 288, 0.05, IMPACT.hook.wordCadenceSec),
      hype: hookTitleLayout(['5 BEST', 'FREE NGAYON'], 120, HYPE.hook.advRatio, 1080, 288, 0.05, HYPE.hook.wordCadenceSec),
    }).toMatchSnapshot();
  });

  it('voiceChunkWindows / wordTimings: measured forced-alignment pacing', () => {
    const words: VoiceWord[] = [
      vw('Pag-uwi', 0.8, 1.2), vw('galing', 1.25, 1.6), vw('trabaho', 1.65, 2.2),
      vw('oily', 2.6, 2.9), vw('na', 2.95, 3.05), vw('agad', 3.1, 3.5),
    ];
    expect({
      windows: voiceChunkWindows(['Pag-uwi galing trabaho', 'oily na agad'], words, 6),
      mismatch: voiceChunkWindows(['one two', 'three four'], [vw('a', 0.5, 0.8), vw('b', 0.9, 1.2), vw('c', 1.3, 1.6)], 6),
      wordTimings: wordTimings('Grabe ang lambot', 1.0, 2.8, 64, CLASSIC.caption.advRatio, 1080),
    }).toMatchSnapshot();
  });

  it('clampWindow / clampAnchor / snapSfxAnchor', () => {
    expect({
      clampWindow: [clampWindow(1, 3, 5), clampWindow(-1, 9, 5), clampWindow(5, 6, 5), clampWindow(1, 3, null)],
      clampAnchor: [clampAnchor(2, 5), clampAnchor(-1, 5), clampAnchor(5, 5)],
      snapSfxAnchor: [snapSfxAnchor('whoosh', 2, false), snapSfxAnchor('whoosh', 0, false), snapSfxAnchor('ding', 1, false)],
    }).toMatchSnapshot();
  });

  it('pickSceneSfx: restraint, caps, emphasis-wins', () => {
    const collide: SfxCandidate[] = [
      { sfxId: 'whoosh', globalSec: 10.0, transition: true },
      { sfxId: 'pop', globalSec: 10.3, transition: false },
    ];
    const drops: SfxCandidate[] = [2, 7, 12, 17, 22, 27, 32].map((t) => ({ sfxId: 'drop', globalSec: t, transition: false }));
    expect({
      collide: pickSceneSfx(collide, [], 0),
      capDrops: pickSceneSfx(drops, [], 0),
      soundUseThread: pickSceneSfx([{ sfxId: 'drop', globalSec: 20, transition: false }], [], 0, 3, 0.4, { drop: 1 }),
    }).toMatchSnapshot();
  });
});

// ---- The master planner: full DrawLayer[] output across presets/branches ----

const HOOK: FinalRenderScene = {
  sceneIdx: 0, videoUrl: 'v', isHook: true,
  overlayText: [{ text: "TIGNAN MO 'TO BAGO MAUBOS", startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
};
const TALKING_CALLOUT: FinalRenderScene = {
  sceneIdx: 1, videoUrl: 'v', sceneType: 'talking',
  scriptLine: 'Grabe ang lambot ng skin ko ngayon talaga',
  overlayText: [{ text: 'DERMA-TESTED', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
  voiceWords: [
    { text: 'Grabe', start: 0.4, end: 0.8 }, { text: 'ang', start: 0.85, end: 1.0 },
    { text: 'lambot', start: 1.05, end: 1.5 }, { text: 'ng', start: 1.55, end: 1.65 },
    { text: 'skin', start: 1.7, end: 2.0 }, { text: 'ko', start: 2.05, end: 2.2 },
    { text: 'ngayon', start: 2.25, end: 2.7 }, { text: 'talaga', start: 2.75, end: 3.3 },
  ] as VoiceWord[],
};
const BROLL_CALLOUT: FinalRenderScene = {
  sceneIdx: 3, videoUrl: 'v', sceneType: 'b-roll',
  scriptLine: 'hindi mo kailangan ng kape',
  overlayText: [{ text: 'ENERGY RESET', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
};
const PUNCHLINE: FinalRenderScene = {
  sceneIdx: 7, videoUrl: 'v', sceneType: 'b-roll',
  overlayText: [{ text: 'ORDER NA', startSec: 0, endSec: 5, style: 'punchline', position: 'bottom' }],
};
const PLAIN_CAPTION: FinalRenderScene = {
  sceneIdx: 2, videoUrl: 'v', sceneType: 'talking',
  scriptLine: 'Ako si Maria at ito ang sikreto ko',
};

describe('drawPlan golden baseline — planScene across presets', () => {
  for (const [name, preset] of Object.entries(PRESETS)) {
    it(`planScene battery — ${name}`, () => {
      expect({
        hook: planScene(HOOK, 4, PORTRAIT, preset, 0),
        talkingCallout: planScene(TALKING_CALLOUT, 6, PORTRAIT, preset, 0),
        brollCallout: planScene(BROLL_CALLOUT, 6, PORTRAIT, preset, 0),
        punchline: planScene(PUNCHLINE, 5, PORTRAIT, preset, 0),
        plainCaption: planScene(PLAIN_CAPTION, 5, PORTRAIT, preset, 0),
        plainCaptionLandscape: planScene(PLAIN_CAPTION, 5, LANDSCAPE, preset, 0),
      }).toMatchSnapshot();
    });
  }

  it('planScene: face-aware captionRegion clamps the band', () => {
    const faceScene: FinalRenderScene = {
      ...TALKING_CALLOUT, captionRegion: { yFracTop: 0.62, yFracBottom: 0.85 },
    };
    expect(planScene(faceScene, 6, PORTRAIT, CLASSIC, 0)).toMatchSnapshot();
  });
});

describe('drawPlan golden baseline — end card / camera / transitions', () => {
  const card = { recapText: 'FIRST 50: FREE DRIP BAG' };
  it('planEndCardLayers: recap, face-aware, dup-drop, too-short', () => {
    expect({
      classic: planEndCardLayers(card, 5, PORTRAIT, CLASSIC),
      faceAware: planEndCardLayers(card, 5, PORTRAIT, CLASSIC, [], { yFracTop: 0.62, yFracBottom: 0.85 }),
      dupDropped: planEndCardLayers(card, 5, PORTRAIT, CLASSIC, ['First 50, free drip bag!']),
      tooShort: planEndCardLayers(card, 0.6, PORTRAIT, CLASSIC),
      hype: planEndCardLayers(card, 5, PORTRAIT, HYPE),
    }).toMatchSnapshot();
  });

  it('effectiveCameraEffect / buildCameraFilter', () => {
    expect({
      classicIgnoresHints: effectiveCameraEffect('zoom-in', 1, CLASSIC.camera),
      classicFilter: buildCameraFilter('zoom-in', 4, PORTRAIT, CLASSIC.camera),
    }).toMatchSnapshot();
  });

  it('planTransitions across presets (with/without hook burn)', () => {
    expect({
      classic: planTransitions(7, CLASSIC.transition),
      impact: planTransitions(7, IMPACT.transition),
      impactHookBurn: planTransitions(7, IMPACT.transition, true),
      hype: planTransitions(7, HYPE.transition, true),
      clean: planTransitions(7, CLEAN.transition),
    }).toMatchSnapshot();
  });

  it('buildTransitionFilters: flash / whip / dip / burn', () => {
    expect({
      flashHead: buildTransitionFilters({ fadeOutTail: false, fadeInHead: true }, IMPACT.transition, 5),
      whipHead: buildTransitionFilters({ fadeOutTail: false, fadeInHead: true }, HYPE.transition, 5),
      dipBoth: buildTransitionFilters({ fadeOutTail: true, fadeInHead: true }, CLEAN.transition, 5),
      burnTail: buildTransitionFilters({ fadeOutTail: true, tailKind: 'burn' }, IMPACT.transition, 5),
    }).toMatchSnapshot();
  });
});

describe('drawPlan golden baseline — filtergraph string builders', () => {
  it('buildTextFilter: every animation branch', () => {
    const base: TextLayer = {
      kind: 'text', text: 'X', fontsize: 80, color: 'white', boxAlpha: 0.85,
      xExpr: '(w-text_w)/2', yBase: 1200, startSec: 0.4, endSec: 2.5, anim: 'none',
    };
    expect({
      none: buildTextFilter(base, 'font.ttf', 'ov.txt'),
      slideup: buildTextFilter({ ...base, anim: 'slideup', boxAlpha: 0 }, 'font.ttf', 'h.txt'),
      fade: buildTextFilter({ ...base, anim: 'fade' }, 'font.ttf', 'c.txt'),
      pop: buildTextFilter({ ...base, anim: 'pop' }, 'font.ttf', 'c.txt'),
      impactPreset: buildTextFilter({ ...base, anim: 'pop' }, 'font.ttf', 'c.txt', IMPACT),
    }).toMatchSnapshot();
  });

  it('buildBoxFilter: wipe cascade', () => {
    expect(
      buildBoxFilter({ kind: 'box', x: 200, y: 800, w: 240, h: 50, color: '0xD90429', startSec: 0.55, wipeDur: 0.4 })
    ).toMatchSnapshot();
  });
});
