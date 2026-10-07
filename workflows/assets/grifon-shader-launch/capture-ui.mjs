// Offline component mount patterned after tests/e2e/dashboard-states.spec.ts.
// No Vite middleware, environment files, account session, generation or provider call.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command');
const require = createRequire(path.join(PRIMARY, 'package.json'));
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const sharp = require('sharp');
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const read = relative => fs.readFileSync(path.join(ROOT, relative));
const relative = file => path.relative(ROOT, file).replaceAll('\\', '/');
const captures = path.join(HERE, 'assets/captures');
const qa = path.join(HERE, 'qa');
fs.mkdirSync(captures, { recursive: true });
fs.mkdirSync(qa, { recursive: true });

const sourcePaths = [
  'components/MarketResearch.tsx', 'components/Step3AdScript.tsx', 'components/Step5Storyboard.tsx',
  'types.ts', 'index.css', 'index.html', 'tailwind.config.js',
];
const sources = sourcePaths.map(file => ({ path: file, sha256: sha(read(file)) }));
const fixture = path.join(HERE, 'capture-fixtures.tsx');
const originalImages = ['after-0.8.png', 'after-4.15.png', 'after-6.8.png']
  .map(file => `workflows/assets/grifon-shader-study/qa/${file}`);
const assets = originalImages.map(file => `data:image/png;base64,${read(file).toString('base64')}`);
const imageHashes = originalImages.map(file => ({ path: file, sha256: sha(read(file)) }));
const inter = read('workflows/assets/grifon-shader-study/assets/inter-variable.ttf').toString('base64');
const { default: config } = await import(pathToFileURL(path.join(ROOT, 'tailwind.config.js')).href);
const cssConfig = { ...config, content: config.content.map(glob => path.join(ROOT, glob).replaceAll('\\', '/')) };
const css = (await postcss([tailwindcss(cssConfig)]).process(read('index.css').toString(), { from: path.join(ROOT, 'index.css') })).css;
const globalStyle = read('index.html').toString().match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!globalStyle || /@import|url\(/i.test(globalStyle)) throw Error('Unexpected remote stylesheet input');
const { outputFiles, metafile, warnings } = await esbuild.build({
  entryPoints: [fixture], bundle: true, write: false, platform: 'browser', format: 'iife',
  target: 'chrome120', nodePaths: [path.join(PRIMARY, 'node_modules')],
  define: { 'import.meta.env': '{}', 'process.env.NODE_ENV': '"production"' },
  minify: true, metafile: true, logLevel: 'silent',
});
if (warnings.length) throw Error(`Fixture bundle warnings: ${warnings.map(w => w.text).join('; ')}`);
const script = outputFiles[0].contents;
const fixtureStyle = `
@font-face{font-family:Inter;src:url(data:font/ttf;base64,${inter}) format('truetype');font-weight:100 900;font-style:normal;font-display:block}
body{margin:0}.capture-disclosure{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 30px;background:#09090B;border-bottom:1px solid #FFCC004D;font-family:Inter,sans-serif;color:#FFCC00;font-size:22px;font-weight:600;letter-spacing:0;text-transform:none}
.capture-disclosure small{color:#A1A1AA;font-size:14px;font-weight:400}.capture-fixture{max-width:1160px;margin:24px auto;padding:0 24px}.capture-research{max-width:none;margin:0;padding:0}
@media(max-width:767px){.capture-disclosure{padding:14px 18px;font-size:20px}.capture-disclosure small{font-size:12px}.capture-fixture{margin:16px auto;padding:0 16px}.capture-research{margin:0;padding:0}}
`;
const html = Buffer.from(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grifon example project capture</title><style>${globalStyle}</style><style>${css}</style><style>${fixtureStyle}</style></head><body><div id="root"></div><script>window.__captureAssets=${JSON.stringify(assets)};</script><script src="/fixture.js"></script></body></html>`);
const server = http.createServer((request, response) => {
  const route = new URL(request.url, 'http://127.0.0.1').pathname;
  if (request.method !== 'GET' || !['/', '/fixture.js'].includes(route)) { response.writeHead(404); response.end(); return; }
  response.writeHead(200, { 'Content-Type': route === '/' ? 'text/html; charset=utf-8' : 'text/javascript', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'" });
  response.end(route === '/' ? html : script);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const blocked = [], api = [], errors = [], requested = [], results = [];
let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--disable-gpu-rasterization'] });
  for (const surface of ['research', 'script', 'storyboard']) {
    for (const portrait of [false, true]) {
      const viewport = portrait ? { width: 540, height: 750 } : { width: 1280, height: 900 };
      const context = await browser.newContext({ viewport, deviceScaleFactor: portrait ? 2 : 1.5, serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const url = route.request().url();
        requested.push({ surface, portrait, url: url.replace(origin, 'LOCAL_ORIGIN') });
        if (new URL(url).pathname.startsWith('/api/')) { api.push(url); return route.abort(); }
        if (url.startsWith(origin + '/')) return route.continue();
        blocked.push(url); return route.abort();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push({ surface, portrait, error: error.message }));
      await page.goto(`${origin}/?surface=${surface}`);
      await page.locator('#example-project').waitFor({ state: 'visible' });
      if (surface === 'research') {
        await page.locator('#brandName').fill('Grifon');
        await page.locator('#productName').fill('Research / Script / Storyboard');
        await page.locator('#productDescription').fill('Give your next ad a clear direction.');
        if (await page.locator('#priceOffer').inputValue() !== '') throw Error('Research offer must stay empty');
      }
      if (surface === 'script') {
        await page.getByText('Hook Variation 1', { exact: true }).waitFor();
        await page.getByText('// Script Body (Shared)', { exact: true }).waitFor();
      }
      if (surface === 'storyboard') {
        await page.getByText('SCENE_01', { exact: true }).waitFor();
        if (await page.getByText('MANUAL_ASSET', { exact: true }).count() !== 3) throw Error('Expected three manual example scenes');
        if (await page.getByText('VISUAL ASSETS MISSING', { exact: true }).count()) throw Error('Example product frames missing');
        const loaded = await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0));
        if (!loaded) throw Error('Example frame failed to load');
      }
      await page.evaluate(async () => { await document.fonts.ready; document.activeElement?.blur(); });
      await page.mouse.move(0, 0);
      const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
      if (storage.local || storage.session) throw Error('Fresh fixture leaked persistent project state');
      const disclosure = await page.locator('#example-project').boundingBox();
      if (!disclosure || disclosure.y !== 0 || disclosure.height < 50) throw Error('Example disclosure not visible at top');
      const output = path.join(captures, `${portrait ? 'portrait-' : ''}${surface}.png`);
      const png = await page.screenshot({ path: output, type: 'png', animations: 'disabled', fullPage: false });
      const metadata = await sharp(png).metadata();
      results.push({ surface, portrait, path: relative(output), dimensions: [metadata.width, metadata.height], bytes: png.length, sha256: sha(png), disclosure, storage, screenshot: 'real unchanged component; manually prepared content' });
      if (portrait && ['script', 'storyboard'].includes(surface)) {
        const scrollY = surface === 'script' ? 350 : 250;
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
        const pinned = await page.locator('#example-project').boundingBox();
        if (!pinned || pinned.y !== 0) throw Error('Scrolled example disclosure must stay visible');
        const detailPath = path.join(captures, `portrait-${surface}-detail.png`);
        const detailPng = await page.screenshot({ path: detailPath, type: 'png', animations: 'disabled', fullPage: false });
        const detailMetadata = await sharp(detailPng).metadata();
        results.push({ surface, portrait, view: 'native scroll detail', scrollY, path: relative(detailPath), dimensions: [detailMetadata.width, detailMetadata.height], bytes: detailPng.length, sha256: sha(detailPng), disclosure: pinned, storage, screenshot: 'real unchanged component; manually prepared content' });
      }
      await context.close();
    }
  }
  if (api.length || blocked.length || errors.length) throw Error(`Capture runtime failure: ${JSON.stringify({ api, blocked, errors })}`);
  for (const source of sources) if (sha(read(source.path)) !== source.sha256) throw Error(`Product source changed during capture: ${source.path}`);
  const report = {
    status: 'PASS', purpose: 'Private launch film product-interface evidence', fixtureSha256: sha(fs.readFileSync(fixture)), harnessSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
    productSources: sources, exampleImages: imageHashes, bundleInputCount: Object.keys(metafile.inputs).length,
    captures: results, requests: requested, apiRequests: api, externalRequests: blocked, pageErrors: errors,
    noAuthentication: true, freshContextPerCapture: true, providerCalls: 0, newSpend: 0,
    safeguards: ['No Vite server/middleware', 'No environment file read', 'Non-Cinematic Custom Script', 'Preloaded Script', 'Nonempty manual Storyboard', 'avatar:null', 'Fresh isolated browser contexts', 'All API and remote requests blocked', 'CSP connect-src none', 'No analysis/generation button clicks'],
    fonts: 'Local Inter variable; system monospace fallback for JetBrains Mono',
    limitations: ['Manually prepared examples demonstrate existing controls, not generated research quality or instant end-to-end generation.', 'No authenticated user journey or provider generation was tested.', 'Portrait captures show the unchanged responsive component at a 540px CSS viewport; scrolling content below the filmed viewport is omitted.'],
  };
  fs.writeFileSync(path.join(qa, 'product-capture.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`PASS: ${results.length} real component screenshots; zero API/external requests, zero provider calls/spend.`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
