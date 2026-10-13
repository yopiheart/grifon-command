import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const qaDir = path.resolve('assets/design/typography/qa');
const phase = process.env.TYPOGRAPHY_PHASE || 'current';
const safetyByPage = new WeakMap<Page, { blocked: string[]; externalFontReads: string[]; sharedStaticModuleReads: string[] }>();

test.beforeEach(async ({ page }) => {
  const safety = { blocked: [] as string[], externalFontReads: [] as string[], sharedStaticModuleReads: [] as string[] };
  safetyByPage.set(page, safety);
  // Safe static reads only. Neither app APIs nor external providers are reached.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const local = ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(url.origin);
    // Client-shared preset constants are served by Vite as a static JS module;
    // this exact source import is not a callable API handler.
    const sharedSource = url.pathname === '/api/_lib/omniPresets.ts' && request.resourceType() === 'script';
    const fontRead = ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname) && request.method() === 'GET';
    const description = `${request.method()} ${url.origin}${url.pathname}`;
    if (fontRead) safety.externalFontReads.push(description);
    if (sharedSource && request.method() === 'GET') safety.sharedStaticModuleReads.push(description);
    if ((local && (!url.pathname.startsWith('/api/') || sharedSource) && request.method() === 'GET') || fontRead) return route.continue();
    safety.blocked.push(description);
    return route.abort();
  });
  if (phase === 'baseline') {
    // Pin the pre-edit global rules even if another agent is now editing them.
    // Lossless transport preserves the original public HTML bytes, including its
    // whitespace, without storing trailing whitespace in the reviewable JSON.
    const snapshot = JSON.parse(await readFile(path.join(qaDir, 'preedit-index.json'), 'utf8'));
    const original = Buffer.from(snapshot.contentBase64, 'base64');
    const blob = createHash('sha1').update(`blob ${original.length}\0`).update(original).digest('hex');
    expect(snapshot.encoding).toBe('base64');
    expect(original.length).toBe(snapshot.byteLength);
    expect(snapshot.gitBlob).toBe('f858e5a67e2d050d3819d2fca743bec365f1517f');
    expect(blob, 'decoded snapshot retains the exact original Git blob').toBe(snapshot.gitBlob);
    await page.route('**/index.html', async route => route.fulfill({ contentType: 'text/html', body: original }));
  }
});

test.afterEach(async ({ page }, info) => {
  await mkdir(qaDir, { recursive: true });
  await writeFile(path.join(qaDir, `${phase}-network-${info.title.replace(/[^a-z0-9]+/gi, '-')}.json`), JSON.stringify(safetyByPage.get(page), null, 2));
});

async function record(page: Page, info: TestInfo, name: string) {
  await mkdir(qaDir, { recursive: true });
  const file = path.join(qaDir, `${phase}-${name}`);
  const measurements = await page.locator('[data-type], h1, h2, h3, h4, h5, h6, input, label, button, [data-testid="shared-card"] p, [data-testid="shared-step"] p, [data-testid$="-serif"], .landing-headline, .landing-eyebrow, .landing-hero-description').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { tag: element.tagName, role: element.getAttribute('data-type'), text: element.textContent, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, textTransform: style.textTransform, width: rect.width, height: rect.height, left: rect.left, right: rect.right };
  }));
  const fonts = await page.evaluate(() => Array.from(document.fonts).map(font => ({ family: font.family, weight: font.weight, status: font.status })));
  await writeFile(`${file}.json`, JSON.stringify({ viewport: page.viewportSize(), fonts, measurements }, null, 2));
  await page.screenshot({ path: `${file}.png`, fullPage: true });
  await page.screenshot({ path: `${file}-viewport.png` });
  if (name.startsWith('primitives-')) {
    await page.locator('#shared-input').screenshot({ path: `${file}-input.png` });
    await page.getByRole('button', { name: /save draft/i }).screenshot({ path: `${file}-button.png` });
    await page.locator('[data-testid="shared-card"] h2').screenshot({ path: `${file}-heading.png` });
  }
  await info.attach('computed typography', { path: `${file}.json`, contentType: 'application/json' });
  await info.attach('rendered typography', { path: `${file}.png`, contentType: 'image/png' });
}

