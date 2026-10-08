import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import type { AdReferenceBrief, AdReferencePacket, MarketResearchReport } from '../../types.js';
import type { OneShotDraft } from '../../utils/oneShotDraft.js';
import { readStored } from './legacyRecovery.js';
import { IMAGE, RUN_ID, assertConsumerOnly, installRecoveryBackend, openOneShot, openSeededProducer, seededRun } from './fixtures/oneshotRecovery.js';

const SYNTHETIC = JSON.parse(readFileSync('tests/fixtures/ad-reference.synthetic.json', 'utf8')) as AdReferencePacket;
const ACCEPTANCE = 'I reviewed these observations and collection limits';
const STOP_ERROR = 'REFERENCE_SMOKE_SCRIPT_STOP';
const SKELETON_RULE = "the format's beat-0 skeleton rule ALWAYS wins over this line — reframe it to fit the skeleton, never copy it as the opener";

const REPORT: MarketResearchReport = {
  subject: 'Recovery Coffee',
  winningAvatar: 'Morning coffee drinkers', demographics: 'Adult home coffee drinkers',
  dayInTheLife: 'A morning coffee before work', bleedingNeck: 'Rushed mornings',
  deepFear: 'Another disappointing cup', threeAmThought: 'How can mornings be easier?',
  graveyard: [], objectionToUs: 'Will I enjoy the flavor?', magicGenie: 'An enjoyable daily cup',
  emotionalPayoff: 'A calm start', statusUpgrade: 'A dependable morning routine',
  bigIdea: 'Mock research fallback', headlines: ['A calmer morning'], videoHooks: [],
  villain: 'Rushed routines', competitorMatrix: [],
  fbAdLibraryAngles: [{ format: 'UGC', angle: 'UNSELECTED_RESEARCH_FALLBACK',
    openingLine: 'UNSELECTED_RESEARCH_HOOK', whyItWorks: 'Invented research fixture' }],
  rawEvidence: [], contrarianTruth: 'Convenience can matter more than price',
  narrativeReport: 'Invented research used only for a fail-closed browser test.',
};

function observedTestPacket(): AdReferencePacket {
  // This is invented browser-test input. Changing evidenceMode exercises the
  // observed-input path; it NEVER verifies or promotes the synthetic fixture.
  const packet = structuredClone(SYNTHETIC);
  packet.id = 'invented-observed-browser-test';
  packet.evidenceMode = 'observed';
  return packet;
}

const readyDraft = (): OneShotDraft => ({
  hero: IMAGE, heroDescription: 'A coffee packet used only by this browser fixture.',
  offer: SYNTHETIC.subject.offer, brandName: SYNTHETIC.subject.brandName, price: '199', forceFresh: true,
  servicePhotos: [], serviceArchetype: 'venue', reArchetype: 'listing', localService: false,
  businessAddress: '', vertical: 'product', recipe: 'real_talk', format: 'ugc', strategy: 'Testimonial',
  presenterMode: 'upload', gender: 'Any', ageRange: '', ethnicity: 'Filipino', avatarUrl: IMAGE,
  language: 'English', aspectRatio: '9:16', voiceId: 'fixture-voice',
});

