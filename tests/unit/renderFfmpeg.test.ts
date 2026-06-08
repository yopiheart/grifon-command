import { describe, it, expect } from 'vitest';
import {
  parseDurationSec, parseTrimSec, dimsFor, chooseTrim,
  clampWindow, clampAnchor, escFilterPath,
  safeZone, fitText, wrapTwoLines, stripUnrenderable, evenSplit, chunkCaption,
  planScene, buildTextFilter, buildBoxFilter, WIPE_SLICES, snapSfxAnchor,
} from '../../api/_lib/renderFfmpeg.js';
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

describe('chooseTrim', () => {
  const PROBE = 6.0; // full clip length

  it('trims a voiced scene to the measured VO end (ground truth, any script/product)', () => {
    // detectedSec = real voice speech-end + pad measured from the VO MP3.
    const plan = chooseTrim({ audioUrl: 'x' }, PROBE, 3.4);
    expect(plan.trimSec).toBeCloseTo(3.4, 3);
    expect(plan.padAudio).toBe(false);
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

  it('hook: holds the reveal ~1s past the VO end and pads the short audio', () => {
    const plan = chooseTrim({ keepFullClip: true, audioUrl: 'x' }, PROBE, 2.8);
    expect(plan.trimSec).toBeCloseTo(3.8, 3); // 2.8 VO end + 1.0 reveal hold
    expect(plan.padAudio).toBe(true);
  });

  it('hook: the reveal-hold cannot overrun the clip', () => {
    const plan = chooseTrim({ keepFullClip: true, audioUrl: 'x' }, 4.0, 3.6);
    expect(plan.trimSec).toBeCloseTo(4.0, 3); // 3.6 + 1.0 capped to the 4.0 clip
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
  it('scene 2+: skips the overlay when it duplicates the caption text', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 2, videoUrl: 'v', sceneType: 'talking', scriptLine: 'Ako si Maria',
      overlayText: [{ text: 'Ako si Maria!', startSec: 0, endSec: 5, style: 'subtitle', position: 'bottom' }],
    };
    const fades = planScene(scene, 5, DIMS).filter((l) => l.kind === 'text' && (l as any).anim === 'fade');
    expect(fades.length).toBe(0);
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
