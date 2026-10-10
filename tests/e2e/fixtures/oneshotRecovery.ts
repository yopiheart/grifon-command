import { expect, type Page } from '@playwright/test';
import type { ProductionRunRow, ProductionSceneRow } from '../../../services/producerRunService.js';

export const RUN_ID = 'apr_recovery_fixture';
export const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
const VIDEO = '/__recovery/clip.webm';
const stageIds = ['market_research', 'script', 'storyboard', 'scene_images', 'video_prompts', 'video', 'thumbnail', 'voices', 'edl', 'final_render'];

// Deliberately seeded checkpoints: these cases test restoration, not paid generation quality.
export function seededRun(gate: 'storyboard' | 'first_cut' | 'video' | 'final_render') {
  const row: ProductionRunRow = {
    run_id: RUN_ID, user_id: 'recovery-user', mode: 'oneshot',
    status: gate === 'video' || gate === 'final_render' ? 'running' : 'review',
    current_stage: gate, revision: 1, error: null,
    created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
    input: { brandName: 'Recovery Coffee', productName: 'Coffee', offer: 'Fresh coffee',
      productDescription: 'Roasted coffee beans', heroImageBase64: IMAGE,
      avatar: { url: IMAGE, description: 'Fixture presenter', ethnicity: 'Filipino', prompt: '' },
      voiceId: 'fixture-voice', language: 'English', aspectRatio: '9:16', scriptType: 'UGC', audioMode: 'sfx_only' },
    stages: stageIds.map(id => ({ id, label: id === 'final_render' ? 'Final cut' : id,
      status: (gate === 'storyboard' && stageIds.indexOf(id) >= stageIds.indexOf('video')) || (gate !== 'storyboard' && id === gate) || (gate === 'video' && id === 'final_render') ? 'pending' : 'done', attempts: 0 })),
    artifacts: {
      gate: gate === 'storyboard' || gate === 'first_cut' ? gate : null,
      storyboardApproved: gate !== 'storyboard', presetId: 'none',
      finalScript: ['A fresh start with Recovery Coffee.'],
      storyboard: [{ scriptLine: 'A fresh start with Recovery Coffee.', sceneDescription: 'Coffee on a table', imagePrompt: 'Coffee on a table' }],
      videoPrompts: [{ scriptLine: 'A fresh start with Recovery Coffee.', type: 'b-roll', prompt: 'Coffee on a table' }],
      scenes: [{ sceneIdx: 0, status: gate === 'video' || gate === 'storyboard' ? 'pending' : 'done',
        ...(gate === 'first_cut' || gate === 'final_render' ? { videoUrl: VIDEO } : {}) }],
      edl: { meta: { scriptStyleDetected: 'mrbeast' }, scenes: [] },
      ...(gate === 'first_cut' ? { finalVideoUrl: VIDEO, finalDownloadUrl: VIDEO } : {}),
    },
  };
  const scenes: ProductionSceneRow[] = [{ run_id: RUN_ID, scene_idx: 0,
    status: gate === 'video' || gate === 'storyboard' ? 'pending' : 'done', job_handle: null, image_url: IMAGE,
    end_frame_url: null, video_url: gate === 'first_cut' || gate === 'final_render' ? VIDEO : null,
    audio_url: null, flagged_reason: null, attempts: 0, updated_at: row.updated_at }];
  return { row, scenes };
}

