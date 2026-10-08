import { describe, expect, it, vi } from 'vitest';
import packetFixture from '../fixtures/ad-reference.synthetic.json';
import { createProductionRun, deriveAngleBrief, runProduction, type ProductionInput, type ProducerDeps, type ProductionStageId } from '../../services/producerOrchestrator.js';
import { selectedReferenceAngleReport } from '../../services/adReconBrief.js';
import { hydrateInput } from '../../components/OneShotAd/ProducerFlow.js';
import { slimCheckpointInput } from '../../services/producerRunService.js';
import type { AdReferencePacket, MarketResearchReport } from '../../types.js';

// Invented operator observations only for a mocked handoff; never real competitor evidence.
function input(): ProductionInput {
  const packet = { ...structuredClone(packetFixture), evidenceMode: 'observed' } as AdReferencePacket;
  return { ...packet.subject, price: '199', productDescription: 'Fresh coffee', heroImageBase64: '',
    avatar: { prompt: '', url: 'fixture-presenter', description: 'Fixture', ethnicity: '' }, voiceId: 'fixture', language: 'English', aspectRatio: '9:16', scriptType: 'UGC',
    referenceBrief: { packet, selectedConceptId: 'taste-demo', acceptedLimits: true } };
}
const report = { fbAdLibraryAngles: [{ format: 'UGC', angle: 'Existing generated angle', openingLine: 'Generated hook', whyItWorks: '' }], rawEvidence: ['Generated research'] } as MarketResearchReport;

async function driveScript(value: ProductionInput) {
  const abort = new AbortController();
  const generateAdScript = vi.fn(async () => { abort.abort(); return { hook1: ['Own line'], hook2: [], body: [] }; });
  const run = createProductionRun(value, 'fixture-user', { prefill: { report, businessInfo: { product: value.productName } as any },
    doneStages: ['market_research', 'storyboard', 'scene_images', 'video_prompts', 'thumbnail', 'video', 'voices', 'edl', 'final_render'] as ProductionStageId[] });
  const deps = { now: Date.now, persist: vi.fn(async () => {}), generateAdScript, run: {} } as unknown as ProducerDeps;
  await runProduction(run, { onUpdate() {}, signal: abort.signal }, deps);
  return { run, generateAdScript };
}

describe('reviewed reference handoff', () => {
  it('hands the selected concept to the real resumed producer script seam', async () => {
    const value = input();
    const { run, generateAdScript } = await driveScript(structuredClone(value));
    expect(generateAdScript).toHaveBeenCalledTimes(1);
    const angle = generateAdScript.mock.calls[0][4];
    expect(angle).toContain(value.referenceBrief!.packet.concepts[1].sellingAngle);
    expect(angle).toContain(value.referenceBrief!.packet.concepts[1].hook);
    expect(angle).toContain("the format's beat-0 skeleton rule ALWAYS wins");
    expect(angle).not.toContain('Existing generated angle');
    expect(run.report).toBe(report);
    expect(run.input.referenceBrief).toEqual(value.referenceBrief);
  });

  it('retains the original research angle when no concept was selected', async () => {
    const value = input(); value.referenceBrief = undefined;
    const { generateAdScript } = await driveScript(value);
    expect(generateAdScript.mock.calls[0][4]).toBe(deriveAngleBrief(report));
  });

  it('refuses synthetic, stale-subject and tampered persisted reviews before script calls', async () => {
    for (const mutate of [
      (v: ProductionInput) => { v.brandName = 'Different'; },
      (v: ProductionInput) => { v.referenceBrief!.packet.evidenceMode = 'synthetic'; },
      (v: ProductionInput) => { v.referenceBrief!.packet.sources[0].libraryId = 'bad'; },
    ]) {
      const value = input(); mutate(value);
      const { run, generateAdScript } = await driveScript(value);
      expect(generateAdScript).not.toHaveBeenCalled();
      expect(run.status).toBe('error');
      expect(run.error).toContain('Ad references:');
    }
  });

  it('preserves provenance and selection through checkpoint slimming and rehydration', () => {
    const value = input();
    const checkpoint = slimCheckpointInput(value as unknown as Record<string, unknown>);
    const hydrated = hydrateInput({ input: checkpoint, avatar_url: 'durable-avatar' } as any);
    expect(hydrated.referenceBrief).toEqual(value.referenceBrief);
    expect(hydrated.avatar.url).toBe('durable-avatar');
    expect(deriveAngleBrief(selectedReferenceAngleReport(hydrated.referenceBrief, hydrated, report)))
      .toContain(value.referenceBrief!.packet.concepts[1].sellingAngle);
    (checkpoint.referenceBrief as any).packet.concepts[1].sourceIds = ['missing'];
    expect(() => hydrateInput({ input: checkpoint } as any)).toThrow('missing source');
  });
});
