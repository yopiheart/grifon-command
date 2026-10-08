import { describe, expect, it, vi } from 'vitest';
import packetFixture from '../fixtures/ad-reference.synthetic.json';
import { applyPreset, createProductionRun, type ProductionInput, type ProducerDeps } from '../../services/producerOrchestrator.js';
import type { AdReferencePacket, FinalRenderRequest } from '../../types.js';
const save = vi.hoisted(() => vi.fn(async () => ({ changed: true, revision: 8 })));
vi.mock('../../services/producerRunService.js', async importOriginal => ({
  ...await importOriginal<typeof import('../../services/producerRunService.js')>(), saveRunCheckpoint: save,
}));
import { realProducerDeps } from '../../services/producerDeps.js';

const packet = { ...structuredClone(packetFixture), evidenceMode: 'observed' } as AdReferencePacket;
const makeInput = (): ProductionInput => ({ ...packet.subject, price: '199', productDescription: 'Fixture', heroImageBase64: '',
  avatar: { url: '', prompt: '', description: '', ethnicity: '' }, voiceId: 'fixture', language: 'English', aspectRatio: '9:16',
  scriptType: 'UGC', referenceBrief: { packet, selectedConceptId: packet.concepts[1].id, acceptedLimits: true } });
const lineage = { version: 1 as const, producerRunId: 'durable-run', runRevision: 7 };
const audioPolicies = [{ sceneIdx: 0, policy: 'preserve' as const }];

describe('producer export receipt transport and persistence', () => {
  it('sends run + expected selection, forwards native policy, and checkpoints the server receipt', async () => {
    const run = createProductionRun(makeInput(), 'owner', { runId: 'durable-run', prefill: {
      scenes: [{ sceneIdx: 0, status: 'done', videoUrl: 'https://cdn.test/clip.mp4', audioPolicy: 'preserve' }],
      storyboard: [{ scriptLine: '', sceneDescription: 'Fixture' }],
    } });
    const render = vi.fn(async (_req: FinalRenderRequest) => ({ done: true, status: 'done' as const, url: 'https://cdn.test/final.mp4',
      creativeId: 'creative-test', lineage, audioPolicies }));
    const deps = { renderFinalVideo: render, persist: realProducerDeps.persist, now: Date.now } as unknown as ProducerDeps;
    await applyPreset(run, null, { onUpdate() {}, signal: new AbortController().signal }, deps);
    expect(render).toHaveBeenCalledOnce();
    expect(render.mock.calls[0][0]).toMatchObject({ producerRunId: run.runId,
      expectedReference: { packetId: packet.id, conceptId: packet.concepts[1].id }, scenes: [{ audioPolicy: 'preserve' }] });
    expect(run).toMatchObject({ finalCreativeId: 'creative-test', finalLineage: lineage, finalAudioPolicies: audioPolicies });
    expect(save.mock.calls.at(-1)![1].artifacts).toMatchObject({ finalCreativeId: 'creative-test', finalLineage: lineage,
      finalAudioPolicies: audioPolicies, scenes: [{ audioPolicy: 'preserve' }] });
  });

  it('Pure Hype forces mute regardless of the persisted native policy', async () => {
    const value = makeInput(); value.audioMode = 'sfx_only';
    const run = createProductionRun(value, 'owner', { prefill: { scenes: [{ sceneIdx: 0, status: 'done', videoUrl: 'https://cdn.test/clip.mp4', audioPolicy: 'preserve' }] } });
    const render = vi.fn(async (_req: FinalRenderRequest) => ({ done: true, url: 'final' }));
    await applyPreset(run, null, { onUpdate() {}, signal: new AbortController().signal },
      { renderFinalVideo: render, persist: async () => {}, now: Date.now } as unknown as ProducerDeps);
    expect(render.mock.calls[0][0].scenes[0].audioPolicy).toBe('mute');
  });
});
