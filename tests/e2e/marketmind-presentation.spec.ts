import { test, expect, type Page } from '@playwright/test';
import { savedMarketMindReport, sparseMarketMindReport } from './fixtures/marketMindReport';

async function savedReportFixture(page: Page, report: object) {
  const apiAttempts: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    apiAttempts.push(route.request().url());
    return route.abort();
  });
  await page.route('https://**', route => route.abort());
  await page.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `export async function generateMarketResearch(){window.__generationAttempts++;throw new Error('Generation forbidden in saved-report fixture');}
      export const generatePremiseCheck=generateMarketResearch;`,
  }));
  await page.route(/\/App\.tsx(?:\?.*)?$/, route => route.fulfill({
    contentType: 'application/javascript',
    body: `import React from '/node_modules/.vite/deps/react.js';
      import MarketResearch from '/components/MarketResearch.tsx';
      export default function App(){return React.createElement(MarketResearch,{
        onBack:()=>{window.__back=true;},onNavigate:id=>{window.__selectedModule=id;}
      });}`,
  }));
  await page.addInitScript(data => {
    localStorage.clear();
    localStorage.setItem('marketMindReport', JSON.stringify(data));
    localStorage.setItem('marketMindReportSavedAt', '1791648000000');
    localStorage.setItem('marketMindUserInputs', JSON.stringify({ productName: 'Northstar Bakery', productDescription: 'A saved customer brief.' }));
    (window as any).__generationAttempts = 0;
  }, report);
  await page.goto('/app');
  await page.getByRole('button', { name: 'VIEW REPORT', exact: true }).click();
  return { apiAttempts, errors };
}

for (const width of [390, 1280]) {
  test(`saved MarketMind report exposes evidence and campaign choices at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const { apiAttempts, errors } = await savedReportFixture(page, savedMarketMindReport);
    await expect(page.getByRole('heading', { name: 'Evidence & assumptions', exact: true })).toBeVisible();
    await expect(page.getByText('Source link supplied', { exact: true })).toBeVisible();
    await expect(page.getByText('User-provided', { exact: true })).toBeVisible();
    await expect(page.getByText('Attribution missing', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /example\.com/ })).toHaveAttribute('href', 'https://example.com/menu');
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Campaign direction', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Hook concepts', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Competitor comparisons', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /VIEW FULL REPORT/i }).click();
    await expect(page.getByText(savedMarketMindReport.narrativeReport, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).__unsafeNarrative)).toBeUndefined();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) {
      const reportSection = await page.getByRole('heading', { name: 'Evidence & assumptions', exact: true }).boundingBox();
      const productInput = await page.getByLabel('// PRODUCT_SERVICE_NAME', { exact: true }).boundingBox();
      expect(reportSection!.y).toBeLessThan(productInput!.y);
    }
    expect(await page.evaluate(() => (window as any).__generationAttempts)).toBe(0);
    expect(apiAttempts).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/marketmind-report-${width}.png`, fullPage: true });
  });
}

test('sparse legacy saved report keeps missing evidence explicit and original narrative accessible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { apiAttempts, errors } = await savedReportFixture(page, sparseMarketMindReport);
  await expect(page.getByText('No supporting evidence supplied in this report.', { exact: true })).toBeVisible();
  await expect(page.getByText('Source link supplied', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /VIEW FULL REPORT/i }).click();
  await expect(page.getByText(sparseMarketMindReport.narrativeReport, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => (window as any).__generationAttempts)).toBe(0);
  expect(apiAttempts).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/marketmind-report-sparse-390.png', fullPage: true });
});

test('loading a saved report moves keyboard focus through the report before the intake', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { apiAttempts, errors } = await savedReportFixture(page, savedMarketMindReport);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /DOWNLOAD.*PDF/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: /example\.com/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /SEND TO DIRECTOR AI/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /build stronger offer first/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /VIEW FULL REPORT/i })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('// BRAND_NAME', { exact: true })).toBeFocused();
  expect(await page.evaluate(() => (window as any).__generationAttempts)).toBe(0);
  expect(apiAttempts).toEqual([]);
  expect(errors).toEqual([]);
});

test('saved-report handoffs preserve payloads and avoid regeneration', async ({ page }) => {
  const { apiAttempts, errors } = await savedReportFixture(page, savedMarketMindReport);
  const before = await page.evaluate(() => ({
    report: localStorage.getItem('marketMindReport'),
    inputs: localStorage.getItem('marketMindUserInputs'),
    savedAt: localStorage.getItem('marketMindReportSavedAt'),
  }));
  await page.getByRole('button', { name: /build stronger offer first/i }).click();
  expect(await page.evaluate(() => (window as any).__selectedModule)).toBe('offer_optimizer');
  await page.getByRole('button', { name: /SEND TO DIRECTOR AI/i }).click();
  expect(await page.evaluate(() => (window as any).__selectedModule)).toBe('creative_director');
  expect(await page.evaluate(() => localStorage.getItem('grifon_pendingAutofill'))).toBe('marketResearch');
  expect(Number(await page.evaluate(() => localStorage.getItem('grifon_pendingAutofillTs')))).toBeGreaterThan(0);
  expect(await page.evaluate(() => ({
    report: localStorage.getItem('marketMindReport'),
    inputs: localStorage.getItem('marketMindUserInputs'),
    savedAt: localStorage.getItem('marketMindReportSavedAt'),
  }))).toEqual(before);
  expect(await page.evaluate(() => (window as any).__generationAttempts)).toBe(0);
  expect(apiAttempts).toEqual([]);
  expect(errors).toEqual([]);
});

test('long saved text and source URLs wrap on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const longText = 'Delivery'.repeat(100);
  const { apiAttempts, errors } = await savedReportFixture(page, {
    ...savedMarketMindReport,
    subject: longText,
    headlines: [longText],
    rawEvidence: [`[Source-backed] A supplied link | https://example.com/${'menu'.repeat(200)}`],
    narrativeReport: longText,
  });
  await expect(page.getByRole('heading', { name: 'Evidence & assumptions', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /VIEW FULL REPORT/i }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(apiAttempts).toEqual([]);
  expect(errors).toEqual([]);
});

test('saved report still exports a PDF without generation', async ({ page }) => {
  const { apiAttempts, errors } = await savedReportFixture(page, savedMarketMindReport);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /DOWNLOAD.*PDF/i }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await download.failure()).toBeNull();
  expect(await page.evaluate(() => (window as any).__generationAttempts)).toBe(0);
  expect(apiAttempts).toEqual([]);
  expect(errors).toEqual([]);
});
