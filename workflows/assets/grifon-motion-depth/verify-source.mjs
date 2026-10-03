// Verify actual browser pixels, absolute-time seeking, intended movement and copy revision.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const roots = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')];
const deps = process.env.MOTION_DEPENDENCY_ROOT || roots.find(dir => existsSync(path.join(dir, 'node_modules/playwright/package.json')));
if (!deps) throw new Error('Existing Playwright/Sharp dependencies missing.');
const require = createRequire(path.join(deps, 'package.json'));
const { chromium } = require('playwright');
const sharp = require('sharp');
const scratch = path.join(root, '.tmp/grifon-motion-depth/source-check');
await mkdir(scratch, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function pixels(png) { return sharp(png).removeAlpha().raw().toBuffer(); }
async function nonblank(png) {
  const rgb = await pixels(png); let bright = 0;
  for (let i = 0; i < rgb.length; i += 3) if (Math.max(rgb[i], rgb[i + 1], rgb[i + 2]) > 40) bright++;
  const fraction = bright / (rgb.length / 3);
  if (fraction < .04) throw new Error(`Blank or unreadably dark frame (${fraction.toFixed(5)} bright-pixel fraction).`);
  return fraction;
}
async function difference(a, b) {
  const [x, y] = await Promise.all([pixels(a), pixels(b)]); let changed = 0;
  for (let i = 0; i < x.length; i += 3) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 8) changed++;
  return changed / (x.length / 3);
}
function movement(fraction) { if (fraction < .01) throw new Error(`Intended motion window is frozen (${fraction}).`); }
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
  await page.waitForFunction(() => window.__motionReady === true || !!window.__motionError, {}, { timeout: 20000 });
  const initError = await page.evaluate(() => window.__motionError);
  if (initError || errors.length) throw new Error(`Composition startup failed: ${initError || errors.join('; ')}`);
  const frame = async (t, target = page) => {
    await target.evaluate(time => window.seekComposition(time), t);
    return target.screenshot({ type: 'png' });
  };
  const samples = {};
  for (const t of [.2, .8, 1.5, 2.4, 2.6, 3.1, 3.6, 4.1, 4.75, 5, 5.3, 5.5, 6.04, 6.35, 7.8]) {
    const png = await frame(t);
    samples[t] = { sha256: hash(await pixels(png)), brightFraction: await nonblank(png) };
    await writeFile(path.join(scratch, `at-${t}.png`), png);
  }
  const motion = [];
  for (const [start, end] of [[.2, .8], [1.5, 2.4], [4.65, 5.3], [6.04, 6.35]]) {
    const fraction = await difference(await frame(start), await frame(end)); movement(fraction);
    motion.push({ start, end, changedPixelFraction: fraction });
  }
  const original = await frame(.8);
  for (const t of [7.8, 3.6, 4.8, .2, 2.6]) await frame(t);
  const repeated = await frame(.8);
  if (hash(await pixels(original)) !== hash(await pixels(repeated))) throw new Error('Same time produced different pixels after non-linear scrubbing.');
  const cuts = [];
  for (const [t, name] of [[2.5, 'gold'], [3, 'ceramic'], [3.5, 'glass'], [4, 'wireframe']]) {
    await frame(t); const state = await page.evaluate(() => window.__motionState);
    if (state.material !== name) throw new Error(`Material cut at ${t} is late or incorrect.`);
    cuts.push({ time: t, material: state.material, camera: state.camera });
  }
  if (cuts.some(c => JSON.stringify(c.camera) !== JSON.stringify(cuts[0].camera))) throw new Error('Material match cuts changed camera framing.');
  const spec = JSON.parse(await readFile(path.join(here, 'demo.json'), 'utf8'));
  const contacts = [];
  for (const [index, time] of spec.wordArrivals.entries()) {
    await frame(time);
    const state = await page.evaluate(() => window.__motionState);
    const word = state.words[index];
    if (state.wordOffsets[index] > 1e-8 || word.rotation.some(v => Math.abs(v) > 1e-8)) throw new Error(`Word ${word.word} misses its sound contact at ${time}.`);
    const preRollStart = time - .24;
    if (preRollStart < 4.5) throw new Error(`Word ${word.word} pre-roll is hidden by the prior scene.`);
    contacts.push({ word: word.word, time, preRollStart, homeOffset: state.wordOffsets[index] });
  }
  await frame(7.8);
  const lockup = await page.locator('#lockup').boundingBox();
  if (!lockup || lockup.x < 90 || lockup.y < 70 || lockup.x + lockup.width > 1830 || lockup.y + lockup.height > 1010) throw new Error('Closing lockup leaves the safe area.');
  // Negative controls reproduce the observed blank-frame and original freeze failure classes.
  const blank = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#09090B' } }).png().toBuffer();
  let blankRejected = false, freezeRejected = false;
  try { await nonblank(blank); } catch { blankRejected = true; }
  try { movement(await difference(original, original)); } catch { freezeRejected = true; }
  if (!blankRejected || !freezeRejected) throw new Error('Negative controls failed to detect blank/frozen pixels.');
  spec.copy.headline = 'YOUR NEXT IDEA';
  const revision = path.join(scratch, 'revision');
  const specFile = path.join(scratch, 'revision.json');
  await writeFile(specFile, JSON.stringify(spec));
  const build = spawnSync(process.execPath, [path.join(here, 'build.mjs'), specFile, revision], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (build.status !== 0) throw new Error(`Disposable copy build failed: ${build.stderr}`);
  const revised = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await revised.goto(pathToFileURL(path.join(revision, 'index.html')).href);
  await revised.waitForFunction(() => window.__motionReady === true, {}, { timeout: 20000 });
  const copyCheck = [];
  for (const t of [.8, 3.2, 5.6, 7.2]) {
    const fraction = await difference(await frame(t), await frame(t, revised));
    const expected = t === .8 || t === 5.6;
    if (expected ? fraction < .001 : fraction !== 0) throw new Error(`Copy change affected an unintended beat at ${t}: ${fraction}`);
    copyCheck.push({ time: t, changedPixelFraction: fraction, expectedChange: expected });
  }
  const evidence = { status: 'PASS', samples, motion, materialCuts: cuts, wordContacts: contacts, safeArea: lockup, nonlinearSeekPixelIdentity: true,
    negativeControls: { blankRejected, freezeRejected }, copyRevision: { disposableHeadline: spec.copy.headline, samples: copyCheck },
    limitations: ['Software Chromium pixels; not physical-phone GPU behavior', 'No direct subjective listening', 'Abstract graphics, not product UI/output proof'] };
  await mkdir(path.join(here, 'qa'), { recursive: true });
  await writeFile(path.join(here, 'qa/source-check.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log('PASS: startup, 15 nonblank frames, four motion windows, exact material cuts, safe close, repeat seek pixel identity, copy revision; blank/freeze negative controls rejected.');
} finally { await browser.close(); }
