import { beforeEach, describe, expect, it, vi } from 'vitest';
import packetFixture from '../fixtures/ad-reference.synthetic.json';

const mocks = vi.hoisted(() => ({ from: vi.fn(), put: vi.fn(), sign: vi.fn(), render: vi.fn(), download: vi.fn() }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: vi.fn(async () => ({ id: 'owner' })),
  getSupabaseAdmin: () => ({ from: mocks.from }),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: vi.fn(async () => true) }));
vi.mock('../../api/_lib/mediaStore.js', () => ({ putMedia: mocks.put, getMediaUrl: mocks.sign, downloadMediaText: mocks.download }));
vi.mock('../../api/_lib/renderFfmpeg.js', () => ({ renderFinalVideo: mocks.render }));
import fire from '../../api/render/final.js';
import poll from '../../api/render/final/poll.js';

const packet = { ...structuredClone(packetFixture), evidenceMode: 'observed' };
const reference = { packetId: packet.id, conceptId: packet.concepts[1].id };
const lineage = { version: 1, producerRunId: 'producer-test-run', runRevision: 7,
  reference: { ...reference, sourceIds: packet.concepts[1].sourceIds, observationIds: packet.concepts[1].observationIds, evidence: 'owner-recorded',
    sources: [{ id: packet.sources[0].id, libraryId: packet.sources[0].libraryId, pageId: packet.competitors[0].pageId,
      sourceUrl: packet.sources[0].sourceUrl, observedAt: packet.sources[0].observedAt }] } };
const scene = { sceneIdx: 0, videoUrl: 'https://cdn.test/owned.mp4', audioPolicy: 'preserve' };
const response = () => {
  const res: any = { statusCode: 0, body: null };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  res.setHeader = vi.fn();
  return res;
};
const request = (body: Record<string, unknown> = {}) => ({ method: 'POST', headers: { authorization: 'Bearer test' },
  body: { scenes: [scene], aspectRatio: '9:16', producerRunId: lineage.producerRunId, expectedReference: reference, ...body } }) as any;
const writes = () => mocks.put.mock.calls.filter(call => call[0].endsWith('.status.json')).map(call => JSON.parse(call[1].toString()));
async function finish() {
  for (let i = 0; i < 50 && !writes().some(item => ['done', 'failed'].includes(item.status)); i++) await new Promise(resolve => setTimeout(resolve, 0));
}
let run: any;
let scenes: any[];
let dbError: string | undefined;
let queryLog: { table: string; filters: [string, unknown][]; columns?: string }[];

beforeEach(() => {
  run = { run_id: lineage.producerRunId, user_id: 'owner', revision: 7,
    input: { ...packet.subject, referenceBrief: { packet: structuredClone(packet), selectedConceptId: reference.conceptId, acceptedLimits: true } } };
  scenes = [{ scene_idx: 0, status: 'done', video_url: scene.videoUrl }, { scene_idx: 1, status: 'flagged', video_url: null }];
  dbError = undefined; queryLog = [];
  mocks.from.mockReset().mockImplementation(table => {
    const entry = { table, filters: [] as [string, unknown][], columns: '' }; queryLog.push(entry);
    const result = () => ({ data: table === 'producer_runs'
      ? (run && entry.filters.every(([key, value]) => run[key] === value) ? run : null) : scenes,
      error: dbError === table ? { message: 'fixture read failed' } : null });
    const query: any = { select: (columns: string) => { entry.columns = columns; return query; },
      eq: (key: string, value: unknown) => { entry.filters.push([key, value]); return query; },
      maybeSingle: async () => result(), then: (resolve: (value: unknown) => void) => resolve(result()) };
    return query;
  });
  mocks.put.mockReset().mockResolvedValue({ error: null });
  mocks.sign.mockReset().mockResolvedValue({ url: 'https://cdn.test/expiring-signed-url', error: null });
  mocks.download.mockReset();
  mocks.render.mockReset().mockImplementation(async (...args: any[]) => { args[6]('mux'); return { buffer: Buffer.from('fixture') }; });
});

