import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// P3 concurrency: checkpoint commits vs the REAL optimistic-revision guard.
//
// P3 made two stage pairs run concurrently (scene_images ∥ video_prompts, and
// video ∥ thumbnail — services/producerOrchestrator.ts runStagePair). Both
// branches commit through the SAME `deps.persist`, so two checkpoint writes can
// now be in flight at once carrying the same `revision`. That path was reasoned
// about but never tested.
//
// Fidelity rules for this harness (the whole point of the test):
//   * `deps.persist` is the REAL one from services/producerDeps.ts — real
//     toCheckpoint(), real conflict-adopt branch. Nothing is re-implemented.
//   * only `saveRunCheckpoint` is faked, and the fake reproduces
//     api/producer/run.ts's POST semantics exactly: insert-at-revision-0 on
//     create; otherwise UPDATE ... WHERE revision = known → increment, and on 0
//     rows `{changed:false, current}` so the client adopts the server revision.
//   * the request body is deep-snapshotted synchronously at call time (the real
//     one JSON-stringifies into fetch), then lands after a scripted number of
//     microtask ticks — deterministic, no timers, and out-of-order-able.
//
// Invariants asserted (from workflows/loop_arch_handoff.md, work item 1):
//   (a) newest state is never overwritten by stale state after a conflict-adopt;
//   (b) no onUpdate re-delivers status:'review' + gate:'storyboard' post-approval;
//   (c) the final checkpoint carries videoPrompts + every scene imageUrl.
// ---------------------------------------------------------------------------

// --- Fake server (api/producer/run.ts POST, in memory) ---------------------

interface AppliedWrite {
  status?: string;
  currentStage?: string | null;
  artifacts: Record<string, any>;
  revision: number;
}

const server = {
  /** The `producer_runs` row: null until the create write. */
  row: null as null | { revision: number; body: Record<string, any> },
  /** Every write the server ACCEPTED, in commit order. */
  applied: [] as AppliedWrite[],
  /** Every write the revision guard REJECTED (the stale-write count). */
  rejected: [] as { revision: number; artifacts: Record<string, any> }[],
  /** Microtask ticks to delay a given request body before it lands. */
  latency: (_body: Record<string, any>, _seq: number) => 0,
  reset() {
    this.row = null;
    this.applied = [];
    this.rejected = [];
    this.latency = () => 0;
  },
};

/** Deterministic delay in microtask ticks — no fake timers, fully reproducible. */
const ticks = async (n: number) => {
  for (let i = 0; i < n; i++) await Promise.resolve();
};

let seq = 0;

vi.mock('../../services/producerRunService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/producerRunService.js')>();
  return {
    ...actual,
    saveRunCheckpoint: async (_runId: string, patch: Record<string, any>) => {
      // Snapshot synchronously — mirrors JSON.stringify into the fetch body, and the
      // artifact slimming that happens at the same transport choke-point.
      const body = JSON.parse(
        JSON.stringify({
          ...patch,
          ...(patch.artifacts ? { artifacts: actual.slimCheckpointArtifacts(patch.artifacts) } : {}),
        })
      ) as Record<string, any>;
      const mySeq = seq++;
      await ticks(server.latency(body, mySeq));

      // ── create: INSERT at revision 0 (client-sent revision ignored) ──
      if (!server.row) {
        server.row = { revision: 0, body: { ...body, revision: 0 } };
        server.applied.push({ status: body.status, currentStage: body.currentStage, artifacts: body.artifacts ?? {}, revision: 0 });
        return { changed: true, revision: 0, current: { ...server.row.body } };
      }

      // ── checkpoint: guarded UPDATE ... WHERE revision = known ──
      const known = body.revision ?? server.row.revision;
      if (known !== server.row.revision) {
        server.rejected.push({ revision: known, artifacts: body.artifacts ?? {} });
        return { changed: false, revision: undefined, current: { ...server.row.body, revision: server.row.revision } };
      }
      // Partial patch: only the columns the client sent are written (artifacts is a
      // jsonb column → replaced wholesale when present).
      const next = { ...server.row.body };
      for (const k of ['mode', 'status', 'currentStage', 'input', 'stages', 'artifacts', 'error'] as const) {
        if (body[k] !== undefined) next[k] = body[k];
      }
      next.revision = known + 1;
      server.row = { revision: known + 1, body: next };
      server.applied.push({ status: next.status, currentStage: next.currentStage, artifacts: next.artifacts ?? {}, revision: next.revision });
      return { changed: true, revision: known + 1, current: { ...next } };
    },
  };
});

