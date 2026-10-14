import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRun } from '../../services/producerRunService.js';

vi.mock('../../services/supabaseClient.js', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token' } } }) } }),
}));

const RUN_ID = 'apr_response_fixture';
const stageIds = ['market_research', 'script', 'storyboard', 'scene_images', 'video_prompts', 'video', 'thumbnail', 'voices', 'edl', 'final_render'];
const snapshot = () => ({
  run: {
    run_id: RUN_ID, user_id: 'fixture-user', mode: 'oneshot', status: 'review',
    current_stage: 'video', input: { avatar: { description: 'Presenter' } },
    stages: stageIds.map((id, index) => ({ id, status: index < 5 ? 'done' : 'pending', label: id, attempts: 0 })),
    artifacts: { gate: 'storyboard', scenes: [{ sceneIdx: 0, status: 'pending' }], storyboard: [{ scriptLine: 'Saved line' }] },
    error: null, revision: 4, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
  },
  scenes: [{ run_id: RUN_ID, scene_idx: 0, status: 'pending', job_handle: null, image_url: 'data:image/png;base64,fixture',
    end_frame_url: null, video_url: null, audio_url: null, flagged_reason: null, attempts: 0, updated_at: '2026-09-01T00:00:00Z' }],
});

describe('saved-run response boundary', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  const invalid: [string, () => unknown][] = [
    ['missing run', () => ({ scenes: [] })],
    ['null run', () => ({ run: null, scenes: [] })],
    ['wrong run identity', () => { const data = snapshot(); data.run.run_id = 'apr_other'; return data; }],
    ['non-array stages', () => { const data: any = snapshot(); data.run.stages = {}; return data; }],
    ['null stage entry', () => { const data: any = snapshot(); data.run.stages = [null]; return data; }],
    ['stage without identity', () => { const data: any = snapshot(); data.run.stages = [{ status: 'done' }]; return data; }],
    ['stage without status', () => { const data: any = snapshot(); data.run.stages = [{ id: 'video' }]; return data; }],
    ['unknown stage status', () => { const data = snapshot(); data.run.stages[0].status = 'submitted'; return data; }],
    ['duplicate stage identities', () => { const data = snapshot(); data.run.stages.push(data.run.stages[0]); return data; }],
    ['running checkpoint without stages', () => { const data: any = snapshot(); data.run.status = 'running'; delete data.run.stages; return data; }],
    ['running checkpoint with no stages', () => { const data: any = snapshot(); data.run.status = 'running'; data.run.stages = []; return data; }],
    ['running checkpoint missing a core stage', () => { const data = snapshot(); data.run.status = 'running'; data.run.stages = data.run.stages.filter(stage => stage.id !== 'script'); return data; }],
    ['error checkpoint missing a core stage', () => { const data = snapshot(); data.run.status = 'error'; data.run.stages = data.run.stages.filter(stage => stage.id !== 'script'); return data; }],
    ['review checkpoint missing a core stage', () => { const data = snapshot(); data.run.stages = data.run.stages.filter(stage => stage.id !== 'script'); return data; }],
    ['non-array scene queue', () => { const data: any = snapshot(); data.scenes = {}; return data; }],
    ['null queue entry', () => { const data: any = snapshot(); data.scenes = [null]; return data; }],
    ['scene without index', () => { const data: any = snapshot(); delete data.scenes[0].scene_idx; return data; }],
    ['scene without status', () => { const data: any = snapshot(); delete data.scenes[0].status; return data; }],
    ['unknown scene status', () => { const data = snapshot(); data.scenes[0].status = 'submitted'; return data; }],
    ['duplicate scene identities', () => { const data = snapshot(); data.scenes.push(data.scenes[0]); return data; }],
    ['non-object input', () => { const data: any = snapshot(); data.run.input = []; return data; }],
    ['non-object artifacts', () => { const data: any = snapshot(); data.run.artifacts = []; return data; }],
    ['non-array artifact scenes', () => { const data: any = snapshot(); data.run.artifacts.scenes = {}; return data; }],
    ['null artifact scene', () => { const data: any = snapshot(); data.run.artifacts.scenes = [null]; return data; }],
    ['artifact scene without index', () => { const data: any = snapshot(); data.run.artifacts.scenes = [{ status: 'pending' }]; return data; }],
    ['duplicate artifact scene identities', () => { const data = snapshot(); data.run.artifacts.scenes.push(data.run.artifacts.scenes[0]); return data; }],
    ['non-array storyboard', () => { const data: any = snapshot(); data.run.artifacts.storyboard = {}; return data; }],
    ['null storyboard entry', () => { const data: any = snapshot(); data.run.artifacts.storyboard = [null]; return data; }],
    ['review without a gate', () => { const data: any = snapshot(); delete data.run.artifacts.gate; return data; }],
    ['review with an unknown gate', () => { const data = snapshot(); data.run.artifacts.gate = 'video'; return data; }],
    ['non-boolean storyboard approval', () => { const data: any = snapshot(); data.run.artifacts.storyboardApproved = 'false'; return data; }],
  ];

  it.each(invalid)('rejects %s before any production can resume', async (_name, makePayload) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(makePayload()), { status: 200 }));
    await expect(loadRun(RUN_ID)).rejects.toThrow('PRODUCER_LOAD_INVALID');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/producer/run?runId=${RUN_ID}`);
    expect(fetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });

  it('retains supported older snapshots and durable avatar/thumbnail columns without changing them', async () => {
    const data: any = snapshot();
    delete data.run.revision;
    data.run.stages = data.run.stages.filter((stage: { id: string }) => !['video_prompts', 'thumbnail'].includes(stage.id));
    data.run.avatar_url = 'data:image/png;base64,durable-avatar';
    data.run.thumbnail_url = 'data:image/png;base64,durable-thumbnail';
    data.run.artifacts.extraFutureField = { keep: true };
    delete data.run.artifacts.scenes;
    fetchMock.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    await expect(loadRun(RUN_ID)).resolves.toEqual(data);
  });

  it.each([undefined, null])('retains the existing empty-array/object fallbacks for %s legacy fields', async missing => {
    const data: any = snapshot();
    data.run.status = 'done';
    data.run.stages = missing;
    data.run.artifacts = missing;
    data.scenes = missing;
    fetchMock.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    const loaded = await loadRun(RUN_ID);
    expect(loaded?.run.stages).toBe(missing);
    expect(loaded?.run.artifacts).toBe(missing);
    expect(loaded?.scenes).toEqual([]);
  });

  it('leaves completed snapshots without a gate available for existing First Cut inference', async () => {
    const data: any = snapshot();
    data.run.status = 'done';
    delete data.run.artifacts.gate;
    data.run.artifacts.finalVideoUrl = '/saved-cut.webm';
    fetchMock.mockResolvedValue(new Response(JSON.stringify(data), { status: 200 }));
    await expect(loadRun(RUN_ID)).resolves.toEqual(data);
  });

  it('distinguishes an actual missing run from a malformed successful response', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(loadRun(RUN_ID)).resolves.toBeNull();
  });
});
