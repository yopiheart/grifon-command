import { describe, it, expect } from 'vitest';
import {
  parseDurationSec, parseTrimSec, dimsFor, chooseTrim,
  clampWindow, clampAnchor, escFilterPath,
  safeZone, fitText, wrapTwoLines, stripUnrenderable, evenSplit, chunkCaption,
  planScene, planEndCardLayers, buildTextFilter, buildBoxFilter, WIPE_SLICES, snapSfxAnchor, pickSceneSfx, voiceChunkWindows,
  sceneNormalizeFilter, musicMixPlan,
} from '../../api/_lib/renderFfmpeg.js';
import type { SfxCandidate } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, CLEAN, HYPE, IMPACT, PRESETS } from '../../api/_lib/renderPresets.js';
import type { RenderPreset } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

// Encodes the Phase 2 trim intent (workflows/render_pipeline_voice_10.md):
// speech-end = start of the trailing silence run, + 0.3s pad, clamped to the
// clip duration. No trailing silence → keep the full clip. Audio-less scenes
// fall back to a provided duration / the full clip.

describe('parseDurationSec', () => {
  it('parses an ffmpeg Duration line to seconds', () => {
    const stderr = '  Duration: 00:00:06.50, start: 0.000000, bitrate: 128 kb/s';
    expect(parseDurationSec(stderr)).toBeCloseTo(6.5, 3);
  });

  it('parses minutes and hours', () => {
    expect(parseDurationSec('Duration: 00:01:30.00,')).toBeCloseTo(90, 3);
    expect(parseDurationSec('Duration: 01:00:00.00,')).toBeCloseTo(3600, 3);
  });

  it('returns null when no Duration line is present', () => {
    expect(parseDurationSec('no duration here')).toBeNull();
  });
});

describe('parseTrimSec', () => {
  const PAD = 0.3;

  it('trims to trailing-silence start + pad (the dead-air tail the feature removes)', () => {
    const stderr = [
      'Duration: 00:00:06.00,',
      '[silencedetect @ 0x1] silence_start: 4.2',
      '[silencedetect @ 0x1] silence_end: 6.0 | silence_duration: 1.8',
      '[silencedetect @ 0x1] silence_start: 4.2', // trailing run (no end after)
    ].join('\n');
    // last event is a silence_start → speech ended at 4.2, trim = 4.5
    expect(parseTrimSec(stderr, 6.0, PAD)).toBeCloseTo(4.5, 3);
  });

  it('clamps trim to the clip duration (pad cannot overrun the file)', () => {
    const stderr = 'Duration: 00:00:05.00,\n[silencedetect] silence_start: 4.9';
    expect(parseTrimSec(stderr, 5.0, PAD)).toBeCloseTo(5.0, 3);
  });

  it('trims trailing silence that ffmpeg CLOSES at EOF (the real-output dead-air bug)', () => {
    // Real ffmpeg emits BOTH silence_start and silence_end (~EOF) for a trailing
    // tail — previously misread as "speech runs to the end" and never trimmed.
    const stderr = [
      'Duration: 00:00:06.00,',
      '[silencedetect] silence_start: 1.0',
      '[silencedetect] silence_end: 1.5 | silence_duration: 0.5',   // mid-clip pause (ignored)
      '[silencedetect] silence_start: 4.4',
      '[silencedetect] silence_end: 5.98 | silence_duration: 1.58', // trailing, closed at ~EOF
    ].join('\n');
    expect(parseTrimSec(stderr, 6.0, PAD)).toBeCloseTo(4.7, 3); // 4.4 + 0.3
  });

  it('keeps the full clip when the last silence ends well before EOF (speech resumes)', () => {
    const stderr = [
      'Duration: 00:00:06.00,',
      '[silencedetect] silence_start: 4.4',
      '[silencedetect] silence_end: 4.9 | silence_duration: 0.5', // 4.9 << 6.0 → not trailing
    ].join('\n');
    expect(parseTrimSec(stderr, 6.0, PAD)).toBeCloseTo(6.0, 3);
  });

  it('keeps the full clip when there is no trailing silence (speech runs to EOF)', () => {
    const stderr = [
      'Duration: 00:00:06.00,',
      '[silencedetect] silence_start: 2.0',
      '[silencedetect] silence_end: 2.5 | silence_duration: 0.5', // mid-clip pause, then speech
    ].join('\n');
    // last event is a silence_end → speech reaches the end → full duration
    expect(parseTrimSec(stderr, 6.0, PAD)).toBeCloseTo(6.0, 3);
  });

  it('keeps the full clip when no silence is detected at all', () => {
    expect(parseTrimSec('Duration: 00:00:04.00,', 4.0, PAD)).toBeCloseTo(4.0, 3);
  });

  it('returns the padded speech-end even when duration is unknown', () => {
    const stderr = '[silencedetect] silence_start: 3.0';
    expect(parseTrimSec(stderr, null, PAD)).toBeCloseTo(3.3, 3);
  });

  it('returns null when duration is unknown and speech runs to EOF', () => {
    expect(parseTrimSec('no events', null, PAD)).toBeNull();
  });
});