async function installReferenceBackend(page: Page) {
  const recovery = await installRecoveryBackend(page);
  const gemini: { flow: string; input: Record<string, unknown> }[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  // Installed after the fail-closed fallback: only these exact local POST
  // requests are handled here. Every other request keeps the original guard.
  await page.route('http://localhost:5173/api/gemini/text', async route => {
    const request = route.request();
    if (request.method() !== 'POST') return route.fallback();
    const body = request.postDataJSON();
    if (!['marketmind', 'adscript'].includes(body.flow)) return route.fallback();
    gemini.push(body);
    if (body.flow === 'marketmind') return route.fulfill({ json: REPORT });
    return route.fulfill({ status: 503, json: { error: STOP_ERROR } });
  });
  return { recovery, gemini, pageErrors };
}

async function openReadyComposer(page: Page, engine: 'steps' | 'producer') {
  // Use a local mocked blank document so durable state is present BEFORE any
  // application module hydrates. No helper server or provider call is needed.
  await page.route('http://localhost:5173/__reference_seed', route =>
    route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Reference test seed</title>' }));
  await page.goto('/__reference_seed');
  await page.evaluate(draft => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open('grifon-oneshot', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('draft');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('draft', 'readwrite');
      transaction.objectStore('draft').put(draft, 'current');
      transaction.oncomplete = () => { database.close(); resolve(); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }), readyDraft());
  await page.goto(`/app?osaEngine=${engine}`);
  await openOneShot(page);
  if (engine === 'steps') {
    await expect(page.getByRole('heading', { name: 'Resume your draft?' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
  }
  await expect(page.getByPlaceholder('Brand name', { exact: true })).toHaveValue(SYNTHETIC.subject.brandName);
  await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
}

async function importPacket(page: Page, packet: AdReferencePacket) {
  await expect(page.getByRole('button', { name: 'Import reference packet', exact: true })).toBeVisible();
  await page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({
    name: 'reference-browser-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(packet)),
  });
  await expect(page.getByRole('region', { name: 'Ad references', exact: true })).toBeVisible();
}

async function selectFirstConcept(page: Page, packet: AdReferencePacket) {
  const references = page.getByRole('region', { name: 'Ad references', exact: true });
  const concept = packet.concepts[0];
  const select = references.getByRole('button', { name: `Select ${concept.title}`, exact: true });
  await expect(select).toBeDisabled();
  await references.getByRole('checkbox', { name: ACCEPTANCE, exact: true }).check();
  await expect(select).toBeEnabled();
  await select.click();
  await expect(references.getByRole('button', { name: `Selected ${concept.title}`, exact: true })).toBeVisible();
}

function assertNoGeneration(backend: Awaited<ReturnType<typeof installReferenceBackend>>) {
  expect(backend.gemini).toEqual([]);
  expect(backend.recovery.submissions).toEqual([]);
  expect(backend.recovery.finalStarts).toEqual([]);
  expect(backend.recovery.checkpoints).toEqual([]);
  expect(backend.recovery.unexpected).toEqual([]);
  expect(backend.pageErrors).toEqual([]);
}

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' });

test('invalid saved reference has an explicit fresh-brief recovery that keeps the cloud run', async ({ page }) => {
  const seed = seededRun('storyboard');
  const brief: AdReferenceBrief = { packet: observedTestPacket(), selectedConceptId: SYNTHETIC.concepts[0].id, acceptedLimits: true };
  brief.packet.sources[0].libraryId = 'bad-id';
  seed.row.input.referenceBrief = brief;
  const backend = await installRecoveryBackend(page, seed);
  const originalRow = structuredClone(backend.row);
  await openSeededProducer(page);
  await expect(page.getByRole('heading', { name: 'Saved ad needs a new brief' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('numeric Meta ID');
  expect(await page.evaluate(() => localStorage.getItem('osa_producer_active_run'))).toBe(RUN_ID);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect.poll(() => backend.reads.length).toBeGreaterThan(1);
  await expect(page.getByRole('heading', { name: 'Saved ad needs a new brief' })).toBeVisible();
  await page.getByRole('button', { name: 'Start over', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Import reference packet', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('osa_producer_active_run'))).toBeNull();
  expect(backend.row).toEqual(originalRow);
  expect(backend.checkpoints).toEqual([]);
  expect(backend.actions).toEqual([]);
  expect(backend.submissions).toEqual([]);
  expect(backend.finalStarts).toEqual([]);
  await page.reload();
  await openOneShot(page);
  await expect(page.getByRole('button', { name: 'Import reference packet', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Selected/ })).toHaveCount(0);
  expect(backend.row).toEqual(originalRow);
  expect(backend.unexpected).toEqual([]);
});

test('a slow or invalid reimport cannot replace a newer explicit choice', async ({ page }) => {
  const backend = await installReferenceBackend(page);
  await openReadyComposer(page, 'steps');
  const packet = observedTestPacket();
  await importPacket(page, packet);
  const references = page.getByRole('region', { name: 'Ad references', exact: true });
  await references.getByRole('checkbox', { name: ACCEPTANCE, exact: true }).check();
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = function () {
      if (this.name !== 'slow-reference.json') return original.call(this);
      return new Promise<string>(resolve => {
        (window as any).releaseReferenceImport = async () => { resolve(await original.call(this)); };
      });
    };
  });
  const newer = { ...structuredClone(packet), id: 'slow-packet' };
  const file = page.locator('input[type="file"][accept="application/json,.json"]');
  await file.setInputFiles({ name: 'slow-reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(newer)) });
  await expect.poll(() => page.evaluate(() => typeof (window as any).releaseReferenceImport)).toBe('function');
  await references.getByRole('button', { name: `Select ${packet.concepts[0].title}`, exact: true }).click();
  await page.evaluate(async () => { await (window as any).releaseReferenceImport(); });
  await expect(references.getByRole('button', { name: `Selected ${packet.concepts[0].title}`, exact: true })).toBeVisible();
  const stored = () => readStored<OneShotDraft>(page, 'grifon-oneshot', 'draft', 'current');
  await expect.poll(async () => (await stored())?.referenceBrief?.selectedConceptId).toBe(packet.concepts[0].id);
  expect((await stored())?.referenceBrief?.packet.id).toBe(packet.id);
  await file.setInputFiles({ name: 'invalid-reference.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(references.getByRole('alert')).toContainText('valid JSON');
  await expect(references.getByRole('button', { name: `Selected ${packet.concepts[0].title}`, exact: true })).toBeVisible();
  expect((await stored())?.referenceBrief?.packet.id).toBe(packet.id);
  assertNoGeneration(backend);
  await page.getByRole('button', { name: 'Remove references', exact: true }).click();
  await expect(references.getByRole('button', { name: /Selected/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
  assertNoGeneration(backend);
});

for (const engine of ['steps', 'producer'] as const) {
  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    test.describe(`${engine} reference brief at ${viewport.width}px`, () => {
      test.use({ viewport });

      test('review and selection are local, survive reload, and reach the stopped script request', async ({ page }, testInfo) => {
        const backend = await installReferenceBackend(page);
        await openReadyComposer(page, engine);
        assertNoGeneration(backend);
        const packet = observedTestPacket();
        await importPacket(page, packet);
        const references = page.getByRole('region', { name: 'Ad references', exact: true });
        await expect(references.getByRole('checkbox', { name: ACCEPTANCE, exact: true })).not.toBeChecked();
        for (const concept of packet.concepts) {
          await expect(references.getByText(concept.title, { exact: false }).first()).toBeVisible();
          await expect(references.getByText(concept.testHypothesis, { exact: false })).toBeVisible();
        }
        for (const summary of await references.locator('summary').filter({ hasText: 'Source-linked observations' }).all()) {
          await summary.click();
        }
        for (const source of packet.sources) {
          await expect(references.locator(`a[href="${source.sourceUrl}"]`).first()).toBeVisible();
          for (const observation of source.observations) {
            await expect(references.getByText(observation.text, { exact: true }).first()).toBeVisible();
          }
        }
        for (const competitor of packet.competitors) {
          for (const limit of competitor.limitations) {
            await expect(references.getByText(limit, { exact: false }).first()).toBeVisible();
          }
        }
        await selectFirstConcept(page, packet);
        await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
        await assertConsumerOnly(page);
        assertNoGeneration(backend);
        const screenshot = testInfo.outputPath(`reference-review-${engine}-${viewport.width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        await testInfo.attach('reference-review', { path: screenshot, contentType: 'image/png' });

        const stored = () => readStored<OneShotDraft & { referenceBrief?: AdReferenceBrief }>(page, 'grifon-oneshot', 'draft', 'current');
        await expect.poll(async () => (await stored())?.referenceBrief?.selectedConceptId).toBe(packet.concepts[0].id);
        expect((await stored())?.referenceBrief?.acceptedLimits).toBe(true);
        await page.reload();
        await openOneShot(page);
        if (engine === 'steps') {
          await expect(page.getByRole('heading', { name: 'Resume your draft?' })).toBeVisible();
          await page.getByRole('button', { name: 'Resume', exact: true }).click();
        }
        await expect(references.getByRole('checkbox', { name: ACCEPTANCE, exact: true })).toBeChecked();
        await expect(references.getByRole('button', { name: `Selected ${packet.concepts[0].title}`, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Make My Ad', exact: true })).toBeEnabled();
        // Service adapters defer calls by a second. Observe beyond that boundary
        // to catch a restored composer incorrectly starting production by itself.
        await page.waitForTimeout(1500);
        assertNoGeneration(backend);
        await page.getByRole('button', { name: 'Make My Ad', exact: true }).click();
        await expect.poll(() => backend.gemini.find(call => call.flow === 'adscript'), { timeout: 25_000 }).toBeTruthy();
        const script = backend.gemini.find(call => call.flow === 'adscript')!;
        expect(script.input.chosenAngleBrief).toContain(packet.concepts[0].sellingAngle);
        expect(script.input.chosenAngleBrief).toContain(packet.concepts[0].hook);
        expect(script.input.chosenAngleBrief).toContain(SKELETON_RULE);
        expect(script.input.chosenAngleBrief).not.toContain('UNSELECTED_RESEARCH_FALLBACK');
        expect(backend.gemini.map(call => call.flow)).toEqual(['marketmind', 'adscript']);
        expect(backend.recovery.submissions).toEqual([]);
        expect(backend.recovery.finalStarts).toEqual([]);
        expect(backend.recovery.unexpected).toEqual([]);
        expect(backend.pageErrors).toEqual([]);
        // The response is a deliberate 503. Close before any normal retry timer
        // fires; do not click Retry or proceed into paid image/video stages.
        await page.close();
      });

      test('blocked evidence cannot be selected, synthetic and mismatched selections block generation', async ({ page }) => {
        const backend = await installReferenceBackend(page);
        await openReadyComposer(page, engine);
        await importPacket(page, SYNTHETIC);
        await selectFirstConcept(page, SYNTHETIC);
        const makeAd = page.getByRole('button', { name: 'Make My Ad', exact: true });
        await expect(makeAd).toBeDisabled();
        await expect(page.getByRole('region', { name: 'Ad references', exact: true }).getByRole('alert')).toHaveText('Ad references: Synthetic fixture is for review only and is not production-ready. Remove references or import operator-recorded evidence.');
        assertNoGeneration(backend);
        await page.getByRole('button', { name: 'Remove references', exact: true }).click();
        await expect(makeAd).toBeEnabled();
        const blocked = observedTestPacket();
        blocked.competitors[0].collectionStatus = 'blocked';
        await importPacket(page, blocked);
        const references = page.getByRole('region', { name: 'Ad references', exact: true });
        await references.getByRole('checkbox', { name: ACCEPTANCE, exact: true }).check();
        for (const concept of blocked.concepts) {
          await expect(references.getByRole('button', { name: `Select ${concept.title}`, exact: true })).toBeDisabled();
        }
        await expect(references.getByText('Blocked: this concept needs usable collection evidence.', { exact: true })).toHaveCount(3);
        assertNoGeneration(backend);
        await page.getByRole('button', { name: 'Remove references', exact: true }).click();
        await expect(makeAd).toBeEnabled();
        const mismatched = observedTestPacket();
        mismatched.subject.brandName = 'Different Coffee';
        await importPacket(page, mismatched);
        await selectFirstConcept(page, mismatched);
        await expect(makeAd).toBeDisabled();
        await expect(references.getByRole('alert')).toHaveText('Ad references: Selected packet brandName does not match this brief. Restore the packet subject or remove references.');
        await page.waitForTimeout(1500);
        assertNoGeneration(backend);
        await page.getByRole('button', { name: 'Remove references', exact: true }).click();
        await expect(makeAd).toBeEnabled();
        await assertConsumerOnly(page);
        assertNoGeneration(backend);
      });
    });
  }
}
