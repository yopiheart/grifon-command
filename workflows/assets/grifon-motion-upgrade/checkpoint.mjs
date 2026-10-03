// Offline production-frame inspection; this does not open the user preview.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/playwright/package.json')));
const require = createRequire(path.join(deps, 'package.json'));
const { chromium } = require('playwright'), sharp = require('sharp');
const scratch = path.join(root, '.tmp/grifon-motion-upgrade/checkpoint');
await mkdir(scratch, { recursive: true });
const times = process.argv.slice(2).map(Number);
if (!times.length || times.some(t => !Number.isFinite(t))) throw new Error('Specify seconds to inspect.');
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
  await page.waitForFunction(() => window.__motionReady || window.__motionError, {}, { timeout: 30000 });
  const error = await page.evaluate(() => window.__motionError);
  if (error || errors.length) throw new Error(error || errors.join('; '));
  const entries = [];
  for (const t of times) {
    await page.evaluate(t => window.seekComposition(t), t);
    const png = await page.screenshot({ type: 'png' });
    await writeFile(path.join(scratch, `at-${t}.png`), png);
    entries.push({ input: await sharp(png).resize(640, 360).toBuffer(), left: ((entries.length) % 3) * 640, top: Math.floor(entries.length / 3) * 360 });
  }
  await sharp({ create: { width: 1920, height: Math.ceil(times.length / 3) * 360, channels: 3, background: '#09090B' } }).composite(entries).jpeg({ quality: 90 }).toFile(path.join(scratch, 'sheet.jpg'));
  console.log(JSON.stringify({ status: 'CHECKPOINT_ONLY', times, folder: scratch, runtimeErrors: errors }));
} finally { await browser.close(); }
