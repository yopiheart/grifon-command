// Capture exact authored frames, including completed WebGPU submissions.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { validateSpec, actionMap, cueManifest } from './action-spec.mjs';
import { validatePilotSpec } from './pilot-contract.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT.split(`${path.sep}.tmp${path.sep}worktrees${path.sep}`)[0]);
const require = createRequire(path.join(PRIMARY, 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');
const ffmpeg = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const SCRATCH = path.join(ROOT, '.tmp/grifon-motion-action-pilot');
const QA = path.join(HERE, 'qa');
const spec = validatePilotSpec(JSON.parse(fs.readFileSync(path.join(HERE, 'pilot.json'), 'utf8')));
const actions = actionMap(spec);
const task = process.argv[2] || 'check';
if (!['check', 'render', 'encode', 'verify'].includes(task)) throw Error('Use check|render|encode|verify');
fs.mkdirSync(SCRATCH, { recursive: true });
fs.mkdirSync(QA, { recursive: true });
const hash = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const hashFile = file => hash(fs.readFileSync(file));
const browserArgs = ['--enable-unsafe-webgpu', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-dawn-features=use_dxc', '--disable-gpu-rasterization'];
const video = path.join(HERE, 'grifon-motion-action-pilot-picture-1080p.mp4');
const review = path.join(HERE, 'grifon-motion-action-pilot-review-1080p.mp4');
function run(file, args) {
  const result = spawnSync(file, args, { encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
  if (result.status !== 0) throw Error(`${path.basename(file)} failed (${result.status}): ${result.stderr?.slice(-2000)}`);
  return result;
}
function verify(file, audioRequired) {
  const data = JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
  const v = data.streams.find(stream => stream.codec_type === 'video');
  const a = data.streams.find(stream => stream.codec_type === 'audio');
  if (!v || v.width !== spec.width || v.height !== spec.height || v.r_frame_rate !== `${spec.fps}/1` || +v.nb_read_frames !== spec.duration * spec.fps || v.pix_fmt !== 'yuv420p' || v.codec_name !== 'h264' || Math.abs(+data.format.duration - spec.duration) > .02) throw Error('Pilot video dimensions/frame count/duration/codec mismatch');
  if (audioRequired && (!a || a.codec_name !== 'aac' || +a.sample_rate !== 48000 || a.channels !== 2) || !audioRequired && a) throw Error('Pilot audio contract mismatch');
  run(ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  let audio;
  if (a) {
    const meter = run(ffmpeg, ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr;
    const summary = meter.slice(meter.lastIndexOf('Summary:'));
    const integratedLufs = +summary.match(/I:\s*([-\d.]+) LUFS/)[1];
    const truePeakDbtp = +summary.match(/Peak:\s*([-\d.]+) dBFS/)[1];
    if (Math.abs(integratedLufs + 16) > .7 || truePeakDbtp > -1.5) throw Error(`Audio levels outside contract: ${integratedLufs} LUFS, ${truePeakDbtp} dBTP`);
    audio = { codec: a.codec_name, sampleRate: +a.sample_rate, channels: a.channels, integratedLufs, truePeakDbtp };
  }
  return { file: path.basename(file), bytes: fs.statSync(file).size, sha256: hashFile(file), frames: +v.nb_read_frames, duration: +data.format.duration, dimensions: [v.width, v.height], fps: v.r_frame_rate, audio: audio || null, strictDecode: 'PASS' };
}

if (task === 'check' || task === 'render') {
  const invalid = structuredClone(spec);
  invalid.actions.push({ ...invalid.actions[0] });
  const invalidPath = path.join(QA, 'invalid-duplicate-action.json');
  fs.writeFileSync(invalidPath, JSON.stringify(invalid, null, 2) + '\n');
  const rejection = spawnSync(process.execPath, [path.join(HERE, 'contract.test.mjs'), '--validate', invalidPath], { encoding: 'utf8' });
  if (rejection.status === 0 || !rejection.stderr.includes('duplicate/missing action ID')) throw Error('Invalid fixture did not fail at validation layer');
  const server = http.createServer((request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(HERE, '.' + (relative === '/' ? '/index.html' : relative));
      if (!file.startsWith(HERE + path.sep) || !fs.statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream';
      response.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(response);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const errors = [], blocked = [];
  let browser;
  const open = async instance => {
    const context = await instance.newContext({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1 });
    await context.route('**/*', route => { const url = route.request().url(); if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue(); blocked.push(url); return route.abort(); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.waitForFunction(() => window.__motionReady || window.__motionError, {}, { timeout: 60000 });
    const error = await page.evaluate(() => window.__motionError);
    if (error) throw Error(error);
    return page;
  };
  const capture = async (page, time) => { await page.evaluate(async seconds => { await window.seekComposition(seconds); }, time); return page.screenshot({ type: 'png', animations: 'disabled' }); };
  try {
    browser = await chromium.launch({ headless: true, args: browserArgs });
    const page = await open(browser);
    const sampleTimes = [...new Set([
      ...spec.scenes.flatMap(scene => [scene.start, ...scene.readable, Math.max(scene.start, scene.end - 1 / spec.fps)]),
      ...spec.qa.sampleActionIds.flatMap(id => [actions[id].start + ((actions[id].contact ?? actions[id].end) - actions[id].start) / 2, actions[id].contact ?? actions[id].end]),
    ])].sort((a, b) => a - b).filter(time => time <= spec.duration);
    const samples = [];
    const sheet = [];
    const posterTime = spec.scenes[0].readable.reduce((a, b) => a + b) / 2;
    for (const [index, time] of sampleTimes.entries()) {
      const png = await capture(page, time);
      fs.writeFileSync(path.join(QA, `frame-${String(index).padStart(2, '0')}.png`), png);
      samples.push({ time, file: `frame-${String(index).padStart(2, '0')}.png`, sha256: hash(png) });
      sheet.push({ input: await sharp(png).resize(480, 270).toBuffer(), left: index % 4 * 480, top: Math.floor(index / 4) * 270 });
    }
    await sharp({ create: { width: 1920, height: Math.ceil(sheet.length / 4) * 270, channels: 3, background: '#09090B' } }).composite(sheet).jpeg({ quality: 91 }).toFile(path.join(QA, 'contact-sheet.jpg'));
    fs.writeFileSync(path.join(QA, 'poster.png'), await capture(page, posterTime));
    const repeatCases = [];
    for (const scene of spec.scenes) {
      const time = (scene.readable[0] + scene.readable[1]) / 2;
      const firstPng = await capture(page, time);
      const first = hash(firstPng);
      await capture(page, spec.duration);
      const nonlinear = hash(await capture(page, time));
      if (first !== nonlinear) throw Error(`Nonlinear seek differs in ${scene.id}`);
      const freshBrowser = await chromium.launch({ headless: true, args: browserArgs });
      let fresh, freshPng;
      try { const freshPage = await open(freshBrowser); freshPng = await capture(freshPage, time); fresh = hash(freshPng); } finally { await freshBrowser.close(); }
      if (first !== fresh) {
        fs.writeFileSync(path.join(QA, 'startup-first.png'), firstPng);
        fs.writeFileSync(path.join(QA, 'startup-fresh.png'), freshPng);
        fs.writeFileSync(path.join(QA, 'startup-failure.json'), JSON.stringify({ scene: scene.id, time, first, fresh }, null, 2));
        throw Error(`Fresh browser differs in ${scene.id}`);
      }
      repeatCases.push({ scene: scene.id, time, first, nonlinear, fresh, result: 'EXACT_PASS' });
    }
    const finish = spec.scenes.at(-1);
    const holdStart = hash(await capture(page, finish.readable[0]));
    const holdEnd = hash(await capture(page, finish.readable[1]));
    if (holdStart !== holdEnd) throw Error('Brand readable hold is not stationary');
    const edit = spec.qa.contactMutation;
    const revised = structuredClone(spec);
    revised.actions.find(action => action.id === edit.actionId).contact += edit.delta;
    validateSpec(revised);
    const action = actions[edit.actionId];
    const beforePng = await capture(page, action.contact);
    const beforeState = await page.evaluate(() => window.__motionState);
    await page.evaluate(next => window.setCompositionSpec(next), revised);
    const afterPng = await capture(page, action.contact);
    const afterState = await page.evaluate(() => window.__motionState);
    if (hash(beforePng) === hash(afterPng) || beforeState.actions[edit.actionId] !== 1 || afterState.actions[edit.actionId] >= 1) throw Error('Contact revision did not change visible settling');
    fs.writeFileSync(path.join(QA, 'contact-original.png'), beforePng);
    fs.writeFileSync(path.join(QA, 'contact-revised.png'), afterPng);
    const revisedContact = revised.actions.find(item => item.id === edit.actionId).contact;
    await capture(page, revisedContact);
    if ((await page.evaluate(() => window.__motionState)).actions[edit.actionId] !== 1) throw Error('Revised contact fails to settle');
    const revisedManifest = cueManifest(revised);
    const originalManifest = cueManifest(spec);
    const cueChanges = originalManifest.cues.filter(cue => cue.actionId === edit.actionId).map(cue => {
      const next = revisedManifest.cues.find(item => item.id === cue.id);
      if (Math.abs(next.timelineContact - cue.timelineContact - edit.delta) > 1e-9 || Math.abs(next.start - cue.start - edit.delta) > 1e-9) throw Error('Cue contact did not follow visual contact');
      return { id: cue.id, oldContact: cue.timelineContact, newContact: next.timelineContact, oldStart: cue.start, newStart: next.start };
    });
    await page.evaluate(next => window.setCompositionSpec(next), spec);
    const copyBefore = await capture(page, posterTime);
    const textBefore = await page.locator('h1,h2,.step-title,#brand-word,#brand-url').allTextContents();
    const rect = await page.locator('#opening-copy').boundingBox();
    const copySpec = structuredClone(spec);
    copySpec.copy[spec.qa.copyMutation.key] = spec.qa.copyMutation.value;
    await page.evaluate(next => window.setCompositionSpec(next), copySpec);
    const copyAfter = await capture(page, posterTime);
    const textAfter = await page.locator('h1,h2,.step-title,#brand-word,#brand-url').allTextContents();
    if (textAfter[0] !== spec.qa.copyMutation.value || JSON.stringify(textBefore.slice(1)) !== JSON.stringify(textAfter.slice(1))) throw Error('Copy edit escaped intended text');
    const beforePixels = await sharp(copyBefore).removeAlpha().raw().toBuffer();
    const afterPixels = await sharp(copyAfter).removeAlpha().raw().toBuffer();
    let changedInside = 0, changedOutside = 0;
    for (let y = 0; y < spec.height; y++) for (let x = 0; x < spec.width; x++) {
      const i = (y * spec.width + x) * 3;
      if (beforePixels[i] !== afterPixels[i] || beforePixels[i + 1] !== afterPixels[i + 1] || beforePixels[i + 2] !== afterPixels[i + 2]) {
        if (x >= rect.x - 4 && x <= rect.x + rect.width + 4 && y >= rect.y - 4 && y <= rect.y + rect.height + 4) changedInside++; else changedOutside++;
      }
    }
    if (!changedInside || changedOutside) throw Error(`Copy-only frame change escaped intended line: inside=${changedInside}, outside=${changedOutside}`);
    fs.writeFileSync(path.join(QA, 'copy-original.png'), copyBefore);
    fs.writeFileSync(path.join(QA, 'copy-revised.png'), copyAfter);
    await page.evaluate(next => window.setCompositionSpec(next), spec);
    const gpu = await page.evaluate(() => window.__shaderEvidence);
    if (!gpu || gpu.renderer !== 'WebGPU' || gpu.failure || gpu.adapter?.isFallbackAdapter) throw Error('Actual native WebGPU success required');
    if (task === 'render') {
      // A fresh browser keeps verification edits out of the capture's glyph cache.
      await browser.close();
      browser = await chromium.launch({ headless: true, args: browserArgs });
      const renderPage = await open(browser);
      const frameDir = path.join(SCRATCH, 'frames');
      fs.mkdirSync(frameDir, { recursive: true });
      for (let frame = 0; frame < spec.duration * spec.fps; frame++) {
        fs.writeFileSync(path.join(frameDir, `${String(frame).padStart(4, '0')}.png`), await capture(renderPage, frame / spec.fps));
        if (frame % 60 === 0) console.log(`Pilot: ${frame}/${spec.duration * spec.fps} frames`);
      }
    }
    if (errors.length || blocked.length) throw Error(`Runtime/network errors: ${JSON.stringify({ errors, blocked })}`);
    const sourceNames = ['index.html', 'composition.js', 'pilot.json', 'action-spec.mjs', 'pilot-contract.mjs', 'contract.test.mjs', 'materials-source.js', 'shader-materials.js', 'audio.mjs', 'render.mjs'];
    const sources = Object.fromEntries(sourceNames.map(name => [name, hashFile(path.join(HERE, name))]));
    fs.writeFileSync(path.join(QA, 'capture-check.json'), JSON.stringify({ date: new Date().toISOString(), browser: browser.version(), browserArgs, sources, resolution: [spec.width, spec.height], samples, repeatCases, stillBrandHold: { result: 'EXACT_PASS', start: finish.readable[0], end: finish.readable[1], sha256: holdStart }, invalidFixture: { file: path.basename(invalidPath), exitCode: rejection.status, error: rejection.stderr.match(/Error: (.+)/)?.[1] }, contactRevision: { result: 'PASS', actionId: edit.actionId, originalSettle: action.contact, revisedSettle: revisedContact, visiblyChanged: hash(beforePng) !== hash(afterPng), cues: cueChanges }, copyRevision: { result: 'PASS', textBefore, textAfter, changedInside, changedOutside }, gpu, runtimeErrors: errors, externalRequests: blocked, providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
if (task === 'encode' || task === 'render') {
  run(process.execPath, [path.join(HERE, 'audio.mjs')]);
  run(ffmpeg, ['-y', '-framerate', String(spec.fps), '-i', path.join(SCRATCH, 'frames/%04d.png'), '-frames:v', String(spec.duration * spec.fps), '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video]);
  run(ffmpeg, ['-y', '-i', video, '-i', path.join(HERE, 'mix-master.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', String(spec.duration), '-movflags', '+faststart', review]);
}
if (['verify', 'render', 'encode'].includes(task)) fs.writeFileSync(path.join(QA, 'media.json'), JSON.stringify({ files: [verify(video, false), verify(review, true)], providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
console.log(`PASS: ${task}, local-only Grifon action pilot.`);