describe('producer export binding at the authenticated render boundary', () => {
  it('records a portable selected source snapshot from the durable packet', async () => {
    const res = response(); await fire(request(), res); await finish();
    expect(writes().at(-1).lineage.reference.sources).toEqual(lineage.reference.sources);
  });

  it('keeps selected source order, excludes unselected sources, and freezes the started job snapshot', async () => {
    const durable = run.input.referenceBrief.packet;
    const original = durable.sources[0];
    durable.sources.push({ ...structuredClone(original), id: 'unselected-source', libraryId: '200000000002',
      sourceUrl: 'https://www.facebook.com/ads/library/?id=200000000002', observations: [{ id: 'unselected-observation', text: 'Invented unused observation.' }] },
    { ...structuredClone(original), id: 'second-selected-source', libraryId: '200000000003',
      sourceUrl: 'https://www.facebook.com/ads/library/?id=200000000003', observations: [{ id: 'second-selected-observation', text: 'Invented selected observation.' }] });
    durable.concepts[1].sourceIds = ['second-selected-source', original.id];
    durable.concepts[1].observationIds = ['second-selected-observation', original.observations[0].id];
    const expected = [durable.sources[2], original].map(source => ({ id: source.id, libraryId: source.libraryId,
      pageId: durable.competitors[0].pageId, sourceUrl: source.sourceUrl, observedAt: source.observedAt }));
    let release: (() => void) | undefined;
    mocks.render.mockImplementation(async (...args: any[]) => {
      args[6]('mux'); await new Promise<void>(resolve => { release = resolve; });
      return { buffer: Buffer.from('fixture') };
    });
    const res = response(); await fire(request(), res);
    expect(res.statusCode).toBe(202);
    for (const source of durable.sources) { source.libraryId = '999999999999'; source.sourceUrl = 'https://www.facebook.com/ads/library/?id=999999999999'; source.observedAt = '2026-09-01T00:00:00Z'; }
    durable.competitors[0].pageId = '999999999998';
    durable.concepts[1].sourceIds.reverse();
    release!(); await finish();
    for (const item of writes()) {
      expect(item.lineage.reference.sources).toEqual(expected);
      expect(item.lineage.reference.sourceIds).toEqual(['second-selected-source', original.id]);
    }
    expect(writes().at(-1).status).toBe('done');
  });

  it('rejects a foreign run before renderer or storage writes', async () => {
    run.user_id = 'another-owner';
    const res = response(); await fire(request({ userId: 'another-owner' }), res);
    expect(res.statusCode).toBe(404);
    expect(queryLog[0].filters).toContainEqual(['user_id', 'owner']);
    expect(mocks.render).not.toHaveBeenCalled(); expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each(['missing run', 'wrong clip', 'unfinished scene', 'missing expected reference', 'changed reference', 'invalid reference', 'bad subject', 'bad revision'])('fails closed for %s', async kind => {
    if (kind === 'missing run') run = null;
    if (kind === 'wrong clip') scenes[0].video_url = 'https://cdn.test/unrelated.mp4';
    if (kind === 'unfinished scene') scenes[0].status = 'rendering';
    if (kind === 'missing expected reference') delete run.input.referenceBrief;
    if (kind === 'changed reference') run.input.referenceBrief = { ...run.input.referenceBrief, selectedConceptId: packet.concepts[0].id };
    if (kind === 'invalid reference') run.input.referenceBrief = { ...run.input.referenceBrief, acceptedLimits: false };
    if (kind === 'bad subject') run.input.brandName = 12;
    if (kind === 'bad revision') run.revision = null;
    const res = response(); await fire(request(), res);
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(mocks.render).not.toHaveBeenCalled(); expect(mocks.put).not.toHaveBeenCalled();
  });

  it.each(['producer_runs', 'producer_scenes'])('fails closed on %s database errors', async table => {
    dbError = table;
    const res = response(); await fire(request(), res);
    expect(res.statusCode).toBe(500);
    expect(mocks.render).not.toHaveBeenCalled(); expect(mocks.put).not.toHaveBeenCalled();
  });

  it('snapshots durable selected IDs across initial, heartbeat and successful writes', async () => {
    const res = response(); await fire(request(), res); await finish();
    expect(res.statusCode).toBe(202);
    expect(queryLog.map(item => item.columns)).toEqual(['run_id,user_id,input,revision', 'scene_idx,status,video_url']);
    expect(writes().length).toBeGreaterThanOrEqual(3);
    for (const item of writes()) {
      expect(item.lineage).toEqual(lineage);
      expect(item.audioPolicies).toEqual([{ sceneIdx: 0, policy: 'preserve' }]);
      expect(item.creativeId).toBe(res.body.jobId);
    }
    expect(writes().at(-1).status).toBe('done');
    expect(mocks.render.mock.calls[0][0][0].audioPolicy).toBe('preserve');
  });

  it('retains the snapshot when the renderer fails', async () => {
    mocks.render.mockRejectedValue(new Error('fixture failure'));
    const res = response(); await fire(request(), res); await finish();
    expect(writes().at(-1)).toMatchObject({ status: 'failed', lineage, creativeId: res.body.jobId });
  });

  it.each([undefined, 'https://cdn.test/voice.mp3'])('records the legacy base-audio policy when no policy was requested (voice: %s)', async audioUrl => {
    const res = response(); await fire(request({ scenes: [{ sceneIdx: 0, videoUrl: scene.videoUrl, audioUrl }] }), res); await finish();
    expect(writes().at(-1).audioPolicies).toEqual([{ sceneIdx: 0, policy: audioUrl ? 'replace' : 'mute' }]);
    expect(mocks.render.mock.calls[0][0][0].audioPolicy).toBeUndefined();
  });

  it('allows an owned run without reference selection and records only its run identity', async () => {
    delete run.input.referenceBrief;
    const res = response(); await fire(request({ expectedReference: undefined }), res); await finish();
    expect(res.statusCode).toBe(202);
    expect(writes().at(-1).lineage).toEqual({ version: 1, producerRunId: lineage.producerRunId, runRevision: 7 });
  });

  it('does not accept an expected selection without a producer run', async () => {
    const res = response(); await fire(request({ producerRunId: undefined }), res);
    expect(res.statusCode).toBe(400); expect(mocks.put).not.toHaveBeenCalled();
  });

  it('keeps legacy exports free of producer reads and fabricated lineage', async () => {
    const res = response(); await fire(request({ producerRunId: undefined, expectedReference: undefined }), res); await finish();
    expect(res.statusCode).toBe(202); expect(mocks.from).not.toHaveBeenCalled();
    expect(writes().at(-1).creativeId).toBe(res.body.jobId);
    expect(writes().at(-1).lineage).toBeUndefined();
  });

  it('rejects explicit replace without replacement audio', async () => {
    const res = response(); await fire(request({ scenes: [{ ...scene, audioPolicy: 'replace' }] }), res);
    expect(res.statusCode).toBe(400); expect(mocks.put).not.toHaveBeenCalled();
  });
});

describe('poll receipt preservation', () => {
  it.each(['processing', 'done', 'failed', 'watchdog'])('preserves lineage on %s', async state => {
    const sidecar = { status: state === 'watchdog' ? 'processing' : state, creativeId: 'creative-test', lineage,
      audioPolicies: [{ sceneIdx: 0, policy: 'preserve' }], updatedAt: state === 'watchdog' ? '2020-01-01T00:00:00.000Z' : new Date().toISOString() };
    mocks.download.mockResolvedValue({ text: JSON.stringify(sidecar), error: null });
    const res = response(); await poll({ method: 'GET', headers: { authorization: 'Bearer test' }, query: { jobId: 'creative-test' } } as any, res);
    expect(res.body).toMatchObject({ lineage, creativeId: 'creative-test', audioPolicies: sidecar.audioPolicies });
    if (state === 'watchdog') expect(writes().at(-1)).toMatchObject({ lineage, creativeId: 'creative-test', audioPolicies: sidecar.audioPolicies, status: 'failed' });
  });
});
