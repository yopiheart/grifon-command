// Local study capture. Await every authored frame, including submitted WebGPU work.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT.split(`${path.sep}.tmp${path.sep}worktrees${path.sep}`)[0]);
const require = createRequire(path.join(PRIMARY, 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');
const ffmpeg = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const SCRATCH = path.join(ROOT, '.tmp/grifon-shader-study');
const QA = path.join(HERE, 'qa');
const task = process.argv[2] || 'check';
if (!['check', 'render', 'encode', 'verify'].includes(task)) throw Error('Use check|render|encode|verify');
fs.mkdirSync(SCRATCH, { recursive: true }); fs.mkdirSync(QA, { recursive: true });
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const browserArgs = ['--enable-unsafe-webgpu', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-dawn-features=use_dxc'];
function run(file, args) {
  const r = spawnSync(file, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw Error(`${path.basename(file)} failed (${r.status}): ${r.stderr?.slice(-1200)}`);
  return r.stdout;
}
const files = {
  before: path.join(HERE, 'grifon-shader-before-1080p.mp4'),
  after: path.join(HERE, 'grifon-shader-after-1080p.mp4'),
  comparison: path.join(HERE, 'grifon-shader-comparison-1080p.mp4'),
};
function verify(file) {
  const data = JSON.parse(run(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]));
  const v = data.streams.find(s => s.codec_type === 'video');
  if (!v || v.width !== 1920 || v.height !== 1080 || v.r_frame_rate !== '30/1' || +v.nb_read_frames !== 240 || v.pix_fmt !== 'yuv420p' || v.codec_name !== 'h264' || Math.abs(+data.format.duration - 8) > .02 || data.streams.some(s => s.codec_type === 'audio')) throw Error('Study must be 8s/240frames/1080p30/H264, silent.');
  run(ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  return { file: path.basename(file), bytes: fs.statSync(file).size, sha256: hash(fs.readFileSync(file)), frames: +v.nb_read_frames, duration: +data.format.duration, dimensions: [v.width, v.height], fps: v.r_frame_rate, audio: 'SILENT_VISUAL_STUDY', strictDecode: 'PASS' };
}
if (task === 'check' || task === 'render') {
  const server = http.createServer((req, res) => {
    try {
      const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(HERE, '.' + (relative === '/' ? '/index.html' : relative));
      if (!file.startsWith(HERE + path.sep) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' }); fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const errors = [], blocked = [], results = {};
  try {
    for (const mode of ['before', 'after']) {
      // Keep one composition per browser; avoid raster caches inherited from another mode.
      await browser?.close();
      browser = await chromium.launch({ headless: true, args: browserArgs });
      const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
      await context.route('**/*', route => { const u = route.request().url(); if (u.startsWith(origin + '/') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue(); blocked.push(u); return route.abort(); });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push({ mode, message: e.message }));
      await page.goto(`${origin}/?mode=${mode}`);
      await page.waitForFunction(() => window.__motionReady || window.__motionError, {}, { timeout: 60000 });
      if (await page.evaluate(() => window.__motionError)) throw Error(await page.evaluate(() => window.__motionError));
      const seek = async t => { await page.evaluate(async t => { await window.seekComposition(t); if (window.__motionError) throw Error(window.__motionError); }, t); return page.screenshot({ type: 'png', animations: 'disabled' }); };
      const sheets = [], samples = [];
      for (const t of [.8, 1.6, 2.9, 4.15, 5.85, 6.8]) {
        const png = await seek(t); const file = path.join(QA, `${mode}-${t}.png`);
        fs.writeFileSync(file, png); samples.push({ t, sha256: hash(png) });
        sheets.push({ input: await sharp(png).resize(640, 360).toBuffer(), left: (sheets.length % 3) * 640, top: Math.floor(sheets.length / 3) * 360 });
      }
      await sharp({ create: { width: 1920, height: 720, channels: 3, background: '#09090B' } }).composite(sheets).jpeg({ quality: 92 }).toFile(path.join(QA, `${mode}-sheet.jpg`));
      const firstPng = await seek(1.6); const a = hash(firstPng); await seek(6.8); const repeat = hash(await seek(1.6));
      if (a !== repeat) throw Error(`${mode} nonlinear seek is not deterministic`);
      if (hash(await seek(6.4)) !== hash(await seek(7.6))) throw Error(`${mode} brand hold must be still`);
      const freshBrowser = await chromium.launch({ headless: true, args: browserArgs });
      let fresh;
      try {
        const freshContext = await freshBrowser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
        await freshContext.route('**/*', route => { const u = route.request().url(); if (u.startsWith(origin + '/') || u.startsWith('data:') || u.startsWith('blob:')) return route.continue(); blocked.push(u); return route.abort(); });
        const freshPage = await freshContext.newPage();
        freshPage.on('pageerror', e => errors.push({ mode, startup: 'fresh', message: e.message }));
        await freshPage.goto(`${origin}/?mode=${mode}`);
        await freshPage.waitForFunction(() => window.__motionReady || window.__motionError, {}, { timeout: 60000 });
        await freshPage.evaluate(async () => { if (window.__motionError) throw Error(window.__motionError); await window.seekComposition(1.6); });
        const freshPng = await freshPage.screenshot({ type: 'png', animations: 'disabled' });
        fresh = hash(freshPng);
        if (a !== fresh) {
          fs.writeFileSync(path.join(QA, `${mode}-startup-first.png`), firstPng);
          fs.writeFileSync(path.join(QA, `${mode}-startup-fresh.png`), freshPng);
          fs.writeFileSync(path.join(QA, 'startup-failure.json'), JSON.stringify({mode, a, fresh, state:await freshPage.evaluate(() => window.__motionState), gpu:await freshPage.evaluate(() => window.__shaderEvidence), source:hash(fs.readFileSync(path.join(HERE, 'shader-materials.js')))},null,2)+'\n');
          throw Error(`${mode} fresh browser frame differs`);
        }
      } finally { await freshBrowser.close(); }
      const gpu = await page.evaluate(() => window.__shaderEvidence || null);
      if (mode === 'after' && (!gpu || gpu.renderer !== 'WebGPU' || gpu.failure)) throw Error('Actual WebGPU success evidence required; fallback is not a shader pass.');
      results[mode] = { samples, nonlinearSeek: 'PASS', freshBrowser: 'PASS', repeatSha256: repeat, freshSha256: fresh, stillBrandHold: 'PASS', gpu };
      if (task === 'render') {
        const frameDir = path.join(SCRATCH, mode); fs.mkdirSync(frameDir, { recursive: true });
        for (let frame = 0; frame < 240; frame++) {
          fs.writeFileSync(path.join(frameDir, `${String(frame).padStart(4, '0')}.png`), await seek(frame / 30));
          if (frame % 60 === 0) console.log(`${mode}: ${frame}/240 frames`);
        }
      }
      await page.close();
    }
    if (errors.length || blocked.length) throw Error(`Runtime/network errors: ${JSON.stringify({ errors, blocked })}`);
    const sources = Object.fromEntries(['index.html', 'composition.js', 'study.json', 'materials-source.js', 'shader-materials.js'].map(name => [name, hash(fs.readFileSync(path.join(HERE, name)))]));
    fs.writeFileSync(path.join(QA, 'capture-check.json'), JSON.stringify({ date: '2026-10-07', browser: browser.version(), browserIsolation: 'one composition mode per fresh browser', browserArgs, sources, resolution: [1920, 1080], modes: results, runtimeErrors: errors, externalRequests: blocked, providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
}
if (task === 'encode' || task === 'render') {
  for (const mode of ['before', 'after']) run(ffmpeg, ['-y', '-framerate', '30', '-i', path.join(SCRATCH, mode, '%04d.png'), '-frames:v', '240', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', files[mode]]);
  const font = path.join(HERE, 'assets/inter-900.ttf').replaceAll('\\', '/').replace(':', '\\:');
  const filter = `[0:v]scale=944:531[a];[1:v]scale=944:531[b];[a][b]hstack=inputs=2,pad=1920:1080:16:275:color=0x09090B,drawtext=fontfile='${font}':text='BEFORE':fontcolor=white:fontsize=30:x=52:y=208,drawtext=fontfile='${font}':text='SHADER STUDY':fontcolor=0xFFCC00:fontsize=30:x=1012:y=208,drawtext=fontfile='${font}':text='SAME TIMING. NEW MATERIALS.':fontcolor=0xD4D4D8:fontsize=26:x=52:y=864[out]`;
  run(ffmpeg, ['-y', '-i', files.before, '-i', files.after, '-filter_complex', filter, '-map', '[out]', '-frames:v', '240', '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', files.comparison]);
}
if (task === 'verify' || task === 'render' || task === 'encode') fs.writeFileSync(path.join(QA, 'media.json'), JSON.stringify({ files: Object.values(files).map(verify), providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
console.log(`PASS: ${task}, local-only study.`);
