import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createReferenceDraft } from '../../services/companionReferenceDraft';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview';
import { createFixtureJobIntent, type FixtureJobIntent } from '../../services/companionFixtureJobs';
import { createReferenceQueue } from '../../services/companionReferenceQueue';
import { FIXTURE_EXECUTION_RUNTIME, FIXTURE_EXECUTION_POLICY, reduceFixtureExecution, type FixtureExecutionReceipt, type FixtureExecutionCommand } from '../../services/companionExecutionSafety';
import { FIXTURE_INPUT_VERIFICATION_RUNTIME, fixtureInputTextSha256, type FixtureInputVerificationReceipt } from '../../services/companionInputVerification';

const owner = '11111111-1111-4111-8111-111111111111';
async function backend() {
  const jobs = await Promise.all(['a', 'b'].map(async (letter, index) => {
    const inputHash = letter.repeat(64), plan = createSampleReview(createReferenceDraft(), inputHash, 0);
    plan.direction = `Safety fixture ${index + 1}`;
    const intent = await createFixtureJobIntent(owner, `safety-chat-${index}`, confirmSampleReview(plan, inputHash, 0), 'normal', { version: 1, saveId: letter.repeat(64), inputHash });
    const { plan: _, ...queue } = createReferenceQueue(intent.plan, 0, 'normal');
    return { intent, wire: { runtime: 'supabase-cloud-fixture-v1', intentText: JSON.stringify(intent), queue, updatedAt: 1, nextDueAt: null } };
  }));
  const runs = new Map<string, FixtureExecutionReceipt>(), calls: { name: string; args: Record<string, unknown> }[] = [];
  const inputReceipts = new Map<string, FixtureInputVerificationReceipt>();
  let budget = { capUnits: 120, heldUnits: 0, settledUnits: 0 }, corrupt = false;
  let heldKey: string | null = null, release: (() => void) | undefined;
  const quote = (intent: FixtureJobIntent) => {
    const now = Date.now();
    const receipt: FixtureExecutionReceipt = { version: 1, runtime: FIXTURE_EXECUTION_RUNTIME, fixture: true, actualCents: 0, currency: 'TEST_UNIT', runId: randomUUID(), runKey: intent.requestId, inputHash: intent.plan.inputHash, ownerId: owner, cancelled: false, issuedAt: now, expiresAt: now + FIXTURE_EXECUTION_POLICY.quoteLifetimeMs, budget: { ...budget }, stages: structuredClone(FIXTURE_EXECUTION_POLICY.stages), attempts: [] };
    runs.set(intent.requestId, receipt); return receipt;
  };
  const server = createServer(async (request, response) => {
    const send = (data: unknown, error: unknown = null) => { response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify({ data, error })); };
    if (request.headers['x-fixture-owner'] !== owner) { send([], null); return; }
    const name = new URL(request.url!, 'http://localhost').pathname.split('/').pop()!;
    let raw = ''; for await (const chunk of request) raw += chunk;
    const args = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    calls.push({ name, args });
    if (name === 'grifon_fixture_list') { send(jobs.map(job => job.wire)); return; }
    if (name === 'grifon_fixture_get') { send(jobs.find(job => job.intent.requestId === args.p_request_id)?.wire ?? null); return; }
    if (name === 'grifon_fixture_result_get') { send(null); return; }
    if (name === 'grifon_fixture_input_verification_get') { send(inputReceipts.get(args.p_request_id as string) ?? null); return; }
    if (name === 'verify-inputs') {
      const job = jobs.find(item => item.intent.requestId === args.requestId);
      if (!job) { response.writeHead(404); response.end(); return; }
      let receipt = inputReceipts.get(job.intent.requestId);
      if (!receipt) {
        receipt = { version: 1, runtime: FIXTURE_INPUT_VERIFICATION_RUNTIME, fixture: true, actualCents: 0, ownerId: owner, requestId: job.intent.requestId, sourceSaveId: job.intent.cloudReference!.saveId, inputHash: job.intent.plan.inputHash, manifestSha256: 'c'.repeat(64), planSnapshotSha256: await fixtureInputTextSha256(job.intent.plan.confirmation!.planSnapshot), decoder: 'ffmpeg-full-null-v1', orientation: 'identity-only', verifiedAt: Date.now(), verifiedMedia: [{ slot: 'reference', mimeType: 'video/webm', sizeBytes: 643, sha256: 'd'.repeat(64), width: 90, height: 160, durationSeconds: 0.5, frames: 12, decoded: true }] };
        inputReceipts.set(job.intent.requestId, receipt);
      }
      response.writeHead(200, { 'content-type': 'application/json' }); response.end(JSON.stringify(receipt)); return;
    }
    if (!name.startsWith('grifon_fixture_execution_')) { send(null, { code: 'PGRST202' }); return; }
    let run = name.endsWith('_find') || name.endsWith('_quote') ? runs.get(args.p_run_key as string) : [...runs.values()].find(item => item.runId === args.p_run_id);
    if (name.endsWith('_quote') && !run) {
      const job = jobs.find(item => item.intent.requestId === args.p_run_key && item.intent.plan.inputHash === args.p_input_hash);
      if (!job) { send(null, { code: '22023' }); return; }
      run = quote(job.intent);
    }
    if (name.endsWith('_find') && heldKey === args.p_run_key) await new Promise<void>(resolve => { release = resolve; });
    if (!run) { send(null); return; }
    run = { ...run, budget: { ...budget } };
    try {
      let command: FixtureExecutionCommand | null = null;
      if (name.endsWith('_reserve')) command = { action: 'reserve', stage: args.p_stage as 'clip', submissionKey: args.p_submission_key as string };
      if (name.endsWith('_cancel')) command = { action: 'cancel' };
      if (name.endsWith('_command')) command = { action: args.p_action as 'begin', submissionKey: args.p_submission_key as string, fakeHandle: args.p_fake_handle as string | null, evidenceKey: args.p_evidence_key as string | null };
      if (command) { run = reduceFixtureExecution(run, command, Date.now()); budget = { ...run.budget }; runs.set(run.runKey, structuredClone(run)); }
      send(corrupt ? { ...run, actualCents: 1 } : run);
    } catch { send(null, { code: '55000' }); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('Fixture listener unavailable');
  return { jobs, runs, calls, baseUrl: `http://127.0.0.1:${address.port}`, quote, corrupt: () => { corrupt = true; }, hold: (key: string) => { heldKey = key; }, release: () => { heldKey = null; release?.(); }, close: () => new Promise<void>(resolve => { heldKey = null; release?.(); server.close(() => resolve()); server.closeAllConnections(); }) };
}
type Backend = Awaited<ReturnType<typeof backend>>;
async function connect(context: BrowserContext, service: Backend) {
  const forbidden: string[] = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.hostname === 'fonts.googleapis.com') { await route.fulfill({ status: 200, contentType: 'text/css', body: '' }); return; }
    if (url.pathname.startsWith('/__fixture-cloud-workflow/')) { const response = await route.fetch({ url: service.baseUrl + url.pathname }); await route.fulfill({ response }); return; }
    if (url.pathname.startsWith('/api/') || !['localhost', '127.0.0.1'].includes(url.hostname)) { forbidden.push(request.method() + ' ' + url.pathname); await route.abort(); return; }
    await route.continue();
  });
  return forbidden;
}
async function open(page: Page, intent: FixtureJobIntent) {
  await page.goto('/companion-chat-preview.html?workflow=1&executionSafety=1');
  await page.getByRole('button', { name: 'Open conversations', exact: true }).click();
  await page.getByRole('button', { name: 'Cloud fixture jobs', exact: true }).click();
  await page.getByRole('button', { name: `Open cloud fixture job: ${intent.requestId}`, exact: true }).click();
  const panel = page.getByLabel('Budget and recovery check', { exact: true });
  await panel.getByText('Budget and recovery check', { exact: true }).click();
  return panel;
}
test.use({ viewport: { width: 390, height: 844 } });

