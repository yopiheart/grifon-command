import type { ProductionRun } from '../../services/producerOrchestrator';

/**
 * DEV-ONLY design preview fixtures. Used solely by the `?osaPreview=` hook in
 * index.tsx to render the Running / First Cut screens with mock data and NO
 * orchestrator (zero API spend) for visual review. Not referenced by any real
 * run path. Safe to delete before merge.
 */

const img = (seed: string) => `https://picsum.photos/seed/${seed}/240/420`;

const baseInput: ProductionRun['input'] = {
  brandName: 'Bukidnon Brew',
  offer: 'Buy 1 Take 1 this week',
  price: '₱199',
  productName: 'Single-Origin Cold Brew',
  productDescription: 'Hand-pressed Bukidnon beans, bottled fresh.',
  heroImageBase64: img('hero'),
  avatar: { url: img('avatar'), description: 'A Filipino host', ethnicity: 'Filipino', prompt: '' },
  voiceId: 'voice_pinoy_1',
  language: 'Taglish',
  aspectRatio: '9:16',
  scriptType: 'Testimonial',
};

const STAGES = [
  { id: 'market_research', label: 'Researching your market' },
  { id: 'script', label: 'Writing your hook' },
  { id: 'storyboard', label: 'Designing your scenes' },
  { id: 'scene_images', label: 'Building your visuals' },
  { id: 'video', label: 'Filming your scenes' },
  { id: 'voices', label: 'Recording the voiceover' },
  { id: 'edl', label: 'Cutting the edit' },
  { id: 'final_render', label: 'Final cut' },
] as const;

export function makePreviewRun(kind: 'running' | 'firstcut'): ProductionRun {
  if (kind === 'running') {
    return {
      runId: 'preview-running',
      userId: 'preview',
      createdAt: 0,
      updatedAt: 0,
      status: 'running',
      input: baseInput,
      stages: STAGES.map((s, i) => ({
        id: s.id as ProductionRun['stages'][number]['id'],
        label: s.label,
        status: i < 4 ? 'done' : i === 4 ? 'running' : 'pending',
        attempts: i < 5 ? 1 : 0,
        detail:
          s.id === 'market_research' ? 'Found your customer’s #1 fear' : s.id === 'script' ? '“Tignan mo ’to bago ka mag-order ulit”' : s.id === 'storyboard' ? '7 scenes' : undefined,
      })),
      scenes: [
        { sceneIdx: 0, status: 'done', imageUrl: img('s0') },
        { sceneIdx: 1, status: 'done', imageUrl: img('s1') },
        { sceneIdx: 2, status: 'rendering', imageUrl: img('s2') },
        { sceneIdx: 3, status: 'pending' },
        { sceneIdx: 4, status: 'pending' },
        { sceneIdx: 5, status: 'pending' },
        { sceneIdx: 6, status: 'pending' },
      ],
    };
  }
  // firstcut
  return {
    runId: 'preview-firstcut',
    userId: 'preview',
    createdAt: 0,
    updatedAt: 0,
    status: 'review',
    input: baseInput,
    stages: STAGES.map((s) => ({ id: s.id as ProductionRun['stages'][number]['id'], label: s.label, status: 'done', attempts: 1 })),
    scenes: [
      { sceneIdx: 0, status: 'done', imageUrl: img('s0'), videoUrl: img('s0') },
      { sceneIdx: 1, status: 'done', imageUrl: img('s1'), videoUrl: img('s1') },
      { sceneIdx: 2, status: 'flagged', imageUrl: img('s2'), flaggedReason: 'video: veo timeout' },
      { sceneIdx: 3, status: 'done', imageUrl: img('s3'), videoUrl: img('s3') },
      { sceneIdx: 4, status: 'done', imageUrl: img('s4'), videoUrl: img('s4') },
      { sceneIdx: 5, status: 'done', imageUrl: img('s5'), videoUrl: img('s5') },
      { sceneIdx: 6, status: 'done', imageUrl: img('s6'), videoUrl: img('s6') },
    ],
    finalVideoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    finalDownloadUrl: '#',
  };
}
