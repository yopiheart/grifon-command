import { describe, it, expect, vi, beforeEach } from 'vitest';

// THE DRIFT GUARD for the EDL Files API upload fan-out.
//
// Scene videos are minted into `files/*` URIs one clip per request through
// /api/gemini/files/upload, fanned out with Promise.allSettled so a single clip
// failing degrades THAT scene instead of failing the whole edit. That degrade is
// the desired behavior — and it is also the one way this design can ship a silent
// bug: the prompt's per-scene `videoAttached` line is built from one set and the
// fileData parts from another, so a rejected upload could leave the model told to
// watch a video that was never attached. Every downstream cut/transition decision
// for that scene would then be hallucinated against a phantom clip.
//
// Catches: any future refactor that builds the prompt from the PRE-upload
// eligibility list instead of the POST-upload result.
//
// Asserts, per case:
//   1. count(videoAttached: yes) === count(fileData parts).
//   2. Every scene whose upload rejected reads `videoAttached: no`.
//   3. Every scene whose upload resolved reads `yes` and contributes its URI,
//      in ascending sceneBatch order.
//
// Mocked at the /api/gemini/* proxy seam (per tests/CLAUDE.md), never at an
// internal collaborator — the implementation is free to change shape.

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

const { generateEditDecisionList } = await import('../../services/geminiService.js');

const SCENE_COUNT = 5; // under EDL_MAX_ATTACHED_VIDEOS, so all 5 are eligible

const input = {
  sceneBatch: Array.from({ length: SCENE_COUNT }, (_, i) => ({
    sceneIdx: i,
    scriptLine: `Line ${i}`,
    renderedUrl: `https://example.com/s${i}.mp4`,
    type: 'talking' as const,
  })),
  audioOverlays: [],
  aspectRatio: '9:16' as const,
  targetPlatform: 'tiktok' as const,
  finalScript: 'Five scenes.',
};

const cannedEdl = {
  meta: {
    totalDurationSec: 20,
    aspectRatio: '9:16',
    targetPlatform: 'tiktok',
    hookStrategy: 'Cold-open on the reveal.',
    formulaApplied: ['mrbeast'],
    scriptStyleDetected: 'mrbeast',
  },
  scenes: input.sceneBatch.map((s) => ({
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

// Routes the fetch mock: uploads succeed only for scene indexes in `succeed`.
// A failure is a real proxy error response, the shape proxyCall wraps and throws.
const routeUploads = (succeed: readonly number[]) => {
  fetchMock.mockImplementation(async (url: any, init: any) => {
    if (typeof url === 'string' && url.includes('/api/gemini/files/upload')) {
      const src: string = JSON.parse(init.body).url;
      const idx = Number(src.match(/s(\d+)\.mp4$/)![1]);
      if (!succeed.includes(idx)) {
        return { ok: false, status: 502, json: async () => ({ error: 'files_upload_failed' }) };
      }
      return { ok: true, status: 200, json: async () => ({ uri: `files/s${idx}`, name: `files/s${idx}` }) };
    }
    return { ok: true, status: 200, json: async () => ({ text: JSON.stringify(cannedEdl) }) };
  });
};

const edlBody = (): any => {
  const call = fetchMock.mock.calls.find(
    (c: any) => typeof c[0] === 'string' && c[0].includes('/api/gemini/text'),
  );
  if (!call) throw new Error('the EDL call never reached /api/gemini/text');
  return JSON.parse(call[1].body);
};

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

const cases: { name: string; succeed: number[] }[] = [
  { name: 'all uploads succeed', succeed: [0, 1, 2, 3, 4] },
  { name: 'all uploads fail', succeed: [] },
  { name: 'mixed — the middle two fail', succeed: [0, 3, 4] },
  { name: 'mixed — only the hook survives', succeed: [0] },
];

describe('generateEditDecisionList — upload fan-out drift guard', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  for (const { name, succeed } of cases) {
    it(`${name}: the prompt and the parts agree`, async () => {
      routeUploads(succeed);

      await generateEditDecisionList(input);

      const parts = edlBody().contents.parts;
      const fileParts = parts.filter((p: any) => p.fileData);
      const flags = videoAttachedFlags(parts[0].text);

      // Every scene is still described, whatever happened to its upload.
      expect(flags.length).toBe(SCENE_COUNT);

      // 1. The counts can never drift.
      expect(flags.filter((f) => f !== 'no').length).toBe(fileParts.length);
      expect(fileParts.length).toBe(succeed.length);

      // 2 + 3. Per scene: succeeded ⇒ yes, rejected ⇒ no.
      expect(flags).toEqual(
        Array.from({ length: SCENE_COUNT }, (_, i) =>
          succeed.includes(i) ? 'yes (see fileData part)' : 'no',
        ),
      );

      // The parts carry exactly the succeeded scenes, in sceneBatch order.
      expect(fileParts.map((p: any) => p.fileData.fileUri)).toEqual(
        [...succeed].sort((a, b) => a - b).map((i) => `files/s${i}`),
      );
    });
  }

  it('a failed upload never fails the EDL — every scene still comes back', async () => {
    routeUploads([]);

    const edl = await generateEditDecisionList(input);

    expect(edl.scenes.length).toBe(SCENE_COUNT);
    // The render still receives the REAL R2 sources; only the model's eyes are lost.
    expect(edl.scenes.map((s: any) => s.sourceVideoUrl)).toEqual(
      input.sceneBatch.map((s) => s.renderedUrl),
    );
  });
});
