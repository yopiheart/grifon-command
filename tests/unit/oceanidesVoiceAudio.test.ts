import { describe, expect, it } from 'vitest';
import { base64ToFloat32, PcmResampler, pcm16ToBase64, ResponseAudioGate, timingSummary } from '../../funnels/oceanides-price-page/src/voice-lab/audio-math';

describe('Oceanides streaming audio boundaries', () => {
  it('resamples the actual microphone rate consistently across worklet blocks', () => {
    const waveform = Float32Array.from({ length: 4096 }, (_, index) => Math.sin(index * 0.08) * 0.5);
    const whole = new PcmResampler(44100).push(waveform);
    const streaming = new PcmResampler(44100);
    const chunks: number[] = [];
    for (let offset = 0; offset < waveform.length; offset += 128) {
      chunks.push(...streaming.push(waveform.subarray(offset, offset + 128)));
    }
    expect(chunks).toEqual([...whole]);
    expect(chunks.length).toBeGreaterThan(2200);
    expect(chunks.length).toBeLessThan(2240);
  });

  it('round-trips little-endian PCM and clips values outside the microphone range', () => {
    const samples = new PcmResampler(24000).push(new Float32Array([-2, -1, 0, 1, 2, 0]));
    expect([...samples]).toEqual([-32768, -32768, 0, 32767, 32767]);
    const decoded = base64ToFloat32(pcm16ToBase64(samples));
    expect(decoded[0]).toBe(-1);
    expect(decoded[2]).toBe(0);
    expect(decoded[3]).toBeCloseTo(1, 4);
    expect(() => base64ToFloat32(btoa('x'))).toThrow('Invalid PCM16 audio frame');
  });

  it('does not replay late audio from a cancelled response', () => {
    const gate = new ResponseAudioGate();
    expect(gate.accept('response-1')).toBe(true);
    gate.cancel();
    expect(gate.accept('response-1')).toBe(false);
    expect(gate.accept('response-2')).toBe(true);
    expect(gate.accept('response-1')).toBe(false);
    gate.reset();
    expect(gate.accept('response-1')).toBe(true);
  });

  it('keeps unmeasured timings absent and reports raw valid sample statistics', () => {
    expect(timingSummary([])).toEqual({ count: 0, median: null, worst: null, p95: null });
    expect(timingSummary([Number.NaN, -3])).toEqual({ count: 0, median: null, worst: null, p95: null });
    expect(timingSummary([1000, 3000, 500, 1500])).toEqual({ count: 4, median: 1250, worst: 3000, p95: 3000 });
  });
});
