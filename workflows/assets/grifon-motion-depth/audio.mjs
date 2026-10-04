import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const directory = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'audio-manifest.json'), 'utf8'));
const rate = manifest.sampleRate;
const count = Math.round(manifest.durationSeconds * rate);
const tau = Math.PI * 2;
const music = [new Float64Array(count), new Float64Array(count)];
const effects = [new Float64Array(count), new Float64Array(count)];
const events = [];
let seed = manifest.seed >>> 0;

if (rate !== 48000 || manifest.channels !== 2 || manifest.durationSeconds !== 8) {
  throw new Error('This prototype requires exactly 8 seconds of stereo 48 kHz audio.');
}

function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296 * 2 - 1;
}

const note = midi => 440 * 2 ** ((midi - 69) / 12);
const attack = (t, seconds) => 1 - Math.exp(-t / seconds);
const softEnd = (t, duration, seconds = 0.03) => Math.min(1, Math.max(0, (duration - t) / seconds));
const db = value => value > 0 ? 20 * Math.log10(value) : null;

function add(bus, event, synth, room = 0) {
  const start = Math.round(event.at * rate);
  const length = Math.min(Math.round(event.duration * rate), count - start);
  if (start < 0 || length < 1 || !Number.isFinite(event.gain)) throw new Error('Invalid audio event.');
  let peak = 0;
  let sumSquares = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / rate;
    const pan = (event.pan ?? 0) + ((event.endPan ?? event.pan ?? 0) - (event.pan ?? 0)) * index / length;
    const sample = synth(t, index) * event.gain * softEnd(t, event.duration);
    if (!Number.isFinite(sample)) throw new Error(`Non-finite sample in ${event.kind}.`);
    peak = Math.max(peak, Math.abs(sample));
    sumSquares += sample * sample;
    const left = Math.cos((pan + 1) * Math.PI / 4);
    const right = Math.sin((pan + 1) * Math.PI / 4);
    bus[0][start + index] += sample * left;
    bus[1][start + index] += sample * right;
    if (room) {
      // Small cross delays create space without obscuring contacts.
      for (const [delay, amount] of [[0.043, 0.13], [0.087, 0.08], [0.149, 0.045]]) {
        const target = start + index + Math.round(delay * rate);
        if (target < count) {
          bus[0][target] += sample * right * amount * room;
          bus[1][target] += sample * left * amount * room;
        }
      }
    }
  }
  events.push({
    ...event,
    startFrame: Math.round(event.at * 30),
    beat: Number((event.at * manifest.bpm / 60).toFixed(3)),
    measuredPreMasterPeakDbfs: db(peak),
    measuredPreMasterRmsDbfs: db(Math.sqrt(sumSquares / length)),
  });
}

function filteredNoise(cutoff) {
  let low = 0;
  let slow = 0;
  return frequency => {
    const alpha = 1 - Math.exp(-tau * (frequency ?? cutoff) / rate);
    low += alpha * (random() - low);
    slow += (1 - Math.exp(-tau * 110 / rate)) * (low - slow);
    return low - slow;
  };
}

function mallet(event) {
  const frequency = note(event.midi);
  const drift = random() * 0.003;
  add(music, { ...event, kind: 'music-mallet' }, t => {
    const body = Math.sin(tau * frequency * t + 0.26 * Math.sin(tau * frequency * 2 * t) * Math.exp(-t * 15));
    const wood = 0.24 * Math.sin(tau * frequency * 3.98 * t) * Math.exp(-t * 13);
    const upper = 0.12 * Math.sin(tau * frequency * 7.03 * t) * Math.exp(-t * 22);
    const width = 0.18 * Math.sin(tau * frequency * (1 + drift) * t);
    return (body + wood + upper + width) * attack(t, 0.0035) * Math.exp(-t * 4.6);
  }, 1);
}

for (const at of manifest.music.kickTimes) {
  add(music, { at, duration: 0.26, gain: at < 2.5 ? 0.29 : 0.32, pan: 0, kind: 'music-kick' }, t => {
    const phase = tau * (47 * t + 30 * 0.025 * (1 - Math.exp(-t / 0.025)));
    return Math.sin(phase) * attack(t, 0.001) * Math.exp(-t * 16)
      + 0.09 * Math.sin(tau * 930 * t) * attack(t, 0.0005) * Math.exp(-t * 260);
  });
}

for (const at of manifest.music.clapTimes) {
  const noise = filteredNoise(2100);
  add(music, { at, duration: 0.14, gain: 0.085, pan: -0.08, kind: 'music-soft-clap' }, t => {
    const taps = Math.exp(-t * 40) + (t > 0.012 ? 0.8 * Math.exp(-(t - 0.012) * 65) : 0);
    return noise() * taps * attack(t, 0.001);
  }, 0.3);
}

