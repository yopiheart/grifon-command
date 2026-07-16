import { describe, it, expect } from 'vitest';
import { routeModel } from '../../services/producerOrchestrator.js';

// Finding #23 (sample_batch_test_spec.md): the scene-0 b-roll hook must NOT step up to
// Kling_O1 — with a single start frame O1 degrades to a camera-motion/warp pass and
// person-held product hooks crystallize mid-shot. Hooks route like any other b-roll.
describe('routeModel', () => {
  it('routes the scene-0 b-roll hook like any b-roll (no Kling_O1 step-up)', () => {
    expect(routeModel('b-roll', 'Veo_3.1_Lite', 0)).toBe('Kling_3_0');
  });

  it('routes non-hook b-roll and cinematic scenes to Kling_3_0', () => {
    expect(routeModel('b-roll', 'Veo_3.1_Lite', 2)).toBe('Kling_3_0');
    expect(routeModel('cinematic', 'Veo_3.1_Lite', 1)).toBe('Kling_3_0');
  });

  it('routes talking scenes to the Veo talking engine, resolution-aware', () => {
    expect(routeModel('talking', 'Veo_3.1_Lite', 0, '720p')).toBe('Veo_3.1_Lite');
    expect(routeModel('talking', 'Veo_3.1_Lite', 0, '1080p')).toBe('Veo_3.1_Fast');
  });

  it('falls back for unknown scene types', () => {
    expect(routeModel('product' as never, 'Veo_3.1_Quality', 3)).toBe('Veo_3.1_Quality');
  });
});
