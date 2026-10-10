import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { IMAGE, assertConsumerOnly, installRecoveryBackend, openOneShot } from './fixtures/oneshotRecovery.js';

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

for (const width of [375, 390, 1280]) {
  test.describe(`software preparation at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 667 : width === 390 ? 844 : 900 } });

    test('local preparation preserves screenshots through save, reload and portable review', async ({ page }, testInfo) => {
      const backend = await installRecoveryBackend(page, undefined, new URL(testInfo.project.use.baseURL!).origin);
      backend.row = null;
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('/app?osaEngine=producer');
      await openOneShot(page);
      await page.addLocatorHandler(page.getByRole('button', { name: 'Dismiss feedback', exact: true }), locator => locator.click());
      await page.getByPlaceholder('Brand name', { exact: true }).fill('Physical draft stays here');
      await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Prepare software demo', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toHaveCount(0);
      await page.getByLabel('// Brand name', { exact: true }).fill('ElevenLabs');
      await page.getByLabel('// Product name', { exact: true }).fill('Text to Speech');
      await page.getByLabel('// Official website', { exact: true }).fill('https://elevenlabs.io/');
      await page.getByLabel('// Use case or offer', { exact: true }).fill('Create a voice-over from a script');
      await page.getByLabel('// Audience hypothesis', { exact: true }).fill('Video creators');
      await page.getByLabel('// Creative hypothesis', { exact: true }).fill('Audible proof may explain the benefit.');
      await page.getByLabel('// CTA text', { exact: true }).fill('Try Text to Speech');
      await page.getByLabel('// CTA destination', { exact: true }).fill('https://elevenlabs.io/text-to-speech');
      const buffer = Buffer.from(IMAGE.split(',')[1], 'base64');
      for (const slot of ['Setup', 'Action', 'Result']) {
        await page.getByLabel(`${slot} screenshot file`, { exact: true }).setInputFiles({ name: `${slot}.png`, mimeType: 'image/png', buffer });
        await expect(page.getByRole('button', { name: `Review ${slot.toLowerCase()} screenshot`, exact: true })).toBeVisible();
        await page.getByLabel(`// ${slot} caption`, { exact: true }).fill(`${slot} owner screenshot`);
        await page.getByLabel(`// ${slot} source URL`, { exact: true }).fill('https://elevenlabs.io/');
        await page.getByLabel(`// ${slot} captured at (ISO)`, { exact: true }).fill('2026-10-08T01:00:00Z');
        await page.getByLabel(`// ${slot} owner observation`, { exact: true }).fill('I captured this screen.');
      }
      await page.getByRole('button', { name: 'Review setup screenshot', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('dialog').getByRole('img')).toHaveAttribute('src', IMAGE);
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByLabel('Setup screenshot file', { exact: true }).setInputFiles({ name: 'corrupt.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]) });
      await expect(page.getByRole('alert')).toContainText('could not be decoded');
      await expect(page.getByRole('img', { name: 'Setup product screenshot', exact: true })).toHaveAttribute('src', IMAGE);
      await page.getByRole('button', { name: 'Save preparation', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Saved on this device');
      await page.reload();
      await openOneShot(page);
      await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
      await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('ElevenLabs');
      const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export preparation', exact: true }).click()]);
      const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
      expect(exported.preparationOnly).toBe(true);
      expect(exported.screenshots.map((s: any) => s.image.dataUrl)).toEqual([IMAGE, IMAGE, IMAGE]);
      expect(exported.screenshots.every((s: any) => s.image.bytes === buffer.length)).toBe(true);
      await page.getByLabel('Preparation file', { exact: true }).setInputFiles({ name: 'corrupt.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
      await expect(page.getByRole('alert')).toContainText('valid JSON');
      await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('ElevenLabs');
      await page.getByLabel('// Brand name', { exact: true }).fill('Temporary edit');
      await page.getByLabel('Preparation file', { exact: true }).setInputFiles({ name: 'preparation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) });
      await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('ElevenLabs');
      await assertConsumerOnly(page);
      await page.screenshot({ path: testInfo.outputPath('software-preparation.png'), fullPage: true });
      await page.getByRole('button', { name: 'Back to ad composer', exact: true }).click();
      await expect(page.getByPlaceholder('Brand name', { exact: true })).toHaveValue('Physical draft stays here');
      await page.getByRole('button', { name: 'Product', exact: true }).click();
      await expect(page.getByRole('button').filter({ hasText: 'Mobile app / SaaS' })).toBeDisabled();
      expect(backend.submissions).toEqual([]);
      expect(backend.finalStarts).toEqual([]);
      expect(backend.checkpoints).toEqual([]);
      expect(backend.unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}

test('a pending reference import cannot overwrite a newer whole preparation', async ({ page }, testInfo) => {
  const backend = await installRecoveryBackend(page, undefined, new URL(testInfo.project.use.baseURL!).origin);
  backend.row = null;
  await page.goto('/app?osaEngine=producer');
  await openOneShot(page);
  await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
  await expect(page.getByLabel('// Brand name', { exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'slow-reference.json') return original.call(this);
      const file = this;
      return new Promise<string>(resolve => {
        (window as any).__releaseReferenceRead = async () => {
          resolve(await original.call(file));
          (window as any).__referenceReadReleased = true;
        };
      });
    };
  });
  await page.getByLabel('Reference packet file', { exact: true }).setInputFiles({ name: 'slow-reference.json', mimeType: 'application/json', buffer: readFileSync('tests/fixtures/ad-reference.synthetic.json') });
  await expect.poll(() => page.evaluate(() => typeof (window as any).__releaseReferenceRead)).toBe('function');
  await page.getByLabel('Preparation file', { exact: true }).setInputFiles({ name: 'elevenlabs.json', mimeType: 'application/json', buffer: readFileSync('assets/ad-recon/elevenlabs-2026-10-10.preparation.json') });
  await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('ElevenLabs');
  await page.evaluate(() => (window as any).__releaseReferenceRead());
  await page.waitForFunction(() => (window as any).__referenceReadReleased);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const references = page.getByRole('region', { name: 'Ad references', exact: true });
  await expect(references).toContainText('ElevenLabs Text to Speech');
  await expect(references).not.toContainText('Recovery Coffee');
  await expect(page.getByText('Setup screenshot is missing.', { exact: true })).toBeVisible();
  await expect(page.getByText('Action screenshot is missing.', { exact: true })).toBeVisible();
  await expect(page.getByText('Result screenshot is missing.', { exact: true })).toBeVisible();
  expect(backend.unexpected).toEqual([]);
  expect(backend.submissions).toEqual([]);
  expect(backend.finalStarts).toEqual([]);
});

test('owners see only their own device draft and aborted saves stay failed', async ({ page }, testInfo) => {
  const backend = await installRecoveryBackend(page, undefined, new URL(testInfo.project.use.baseURL!).origin);
  backend.row = null;
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('recovery-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/supabaseClient.ts?recovery-original';
      const session = {access_token:'test-only-token',user:{id:sessionStorage.getItem('saas_fixture_owner') || 'software-owner-a',email:'buyer@example.test',user_metadata:{}}};
      const query = {select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,maybeSingle:async()=>({data:{plan_id:'pro',status:'active'}}),single:async()=>({data:null}),then:resolve=>resolve({data:[]})};
      const channel = {on:()=>channel,subscribe:()=>channel};
      const client = {auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>query,channel:()=>channel,removeChannel(){}};
      export const getSupabase=()=>client;
    ` });
  });
  await page.goto('/app?osaEngine=producer');
  await openOneShot(page);
  await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
  await page.getByLabel('// Brand name', { exact: true }).fill('Owner A private preparation');
  await page.getByRole('button', { name: 'Save preparation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved on this device');
  await page.evaluate(() => sessionStorage.setItem('saas_fixture_owner', 'software-owner-b'));
  await page.reload();
  await openOneShot(page);
  await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
  await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('');
  await expect(page.getByRole('status')).toContainText('No saved preparation for this account');
  await page.getByLabel('// Brand name', { exact: true }).fill('Owner B unsaved');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = original.apply(this, args);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    };
  });
  await page.getByRole('button', { name: 'Save preparation', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Save failed');
  await expect(page.getByRole('alert')).toContainText('save failed or storage is full');
  await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('Owner B unsaved');
  await page.evaluate(() => sessionStorage.setItem('saas_fixture_owner', 'software-owner-a'));
  await page.reload();
  await openOneShot(page);
  await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
  await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('Owner A private preparation');
  expect(backend.unexpected).toEqual([]);
  expect(backend.submissions).toEqual([]);
  expect(backend.finalStarts).toEqual([]);
  expect(backend.checkpoints).toEqual([]);
});

test('a slow whole-preparation import cannot clobber a newer edit', async ({ page }, testInfo) => {
  const backend = await installRecoveryBackend(page, undefined, new URL(testInfo.project.use.baseURL!).origin);
  backend.row = null;
  await page.goto('/app?osaEngine=producer');
  await openOneShot(page);
  await page.getByRole('button', { name: 'Prepare software demo', exact: true }).click();
  await expect(page.getByLabel('// Brand name', { exact: true })).toBeEnabled();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'slow-preparation.json') return original.call(this);
      const file = this;
      return new Promise<string>(resolve => { (window as any).__releasePreparationRead = async () => resolve(await original.call(file)); });
    };
  });
  await page.getByLabel('Preparation file', { exact: true }).setInputFiles({ name: 'slow-preparation.json', mimeType: 'application/json', buffer: readFileSync('assets/ad-recon/elevenlabs-2026-10-10.preparation.json') });
  await expect.poll(() => page.evaluate(() => typeof (window as any).__releasePreparationRead)).toBe('function');
  await page.getByLabel('// Brand name', { exact: true }).fill('Newer owner choice');
  await page.evaluate(() => (window as any).__releasePreparationRead());
  await expect(page.getByRole('status')).toContainText('Import cancelled because you edited');
  await expect(page.getByLabel('// Brand name', { exact: true })).toHaveValue('Newer owner choice');
  expect(backend.unexpected).toEqual([]);
  expect(backend.submissions).toEqual([]);
  expect(backend.finalStarts).toEqual([]);
});