describe('dimsFor', () => {
  it('maps each aspect ratio to portrait/landscape/square dimensions', () => {
    expect(dimsFor('9:16')).toEqual([1080, 1920]);
    expect(dimsFor('16:9')).toEqual([1920, 1080]);
    expect(dimsFor('1:1')).toEqual([1080, 1080]);
  });

  it('defaults to 9:16 for an unknown ratio', () => {
    expect(dimsFor('weird')).toEqual([1080, 1920]);
  });
});

describe('sceneNormalizeFilter (quality upscale prefix)', () => {
  it('scales with lanczos and adds the light unsharp pass', () => {
    const f = sceneNormalizeFilter(1080, 1920);
    expect(f).toContain('flags=lanczos');
    expect(f).toContain('unsharp=5:5:0.4:5:5:0.2');
  });
  it('sharpens AFTER setsar (never before pad/normalize)', () => {
    const f = sceneNormalizeFilter(1080, 1920);
    expect(f.indexOf('unsharp=5:5:0.4:5:5:0.2')).toBeGreaterThan(f.indexOf('setsar=1'));
  });
});

// Gains carry a +5% bump (Neil, 2026-08-17). What this block actually locks is
// the ROLE CONTRACT — a bed stays quiet and ducks, a lead plays loud and never
// ducks, and an unset role is a bed. The literals move whenever Neil re-tunes by
// ear; the relationship between them must not.
describe('musicMixPlan (role → gain + ducking)', () => {
  it('bed (default) plays quiet and ducks under the VO', () => {
    expect(musicMixPlan('bed')).toEqual({ volume: 0.189, duck: true });
  });
  it('lead (no-VO) plays loud and never ducks', () => {
    expect(musicMixPlan('lead')).toEqual({ volume: 0.8925, duck: false });
  });
  it('undefined role falls back to the bed plan', () => {
    expect(musicMixPlan(undefined)).toEqual({ volume: 0.189, duck: true });
  });
  it('a lead is always louder than a bed, whatever the tuned numbers are', () => {
    expect(musicMixPlan('lead').volume).toBeGreaterThan(musicMixPlan('bed').volume);
  });
});

