import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapReportToWizard } from '../../services/oneShotIntake.js';
import {
  createProductionRun,
  runProduction,
  type ProducerDeps,
  type ProductionInput,
  type ProductionRun,
  type ProductionStageId,
} from '../../services/producerOrchestrator.js';
import type { BusinessInfo, MarketResearchReport, Script } from '../../types.js';

const save = vi.hoisted(() => vi.fn(async () => ({ changed: true, revision: 1 })));
vi.mock('../../services/producerRunService.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../services/producerRunService.js')>(),
  saveRunCheckpoint: save,
}));
import { realProducerDeps } from '../../services/producerDeps.js';

const input = (): ProductionInput => ({
  brandName: 'Fixture Brand', offer: 'Supplied offer', price: '199',
  productName: 'Fixture Product', productDescription: 'Supplied product features', heroImageBase64: '',
  avatar: { prompt: '', url: 'fixture-presenter', description: 'Fixture presenter', ethnicity: '' },
  voiceId: 'fixture', language: 'English', aspectRatio: '9:16', scriptType: 'UGC',
});
const report = (): MarketResearchReport => ({
  winningAvatar: 'Generated audience hypothesis', bleedingNeck: 'Generated pain hypothesis',
  emotionalPayoff: 'Generated emotional promise', magicGenie: 'Generated desired outcome',
  contrarianTruth: 'Generated contrarian claim', villain: 'Generated villain claim',
  bigIdea: 'Generated positioning hypothesis', rawEvidence: [],
} as unknown as MarketResearchReport);
const script: Script = { hook1: ['Fixture hook'], hook2: [], body: ['Fixture body'] };
const automaticMapping = { origin: 'automatic-intake', version: 1 } as const;
const afterResearch: ProductionStageId[] = ['market_research', 'storyboard', 'scene_images', 'video_prompts', 'thumbnail', 'video', 'voices', 'edl', 'final_render'];

async function driveScript(run: ProductionRun, research = report(), cache = false) {
  const abort = new AbortController();
  const generateAdScript = vi.fn<ProducerDeps['generateAdScript']>(async () => {
    abort.abort();
    return script;
  });
  const generateMarketResearch = vi.fn(async () => research);
  const deps = {
    now: Date.now, persist: realProducerDeps.persist, generateAdScript, generateMarketResearch,
    getCachedResearch: vi.fn(async () => cache ? research : null), run: {},
  } as unknown as ProducerDeps;
  await runProduction(run, { onUpdate() {}, signal: abort.signal, userId: run.userId }, deps);
  return { generateAdScript, generateMarketResearch };
}

beforeEach(() => save.mockClear());

