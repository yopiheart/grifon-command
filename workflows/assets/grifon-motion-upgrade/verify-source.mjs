// Verify offline authored-film pixels and timing, not the denied browser preview.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/playwright/package.json')));
if (!deps) throw new Error('Existing Playwright/Sharp unavailable; no automatic install.');
const require = createRequire(path.join(deps, 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');
const scratch = path.join(root, '.tmp/grifon-motion-upgrade/source-check');
await mkdir(scratch, { recursive: true });
const spec = JSON.parse(await readFile(path.join(here, 'demo.json'), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pixels = png => sharp(png).removeAlpha().raw().toBuffer();
async function nonblank(png) {
  const rgb = await pixels(png); let bright = 0;
  for (let i = 0; i < rgb.length; i += 3) if (Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) > 40) bright++;
  const fraction = bright / (rgb.length / 3);
  // The approved black-field statement has ~1.66% bright ink at 24.4s.
  // Reject blank fields while retaining this deliberate, readable type-only beat.
  if (fraction < .01) throw new Error(`Blank/unreadably dark story beat: ${fraction}`);
  return fraction;
}
async function difference(a, b) {
  const [x, y] = await Promise.all([pixels(a), pixels(b)]); let changed = 0;
  for (let i = 0; i < x.length; i += 3) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 8) changed++;
  return changed / (x.length / 3);
}
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
  await page.waitForFunction(() => window.__motionReady || window.__motionError, {}, { timeout: 30000 });
  const error = await page.evaluate(() => window.__motionError);
  if (error || errors.length) throw new Error(`Startup: ${error || errors.join('; ')}`);
  const frame = async (time, target = page) => { await target.evaluate(t => window.seekComposition(t), time); return target.screenshot({ type: 'png' }); };
  const samples = [], images = new Map();
  const times = [.6, 1.7, 3.7, 4.7, 6.6, 7.8, 9.7, 11.4, 13.5, 15.4, 19.4, 21.8, 24.4, 27.8, 30.6];
  for (const t of times) {
    const png = await frame(t); images.set(t, png);
    let brightFraction; try { brightFraction = await nonblank(png); } catch (error) { throw new Error(`At ${t}s: ${error.message}`); }
    samples.push({ time: t, sha256: hash(await pixels(png)), brightFraction, state: await page.evaluate(() => window.__motionState) });
    await writeFile(path.join(scratch, `at-${t}.png`), png);
  }
  const motion = [];
  for (const [start, end] of [[.2, .8], [1.2, 2.1], [2.7, 3.7], [5.8, 6.6], [8.8, 9.7], [10.2, 11.4], [14.3, 15.4], [18.9, 21.8], [22.85, 24.4], [26.8, 28.0], [29.3, 30.6]]) {
    const fraction = await difference(await frame(start), await frame(end));
    // Typing changes letter ink alone (~0.45% of this minimalist full frame).
    // Product/camera transitions must change at least 1% of the whole picture.
    const minimumFraction = start === .2 ? .0025 : .01;
    if (fraction < minimumFraction) throw new Error(`Intended motion window frozen: ${start}-${end}, ${fraction}`);
    motion.push({ start, end, changedPixelFraction: fraction, minimumFraction });
  }
  const referenceTime = 6.6, original = await frame(referenceTime);
  for (const t of [30.6, 13.5, .6, 27.8, 3.7, 21.8, 22.6]) await frame(t);
  if (hash(await pixels(original)) !== hash(await pixels(await frame(referenceTime)))) throw new Error('Non-linear seeking changes same-time pixels.');
  const contacts = [];
  for (const [i, t] of spec.cueAnchors.heroContacts.entries()) {
    for (const sample of [t - .10, t, t + .10]) await writeFile(path.join(scratch, `at-${sample.toFixed(2)}.png`), await frame(sample));
    await frame(t); const state = await page.evaluate(() => window.__motionState);
    const later = t + .08; await frame(later); const held = await page.evaluate(() => window.__motionState);
    if (!Number.isFinite(state.heroAngle) || Math.abs(state.heroAngle - held.heroAngle) > 1e-8) throw new Error(`Hero turn fails to settle on its accepted sound cue at ${t}`);
    contacts.push({ time: t, heroKind: state.heroKind, settledAngle: state.heroAngle });
  }
  for (const t of [14.27, 22.48, 25.30, 28.87]) await writeFile(path.join(scratch, `at-${t.toFixed(2)}.png`), await frame(t));
  const revisedSpec = structuredClone(spec); revisedSpec.copy.opening = 'Your next idea.';
  const specFile = path.join(scratch, 'revision.json'), revision = path.join(scratch, 'revision');
  await writeFile(specFile, JSON.stringify(revisedSpec));
  const build = spawnSync(process.execPath, [path.join(here, 'build.mjs'), specFile, revision], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (build.status !== 0) throw new Error(`Copy revision build: ${build.stderr}`);
  const revised = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await revised.goto(pathToFileURL(path.join(revision, 'index.html')).href);
  await revised.waitForFunction(() => window.__motionReady, {}, { timeout: 30000 });
  const copyRevision = [];
  for (const t of [.9, 3.7, 15.4, 30.6]) {
    const changed = await difference(await frame(t), await frame(t, revised));
    if (t === .9 ? changed < .001 : changed !== 0) throw new Error(`Opening-copy edit affects unintended beat ${t}: ${changed}`);
    copyRevision.push({ time: t, changedPixelFraction: changed, expectedChange: t === .9 });
  }
  const blank = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#09090B' } }).png().toBuffer();
  let blankRejected = false; try { await nonblank(blank); } catch { blankRejected = true; }
  if (!blankRejected || await difference(original, original) >= .01) throw new Error('Blank/frozen negative controls failed.');
  const layers = await page.locator('[data-copy]').evaluateAll(nodes => nodes.map(n => ({ key: n.dataset.copy, text: n.textContent })));
  const sheetItems = await Promise.all(times.map(async (t, i) => ({ input: await sharp(images.get(t)).resize(480, 270).toBuffer(), left: (i % 4) * 480, top: Math.floor(i / 4) * 270 })));
  await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#09090B' } }).composite(sheetItems).jpeg({ quality: 90 }).toFile(path.join(here, 'qa/source-sheet.jpg'));
  await writeFile(path.join(here, 'qa/source-check.json'), JSON.stringify({ status: 'PASS', samples, motion, heroContacts: contacts, nonlinearSeekPixelIdentity: true, copyRevision, copyLayers: layers, negativeControls: { blankRejected, frozenRejected: true }, limitations: ['Offline production renderer, not a user browser-origin permission or denied preview-page check', 'No direct subjective listening', 'Abstract concept visuals, not product UI/output proof'] }, null, 2) + '\n');
  console.log('PASS: 15 story beats, 11 intended motion windows, hero contact timing, repeat seeking, copy-only revision, blank/freeze controls.');
} finally { await browser.close(); }
