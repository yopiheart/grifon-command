import { describe, it, expect } from 'vitest';
import { parseDurationSec, parseTrimSec, dimsFor, chooseTrim } from '../../api/_lib/renderFfmpeg.js';

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