import {
  createProductionRun,
  runProduction,
  approveStoryboard,
  regenSceneImage,
  assembleFinalScript,
  mapReportToWizard,
  type ProductionInput,
  type ProducerDeps,
  type ProductionRun,
  type ProducerRunStore,
  type VideoJobHandle,
} from '../../services/producerOrchestrator.js';
import { realProducerDeps } from '../../services/producerDeps.js';
import type { MarketResearchReport, Script, Scene, VideoPrompt } from '../../types.js';

// --- Fixtures (minimal — only what the stages actually read) ----------------

const REPORT = {
  subject: 'Brew',
  winningAvatar: 'Burned-out owner Bryan',
  bleedingNeck: 'Content eats my day',
  bigIdea: 'Stop grinding, start shipping',
  headlines: ['h1'],
  videoHooks: [{ type: 'Pattern Interrupt', visual: 'v', spokenLine: 'Tignan mo to' }],
  fbAdLibraryAngles: [{ format: 'Testimonial', angle: 'real-talk', openingLine: 'Akala ko scam', whyItWorks: 'trust' }],
  graveyard: [],
  competitorMatrix: [],
  rawEvidence: [],
  narrativeReport: '# report',
} as unknown as MarketResearchReport;

const SCRIPT = { hook1: ['Hook one'], hook2: ['Hook two'], body: ['Body A', 'Body B'] } as unknown as Script;

