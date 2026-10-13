import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

// Independent display-resolution contract. Uses only the existing local server.
const QA = path.dirname(fileURLToPath(import.meta.url));
const baseline = process.argv.includes('--baseline');
const phase = baseline ? 'mascot-baseline' : 'mascot-final';
const originalSHA = '82c8f1c3e19fd95f7ba754308e6f2bb096391cac';
const originalMainSHA256 = 'ca60e8737997220b0c571323f914d0a92f44549af0d1282d3840e1fd52d16892';
const originalFile = path.join(QA, 'original-mascot-main.js');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (!fs.existsSync(originalFile)) {
  fs.writeFileSync(originalFile, execFileSync('git', ['show', `${originalSHA}:public/companion/main.js`]));
}
const originalMain = fs.readFileSync(originalFile);
if (sha256(originalMain) !== originalMainSHA256) throw new Error('Original renderer pin does not match the approved baseline.');
const sourceSHA = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const currentMain = fs.readFileSync('public/companion/main.js');
const textures = ['baked-skin.png', 'baked-hero.png', 'baked-body-clean.png', 'neutral.png'].map(file => {
  const bytes = fs.readFileSync(path.join('public/companion', file));
  return { file, sha256: sha256(bytes), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
});
const failures = [], observations = [], performanceObservations = [];
const check = (name, actual, expected) => {
  if (actual !== expected) failures.push({ name, actual, expected });
};
const preservedAssetHashes = {
  'scene.json': '1a199b50faf7be25b38b78b56bff2c81cc9ba75d34b13882e6ba668486ce62cd',
  'scene.bin': '607ba0c913859739f2a908758d55c34eea8126dc4b7427468887bf7afdd3cca5',
  'reactions.js': '41adee9a7fdfcc671c6bcdfbad520b00dfdaae3a20d13c623dd3f2ac505648ce',
  'baked-skin.png': '4b73fa1280927a4157bb0de9371643fbfc03e23a61d8cc4ad4b462015cb3f5d0',
  'baked-hero.png': '0cad0d727d64526c8f8a36b228c09a316a60efdd6c3813f7b141eb2825f81f0a',
  'baked-body-clean.png': 'da6d0f17f903692c2e63ffe621f7a2c76ea44e53886b8fa3b8952d49f3b37900',
  'neutral.png': 'e3d14aec0b8e435136493b8a19ee4f7652ebc5f526a77aafa2adc4dd6bcb694e'
};
for (const [file, expected] of Object.entries(preservedAssetHashes)) {
  check(`approved asset unchanged: ${file}`, sha256(fs.readFileSync(path.join('public/companion', file))), expected);
}
check('canonical/public renderer match', sha256(currentMain), sha256(fs.readFileSync('assets/3d-lab/grifon-companion-live/main.js')));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const measure = async page => page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas.getContext('webgl2');
  const driver = gl.getExtension('WEBGL_debug_renderer_info');
  const bounds = canvas.getBoundingClientRect();
  const snapshot = window.grifonDebug.snapshot();
  return { dpr: devicePixelRatio, css: { width: bounds.width, height: bounds.height },
    canvas: { width: canvas.width, height: canvas.height },
    buffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
    gpuRenderer: driver ? gl.getParameter(driver.UNMASKED_RENDERER_WEBGL) : null,
    rendererRatio: snapshot.viewport.pixelRatio, frameCount: snapshot.frameCount, paused: snapshot.pause,
    frameTimes: snapshot.rollingFrameTimes, reaction: snapshot.reaction.state };
});
const open = async (size, dpr) => {
  const context = await browser.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: dpr, reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' || request.method() !== 'GET' || url.pathname.startsWith('/api/')) return route.abort();
    if (baseline && url.pathname === '/companion/main.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: originalMain });
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/companion/frame.html');
  await page.waitForFunction(() => window.grifonDebug?.snapshot().ready, undefined, { timeout: 20_000 });
  return { context, page };
};
const inspect = async (page, name, expectedEdge, capture = false) => {
  // Poll the expected result to permit resolution/resize observers to settle.
  await page.waitForFunction(edge => document.querySelector('canvas')?.width === edge, expectedEdge, { timeout: 2500 }).catch(() => {});
  const initial = await measure(page);
  check(`${name}: buffer width`, initial.buffer.width, expectedEdge);
  check(`${name}: buffer height`, initial.buffer.height, expectedEdge);
  check(`${name}: canvas width`, initial.canvas.width, expectedEdge);
  check(`${name}: canvas height`, initial.canvas.height, expectedEdge);
  if (initial.buffer.width > 1024 || initial.buffer.height > 1024) failures.push({ name: `${name}: resource bound`, actual: initial.buffer, expected: 'Each edge <= 1024px' });
  if (capture) {
    await page.screenshot({ path: path.join(QA, `${phase}-${name}.png`), omitBackground: true });
    const dataUrl = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(document.querySelector('canvas').toDataURL('image/png')))));
    fs.writeFileSync(path.join(QA, `${phase}-${name}-backing.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
  }
  // Normal-size observations measure browser frame intervals, not physical-device FPS.
  const timingStart = await measure(page);
  if (name.startsWith('normal-')) await page.waitForTimeout(4000);
  const result = await measure(page);
  const sampledFrames = result.frameCount - timingStart.frameCount;
  if (name.startsWith('normal-') && sampledFrames < 1) failures.push({ name: `${name}: animation continued`, actual: sampledFrames, expected: 'At least one rendered frame during the 4s observation' });
  const sorted = [...(name.startsWith('normal-') ? (sampledFrames > 0 ? result.frameTimes.slice(-sampledFrames) : []) : result.frameTimes)].sort((a, b) => a - b);
  observations.push({ name, expectedEdge, assertedBuffer: initial.buffer, assertedDpr: initial.dpr, ...result, timing: {
    sampleCount: sorted.length,
    observationWindowMs: name.startsWith('normal-') ? 4000 : null,
    meanMs: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null,
    p95Ms: sorted.length ? sorted[Math.floor((sorted.length - 1) * .95)] : null,
    limitation: 'Local headless Edge intervals; not physical-phone performance or GPU-only render time. Small sample counts cannot establish a performance regression.'
  } });
};
const inspectHostedTiming = async (size, viewport) => {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname !== '127.0.0.1' || request.method() !== 'GET' || url.pathname.startsWith('/api/')) return route.abort();
    if (url.pathname === '/qa-mascot-resolution-host') return route.fulfill({ status: 200, contentType: 'text/html', body:
      `<!doctype html><html><body style="margin:0;background:#09090b"><iframe title="Local approved companion" src="/companion/frame.html" style="display:block;width:${size}px;height:${size}px;margin:32px;border:0"></iframe></body></html>` });
    if (baseline && url.pathname === '/companion/main.js') return route.fulfill({ status: 200, contentType: 'text/javascript', body: originalMain });
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5173/qa-mascot-resolution-host');
  const frame = page.frames().find(candidate => candidate.url().endsWith('/companion/frame.html'));
  await frame.waitForFunction(() => window.grifonDebug?.snapshot().ready, undefined, { timeout: 20_000 });
  await page.waitForTimeout(1000);
  const before = await measure(frame);
  await page.waitForTimeout(4000);
  const after = await measure(frame), sampleCount = after.frameCount - before.frameCount;
  const intervals = sampleCount > 0 ? after.frameTimes.slice(-sampleCount) : [];
  const sorted = [...intervals].sort((a, b) => a - b);
  if (sampleCount < 1) failures.push({ name: `hosted-${size}: animation continued`, actual: sampleCount, expected: 'At least one rendered frame during 4s' });
  await page.locator('iframe').screenshot({ path: path.join(QA, `${phase}-hosted-${size}.png`) });
  performanceObservations.push({ name: `hosted-${size}`, viewport, css: after.css, dpr: after.dpr, buffer: after.buffer,
    reducedMotion: false, observationWindowMs: 4000, sampleCount, storedIntervalCount: intervals.length,
    meanMs: sorted.length ? sorted.reduce((sum, value) => sum + value, 0) / sorted.length : null,
    p95Ms: sorted.length ? sorted[Math.floor((sorted.length - 1) * .95)] : null,
    gpuRenderer: after.gpuRenderer,
    limitation: 'Local headless Edge in a realistic-size host, not physical-phone performance or GPU-only render time; four-second samples do not prove all-device performance.' });
  await context.close();
};
try {
  for (const [name, size, dpr, expected] of [
    ['normal-56', 56, 1, 112], ['normal-64', 64, 1, 128],
    ['density3-56', 56, 3, 168], ['density3-64', 64, 3, 192],
    ['density8-56', 56, 8, 448], ['density8-64', 64, 8, 512],
    ['large-512', 512, 3, 1024]
  ]) {
    const { context, page } = await open(size, dpr);
    await inspect(page, name, expected, name.startsWith('normal-') || name.startsWith('density3-') || name === 'large-512');
    await context.close();
  }
  const { context, page } = await open(56, 1);
  await inspect(page, 'before-dpr-change', 112);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 56, height: 56, deviceScaleFactor: 3, mobile: false });
  await page.waitForFunction(() => devicePixelRatio === 3);
  // page.screenshot can restore a CDP override to the context DPR; live-change
  // assertions therefore read the drawing buffer without taking a screenshot.
  await inspect(page, 'after-live-dpr3', 168);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 56, height: 56, deviceScaleFactor: 8, mobile: false });
  await page.waitForFunction(() => devicePixelRatio === 8);
  await inspect(page, 'after-live-dpr8', 448);
  await page.reload(); await page.waitForFunction(() => window.grifonDebug?.snapshot().ready);
  await inspect(page, 'after-reload-dpr8', 448);
  await page.evaluate(() => window.postMessage({ channel: 'grifon-companion', command: 'pause', paused: true }, window.location.origin));
  await page.waitForFunction(() => window.grifonDebug.snapshot().pause);
  const pausedFrameCount = (await measure(page)).frameCount;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 56, height: 56, deviceScaleFactor: 3, mobile: false });
  await page.waitForFunction(() => devicePixelRatio === 3);
  await inspect(page, 'paused-live-dpr3', 168);
  const pausedResult = await measure(page);
  check('paused density update preserves pause', pausedResult.paused, true);
  check('paused density update preserves animation frame count', pausedResult.frameCount, pausedFrameCount);
  await context.close();
  await inspectHostedTiming(56, { width: 375, height: 667 });
  await inspectHostedTiming(64, { width: 1280, height: 900 });
} finally {
  await browser.close();
}
const report = { recordedAtUTC: new Date().toISOString(), phase, sourceSHA, mainSHA256: baseline ? originalMainSHA256 : sha256(currentMain),
  originalSHA, originalMainSHA256, textures, contract: 'Minimum 2x backing at 56/64px; follow DPR live, paused/reduced-motion, and after reload; backing edge <=1024px.',
  method: 'CDP/deviceScaleFactor DPR simulation; native browser zoom NOT tested.', nativeBrowserZoomTested: false,
  noPaidOrProviderCalls: true, observations, performanceObservations, failures, verdict: failures.length ? 'FAIL' : 'PASS' };
fs.writeFileSync(path.join(QA, `${phase}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ phase, verdict: report.verdict, assertionsFailed: failures.length, failures, report: path.join(QA, `${phase}-report.json`) }, null, 2));
process.exitCode = failures.length ? 1 : 0;