async function expectSans(page: Page, selector: string, weight: string) {
  const results = await page.locator(selector).evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { text: element.textContent, family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, tracking: style.letterSpacing, transform: style.textTransform };
  }));
  expect(results.length, selector).toBeGreaterThan(0);
  for (const result of results) {
    expect.soft(result.family, `${selector}: ${result.text} family`).toMatch(/^"?Inter"?(,|$)/);
    expect.soft(result.size, `${selector}: ${result.text} size`).toBe('14px');
    expect.soft(result.weight, `${selector}: ${result.text} weight`).toBe(weight);
    expect.soft(result.tracking, `${selector}: ${result.text} tracking`).toMatch(/^(normal|0px)$/);
    expect.soft(result.transform, `${selector}: ${result.text} case`).toBe('none');
  }
}

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`ordinary UI type and exceptions at ${viewport.width}px`, async ({ page }, info) => {
    const runtimeErrors: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/typography-preview.html');
    await expect(page.getByTestId('typography-fixture')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await record(page, info, `primitives-${viewport.width}`);
    expect.soft(await page.evaluate(() => Array.from(document.fonts).some(font => font.family.replaceAll('"', '') === 'Inter' && font.status === 'loaded')), 'Inter font actually loaded').toBe(true);

    await expectSans(page, '[data-type="body"], [data-type="input"], [data-type="normal-label"]', '400');
    await expectSans(page, '[data-type="button"], [data-testid="segmented-control"] button', '600');
    await expectSans(page, 'label:not([data-type="normal-label"]):not([data-type="mono"])', '600');
    const headings = await page.locator('[data-type="heading"], [data-testid="shared-card"] h2, [data-testid="shared-step"] h2').evaluateAll(elements => elements.map(element => {
      const style = getComputedStyle(element);
      return { text: element.textContent, family: style.fontFamily, weight: style.fontWeight, transform: style.textTransform, tracking: parseFloat(style.letterSpacing) || 0, size: parseFloat(style.fontSize) };
    }));
    for (const heading of headings) {
      expect.soft(heading.family, `${heading.text}: heading family`).toMatch(/^"?Inter"?(,|$)/);
      expect.soft(heading.weight, `${heading.text}: heading weight`).toBe('600');
      expect.soft(heading.transform, `${heading.text}: heading case`).toBe('none');
      expect.soft(Math.abs(heading.tracking / heading.size), `${heading.text}: restrained tracking`).toBeLessThanOrEqual(0.0251);
    }

    const mono = await page.locator('[data-type="mono"]').evaluateAll(elements => elements.map(element => ({ text: element.textContent, family: getComputedStyle(element).fontFamily })));
    for (const value of mono) expect.soft(value.family, `${value.text}: explicit mono survives`).toMatch(/JetBrains Mono|ui-monospace|monospace/i);
    const helperCopy = await page.locator('[data-testid="shared-card"] p, [data-testid="shared-step"] p').evaluateAll(elements => elements.filter(element => element.getAttribute('data-type') !== 'body').map(element => {
      const style = getComputedStyle(element);
      return { family: style.fontFamily, size: parseFloat(style.fontSize), transform: style.textTransform, tracking: style.letterSpacing };
    }));
    for (const copy of helperCopy) {
      expect.soft(copy.family, 'human helper text uses sans').toMatch(/^"?Inter"?(,|$)/);
      expect.soft(copy.size, 'human helper text legibility floor').toBeGreaterThanOrEqual(12);
      expect.soft(copy.transform, 'human helper text case').toBe('none');
      expect.soft(copy.tracking, 'human helper text tracking').toMatch(/^(normal|0px)$/);
    }
    for (const id of ['marketing-serif', 'purchase-serif']) await expect.soft(page.getByTestId(id)).toHaveCSS('font-family', /Instrument Serif/);
    await expect.soft(page.getByTestId('purchase-title')).toHaveCSS('font-weight', '400');
    await expect.soft(page.getByTestId('marketing-title')).toHaveCSS('text-transform', 'none');
    await expect.soft(page.getByTestId('medium-utility')).toHaveCSS('font-weight', '500');
    const artwork = await page.getByTestId('artwork-sample').locator('h2').evaluate(element => {
      const style = getComputedStyle(element);
      return { weight: style.fontWeight, transform: style.textTransform, tracking: parseFloat(style.letterSpacing) / parseFloat(style.fontSize) };
    });
    expect.soft(artwork.weight, 'exported ad artwork heading stays unchanged').toBe('900');
    expect.soft(artwork.transform, 'exported ad artwork heading case stays unchanged').toBe('uppercase');
    expect.soft(artwork.tracking, 'exported ad artwork heading tracking stays unchanged').toBeCloseTo(-0.05, 5);

    const controls = await page.locator('button, input, textarea, select').evaluateAll(elements => elements.map(element => ({ label: element.textContent || element.getAttribute('id'), height: element.getBoundingClientRect().height })));
    for (const control of controls) expect.soft(control.height, `${control.label}: tap target`).toBeGreaterThanOrEqual(44);
    const fit = await page.evaluate(() => ({ viewport: innerWidth, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, overflow: Array.from(document.querySelectorAll('main *')).filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && (rect.left < -0.5 || rect.right > innerWidth + 0.5);
    }).map(element => ({ tag: element.tagName, text: element.textContent?.slice(0, 80) })) }));
    expect.soft(fit.doc, 'document horizontal overflow').toBeLessThanOrEqual(fit.viewport);
    expect.soft(fit.body, 'body horizontal overflow').toBeLessThanOrEqual(fit.viewport);
    expect.soft(fit.overflow, 'clipped or overflowing content').toEqual([]);
    expect(runtimeErrors).toEqual([]);

    await page.getByTestId('segmented-control').getByRole('button', { name: /landscape/i }).click();
    await expect(page.getByTestId('segmented-control').getByRole('button', { name: /landscape/i })).toHaveClass(/border-\[#FFCC00\]/);
    await page.locator('#plain-input').fill('Updated project');
    await expect(page.locator('#plain-input')).toHaveValue('Updated project');
  });
}