const STORYBOARD_SCENES: Scene[] = [
  { scriptLine: 'Line 0', sceneDescription: 'd0', imagePrompt: 'IMG0', referenceImage: 'avatar' },
  { scriptLine: 'Line 1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'product' },
];

const VIDEO_PROMPTS: VideoPrompt[] = [
  { scriptLine: 'Line 0', type: 'talking', prompt: 'P0' },
  { scriptLine: 'Line 1', type: 'b-roll', prompt: 'P1' },
];

const makeInput = (over: Partial<ProductionInput> = {}): ProductionInput =>
  ({
    brandName: 'Brew',
    offer: 'Buy 1 Take 1',
    price: 'P199',
    productName: 'Bukidnon Brew',
    productDescription: 'Single-origin coffee',
    heroImageBase64: 'hero.png',
    avatar: { url: 'avatar.png', description: 'a Filipino host', ethnicity: 'Filipino', prompt: '' },
    voiceId: 'voice_pinoy_1',
    language: 'Taglish',
    aspectRatio: '9:16',
    scriptType: 'Testimonial',
    ...over,
  }) as ProductionInput;

/** In-memory scene queue mirroring api/producer/advance.ts's guarded transitions. */
function makeFakeStore() {
  const rows = new Map<number, { status: string; jobHandle: VideoJobHandle | null; videoUrl: string | null; audioUrl: string | null }>();
  const store: ProducerRunStore = {
    seedScenes: vi.fn(async (_r: string, count: number) => {
      for (let i = 0; i < count; i++) if (!rows.has(i)) rows.set(i, { status: 'pending', jobHandle: null, videoUrl: null, audioUrl: null });
    }),
    claimScene: vi.fn(async (_r: string, i: number) => {
      const s = rows.get(i);
      if (!s) return { claimed: false };
      if (s.status === 'pending') {
        s.status = 'submitting';
        return { claimed: true };
      }
      return { claimed: false, status: s.status as any, videoUrl: s.videoUrl, audioUrl: s.audioUrl, jobHandle: s.jobHandle };
    }),
    recordScene: vi.fn(async (_r: string, i: number, handle: VideoJobHandle) => {
      const s = rows.get(i);
      if (s && s.status === 'submitting') {
        s.jobHandle = handle;
        s.status = 'rendering';
        return { changed: true };
      }
      return { changed: false };
    }),
    recordSceneImage: vi.fn(async () => ({ changed: true })),
    completeScene: vi.fn(async (_r: string, i: number, videoUrl: string, audioUrl?: string) => {
      const s = rows.get(i);
      if (s && (s.status === 'submitting' || s.status === 'rendering')) {
        s.status = 'done';
        s.videoUrl = videoUrl;
        if (audioUrl !== undefined) s.audioUrl = audioUrl;
        return { changed: true };
      }
      return { changed: false };
    }),
    flagScene: vi.fn(async () => ({ changed: true })),
    requeueScene: vi.fn(async () => ({ changed: true })),
  };
  return { store, rows };
}

/** Deps whose ONLY real member is `persist` — the unit under test. */
function makeDeps(over: Partial<ProducerDeps> = {}) {
  let clock = 1_000;
  const { store } = makeFakeStore();
  const spies = {
    generateMarketResearch: vi.fn(async () => REPORT),
    generateAdScript: vi.fn(async () => SCRIPT),
    generateStoryboard: vi.fn(async () => ({ scenes: STORYBOARD_SCENES.map((s) => ({ ...s })), strategicAudit: '' })),
    generateVideoPrompts: vi.fn(async () => VIDEO_PROMPTS.map((v) => ({ ...v }))),
    generateSceneImage: vi.fn(async (prompt: string) => `img://${prompt}`),
    generateThumbnail: vi.fn(async () => 'thumb://cover.png'),
    generateEditDecisionList: vi.fn(async () => ({
      meta: { totalDurationSec: 10, aspectRatio: '9:16', targetPlatform: 'tiktok', hookStrategy: 'h', formulaApplied: [], scriptStyleDetected: 'testimonial' },
      scenes: [
        { sceneIdx: 0, overlayText: [], sfxCues: [] },
        { sceneIdx: 1, overlayText: [], sfxCues: [] },
      ],
      globalSfxPicks: [],
      formulaCheck: { rulesApplied: [], weaknessesFlagged: [] },
    })),
    consolidateVoices: vi.fn(async (scenes: { sceneIdx: number }[]) => scenes.map((s) => ({ sceneIdx: s.sceneIdx, audioUrl: `aud://${s.sceneIdx}` }))),
    renderFinalVideo: vi.fn(async () => ({ done: true, status: 'done', url: 'final.mp4', downloadUrl: 'final-dl.mp4' })),
    submitVideo: vi.fn(async (config: any, opts: any): Promise<VideoJobHandle> => ({
      operation: {},
      prompt: config.prompt,
      sceneIdx: opts?.sceneIdx,
      model: config.model,
      aspectRatio: config.aspectRatio,
      duration: config.duration,
    })),
    pollVideo: vi.fn(async (handle: VideoJobHandle) => ({ url: `vid://${handle.sceneIdx}`, downloadUrl: 'd', mimeType: 'video/mp4' })),
    // THE unit under test — the shipped persist, not a stand-in.
    persist: realProducerDeps.persist,
    now: vi.fn(() => clock++),
  };
  return { deps: { ...spies, run: store, ...over } as unknown as ProducerDeps, spies, store };
}

function makeCallbacks() {
  /** Mirrors ProducerFlow's `onUpdate: (u) => setRun({ ...u })` — the shallow-spread the UI sees. */
  const seen: { status?: string; gate?: string }[] = [];
  return {
    seen,
    cb: {
      onUpdate: (u: ProductionRun) => {
        const copy = { ...u };
        seen.push({ status: copy.status, gate: copy.gate });
      },
      signal: new AbortController().signal,
      userId: 'u1',
    },
  };
}

const artifacts = () => (server.row?.body.artifacts ?? {}) as Record<string, any>;

beforeEach(() => {
  server.reset();
  seq = 0;
});

// --- 1. scene_images ∥ video_prompts --------------------------------------

describe('P3 pair — scene_images ∥ video_prompts vs the revision guard', () => {
  it('conflicts on the concurrent commits, adopts the server revision, and loses no state', async () => {
    const { deps } = makeDeps();
    const { cb } = makeCallbacks();

    const gated = await runProduction(createProductionRun(makeInput(), 'u1'), cb, deps);

    // The test is only meaningful if the guard actually fired — two commits really
    // did race with the same known revision.
    expect(server.rejected.length).toBeGreaterThan(0);

    expect(gated.status).toBe('review');
    expect(gated.gate).toBe('storyboard');

    // (c) the parked checkpoint carries BOTH branches' output despite the conflicts.
    const art = artifacts();
    expect(art.videoPrompts).toHaveLength(2);
    expect((art.storyboard as Scene[]).map((s) => s.imageUrl)).toEqual(['img://IMG0', 'img://IMG1']);
    expect(server.row?.body.status).toBe('review');
    expect(art.gate).toBe('storyboard');

    // (a) the server's own view never regressed: once an artifact key was written it
    // was never blanked by a later accepted write.
    const firstWithPrompts = server.applied.findIndex((w) => Array.isArray(w.artifacts.videoPrompts) && w.artifacts.videoPrompts.length > 0);
    expect(firstWithPrompts).toBeGreaterThanOrEqual(0);
    for (const w of server.applied.slice(firstWithPrompts)) {
      expect(w.artifacts.videoPrompts?.length ?? 0).toBe(2);
    }

    // Revisions are strictly monotonic across accepted writes (no re-use, no gaps backwards).
    const revs = server.applied.map((w) => w.revision);
    expect(revs).toEqual([...revs].sort((a, b) => a - b));
    expect(new Set(revs).size).toBe(revs.length);
  });

  it('survives out-of-order landings: the LATER-issued write landing FIRST is not clobbered', async () => {
    // Delay the scene_images branch's writes so video_prompts' writes land first —
    // the reverse of issue order, which is what a real network reorder looks like.
    server.latency = (body) => (body.currentStage === 'scene_images' ? 6 : 0);
    const { deps } = makeDeps();
    const { cb } = makeCallbacks();

    const gated = await runProduction(createProductionRun(makeInput(), 'u1'), cb, deps);

    expect(server.rejected.length).toBeGreaterThan(0);
    expect(gated.gate).toBe('storyboard');
    const art = artifacts();
    expect(art.videoPrompts).toHaveLength(2);
    expect((art.storyboard as Scene[]).map((s) => s.imageUrl)).toEqual(['img://IMG0', 'img://IMG1']);
  });
});

// --- 2. video ∥ thumbnail, through to First Cut ----------------------------

describe('P3 pair — video ∥ thumbnail through the First Cut park', () => {
  it('reaches first_cut with one submit per scene and a complete final checkpoint', async () => {
    const { deps, spies } = makeDeps();
    const { cb, seen } = makeCallbacks();

    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb, deps);
    const approveIdx = seen.length;
    const done = await approveStoryboard(run, cb, deps);

    expect(done.status).toBe('review');
    expect(done.gate).toBe('first_cut');
    // The race must not have caused a re-submit (that is real money).
    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
    expect(spies.generateThumbnail).toHaveBeenCalledTimes(1);

    // (b) no onUpdate re-delivers the storyboard gate after approval.
    expect(seen.slice(approveIdx).some((s) => s.status === 'review' && s.gate === 'storyboard')).toBe(false);
    // …and neither does any accepted server write.
    const approvedAt = server.applied.findIndex((w) => w.artifacts.storyboardApproved === true);
    expect(approvedAt).toBeGreaterThanOrEqual(0);
    for (const w of server.applied.slice(approvedAt)) {
      expect(w.artifacts.storyboardApproved).toBe(true);
      expect(w.artifacts.gate === 'storyboard' && w.status === 'review').toBe(false);
    }

    // (c) final checkpoint carries the full artifact set the resume path reads.
    const art = artifacts();
    expect(art.videoPrompts).toHaveLength(2);
    expect((art.storyboard as Scene[]).map((s) => s.imageUrl)).toEqual(['img://IMG0', 'img://IMG1']);
    expect(art.finalVideoUrl).toBe('final.mp4');
    expect(art.gate).toBe('first_cut');
  });

  it('KNOWN GAP (P3): run.thumbnailUrl is produced but never checkpointed', async () => {
    // toCheckpoint (services/producerDeps.ts) does not include thumbnailUrl in
    // `artifacts`, while the resume path (components/OneShotAd/ProducerFlow.tsx,
    // `thumbnailUrl: art.thumbnailUrl`) reads it back. P3 promoted thumbnail to a
    // producer node, so the cover frame is now lost on any reload/cross-device
    // resume and normalizeStages re-runs the node (one extra paid image).
    // Reported, NOT fixed, per the handoff's test-only mandate — flip this
    // assertion to `toBe('thumb://cover.png')` in the same commit as the fix.
    const { deps } = makeDeps();
    const { cb } = makeCallbacks();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb, deps);
    const done = await approveStoryboard(run, cb, deps);

    expect(done.thumbnailUrl).toBe('thumb://cover.png');
    expect(artifacts().thumbnailUrl).toBeUndefined();
  });
});