describe('chooseTrim', () => {
  const PROBE = 6.0; // full clip length

  it('trims a voiced scene to the measured VO end (ground truth, any script/product)', () => {
    // detectedSec = real voice speech-end + pad measured from the VO MP3.
    const plan = chooseTrim({ audioUrl: 'x' }, PROBE, 3.4);
    expect(plan.trimSec).toBeCloseTo(3.4, 3);
    expect(plan.padAudio).toBe(false);
  });

  it('removes a 15s final-scene tail when VO ends at 13s', () => {
    const plan = chooseTrim({ audioUrl: 'voice.mp3' }, 15, 13.3);
    expect(plan.trimSec).toBeLessThanOrEqual(13.5);
  });

  it('never lets the VO-end trim overrun the clip (capped to probe)', () => {
    expect(chooseTrim({ audioUrl: 'x' }, PROBE, 99).trimSec).toBeCloseTo(PROBE, 3);
  });

  it('measured VO end wins over the word-count estimate (estimate is fallback-only now)', () => {
    // Old behavior hard-capped to targetDurationSec (3.4) and cut the VO mid-word;
    // now the measured voice end (4.1) is authoritative so the VO is never truncated.
    const plan = chooseTrim({ audioUrl: 'x', targetDurationSec: 3.4 }, PROBE, 4.1);
    expect(plan.trimSec).toBeCloseTo(4.1, 3);
    expect(plan.padAudio).toBe(false);
  });

  // The hold went 1.0 → 0.5 on 2026-08-09 (Neil, A/B'd on real footage): the hook's
  // trailing silence sat at seconds 3.8-5.0, which is where the viewer decides to
  // keep watching. 0.5s still lands the reveal; 1.0s read as dead air.
  it('hook: holds the reveal 0.5s past the VO end and pads the short audio', () => {
    const plan = chooseTrim({ keepFullClip: true, audioUrl: 'x' }, PROBE, 2.8);
    expect(plan.trimSec).toBeCloseTo(3.3, 3); // 2.8 VO end + 0.5 reveal hold
    expect(plan.padAudio).toBe(true);
  });

  it('hook: the reveal-hold cannot overrun the clip', () => {
    const plan = chooseTrim({ keepFullClip: true, audioUrl: 'x' }, 3.9, 3.6);
    expect(plan.trimSec).toBeCloseTo(3.9, 3); // 3.6 + 0.5 capped to the 3.9 clip
    expect(plan.padAudio).toBe(true);
  });

  it('falls back to the word-count estimate when there is no measured VO end', () => {
    // e.g. silencedetect produced nothing (detectedSec null) but audio exists.
    expect(chooseTrim({ audioUrl: 'x', targetDurationSec: 3.4 }, PROBE, null).trimSec).toBeCloseTo(3.4, 3);
  });

  it('clamps the estimate fallback to the clip duration', () => {
    expect(chooseTrim({ targetDurationSec: 99 }, PROBE, null).trimSec).toBeCloseTo(PROBE, 3);
  });

  it('hook with no measured VO end keeps the full clip (fallback) and pads audio', () => {
    const plan = chooseTrim({ keepFullClip: true, audioUrl: 'x' }, PROBE, null);
    expect(plan.trimSec).toBeCloseTo(PROBE, 3);
    expect(plan.padAudio).toBe(true);
  });

  it('uses an explicit fallback duration when there is no audio at all', () => {
    expect(chooseTrim({ fallbackDurationSec: 4 }, PROBE, null).trimSec).toBeCloseTo(4, 3);
  });

  it('keeps the full clip when nothing else applies', () => {
    expect(chooseTrim({}, PROBE, null).trimSec).toBeCloseTo(PROBE, 3);
  });

  // The hold moved from a module constant onto the preset (2026-08-10) because one
  // global value gave a Testimonial hook the same beat as a MrBeast one. These pin
  // the dial itself: the plumbing must read the preset, and today every preset still
  // ships 0.5 so the move is provably behaviour-neutral.
  describe('reveal hold is a per-preset dial', () => {
    const HOOK = { keepFullClip: true, audioUrl: 'x' } as const;

    it('reads the hold off the preset instead of a fixed constant', () => {
      // Independent source of truth: a hand-built preset, not one of ours.
      const slow: RenderPreset = { ...CLEAN, hook: { ...CLEAN.hook, revealHoldSec: 1.25 } };
      expect(chooseTrim(HOOK, PROBE, 2.8, slow).trimSec).toBeCloseTo(4.05, 3); // 2.8 + 1.25
    });

    it('a zero hold cuts exactly on the VO end', () => {
      const snap: RenderPreset = { ...HYPE, hook: { ...HYPE.hook, revealHoldSec: 0 } };
      expect(chooseTrim(HOOK, PROBE, 2.8, snap).trimSec).toBeCloseTo(2.8, 3);
    });

    it('still clamps to the clip no matter how long the preset asks to hold', () => {
      const greedy: RenderPreset = { ...IMPACT, hook: { ...IMPACT.hook, revealHoldSec: 99 } };
      expect(chooseTrim(HOOK, 3.9, 3.6, greedy).trimSec).toBeCloseTo(3.9, 3);
    });

    it('omitting the preset behaves exactly as CLASSIC (unchanged default)', () => {
      expect(chooseTrim(HOOK, PROBE, 2.8).trimSec)
        .toBeCloseTo(chooseTrim(HOOK, PROBE, 2.8, CLASSIC).trimSec, 3);
    });

    // Guards the migration itself: if a future preset forgets the field, the trim
    // silently becomes NaN rather than failing loudly.
    it('every shipped preset carries a usable hold', () => {
      for (const [id, p] of Object.entries(PRESETS)) {
        expect(Number.isFinite(p.hook.revealHoldSec), id).toBe(true);
        expect(p.hook.revealHoldSec, id).toBeGreaterThanOrEqual(0);
      }
    });

    // The whole point of the dial (Neil, 2026-08-10): a testimonial hook must not
    // cut on the same beat as a MrBeast one. Asserted as an ORDERING, not as three
    // magic numbers, so retuning the values does not break the test that protects
    // the intent behind them.
    it('a testimonial hook breathes longer than a hype hook', () => {
      expect(CLEAN.hook.revealHoldSec).toBeGreaterThan(HYPE.hook.revealHoldSec);
      expect(CLEAN.hook.revealHoldSec).toBeGreaterThan(IMPACT.hook.revealHoldSec);
      // classic is the frozen kill-switch override and sits between them.
      expect(CLASSIC.hook.revealHoldSec).toBe(0.5);
    });
  });
});

