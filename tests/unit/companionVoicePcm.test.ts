import { describe, expect, it, vi } from 'vitest';
import { decodePcm16, encodePcm16, MAX_PCM16_SAMPLES, Pcm16Encoder } from '../../services/companionVoicePcm.js';

function bytes(packet: string | undefined): number[] {
  return packet ? Array.from(atob(packet), value => value.charCodeAt(0)) : [];
}

function signedSamples(packet: string | undefined): number[] {
  const data = Uint8Array.from(bytes(packet));
  const view = new DataView(data.buffer);
  return Array.from({ length: data.length / 2 }, (_, index) => view.getInt16(index * 2, true));
}

function stream(samples: Float32Array, sampleRate: number, sizes: number[]): number[] {
  const encoder = new Pcm16Encoder(sampleRate);
  const result: number[] = [];
  let offset = 0;
  let chunk = 0;
  while (offset < samples.length) {
    const end = Math.min(samples.length, offset + sizes[chunk++ % sizes.length]);
    result.push(...bytes(encoder.encode(samples.subarray(offset, end))));
    offset = end;
  }
  result.push(...bytes(encoder.flush()));
  return result;
}

describe('companion microphone PCM16 encoding', () => {
  it('clips both signs and writes signed little-endian PCM16', () => {
    const packet = encodePcm16(new Float32Array([-2, -1, -.5, 0, .5, 1, 2]), 16_000);
    expect(bytes(packet)).toEqual([0, 128, 0, 128, 0, 192, 0, 0, 0, 64, 255, 127, 255, 127]);
  });

  it('interpolates fractional input positions from a worked 24-to-16 kHz example', () => {
    const packet = encodePcm16(new Float32Array([0, .25, .5, .75, 1, 0]), 24_000);
    // Source positions 0, 1.5, 3, 4.5 yield 0, .375, .75, .5.
    expect(signedSamples(packet)).toEqual([0, 12288, 24575, 16384]);
  });

  it.each([44_100, 48_000])('encodes exactly 16000 samples for one second at %i Hz', sampleRate => {
    const samples = new Float32Array(sampleRate).fill(.5);
    const packet = encodePcm16(samples, sampleRate);
    const result = signedSamples(packet);
    expect(result).toHaveLength(16_000);
    expect(result[0]).toBe(16384);
    expect(result.at(-1)).toBe(16384);
  });

  it.each([8_000, 16_000, 44_100, 48_000, 96_000])('keeps irregular and one-sample chunks equivalent at %i Hz', sampleRate => {
    const samples = Float32Array.from({ length: 5_137 }, (_, index) => Math.sin(index / 13) * 1.2);
    const complete = bytes(encodePcm16(samples, sampleRate));
    expect(stream(samples, sampleRate, [1, 127, 2, 511, 3, 128, 7])).toEqual(complete);
    expect(stream(samples, sampleRate, [1])).toEqual(complete);
  });

  it('preserves the fractional phase over a full second of 128-frame 44.1 kHz callbacks', () => {
    const samples = new Float32Array(44_100).fill(.25);
    expect(stream(samples, 44_100, [128])).toHaveLength(32_000);
  });

  it('keeps the first sample through tiny chunks and discards an incomplete terminal interval', () => {
    const encoder = new Pcm16Encoder(48_000);
    expect(encoder.encode(new Float32Array([-.5]))).toBeUndefined();
    expect(encoder.encode(new Float32Array([.25]))).toBeUndefined();
    expect(signedSamples(encoder.encode(new Float32Array([.75])))).toEqual([-16384]);
    expect(encoder.encode(new Float32Array([1]))).toBeUndefined();
    expect(encoder.flush()).toBeUndefined();
    expect(signedSamples(encoder.encode(new Float32Array([.5, 0, 0])))).toEqual([16384]);
  });

  it('holds the last source sample only when flushing an upsampled tail', () => {
    const encoder = new Pcm16Encoder(8_000);
    expect(signedSamples(encoder.encode(new Float32Array([0, .5, 1, 0])))).toEqual([0, 8192, 16384, 24575, 32767, 16384, 0]);
    expect(signedSamples(encoder.flush())).toEqual([0]);
    expect(encoder.flush()).toBeUndefined();
  });

  it('handles empty input and rejects invalid rates and nonfinite samples without consuming input', () => {
    for (const rate of [0, -1, NaN, Infinity]) expect(() => new Pcm16Encoder(rate)).toThrow(/sample rate/i);
    const encoder = new Pcm16Encoder(48_000);
    expect(encoder.encode(new Float32Array())).toBeUndefined();
    expect(encodePcm16(new Float32Array(), 16_000)).toBeUndefined();
    expect(encoder.encode(new Float32Array([.5]))).toBeUndefined();
    for (const value of [NaN, Infinity, -Infinity]) expect(() => encoder.encode(new Float32Array([value]))).toThrow(/finite/i);
    expect(signedSamples(encoder.encode(new Float32Array([0, 0])))).toEqual([16384]);
  });
});

describe('companion speaker PCM16 decoding', () => {
  it('decodes positive and negative little-endian values to normalized Float32 samples', () => {
    const packet = btoa(String.fromCharCode(0, 128, 0, 192, 0, 0, 0, 64, 255, 127));
    const decoded = decodePcm16(packet);
    expect(decoded).toBeInstanceOf(Float32Array);
    expect(Array.from(decoded)).toEqual([-1, -.5, 0, .5, 32767 / 32768]);
    expect(decodePcm16('')).toHaveLength(0);
  });

  it.each(['!', 'AAA', 'AA A', 'AA==AA==', 'AAAA====', 'AB==', '_AAA', 'AA=='])('rejects malformed or odd-length PCM packet %j', packet => {
    expect(() => decodePcm16(packet)).toThrow(/PCM16/i);
  });

  it('accepts the exact size bound and rejects excessive packets before base64 decoding', () => {
    const limit = btoa('\0'.repeat(MAX_PCM16_SAMPLES * 2));
    expect(decodePcm16(limit)).toHaveLength(MAX_PCM16_SAMPLES);
    const oversized = btoa('\0'.repeat(MAX_PCM16_SAMPLES * 2 + 2));
    const decode = vi.spyOn(globalThis, 'atob');
    try {
      expect(() => decodePcm16(oversized)).toThrow(/large/i);
      expect(decode).not.toHaveBeenCalled();
    } finally { decode.mockRestore(); }
  });
});
