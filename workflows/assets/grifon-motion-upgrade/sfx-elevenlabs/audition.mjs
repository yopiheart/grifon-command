// Local listening worksheet. This does not select winners or promote a final mix.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../../..');
const PRIMARY = 'C:/Users/ADMIN/Desktop/grifon-command';
const FF = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const PROBE = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const STAGE = path.join(ROOT, '.tmp/grifon-sfx-listening-test');
const OUT = path.join(HERE, 'grifon-sfx-listening-test-abcd.mp4');
const SR = 48000, START = 2.5, END = 7.1, GAIN = 1.0752266011723428;
const count = Math.round((END - START) * SR);
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const sha = p => hash(fs.readFileSync(p));
const assert = (p, m) => { if (!p) throw Error(m); };
const db = n => 10 ** (n / 20);
const cosine = x => .5 - .5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
const locks = [
  ['music', '.tmp/grifon-english-vo-v02/music-ducked.wav', '115b8f535a2d51ea9db4114d4a9fcac3fe738f157cf9e32bb7068ed10c5c28fa'],
  ['voice', '.tmp/grifon-english-vo-v02/voice-positioned.wav', '54bcb035d532ef4c9f42a3a4ef9a6321af5382d75a2c4663a963dd8bc36934f7'],
  ['picture', 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-english-vo-1080p.mp4', 'b11bb7c7f572c249b20cb2e767c57b737c947145876f5b3df569be45e944f067'],
  ['timing', 'workflows/assets/grifon-motion-upgrade/voiceover/qa/phrase-timing.json', 'dbad94bae8cdd0af5503e3bc74d3add4cfb9e7cc3189048f989919eefe62b816'],
];
for (const [, p, h] of locks) assert(sha(path.join(ROOT, p)) === h, `Protected input changed: ${p}`);
const files = Object.fromEntries(locks.map(([id, p]) => [id, path.join(ROOT, p)]));
const catalogFile = path.join(HERE, 'history-candidates.json');
assert(sha(catalogFile) === '9a074cb1957d0beaff469a1dff6575e49c7a7c6cbaa4d884eab5b3fe8eb5366a', 'Catalog changed');
const catalog = JSON.parse(fs.readFileSync(catalogFile));
const phrases = JSON.parse(fs.readFileSync(files.timing)).phrases;
function run(exe, args) {
  const r = spawnSync(exe, args.map(String), { cwd: STAGE, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  assert(!r.error && r.status === 0, `${path.basename(exe)} failed: ${r.error?.code ?? r.stderr?.toString().slice(-2500)}`);
  return r;
}
const ff = args => run(FF, ['-hide_banner', '-loglevel', 'error', '-n', ...args]);
function decode(p) {
  const b = ff(['-protocol_whitelist', 'file,pipe', '-f', 'wav', '-i', p, '-map', '0:a:0', '-ar', SR, '-ac', 2, '-f', 'f32le', 'pipe:1']).stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
function wav(p, samples) {
  const b = Buffer.from(samples.buffer), h = Buffer.alloc(44);
  h.write('RIFF'); h.writeUInt32LE(b.length + 36, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 8, 28); h.writeUInt16LE(8, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(b.length, 40);
  fs.writeFileSync(p, Buffer.concat([h, b]), { flag: 'wx' });
}
function maxRms(a) {
  let highest = 0;
  for (let i = 0; i < a.length; i += 1920) {
    let energy = 0; const end = Math.min(i + 1920, a.length);
    for (let j = i; j < end; j++) energy += a[j] ** 2;
    highest = Math.max(highest, Math.sqrt(energy / (end - i)));
  }
  return highest;
}
function duck(t) {
  let g = 1;
  for (const p of phrases) {
    if (t < p.actualStart - .06 || t >= p.actualEnd + .12) continue;
    const x = t < p.actualStart ? (t - p.actualStart + .06) / .06 : t > p.actualEnd ? 1 - (t - p.actualEnd) / .12 : 1;
    g = Math.min(g, 1 + (db(-7) - 1) * cosine(x));
  }
  return g;
}
assert(!fs.existsSync(OUT), 'Audition already exists; never overwrite an existing deliverable');
fs.mkdirSync(STAGE, { recursive: true });
fs.copyFileSync('C:/Windows/Fonts/arialbd.ttf', path.join(STAGE, 'font.ttf'));
const music = decode(files.music), voice = decode(files.voice);
const base = new Float64Array(count * 2);
for (let i = 0; i < base.length; i++) base[i] = (music[Math.round(START * SR) * 2 + i] + voice[Math.round(START * SR) * 2 + i]) * GAIN;
// Previously measured native anchors: signal placement aids, not listening verdicts.
const anchors = { 'rotation-air': [.390, .564, .676, .520], 'camera-contact': [.066, .136, .426, .186], 'phone-contact': [.156, .180, .578, .088] };
const variants = [];
for (let n = 1; n <= 4; n++) {
  const label = 'ABCD'[n - 1], sfx = new Float64Array(count * 2), cues = [];
  function place(family, contact, lead, tail, targetDb) {
    const asset = catalog.candidates.find(a => a.family === family && a.candidate === n);
    const p = path.join(ROOT, asset.path); assert(sha(p) === asset.sha256, 'Native source changed');
    const a = decode(p), anchor = anchors[family][n - 1];
    const begin = Math.round(Math.max(0, anchor - lead) * SR);
    const end = Math.min(a.length / 2, Math.round((anchor + tail) * SR));
    const start = Math.round((contact - START - anchor) * SR) + begin;
    assert(start >= 0 && start + end - begin <= count, 'Cue outside excerpt');
    const trim = a.subarray(begin * 2, end * 2), adjustment = db(targetDb) / maxRms(trim);
    for (let k = 0; k < end - begin; k++) {
      const envelope = cosine(Math.min(k / 144, (end - begin - 1 - k) / 144, 1)) * duck(START + (start + k) / SR);
      for (let ch = 0; ch < 2; ch++) sfx[(start + k) * 2 + ch] += trim[k * 2 + ch] * adjustment * envelope;
    }
    cues.push({ assetId: asset.id, sha256: asset.sha256, sourceIn: begin / SR, sourceOut: end / SR, nativeAnchor: anchor, timelineAnchor: contact, target20msRmsDbfs: targetDb, gainDb: 20 * Math.log10(adjustment) });
  }
  place('rotation-air', 3.22, .55, .48, -24);
  place('camera-contact', 3.82, .035, .25, -19);
  place('rotation-air', 6.24, .55, .48, -24);
  place('phone-contact', 6.84, .035, .24, -19);
  variants.push({ label, nativeCandidate: n, sfx, cues });
}
// One common headroom factor for every variant; never alter the approved stems.
let scale = 1;
for (const v of variants) for (let i = 0; i < base.length; i++) {
  assert(Math.abs(base[i]) < db(-1.8), 'Frozen base exceeds headroom');
  const change = v.sfx[i] * GAIN;
  if (change > 0) scale = Math.min(scale, (db(-1.8) - base[i]) / change);
  else if (change < 0) scale = Math.min(scale, (db(-1.8) + base[i]) / -change);
}
const parts = [];
for (const v of variants) {
  const mix = new Float32Array(base.length);
  for (let i = 0; i < mix.length; i++) { mix[i] = base[i] + v.sfx[i] * GAIN * scale; assert(Number.isFinite(mix[i]), 'Non-finite mix'); }
  wav(path.join(STAGE, `${v.label}.wav`), mix);
  const part = path.join(STAGE, `${v.label}.mp4`);
  ff(['-ss', START, '-i', files.picture, '-i', `${v.label}.wav`, '-filter_complex',
    `[0:v]trim=duration=4.6,setpts=PTS-STARTPTS,drawtext=fontfile=font.ttf:text='SFX TEST ${v.label}':fontsize=38:fontcolor=white:box=1:boxcolor=black@0.75:boxborderw=14:x=40:y=40,tpad=start_duration=1:start_mode=clone[v];[1:a]adelay=1000|1000[a]`,
    '-map', '[v]', '-map', '[a]', '-t', '5.6', '-r', '30', '-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', SR, '-movflags', '+faststart', part]);
  parts.push(`file '${v.label}.mp4'`);
}
fs.writeFileSync(path.join(STAGE, 'parts.txt'), parts.join('\n'), { flag: 'wx' });
ff(['-f', 'concat', '-safe', '1', '-i', 'parts.txt', '-c', 'copy', '-movflags', '+faststart', OUT]);
ff(['-xerror', '-err_detect', 'explode', '-i', OUT, '-f', 'null', '-']);
const info = JSON.parse(run(PROBE, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', OUT]).stdout);
const video = info.streams.find(s => s.codec_type === 'video'), audio = info.streams.find(s => s.codec_type === 'audio');
assert(video.width === 1920 && video.height === 1080 && video.nb_read_frames === '672' && audio.channels === 2, 'Unexpected audition format');
const level = run(FF, ['-hide_banner', '-i', OUT, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const summary = level.slice(level.lastIndexOf('Summary:'));
assert(Number(summary.match(/Peak:\s*(-?[\d.]+) dBFS/)?.[1]) <= -1, 'Encoded peak exceeds -1dBTP');
for (const [, p, h] of locks) assert(sha(path.join(ROOT, p)) === h, 'Protected input changed during audition');
const report = { status: 'LISTENING_TEST_ONLY_NOT_FINAL_SELECTION', providerCalls: 0, newCredits: 0, start: START, end: END, labels: 'A/B/C/D follow native candidates 1/2/3/4; no quality ranking', timing: 'Each variant: 1s labeled hold, then identical 4.6s approved film excerpt', rights: 'Older free-plan sources: private review only', nativeAnchors: 'Signal anchors require listening verification', musicVoiceGain: GAIN, commonSfxHeadroomScale: scale, variants: variants.map(({ sfx, ...v }) => v), output: { path: path.relative(ROOT, OUT).replaceAll('\\', '/'), sha256: sha(OUT), bytes: fs.statSync(OUT).size, frames: video.nb_read_frames, duration: info.format.duration, audioCodec: audio.codec_name, sampleRate: audio.sample_rate }, loudness: summary, auditoryReview: 'Pending user listening; no machine or human verdict claimed' };
fs.writeFileSync(path.join(HERE, 'qa/listening-test.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report.output));
