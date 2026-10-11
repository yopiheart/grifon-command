import { readFile, writeFile, mkdir, realpath, stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { repository } from './templates.mjs';
import { readProject, planProject, safeFile, contained, projectDirectory, sha256, json, jsonBytes, validateWindow } from './project.mjs';
import { previewPage } from './preview-page.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.frag': 'text/plain', '.txt': 'text/plain', '.png': 'image/png', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.m4a': 'audio/mp4' };
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function basicHtml(state, format) {
  const root = state.root, size = state.job.formats[format];
  const values = { FORMAT: format, WIDTH: size.width, HEIGHT: size.height, BG: state.config.colors.background,
    GOLD: state.config.colors.accent, TEXT: state.config.colors.text,
    LOGO: `data:image/png;base64,${(await readFile(await safeFile(root, 'composition/assets/logo.png'))).toString('base64')}`,
    INTER: `data:font/ttf;base64,${(await readFile(await safeFile(root, 'composition/assets/inter-900.ttf'))).toString('base64')}`,
    MONO: `data:font/ttf;base64,${(await readFile(await safeFile(root, 'composition/assets/jbmono-600.ttf'))).toString('base64')}`,
    ...Object.fromEntries(Object.entries(state.config.copy).map(([key, value]) => [key.toUpperCase(), escapeHtml(value)])),
  };
  const template = await readFile(await safeFile(root, 'composition/composition.template.html'), 'utf8');
  return template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw Error(`Unknown basic composition token ${key}`);
    return String(values[key]);
  });
}

async function currentAudio(project) {
  const { readCurrentAudio } = await import('./audio.mjs');
  return readCurrentAudio(project);
}

export async function serveProject({ project, port = 0, format = 'landscape' }) {
  const initial = await readProject(project);
  if (!Object.hasOwn(initial.job.formats, format) || !Number.isInteger(port) || port < 0 || port > 65535) throw Error('Invalid preview format or port');
  const server = http.createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const authority = request.headers.host || '';
      if (!/^(127\.0\.0\.1|localhost):\d+$/.test(authority)) throw Error('Preview accepts loopback hosts only');
      const url = new URL(request.url, `http://${authority}`), name = decodeURIComponent(url.pathname);
      if (request.url.includes('..') || name.includes('..') || name.includes('\\') || name.includes('\0')) throw Error('Unsafe preview path');
      let bytes, type, file;
      if (name === '/') {
        const selected = url.searchParams.get('format') || format, plan = await planProject(initial.root);
        if (!Object.hasOwn(plan.formats, selected)) throw Error('Unsupported preview format');
        bytes = Buffer.from(previewPage(plan, selected)); type = mime['.html'];
      } else if (name === '/manifest.json') { bytes = Buffer.from(jsonBytes(await planProject(initial.root))); type = mime['.json']; }
      else if (name === '/composition/index.html') {
        const state = await readProject(initial.root), selected = url.searchParams.get('format') || format;
        if (!Object.hasOwn(state.job.formats, selected)) throw Error('Unsupported preview format');
        bytes = state.job.templateId === 'basic-launch' ? Buffer.from(await basicHtml(state, selected)) : await readFile(await safeFile(state.root, 'composition/full.html'));
        type = mime['.html'];
      } else if (name === '/audio-status' || name === '/audio-master') {
        const state = await readProject(initial.root), receipt = state.job.audioPlan ? await currentAudio(state.root) : null;
        if (name === '/audio-status') { bytes = Buffer.from(jsonBytes({ available: !!receipt, status: receipt ? 'VERIFIED_LOCAL_MASTER' : state.job.audioPlan ? 'PLAN_NOT_BUILT' : 'EXPLICIT_SILENT_PREVIEW' })); type = mime['.json']; }
        else { if (!receipt) throw Error('No verified audio master'); file = receipt.path; type = mime['.m4a']; }
      } else if (name === '/favicon.ico') { response.writeHead(204); response.end(); return; }
      else if (name.startsWith('/composition/') && Object.hasOwn(mime, path.extname(name).toLowerCase())) { file = await safeFile(initial.root, name.slice(1)); type = mime[path.extname(name).toLowerCase()]; }
      else { response.writeHead(404); response.end(); return; }
      if (file) bytes = await readFile(file);
      const headers = { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'" };
      if (file && request.headers.range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
        if (!match) throw Error('Unsupported media range');
        const start = Number(match[1]), end = match[2] ? Number(match[2]) : bytes.length - 1;
        if (start > end || end >= bytes.length) { response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }); response.end(); return; }
        response.writeHead(206, { ...headers, 'Accept-Ranges': 'bytes', 'Content-Range': `bytes ${start}-${end}/${bytes.length}`, 'Content-Length': end - start + 1 });
        response.end(request.method === 'HEAD' ? undefined : bytes.subarray(start, end + 1));
      } else { response.writeHead(200, { ...headers, 'Content-Length': bytes.length, ...(file ? { 'Accept-Ranges': 'bytes' } : {}) }); response.end(request.method === 'HEAD' ? undefined : bytes); }
    } catch (error) { if (!response.headersSent) response.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); response.end(jsonBytes({ error: error.message })); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) };
}

