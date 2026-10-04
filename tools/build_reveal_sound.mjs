import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Original procedural sound bed: no samples, provider calls, or licensed music.
const output = resolve(process.argv[2] ?? 'assets/blender-reveal/sound.wav');
const rate = 48000;
const duration = 6;
const count = rate * duration;
const channels = [new Float64Array(count), new Float64Array(count)];
let seed = 3102026;
let noiseLow = 0;
let peak = 0;
const pulse = (t, center, width) => Math.exp(-(((t - center) / width) ** 2));
for (let i = 0; i < count; i++) {
  const t = i / rate;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const noise = seed / 2147483648 - 1;
  noiseLow = noiseLow * 0.94 + noise * 0.06;
  const fade = Math.min(1, t / 0.35, (duration - t) / 0.6);
  const low = 0.16 * Math.sin(2 * Math.PI * 48 * t) * (0.45 + pulse(t, 2.6, 1.5));
  const air = (noise - noiseLow) * (0.018 + 0.11 * pulse(t, 1.6, 0.48) + 0.065 * pulse(t, 3.5, 0.65));
  const hitTime = Math.max(0, t - 4.35);
  const ring = t < 4.35 ? 0 : Math.exp(-hitTime * 2.1) * (
    0.055 * Math.sin(2 * Math.PI * 448 * hitTime) +
    0.025 * Math.sin(2 * Math.PI * 672 * hitTime) +
    0.015 * Math.sin(2 * Math.PI * 896 * hitTime)
  );
  const pan = 0.15 * Math.sin(t * 0.65);
  channels[0][i] = fade * (low + ring + air * (1 - pan));
  channels[1][i] = fade * (low + ring + air * (1 + pan));
  peak = Math.max(peak, Math.abs(channels[0][i]), Math.abs(channels[1][i]));
}
const gain = Math.pow(10, -4.5 / 20) / peak;
const bytes = count * 2 * 2;
const wav = Buffer.alloc(44 + bytes);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + bytes, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(bytes, 40);
for (let i = 0; i < count; i++) {
  wav.writeInt16LE(Math.round(channels[0][i] * gain * 32767), 44 + i * 4);
  wav.writeInt16LE(Math.round(channels[1][i] * gain * 32767), 46 + i * 4);
}
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, wav);
console.log(JSON.stringify({ output, duration, rate, channels: 2, samplePeakDbfs: -4.5, source: 'original deterministic synthesis' }));
