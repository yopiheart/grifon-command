#!/usr/bin/env node
/**
 * Original, deterministic SFX pilot. Node built-ins synthesize every sample;
 * installed FFmpeg only validates the locally written PCM. No input samples,
 * network, providers, credentials, speech, or score are used.
 *
 * Run: node workflows/assets/grifon-motion-upgrade/sfx-foundry/build-pilot.mjs
 * Verify existing exports: same command with --verify
 * Exercise late-decode failure and promotion rollback: --test-promotion-failure
 * Eight sounds are a pilot, not completion of the proposed 24-sound library.
 * Technical levels cannot establish subjective premium quality: audition these
 * against the approved film, its VO/music, and real phone speakers.
 */
import { readFileSync, writeFileSync, mkdtempSync, renameSync, rmSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(HERE, 'pilot');
const RATE = 48_000;
const CHANNELS = 2;
const BITS = 24;
const FULL_SCALE = 8_388_607;
const CEILING_DBFS = -6;
// Extra 0.15 dB handle protects the ceiling through PCM quantization.
const NORMALIZE_TO = 10 ** (-6.15 / 20);
const TAU = 2 * Math.PI;

// These editable recipes are the entire sound source. Frequencies are Hz;
// start/length/attack/decay/rise are seconds; gains are relative pre-mastering.
// The modal sets are deliberately inharmonic, with no major chord progression.
export const RECIPES = [
  {
    id: 'hero-sweep', duration: 0.75, sync: 0.47, seed: 0x7a24c381,
    character: 'Accelerating silk/air arrival with a compact warm landing.',
    layers: [
      { type: 'sweep', start: 0.008, length: 0.66, rise: 0.462, decay: 0.058, gain: 0.48, low: [140, 330], high: [1250, 4300], grain: 0.14 },
      { type: 'chirp', start: 0.075, length: 0.46, attack: 0.1, decay: 0.5, gain: 0.095, frequencies: [148, 284], mode: 'rise' },
      { type: 'chirp', start: 0.47, length: 0.275, attack: 0.0025, decay: 0.069, gain: 0.48, frequencies: [132, 70] },
      { type: 'modal', start: 0.47, length: 0.28, attack: 0.0015, decay: 0.086, gain: 0.59, frequencies: [188, 296, 437], weights: [1, 0.53, 0.26] },
      { type: 'burst', start: 0.47, length: 0.037, attack: 0.0015, decay: 0.011, gain: 0.15, low: 820, high: 3850 },
    ], space: 0.105,
  },
  {
    id: 'product-weight', duration: 0.65, sync: 0.02, seed: 0x58d8136f,
    character: 'Dense object seating: chest/body, rounded sub, tactile surface.',
    layers: [
      { type: 'chirp', start: 0.02, length: 0.48, attack: 0.002, decay: 0.112, gain: 0.42, frequencies: [145, 66] },
      { type: 'modal', start: 0.02, length: 0.54, attack: 0.0015, decay: 0.145, gain: 0.72, frequencies: [192, 283, 419], weights: [1, 0.58, 0.26] },
      { type: 'modal', start: 0.021, length: 0.31, attack: 0.0018, decay: 0.09, gain: 0.48, frequencies: [386, 653, 1019], weights: [1, 0.54, 0.2] },
      { type: 'burst', start: 0.02, length: 0.09, attack: 0.0013, decay: 0.023, gain: 0.22, low: 580, high: 2780 },
      { type: 'modal', start: 0.027, length: 0.185, attack: 0.003, decay: 0.037, gain: 0.058, frequencies: [697, 1149, 1811], weights: [1, 0.41, 0.16] },
    ], space: 0.082,
  },
  {
    id: 'pivot-suction', duration: 0.70, sync: 0.56, seed: 0x91ce0d27,
    character: 'Descending pressure draw that closes into a tight warm catch.',
    layers: [
      { type: 'sweep', start: 0.012, length: 0.63, rise: 0.548, decay: 0.025, gain: 0.42, low: [150, 285], high: [3300, 970], grain: 0.20 },
      { type: 'chirp', start: 0.05, length: 0.51, attack: 0.16, decay: 0.7, gain: 0.21, frequencies: [316, 151], mode: 'rise' },
      { type: 'chirp', start: 0.56, length: 0.14, attack: 0.0015, decay: 0.042, gain: 0.36, frequencies: [176, 91] },
      { type: 'modal', start: 0.56, length: 0.14, attack: 0.001, decay: 0.037, gain: 0.65, frequencies: [207, 329, 446], weights: [1, 0.48, 0.21] },
      { type: 'burst', start: 0.56, length: 0.032, attack: 0.001, decay: 0.009, gain: 0.19, low: 940, high: 3400 },
    ], space: 0.092,
  },
  {
    id: 'sphere-reveal', duration: 1.20, sync: 0.02, seed: 0xc428a6b9,
    character: 'Soft luminous pressure bloom with brief inharmonic glass texture.',
    layers: [
      { type: 'chirp', start: 0.02, length: 0.60, attack: 0.006, decay: 0.17, gain: 0.31, frequencies: [109, 67] },
      { type: 'modal', start: 0.02, length: 0.97, attack: 0.009, decay: 0.27, gain: 0.62, frequencies: [173, 267, 431], weights: [1, 0.51, 0.25] },
      { type: 'modal', start: 0.022, length: 0.67, attack: 0.006, decay: 0.17, gain: 0.47, frequencies: [376, 593, 947], weights: [1, 0.47, 0.19] },
      { type: 'sweep', start: 0.02, length: 0.77, rise: 0.053, decay: 0.19, gain: 0.16, low: [350, 520], high: [2100, 3450], grain: 0.08 },
      { type: 'modal', start: 0.032, length: 0.78, attack: 0.01, decay: 0.16, gain: 0.07, frequencies: [685, 1118, 1777], weights: [1, 0.4, 0.17] },
      { type: 'burst', start: 0.022, length: 0.046, attack: 0.003, decay: 0.014, gain: 0.07, low: 930, high: 4100 },
    ], space: 0.14,
  },
  {
    id: 'card-snap', duration: 0.35, sync: 0.02, seed: 0x36f197a5,
    character: 'Dry paper/polymer snap with a short solid midrange seat.',
    layers: [
      { type: 'burst', start: 0.02, length: 0.037, attack: 0.001, decay: 0.0085, gain: 0.38, low: 850, high: 4800 },
      { type: 'modal', start: 0.02, length: 0.215, attack: 0.0012, decay: 0.041, gain: 0.74, frequencies: [228, 354, 489], weights: [1, 0.52, 0.19] },
      { type: 'chirp', start: 0.021, length: 0.16, attack: 0.0015, decay: 0.029, gain: 0.20, frequencies: [155, 109] },
      { type: 'burst', start: 0.038, length: 0.022, attack: 0.001, decay: 0.006, gain: 0.065, low: 640, high: 2200 },
    ], space: 0.058,
  },
  {
    id: 'workflow-punch', duration: 0.70, sync: 0.02, seed: 0xe74921d3,
    character: 'Firm system lock with denser mid body and a restrained mechanical tail.',
    layers: [
      { type: 'chirp', start: 0.02, length: 0.48, attack: 0.0018, decay: 0.12, gain: 0.41, frequencies: [127, 72] },
      { type: 'modal', start: 0.02, length: 0.56, attack: 0.0015, decay: 0.13, gain: 0.69, frequencies: [183, 317, 447], weights: [1, 0.58, 0.22] },
      { type: 'burst', start: 0.02, length: 0.066, attack: 0.0012, decay: 0.018, gain: 0.23, low: 450, high: 2600 },
      { type: 'burst', start: 0.034, length: 0.035, attack: 0.0015, decay: 0.009, gain: 0.07, low: 1200, high: 4300 },
      { type: 'modal', start: 0.026, length: 0.37, attack: 0.004, decay: 0.069, gain: 0.065, frequencies: [631, 961, 1517], weights: [1, 0.37, 0.14] },
    ], space: 0.095,
  },
  {
    id: 'logo-resolve', duration: 1.65, sync: 0.02, seed: 0x624bd8e7,
    character: 'Warm brand settle with weight and a short airy glint, without a musical chord.',
    layers: [
      { type: 'chirp', start: 0.02, length: 0.77, attack: 0.003, decay: 0.235, gain: 0.28, frequencies: [79, 47] },
      { type: 'chirp', start: 0.02, length: 1.1, attack: 0.004, decay: 0.30, gain: 0.19, frequencies: [218, 164] },
      { type: 'modal', start: 0.02, length: 1.43, attack: 0.004, decay: 0.37, gain: 0.62, frequencies: [155, 261, 407], weights: [1, 0.46, 0.2] },
      { type: 'modal', start: 0.022, length: 0.90, attack: 0.006, decay: 0.19, gain: 0.52, frequencies: [371, 587, 923], weights: [1, 0.5, 0.18] },
      { type: 'burst', start: 0.025, length: 0.15, attack: 0.003, decay: 0.039, gain: 0.11, low: 350, high: 1900 },
      { type: 'burst', start: 0.02, length: 0.11, attack: 0.003, decay: 0.026, gain: 0.12, low: 530, high: 2600 },
      { type: 'modal', start: 0.027, length: 0.95, attack: 0.009, decay: 0.19, gain: 0.045, frequencies: [822, 1321], weights: [1, 0.32] },
      { type: 'modal', start: 0.092, length: 0.72, attack: 0.018, decay: 0.125, gain: 0.025, frequencies: [1147, 1819], weights: [1, 0.27] },
      { type: 'sweep', start: 0.02, length: 0.73, rise: 0.055, decay: 0.15, gain: 0.065, low: [430, 650], high: [2600, 3600], grain: 0.04 },
    ], space: 0.155,
  },
  {
    id: 'micro-select', duration: 0.16, sync: 0.015, seed: 0xadb0396d,
    character: 'Tiny tactile selection tick with a warm core and a clean textured edge.',
    layers: [
      { type: 'modal', start: 0.015, length: 0.115, attack: 0.001, decay: 0.022, gain: 0.64, frequencies: [256, 398, 627], weights: [1, 0.43, 0.12] },
      { type: 'chirp', start: 0.015, length: 0.08, attack: 0.001, decay: 0.017, gain: 0.16, frequencies: [216, 151] },
      { type: 'burst', start: 0.015, length: 0.029, attack: 0.0007, decay: 0.006, gain: 0.22, low: 890, high: 4050 },
    ], space: 0.048,
  },
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = state;
    n = Math.imul(n ^ (n >>> 15), n | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
function envelope(t, layer) {
  if (t < 0 || t >= layer.length) return 0;
  const tail = ease((layer.length - t) / Math.min(0.022, layer.length * 0.18));
  if (layer.type === 'sweep') {
    const shape = t < layer.rise ? (t / layer.rise) ** 2.25 : Math.exp(-(t - layer.rise) / layer.decay);
    return shape * tail;
  }
  const attack = ease(t / (layer.attack ?? 0.002));
  const fall = layer.mode === 'rise' ? (t / layer.length) ** 1.5 : Math.exp(-t / layer.decay);
  return attack * fall * tail;
}
function bandNoise(seed) {
  const rng = random(seed);
  let lowState = 0;
  let highState = 0;
  let brown = 0;
  return (low, high) => {
    const white = rng() * 2 - 1;
    brown = brown * 0.98 + white * 0.02;
    // Correlated low texture plus band-limited white: avoids an unfiltered hiss bed.
    const source = white * 0.66 + brown * 3.1;
    highState += (1 - Math.exp(-TAU * low / RATE)) * (source - highState);
    const highPassed = source - highState;
    lowState += (1 - Math.exp(-TAU * high / RATE)) * (highPassed - lowState);
    return lowState;
  };
}
function synthLayer(layer, frames, seed) {
  const out = new Float64Array(frames);
  const first = Math.round(layer.start * RATE);
  const count = Math.min(Math.ceil(layer.length * RATE), frames - first);
  const rng = random(seed);
  const noise = bandNoise(seed);
  const phases = (layer.frequencies ?? []).map(() => rng() * TAU);
  let chirpPhase = 0;
  for (let j = 0; j < count; j++) {
    const t = j / RATE;
    const x = t / layer.length;
    const env = envelope(t, layer);
    let value = 0;
    if (layer.type === 'chirp') {
      const [from, to] = layer.frequencies;
      const f = from * (to / from) ** Math.min(1, t / (layer.mode === 'rise' ? layer.length : 0.075));
      chirpPhase += TAU * f / RATE;
      // A soft asymmetric body adds upper warmth without a pure sine-beep design.
      value = Math.sin(chirpPhase) + 0.14 * Math.sin(chirpPhase * 2.017) + 0.055 * Math.sin(chirpPhase * 3.083);
    } else if (layer.type === 'modal') {
      let sumWeights = 0;
      layer.frequencies.forEach((f, k) => {
        const weight = layer.weights[k];
        const drift = 1 + 0.005 * Math.sin(TAU * 3.7 * t + phases[k]);
        phases[k] += TAU * f * drift / RATE;
        value += weight * Math.sin(phases[k]) * Math.exp(-t * k / (layer.decay * 3.6));
        sumWeights += weight;
      });
      value /= Math.sqrt(sumWeights);
    } else if (layer.type === 'burst') {
      value = noise(layer.low, layer.high) * 1.8;
    } else if (layer.type === 'sweep') {
      const progress = ease(Math.min(1, t / layer.rise));
      const low = layer.low[0] + (layer.low[1] - layer.low[0]) * progress;
      const high = layer.high[0] + (layer.high[1] - layer.high[0]) * progress;
      const flutter = 1 - layer.grain + layer.grain * Math.sin(TAU * (29 * t + 37 * t * t)) ** 2;
      value = noise(low, high) * 1.75 * flutter;
    } else {
      throw new Error(`Unknown layer: ${layer.type}`);
    }
    out[first + j] = value * env * layer.gain;
  }
  return out;
}
function biquad(input, type, frequency, q = 0.7071) {
  const w = TAU * frequency / RATE;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const a1 = -2 * cos / a0;
  const a2 = (1 - alpha) / a0;
  const sign = type === 'lowpass' ? -1 : 1;
  const b0 = (1 + sign * cos) / (2 * a0);
  const b1 = -sign * (1 + sign * cos) / a0;
  const b2 = b0;
  const out = new Float64Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const y = b0 * input[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1; x1 = input[i]; y2 = y1; y1 = y;
  }
  return out;
}
function stereoSpace(center, amount) {
  const upper = biquad(biquad(center, 'highpass', 720), 'lowpass', 5700);
  const left = Float64Array.from(center);
  const right = Float64Array.from(center);
  // Body stays exactly centered. Feed-forward early reflections only on upper
  // texture; no inverted polarity, stereo widener, infinite reverb or sub delay.
  const taps = [
    [0.011, 0.57, 0.19], [0.019, 0.17, 0.51],
    [0.033, 0.27, 0.10], [0.043, 0.09, 0.24], [0.061, 0.11, 0.09],
  ];
  for (const [delay, lg, rg] of taps) {
    const samples = Math.round(delay * RATE);
    for (let i = samples; i < center.length; i++) {
      left[i] += upper[i - samples] * amount * lg;
      right[i] += upper[i - samples] * amount * rg;
    }
  }
  return [left, right];
}
function dcAndEdges(channel) {
  const out = biquad(channel, 'highpass', 24);
  for (let i = 0; i < out.length; i++) {
    out[i] *= ease(i / (RATE * 0.003)) * ease((out.length - 1 - i) / (RATE * 0.009));
  }
  return out;
}
function samplePeak(channels) {
  let peak = 0;
  for (const channel of channels) for (const v of channel) {
    invariant(Number.isFinite(v), 'Non-finite synthesized sample');
    peak = Math.max(peak, Math.abs(v));
  }
  return peak;
}
// 4x Lanczos-8 reconstruction estimates intersample peaks. This is a local QC
// estimate, not an assertion of an ITU BS.1770 certified true-peak measurement.
function reconstructedPeak(channels) {
  let peak = samplePeak(channels);
  const filters = [0.25, 0.5, 0.75].map(fraction => {
    let sum = 0;
    const taps = [];
    for (let k = -7; k <= 8; k++) {
      const d = fraction - k;
      const sinc = d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
      const window = Math.sin(Math.PI * d / 8) / (Math.PI * d / 8);
      const weight = sinc * window;
      taps.push([k, weight]); sum += weight;
    }
    return taps.map(([k, weight]) => [k, weight / sum]);
  });
  for (const c of channels) for (let i = 0; i < c.length - 1; i++) for (const filter of filters) {
    let v = 0;
    for (const [k, weight] of filter) if (i + k >= 0 && i + k < c.length) v += c[i + k] * weight;
    peak = Math.max(peak, Math.abs(v));
  }
  return peak;
}
export function synthesize(recipe) {
  const frames = Math.round(recipe.duration * RATE);
  const center = new Float64Array(frames);
  recipe.layers.forEach((layer, index) => {
    const signal = synthLayer(layer, frames, (recipe.seed + Math.imul(index + 1, 0x9e3779b1)) >>> 0);
    for (let i = 0; i < frames; i++) center[i] += signal[i];
  });
  // Gentle body saturation, then low-pass cleanup below Nyquist; no hard limiter.
  for (let i = 0; i < frames; i++) center[i] = Math.tanh(center[i] * 1.08) / 1.08;
  const clean = biquad(center, 'lowpass', 6700);
  const channels = stereoSpace(clean, recipe.space).map(dcAndEdges);
  const rawPeak = reconstructedPeak(channels);
  invariant(rawPeak > 0, `${recipe.id}: empty synthesis`);
  const gain = NORMALIZE_TO / rawPeak;
  for (const c of channels) for (let i = 0; i < c.length; i++) c[i] *= gain;
  return channels;
}
function encodeWav(channels, seed) {
  const frames = channels[0].length;
  invariant(channels.every(c => c.length === frames), 'Channel frame mismatch');
  const bytes = Buffer.alloc(44 + frames * CHANNELS * 3);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(CHANNELS, 22); bytes.writeUInt32LE(RATE, 24);
  bytes.writeUInt32LE(RATE * CHANNELS * 3, 28); bytes.writeUInt16LE(CHANNELS * 3, 32);
  bytes.writeUInt16LE(BITS, 34); bytes.write('data', 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  const rng = random(seed ^ 0xa739cd41);
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < CHANNELS; ch++) {
    const v = channels[ch][i];
    // Deterministic TPDF dither where active, while exact zero edges stay silent.
    const dither = i > 0 && i < frames - 1 && Math.abs(v) > 1 / FULL_SCALE ? rng() - rng() : 0;
    const integer = Math.round(v * FULL_SCALE + dither);
    invariant(integer >= -8_388_608 && integer <= FULL_SCALE, 'PCM overflow');
    bytes.writeIntLE(integer, 44 + (i * CHANNELS + ch) * 3, 3);
  }
  return bytes;
}
function decodeWav(bytes) {
  invariant(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', 'Invalid WAV header');
  invariant(bytes.readUInt32LE(4) === bytes.length - 8, 'RIFF size mismatch');
  invariant(bytes.toString('ascii', 12, 16) === 'fmt ' && bytes.readUInt32LE(16) === 16, 'Unexpected fmt layout');
  invariant(bytes.readUInt16LE(20) === 1 && bytes.readUInt16LE(22) === 2, 'Expected stereo integer PCM');
  invariant(bytes.readUInt32LE(24) === RATE && bytes.readUInt16LE(34) === BITS, 'Expected 48kHz/24-bit');
  invariant(bytes.readUInt32LE(28) === RATE * 6 && bytes.readUInt16LE(32) === 6, 'WAV rate/alignment mismatch');
  invariant(bytes.toString('ascii', 36, 40) === 'data' && bytes.readUInt32LE(40) === bytes.length - 44, 'Invalid data chunk');
  const frames = (bytes.length - 44) / 6;
  invariant(Number.isInteger(frames) && frames > 0, 'Invalid frame count');
  const channels = [new Float64Array(frames), new Float64Array(frames)];
  for (let i = 0; i < frames; i++) for (let ch = 0; ch < 2; ch++) {
    channels[ch][i] = bytes.readIntLE(44 + (i * 2 + ch) * 3, 3) / FULL_SCALE;
  }
  return channels;
}
const db = amplitude => 20 * Math.log10(Math.max(amplitude, 1e-15));
const fixed = value => Number(value.toFixed(6));
function energy(values) { let sum = 0; for (const v of values) sum += v * v; return sum; }
function phoneBandFftRatio(mono) {
  // Full-file rectangular FFT, zero-padded to a power of two. File-edge fades
  // are already in the PCM. One-sided power doubles all non-DC/Nyquist bins.
  let size = 1;
  while (size < mono.length) size *= 2;
  const real = new Float64Array(size), imaginary = new Float64Array(size);
  real.set(mono);
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let span = 2; span <= size; span *= 2) {
    const half = span / 2, angle = -TAU / span;
    const stepR = Math.cos(angle), stepI = Math.sin(angle);
    for (let base = 0; base < size; base += span) {
      let wr = 1, wi = 0;
      for (let offset = 0; offset < half; offset++) {
        const a = base + offset, b = a + half;
        const tr = wr * real[b] - wi * imaginary[b];
        const ti = wr * imaginary[b] + wi * real[b];
        real[b] = real[a] - tr; imaginary[b] = imaginary[a] - ti;
        real[a] += tr; imaginary[a] += ti;
        const nextR = wr * stepR - wi * stepI;
        wi = wr * stepI + wi * stepR; wr = nextR;
      }
    }
  }
  let all = 0, band = 0;
  for (let k = 0; k <= size / 2; k++) {
    const power = (real[k] ** 2 + imaginary[k] ** 2) * (k === 0 || k === size / 2 ? 1 : 2);
    all += power;
    const frequency = k * RATE / size;
    if (frequency >= 300 && frequency <= 3400) band += power;
  }
  return band / all;
}
function measure(bytes, recipe) {
  const channels = decodeWav(bytes);
  invariant(channels[0].length === Math.round(recipe.duration * RATE), `${recipe.id}: wrong duration`);
  const mono = new Float64Array(channels[0].length);
  let leftMean = 0, rightMean = 0, product = 0, maxStep = 0;
  for (let i = 0; i < mono.length; i++) {
    const [l, r] = [channels[0][i], channels[1][i]];
    invariant(Number.isFinite(l) && Number.isFinite(r), 'Non-finite decoded sample');
    mono[i] = (l + r) / 2; leftMean += l; rightMean += r; product += l * r;
    if (i > 0) maxStep = Math.max(maxStep, Math.abs(l - channels[0][i - 1]), Math.abs(r - channels[1][i - 1]));
  }
  const leftE = energy(channels[0]), rightE = energy(channels[1]);
  const stereoRms = Math.sqrt((leftE + rightE) / (mono.length * 2));
  const monoRms = Math.sqrt(energy(mono) / mono.length);
  const body = biquad(biquad(mono, 'highpass', 140), 'lowpass', 450);
  const totalE = energy(mono);
  const edgesZero = channels.every(c => c[0] === 0 && c[c.length - 1] === 0);
  const peak = samplePeak(channels);
  const oversampled = reconstructedPeak(channels);
  const monoLossDb = db(monoRms / stereoRms);
  const correlation = product / Math.sqrt(leftE * rightE);
  const maxDc = Math.max(Math.abs(leftMean / mono.length), Math.abs(rightMean / mono.length));
  const trailingFrames = Math.min(Math.round(0.005 * RATE), mono.length);
  const trailingRms = Math.sqrt(energy(mono.subarray(mono.length - trailingFrames)) / trailingFrames);
  const phoneBandRatio = phoneBandFftRatio(mono);
  invariant(db(peak) <= CEILING_DBFS, `${recipe.id}: peak exceeds -6dBFS`);
  invariant(db(oversampled) <= CEILING_DBFS, `${recipe.id}: reconstructed peak exceeds -6dBFS`);
  invariant(edgesZero && db(trailingRms) < -55, `${recipe.id}: unclean edge`);
  invariant(monoLossDb > -1 && correlation > 0.90, `${recipe.id}: mono cancellation`);
  invariant(maxDc < 0.001, `${recipe.id}: excess DC`);
  invariant(stereoRms > 0.005, `${recipe.id}: unexpectedly empty sound`);
  if (['product-weight', 'sphere-reveal', 'logo-resolve'].includes(recipe.id)) {
    invariant(phoneBandRatio >= 0.15, `${recipe.id}: 300-3400Hz FFT phone proxy below 15%`);
  }
  return {
    frames: mono.length, durationSeconds: fixed(mono.length / RATE), finiteSamples: true,
    samplePeakDbfs: fixed(db(peak)), reconstructed4xPeakEstimateDbfs: fixed(db(oversampled)),
    stereoRmsDbfs: fixed(db(stereoRms)), monoRmsDbfs: fixed(db(monoRms)),
    monoFoldDownLossDb: fixed(monoLossDb), stereoCorrelation: fixed(correlation),
    monoSamplePeakDbfs: fixed(db(samplePeak([mono]))), maximumAbsoluteDc: fixed(maxDc),
    edgesExactlyZero: edgesZero, final5msRmsDbfs: fixed(db(trailingRms)),
    maximumAdjacentSampleStep: fixed(maxStep),
    phoneBody140to450HzFilteredEnergyRatio: fixed(energy(body) / totalE),
    phoneAuditionProxy300to3400HzFftEnergyRatio: fixed(phoneBandRatio),
    qcPass: true,
  };
}
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function localFfmpeg(explicit) {
  const root = path.resolve(HERE, '../../../..');
  const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = explicit ? [path.resolve(explicit)] : [
    path.join(root, 'node_modules/ffmpeg-static', binary),
    path.resolve(root, '../../../node_modules/ffmpeg-static', binary),
  ];
  const found = candidates.find(existsSync);
  invariant(found, 'Installed FFmpeg is missing; use --ffmpeg <existing-executable>. No installation or download is performed.');
  return found;
}
function strictDecode(ffmpeg, file) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-xerror', '-i', file, '-map', '0:a:0', '-f', 'null', '-'], {
    encoding: 'utf8', windowsHide: true, shell: false,
  });
  invariant(!result.error && result.status === 0, `FFmpeg strict decode failed for ${path.basename(file)}: ${result.error?.message ?? result.stderr}`);
  return true;
}
function manifestEntry(recipe, bytes, measurements) {
  return {
    id: recipe.id, file: `${recipe.id}.wav`, character: recipe.character,
    seed: recipe.seed, seedHex: `0x${recipe.seed.toString(16).padStart(8, '0')}`,
    durationSeconds: measurements.durationSeconds, syncSeconds: recipe.sync,
    syncSample: Math.round(recipe.sync * RATE),
    syncMeaning: recipe.id === 'hero-sweep' || recipe.id === 'pivot-suction' ? 'Arrival/catch onset after the pre-roll sweep.' : 'Primary object/action onset; envelope peak follows by a few milliseconds.',
    sha256: sha(bytes), bytes: bytes.length,
    measurements, sourceRecipe: recipe,
  };
}
function checkManifest(saved, directory = OUTPUT) {
  invariant(saved.schemaVersion === 1 && saved.sounds.length === RECIPES.length, 'Manifest pilot count/schema mismatch');
  invariant(saved.source.sha256 === sha(readFileSync(fileURLToPath(import.meta.url))), 'Builder source SHA mismatch');
  const identities = new Set();
  for (const recipe of RECIPES) {
    const entry = saved.sounds.find(sound => sound.id === recipe.id);
    invariant(entry && entry.file === `${recipe.id}.wav` && entry.syncSeconds === recipe.sync && entry.seed === recipe.seed, `${recipe.id}: manifest recipe mismatch`);
    const bytes = readFileSync(path.join(directory, entry.file));
    invariant(sha(bytes) === entry.sha256 && bytes.length === entry.bytes, `${recipe.id}: file integrity mismatch`);
    invariant(!identities.has(entry.sha256), 'Duplicate pilot sound'); identities.add(entry.sha256);
    const metrics = measure(bytes, recipe);
    invariant(JSON.stringify(metrics) === JSON.stringify(entry.measurements), `${recipe.id}: stored metrics differ from actual PCM`);
    invariant(JSON.stringify(entry.sourceRecipe) === JSON.stringify(recipe), `${recipe.id}: source recipe differs`);
  }
}
function withoutExternalMarkers(manifest) {
  const copy = structuredClone(manifest);
  for (const entry of copy.sounds) delete entry.measurements.ffmpegStrictDecode;
  return copy;
}
function packSnapshot() {
  if (!existsSync(OUTPUT)) return null;
  return [...RECIPES.map(recipe => `${recipe.id}.wav`), 'manifest.json'].map(file => {
    const target = path.join(OUTPUT, file);
    if (!existsSync(target)) return { file, missing: true };
    const stat = statSync(target, { bigint: true });
    return { file, sha256: sha(readFileSync(target)), bytes: stat.size.toString(), mtimeNs: stat.mtimeNs.toString() };
  });
}
function removeCandidateDirectory(directory) {
  const resolved = path.resolve(directory);
  invariant(path.dirname(resolved) === HERE && path.basename(resolved).startsWith('.pilot-candidate-'), 'Unsafe candidate cleanup target');
  // Only this builder's verified absolute, same-directory candidate/backup.
  // Never recursively remove the release pilot directory.
  rmSync(resolved, { recursive: true, force: true });
}
function createManifest(generated) {
  return {
    schemaVersion: 1, status: 'eight-sound-original-DSP-pilot', soundCount: RECIPES.length,
    proposedFullLibraryCount: 24, completeFullLibrary: false,
    format: { container: 'WAV', encoding: 'PCM signed 24-bit little-endian', sampleRateHz: RATE, channels: CHANNELS, bitsPerSample: BITS },
    source: { file: '../build-pilot.mjs', sha256: sha(readFileSync(fileURLToPath(import.meta.url))), version: '1.1.0', runtime: 'Node.js built-ins only for synthesis; existing local FFmpeg for strict decode' },
    provenance: { method: 'Original procedural DSP', inputSamples: [], downloads: false, networkCalls: 0, paidAiCalls: 0, credentialReads: 0, speech: false, score: false, seeds: 'Distinct per sound, with deterministic per-layer PRNG and 24-bit TPDF dither.' },
    mastering: { samplePeakCeilingDbfs: CEILING_DBFS, reconstructionMethod: '4x Lanczos-8 local QC estimate; not certified ITU true peak', centeredBody: true, stereoTail: 'Mild upper-only feed-forward early reflections; positive polarity, no sub widening', fades: { fileStartMs: 3, fileEndMs: 9 }, dcHighPassHz: 24 },
    phoneProxy: { method: 'Entire mono PCM, rectangular FFT zero-padded to next power of two; one-sided power, double non-DC/Nyquist bins; inclusive300-3400Hz / all bins.', revisedSoundIds: ['product-weight', 'sphere-reveal', 'logo-resolve'], revisedMinimumEnergyRatio: 0.15, limitation: 'Frequency-energy proxy only; no hearing, premium-quality or physical-speaker claim.' },
    promotion: { method: 'Stage all eight WAVs and manifest; validate PCM, SHA and strict decode for every candidate; then replace the directory with rollback on promotion failure.', preservesPriorPackOnFailedValidation: true },
    limitations: [
      'Peak, RMS, band energy, strict decode and mono checks do not establish subjective premium sound quality.',
      'Audition in context with approved VO/music and on physical phone speakers; this pilot is not a listening pass.',
      'Phone-body filtered and FFT energy ratios are signal proxies, not physical speaker or perceptual tests.',
      'These eight originals do not complete the proposed 24-sound library.',
    ],
    sounds: generated.map(item => item.entry),
  };
}
function stagePack(ffmpeg, failureMode) {
  const generated = RECIPES.map(recipe => {
    const bytes = encodeWav(synthesize(recipe), recipe.seed);
    const measurements = measure(bytes, recipe);
    return { recipe, bytes, entry: manifestEntry(recipe, bytes, measurements) };
  });
  const candidate = mkdtempSync(path.join(HERE, '.pilot-candidate-'));
  try {
    for (const { recipe, bytes } of generated) writeFileSync(path.join(candidate, `${recipe.id}.wav`), bytes);
    if (failureMode === 'decode') {
      // Only an isolated candidate is corrupted. Seven valid candidates decode
      // before the final malformed WAV proves late validation cannot promote.
      writeFileSync(path.join(candidate, `${RECIPES.at(-1).id}.wav`), Buffer.from('Malformed candidate fixture; not an audio file.'));
    }
    for (const { recipe, entry } of generated) {
      entry.measurements.ffmpegStrictDecode = strictDecode(ffmpeg, path.join(candidate, `${recipe.id}.wav`));
    }
    const manifest = createManifest(generated);
    writeFileSync(path.join(candidate, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    checkManifest(withoutExternalMarkers(manifest), candidate);
    return candidate;
  } catch (error) {
    removeCandidateDirectory(candidate);
    throw error;
  }
}
function buildPack(ffmpeg, failureMode) {
  const before = packSnapshot();
  const candidate = stagePack(ffmpeg, failureMode);
  const backup = `${candidate}.previous`;
  try {
    invariant(JSON.stringify(packSnapshot()) === JSON.stringify(before), 'Existing pilot changed during synthesis; candidate is not promoted');
    const hadPriorPack = existsSync(OUTPUT);
    if (hadPriorPack) renameSync(OUTPUT, backup);
    try {
      if (failureMode === 'promotion') throw new Error('Injected promotion-boundary failure');
      renameSync(candidate, OUTPUT);
    } catch (error) {
      if (hadPriorPack) renameSync(backup, OUTPUT);
      throw error;
    }
    // The validated new pack is now installed. Cleanup failure preserves a
    // recoverable backup instead of reporting a false failed promotion.
    if (hadPriorPack) {
      try { removeCandidateDirectory(backup); }
      catch (error) { console.warn(`Validated pack installed; old backup retained: ${error.message}`); }
    }
  } finally {
    if (existsSync(candidate)) removeCandidateDirectory(candidate);
  }
}
function testPromotionFailures(ffmpeg) {
  invariant(existsSync(path.join(OUTPUT, 'manifest.json')), 'Build a complete pilot before running failure controls');
  const before = packSnapshot();
  for (const mode of ['decode', 'promotion']) {
    let rejected = false;
    try { buildPack(ffmpeg, mode); }
    catch (error) {
      const expected = mode === 'decode' ? 'FFmpeg strict decode failed for micro-select.wav' : 'Injected promotion-boundary failure';
      invariant(error.message.includes(expected), `Unexpected ${mode} control failure: ${error.message}`);
      rejected = true;
    }
    invariant(rejected, `${mode} negative control was not rejected`);
    invariant(JSON.stringify(packSnapshot()) === JSON.stringify(before), `${mode} failure mutated prior WAV/manifest SHA, size or mtime`);
    console.log(`NEGATIVE CONTROL PASS: ${mode} failure rejected; all eight prior WAVs and manifest SHA/bytes/mtime unchanged.`);
  }
}
export function main(args = process.argv.slice(2)) {
  const verify = args.includes('--verify');
  const failureTest = args.includes('--test-promotion-failure');
  if (args.includes('--help')) {
    console.log('Local original SFX: node build-pilot.mjs [--verify | --test-promotion-failure] [--ffmpeg <existing-executable>]');
    return;
  }
  const ffIndex = args.indexOf('--ffmpeg');
  const allowed = new Set(['--verify', '--test-promotion-failure', '--ffmpeg']);
  args.forEach((argument, i) => invariant(allowed.has(argument) || i === ffIndex + 1 && ffIndex >= 0, `Unknown argument: ${argument}`));
  invariant(ffIndex < 0 || args[ffIndex + 1] && !args[ffIndex + 1].startsWith('--'), '--ffmpeg requires an existing executable path');
  const ffmpeg = localFfmpeg(ffIndex >= 0 ? args[ffIndex + 1] : undefined);
  if (failureTest) testPromotionFailures(ffmpeg);
  else if (!verify) buildPack(ffmpeg);
  const saved = JSON.parse(readFileSync(path.join(OUTPUT, 'manifest.json'), 'utf8'));
  // Strict-decode marker belongs to the external check; PCM measurements exclude it.
  checkManifest(withoutExternalMarkers(saved));
  for (const entry of saved.sounds) {
    strictDecode(ffmpeg, path.join(OUTPUT, entry.file));
    console.log(`${entry.id}: ${entry.durationSeconds.toFixed(3)}s, sync ${entry.syncSeconds.toFixed(3)}s, peak ${entry.measurements.samplePeakDbfs.toFixed(2)}dBFS, RMS ${entry.measurements.stereoRmsDbfs.toFixed(2)}dBFS, mono loss ${entry.measurements.monoFoldDownLossDb.toFixed(3)}dB; PASS`);
  }
  console.log(`PASS: ${saved.sounds.length} original stereo 48kHz/24-bit WAVs, SHA/PCM/edges/mono/strict-decode checks. ${verify || failureTest ? 'Verified existing output.' : 'Built and promoted validated candidates locally.'}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