function run(executable, args) {
  const result = spawnSync(executable, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) throw Error(`${path.basename(executable)} failed (${result.status}): ${result.error?.message || result.stderr}`);
  return result.stdout;
}

export async function visualRuntime() {
  const executable = process.platform === 'win32' ? '.exe' : '';
  const installRoot = path.dirname(await realpath(path.join(repository, 'node_modules')));
  const ffmpeg = path.join(installRoot, `node_modules/ffmpeg-static/ffmpeg${executable}`);
  const ffprobe = path.join(installRoot, `.tools/media-runtime/node_modules/ffprobe-static/bin/${process.platform}/${process.arch}/ffprobe${executable}`);
  const browser = headlessBrowserPath(chromium.executablePath());
  const registry = json(await readFile(path.join(installRoot, 'node_modules/playwright-core/browsers.json')));
  const headless = registry.browsers.find(item => item.name === 'chromium-headless-shell');
  if (!headless || !browser.includes(`chromium_headless_shell-${headless.revision}`)) throw Error('Installed headless browser revision differs from the Playwright registry');
  const browserFiles = await browserRuntimeFiles(path.dirname(browser));
  const hashes = { browser: { path: browser, sha256: browserFiles.find(row => row.file === path.basename(browser)).sha256, files: browserFiles } };
  for (const [name, file] of Object.entries({ ffmpeg, ffprobe })) hashes[name] = { path: file, sha256: sha256(await readFile(file)) };
  hashes.playwrightTransport = {};
  for (const name of ['browsers.json', 'lib/coreBundle.js', 'lib/serverRegistry.js', 'lib/utilsBundle.js', 'lib/bootstrap.js', 'lib/package.js']) hashes.playwrightTransport[name] = sha256(await readFile(path.join(installRoot, 'node_modules/playwright-core', name)));
  const producer = {};
  for (const name of ['../motion-launch.mjs', 'project.mjs', 'visual.mjs', 'preview-page.mjs', 'templates.mjs', '../artifacts/_gates.mjs']) producer[name] = sha256(await readFile(path.resolve(here, name)));
  return { ffmpeg, ffprobe, browser, hashes, producer, node: process.version, playwright: json(await readFile(path.join(installRoot, 'node_modules/playwright/package.json'))).version,
    browserProfile: { headless: true, engine: 'chromium-headless-shell', revision: headless.revision, expectedVersion: headless.browserVersion,
      args: ['--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-rasterization'] } };
}

export function headlessBrowserPath(fullBrowserPath, platform = process.platform) {
  if (platform !== 'win32' || !/chromium-\d+[/\\]chrome-win64[/\\]chrome\.exe$/.test(fullBrowserPath)) throw Error('This local authoring runtime requires the installed Windows Playwright headless shell; no automatic browser install or fallback');
  return fullBrowserPath.replace(/chromium-(\d+)/, 'chromium_headless_shell-$1').replace(/chrome-win64([/\\])chrome\.exe$/, 'chrome-headless-shell-win64$1chrome-headless-shell.exe');
}

