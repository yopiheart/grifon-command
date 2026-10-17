import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { installRecoveryBackend, seededRun, RUN_ID } from './fixtures/oneshotRecovery.js';
import { installAccountApp } from './companion-account-fixture.js';

const QA = path.resolve('assets/design/companion-beta/qa');
const phase = process.env.COMPANION_BETA_PHASE || 'current';
const input = (page: Page) => page.getByRole('textbox', { name: 'Message Grifon', exact: true });
async function open(page: Page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname.startsWith('/api/')) return route.abort();
    return route.fallback();
  });
  await page.goto('/companion-chat-preview.html');
  await expect(input(page)).toBeVisible();
}
test.afterEach(async ({ page }, info) => {
  const dir = path.join(QA, phase); fs.mkdirSync(dir, { recursive: true });
  const name = info.title.replace(/[^a-z0-9]+/gi, '-');
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ status: info.status, errors: info.errors.map(e => e.message) }, null, 2));
});
for (const width of [390, 1280]) test(`guided beta limitations are visible at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 }); await open(page);
  await expect(page.getByText(/guided ad brief/i)).toBeVisible();
  await expect(page.getByText(/chats stay in this browser on this device/i)).toBeVisible();
  await expect(page.getByText(/work may not resume after closing/i)).toBeVisible();
});
test('stale second tab cannot erase a newer conversation', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 }); await open(page);
  await input(page).fill('Shared first conversation'); await input(page).press('Enter');
  await expect(page.getByText(/^Draft saved on this device/)).toBeVisible();
  const older = await context.newPage(); await older.setViewportSize({ width: 1280, height: 900 }); await open(older);
  await expect(older.locator('.companion-message-user')).toHaveText('Shared first conversation');
  await page.getByRole('button', { name: 'New chat', exact: true }).click();
  await input(page).fill('Newer second conversation'); await input(page).press('Enter');
  await expect(page.getByText(/^Draft saved on this device/)).toBeVisible();
  await input(older).fill('Older tab unsent edit');
  await expect(older.getByText(/Another tab saved newer chats/)).toBeVisible();
  await older.getByRole('button', { name: 'Save this chat as a copy', exact: true }).click();
  await expect(older.getByText(/^Draft saved on this device/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Conversations', exact: true }).getByRole('button', { name: /Newer second conversation/ })).toBeVisible();
  await expect(input(page)).toHaveValue('Older tab unsent edit');
  await expect(page.getByRole('navigation', { name: 'Conversations', exact: true }).getByRole('button', { name: /Shared first conversation/ })).toHaveCount(2);
  await older.close();
});
test('refresh warns before leaving an unsaved draft and dismiss keeps the draft', async ({ page }) => {
  await installAccountApp(page);
  if (process.env.COMPANION_BETA_OLD_UNLOAD === '1') await page.route(/\/components\/CompanionChat\/CompanionChatShell\.tsx(?:\?.*)?$/, async route => {
    const response = await route.fetch(); const body = await response.text();
    if (!body.includes('beforeunload')) throw new Error('Unload negative control seam missing');
    await route.fulfill({ response, body: body.replaceAll('beforeunload', 'beta-disabled-beforeunload') });
  });
  await page.goto('/app'); await expect(input(page)).toBeVisible();
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device');
  await page.evaluate(() => { (window as any).accountFixture.holdStorage = true; });
  await input(page).click(); await input(page).fill('Keep this unsaved draft');
  await expect(page.locator('#companion-save-status')).toContainText('Saving on this device');
  let warned = false;
  page.on('dialog', async dialog => { warned = dialog.type() === 'beforeunload'; await dialog.dismiss(); });
  await page.reload({ timeout: 1500 }).catch(() => {});
  expect(warned).toBe(true);
  await expect(input(page)).toHaveValue('Keep this unsaved draft');
  await page.evaluate(() => { const s = (window as any).accountFixture; s.holdStorage = false; s.storageWaiters.splice(0).forEach((resolve: () => void) => resolve()); });
  await expect(page.locator('#companion-save-status')).toContainText('Draft saved on this device');
});
test('Stop and Resume cannot duplicate an unsettled scene image request', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const seed = seededRun('storyboard');
  seed.row.status = 'running'; seed.row.current_stage = 'scene_images'; seed.row.artifacts.gate = null;
  seed.row.stages.find(stage => stage.id === 'scene_images')!.status = 'pending';
  seed.scenes[0].image_url = null;
  const backend = await installRecoveryBackend(page, seed);
  await page.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('beta-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/geminiService.ts?beta-original';
      window.betaImage = {calls:0,resolve:null,reject:null};
      export const generateSceneImage = async () => { window.betaImage.calls++; return new Promise((resolve,reject)=>{window.betaImage.resolve=resolve;window.betaImage.reject=reject}); };
    ` });
  });
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  await page.getByRole('button', { name: 'Stop waiting', exact: true }).click();
  const resume = page.getByRole('button', { name: 'Resume saved progress', exact: true });
  if (await resume.isEnabled()) await resume.click();
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  await expect(resume).toBeDisabled();
  await page.evaluate(() => (window as any).betaImage.reject(new Error('ABORTED')));
  await expect(resume).toBeEnabled();
  const fresh = seededRun('storyboard'); backend.row = fresh.row; backend.scenes = fresh.scenes;
  const reads = backend.reads.length;
  await resume.click();
  await expect(page.getByText(/earlier production request could not be confirmed/).first()).toBeVisible();
  expect(backend.reads.length).toBe(reads);
  expect(await page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  // An ambiguous provider rejection leaves the receipt in place. The explicit
  // read-only recovery can fetch a checkpoint without replaying production.
  await page.getByRole('button', { name: 'Check saved progress', exact: true }).click();
  await expect.poll(() => backend.reads.length).toBeGreaterThan(reads);
  await expect(page.getByRole('button', { name: 'Open storyboard', exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  expect(backend.unexpected).toEqual([]);
});

test('another tab cannot resume the same ad while a scene image request is pending', async ({ page, context }) => {
  const seed = seededRun('storyboard');
  seed.row.status = 'running'; seed.row.current_stage = 'scene_images'; seed.row.artifacts.gate = null;
  seed.row.stages.find(stage => stage.id === 'scene_images')!.status = 'pending'; seed.scenes[0].image_url = null;
  const install = async (target: Page) => {
    const backend = await installRecoveryBackend(target, seed);
    await target.route(/\/services\/geminiService\.ts(?:\?.*)?$/, route => {
      if (route.request().url().includes('beta-original')) return route.fallback();
      return route.fulfill({ contentType: 'application/javascript', body: `
        export * from '/services/geminiService.ts?beta-original';
        window.betaImage = {calls:0};
        export const generateSceneImage = async () => { window.betaImage.calls++; return new Promise(()=>{}); };
      ` });
    });
    await target.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
    await target.goto('http://localhost:5173/app?experience=companion'); return backend;
  };
  await install(page);
  await page.getByRole('button', { name: 'Resume saved progress', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  const second = await context.newPage(); const backend = await install(second);
  const secondUrl = second.url();
  const secondDocument = await second.evaluateHandle(() => document);
  await second.getByRole('button', { name: 'Resume saved progress', exact: true }).click({ noWaitAfter: true });
  await expect(second.getByText(/already being updated in another tab/).first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).betaImage.calls)).toBe(1);
  expect(await second.evaluate(() => (window as any).betaImage.calls)).toBe(0);
  expect(backend.unexpected).toEqual([]);
  expect(second.url()).toBe(secondUrl);
  expect(await secondDocument.evaluate(node => node === document)).toBe(true);
  await secondDocument.dispose(); await second.close();
});

test('guided intake accepts a long brief and corrections use Edit brief without generation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  const long = 'Coffee for busy parents. '.repeat(150);
  for (const answer of [long, 'North Coffee', 'Morning brew', 'Two bottles for 199', '199']) {
    await input(page).fill(answer); await input(page).press('Enter');
    await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
  await page.getByRole('textbox', { name: 'Product name', exact: true }).fill('Evening brew');
  await page.getByRole('button', { name: 'Done editing', exact: true }).click();
  await expect(page.getByLabel('Review your brief', { exact: true })).toContainText('Evening brew');
  await input(page).fill('Book a restaurant for me'); await input(page).press('Enter');
  await expect(page.getByRole('status', { name: 'Grifon is typing', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('conversation-scroll').getByText(/Your brief is ready. Use Edit brief/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).companionFixture.snapshot().calls)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('completed ad fixture plays and its download contains video bytes', async ({ page }) => {
  const seed = seededRun('first_cut'); seed.row.status = 'done';
  // Chromium downloads bypass request-route interception. Use the real local
  // static fixture for the downloadable file, with provider playback still mocked.
  seed.row.artifacts.finalDownloadUrl = '/tests/e2e/fixtures/recovery.webm';
  const backend = await installRecoveryBackend(page, seed);
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Open first cut', exact: true }).click();
  const video = page.getByLabel('Generated ad video');
  await video.evaluate((node: HTMLVideoElement) => { node.muted = true; return node.play(); });
  await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download video', exact: true }).click();
  const download = await downloadEvent;
  expect(await download.failure()).toBeNull();
  const filename = await download.path(); expect(filename).toBeTruthy();
  expect(fs.readFileSync(filename!).subarray(0, 4).toString('hex')).toBe('1a45dfa3');
  expect(backend.submissions).toEqual([]); expect(backend.unexpected).toEqual([]);
});

for (const action of ['reshoot', 'style']) test(`completed ad still permits explicit ${action} after Resume editing`, async ({ page }) => {
  const seed = seededRun('first_cut'); seed.row.status = 'done';
  const backend = await installRecoveryBackend(page, seed);
  await page.route(/\/services\/producerOrchestrator\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('beta-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/producerOrchestrator.ts?beta-original';
      window.betaRevisions=[];
      export const reshootScene=async (run,index)=>{window.betaRevisions.push({action:'reshoot',index}); return run;};
      export const applyPreset=async (run,preset)=>{window.betaRevisions.push({action:'style',preset}); return run;};
    ` });
  });
  await page.addInitScript(id => localStorage.setItem('osa_producer_companion:recovery-user', id), RUN_ID);
  await page.goto('http://localhost:5173/app?experience=companion');
  await page.getByRole('button', { name: 'Resume editing', exact: true }).click();
  await page.getByRole('button', { name: 'Open first cut', exact: true }).click();
  if (action === 'reshoot') {
    await page.getByRole('button', { name: 'Reshoot scene 1', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm reshoot', exact: true }).click();
  } else {
    await page.getByRole('combobox', { name: 'Edit style', exact: true }).selectOption('clean');
    await page.getByRole('button', { name: 'Apply style', exact: true }).click();
  }
  await expect.poll(() => page.evaluate(() => (window as any).betaRevisions)).toEqual([action === 'reshoot' ? { action, index: 0 } : { action, preset: 'clean' }]);
  expect(backend.unexpected).toEqual([]);
});
