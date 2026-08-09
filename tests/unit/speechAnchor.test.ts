import { describe, it, expect } from 'vitest';
import {
  speechWindow, resolveSpeechEndSec, chooseTrim, planScene,
} from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, HYPE } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene, VoiceWord } from '../../types.js';

// The speech-anchor fix (issues #91 + #94.1): scene timing anchors to MEASURED
// SPEECH (ElevenLabs forced alignment), not to clip bounds or raw-audio silence.
//  - #91  end anchor: the closing scene kept a ~2.5s breathy tail because
//         silencedetect honestly reports breath/room tone above -35dB as content.
//  - #94.1 start anchor: an overlay popped ~1.4s before the voice started.
// Without alignment every path must behave exactly as it did before.

const vw = (text: string, start: number, end: number): VoiceWord => ({ text, start, end });

// Thunks that fail loudly if the anchored path pays for a measurement it should
// not need (silencedetect is a full decode pass).
const measure = (opts: { silence?: number | null; audio?: number | null }) => ({
  silenceSec: () => {
    if (!('silence' in opts)) throw new Error('silencedetect must not run on the anchored path');
    return opts.silence ?? null;
  },
  audioDurationSec: () => opts.audio ?? null,
});

describe('speechWindow', () => {
  it('reads the onset and the speech-end off the aligned words', () => {
    const w = speechWindow({ voiceWords: [vw('Grabe', 1.43, 1.8), vw('talaga', 1.9, 2.9)] });
    expect(w).toEqual({ onset: 1.43, end: 2.9 });
  });

  it('treats absent / empty alignment as no window (not a crash)', () => {
    expect(speechWindow({})).toBeNull();
    expect(speechWindow({ voiceWords: undefined })).toBeNull();
    expect(speechWindow({ voiceWords: [] })).toBeNull();
  });

  it('rejects degenerate alignment (all-zero / non-finite times) rather than trimming to nothing', () => {
    expect(speechWindow({ voiceWords: [vw('x', 0, 0)] })).toBeNull();
    expect(speechWindow({ voiceWords: [vw('x', NaN, NaN)] })).toBeNull();
  });

  it('one out-of-order token cannot shrink the window', () => {
    const w = speechWindow({ voiceWords: [vw('a', 0.5, 3.4), vw('b', 0.2, 1.0)] });
    expect(w).toEqual({ onset: 0.2, end: 3.4 });
  });
});

describe('resolveSpeechEndSec — trim anchor (#91)', () => {
  it('anchors to the last aligned word, not to the audio that keeps breathing after it', () => {
    // Live log: silencedetect said 5.5093 on the closing scene; the words end 2.9.
    const scene = { voiceWords: [vw('Order', 2.2, 2.5), vw('na', 2.6, 2.9)] };
    expect(resolveSpeechEndSec(scene, false, measure({ audio: 6 }))).toBeCloseTo(3.08, 3); // 2.9 + PAD 0.18
  });

  it('last scene keeps the razor pad on top of the speech-end (ghost-frame guard)', () => {
    const scene = { voiceWords: [vw('Order', 2.2, 2.5), vw('na', 2.6, 2.9)] };
    // 2.9 + 0.18 pad, then the last-scene swap: -0.18 + 0.06 = 2.96 (vs 5.39 before)
    expect(resolveSpeechEndSec(scene, true, measure({ audio: 6 }))).toBeCloseTo(2.96, 3);
  });

  it('never lets the anchored trim outrun the VO MP3 itself', () => {
    const scene = { voiceWords: [vw('tail', 5.0, 5.58)] };
    expect(resolveSpeechEndSec(scene, false, measure({ audio: 5.6 }))).toBeCloseTo(5.6, 3);
  });

  it('an unknown audio duration still anchors (no cap available)', () => {
    const scene = { voiceWords: [vw('tail', 2.0, 2.5)] };
    expect(resolveSpeechEndSec(scene, false, measure({ audio: null }))).toBeCloseTo(2.68, 3);
  });

  // ---- The regression guard: no alignment ⇒ byte-identical to the old path ----
  it('FALLBACK PARITY: without alignment the trim is exactly the pre-change value', () => {
    const detected = 5.5093; // what detectTrimSec returned on the #91 render
    // Pre-change code was: detectedSec, and for the last scene
    // Math.max(0.5, detectedSec - PAD_SEC + LAST_SCENE_PAD_SEC).
    expect(resolveSpeechEndSec({}, false, measure({ silence: detected }))).toBeCloseTo(5.5093, 4);
    expect(resolveSpeechEndSec({}, true, measure({ silence: detected }))).toBeCloseTo(5.3893, 4);
    // Empty alignment is treated as absent, not as "speech ends at 0".
    expect(resolveSpeechEndSec({ voiceWords: [] }, true, measure({ silence: detected }))).toBeCloseTo(5.3893, 4);
    // Floor and null-through are preserved.
    expect(resolveSpeechEndSec({}, true, measure({ silence: 0.4 }))).toBeCloseTo(0.5, 4);
    expect(resolveSpeechEndSec({}, false, measure({ silence: null }))).toBeNull();
    expect(resolveSpeechEndSec({}, true, measure({ silence: null }))).toBeNull();
  });

  it('hook: the anchored speech-end still buys the 0.5s reveal hold through chooseTrim', () => {
    const scene: Pick<FinalRenderScene, 'voiceWords' | 'keepFullClip' | 'audioUrl'> = {
      keepFullClip: true, audioUrl: 'voice.mp3',
      voiceWords: [vw('Tignan', 0.2, 0.7), vw('mo', 0.8, 1.62)],
    };
    const detectedSec = resolveSpeechEndSec(scene, false, measure({ audio: 6 }));
    expect(detectedSec).toBeCloseTo(1.8, 3); // 1.62 + 0.18
    const plan = chooseTrim(scene, 6, detectedSec);
    expect(plan.trimSec).toBeCloseTo(2.3, 3); // 1.8 + 0.5 HOOK_REVEAL_HOLD_SEC
    expect(plan.padAudio).toBe(true);
  });
});

