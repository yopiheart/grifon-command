import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { readFile, mkdir, writeFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { posts } from './posts.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const runtimeIndex = args.indexOf('--runtime-root');
const runtimeRoot = runtimeIndex >= 0 ? args[runtimeIndex + 1] : undefined;
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--runtime-root' && args[index + 1] && !args[index + 1].startsWith('--')) { index++; continue; }
  if (args[index] === '--serve') continue;
  throw new Error('Usage: node qa-smoke.mjs [--runtime-root <existing-checkout>] [--serve]');
}
const require = createRequire(runtimeRoot ? path.join(path.resolve(runtimeRoot), 'package.json') : import.meta.url);
const { chromium } = require('playwright');
const sharp = require('sharp');
const qa = path.join(here, 'qa');
await mkdir(qa, { recursive: true });
const packagePrefix = '/clients/oceanides/flagship-2026-10/';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.ttf': 'font/ttf' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    // Inspect the unnormalized path so dot segments cannot disappear before validation.
    const pathname = decodeURIComponent(request.url.split('?')[0]);
    if (!pathname.startsWith(packagePrefix) || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some((part) => part.startsWith('.'))) {
      response.writeHead(403); response.end(); return;
    }
    const local = pathname.slice(packagePrefix.length);
    const filename = path.resolve(here, local.endsWith('/') || !local ? `${local}index.html` : local);
    const relative = path.relative(here, filename);
    if (relative.startsWith('..') || path.isAbsolute(relative)) { response.writeHead(403); response.end(); return; }
    const resolved = await realpath(filename);
    const resolvedRelative = path.relative(here, resolved);
    if (resolvedRelative.startsWith('..') || path.isAbsolute(resolvedRelative)) { response.writeHead(403); response.end(); return; }
    const content = await readFile(resolved);
    response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(404); response.end('Not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = `${origin}${packagePrefix}`;

if (args.includes('--serve')) {
  console.log(`Manual smoke helper PID ${process.pid}: ${base}`);
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
} else {
  const report = { status: 'running', checks: [], errors: [], screenshots: [], viewports: [], stageHeadingBounds: [], browser: 'Chromium via Playwright', externalRequests: [], writeRequests: [] };
  let regression;
  try { regression = JSON.parse(await readFile(path.join(qa, 'regression.json'), 'utf8')); } catch {}
  if (!regression) {
    try {
      const previous = JSON.parse(await readFile(path.join(qa, 'report.json'), 'utf8'));
      const failure = previous.checks.find((item) => item.name === 'embedded mobile inquiry presents each new stage heading within its frame' && item.status === 'fail');
      if (failure && previous.stageHeadingBounds.some((item) => item.mode === 'embedded' && item.y < 0)) regression = {
        issue: 'Embedded mobile inquiry retained its previous scroll position after Next, hiding the new stage heading.',
        before: { status: previous.status, passed: previous.checks.filter((item) => item.status === 'pass').length, total: previous.checks.length, failure: failure.error, bounds: previous.stageHeadingBounds.filter((item) => item.mode === 'embedded') },
      };
    } catch {}
  }
  let browser;
  const check = async (name, fn) => {
    try { await fn(); report.checks.push({ name, status: 'pass' }); console.log(`PASS ${name}`); }
    catch (error) { report.checks.push({ name, status: 'fail', error: error.message }); report.errors.push(`${name}: ${error.message}`); console.error(`FAIL ${name}: ${error.message}`); }
  };
  try {
    await check('local HTTP helper rejects outside paths, dot segments and hidden files', async () => {
      const getStatus = (pathname) => new Promise((resolve, reject) => {
        const request = httpRequest(`${origin}/`, { method: 'GET', path: pathname }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode)); });
        request.on('error', reject);
        request.end();
      });
      for (const pathname of ['/AGENTS.md', '/clients/oceanides/DESIGN.md', `${packagePrefix}.env`, `${packagePrefix}templates/../posts.mjs`, `${packagePrefix}%2e%2e/DESIGN.md`, `${packagePrefix}templates%2f..%2fposts.mjs`, `${packagePrefix}templates%5c..%5cposts.mjs`]) assert.equal(await getStatus(pathname), 403, `path was not rejected: ${pathname}`);
      assert.equal(await getStatus(packagePrefix), 200);
      assert.equal(await getStatus(`${packagePrefix}templates/logo.webp`), 200);
    });
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Deliberately unavailable for fallback test'); } } });
    });
    const runtimeErrors = [];
    const failedResponses = [];
    context.on('page', (page) => {
      page.on('pageerror', (error) => runtimeErrors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
    });
    context.on('request', (request) => {
      if (/^https?:/.test(request.url()) && !request.url().startsWith(`${origin}/`)) report.externalRequests.push(request.url());
      if (!['GET', 'HEAD'].includes(request.method())) report.writeRequests.push({ method: request.method(), url: request.url() });
    });
    context.on('response', (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (/^https?:/.test(url) && !url.startsWith(`${origin}/`)) await route.abort();
      else await route.continue();
    });
    const page = await context.newPage();
    const ready = async (target) => {
      await target.evaluate(async () => {
        for (const image of document.images) image.loading = 'eager';
        await document.fonts.ready;
        await Promise.all([...document.images].filter((image) => image.getAttribute('src')).map((image) => image.decode()));
      });
    };
    const noOverflow = async (target) => {
      const measure = await target.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, broken: [...document.images].filter((image) => image.getAttribute('src') && (!image.complete || !image.naturalWidth)).map((image) => image.alt) }));
      assert.ok(measure.width <= measure.viewport + 1, `horizontal overflow: ${measure.width} at ${measure.viewport}px`);
      assert.deepEqual(measure.broken, [], 'missing images');
    };
    await page.goto(base, { waitUntil: 'networkidle' });
    for (const width of [1440, 390, 320]) {
      await check(`gallery layout and assets at ${width}px`, async () => {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await ready(page);
        await noOverflow(page);
        report.viewports.push({ page: 'gallery', width, pass: true });
        if (width !== 320) {
          const filename = `gallery-${width}.jpg`;
          await page.screenshot({ path: path.join(qa, filename), fullPage: true, type: 'jpeg', quality: 80 });
          report.screenshots.push(filename);
        }
      });
    }
    await check('gallery family filters show two each and all six', async () => {
      for (const family of ['problem', 'proof', 'decision', 'all']) {
        await page.locator(`[data-filter="${family}"]`).click();
        assert.equal(await page.locator('.post-card:visible').count(), family === 'all' ? 6 : 2);
        assert.equal(await page.locator(`[data-filter="${family}"]`).getAttribute('aria-pressed'), 'true');
      }
    });
    await check('mobile poster preview is unobscured and detail controls meet 44px target', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator('.image-action:visible').count(), 0, 'mobile poster overlay hides export content');
      for (const button of await page.locator('.card-meta .icon-button').all()) {
        const bounds = await button.boundingBox();
        assert.ok(bounds.width >= 44 && bounds.height >= 44, `details target is ${bounds.width}x${bounds.height}`);
      }
    });
    await check('proof slider responds to keyboard', async () => {
      await page.locator('#proof-slider').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#proof-slider').inputValue(), '51');
      assert.equal(await page.locator('.compare').evaluate((element) => element.style.getPropertyValue('--split')), '51%');
    });
    await check('render manifest matches current creative sources and output dimensions', async () => {
      const manifest = JSON.parse(await readFile(path.join(here, 'out/manifest.json'), 'utf8'));
      assert.equal(manifest.length, 6);
      for (const post of posts) {
        const entry = manifest.find((item) => item.id === post.id);
        assert.ok(entry, `missing manifest entry ${post.id}`);
        for (const key of ['slug', 'title', 'caption', 'inspiration', 'assetSources', 'proofContext', 'publicationStatus', 'destination']) assert.deepEqual(entry[key], post[key], `stale ${key} in manifest for ${post.id}`);
        assert.deepEqual(entry.verification.issues, []);
        for (const source of post.assetSources) assert.ok((await readFile(path.join(repo, source))).length > 0, `missing source ${source}`);
        const metadata = await sharp(path.join(here, 'out', entry.outputs.webp)).metadata();
        assert.deepEqual([metadata.width, metadata.height], [1080, 1350]);
      }
    });
    await check('all modal captions, sources and local exports are usable', async () => {
      for (const post of posts) {
        const opener = page.locator(`.post-open[data-open="${post.id}"]`);
        await opener.click();
        assert.ok(await page.locator('#creative-dialog').evaluate((element) => element.open));
        assert.equal(await page.locator('#dialog-caption').inputValue(), post.caption);
        assert.ok(!(await page.locator('#dialog-proof').textContent()).includes('[object Object]'), 'proof provenance renders as an object rather than text');
        const href = await page.locator('#download-post').getAttribute('href');
        assert.equal(href, `out/${post.slug}.png`);
        assert.equal(await page.locator('#open-inquiry').getAttribute('href'), `inquiry.html?post=${post.id}`);
        const dimensions = await sharp(path.join(here, href)).metadata();
        assert.deepEqual([dimensions.width, dimensions.height], [2160, 2700]);
        assert.equal((await context.request.get(`${base}${href}`)).status(), 200);
        await page.keyboard.press('Escape');
        assert.ok(!(await page.locator('#creative-dialog').evaluate((element) => element.open)));
        assert.ok(await opener.evaluate((element) => element === document.activeElement), 'focus did not return to opener');
      }
    });
    await check('caption copy fallback selects the whole caption', async () => {
      if (await page.locator('#creative-dialog').evaluate((element) => element.open)) await page.keyboard.press('Escape');
      await page.locator('.post-open[data-open="01"]').click();
      await page.locator('#copy-caption').click();
      assert.match(await page.locator('#copy-status').textContent(), /selected/i);
      assert.ok(await page.locator('#dialog-caption').evaluate((element) => element.selectionStart === 0 && element.selectionEnd === element.value.length));
      await page.keyboard.press('Escape');
    });
    await page.goto(`${base}inquiry.html?post=03`, { waitUntil: 'networkidle' });
    for (const width of [1440, 390, 320]) {
      await check(`inquiry layout and assets at ${width}px`, async () => {
        await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
        await ready(page);
        await noOverflow(page);
        report.viewports.push({ page: 'inquiry', width, pass: true });
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await check('inquiry validation and privacy scope', async () => {
      assert.match(await page.locator('.preview-banner').textContent(), /Walang request/);
      assert.equal(await page.locator('input[type="email"], input[type="tel"], input[name="name"]').count(), 0);
      await page.locator('[data-next="1"]').click();
      assert.ok(await page.locator('#error-0').isVisible());
      assert.ok(await page.locator('[data-panel="0"]').isVisible());
      await page.locator('input[name="problem"][value="returning-clog"]').check();
      await page.locator('input[name="role"][value="tenant"]').check();
      assert.ok(await page.locator('#tenant-note').isVisible());
      await page.locator('[data-next="1"]').click();
      assert.ok(await page.locator('[data-panel="1"]').isVisible());
      const bounds = await page.locator('#details-title').boundingBox();
      report.stageHeadingBounds.push({ mode: 'standalone', stage: 'details', y: bounds.y, height: bounds.height, viewportHeight: 844 });
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844, `new Details heading outside mobile viewport: y=${bounds.y}, height=${bounds.height}`);
      await page.locator('[data-next="2"]').click();
      assert.ok(await page.locator('#error-1').isVisible());
      assert.ok(await page.locator('[data-panel="1"]').isVisible());
    });
    await check('inquiry tenant and unknown tank journey ends in an honest copyable summary', async () => {
      await page.locator('#city').selectOption('Quezon City');
      await page.locator('input[name="tank"][value="unsure"]').check();
      assert.ok(await page.locator('#tank-note').isVisible());
      assert.match(await page.locator('#tank-note').textContent(), /Hindi kailangang buksan/);
      await page.locator('input[name="timing"][value="urgent"]').check();
      await page.locator('[data-next="2"]').click();
      assert.ok(await page.locator('[data-panel="2"]').isVisible());
      const bounds = await page.locator('#review-title').boundingBox();
      report.stageHeadingBounds.push({ mode: 'standalone', stage: 'review', y: bounds.y, height: bounds.height, viewportHeight: 844 });
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844, `new Review heading outside mobile viewport: y=${bounds.y}, height=${bounds.height}`);
      const summary = await page.locator('#summary-text').inputValue();
      for (const text of ['Pabalik-balik ang bara', 'Tenant', 'Quezon City', 'Hindi pa sure', 'Walang request na ipinadala', 'Walang booking, coverage, o schedule na nakumpirma']) assert.ok(summary.includes(text), `summary missing ${text}`);
      assert.equal(await page.locator('#review-notes p').count(), 2);
      await noOverflow(page);
      const filename = 'inquiry-summary-390.jpg';
      await page.screenshot({ path: path.join(qa, filename), fullPage: true, type: 'jpeg', quality: 80 });
      report.screenshots.push(filename);
      await page.locator('#copy-summary').click();
      assert.match(await page.locator('#copy-status').textContent(), /Naka-select/);
      assert.ok(await page.locator('#summary-text').evaluate((element) => element.selectionStart === 0 && element.selectionEnd === element.value.length));
      await page.locator('#select-summary').click();
      assert.ok(await page.locator('#summary-text').evaluate((element) => element.selectionEnd === element.value.length));
    });
    await check('inquiry edit, outside NCR, back and reset preserve expected state', async () => {
      await page.locator('[data-panel="2"] [data-back="1"]').click();
      assert.equal(await page.locator('#city').inputValue(), 'Quezon City');
      await page.locator('#city').selectOption('outside-ncr');
      await page.locator('[data-panel="1"] [data-back="0"]').click();
      assert.ok(await page.locator('input[name="role"][value="tenant"]').isChecked());
      await page.locator('input[name="role"][value="owner"]').check();
      await page.locator('[data-next="1"]').click();
      await page.locator('[data-next="2"]').click();
      assert.equal(await page.locator('#review-city').textContent(), 'Outside NCR');
      assert.equal(await page.locator('#review-role').textContent(), 'Owner');
      await page.locator('#restart').click();
      assert.ok(await page.locator('[data-panel="0"]').isVisible());
      assert.equal(await page.locator('input:checked').count(), 0);
      assert.equal(await page.locator('#city').inputValue(), '');
      assert.ok(await page.locator('[data-step="2"]').isDisabled());
    });
    await check('unknown and malicious source query are inert', async () => {
      for (const post of ['999', '<img src=x onerror="window.__injected=1">', '</script><script>window.__injected=1</script>', '03&city=<script>window.__injected=1</script>']) {
        await page.goto(`${base}inquiry.html?post=${encodeURIComponent(post)}`, { waitUntil: 'networkidle' });
        assert.ok(await page.locator('[data-panel="0"]').isVisible());
        assert.equal(await page.evaluate(() => window.__injected), undefined);
        assert.ok(!(await page.locator('body').innerText()).includes('window.__injected'));
      }
    });
    await check('embedded mobile inquiry presents each new stage heading within its frame', async () => {
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.locator('iframe[title="Oceanides private inquiry preview"]').scrollIntoViewIfNeeded();
      const inquiry = page.frameLocator('iframe[title="Oceanides private inquiry preview"]');
      await inquiry.locator('input[name="problem"][value="returning-clog"]').check();
      await inquiry.locator('input[name="role"][value="tenant"]').check();
      await inquiry.locator('[data-next="1"]').click();
      const insideViewport = async (id, stage) => {
        const bounds = await inquiry.locator(id).evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { y: rect.y, height: rect.height, viewportHeight: innerHeight };
        });
        report.stageHeadingBounds.push({ mode: 'embedded', stage, ...bounds });
        assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= bounds.viewportHeight, `embedded ${stage} heading outside frame viewport: ${JSON.stringify(bounds)}`);
      };
      await insideViewport('#details-title', 'details');
      await inquiry.locator('#city').selectOption('Quezon City');
      await inquiry.locator('input[name="tank"][value="unsure"]').check();
      await inquiry.locator('input[name="timing"][value="urgent"]').check();
      await inquiry.locator('[data-next="2"]').click();
      await insideViewport('#review-title', 'review');
    });
    await check('no external requests, writes, browser exceptions or missing resources', async () => {
      assert.deepEqual(report.externalRequests, []);
      assert.deepEqual(report.writeRequests, []);
      assert.deepEqual(failedResponses, []);
      assert.deepEqual(runtimeErrors, []);
    });
    // Negative control: demonstrate that the asset check catches an actual broken image.
    await check('negative control rejects a deliberately broken image', async () => {
      await page.route('**/qa-deliberately-missing.png', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: 'invalid PNG' }));
      await page.evaluate(async () => {
        const image = document.createElement('img');
        image.src = 'qa-deliberately-missing.png';
        image.alt = 'QA negative control';
        document.body.append(image);
        await image.decode().catch(() => {});
      });
      await assert.rejects(noOverflow(page), /missing images/);
    });
  } catch (error) { report.errors.push(error.stack || error.message); }
  finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
    report.status = report.errors.length ? 'fail' : 'pass';
    await writeFile(path.join(qa, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    if (regression) {
      regression.after = { status: report.status, passed: report.checks.filter((item) => item.status === 'pass').length, total: report.checks.length, stageCheck: report.checks.find((item) => item.name === 'embedded mobile inquiry presents each new stage heading within its frame')?.status, bounds: report.stageHeadingBounds.filter((item) => item.mode === 'embedded') };
      await writeFile(path.join(qa, 'regression.json'), `${JSON.stringify(regression, null, 2)}\n`);
    }
  }
  console.log(`${report.status.toUpperCase()}: ${report.checks.filter((item) => item.status === 'pass').length}/${report.checks.length} checks; server and browser closed.`);
  if (report.errors.length) process.exitCode = 1;
}