test('unknown allowance survives cancellation and another browser, then fake success settles once without a new quote', async ({ browser }) => {
  const service = await backend();
  let context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const forbidden = await connect(context, service); const page = await context.newPage();
    let panel = await open(page, service.jobs[0].intent);
    await expect(panel.getByText('No test budget check exists for this job.', { exact: false })).toBeVisible();
    expect(service.calls.filter(call => /execution_(quote|reserve|command|cancel)$/.test(call.name))).toEqual([]);
    await panel.getByRole('button', { name: 'Create test budget check', exact: true }).click();
    await panel.getByRole('button', { name: 'Simulate unknown submission', exact: true }).click();
    await expect(panel.getByTestId('execution-test-state')).toContainText('Unknown test outcome.');
    await expect(panel.getByTestId('execution-test-budget')).toContainText('Held12');
    await panel.getByRole('button', { name: 'Cancel test budget check', exact: true }).click();
    await expect(panel.getByTestId('execution-test-state')).toContainText('Test check cancelled.');
    await expect(panel.getByTestId('execution-test-budget')).toContainText('Held12');
    await context.close();
    context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const forbiddenReopen = await connect(context, service); const reopened = await context.newPage();
    panel = await open(reopened, service.jobs[0].intent);
    await expect(panel.getByTestId('execution-test-state')).toContainText('Unknown test outcome.');
    expect(service.calls.filter(call => call.name.endsWith('_quote'))).toHaveLength(1);
    await panel.getByRole('button', { name: 'Reconcile fake success', exact: true }).click();
    await expect(panel.getByTestId('execution-test-state')).toContainText('Fake success settled once.');
    await expect(panel.getByTestId('execution-test-budget')).toContainText('Held0Settled12Cap120');
    await panel.getByRole('button', { name: 'Refresh test budget', exact: true }).click();
    await expect(panel.getByRole('button', { name: 'Reconcile fake success', exact: true })).toHaveCount(0);
    const run = service.runs.get(service.jobs[0].intent.requestId)!;
    expect(run.attempts).toHaveLength(1); expect(run.budget.settledUnits).toBe(12);
    expect(service.calls.filter(call => call.name.endsWith('_quote'))).toHaveLength(1);
    expect(service.calls.filter(call => call.args.p_action === 'succeed')).toHaveLength(1);
    expect([...forbidden, ...forbiddenReopen]).toEqual([]);
    expect(await reopened.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await panel.screenshot({ path: '.tmp/execution-safety-390.png' });
  } finally { await context.close(); await service.close(); }
});