describe('automatic One-Shot product claim handoff', () => {
  it.each([
    ['emotional payoff', { emotionalPayoff: 'Generated emotional promise', magicGenie: 'Generated desired outcome' }],
    ['magic genie fallback', { emotionalPayoff: '', magicGenie: 'Generated desired outcome' }],
  ])('keeps %s in the report instead of promoting it to a product benefit', (_label, fields) => {
    const value = input();
    const research = { ...report(), ...fields };
    const original = structuredClone(research);
    const mapped = mapReportToWizard(value, research);
    expect(mapped.businessInfo.benefit).toBe(value.offer);
    expect(mapped.businessInfo.separator).toBe('');
    expect(mapped.businessInfo.features).toBe(value.productDescription);
    expect(mapped.clientDetails.offer).toBe(value.offer);
    expect(mapped.businessInfo.audience).toBe(research.winningAvatar);
    expect(mapped.businessInfo.painPoint).toBe(research.bleedingNeck);
    expect(research).toEqual(original);
  });

  it('keeps an empty supplied offer empty rather than filling it with generated claims', () => {
    const value = { ...input(), offer: '' };
    expect(mapReportToWizard(value, report()).businessInfo).toMatchObject({ benefit: '', separator: '' });
  });

  it.each([false, true])('marks and checkpoints known automatic mapping (research reused: %s)', async (cache) => {
    const research = report();
    const original = structuredClone(research);
    const run = createProductionRun(input(), 'owner');
    const { generateAdScript, generateMarketResearch } = await driveScript(run, research, cache);
    expect(generateMarketResearch).toHaveBeenCalledTimes(cache ? 0 : 1);
    expect(generateAdScript.mock.calls[0][0]).toMatchObject({ benefit: run.input.offer, separator: '', features: run.input.productDescription });
    expect(run).toMatchObject({ businessInfoMapping: automaticMapping });
    expect(save.mock.calls.at(-1)![1].artifacts).toMatchObject({ businessInfoMapping: automaticMapping });
    expect(run.report).toBe(research);
    expect(research).toEqual(original);
  });

  it('does not automatically use the generated contrarian claim as the script hook seed', async () => {
    const run = createProductionRun(input(), 'owner');
    const { generateAdScript } = await driveScript(run);
    expect(generateAdScript).toHaveBeenCalledOnce();
    expect(generateAdScript.mock.calls[0][5]).toBe('');
    expect(run.report!.contrarianTruth).toBe('Generated contrarian claim');
  });

  it('reprojects only quarantined fields before a marked pending script resumes', async () => {
    const value = { ...input(), offer: 'Updated supplied offer' };
    const businessInfo = { ...mapReportToWizard(value, report()).businessInfo,
      benefit: 'Stale generated benefit', separator: 'Stale generated differentiator',
      features: 'Preserved edited features', audience: 'Preserved edited audience', ugcProFormat: 'tutorial' as const };
    const run = createProductionRun(value, 'owner', { prefill: { report: report(), businessInfo }, doneStages: afterResearch });
    Object.assign(run, { businessInfoMapping: automaticMapping });
    const { generateAdScript } = await driveScript(run);
    expect(generateAdScript.mock.calls[0][0]).toMatchObject({ benefit: value.offer, separator: '',
      features: 'Preserved edited features', audience: 'Preserved edited audience', ugcProFormat: 'tutorial' });
    expect(generateAdScript.mock.calls[0][5]).toBe('');
    expect(save.mock.calls.at(-1)![1].artifacts).toMatchObject({ businessInfoMapping: automaticMapping,
      businessInfo: { benefit: value.offer, separator: '' } });
  });

  it.each(['oneshot', 'concierge'] as const)('preserves unmarked manual %s fields and seeds without inferring origin from mode', async (mode) => {
    const businessInfo = { product: 'Manual product', benefit: 'Manually supplied benefit', separator: 'Manually supplied differentiator' } as BusinessInfo;
    const research = { ...report(), contrarianTruth: 'Manual seed' };
    const run = createProductionRun(input(), 'owner', { mode, prefill: { report: research, businessInfo }, doneStages: afterResearch });
    const { generateAdScript } = await driveScript(run);
    expect(generateAdScript.mock.calls[0][0]).toBe(businessInfo);
    expect(businessInfo).toMatchObject({ benefit: 'Manually supplied benefit', separator: 'Manually supplied differentiator' });
    expect(generateAdScript.mock.calls[0][5]).toBe('Manual seed');
    expect(run).not.toHaveProperty('businessInfoMapping');
  });

  it('does not infer automatic origin from an unmarked legacy projection', async () => {
    const research = report();
    const businessInfo = { ...mapReportToWizard(input(), research).businessInfo,
      benefit: research.emotionalPayoff, separator: research.contrarianTruth };
    const run = createProductionRun(input(), 'owner', { prefill: { report: research, businessInfo }, doneStages: afterResearch });
    const { generateAdScript } = await driveScript(run);
    expect(generateAdScript.mock.calls[0][0]).toBe(businessInfo);
    expect(businessInfo.benefit).toBe(research.emotionalPayoff);
    expect(generateAdScript.mock.calls[0][5]).toBe(research.contrarianTruth);
    expect(run).not.toHaveProperty('businessInfoMapping');
  });

  it('leaves a completed marked script and its business fields untouched', async () => {
    const businessInfo = { product: 'Completed product', benefit: 'Completed benefit', separator: 'Completed differentiator' } as BusinessInfo;
    const run = createProductionRun(input(), 'owner', { prefill: { report: report(), businessInfo, script,
      finalScript: ['Approved completed script'], storyboardApproved: true }, doneStages: [...afterResearch, 'script'] });
    Object.assign(run, { businessInfoMapping: automaticMapping });
    const { generateAdScript } = await driveScript(run);
    expect(generateAdScript).not.toHaveBeenCalled();
    expect(run.script).toBe(script);
    expect(run.finalScript).toEqual(['Approved completed script']);
    expect(run.businessInfo).toBe(businessInfo);
    expect(businessInfo).toMatchObject({ benefit: 'Completed benefit', separator: 'Completed differentiator' });
  });
});