export async function installRecoveryBackend(page: Page, seed = seededRun('storyboard'), appOrigin = 'http://localhost:5173') {
  const state = {
    row: seed.row as ProductionRunRow | null, scenes: seed.scenes,
    loadFails: false, holdVideo: false, finalPollFails: false,
    reads: [] as string[], checkpoints: [] as Record<string, any>[],
    submissions: [] as Record<string, any>[], polls: [] as Record<string, any>[],
    finalStarts: [] as Record<string, any>[], finalPolls: [] as string[],
    actions: [] as Record<string, any>[], unexpected: [] as string[], blockedExternal: [] as string[],
  };
  // Every HTTP request is fail-closed before navigation; only the app's Vite origin is
  // allowed through. No live provider, Supabase, telemetry or billing request can escape.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== appOrigin) {
      state.blockedExternal.push(url.origin);
      if (['fetch', 'xhr'].includes(request.resourceType())) state.unexpected.push(`External runtime request: ${url.origin}${url.pathname}`);
      return route.abort('blockedbyclient');
    }
    if (url.pathname === VIDEO) return route.fulfill({ contentType: 'video/webm', path: 'tests/e2e/fixtures/recovery.webm' });
    if (!url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/_lib/')) return route.continue();
    const body = request.method() === 'POST' ? request.postDataJSON() : null;
    if (url.pathname === '/api/producer/run') {
      if (request.method() === 'GET') {
        state.reads.push(url.searchParams.get('runId')!);
        if (state.loadFails) return route.fulfill({ status: 503, json: { error: 'Recovery fixture temporarily offline' } });
        if (!state.row) return route.fulfill({ status: 404, json: { error: 'run_not_found' } });
        return route.fulfill({ json: { run: state.row, scenes: state.scenes } });
      }
      state.checkpoints.push(body);
      if (!state.row) throw new Error('Checkpoint without fixture run');
      Object.assign(state.row, { status: body.status, current_stage: body.currentStage, stages: body.stages,
        artifacts: body.artifacts, error: body.error, revision: state.row.revision + 1 });
      return route.fulfill({ json: { changed: true, revision: state.row.revision } });
    }
    if (url.pathname === '/api/producer/advance') {
      state.actions.push(body);
      const scene = state.scenes.find(item => item.scene_idx === body.sceneIdx);
      if (body.action === 'claim') {
        const claimed = scene?.status === 'pending';
        if (claimed) Object.assign(scene!, { status: 'submitting', attempts: scene!.attempts + 1 });
        return route.fulfill({ json: { claimed, scene } });
      }
      if (body.action === 'record') Object.assign(scene!, { status: 'rendering', job_handle: body.jobHandle });
      else if (body.action === 'complete') Object.assign(scene!, { status: 'done', video_url: body.videoUrl });
      else if (body.action === 'flag') Object.assign(scene!, { status: 'flagged', flagged_reason: body.reason });
      else if (!['seed', 'record_avatar'].includes(body.action)) {
        state.unexpected.push(`${url.pathname}:${body.action}`);
        return route.fulfill({ status: 503, json: { error: 'Unconfigured fixture action' } });
      }
      return route.fulfill({ json: { changed: true } });
    }
    if (url.pathname === '/api/kling/video') {
      state.submissions.push(body);
      return route.fulfill({ json: { operation: { task_id: 'recovery-video-1', task_status: 'submitted' } } });
    }
    if (url.pathname === '/api/kling/video/poll') {
      state.polls.push(body);
      return route.fulfill({ json: state.holdVideo
        ? { done: false, operation: body.operation }
        : { done: true, url: VIDEO, downloadUrl: VIDEO, mimeType: 'video/webm' } });
    }
    if (url.pathname === '/api/render/final') {
      state.finalStarts.push(body);
      return route.fulfill({ json: { jobId: `fixture-final-${state.finalStarts.length}` } });
    }
    if (url.pathname === '/api/render/final/poll') {
      state.finalPolls.push(url.searchParams.get('jobId')!);
      return route.fulfill(state.finalPollFails
        ? { status: 503, json: { error: 'Temporary render poll failure' } }
        : { json: { done: true, status: 'done', url: VIDEO, downloadUrl: VIDEO } });
    }
    if (url.pathname === '/api/render/final/list') return route.fulfill({ json: { jobs: [] } });
    if (url.pathname === '/api/elevenlabs/voices') return route.fulfill({ json: { voices: [] } });
    if (url.pathname === '/api/billing' && url.searchParams.get('action') === 'usage') {
      const meter = { used: 0, limit: 20, remaining: 20 };
      return route.fulfill({ json: { plan: 'pro', workflows: meter, reports: meter, captions: meter, images: meter, video_ads: meter, omni_ads: meter } });
    }
    if (['/api/events', '/api/consent'].includes(url.pathname)) return route.fulfill({ json: { ok: true } });
    state.unexpected.push(`${request.method()} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 503, json: { error: 'Unconfigured recovery fixture request' } });
  });
  // Same narrow auth/client boundary as route-consistency. App, hooks, service
  // adapters and IndexedDB stores remain production code.
  await page.route(/\/services\/supabaseClient\.ts(?:\?.*)?$/, route => {
    if (route.request().url().includes('recovery-original')) return route.fallback();
    return route.fulfill({ contentType: 'application/javascript', body: `
      export * from '/services/supabaseClient.ts?recovery-original';
      const session = {access_token:'test-only-token',user:{id:'recovery-user',email:'buyer@example.test',user_metadata:{}}};
      const query = {select:()=>query,eq:()=>query,order:()=>query,limit:()=>query,
        maybeSingle:async()=>({data:{plan_id:'pro',status:'active'}}),single:async()=>({data:null}),then:resolve=>resolve({data:[]})};
      const channel = {on:()=>channel,subscribe:()=>channel};
      const client = {auth:{getSession:async()=>({data:{session}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
        from:()=>query,channel:()=>channel,removeChannel(){}};
      export const getSupabase=()=>client;
    ` });
  });
  return state;
}

export async function openOneShot(page: Page) {
  await page.getByRole('button', { name: 'Make a video ad', exact: true }).click();
}

export async function openSeededProducer(page: Page) {
  await page.goto('/app?osaEngine=producer');
  await page.evaluate(id => localStorage.setItem('osa_producer_active_run', id), RUN_ID);
  await openOneShot(page);
}

export async function assertConsumerOnly(page: Page) {
  await expect(page.getByText('// AUTOMATED VIDEO WORKFLOW', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
