import { describe, it, expect } from 'vitest';
import { autoRouteModelForType } from '../../components/GenerateVideo/RenderAllRunner.js';

// Item 6 / finding #23: the RENDER ALL auto-router no longer steps the scene-0
// b-roll hook up to Kling_O1 — with a single start frame O1 degrades to a warp
// pass and person-held hooks crystallize mid-shot. Hooks route like any b-roll;
// Kling_O1 stays a manual pick in the GenerateVideo model picker.
describe('autoRouteModelForType (RENDER ALL auto-routing)', () => {
  it('routes b-roll (incl. the scene-0 hook) to Kling_3_0 — never Kling_O1', () => {
    expect(autoRouteModelForType('b-roll', 'Veo_3.1_Lite')).toBe('Kling_3_0');
    expect(autoRouteModelForType('cinematic', 'Veo_3.1_Lite')).toBe('Kling_3_0');
  });

  it('routes talking scenes to the Veo talking engine', () => {
    expect(autoRouteModelForType('talking', 'Veo_3.1_Lite')).toBe('Veo_3.1_Lite');
  });

  it('falls back to the global picker for unknown scene types', () => {
    expect(autoRouteModelForType('product' as never, 'Kling_O1')).toBe('Kling_O1');
  });
});