// --- 3. A stale in-flight write vs the approval write ----------------------

describe('stale checkpoint vs storyboard approval', () => {
  it('the guard rejects a pre-approval write that lands after the approval write', async () => {
    const { deps } = makeDeps();
    const { cb } = makeCallbacks();
    const run = await runProduction(createProductionRun(makeInput(), 'u1'), cb, deps);
    expect(run.gate).toBe('storyboard');

    const revBefore = server.row!.revision;
    const rejectedBefore = server.rejected.length;

    // Slow the write issued while the run is still parked; the approval write is fast.
    server.latency = (body) => (body.artifacts?.storyboardApproved ? 0 : 8);

    // Two writes in flight, both carrying the SAME known revision (the first has not
    // resolved, so run.revision is unchanged when the second is issued).
    const stale = deps.persist(run);
    run.storyboardApproved = true;
    run.status = 'running';
    run.gate = undefined;
    const fresh = deps.persist(run);
    await Promise.all([fresh, stale]);

    expect(server.rejected.length).toBe(rejectedBefore + 1); // the stale one bounced
    expect(server.row!.revision).toBe(revBefore + 1); // exactly one write landed
    expect(server.row!.body.status).toBe('running');
    expect(artifacts().storyboardApproved).toBe(true);
    expect(artifacts().gate).toBeNull();
    // The client adopted the server's revision, so the NEXT write is not permanently stuck.
    expect(run.revision).toBe(server.row!.revision);
    await deps.persist(run);
    expect(server.row!.revision).toBe(revBefore + 2);
  });

  it('a gate-time image regen finishing after approval never re-parks the run', async () => {
    // Real user race: tap "regenerate scene image" at the gate, then tap Approve
    // before the regen returns. The regen's late commits land during/after the
    // post-approval pipeline.
    let releaseRegen: () => void = () => {};
    const regenBarrier = new Promise<void>((r) => {
      releaseRegen = r;
    });
    let gateReached = false;
    const { deps } = makeDeps({
      generateSceneImage: vi.fn(async (prompt: string) => {
        if (gateReached) await regenBarrier;
        return `img://${prompt}`;
      }) as any,
    });
    const { cb, seen } = makeCallbacks();

    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb, deps);
    expect(run.gate).toBe('storyboard');
    gateReached = true;

    const regen = regenSceneImage(run, 0, cb, deps); // parks on the barrier mid-flight
    await ticks(4);
    const approveIdx = seen.length;
    const done = await approveStoryboard(run, cb, deps);
    releaseRegen();
    await regen;

    // The late regen commits must not drag the run back to the storyboard gate…
    expect(done.gate).toBe('first_cut');
    expect(server.row!.body.status).toBe('review');
    expect(artifacts().gate).toBe('first_cut');
    expect(artifacts().storyboardApproved).toBe(true);
    // …in the run object, on the wire, or in anything the UI was handed.
    expect(seen.slice(approveIdx).some((s) => s.status === 'review' && s.gate === 'storyboard')).toBe(false);
    for (const w of server.applied.slice(server.applied.findIndex((x) => x.artifacts.storyboardApproved === true))) {
      expect(w.artifacts.gate === 'storyboard' && w.status === 'review').toBe(false);
    }
    // …and the regenerated image is still in the persisted storyboard.
    expect((artifacts().storyboard as Scene[])[0].imageUrl).toBe('img://IMG0');
  });
});