// --- Burn-in pure helpers (overlays/captions timing + drawtext construction) ---

describe('clampWindow', () => {
  it('clamps an overlay window to [0, trimSec]', () => {
    expect(clampWindow(1, 3, 5)).toEqual({ start: 1, end: 3 });
    expect(clampWindow(-1, 9, 5)).toEqual({ start: 0, end: 5 }); // clamped both ends
  });
  it('drops a cue that starts at/after the trimmed end', () => {
    expect(clampWindow(5, 6, 5)).toBeNull();
    expect(clampWindow(6, 7, 5)).toBeNull();
  });
  it('drops a window too short to read after clamping', () => {
    expect(clampWindow(4.99, 6, 5)).toBeNull(); // 0.01s visible
  });
  it('treats a null/zero trim as uncapped', () => {
    expect(clampWindow(1, 3, null)).toEqual({ start: 1, end: 3 });
  });
});

describe('clampAnchor', () => {
  it('keeps an anchor inside the clip and floors negatives to 0', () => {
    expect(clampAnchor(2, 5)).toBe(2);
    expect(clampAnchor(-1, 5)).toBe(0);
  });
  it('drops an anchor at/after the trimmed end', () => {
    expect(clampAnchor(5, 5)).toBeNull();
    expect(clampAnchor(9, 5)).toBeNull();
  });
});

describe('escFilterPath', () => {
  it('forward-slashes separators and escapes the Windows drive colon', () => {
    expect(escFilterPath('C:\\Users\\x\\font.ttf')).toBe('C\\:/Users/x/font.ttf');
  });
  it('leaves a posix path with no colon untouched', () => {
    expect(escFilterPath('/tmp/x/font.ttf')).toBe('/tmp/x/font.ttf');
  });
});

// --- Overlay/caption engine ---

const DIMS: [number, number] = [1080, 1920];

describe('safeZone', () => {
  it('derives 10% side / 14% top / 22% bottom margins for 9:16', () => {
    const sz = safeZone(DIMS);
    expect(sz.xMargin).toBe(108);
    expect(sz.topY).toBe(269);          // round(1920*0.14)
    expect(sz.bottomY).toBe(1498);      // round(1920*0.78)
    expect(sz.usableW).toBe(864);       // 1080*0.8
  });
});

describe('fitText', () => {
  it('keeps a short line on one line at full size', () => {
    const r = fitText('ORDER NA', 864, 120);
    expect(r.lines).toEqual(['ORDER NA']);
    expect(r.fontsize).toBe(120);
  });
  it('shrinks then wraps a long line to two balanced lines', () => {
    const r = fitText('Sobrang lambot ng skin ko ngayon promise', 864, 80);
    expect(r.lines.length).toBe(2);
    expect(r.fontsize).toBeLessThanOrEqual(80);
  });
  it('hard-breaks a single overlong token', () => {
    expect(wrapTwoLines('Supercalifragilistic').length).toBe(2);
  });
});

