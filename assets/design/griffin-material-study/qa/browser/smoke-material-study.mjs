import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const qa = dirname(fileURLToPath(import.meta.url));
const root = resolve(qa, '../../../../..');
const artifactPath = resolve(root, 'artifacts/griffin-material-study.html');
const manifestPath = resolve(root, 'assets/design/griffin-material-study/comparison.json');
const command = 'node assets/design/griffin-material-study/qa/browser/smoke-material-study.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const relativePath = path => relative(root, path).replaceAll('\\', '/');
const report = {
  command, startedAt: new Date().toISOString(), status: 'FAIL', node: process.version,
  browser: 'Playwright Chromium, headless', offline: true, helperServer: null,
  checks: [], errors: [], console: [], requests: [], viewports: {}, screenshots: [],
  limitations: ['Viewport checks use Chromium, not an Android engine.', 'Saved stills do not establish animation quality or app runtime FPS.'],
};
const check = (name, operation) => {
  try { const result = operation(); report.checks.push({ name, status: 'PASS' }); return result; }
  catch (error) { report.checks.push({ name, status: 'FAIL', error: error.message }); throw error; }
};
const files = directory => existsSync(directory) ? readdirSync(directory, { withFileTypes: true }).flatMap(item => {
  const path = resolve(directory, item.name);
  return item.isDirectory() ? files(path) : [path];
}) : [];
let browser, browserServer;

