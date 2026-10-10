import { test, expect } from '@playwright/test';
import { installRecoveryBackend, seededRun, openSeededProducer, openOneShot, assertConsumerOnly, RUN_ID, IMAGE } from './fixtures/oneshotRecovery.js';

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

for (const viewport of [{ width: 375, height: 667 }, { width: 1280, height: 900 }]) {
  test.describe(`${viewport.width}px Producer recovery`, () => {
    test.use({ viewport });

    test('seeded saved-run load failure offers Retry on the same run and Back', async ({ page }, testInfo) => {
      const backend = await installRecoveryBackend(page);
      backend.loadFails = true;
      await openSeededProducer(page);
      await expect.poll(() => backend.reads.length).toBeGreaterThan(0);
      await expect(page.getByRole('heading', { name: "Couldn't load your saved ad" })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('osa_producer_active_run'))).toBe(RUN_ID);
      await assertConsumerOnly(page);
      await page.screenshot({ path: testInfo.outputPath('saved-run-error.png'), fullPage: true });
      await testInfo.attach('saved-run-error', { path: testInfo.outputPath('saved-run-error.png'), contentType: 'image/png' });
      await page.getByRole('button', { name: 'Back', exact: true }).click();
      await expect(page.getByText('What are we selling today?')).toBeVisible();
      await openOneShot(page);
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
      backend.loadFails = false;
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your Storyboard', exact: true })).toBeVisible();
      expect(new Set(backend.reads)).toEqual(new Set([RUN_ID]));
      expect(backend.submissions).toHaveLength(0);
      expect(backend.checkpoints).toHaveLength(0);
      expect(backend.unexpected).toEqual([]);
    });

    for (const gate of ['storyboard', 'first_cut'] as const) {
      test(`seeded ${gate} gate remains parked after reload`, async ({ page }, testInfo) => {
        const backend = await installRecoveryBackend(page, seededRun(gate));
        await openSeededProducer(page);
        const heading = page.getByRole('heading', { name: gate === 'storyboard' ? 'Your Storyboard' : 'Your First Cut', exact: true });
        await expect(heading).toBeVisible();
        await page.reload();
        await openOneShot(page);
        await expect(heading).toBeVisible();
        const sceneImage = page.getByRole('img', { name: 'Scene 1', exact: true });
        await expect(sceneImage).toBeVisible();
        await expect(sceneImage).toHaveAttribute('src', IMAGE);
        await expect.poll(() => sceneImage.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
        if (gate === 'storyboard') await expect(page.getByText('A fresh start with Recovery Coffee.', { exact: true })).toBeVisible();
        else await expect(page.locator('video')).toHaveJSProperty('readyState', 4);
        await assertConsumerOnly(page);
        await page.screenshot({ path: testInfo.outputPath(`${gate}-restored.png`), fullPage: true });
        await testInfo.attach(`${gate}-restored`, { path: testInfo.outputPath(`${gate}-restored.png`), contentType: 'image/png' });
        expect(backend.submissions).toHaveLength(0);
        expect(backend.finalStarts).toHaveLength(0);
        expect(backend.checkpoints).toHaveLength(0);
        expect(backend.unexpected).toEqual([]);
      });
    }

    test('a real recorded job survives reload and polls the same handle without resubmitting', async ({ page }) => {
      // Other stage artifacts are seeded; submit -> record -> browser reload -> poll ->
      // final render below all execute the real adapters against this backend.
      const backend = await installRecoveryBackend(page, seededRun('video'));
      backend.holdVideo = true;
      await openSeededProducer(page);
      await expect.poll(() => backend.scenes[0].job_handle?.operation).toEqual({ task_id: 'recovery-video-1', task_status: 'submitted' });
      expect(backend.submissions).toHaveLength(1);
      expect(backend.actions.filter(item => item.action === 'record')).toHaveLength(1);
      const pollsBeforeReload = backend.polls.length;
      await page.reload();
      backend.holdVideo = false;
      await openOneShot(page);
      await expect(page.getByRole('heading', { name: 'Your First Cut', exact: true })).toBeVisible({ timeout: 30_000 });
      expect(backend.polls.length).toBeGreaterThan(pollsBeforeReload);
      expect(backend.polls.every(item => item.operation.task_id === 'recovery-video-1')).toBe(true);
      expect(backend.submissions).toHaveLength(1);
      expect(backend.scenes[0].status).toBe('done');
      expect(backend.row?.artifacts.gate).toBe('first_cut');
      expect(backend.checkpoints.length).toBeGreaterThan(0);
      expect(backend.unexpected).toEqual([]);
    });

    test('seeded final-render polling failure exposes Retry and preserves completed scenes', async ({ page }) => {
      const backend = await installRecoveryBackend(page, seededRun('final_render'));
      backend.finalPollFails = true;
      await openSeededProducer(page);
      await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText(/FINAL_RENDER_POLL_FAILED/)).toBeVisible();
      const completedVideo = backend.scenes[0].video_url;
      expect(backend.row?.status).toBe('error');
      expect(backend.finalStarts).toHaveLength(1); // Poll failure cannot automatically restart submitted work.
      backend.finalPollFails = false;
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your First Cut', exact: true })).toBeVisible({ timeout: 15_000 });
      expect(backend.finalStarts).toHaveLength(2); // Only the explicit customer Retry submits again.
      expect(backend.scenes[0].video_url).toBe(completedVideo);
      expect(backend.submissions).toHaveLength(0);
      expect(backend.row?.run_id).toBe(RUN_ID);
      expect(backend.row?.artifacts.gate).toBe('first_cut');
      expect(backend.unexpected).toEqual([]);
    });

    test('missing seeded run clears the stale reference and returns to launch', async ({ page }) => {
      const backend = await installRecoveryBackend(page);
      backend.row = null;
      await openSeededProducer(page);
      await expect(page.getByPlaceholder('Brand name', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => localStorage.getItem('osa_producer_active_run'))).toBeNull();
      expect(backend.submissions).toHaveLength(0);
      expect(backend.checkpoints).toHaveLength(0);
      expect(backend.unexpected).toEqual([]);
    });
  });
}