describe('stripUnrenderable', () => {
  it('drops emoji/symbols Inter-Black cannot render and collapses spaces', () => {
    expect(stripUnrenderable('Grabe 🔥 ang  resulta ✨')).toBe('Grabe ang resulta');
  });
  it('strips apostrophes (reads as AI) but keeps commas', () => {
    expect(stripUnrenderable("Iba 'to, promise")).toBe('Iba to, promise');
    expect(stripUnrenderable("TIGNAN MO 'TO")).toBe('TIGNAN MO TO');
  });
});

describe('evenSplit', () => {
  it('splits as evenly as possible, remainder to the front groups', () => {
    expect(evenSplit([1, 2, 3, 4, 5], 2).map((g) => g.length)).toEqual([3, 2]);
    expect(evenSplit([1, 2, 3], 3).map((g) => g.length)).toEqual([1, 1, 1]);
  });
});

describe('chunkCaption', () => {
  it('groups ~3-4 words and respects the min-duration chunk cap', () => {
    // 8 words but only 1.5s available → at most 2 chunks (0.7s min each)
    const chunks = chunkCaption('isa dalawa tatlo apat lima anim pito walo', 1.5);
    expect(chunks.length).toBeLessThanOrEqual(2);
  });
  it('never starts a chunk with a particle (pulled back to the previous)', () => {
    const chunks = chunkCaption('Grabe ang lambot ng skin ko ngayon talaga', 99);
    for (let i = 1; i < chunks.length; i++) {
      expect(['ng', 'na', 'ang', 'sa'].includes(chunks[i].split(' ')[0].toLowerCase())).toBe(false);
    }
  });
  it('returns [] for an empty/emoji-only line', () => {
    expect(chunkCaption('🔥✨', 5)).toEqual([]);
  });
});

describe('planScene', () => {
  const hook: FinalRenderScene = {
    sceneIdx: 0, videoUrl: 'v', isHook: true,
    overlayText: [{ text: "TIGNAN MO 'TO", startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
  };
  it('hook: emits a wipe-box BEFORE the slide-up text (box drawn behind), boom on the pop', () => {
    const layers = planScene(hook, 4, DIMS);
    expect(layers[0].kind).toBe('box');
    expect(layers[1].kind).toBe('text');
    const text = layers[1] as Extract<typeof layers[1], { kind: 'text' }>;
    expect(text.anim).toBe('slideup');
    expect(text.emphasisSfx).toBe('boom');               // hook accent paired to the flip
    expect(text.startSec).toBe(0.4);                      // ...at HOOK_DELAY (the pop)
  });
  it('scene 2+: callout (fade) carries a pop, offset after the cut; captions carry none', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 1, videoUrl: 'v', sceneType: 'talking', scriptLine: 'Grabe ang lambot ng skin ko ngayon',
      overlayText: [{ text: 'DERMA-TESTED', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
    };
    const layers = planScene(scene, 6, DIMS).filter((l) => l.kind === 'text') as any[];
    expect(layers[0].anim).toBe('fade');                 // overlay first
    expect(layers[0].emphasisSfx).toBe('pop');           // callout → pop on its reveal
    expect(layers[0].startSec).toBeCloseTo(0.3);         // offset off the cut (CALLOUT_LEAD)
    expect(layers[1].startSec).toBeGreaterThanOrEqual(layers[0].endSec); // caption after, no overlap
    expect(layers[1].emphasisSfx).toBeUndefined();       // spoken-word captions get no SFX
  });
  it('scene 2+: a punchline CTA overlay pairs a ding', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 7, videoUrl: 'v', sceneType: 'b-roll',
      overlayText: [{ text: 'ORDER NA', startSec: 0, endSec: 5, style: 'punchline', position: 'bottom' }],
    };
    const fade = planScene(scene, 5, DIMS).find((l) => l.kind === 'text') as any;
    expect(fade.emphasisSfx).toBe('ding');
  });
  it('b-roll: a callout owning the opening drops the WHOLE subtitle (no inverting tail) — C1', () => {
    // The bug: a callout held over the line's opening sacrificed only the EARLY
    // chunks, leaving a tail that strands the opening — e.g. VO "hindi mo
    // kailangan ng kape" rendering as "kailangan ng kape" (meaning inverted).
    // C1 (Neil 2026-06-16): on b-roll, show ONLY the callout, never a fragment.
    const scene: FinalRenderScene = {
      sceneIdx: 3, videoUrl: 'v', sceneType: 'b-roll',
      scriptLine: 'hindi mo kailangan ng kape',
      overlayText: [{ text: 'ENERGY RESET', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
    };
    const texts = planScene(scene, 6, DIMS).filter((l) => l.kind === 'text') as any[];
    expect(texts).toHaveLength(1);          // only the callout, no stranded tail
    expect(texts[0].text).toBe('ENERGY RESET');
  });
  it('talking: the subtitle still resumes after the callout (C1 is b-roll-only)', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 2, videoUrl: 'v', sceneType: 'talking',
      scriptLine: 'Grabe ang lambot ng skin ko ngayon talaga',
      overlayText: [{ text: 'DERMA-TESTED', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
    };
    const texts = planScene(scene, 6, DIMS).filter((l) => l.kind === 'text') as any[];
    expect(texts.length).toBeGreaterThan(1); // callout + spoken-word caption chunks
  });
  it('scene 2+: skips the overlay when it duplicates the caption text', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 2, videoUrl: 'v', sceneType: 'talking', scriptLine: 'Ako si Maria',
      overlayText: [{ text: 'Ako si Maria!', startSec: 0, endSec: 5, style: 'subtitle', position: 'bottom' }],
    };
    const fades = planScene(scene, 5, DIMS).filter((l) => l.kind === 'text' && (l as any).anim === 'fade');
    expect(fades.length).toBe(0);
  });
});