try {
  mkdirSync(qa, { recursive: true });
  const htmlBytes = readFileSync(artifactPath);
  const html = htmlBytes.toString('utf8');
  const selection = JSON.parse(readFileSync(manifestPath, 'utf8'));
  report.artifactSHA256 = hash(htmlBytes);
  const assetEntries = ['hero', 'front', 'detail', 'profile'].flatMap(view => [
    { name: `${view}-baseline`, ...selection.views[view].baseline },
    { name: `${view}-candidate`, ...selection.views[view].candidate },
  ]).concat([
    { name: 'chat-baseline', ...selection.chat.baseline },
    { name: 'chat-candidate', ...selection.chat.candidate },
  ]);
  const sourcePaths = [
    fileURLToPath(import.meta.url),
    resolve(root, 'tools/artifacts/griffin-material-study.tpl.html'),
    resolve(root, 'tools/artifacts/build-griffin-material-study.mjs'), manifestPath,
    ...files(resolve(root, 'assets/3d-lab/griffin-material-study')).filter(path => extname(path) === '.py'),
    ...assetEntries.map(item => resolve(root, dirname(item.path), 'manifest.json')).filter(existsSync),
  ];
  report.sourcesSHA256 = Object.fromEntries([...new Set(sourcePaths)].sort().map(path => [relativePath(path), hash(readFileSync(path))]));
  report.selectedAssets = [];
  for (const entry of assetEntries) {
    const bytes = readFileSync(resolve(root, entry.path));
    check(`${entry.name}: selected source SHA`, () => assert.equal(hash(bytes), entry.sha256));
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparentPixels = 0, opaquePixels = 0, nonemptyPixels = 0;
    let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
    for (let pixel = 0; pixel < info.width * info.height; pixel++) {
      const alpha = data[pixel * info.channels + 3];
      if (alpha === 0) transparentPixels++;
      if (alpha === 255) opaquePixels++;
      if (alpha > 0) {
        nonemptyPixels++;
        const x = pixel % info.width, y = Math.floor(pixel / info.width);
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
    check(`${entry.name}: PNG decodes and contains pixels`, () => assert.ok(nonemptyPixels > 0));
    if (entry.name.startsWith('chat-')) check(`${entry.name}: transparent, nonempty chat asset`, () => assert.ok(transparentPixels > 0));
    report.selectedAssets.push({ ...entry, width: info.width, height: info.height, transparentPixels, opaquePixels, nonemptyPixels, contentBounds: { minX, minY, maxX, maxY } });
  }
  const dataImages = [...new Set(html.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/g) ?? [])];
  report.embeddedPNGs = [];
  for (const src of dataImages) {
    const bytes = Buffer.from(src.split(',')[1], 'base64');
    const metadata = await sharp(bytes).metadata();
    await sharp(bytes).raw().toBuffer();
    report.embeddedPNGs.push({ sha256: hash(bytes), width: metadata.width, height: metadata.height });
  }
  check('All ten selected PNGs are embedded', () => {
    assert.equal(dataImages.length, 10);
    for (const entry of assetEntries) assert.ok(report.embeddedPNGs.some(item => item.sha256 === entry.sha256));
  });
  check('HTML has no external resource URL', () => assert.ok(!/(?:src|href)\s*=\s*["'](?:https?:)?\/\//i.test(html)));
  check('Solid artifact text; no fixed background attachment', () => {
    const css = html.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/background-clip\s*:\s*text|color\s*:\s*transparent|background-attachment\s*:\s*fixed/i.test(css));
  });
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  report.contentSecurityPolicy = policy;
  check('CSP blocks external dependencies and matches inline blocks', () => {
    assert.ok(policy.includes("default-src 'none'") && policy.includes('img-src data:'));
    for (const tag of ['style', 'script']) {
      const bytes = html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1];
      const base64 = createHash('sha256').update(bytes).digest('base64');
      assert.ok(policy.includes(`${tag}-src 'sha256-${base64}'`));
    }
  });

  browserServer = await chromium.launchServer({ headless: true });
  report.browserPID = browserServer.process().pid;
  browser = await chromium.connect(browserServer.wsEndpoint());
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.setOffline(true);
  const page = await context.newPage();
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) report.console.push({ type: message.type(), message: message.text() }); });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('request', request => report.requests.push({ url: request.url().startsWith('data:') ? 'data:' : request.url(), resourceType: request.resourceType() }));
  await page.goto(pathToFileURL(artifactPath).href, { waitUntil: 'load' });
  const snapshot = () => page.evaluate(async () => {
    await Promise.all([...document.images].map(image => image.decode()));
    const box = element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    const sourceHash = async image => {
      const bytes = Uint8Array.from(atob(image.src.split(',')[1]), character => character.charCodeAt(0));
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    };
    const stage = document.querySelector('#stage'), baseline = document.querySelector('#baseline'), candidate = document.querySelector('#candidate');
    const style = getComputedStyle(baseline), stageBox = box(stage);
    return {
      viewport: { width: innerWidth, height: innerHeight }, scrollY, documentWidth: document.documentElement.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      tabs: [...document.querySelectorAll('[data-view]')].map(button => ({ view: button.dataset.view, pressed: button.getAttribute('aria-pressed'), box: box(button) })),
      baseline: { srcSHA256: await sourceHash(baseline), alt: baseline.alt, naturalWidth: baseline.naturalWidth, naturalHeight: baseline.naturalHeight, box: box(baseline) },
      candidate: { srcSHA256: await sourceHash(candidate), alt: candidate.alt, naturalWidth: candidate.naturalWidth, naturalHeight: candidate.naturalHeight, box: box(candidate) },
      split: document.querySelector('#split').value, output: document.querySelector('#amount').value,
      labels: [...document.querySelectorAll('.labels span')].map(element => ({ text: element.textContent, hidden: element.hidden, display: getComputedStyle(element).display })),
      stageSplit: getComputedStyle(stage).getPropertyValue('--split'), clipPath: style.clipPath,
      divider: box(document.querySelector('.divider')), dividerChildren: document.querySelector('.divider').children.length, stage: stageBox,
      avatars: [...document.querySelectorAll('.avatar')].map(image => ({ box: box(image), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete })),
      ground: { position: getComputedStyle(document.querySelector('.ground')).position, box: box(document.querySelector('.ground')), background: getComputedStyle(document.querySelector('.ground')).backgroundImage },
      panel: { background: getComputedStyle(document.querySelector('.panel')).backgroundImage, shadow: getComputedStyle(document.querySelector('.panel')).boxShadow },
      title: { color: getComputedStyle(document.querySelector('h1')).color, opacity: getComputedStyle(document.querySelector('h1')).opacity },
      fonts: [...document.querySelectorAll('main p, main button, main strong')].map(element => ({ text: element.innerText, size: getComputedStyle(element).fontSize, color: getComputedStyle(element).color })),
      resourceURLs: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => !name.startsWith('data:')),
    };
  });
  const layoutChecks = (state, label) => {
    check(`${label}: exact viewport, no horizontal overflow`, () => assert.equal(state.documentWidth, state.viewport.width));
    check(`${label}: continuous fixed ground`, () => {
      assert.equal(state.ground.position, 'fixed'); assert.equal(state.ground.box.width, state.viewport.width); assert.equal(state.ground.box.height, state.viewport.height);
      assert.equal(state.ground.box.x, 0); assert.equal(state.ground.box.y, 0);
      assert.ok(state.ground.background.includes('radial-gradient'));
    });
    check(`${label}: solid title and layered glass sheen`, () => {
      assert.equal(state.title.color, 'rgb(245, 245, 247)'); assert.equal(state.title.opacity, '1');
      assert.ok(state.panel.background.includes('linear-gradient')); assert.notEqual(state.panel.shadow, 'none');
      assert.equal(state.dividerChildren, 0, 'Comparison handle must not obscure the face');
    });
    check(`${label}: actual 64px avatars`, () => {
      assert.equal(state.avatars.length, 2);
      for (const avatar of state.avatars) { assert.equal(avatar.box.width, 64); assert.equal(avatar.box.height, 64); assert.ok(avatar.complete && avatar.naturalWidth > 0); }
    });
    check(`${label}: no external resource performance entries`, () => assert.deepEqual(state.resourceURLs, []));
  };
  const takeScreenshot = async name => {
    const path = resolve(qa, `${name}.png`);
    await page.screenshot({ path, fullPage: false });
    const dimensions = await sharp(path).metadata();
    const viewport = page.viewportSize();
    check(`${name}: actual viewport screenshot dimensions`, () => {
      assert.equal(dimensions.width, viewport.width); assert.equal(dimensions.height, viewport.height);
    });
    report.screenshots.push({ path: relativePath(path), sha256: hash(readFileSync(path)), width: dimensions.width, height: dimensions.height, capture: 'viewport' });
  };
  report.viewports.desktop = {};
  for (const view of ['hero', 'front', 'detail', 'profile']) {
    await page.locator(`[data-view="${view}"]`).click();
    const state = await snapshot();
    report.viewports.desktop[view] = state;
    check(`Desktop ${view}: matched images and pressed state`, () => {
      assert.equal(state.baseline.srcSHA256, selection.views[view].baseline.sha256);
      assert.equal(state.candidate.srcSHA256, selection.views[view].candidate.sha256);
      assert.equal(state.tabs.filter(item => item.pressed === 'true').length, 1);
      assert.equal(state.tabs.find(item => item.view === view).pressed, 'true');
      assert.equal(state.baseline.alt, `Approved Grifon, ${view} view`);
      assert.equal(state.candidate.alt, `Trial Grifon, ${view} view`);
      assert.equal(state.baseline.naturalWidth, state.candidate.naturalWidth);
      assert.equal(state.baseline.naturalHeight, state.candidate.naturalHeight);
    });
    layoutChecks(state, `Desktop ${view}`);
    await takeScreenshot(`desktop-${view}-1440x1000`);
  }
  report.controls = [];
  for (const [name, value] of [['Approved', 100], ['Compare', 50], ['Trial', 0]]) {
    await page.getByRole('button', { name, exact: true }).click();
    const state = await snapshot(); report.controls.push({ name, state });
    check(`${name} preset: visible clip, divider and output change`, () => {
      assert.equal(state.split, String(value)); assert.equal(state.stageSplit, `${value}%`); assert.equal(state.output, `${value}% approved`);
      assert.equal(state.clipPath, `inset(0px ${100 - value}% 0px 0px)`);
      assert.ok(Math.abs(state.divider.x - (state.stage.x + state.stage.width * value / 100)) < 1);
      assert.equal(state.labels[0].hidden, value === 0);
      assert.equal(state.labels[1].hidden, value === 100);
      assert.equal(state.labels[0].display === 'none', value === 0);
      assert.equal(state.labels[1].display === 'none', value === 100);
    });
    await takeScreenshot(`desktop-profile-${name.toLowerCase()}`);
  }
  await page.locator('#split').press('Home');
  for (let step = 0; step < 37; step++) await page.locator('#split').press('ArrowRight');
  const slider = await snapshot(); report.slider = slider;
  check('Slider input changes actual clip and output', () => {
    assert.equal(slider.split, '37'); assert.equal(slider.output, '37% approved'); assert.equal(slider.clipPath, 'inset(0px 63% 0px 0px)');
  });
  await page.locator('#split').press('ArrowRight');
  const keyboard = await snapshot(); report.keyboard = keyboard;
  check('Keyboard range adjustment changes clip and output', () => {
    assert.equal(keyboard.split, '38'); assert.equal(keyboard.output, '38% approved'); assert.equal(keyboard.clipPath, 'inset(0px 62% 0px 0px)');
  });
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  report.viewports.mobile = {};
  for (const view of ['hero', 'detail']) {
    await page.locator(`[data-view="${view}"]`).click();
    const state = await snapshot(); report.viewports.mobile[view] = state;
    check(`Mobile ${view}: matched images and pressed state`, () => {
      assert.equal(state.baseline.srcSHA256, selection.views[view].baseline.sha256);
      assert.equal(state.candidate.srcSHA256, selection.views[view].candidate.sha256);
      assert.equal(state.tabs.find(item => item.view === view).pressed, 'true');
    });
    layoutChecks(state, `Mobile ${view}`);
    await takeScreenshot(`mobile-${view}-390x844`);
  }
  report.scrolledViewports = {};
  for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 1000 }]]) {
    await page.setViewportSize(viewport);
    await page.locator('.signature').scrollIntoViewIfNeeded();
    const state = await snapshot(); report.scrolledViewports[label] = state;
    check(`${label}: bottom viewport is actually scrolled`, () => assert.ok(state.scrollY > 0));
    layoutChecks(state, `${label} scrolled bottom`);
    await takeScreenshot(`${label}-detail-bottom-${viewport.width}x${viewport.height}`);
  }
  check('No external request attempts while offline', () => assert.ok(report.requests.every(request => /^(?:file|data):/.test(request.url))));
  check('No console/CSP errors or unhandled page errors', () => { assert.deepEqual(report.console, []); assert.deepEqual(report.errors, []); });
  check('Tested artifact and source hashes remain unchanged', () => {
    assert.equal(hash(readFileSync(artifactPath)), report.artifactSHA256);
    for (const [path, sha256] of Object.entries(report.sourcesSHA256)) assert.equal(hash(readFileSync(resolve(root, path))), sha256);
  });
  report.status = 'PASS';
} catch (error) {
  report.errors.push(error.stack ?? error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (browserServer) await browserServer.close();
  report.browserClosed = Boolean(browserServer);
  report.finishedAt = new Date().toISOString();
  report.exitCode = process.exitCode ?? 0;
  writeFileSync(resolve(qa, 'browser-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, exitCode: report.exitCode, checks: report.checks.length, artifactSHA256: report.artifactSHA256, report: relativePath(resolve(qa, 'browser-smoke.json')), errors: report.errors.map(error => error.split('\n')[0]) }));
}