for (let index = 0; index < manifest.music.hatTimes.length; index += 1) {
  const at = manifest.music.hatTimes[index];
  const noise = filteredNoise(4300);
  add(music, { at, duration: 0.075, gain: index % 2 ? 0.04 : 0.055, pan: index % 2 ? 0.35 : -0.35, kind: 'music-shaker' }, t => {
    return noise() * attack(t, 0.002) * Math.exp(-t * 75);
  });
}

for (const event of manifest.music.bass) {
  const frequency = note(event.midi);
  add(music, { ...event, kind: 'music-bass', pan: 0 }, t => {
    return (Math.sin(tau * frequency * t) + 0.18 * Math.sin(tau * frequency * 2 * t))
      * attack(t, 0.012) * Math.exp(-t * (event.at === 6 ? 1.6 : 5.3));
  });
}

for (const event of manifest.music.mallets) mallet(event);

for (const event of manifest.music.pads) {
  for (let index = 0; index < event.midis.length; index += 1) {
    const frequency = note(event.midis[index]);
    const pan = (index / (event.midis.length - 1) - 0.5) * 1.1;
    add(music, { ...event, pan, kind: 'music-pad' }, t => {
      const envelope = Math.sin(Math.PI * t / event.duration) ** 1.1;
      return (Math.sin(tau * frequency * t) + 0.35 * Math.sin(tau * frequency * 1.004 * t)
        + 0.14 * Math.sin(tau * frequency * 2 * t)) * envelope;
    }, 0.5);
  }
}

for (const event of [...manifest.cameraEvents, ...manifest.sfxEvents]) {
  if (['camera-air', 'assembly-air', 'riser'].includes(event.kind)) {
    const noise = filteredNoise(1700);
    add(effects, event, t => {
      const position = t / event.duration;
      const curve = Math.sin(Math.PI * position) ** (event.kind === 'riser' ? 0.75 : 1.8);
      const cutoff = event.kind === 'riser' ? 450 + 2300 * position ** 1.8 : 650 + 1550 * Math.sin(Math.PI * position);
      const air = noise(cutoff) * 0.68;
      const low = event.kind === 'riser' ? 0.065 * Math.sin(tau * (80 * t + 65 * t * t)) : 0;
      return (air + low) * curve;
    }, 0.55);
  } else if (event.kind === 'metal') {
    add(effects, event, t => {
      let value = 0;
      for (const [frequency, gain, decay] of [[210, 0.63, 17], [527, 0.36, 10], [1127, 0.2, 14], [1923, 0.075, 26]]) {
        value += Math.sin(tau * frequency * t) * gain * Math.exp(-t * decay);
      }
      return value * attack(t, 0.0008);
    }, 0.55);
  } else if (event.kind === 'ceramic') {
    const noise = filteredNoise(1150);
    add(effects, event, t => {
      return (Math.sin(tau * 286 * t) * 0.63 * Math.exp(-t * 36)
        + Math.sin(tau * 593 * t) * 0.34 * Math.exp(-t * 42)
        + noise() * 0.18 * Math.exp(-t * 160)) * attack(t, 0.0008);
    }, 0.2);
  } else if (event.kind === 'glass') {
    add(effects, event, t => {
      return (Math.sin(tau * 880 * t) * 0.44 * Math.exp(-t * 10)
        + Math.sin(tau * 1321 * t) * 0.28 * Math.exp(-t * 12)
        + Math.sin(tau * 1977 * t) * 0.08 * Math.exp(-t * 22)
        + Math.sin(tau * 392 * t) * 0.21 * Math.exp(-t * 16)) * attack(t, 0.0007);
    }, 0.85);
  } else if (event.kind === 'wire') {
    const noise = filteredNoise(3000);
    add(effects, event, t => {
      const ratchet = Math.exp(-t * 78) * (0.45 + 0.55 * Math.cos(tau * 85 * t) ** 8);
      return noise() * ratchet * 0.52 + Math.sin(tau * 587.33 * t) * Math.exp(-t * 39) * attack(t, 0.001) * 0.32;
    }, 0.4);
  } else if (event.kind === 'type-land') {
    const noise = filteredNoise(1800);
    add(effects, event, t => {
      const frequency = event.frequency;
      return (Math.sin(tau * (frequency * t + 16 * 0.018 * (1 - Math.exp(-t / 0.018)))) * Math.exp(-t * 29) * 0.72
        + Math.sin(tau * frequency * 3.03 * t) * Math.exp(-t * 44) * 0.14
        + noise() * Math.exp(-t * 120) * 0.26) * attack(t, 0.0007);
    }, 0.45);
  } else if (event.kind === 'settle') {
    add(effects, event, t => {
      return (Math.sin(tau * 660 * t) * Math.exp(-t * 42) * 0.22
        + Math.sin(tau * 146.83 * t) * Math.exp(-t * 24) * 0.4) * attack(t, 0.001);
    }, 0.6);
  } else if (event.kind === 'logo') {
    add(effects, event, t => {
      const body = Math.sin(tau * 58.27 * t) * Math.exp(-t * 8) * 0.48;
      const bloom = (Math.sin(tau * 293.66 * t) * 0.18 + Math.sin(tau * 440 * t) * 0.12
        + Math.sin(tau * 698.46 * t) * 0.09) * attack(t, 0.05) * Math.exp(-t * 2.5);
      return body * attack(t, 0.002) + bloom;
    }, 1);
  } else {
    throw new Error(`Unknown SFX kind: ${event.kind}`);
  }
}

