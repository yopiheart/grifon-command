import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cap on how many scene videos one EDL request may attach.
//
// Root cause (isolated live against production, 2026-08-14): we handed Gemini the
// R2 object URL as `fileData.fileUri`, but its contract only accepts URIs minted
// by its own Files API. It tolerated arbitrary HTTPS URLs until 2026-07-31 and
// stopped some time before 2026-08-13. Same model, same endpoint, same second:
// ZERO video parts returns 200, exactly ONE returns 429 RESOURCE_EXHAUSTED. So
// it is not request size, not scene count, and not project quota (every quota
// row read 0% on a paid tier-3 account). The cap shipped at 0 for a day — every
// scene rode in as videoAttached:no — and now ships at 8 on top of the Files API
// upload path (api/gemini/files/upload.ts), which mints the supported URI.
//
// Catches:
//   1. Selection-rule regressions — the cap as a hard upper bound (including 0
//      and 1), the always-keep-first-and-last rule when there is room for it,
//      sceneBatch-INDEX (not sceneIdx, not eligible-position) semantics, and
//      determinism. These pass the cap EXPLICITLY so the rule stays under test
//      whatever the shipped default is.
//   2. Request-shape regressions at the proxy seam, against the SHIPPED default:
//      the fileData parts are present and EVERY fileUri is a `files/*` URI.
//      Reverting to the raw R2 object URL fails here — which is the point.
//   3. Degrade-lane drift — the stubbed retry must attach the SAME videos.
//
// Does NOT catch: whether Gemini accepts a given URI scheme. That is a live-run
// question; the console.info in generateEditDecisionList is the evidence trail,
// and tests/regression/edl-video-part.regression.test.ts is the live canary.

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { generateEditDecisionList, selectEdlVideoAttachIndexes } = await import(
  '../../services/geminiService.js'
);

const rendered = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ renderedUrl: `https://example.com/s${i}.mp4` }));

