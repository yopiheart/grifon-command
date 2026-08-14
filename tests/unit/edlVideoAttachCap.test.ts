import { describe, it, expect, vi, beforeEach } from 'vitest';

// Cap on how many scene videos one EDL request may attach.
//
// Production evidence (producer_runs): every EDL run with <=9 attached videos
// succeeded; the single run with 10 failed with a reproducible 429
// RESOURCE_EXHAUSTED while every project quota read 0% on a paid tier-3
// account. The fix caps attachments at 8 and lets the surplus scenes ride in
// the prompt as videoAttached:no.
//
// Catches:
//   1. Selection-rule regressions — the cap, the always-keep-first-and-last
//      rule, sceneBatch-INDEX (not sceneIdx, not eligible-position) semantics,
//      and determinism.
//   2. Request-shape regressions at the proxy seam — an over-cap run must put
//      exactly 8 fileData parts on the wire, and the prompt's per-scene
//      videoAttached lines must agree with what was actually attached.
//   3. Degrade-lane drift — the stubbed retry must attach the SAME videos.
//
// Does NOT catch: whether 8 is the right number. That's a live-run question;
// the console.info in generateEditDecisionList is the evidence trail.

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
    expect([...selectEdlVideoAttachIndexes(rendered(4))]).toEqual([0, 1, 2, 3]);
    expect(selectEdlVideoAttachIndexes(rendered(8)).size).toBe(8);
    expect([...selectEdlVideoAttachIndexes(rendered(8))].sort((a, b) => a - b))
      .toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('skips scenes with no rendered video', () => {
    const batch = [
      { renderedUrl: 'https://example.com/a.mp4' },
      {},
      { renderedUrl: '' },
      { renderedUrl: 'https://example.com/d.mp4' },
    ];
    expect([...selectEdlVideoAttachIndexes(batch)].sort((a, b) => a - b)).toEqual([0, 3]);
  });

  it('over the cap: keeps the first and last scene, fills the rest from the front', () => {
    // 10 rendered scenes, cap 8 → hook (0) + close (9) + the earliest six (1..6).
    // Scenes 7 and 8 are the ones dropped.
    const picked = selectEdlVideoAttachIndexes(rendered(10));
    expect(picked.size).toBe(8);
    expect([...picked].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 9]);
    expect(picked.has(7)).toBe(false);
    expect(picked.has(8)).toBe(false);
  });

  it('returns sceneBatch indexes, not positions within the eligible subset', () => {
    // 12 scenes; scenes 0 and 3 never rendered → 10 eligible: 1,2,4,5,6,7,8,9,10,11.
    // Expect first eligible (1) + last eligible (11) + the earliest six after 1.
    const batch: { renderedUrl?: string }[] = rendered(12);
    batch[0] = {};
    batch[3] = {};
    const picked = selectEdlVideoAttachIndexes(batch);
    expect([...picked].sort((a, b) => a - b)).toEqual([1, 2, 4, 5, 6, 7, 8, 11]);
  });

  it('is deterministic — the degrade retry must attach the same media', () => {
    const a = [...selectEdlVideoAttachIndexes(rendered(11))].sort((x, y) => x - y);
    const b = [...selectEdlVideoAttachIndexes(rendered(11))].sort((x, y) => x - y);
    expect(a).toEqual(b);
  });

  it('honors an explicit cap argument', () => {
    const picked = selectEdlVideoAttachIndexes(rendered(6), 3);
    expect([...picked].sort((a, b) => a - b)).toEqual([0, 1, 5]);
  });
});

// ---------------------------------------------------------------------------
// Seam test: the outbound /api/gemini/* request body.
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

const geminiBodies = (): any[] =>
  fetchMock.mock.calls
    .filter((c: any) => typeof c[0] === 'string' && !c[0].startsWith('blob:'))
    .map((c: any) => JSON.parse(c[1].body));

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

describe('generateEditDecisionList — attachment cap on the wire', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('a 10-scene batch attaches 8 videos, keeping scene 1 and scene 10', async () => {
    fetchMock.mockImplementation(async () => okGemini(cannedTenSceneEdl));

    await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    const parts = geminiBodies()[0].contents.parts;
    const videos = parts.filter((p: any) => p.fileData);
    expect(videos.length).toBe(8);
    expect(videos[0].fileData.fileUri).toBe('https://example.com/s0.mp4');
    expect(videos[7].fileData.fileUri).toBe('https://example.com/s9.mp4');
    expect(videos.map((p: any) => p.fileData.fileUri)).not.toContain('https://example.com/s7.mp4');
    expect(videos.map((p: any) => p.fileData.fileUri)).not.toContain('https://example.com/s8.mp4');
  });

  it('the prompt describes exactly what was attached', async () => {
    fetchMock.mockImplementation(async () => okGemini(cannedTenSceneEdl));

    await generateEditDecisionList({ ...tenSceneInput, finalScript: 'Ten scenes.' });

    const flags = videoAttachedFlags(geminiBodies()[0].contents.parts[0].text);
    expect(flags).toEqual([
      'yes (see fileData part)', // Scene 1  — hook, always kept
      'yes (see fileData part)', // Scene 2
      'yes (see fileData part)', // Scene 3
      'yes (see fileData part)', // Scene 4
      'yes (see fileData part)', // Scene 5
      'yes (see fileData part)', // Scene 6
      'yes (see fileData part)', // Scene 7
      'no',                      // Scene 8  — over the cap
      'no',                      // Scene 9  — over the cap
      'yes (see fileData part)', // Scene 10 — close, always kept
    ]);
  });

  it('an under-cap batch still attaches every scene and says so', async () => {
    const input = {
      sceneBatch: Array.from({ length: 4 }, (_, i) => ({
        sceneIdx: i,
        scriptLine: `Line ${i}`,
        renderedUrl: `https://example.com/u${i}.mp4`,
        type: 'b-roll' as const,
      })),
      audioOverlays: [],
      aspectRatio: '9:16' as const,
      targetPlatform: 'tiktok' as const,
    };
    fetchMock.mockImplementation(async () =>
      okGemini({
        ...cannedTenSceneEdl,
        scenes: cannedTenSceneEdl.scenes.slice(0, 4),
      }),
    );

    await generateEditDecisionList({ ...input, finalScript: 'Four scenes.' });

    const parts = geminiBodies()[0].contents.parts;
    expect(parts.filter((p: any) => p.fileData).length).toBe(4);
    expect(videoAttachedFlags(parts[0].text)).toEqual(
      Array(4).fill('yes (see fileData part)'),
    );
  });

  it('the degrade retry attaches the identical video set', async () => {
    let attempt = 0;
    fetchMock.mockImplementation(async () => {
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
    const videosOf = (b: any) =>
      b.contents.parts.filter((p: any) => p.fileData).map((p: any) => p.fileData.fileUri);
    expect(videosOf(bodies[1])).toEqual(videosOf(bodies[0]));
    expect(videosOf(bodies[1]).length).toBe(8);
    // The stub swaps the script text only — the attachment map must not move.
    expect(videoAttachedFlags(bodies[1].contents.parts[0].text)).toEqual(
      videoAttachedFlags(bodies[0].contents.parts[0].text),
    );
  });
});