describe('planEndCardLayers (recap only — price anchor removed 2026-06-13)', () => {
  const card = { recapText: 'FIRST 50: FREE DRIP BAG' };
  it('returns [] when the end card is absent or blank', () => {
    expect(planEndCardLayers(undefined, 5, DIMS)).toEqual([]);
    expect(planEndCardLayers({}, 5, DIMS)).toEqual([]);
    expect(planEndCardLayers({ recapText: '  ' }, 5, DIMS)).toEqual([]);
  });
  it('recap: gold highlight, pop-in, holds to the trim end, NO sfx', () => {
    const layers = planEndCardLayers(card, 5, DIMS) as any[];
    expect(layers).toHaveLength(1);
    const recap = layers[0];
    expect(recap.color).toBe('0xFFCC00');               // CLASSIC highlightColor
    expect(recap.anim).toBe('pop');
    expect(recap.startSec).toBeCloseTo(0.3);
    expect(recap.endSec).toBe(5);                       // holds to scene end, no 1.5s cutoff
    expect(recap.emphasisSfx).toBeUndefined();          // 0.3s would collide with cut/overlay sfx
  });
  it('ignores a stale priceAnchorText field (removed; zod also strips it server-side)', () => {
    const stale = { recapText: 'FREE SHIPPING TODAY', priceAnchorText: '₱499 ONLY' } as any;
    expect(planEndCardLayers(stale, 5, DIMS)).toHaveLength(1);
  });
  it('skips a recap that cannot show ≥0.4s before the scene ends', () => {
    expect(planEndCardLayers(card, 0.6, DIMS)).toEqual([]);
  });
  it('drops a recap that duplicates text the scene already burns (EDL overlay / caption)', () => {
    expect(planEndCardLayers(card, 5, DIMS, undefined, ['First 50, free drip bag!'])).toEqual([]);
  });
  it('face-aware: with a measured captionRegion the recap moves to the band top, not 0.26h', () => {
    // Talking-head close: face fills the upper-middle; clear band is the lower third.
    const region = { yFracTop: 0.62, yFracBottom: 0.85 };
    const fixed = planEndCardLayers(card, 5, DIMS) as any[];
    const aware = planEndCardLayers(card, 5, DIMS, undefined, [], region) as any[];
    expect(fixed[0].yBase).toBe(Math.round(1920 * 0.26));      // legacy fixed band
    expect(aware[0].yBase).toBe(Math.round(1920 * 0.62));      // top of face-clear band
  });
  it('face-aware y stays clamped inside the safe zone', () => {
    const aware = planEndCardLayers(card, 5, DIMS, undefined, [], { yFracTop: 0.99, yFracBottom: 1 }) as any[];
    expect(aware[0].yBase).toBeLessThan(1920);                  // not pushed off-frame
  });
});

