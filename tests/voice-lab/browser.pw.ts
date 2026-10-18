import { expect, test, type Page } from '@playwright/test';

async function openLab(page: Page, scenario = 'natural-inquiry') {
  await page.goto('/voice-lab.html');
  await page.getByLabel('Scenario', { exact: true }).selectOption(scenario);
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Stop session', exact: true })).toBeEnabled();
}

async function caller(page: Page, text: string) {
  await page.getByLabel('Caller message', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'Send caller line', exact: true }).click();
  await expect(page.getByTestId('transcript')).toContainText(text);
}

async function submit(page: Page) {
  await caller(page, 'Confirm details');
  await caller(page, 'Submit request');
  await expect(page.getByTestId('session-status')).toContainText('Awaiting dispatch');
}

async function approve(page: Page, price = '5000', slot = 'TEST: October 20, 10AM–12PM Manila') {
  await page.getByLabel('Final price (PHP)', { exact: true }).fill(price);
  await page.getByLabel('Service slot', { exact: true }).fill(slot);
  await page.getByRole('button', { name: 'Approve dispatch', exact: true }).click();
  await expect(page.getByTestId('session-status')).toContainText('Dispatch approved');
}

test('local lab is explicit about mock evidence and does not use external services', async ({ page }) => {
  const external: string[] = [];
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
      external.push(`${url.protocol}//${url.hostname}`);
      await route.abort();
    } else await route.continue();
  });
  await page.goto('/voice-lab.html');
  await expect(page.getByRole('heading', { name: /voice lab/i }).first()).toBeVisible();
  await expect(page.getByText(/scripted mock/i).first()).toBeVisible();
  await expect(page.getByTestId('budget')).toContainText('5');
  await openLab(page);
  await caller(page, 'What is the household siphoning rate?');
  await expect(page.getByTestId('transcript')).toContainText(/truckload/i);
  await expect(page.getByTestId('transcript')).toContainText(/4,000|4000/);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  expect(external).toEqual([]);
});

test('booking requires dispatch approval and acceptance of the latest quote', async ({ page }) => {
  await openLab(page);
  await submit(page);
  await expect(page.getByRole('button', { name: 'Customer accepts quote', exact: true })).toBeDisabled();
  await approve(page);
  await page.getByRole('button', { name: 'Customer accepts quote', exact: true }).click();
  await expect(page.getByTestId('session-status')).toContainText('Booked');
  await approve(page, '10000', 'TEST: October 21, 1PM–3PM Manila');
  await expect(page.getByTestId('session-status')).not.toContainText('Booked');
  await page.getByRole('button', { name: 'Customer accepts quote', exact: true }).click();
  await expect(page.getByTestId('session-status')).toContainText('Booked');
});

test('corrected address invalidates earlier confirmation and dispatch', async ({ page }) => {
  await openLab(page);
  await submit(page);
  await approve(page);
  await page.getByRole('button', { name: 'Customer accepts quote', exact: true }).click();
  await caller(page, 'Address: 999 Revised TEST Street, Pasig');
  await expect(page.getByTestId('session-status')).not.toContainText('Booked');
  await expect(page.getByRole('button', { name: 'Customer accepts quote', exact: true })).toBeDisabled();
  await expect(page.getByTestId('transcript')).toContainText('999 Revised TEST Street');
});

test('outside-NCR inquiry and human request retain human ownership', async ({ page }) => {
  await openLab(page, 'outside-ncr');
  await caller(page, 'What is the household siphoning rate?');
  await expect(page.getByTestId('session-status')).toContainText('Human needed');
  await expect(page.getByTestId('tool-log')).toContainText(/Neil|Zam/);
  await expect(page.getByRole('button', { name: 'Customer accepts quote', exact: true })).toBeDisabled();
});

test('explicit refusal stops the scripted selling flow', async ({ page }) => {
  await openLab(page, 'price-objection');
  await caller(page, 'No thanks');
  await expect(page.getByTestId('session-status')).toContainText('Declined');
  await expect(page.getByRole('button', { name: 'Customer accepts quote', exact: true })).toBeDisabled();
});

test('a stopped start request cannot close a newer active session', async ({ page }) => {
  let releaseFirst: (() => Promise<void>) | undefined;
  let attempts = 0;
  await page.route('**/api/voice-lab/session', async (route) => {
    if (route.request().method() !== 'POST' || ++attempts !== 1) return route.continue();
    await new Promise<void>((resolve) => {
      releaseFirst = async () => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"obsolete_start_failure"}' });
        resolve();
      };
    });
  });
  await page.goto('/voice-lab.html');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect.poll(() => Boolean(releaseFirst)).toBe(true);
  await page.getByRole('button', { name: 'Stop session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByTestId('session-status')).toContainText('Active');
  await releaseFirst!();
  // A late error is now delivered; the next turn must still belong to session B.
  await expect(page.getByText('obsolete_start_failure', { exact: false })).not.toBeVisible();
  await expect(page.getByTestId('session-status')).toContainText('Active');
  await caller(page, 'What is the household siphoning rate?');
  await expect(page.getByTestId('transcript')).toContainText(/truckload/i);
});

test('tool failure stays visible and never confirms a booking', async ({ page }) => {
  await openLab(page, 'tool-connection-failure');
  await caller(page, 'Fail tool');
  await expect(page.getByTestId('session-status')).toContainText(/Failed|Human needed/);
  await expect(page.getByTestId('tool-log')).toContainText(/fail/i);
  await expect(page.getByRole('button', { name: 'Customer accepts quote', exact: true })).toBeDisabled();
});

test('production endpoints and unapproved live sessions are inaccessible', async ({ request }) => {
  for (const path of ['/api/lead', '/api/ops']) {
    expect((await request.get(path)).status()).toBe(404);
    expect((await request.post(path, { data: {}, headers: { Origin: 'http://127.0.0.1:5184' } })).status()).toBe(404);
  }
  const live = await request.post('/api/voice-lab/session', {
    data: { scenarioId: 'natural-inquiry', mode: 'live' },
    headers: { Origin: 'http://127.0.0.1:5184' },
  });
  expect(live.status()).toBeGreaterThanOrEqual(400);
});

test('mobile layout stays usable at 390px and captures local evidence', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLab(page);
  await expect(page.getByLabel('Caller message', { exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({ path: '.tmp/oceanides-voice-lab/mobile.png', fullPage: true });
});