const mix = [new Float64Array(count), new Float64Array(count)];
let rawPeak = 0;
for (let channel = 0; channel < 2; channel += 1) {
  let previousInput = 0;
  let previousOutput = 0;
  for (let index = 0; index < count; index += 1) {
    const t = index / rate;
    const musicDuck = manifest.sfxEvents.reduce((gain, event) => {
      const elapsed = t - event.at;
      return elapsed >= 0 && elapsed < 0.18 ? Math.min(gain, 0.74 + elapsed / 0.18 * 0.26) : gain;
    }, 1);
    const value = music[channel][index] * manifest.musicGain * musicDuck + effects[channel][index] * manifest.sfxGain;
    const dcBlocked = value - previousInput + 0.997 * previousOutput;
    previousInput = value;
    previousOutput = dcBlocked;
    const endingFade = t <= 7.75 ? 1 : Math.cos(Math.PI / 2 * Math.min(1, (t - 7.75) / 0.25)) ** 2;
    mix[channel][index] = dcBlocked * Math.min(1, t / 0.006) * endingFade;
    rawPeak = Math.max(rawPeak, Math.abs(mix[channel][index]));
  }
}

const masterGain = 10 ** (manifest.masterPeakDbfs / 20) / rawPeak;
const pcm = Buffer.alloc(count * 2 * 2);
let peak = 0;
let sumSquares = 0;
let clippedSamples = 0;
let stereoDifferenceSquares = 0;
const windows = [];
for (let index = 0; index < count; index += 1) {
  const values = [];
  for (let channel = 0; channel < 2; channel += 1) {
    const value = mix[channel][index] * masterGain;
    if (Math.abs(value) >= 1) clippedSamples += 1;
    const quantized = Math.round(value * 32767);
    pcm.writeInt16LE(quantized, (index * 2 + channel) * 2);
    const written = quantized / 32767;
    values.push(written);
    peak = Math.max(peak, Math.abs(written));
    sumSquares += written * written;
  }
  stereoDifferenceSquares += (values[0] - values[1]) ** 2;
}
for (let start = 0; start < count; start += rate / 2) {
  let energy = 0;
  for (let index = start; index < Math.min(count, start + rate / 2); index += 1) {
    energy += (pcm.readInt16LE(index * 4) / 32767) ** 2 + (pcm.readInt16LE(index * 4 + 2) / 32767) ** 2;
  }
  windows.push({ at: start / rate, rmsDbfs: db(Math.sqrt(energy / rate)) });
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(rate, 24);
header.writeUInt32LE(rate * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);
const wave = Buffer.concat([header, pcm]);
const output = path.join(directory, 'audio');
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, 'score.wav'), wave);
const evidence = {
  source: manifest.source,
  command: 'node workflows/assets/grifon-motion-depth/audio.mjs',
  durationSeconds: count / rate,
  sampleRate: rate,
  channels: 2,
  pcmBits: 16,
  frameCountAt30Fps: manifest.durationSeconds * 30,
  seed: manifest.seed,
  sha256: crypto.createHash('sha256').update(wave).digest('hex'),
  bytes: wave.length,
  masterGainDb: db(masterGain),
  samplePeakDbfs: db(peak),
  rmsDbfs: db(Math.sqrt(sumSquares / (count * 2))),
  clippedSamples,
  stereoDifferenceRmsDbfs: db(Math.sqrt(stereoDifferenceSquares / count)),
  eventCount: events.length,
  sfxEventCount: manifest.cameraEvents.length + manifest.sfxEvents.length,
  halfSecondWindows: windows,
  events: events.sort((a, b) => a.at - b.at),
  listeningStatus: manifest.listeningStatus,
  limitation: 'Peak/RMS/event checks are objective only. Integrated LUFS/true peak require independent FFmpeg measurement; perceived timbre, musical quality, and synchronization to the rendered picture require listening.',
};
fs.writeFileSync(path.join(output, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
if (clippedSamples || evidence.sfxEventCount !== 13 || !events.every(event => event.measuredPreMasterRmsDbfs !== null)) {
  throw new Error('Audio verification failed.');
}
console.log(JSON.stringify({ output: path.join(output, 'score.wav'), ...evidence, events: undefined, halfSecondWindows: undefined }, null, 2));