async function publicSignedOutFixture(page: Page) {
  // Mount real App routes with only Supabase's signed-out boot result replaced.
  // Missing local VITE config cannot otherwise render the public page on :5173.
  // Any attempted sign-in is still blocked, and no stored account is used.
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const denied = async () => { throw new Error('Typography smoke does not perform authentication.'); };
      export const getSupabase = () => ({ auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      }});
      export const signInWithProvider = denied;
      export const signInWithGoogle = denied;
      export const sendEmailOtp = denied;
      export const verifyEmailOtp = denied;
      export const signUpWithPassword = denied;
      export const requestPasswordReset = denied;
      export const resendSignupConfirmation = denied;
      export const updatePassword = denied;
      export const saveBusinessVertical = denied;
    `,
  }));
}

for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`real public components with signed-out boot stub at ${viewport.width}px`, async ({ page }, info) => {
    const runtimeErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedReads: string[] = [];
    page.on('pageerror', error => runtimeErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 500)); });
    page.on('requestfailed', request => { const url = new URL(request.url()); failedReads.push(`${request.method()} ${url.origin}${url.pathname}`); });
    await page.setViewportSize(viewport);
    await publicSignedOutFixture(page);
    await page.goto('/');
    try {
      await expect(page.locator('#landing-headline')).toBeVisible();
    } catch {
      const renderedError = await page.locator('body').innerText();
      throw new Error(`Public route did not render; browser errors: ${runtimeErrors.join('; ') || 'none captured'}; console: ${consoleErrors.join('; ')}; failed reads: ${failedReads.join('; ')}; rendered error: ${renderedError.slice(0, 500)}`);
    }
    await page.evaluate(() => document.fonts.ready);
    await record(page, info, `landing-${viewport.width}`);
    await expect(page.locator('#landing-headline')).toHaveCSS('font-weight', '400');
    await expect(page.locator('#landing-headline')).toHaveCSS('text-transform', 'none');
    await expect(page.locator('#landing-headline .font-serif')).toHaveCSS('font-family', /Instrument Serif/);
    await expect(page.locator('#landing-headline .font-serif')).toHaveCSS('font-weight', '400');
    const eyebrow = await page.locator('.landing-eyebrow').first().evaluate(element => ({ family: getComputedStyle(element).fontFamily, size: getComputedStyle(element).fontSize }));
    expect(eyebrow.family).toMatch(/JetBrains Mono/);
    expect(eyebrow.size).toBe('10px');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    expect(runtimeErrors).toEqual([]);

    await page.goto('/login');
    await expect(page.locator('.auth-gateway')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await record(page, info, `login-${viewport.width}`);
    await expect(page.locator('.auth-gateway h1')).toHaveCSS('font-weight', '400');
    await expect(page.locator('.auth-gateway h1')).toHaveCSS('text-transform', 'none');
    await expectSans(page, '.auth-gateway input[type="email"]', '400');
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeDisabled();
    const loginButtons = await page.locator('.auth-gateway button').evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width > 0).map(element => ({ text: element.textContent, family: getComputedStyle(element).fontFamily, weight: getComputedStyle(element).fontWeight, transform: getComputedStyle(element).textTransform })));
    for (const button of loginButtons) {
      expect.soft(button.family, `${button.text}: login button family`).toMatch(/^"?Inter"?(,|$)/);
      expect.soft(button.weight, `${button.text}: login button weight`).toBe('600');
      expect.soft(button.transform, `${button.text}: login button case`).toBe('none');
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    expect(runtimeErrors).toEqual([]);
  });
}
