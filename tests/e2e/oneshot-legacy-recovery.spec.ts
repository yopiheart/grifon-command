import { test, expect } from '@playwright/test';
import { legacyBackend, enterOneShot, fillBrief, readStored, seedCompletedSession, LEGACY_USER, SCRIPT } from './legacyRecovery.js';
import type { WizardSessionV1 } from '../../services/wizardSessionStore.js';
import type { OneShotDraft } from '../../utils/oneShotDraft.js';

test.use({ reducedMotion: 'reduce' });

for (const width of [375, 1280]) {
  test.describe(`legacy recovery at ${width}`, () => {
    test.use({ viewport: { width, height: width === 375 ? 667 : 900 } });

    test('typed brief and uploaded asset survive closing and reopening the page', async ({ page, context }, testInfo) => {
      const backend = await legacyBackend(context);
      await page.goto('/app?experience=studio');
      await enterOneShot(page);
      await fillBrief(page);
      await expect.poll(async () => (await readStored<OneShotDraft>(page, 'grifon-oneshot', 'draft', 'current'))?.heroDescription)
        .toBe('A handheld product in its original packaging.');
      const saved = await readStored<OneShotDraft>(page, 'grifon-oneshot', 'draft', 'current');
      expect(saved?.hero).toMatch(/^data:image\//);
      await page.close();
      const reopened = await context.newPage();
      await reopened.goto('/app?experience=studio');
      await enterOneShot(reopened);
      await expect(reopened.getByRole('heading', { name: 'Resume your draft?' })).toBeVisible();
      await reopened.getByRole('button', { name: 'Resume', exact: true }).click();
      await expect(reopened.getByPlaceholder('Brand name', { exact: true })).toHaveValue('Recovery Goods');
      await expect(reopened.getByPlaceholder('Price', { exact: false })).toHaveValue('199');
      await expect(reopened.getByPlaceholder('Describe your offer', { exact: false })).toHaveValue('A daily upgrade for 199, available this week.');
      await expect(reopened.getByRole('img', { name: 'Product', exact: true })).toHaveAttribute('src', saved!.hero);
      await expect(reopened.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
      expect(backend.calls).toEqual(['describe-upload']);
      expect(backend.unexpected).toEqual([]);
      await reopened.screenshot({ path: testInfo.outputPath(`legacy-draft-${width}.png`) });
      await testInfo.attach(`legacy-draft-${width}`, { path: testInfo.outputPath(`legacy-draft-${width}.png`), contentType: 'image/png' });
    });

    test('actual interrupted generation retains its persisted script in consumer review', async ({ page, context }, testInfo) => {
      const backend = await legacyBackend(context);
      await page.goto('/app?experience=studio');
      await enterOneShot(page);
      await fillBrief(page);
      await expect.poll(() => backend.calls).toContain('describe-upload');
      await page.getByRole('button', { name: 'Make My Ad', exact: true }).click();
      await expect.poll(() => backend.calls).toContain('image');
      await expect.poll(async () => (await readStored<WizardSessionV1>(page, 'grifon_wizard', 'sessions', LEGACY_USER))?.finalScript)
        .toEqual([...SCRIPT.hook1, ...SCRIPT.body]);
      const before = [...backend.calls];
      expect(before).toEqual(['describe-upload', 'marketmind', 'adscript', 'image']);
      const saved = await readStored<WizardSessionV1>(page, 'grifon_wizard', 'sessions', LEGACY_USER);
      expect(saved?.businessInfo.productImageUrls?.[0]).toMatch(/^data:image\//);
      await page.close();
      await backend.interrupt();
      const reopened = await context.newPage();
      await reopened.goto('/app?experience=studio');
      await enterOneShot(reopened);
      await reopened.getByRole('button', { name: 'RESUME', exact: true }).click();
      await expect(reopened.getByRole('heading', { name: 'Your Ad Plan', exact: true })).toBeVisible();
      for (const line of [...SCRIPT.hook1, ...SCRIPT.body]) await expect(reopened.getByText(line, { exact: true })).toBeVisible();
      await expect(reopened.getByText('Scenes unavailable', { exact: true })).toBeVisible();
      await expect(reopened.getByText('// AUTOMATED VIDEO WORKFLOW', { exact: true })).toHaveCount(0);
      // Generation adapters delay their first call by one second. Observe beyond
      // that boundary so a restored screen cannot hide an automatic restart.
      await reopened.waitForTimeout(1500);
      expect(backend.calls).toEqual(before);
      expect(backend.unexpected).toEqual([]);
      await reopened.screenshot({ path: testInfo.outputPath(`legacy-partial-${width}.png`), fullPage: true });
      await testInfo.attach(`legacy-partial-${width}`, { path: testInfo.outputPath(`legacy-partial-${width}.png`), contentType: 'image/png' });
    });

    test('seeded completed plan opens from the real Dashboard with saved script and scenes', async ({ page, context }, testInfo) => {
      const backend = await legacyBackend(context);
      await page.goto('/app?experience=studio');
      await expect(page.getByText('What are we selling today?')).toBeVisible();
      await seedCompletedSession(page);
      await page.reload();
      await page.getByRole('region', { name: 'Your work' }).getByRole('button', { name: 'Open ad plan', exact: true }).filter({ visible: true }).click();
      await expect(page.getByRole('heading', { name: 'Your Ad Plan', exact: true })).toBeVisible();
      for (const line of [...SCRIPT.hook1, ...SCRIPT.body]) await expect(page.getByText(line, { exact: true })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Scene 1', exact: true })).toHaveAttribute('src', '/examples/ex-product-handheld.png');
      await expect(page.getByRole('img', { name: 'Character', exact: true })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Thumbnail', exact: true })).toBeVisible();
      await expect.poll(() => page.getByRole('img', { name: 'Scene 1', exact: true })
        .evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      await expect(page.getByText('// AUTOMATED VIDEO WORKFLOW', { exact: true })).toHaveCount(0);
      expect(backend.calls).toEqual([]);
      expect(backend.unexpected).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`legacy-completed-${width}.png`), fullPage: true });
      await testInfo.attach(`legacy-completed-${width}`, { path: testInfo.outputPath(`legacy-completed-${width}.png`), contentType: 'image/png' });
    });
  });
}