test('normal simulation has one fixed attempt and malformed saved receipts fail closed', async ({ browser }) => {
  const service = await backend(); const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const forbidden = await connect(context, service); const page = await context.newPage();
    let panel = await open(page, service.jobs[0].intent);
    await panel.getByRole('button', { name: 'Create test budget check', exact: true }).click();
    await panel.getByRole('button', { name: 'Simulate normal completion', exact: true }).click();
    await expect(panel.getByTestId('execution-test-state')).toContainText('Fake success settled once.');
    await expect(panel.getByRole('button', { name: 'Simulate normal completion', exact: true })).toHaveCount(0);
    expect(service.runs.get(service.jobs[0].intent.requestId)!.attempts).toHaveLength(1);
    service.corrupt();
    await page.getByRole('button', { name: `Open cloud fixture job: ${service.jobs[1].intent.requestId}`, exact: true }).click();
    service.quote(service.jobs[1].intent);
    panel = page.getByLabel('Budget and recovery check', { exact: true });
    await panel.getByText('Budget and recovery check', { exact: true }).click();
    await panel.getByRole('button', { name: 'Refresh test budget', exact: true }).click();
    await expect(panel.getByRole('alert')).toContainText('invalid receipt');
    await expect(panel.getByRole('button', { name: 'Create test budget check', exact: true })).toHaveCount(0);
    await expect(panel.getByRole('button', { name: 'Simulate normal completion', exact: true })).toHaveCount(0);
    expect(forbidden).toEqual([]);
  } finally { await context.close(); await service.close(); }
});

test('late budget reads cannot replace the selected linked job', async ({ browser }) => {
  const service = await backend(); const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await connect(context, service); service.jobs.forEach(job => service.quote(job.intent));
    service.hold(service.jobs[0].intent.requestId);
    const page = await context.newPage(); await open(page, service.jobs[0].intent);
    await page.getByRole('button', { name: `Open cloud fixture job: ${service.jobs[1].intent.requestId}`, exact: true }).click();
    const panel = page.getByLabel('Budget and recovery check', { exact: true });
    await panel.getByText('Budget and recovery check', { exact: true }).click();
    await expect(panel.getByTestId('execution-test-budget')).toBeVisible();
    await panel.getByText('Test receipt details', { exact: true }).click();
    await expect(panel).toContainText(service.jobs[1].intent.requestId);
    service.release();
    await expect.poll(() => service.calls.filter(call => call.name.endsWith('_find')).length).toBeGreaterThanOrEqual(2);
    await panel.getByRole('button', { name: 'Refresh test budget', exact: true }).click();
    await expect(panel).toContainText(service.jobs[1].intent.requestId);
    await expect(panel).not.toContainText(service.jobs[0].intent.requestId);
    expect(service.calls.some(call => call.name.endsWith('_quote'))).toBe(false);
  } finally { service.release(); await context.close(); await service.close(); }
});

test('saved input check reopens its simulated receipt read-only without advancing a job or creating an allowance', async ({ browser }) => {
  const service = await backend(); let context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await connect(context, service); let page = await context.newPage(); await open(page, service.jobs[0].intent);
    let panel = page.getByLabel('Saved input file check', { exact: true });
    await panel.getByText('Saved input file check', { exact: true }).click();
    await expect(panel.getByText('No saved decode receipt for this job.', { exact: false })).toBeVisible();
    expect(service.calls.filter(call => call.name === 'verify-inputs')).toHaveLength(0);
    await panel.getByRole('button', { name: 'Verify saved input files', exact: true }).click();
    await expect(panel.getByTestId('fixture-input-verification')).toHaveText('Simulated fixture receipt · 1 file · actual spend PHP 0.00.');
    await expect(panel.getByText('Simulated decode receipt only.', { exact: false })).toBeVisible();
    await context.close(); context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await connect(context, service); page = await context.newPage(); await open(page, service.jobs[0].intent);
    panel = page.getByLabel('Saved input file check', { exact: true });
    await panel.getByText('Saved input file check', { exact: true }).click();
    await expect(panel.getByTestId('fixture-input-verification')).toContainText('Simulated fixture receipt');
    expect(service.calls.filter(call => call.name === 'verify-inputs')).toHaveLength(1);
    expect(service.calls.filter(call => /execution_(quote|reserve|command|cancel)$/.test(call.name))).toHaveLength(0);
    expect(service.calls.some(call => ['grifon_fixture_start', 'grifon_fixture_command'].includes(call.name))).toBe(false);
    await panel.screenshot({ path: '.tmp/input-verification-390.png' });
  } finally { await context.close(); await service.close(); }
});