export async function browserRuntimeFiles(directory, relative = '') {
  const rows = [];
  for (const entry of (await readdir(path.join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    // Mutable diagnostics do not implement the browser and may contain visited URLs.
    if (/\.log$/i.test(entry.name)) continue;
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw Error(`Browser runtime links are unsupported: ${name}`);
    if (entry.isDirectory()) rows.push(...await browserRuntimeFiles(directory, name));
    else if (entry.isFile()) { const bytes = await readFile(path.join(directory, name)); rows.push({ file: name, bytes: bytes.length, sha256: sha256(bytes) }); }
    else throw Error(`Unsupported browser runtime input ${name}`);
  }
  return rows;
}

export function visualCacheKey(state, window, runtime) {
  return sha256(Buffer.from(JSON.stringify({ schemaVersion: 1, visualSourceKey: state.visualSourceKey, window, runtime: { hashes: runtime.hashes, producer: runtime.producer, node: runtime.node, playwright: runtime.playwright, browserProfile: runtime.browserProfile } })));
}

export async function inspectVisual(file, window, timeline, runtime) {
  const info = json(Buffer.from(run(runtime.ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file])));
  const video = info.streams.find(stream => stream.codec_type === 'video');
  const fps = `${timeline.fpsNumerator}/${timeline.fpsDenominator}`, duration = window.frames * timeline.fpsDenominator / timeline.fpsNumerator;
  if (!video || video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p' || video.width !== window.width || video.height !== window.height || Number(video.nb_read_frames) !== window.frames || video.r_frame_rate !== fps || video.time_base !== `1/${timeline.fpsNumerator}` || info.streams.some(stream => stream.codec_type === 'audio') || Math.abs(Number(video.duration) - duration) > 0.001) throw Error('Cached/rendered media does not satisfy the exact visual window contract');
  run(runtime.ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  const bytes = await readFile(file);
  return { file: path.basename(file), bytes: bytes.length, sha256: sha256(bytes), width: video.width, height: video.height, frames: Number(video.nb_read_frames), fps, timeBase: video.time_base, duration: Number(video.duration), strictDecode: 'PASS', audio: null };
}

export async function verifyVisualCache(directory, { key, state, window, runtime }) {
  const receipt = json(await readFile(await safeFile(directory, 'receipt.json')));
  if (receipt.key !== key || receipt.visualSourceKey !== state.visualSourceKey || JSON.stringify(receipt.timeline) !== JSON.stringify(state.job.timeline) || JSON.stringify(receipt.window) !== JSON.stringify(window) || JSON.stringify(receipt.runtime) !== JSON.stringify(runtime)) throw Error('Visual cache binding is stale');
  const file = await safeFile(directory, receipt.media.file), bytes = await readFile(file);
  if (bytes.length !== receipt.media.bytes || sha256(bytes) !== receipt.media.sha256) throw Error('Visual cache media is corrupt');
  const actual = await inspectVisual(file, window, state.job.timeline, runtime);
  if (JSON.stringify(actual) !== JSON.stringify(receipt.media)) throw Error('Visual cache decode contract differs');
  return { ...receipt, path: file, receiptPath: path.join(directory, 'receipt.json'), cacheHit: true, capturedFramesThisRun: 0 };
}

export async function verifyVisualReceipt({ project, receiptPath }) {
  const state = await readProject(project), receiptFile = await realpath(path.resolve(receiptPath));
  if (!receiptFile.startsWith(state.root + path.sep) || path.basename(receiptFile) !== 'receipt.json') throw Error('Visual receipt must belong to this project');
  const supplied = json(await readFile(receiptFile)), window = validateWindow(state.job, supplied.window), runtime = await visualRuntime();
  const key = visualCacheKey(state, window, runtime), expected = contained(state.root, `.cache/visual/${key}`);
  if (path.dirname(receiptFile) !== await realpath(expected)) throw Error('Visual receipt does not belong to the current source/window cache');
  return verifyVisualCache(expected, { key, state, window, runtime });
}

export async function renderVisual({ project, format = 'landscape', from = 0, frames = 48, profile = 'draft' }) {
  const started = performance.now(), phases = {}, before = performance.now();
  const state = await readProject(project), window = validateWindow(state.job, { format, from, frames, profile }), runtime = await visualRuntime();
  phases.preflightMs = performance.now() - before;
  const key = visualCacheKey(state, window, runtime), directory = contained(state.root, `.cache/visual/${key}`);
  await projectDirectory(state.root, '.cache/visual');
  let exists = false;
  try { await stat(directory); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (exists) {
    await projectDirectory(state.root, `.cache/visual/${key}`);
    const began = performance.now(), cached = await verifyVisualCache(directory, { key, state, window, runtime });
    return { ...cached, currentRun: { cacheVerificationMs: performance.now() - began, totalMs: performance.now() - started, capturedFrames: 0 } };
  }
  await mkdir(directory);
  const framesDirectory = path.join(directory, 'frames'); await mkdir(framesDirectory);
  let browser, host;
  try {
    const fullShader = profile === 'final' && state.job.templateId === 'shader-reference' && from === 0 && frames === 932;
    const first = fullShader ? 222 : from, count = fullShader ? 710 : frames;
    const setup = performance.now(); host = await serveProject({ project: state.root, format });
    browser = await chromium.launch({ headless: true, executablePath: runtime.browser, args: runtime.browserProfile.args });
    if (browser.version() !== runtime.browserProfile.expectedVersion) throw Error('Launched browser version differs from the bound installed headless runtime');
    const page = await browser.newPage({ viewport: state.job.formats[format], deviceScaleFactor: 1 });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => { if (new URL(route.request().url()).origin !== host.url) { external.push(route.request().url()); return route.abort(); } return route.continue(); });
    await page.goto(`${host.url}/composition/index.html?format=${format}`);
    if (state.job.templateId === 'shader-reference') {
      await page.waitForFunction(() => window.__motionReady || window.__motionError, null, { timeout: 60000 });
      const error = await page.evaluate(() => window.__motionError); if (error) throw Error(error);
    } else await page.waitForFunction(() => !!window.__timelines?.main);
    await page.evaluate(() => document.fonts.ready);
    const evidence = { ...await page.evaluate(() => window.__fullEvidence || { adapter: 'GSAP native timeline', fontReady: document.fonts.status === 'loaded' }), browserVersion: browser.version() };
    phases.browserSetupMs = performance.now() - setup;
    const capture = performance.now(), captures = [];
    for (let n = 0; n < count; n++) {
      const frame = first + n;
      await page.evaluate(async ({ frame, numerator, denominator, shader }) => { if (shader) await window.seekFullFrame(frame); else window.__timelines.main.pause().totalTime(frame * denominator / numerator, false); }, { frame, numerator: state.job.timeline.fpsNumerator, denominator: state.job.timeline.fpsDenominator, shader: state.job.templateId === 'shader-reference' });
      const bytes = await page.screenshot({ type: 'png', animations: 'disabled' }), file = `${String(n).padStart(4, '0')}.png`;
      await writeFile(path.join(framesDirectory, file), bytes, { flag: 'wx' }); captures.push({ frame, file, sha256: sha256(bytes) });
    }
    phases.captureMs = performance.now() - capture;
    if (errors.length || external.length) throw Error(`Composition failed: ${JSON.stringify({ errors, external })}`);
    await browser.close(); browser = null; await host.close(); host = null;
    if ((await readProject(state.root)).visualSourceKey !== state.visualSourceKey) throw Error('Source changed during capture; this partial attempt is retained and cannot be reused');
    const encode = performance.now(), output = path.join(directory, 'draft.mp4'), continuation = fullShader ? path.join(directory, 'continuation.mp4') : output;
    run(runtime.ffmpeg, ['-v', 'error', '-n', '-framerate', `${state.job.timeline.fpsNumerator}/${state.job.timeline.fpsDenominator}`, '-i', path.join(framesDirectory, '%04d.png'), '-frames:v', String(count), '-vf', `scale=${window.width}:${window.height}`, '-c:v', 'libx264', '-preset', profile === 'draft' ? 'veryfast' : 'medium', '-crf', profile === 'draft' ? '24' : '18', '-pix_fmt', 'yuv420p', '-an', '-video_track_timescale', String(state.job.timeline.fpsNumerator), '-movie_timescale', String(state.job.timeline.fpsNumerator), '-movflags', '+faststart', continuation]);
    let prefixProof = null;
    if (fullShader) {
      const prefix = await safeFile(state.root, 'composition/grifon-opening-pilot-silent.mp4'), concat = path.join(directory, 'concat.ffconcat');
      const stream = file => json(Buffer.from(run(runtime.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-show_data_hash', 'sha256', '-of', 'json', file]))).streams[0];
      const prefixStream = stream(prefix), continuationStream = stream(continuation);
      if (!prefixStream.extradata_hash || prefixStream.extradata_hash !== continuationStream.extradata_hash || prefixStream.profile !== continuationStream.profile || prefixStream.level !== continuationStream.level || prefixStream.width !== continuationStream.width || prefixStream.height !== continuationStream.height || prefixStream.pix_fmt !== continuationStream.pix_fmt) throw Error('Locked opening and continuation codec parameters differ; exact encoded concat is unavailable');
      const quote = file => file.replaceAll('\\', '/').replaceAll("'", "'\\''");
      await writeFile(concat, `ffconcat version 1.0\nfile '${quote(prefix)}'\nduration 7.407400\nfile '${quote(continuation)}'\n`, { flag: 'wx' });
      run(runtime.ffmpeg, ['-v', 'error', '-n', '-f', 'concat', '-safe', '0', '-auto_convert', '0', '-i', concat, '-map', '0:v:0', '-c:v', 'copy', '-an', '-video_track_timescale', '30000', '-movie_timescale', '30000', '-movflags', '+faststart', output]);
      const packets = file => json(Buffer.from(run(runtime.ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256', '-show_entries', 'packet=pts,dts,duration,data_hash', '-of', 'json', file]))).packets;
      const original = packets(prefix), delivered = packets(output).slice(0, 222);
      if (original.length !== 222 || JSON.stringify(original) !== JSON.stringify(delivered)) throw Error('Locked encoded opening packet payload/timing changed in final concat');
      const frameHashes = file => run(runtime.ffmpeg, ['-v', 'error', '-xerror', '-i', file, '-map', '0:v:0', '-frames:v', '222', '-f', 'framemd5', '-']).split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => line.split(',').at(-1).trim());
      const originalFrames = frameHashes(prefix), outputFrames = frameHashes(output);
      if (originalFrames.length !== 222 || JSON.stringify(originalFrames) !== JSON.stringify(outputFrames)) throw Error('Locked opening decoded pixels changed after concat');
      prefixProof = { frames: 222, sha256: state.config.prefixSha256, codecExtradataSha256: prefixStream.extradata_hash, codecCompatibility: 'EXACT_PASS', packetPayloadTiming: 'EXACT_PASS', decodedPixels: 'EXACT_PASS' };
    }
    phases.encodeMs = performance.now() - encode;
    const verify = performance.now(), media = await inspectVisual(output, window, state.job.timeline, runtime);
    if ((await readProject(state.root)).visualSourceKey !== state.visualSourceKey) throw Error('Source changed before verification');
    phases.verificationMs = performance.now() - verify;
    const receipt = { schemaVersion: 1, key, visualSourceKey: state.visualSourceKey, timeline: state.job.timeline, window, runtime, media, captures,
      browserEvidence: evidence, prefixProof, phases: { ...phases, totalMs: performance.now() - started },
      verdict: profile === 'draft' ? 'DRAFT_TECHNICAL_PASS_NOT_FINAL_ACCEPTANCE' : 'NATIVE_EXPORT_TECHNICAL_PASS_NOT_CREATIVE_ACCEPTANCE',
      providerCalls: 0, paidSpendUsd: 0 };
    await writeFile(path.join(directory, 'receipt.json'), jsonBytes(receipt), { flag: 'wx' });
    return { ...receipt, path: output, receiptPath: path.join(directory, 'receipt.json'), cacheHit: false, capturedFramesThisRun: count };
  } catch (error) {
    await writeFile(path.join(directory, 'failure.json'), jsonBytes({ error: error.message, visualSourceKey: state.visualSourceKey, key, phases, totalMs: performance.now() - started }), { flag: 'wx' });
    throw error;
  } finally { await browser?.close(); if (host) await host.close(); }
}