describe('selectEdlVideoAttachIndexes', () => {
  it('attaches every rendered scene when the batch is at or under the cap', () => {
    expect([...selectEdlVideoAttachIndexes(rendered(4), 8)]).toEqual([0, 1, 2, 3]);
    expect([...selectEdlVideoAttachIndexes(rendered(8), 8)].sort((a, b) => a - b))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('skips scenes with no rendered video', () => {
    const batch = [
      { renderedUrl: 'https://example.com/a.mp4' },
      {},
      { renderedUrl: '' },
      { renderedUrl: 'https://example.com/d.mp4' },
    ];
    expect([...selectEdlVideoAttachIndexes(batch, 8)].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it('over the cap: keeps the first and last scene, fills the rest from the front', () => {
    // 10 rendered scenes, cap 8 → hook (0) + close (9) + the earliest six (1..6).
    // Scenes 7 and 8 are the ones dropped.
    const picked = selectEdlVideoAttachIndexes(rendered(10), 8);
    expect(picked.size).toBe(8);
    expect([...picked].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('returns sceneBatch indexes, not positions within the eligible subset', () => {
    // 12 scenes; scenes 0 and 3 never rendered → 10 eligible: 1,2,4,5,6,7,8,9,10,11.
    // Expect first eligible (1) + last eligible (11) + the earliest six after 1.
    const batch: { renderedUrl?: string }[] = rendered(12);
    batch[0] = {};
    batch[3] = {};
    const picked = selectEdlVideoAttachIndexes(batch, 8);
    expect([...picked].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6, 7, 8, 11]);
  });

  it('is deterministic — the degrade retry must attach the same media', () => {
    const a = [...selectEdlVideoAttachIndexes(rendered(11), 8)].sort((x, y) => x - y);
    const b = [...selectEdlVideoAttachIndexes(rendered(11), 8)].sort((x, y) => x - y);
    expect(a).toEqual(b);
  });

  it('honors an explicit cap argument', () => {
    const picked = selectEdlVideoAttachIndexes(rendered(6), 3);
    expect([...picked].sort((a, b) => a - b)).toEqual([0, 1, 5]);
  });

  // The cap is an upper bound, never a target. A naive "seed first+last, then
  // fill" returns TWO indexes at cap 0 and cap 1 — which at 0 would put video
  // back on the wire and re-trigger the 429 this cap exists to avoid.
  it('never exceeds the cap at its boundaries', () => {
    expect(selectEdlVideoAttachIndexes(rendered(10), 0).size).toBe(0);
    expect([...selectEdlVideoAttachIndexes(rendered(10), 1)]).toEqual([0]);
    expect(selectEdlVideoAttachIndexes(rendered(10), 2).size).toBe(2);
    expect(selectEdlVideoAttachIndexes([], 0).size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Seam test: the outbound /api/gemini/* request body, at the SHIPPED cap.
// ---------------------------------------------------------------------------

const tenSceneInput = {
  sceneBatch: Array.from({ length: 10 }, (_, i) => ({
    sceneIdx: i,
    scriptLine: `Line ${i}`,
    renderedUrl: `https://example.com/s${i}.mp4`,
    type: 'talking' as const,
  })),
  audioOverlays: [],
  aspectRatio: '9:16' as const,
  targetPlatform: 'tiktok' as const,
};

const cannedTenSceneEdl = {
  meta: {
    totalDurationSec: 40,
    aspectRatio: '9:16',
    targetPlatform: 'tiktok',
    hookStrategy: 'Cold-open on the reveal.',
    formulaApplied: ['mrbeast'],
    scriptStyleDetected: 'mrbeast',
  },
  scenes: tenSceneInput.sceneBatch.map((s) => ({
    sceneIdx: s.sceneIdx,
    sourceVideoUrl: s.renderedUrl,
    sourceAudioUrl: '',
    keepSegments: [{ startSec: 0, endSec: 4 }],
    voiceOffsetSec: 0,
    cameraEffect: 'pan',
    notes: 'Lever: none — curiosity loop only.',
  })),
  globalSfxPicks: ['whoosh'],
  formulaCheck: { rulesApplied: ['Hook in first 3s'], weaknessesFlagged: [] },
};

const okGemini = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ text: JSON.stringify(payload) }),
});

// Files API mint, mocked at the /api/gemini/files/upload proxy seam. The minted
// URI carries the source filename so part ORDER stays checkable.
const okUpload = (sourceUrl: string) => ({
  ok: true,
  status: 200,
  json: async () => {
    const stem = sourceUrl.split('/').pop()!.replace('.mp4', '');
    return { uri: `files/${stem}`, name: `files/${stem}` };
  },
});

const geminiBodies = (): any[] =>
  fetchMock.mock.calls
    .filter((c: any) => typeof c[0] === 'string' && c[0].includes('/api/gemini/text'))
    .map((c: any) => JSON.parse(c[1].body));

const uploadedUrls = (): string[] =>
  fetchMock.mock.calls
    .filter((c: any) => typeof c[0] === 'string' && c[0].includes('/api/gemini/files/upload'))
    .map((c: any) => JSON.parse(c[1].body).url);

// Reads the videoAttached value the prompt declared for each 1-based scene.
const videoAttachedFlags = (promptText: string): string[] =>
  promptText
    .split('\n- Scene ')
    .slice(1)
    .map((block) => {
      const m = block.match(/videoAttached: (yes \(see fileData part\)|no)/);
      if (!m) throw new Error('scene block has no videoAttached line');
      return m[1];
    });

// Routes the global fetch mock: Files API mints answer the upload proxy, the
// canned EDL answers everything else.
const routeAllOk = () => {
  fetchMock.mockImplementation(async (url: any, init: any) =>
    typeof url === 'string' && url.includes('/api/gemini/files/upload')
      ? okUpload(JSON.parse(init.body).url)
      : okGemini(cannedTenSceneEdl),
  );
};

describe('generateEditDecisionList — attachment cap on the wire', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('puts ONLY Files-API-minted URIs on the wire, capped at the shipped default', async () => {
    routeAllOk();

    await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    const parts = geminiBodies()[0].contents.parts;
    const fileParts = parts.filter((p: any) => p.fileData);
    // 10 rendered scenes, cap 8 → hook (0) + close (9) + the earliest six (1..6).
    expect(fileParts.length).toBe(8);
    // The whole point of the restore: never the raw R2 object URL again.
    fileParts.forEach((p: any) => {
      expect(p.fileData.fileUri).toMatch(/^files\//);
      expect(p.fileData.mimeType).toBe('video/mp4');
    });
    // Parts stay in ascending sceneBatch order (the load-bearing contract), even
    // though the selector seeds first+last before filling.
    expect(fileParts.map((p: any) => p.fileData.fileUri)).toEqual(
      ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's9'].map((s) => `files/${s}`),
    );
    // Only the selected scenes were uploaded — the cap is a spend gate too.
    expect(uploadedUrls().length).toBe(8);
  });

  it('the prompt describes exactly what was attached', async () => {
    routeAllOk();

    await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    // Every scene still appears in the prompt; scenes 7 and 8 lost the cap draw.
    const yes = 'yes (see fileData part)';
    expect(videoAttachedFlags(geminiBodies()[0].contents.parts[0].text))
      .toEqual([yes, yes, yes, yes, yes, yes, yes, 'no', 'no', yes]);
  });

  it('keeps every scene in the batch so the render keeps all its sources', async () => {
    routeAllOk();

    const edl = await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    // The passthrough at the end of generateEditDecisionList only rewrites
    // sourceVideoUrl when scenes-out matches scenes-in; detaching media must not
    // shrink sceneBatch, or the final render loses its inputs.
    expect(edl.scenes.length).toBe(10);
    expect(edl.scenes.map((s: any) => s.sourceVideoUrl))
      .toEqual(tenSceneInput.sceneBatch.map((s) => s.renderedUrl));
  });

  it('the degrade retry attaches the identical video set', async () => {
    let attempt = 0;
    fetchMock.mockImplementation(async (url: any, init: any) => {
      if (typeof url === 'string' && url.includes('/api/gemini/files/upload')) {
        return okUpload(JSON.parse(init.body).url);
      }
      attempt += 1;
      if (attempt === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ text: '', promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } }),
        };
      }
      return okGemini(cannedTenSceneEdl);
    });

    await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    const bodies = geminiBodies();
    expect(bodies.length).toBe(2);
    // Media parts are built once — the stubbed retry must not re-mint URIs.
    expect(uploadedUrls().length).toBe(8);
    const videosOf = (b: any) =>
      b.contents.parts.filter((p: any) => p.fileData).map((p: any) => p.fileData.fileUri);
    expect(videosOf(bodies[1])).toEqual(videosOf(bodies[0]));
    // The stub swaps the script text only — the attachment map must not move.
    expect(videoAttachedFlags(bodies[1].contents.parts[0].text)).toEqual(
      videoAttachedFlags(bodies[0].contents.parts[0].text),
    );
  });
});