// --- 4. ProducerFlow's shallow-spread resume copy --------------------------

describe('shallow-spread resume copy (ProducerFlow handleRetry)', () => {
  it('converges on the server revision instead of deadlocking on a forked one', async () => {
    const { deps } = makeDeps();
    const { cb } = makeCallbacks();
    const run = await runProduction(createProductionRun(makeInput(), 'u1'), cb, deps);

    // handleRetry: `{ ...run, status: 'running' }` — `revision` is copied by value, so
    // the fork can go stale the moment the original writes again.
    const resumed: ProductionRun = { ...run, status: 'running', error: undefined };
    await deps.persist(run); // original advances the server revision under the fork
    const rejectedBefore = server.rejected.length;

    await deps.persist(resumed); // stale fork → rejected, adopts
    expect(server.rejected.length).toBe(rejectedBefore + 1);
    expect(resumed.revision).toBe(server.row!.revision);

    await deps.persist(resumed); // …and the very next write succeeds
    expect(server.rejected.length).toBe(rejectedBefore + 1);
    expect(server.row!.body.status).toBe('running');
  });
});

// Sanity: these fixtures do exercise the real mapper/assembler the stages use.
describe('fixture sanity', () => {
  it('assembles the script and maps the report the stages consume', () => {
    expect(assembleFinalScript(SCRIPT)).toEqual(['Hook one', 'Body A', 'Body B']);
    expect(mapReportToWizard(makeInput(), REPORT).clientDetails.brandName).toBe('Brew');
  });
});