describe('planScene — overlay onset (#94.1)', () => {
  const LATE_ONSET: VoiceWord[] = [
    vw('Hindi', 1.43, 1.8), vw('mo', 1.85, 2.0), vw('kailangan', 2.05, 2.6),
    vw('ng', 2.65, 2.75), vw('kape', 2.8, 3.3),
  ];
  const base: FinalRenderScene = {
    sceneIdx: 3, videoUrl: 'v', sceneType: 'talking',
    scriptLine: 'Hindi mo kailangan ng kape',
    overlayText: [{ text: 'ENERGY RESET', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
  };
  const overlayOf = (layers: ReturnType<typeof planScene>) =>
    layers.find((l): l is TextLayer => l.kind === 'text' && l.text === 'ENERGY RESET');

  it('holds the overlay until the voice actually starts', () => {
    // Punchline style so the window reaches the scene end and survives the floor.
    const scene: FinalRenderScene = {
      ...base,
      overlayText: [{ text: 'ENERGY RESET', startSec: 0, endSec: 5, style: 'punchline', position: 'bottom' }],
      voiceWords: LATE_ONSET,
    };
    const o = overlayOf(planScene(scene, 6, [1080, 1920], HYPE, 0))!;
    expect(o.startSec).toBeCloseTo(1.43, 3);
    expect(o.startSec).toBeLessThan(o.endSec); // never inverted
  });

  it('only ever moves the overlay FORWARD (a late-lead overlay is not pulled back)', () => {
    const early: FinalRenderScene = { ...base, voiceWords: [vw('Hindi', 0.05, 0.5), vw('kape', 0.6, 1.2)] };
    const withWords = overlayOf(planScene(early, 6, [1080, 1920], HYPE, 0))!;
    const without = overlayOf(planScene({ ...base }, 6, [1080, 1920], HYPE, 0))!;
    expect(withWords.startSec).toBeGreaterThanOrEqual(without.startSec);
    expect(withWords.startSec).toBeCloseTo(without.startSec, 3); // 0.05 onset < the sfx lead
  });

  it('an overlay whose whole hold sits before the onset is dropped, never shown early or inverted', () => {
    // CLASSIC callout holds 1.5s; a 1.43s onset leaves 0.07s — under the readable floor.
    const scene: FinalRenderScene = { ...base, voiceWords: LATE_ONSET };
    const layers = planScene(scene, 6, [1080, 1920], CLASSIC, 0);
    expect(overlayOf(layers)).toBeUndefined();
    for (const l of layers) {
      if (l.kind === 'text') expect(l.startSec).toBeLessThan(l.endSec);
    }
    // Unaligned, the same scene keeps today's early overlay (the CALLOUT_LEAD
    // offset off the cut) — no regression.
    expect(overlayOf(planScene(base, 6, [1080, 1920], CLASSIC, 0))!.startSec).toBeCloseTo(0.3, 3);
  });

  it('empty voiceWords leave overlay timing exactly as-is', () => {
    const empty = overlayOf(planScene({ ...base, voiceWords: [] }, 6, [1080, 1920], CLASSIC, 0))!;
    const absent = overlayOf(planScene(base, 6, [1080, 1920], CLASSIC, 0))!;
    expect(empty.startSec).toBe(absent.startSec);
    expect(empty.endSec).toBe(absent.endSec);
  });
});
