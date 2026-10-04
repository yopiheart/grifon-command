// Local Hyperframes capture and measured FFmpeg finishing. No providers/install.
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const candidates = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')];
const deps = process.env.MOTION_DEPENDENCY_ROOT || candidates.find(dir => existsSync(path.join(dir, 'node_modules/playwright/package.json')));
if (!deps) throw new Error('Existing desktop Playwright dependencies missing; no automatic install.');
const require = createRequire(path.join(deps, 'package.json'));
const { chromium } = require('playwright');
const cache = process.env.MOTION_NPM_CACHE || path.join(os.homedir(), 'AppData/Local/npm-cache/_npx');
const cached = existsSync(cache) ? readdirSync(cache).map(name => path.join(cache, name, 'node_modules')) : [];
const hf = cached.find(dir => existsSync(path.join(dir, 'hyperframes/package.json')) && JSON.parse(readFileSync(path.join(dir, 'hyperframes/package.json'), 'utf8')).version === '0.7.68');
const cli = process.env.HYPERFRAMES_CLI || (hf && path.join(hf, 'hyperframes/bin/hyperframes.mjs'));
const ffmpeg = process.env.HYPERFRAMES_FFMPEG_PATH || path.join(deps, 'node_modules/ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const probePath = path.join(deps, '.tools/media-runtime/node_modules/ffprobe-static/bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
const probeCache = cached.map(dir => path.join(dir, 'ffprobe-static/bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')).find(existsSync);
const ffprobe = process.env.HYPERFRAMES_FFPROBE_PATH || (existsSync(probePath) ? probePath : probeCache);
const chrome = chromium.executablePath();
const shell = chrome.replace(/chromium-(\d+)/, 'chromium_headless_shell-$1').replace('chrome-win64', 'chrome-headless-shell-win64').replace(/chrome\.exe$/, 'chrome-headless-shell.exe');
const browser = process.env.HYPERFRAMES_BROWSER_PATH || (existsSync(shell) ? shell : chrome);
for (const [name, file] of Object.entries({ cli, ffmpeg, ffprobe, browser })) if (!file || !existsSync(file)) throw new Error(`Missing ${name}; no automatic install/cloud fallback.`);
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY: '1', HYPERFRAMES_BROWSER_PATH: browser, HYPERFRAMES_FFMPEG_PATH: ffmpeg, HYPERFRAMES_FFPROBE_PATH: ffprobe };
const scratch = path.join(root, '.tmp/grifon-motion-upgrade');
const qa = path.join(here, 'qa');
mkdirSync(scratch, { recursive: true });
mkdirSync(qa, { recursive: true });
const silent = path.join(scratch, 'silent.mp4');
const final = path.join(here, 'grifon-full-upgrade-1080p.mp4');
const spec = JSON.parse(readFileSync(path.join(here, 'demo.json'), 'utf8'));
const accepted = path.join(root, spec.baseline);
function run(exe, args, log) {
  const result = spawnSync(exe, args, { cwd: root, env, encoding: 'utf8', windowsHide: true, maxBuffer: 30 * 1024 * 1024 });
  const combined = (result.stdout || '') + (result.stderr || '');
  if (log) writeFileSync(log, combined);
  if (result.error || result.status !== 0) throw new Error(`${path.basename(exe)} failed (${result.status}): ${result.error || combined.slice(-5000)}`);
  return { stdout: result.stdout || '', stderr: result.stderr || '' };
}
function loudness(file) {
  const result = run(ffmpeg, ['-hide_banner', '-i', file, '-vn', '-af', 'loudnorm=I=-15.5:TP=-2:LRA=9:print_format=json', '-f', 'null', '-']);
  const match = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/g);
  if (!match) throw new Error('Missing measured loudness.');
  return JSON.parse(match.at(-1));
}
function verify(file = final) {
  const media = JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
  const video = media.streams.find(s => s.codec_type === 'video');
  const audio = media.streams.find(s => s.codec_type === 'audio');
  if (!video || video.width !== 1920 || video.height !== 1080 || video.r_frame_rate !== '30/1' || Number(video.nb_read_frames) !== 987 || video.pix_fmt !== 'yuv420p' || !audio || audio.codec_name !== 'aac' || audio.sample_rate !== '48000' || audio.channels !== 2 || Math.abs(Number(media.format.duration) - 32.9) > 0.06) throw new Error('Output does not satisfy 1080p/30fps/987 frames/32.9s/stereoAAC48k contract.');
  run(ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  const levels = loudness(file);
  if (!Number.isFinite(Number(levels.input_i)) || Number(levels.input_i) < -18 || Number(levels.input_i) > -13 || !Number.isFinite(Number(levels.input_tp)) || Number(levels.input_tp) > -1) throw new Error(`Encoded mix failed: ${levels.input_i} LUFS, ${levels.input_tp} dBTP`);
  const payload = run(ffmpeg, ['-v', 'error', '-i', file, '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.trim().replace(/^SHA256=/, '');
  if (payload !== spec.acceptedAudioPayloadSha256) throw new Error('The accepted V08 AAC payload changed.');
  writeFileSync(path.join(qa, 'media.json'), JSON.stringify(media, null, 2) + '\n');
  writeFileSync(path.join(qa, 'mix-measurement.json'), JSON.stringify({ integratedLufs: Number(levels.input_i), truePeakDbtp: Number(levels.input_tp), method: 'FFmpeg loudnorm input measurement on encoded AAC; direct listening pending' }, null, 2) + '\n');
  console.log(`PASS: 987 frames / 32.9s / 1920x1080 /30fps/stereo48k; full decode; unchanged accepted AAC; ${levels.input_i} LUFS, ${levels.input_tp} dBTP.`);
}
const task = process.argv[2] || 'check';
if (!['check', 'snapshot', 'render', 'finish', 'verify'].includes(task)) throw new Error('Usage: node render.mjs check|snapshot|render|finish|verify');
if (task === 'check') run(process.execPath, [cli, 'check', here, '--json', '--at', '0.5,1.7,3.7,4.7,6.6,7.8,9.7,11.4,13.5,15.4,19.4,21.8,24.4,27.8,30.6,32.7', '--at-transitions'], path.join(qa, 'hyperframes.json'));
else if (task === 'snapshot') run(process.execPath, [cli, 'snapshot', here, '--at', '0.6,1.7,3.7,4.7,6.6,7.8,9.7,11.4,13.5,15.4,19.4,21.8,24.4,27.8,30.6', '--no-end', '--describe', 'false', '--output', path.join(qa, 'frames')], path.join(scratch, 'snapshot.log'));
else if (task === 'verify') verify();
else {
  if (task === 'render') {
    console.log('Rendering the full upgraded choreography locally: 987 frames, 30fps, two workers.');
    run(process.execPath, [cli, 'render', here, '--fps', '30', '--workers', '2', '--quality', 'high', '--output', silent], path.join(scratch, 'render.log'));
  }
  if (!existsSync(silent)) throw new Error('Silent render missing; run render first.');
  if (!existsSync(accepted)) throw new Error('Accepted V08 export missing; never substitute another soundtrack.');
  const candidate = path.join(scratch, 'finished.mp4');
  run(ffmpeg, ['-y', '-i', silent, '-i', accepted, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-t', '32.9', '-movflags', '+faststart', candidate], path.join(scratch, 'finish.log'));
  verify(candidate);
  copyFileSync(candidate, final);
  writeFileSync(path.join(qa, 'tool-versions.json'), JSON.stringify({ node: process.version, hyperframes: '0.7.68', three: '0.180.0', browser: path.basename(path.dirname(browser)), localGenerationSpendUsd: 0 }, null, 2) + '\n');
  console.log(`Saved ${final}`);
}