describe('buildTextFilter / buildBoxFilter (filtergraph)', () => {
  const base = {
    kind: 'text' as const, text: 'X', fontsize: 80, color: 'white', boxAlpha: 0.85,
    xExpr: '(w-text_w)/2', yBase: 1200, startSec: 0.4, endSec: 2.5, anim: 'none' as const,
  };
  it('single-quotes expression values so inner commas stay literal', () => {
    const f = buildTextFilter(base, 'font.ttf', 'ov.txt');
    expect(f).toContain("enable='between(t,0.4,2.5)'");
    expect(f).toContain("alpha='1'");
    expect(f).toContain('fontfile=font.ttf');        // bare names (cwd=dir)
    expect(f).toContain('box=1');
  });
  it('hook reveal (locked: flip) snaps alpha + animates fontsize scale + rises', () => {
    const f = buildTextFilter({ ...base, anim: 'slideup', boxAlpha: 0 }, 'font.ttf', 'h.txt');
    // alpha snaps in over HOOK_FADE_SEC (0.15s), NOT the old slow 0.7s fade
    expect(f).toContain("alpha='min(1,max(0,(t-0.4)/0.15))'");
    // flip = clamped uniform scale-grow 45%→100% (+overshoot); single-quoted so the
    // commas inside max(10,…) stay literal (2026-06-08 escaping lesson). pow base ≥0.
    expect(f).toMatch(/fontsize='max\(10,80\*\(0\.45\+0\.55\*\(1-2\.70158\*pow\(1-min\(1,max\(0,\(t-0\.4\)\/0\.35\)\),3\)/);
    // small rise rides along with the scale
    expect(f).toContain("y='1200+28*(1-min(1,max(0,(t-0.4)/0.35)))'");
  });
  it('box wipe is a left→right cascade of time-gated slices (drawbox has no eval=frame)', () => {
    const f = buildBoxFilter({ kind: 'box', x: 200, y: 800, w: 240, h: 50, color: '0xD90429', startSec: 0.55, wipeDur: 0.4 });
    const slices = f.split(',drawbox=').length - 1 + (f.startsWith('drawbox=') ? 1 : 0);
    expect(slices).toBe(WIPE_SLICES);
    expect(f).toContain("enable='gte(t,0.550)'");            // first slice at startSec
    expect(f).toContain("enable='gte(t,0.933)'");            // last slice ~startSec+wipeDur*23/24
    expect(f).toContain('color=0xD90429@0.9');
    expect(f).not.toContain("min(");                          // no eval-once width expr
  });
});

describe('snapSfxAnchor (keep only deterministic transition cues)', () => {
  it('snaps a transition sound (whoosh/swish) to t=0 of the incoming scene (the cut)', () => {
    expect(snapSfxAnchor('whoosh', 2, false)).toBe(0);
    expect(snapSfxAnchor('swish', 3, false)).toBe(0);
  });
  it('drops transition sounds on the hook / first scene (no incoming cut)', () => {
    expect(snapSfxAnchor('whoosh', 0, false)).toBeNull(); // spurious "too early" opener
    expect(snapSfxAnchor('swish', 2, true)).toBeNull();   // hook accent comes from the layer, not here
  });
  it('drops EDL non-transition cues (their guessed in-scene timing is unreliable)', () => {
    expect(snapSfxAnchor('ding', 1, false)).toBeNull();   // emphasis now comes from text-paired layers
    expect(snapSfxAnchor('boom', 4, false)).toBeNull();
  });
});

describe('pickSceneSfx (restraint: no stacking, capped whooshes, emphasis wins)', () => {
  it('drops a transition whoosh that collides with an emphasis pop (emphasis wins)', () => {
    const cands: SfxCandidate[] = [
      { sfxId: 'whoosh', globalSec: 10.0, transition: true },
      { sfxId: 'pop', globalSec: 10.3, transition: false }, // 0.3 < 0.4 gap
    ];
    expect(pickSceneSfx(cands, [], 0).map((k) => k.sfxId)).toEqual(['pop']);
  });
  it('keeps both when spaced beyond the min-gap', () => {
    const cands: SfxCandidate[] = [
      { sfxId: 'whoosh', globalSec: 10.0, transition: true },
      { sfxId: 'pop', globalSec: 11.0, transition: false },
    ];
    expect(pickSceneSfx(cands, [], 0).length).toBe(2);
  });
  it('caps transition whooshes at MAX_WHOOSH (3); emphasis stays uncapped', () => {
    const trans: SfxCandidate[] = [12, 16, 20, 24].map((t) => ({ sfxId: 'whoosh', globalSec: t, transition: true }));
    expect(pickSceneSfx(trans, [], 3).length).toBe(0); // budget exhausted
    expect(pickSceneSfx(trans, [], 2).length).toBe(1); // 1 left
    const ding: SfxCandidate[] = [{ sfxId: 'ding', globalSec: 30, transition: false }];
    expect(pickSceneSfx(ding, [], 3).length).toBe(1);  // emphasis ignores the whoosh cap
  });
  it('respects already-placed times across scenes (min-gap is global)', () => {
    const cands: SfxCandidate[] = [{ sfxId: 'ding', globalSec: 5.2, transition: false }];
    expect(pickSceneSfx(cands, [5.0], 0).length).toBe(0); // 5.2 within 0.4 of placed 5.0
  });
  it('caps any single emphasis sound at 2 per ad (every-scene "drop" tick, 2026-06-13)', () => {
    // 7 scenes all defaulting the same EDL cue, well beyond min-gap
    const drops: SfxCandidate[] = [2, 7, 12, 17, 22, 27, 32].map(
      (t) => ({ sfxId: 'drop', globalSec: t, transition: false })
    );
    expect(pickSceneSfx(drops, [], 0).length).toBe(2);
    // distinct sounds are unaffected by each other's budgets
    const varied: SfxCandidate[] = [
      { sfxId: 'drop', globalSec: 2, transition: false },
      { sfxId: 'ding', globalSec: 7, transition: false },
      { sfxId: 'boom', globalSec: 12, transition: false },
    ];
    expect(pickSceneSfx(varied, [], 0).length).toBe(3);
  });
  it('threads per-sound use across scenes via soundUse', () => {
    const cand: SfxCandidate[] = [{ sfxId: 'drop', globalSec: 20, transition: false }];
    expect(pickSceneSfx(cand, [], 0, 3, 0.4, { drop: 2 }).length).toBe(0); // budget spent in earlier scenes
    expect(pickSceneSfx(cand, [], 0, 3, 0.4, { drop: 1 }).length).toBe(1); // 1 left
  });
});

describe('voiceChunkWindows (measured caption pacing from forced alignment)', () => {
  const w = (text: string, start: number, end: number) => ({ text, start, end });
  it('opens each chunk when its first word is SPOKEN, holding to the next chunk', () => {
    // VO starts 0.8s in — the even-spread estimate would have shown text at ~0.27s.
    const words = [w('Pag-uwi', 0.8, 1.2), w('galing', 1.25, 1.6), w('trabaho', 1.65, 2.2),
                   w('oily', 2.6, 2.9), w('na', 2.95, 3.05), w('agad', 3.1, 3.5)];
    const wins = voiceChunkWindows(['Pag-uwi galing trabaho', 'oily na agad'], words, 6)!;
    expect(wins[0].start).toBeCloseTo(0.8, 2);   // real speech start, not estimate
    expect(wins[0].end).toBeCloseTo(2.6, 2);     // holds until chunk 2 opens (continuous)
    expect(wins[1].start).toBeCloseTo(2.6, 2);
    expect(wins[1].end).toBeCloseTo(3.9, 2);     // last word end + 0.4 read-out beat
  });
  it('maps proportionally when the aligner tokenized differently than the script split', () => {
    const words = [w('a', 0.5, 0.8), w('b', 0.9, 1.2), w('c', 1.3, 1.6)]; // 3 aligned vs 4 script words
    const wins = voiceChunkWindows(['one two', 'three four'], words, 6)!;
    expect(wins).toHaveLength(2);
    expect(wins[0].start).toBeCloseTo(0.5, 2);
    expect(wins[1].start).toBeGreaterThan(wins[0].start);  // monotonic
  });
  it('clamps to the scene trim and returns null with nothing to map', () => {
    const wins = voiceChunkWindows(['hello there'], [w('hello', 1, 2), w('there', 2, 9)], 3)!;
    expect(wins[0].end).toBeLessThanOrEqual(3);
    expect(voiceChunkWindows([], [w('x', 0, 1)], 5)).toBeNull();
    expect(voiceChunkWindows(['x'], [], 5)).toBeNull();
  });
});
