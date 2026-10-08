import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import {
  RUN_ID, assertConsumerOnly, installRecoveryBackend, openOneShot, openSeededProducer, seededRun,
} from './fixtures/oneshotRecovery.js';

// Invented export metadata only. The seeded recovery backend blocks every live
// provider request; this fixture does not attest a real run or real observations.
const LINEAGE = {
  version: 1,
  producerRunId: RUN_ID,
  runRevision: 4,
  reference: {
    packetId: 'invented-export-reference', conceptId: 'invented-coffee-proof',
    sourceIds: ['invented-source'], observationIds: ['invented-observation'], evidence: 'owner-recorded',
    sources: [{ id: 'invented-source', libraryId: '200000000001', pageId: '100000000001',
      sourceUrl: 'https://www.facebook.com/ads/library/?id=200000000001', observedAt: '2026-10-08T01:00:00Z' }],
  },
};
const AUDIO_POLICIES = [{ sceneIdx: 0, policy: 'mute' }];
const CREATIVE_ID = 'fixture-verified-export';

function verifiedExport() {
  const seed = seededRun('first_cut');
  Object.assign(seed.row.artifacts, {
    finalCreativeId: CREATIVE_ID, finalLineage: LINEAGE, finalAudioPolicies: AUDIO_POLICIES,
  });
  return seed;
}

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

for (const width of [390, 375, 1280]) {
  test.describe(`export receipt at ${width}px`, () => {
    test.use({ viewport: { width, height: width === 375 ? 667 : width === 390 ? 844 : 900 } });

    test('verified receipt downloads after dashboard reload', async ({ page }, testInfo) => {
      const backend = await installRecoveryBackend(page, verifiedExport());
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await openSeededProducer(page);
      await expect(page.getByRole('heading', { name: 'Your First Cut', exact: true })).toBeVisible();
      // The existing feedback widget can overlap lower actions on mobile.
      // Dismiss through its real consumer control before using the export CTA.
      await page.getByRole('button', { name: 'Dismiss feedback', exact: true }).click();
      await page.reload();
      await openOneShot(page);
      await expect(page.getByRole('heading', { name: 'Your First Cut', exact: true })).toBeVisible();
      const receipt = page.getByRole('button', { name: 'Download Export Receipt', exact: true });
      await expect(receipt).toBeVisible();
      await expect(receipt).toBeEnabled();
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }), receipt.click(),
      ]);
      expect(download.suggestedFilename()).toContain(CREATIVE_ID);
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      const saved = await download.path();
      expect(saved).not.toBeNull();
      const payload = JSON.parse(readFileSync(saved!, 'utf8'));
      expect(payload).toEqual({ version: 1, creativeId: CREATIVE_ID, lineage: LINEAGE, audioPolicies: AUDIO_POLICIES });
      expect(JSON.stringify(payload)).not.toMatch(/downloadUrl|finalVideoUrl|finalDownloadUrl|expiring-signed-url/);
      await assertConsumerOnly(page);
      await page.screenshot({ path: testInfo.outputPath('restored-export-receipt.png'), fullPage: true });
      await testInfo.attach('restored-export-receipt', { path: testInfo.outputPath('restored-export-receipt.png'), contentType: 'image/png' });
      expect(backend.reads.length).toBeGreaterThan(1);
      expect(backend.finalStarts).toEqual([]);
      expect(backend.submissions).toEqual([]);
      expect(backend.checkpoints).toEqual([]);
      expect(backend.unexpected).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('a new cut cannot download the previous receipt while rendering', async ({ page }, testInfo) => {
      const backend = await installRecoveryBackend(page, verifiedExport());
      let releasePoll: (() => void) | undefined;
      let pollHeld = false;
      const nextCreativeId = 'fixture-new-export';
      // Override only the exact local poll; all other requests retain the
      // fail-closed recovery guard. The real preset/render adapters still run.
      await page.route('http://localhost:5173/api/render/final/poll?*', async route => {
        pollHeld = true;
        await new Promise<void>(resolve => { releasePoll = resolve; });
        await route.fulfill({ json: {
          done: true, status: 'done', url: '/__recovery/clip.webm', downloadUrl: '/__recovery/clip.webm',
          creativeId: nextCreativeId, lineage: LINEAGE, audioPolicies: AUDIO_POLICIES,
        } });
      });
      await openSeededProducer(page);
      const receipt = page.getByRole('button', { name: 'Download Export Receipt', exact: true });
      await expect(receipt).toBeEnabled();
      await page.getByRole('button', { name: 'Dismiss feedback', exact: true }).click();
      await page.getByRole('button', { name: 'AUTO', exact: true }).click();
      await expect.poll(() => backend.finalStarts.length).toBe(1);
      await expect.poll(() => pollHeld).toBe(true);
      // Both a hidden control and a disabled control prevent a stale download.
      await expect.poll(async () => !(await receipt.count()) || !(await receipt.isEnabled())).toBe(true);
      expect(backend.row?.artifacts.busy).toBe('preset');
      await assertConsumerOnly(page);
      await page.screenshot({ path: testInfo.outputPath('busy-export-receipt.png'), fullPage: true });
      await testInfo.attach('busy-export-receipt', { path: testInfo.outputPath('busy-export-receipt.png'), contentType: 'image/png' });
      releasePoll!();
      await expect(receipt).toBeEnabled();
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 5000 }), receipt.click(),
      ]);
      const saved = await download.path();
      const payload = JSON.parse(readFileSync(saved!, 'utf8'));
      expect(payload.creativeId).toBe(nextCreativeId);
      expect(backend.row?.artifacts.finalCreativeId).toBe(nextCreativeId);
      expect(backend.row?.artifacts.finalLineage).toEqual(LINEAGE);
      expect(backend.row?.artifacts.finalAudioPolicies).toEqual(AUDIO_POLICIES);
      expect(backend.submissions).toEqual([]);
      expect(backend.unexpected).toEqual([]);
    });

    test('an older export without verified lineage has no receipt', async ({ page }) => {
      const seed = seededRun('first_cut');
      // A pre-lineage saved export may have a creative ID but cannot claim a
      // verified producer/reference join. Its existing video stays downloadable.
      seed.row.artifacts.finalCreativeId = 'fixture-legacy-export';
      const backend = await installRecoveryBackend(page, seed);
      await openSeededProducer(page);
      await expect(page.getByRole('heading', { name: 'Your First Cut', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Download Ad', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Download Export Receipt', exact: true })).toHaveCount(0);
      await assertConsumerOnly(page);
      expect(backend.submissions).toEqual([]);
      expect(backend.finalStarts).toEqual([]);
      expect(backend.unexpected).toEqual([]);
    });
  });
}
