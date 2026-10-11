import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { posts } from './posts.mjs';
import { renderPost } from './templates/render-post.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const valueFor = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const runtimeRoot = valueFor('--runtime-root');
const only = valueFor('--only');
const selected = only ? posts.filter((post) => post.id === only) : posts;
if (!selected.length) throw new Error(`Unknown post ID: ${only}`);
for (let i = 0; i < args.length; i++) {
  if (['--runtime-root', '--only'].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith('--')) { i++; continue; }
  throw new Error(`Usage: node build-posts.mjs [--runtime-root <existing-checkout>] [--only <post ID>]. Unknown or incomplete argument: ${args[i]}`);
}

const require = createRequire(runtimeRoot ? path.join(path.resolve(runtimeRoot), 'package.json') : import.meta.url);
let chromium, sharp;
try {
  ({ chromium } = require('playwright'));
  sharp = require('sharp');
} catch (error) {
  throw new Error('Existing playwright and sharp dependencies are required. Use --runtime-root <existing-checkout> when this worktree has no node_modules.', { cause: error });
}

const out = path.join(here, 'out');
await mkdir(out, { recursive: true });
const dataUrl = async (filename, type) => `data:${type};base64,${(await readFile(filename)).toString('base64')}`;
const source = path.join(repo, 'clients/oceanides/assets');
const [baseCss, varietyCss, anton, inter, logo, ba2Before, ba2After, ba3Before, ba3After, truck, inquiryUI] = await Promise.all([
  readFile(path.join(here, 'posts.css'), 'utf8'),
  readFile(path.join(here, 'templates/variety.css'), 'utf8'),
  dataUrl(path.join(here, 'templates/fonts/Anton-Regular.ttf'), 'font/ttf'),
  dataUrl(path.join(here, 'templates/fonts/InterVariable.ttf'), 'font/ttf'),
  dataUrl(path.join(repo, 'funnels/oceanides-price-page/public/img/logo.webp'), 'image/webp'),
  dataUrl(path.join(source, 'tb2-ba2-before.png'), 'image/png'),
  dataUrl(path.join(source, 'tb2-ba2-after.png'), 'image/png'),
  dataUrl(path.join(source, 'tb2-ba3-before.png'), 'image/png'),
  dataUrl(path.join(source, 'tb2-ba3-after.png'), 'image/png'),
  dataUrl(path.join(repo, 'funnels/oceanides-price-page/public/img/hero-truck.webp'), 'image/webp'),
  dataUrl(path.join(here, 'templates/inquiry-ui.webp'), 'image/webp'),
]);
const css = `${baseCss}\n${varietyCss}`;
const assets = { logo, ba2Before, ba2After, ba3Before, ba3After, truck, inquiryUI };
const browser = await chromium.launch();
const manifest = [];

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  for (const post of selected) {
    browserErrors.length = 0;
    const htmlPath = path.join(out, `${post.slug}.html`);
    const pngPath = path.join(out, `${post.slug}.png`);
    const webpPath = path.join(out, `${post.slug}.webp`);
    await writeFile(htmlPath, renderPost(post, { css, assets, fonts: { anton, inter } }), 'utf8');
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    const checks = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas');
      const bounds = canvas.getBoundingClientRect();
      const issues = [];
      if (bounds.width !== 1080 || bounds.height !== 1350) issues.push('Canvas dimensions are not 1080x1350');
      if (canvas.scrollWidth > 1080 || canvas.scrollHeight > 1350) issues.push('Canvas content overflows');
      for (const image of document.images) if (!image.complete || !image.naturalWidth) issues.push(`Image did not load: ${image.alt}`);
      if (!document.fonts.check('400 40px Anton') || !document.fonts.check('400 30px Inter') || !document.fonts.check('800 30px Inter')) issues.push('Brand fonts did not load');
      const heading = document.querySelector('h1');
      if (getComputedStyle(heading).fontWeight !== '400') issues.push('Anton display has synthetic bold');
      for (const element of canvas.querySelectorAll('*')) {
        const rect = element.getBoundingClientRect();
        if (rect.left < bounds.left - 1 || rect.top < bounds.top - 1 || rect.right > bounds.right + 1 || rect.bottom > bounds.bottom + 1) issues.push(`Element outside canvas: ${element.className || element.tagName}`);
        if (element.childNodes.length && [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())) {
          const range = document.createRange();
          range.selectNodeContents(element);
          for (const textRect of range.getClientRects()) {
            if (textRect.left < bounds.left - 1 || textRect.right > bounds.right + 1 || textRect.top < bounds.top - 1 || textRect.bottom > bounds.bottom + 1) issues.push(`Text clipped by canvas: ${element.className || element.tagName}`);
          }
        }
      }
      return { issues: [...new Set(issues)], loadedImages: document.images.length, fonts: document.fonts.status };
    });
    if (checks.issues.length || browserErrors.length) throw new Error(`${post.slug}: ${[...checks.issues, ...browserErrors].join('; ')}`);
    await page.locator('#canvas').screenshot({ path: pngPath });
    await sharp(pngPath).resize(1080, 1350).webp({ quality: 88 }).toFile(webpPath);
    const png = await sharp(pngPath).metadata();
    const webp = await sharp(webpPath).metadata();
    if (png.width !== 2160 || png.height !== 2700 || webp.width !== 1080 || webp.height !== 1350) throw new Error(`${post.slug}: output dimensions mismatch`);
    manifest.push({ ...post, outputs: { html: `${post.slug}.html`, png: `${post.slug}.png`, webp: `${post.slug}.webp` }, verification: { ...checks, png: [png.width, png.height], webp: [webp.width, webp.height] } });
    console.log(`PASS ${post.slug}: PNG ${png.width}x${png.height}, WEBP ${webp.width}x${webp.height}; ${checks.loadedImages} images; fonts ${checks.fonts}; no canvas overflow`);
  }
  await writeFile(path.join(out, only ? `manifest-${only}.json` : 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
} finally {
  await browser.close();
}
