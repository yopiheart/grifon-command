import { describe, it, expect } from 'vitest';
import { effectiveCameraEffect, buildCameraFilter } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, PRESETS } from '../../api/_lib/renderPresets.js';
import type { CameraStyle } from '../../api/_lib/renderPresets.js';

const DIMS: [number, number] = [1080, 1920];

// Shipped presets all run camera-OFF (generated clips carry their own moves —
// renderer zoom on top reads as a pulse, Neil 2026-06-10). The machinery stays
// for future static-source use, so it's tested against local fixtures.
const SUBTLE: CameraStyle = {
  intensity: 1, defaultEffect: 'zoom-in', sceneZoom: 1.08,
  chunkPunch: false, chunkPunchZoom: 1, maxPunchesPerScene: 0,
};
const PUNCHY: CameraStyle = {
  intensity: 2, defaultEffect: 'zoom-in', sceneZoom: 1.08,
  chunkPunch: true, chunkPunchZoom: 1.05, maxPunchesPerScene: 3,
};
const OUTWARD: CameraStyle = { ...SUBTLE, defaultEffect: 'zoom-out', sceneZoom: 1.06 };

describe('effectiveCameraEffect', () => {
  it('every shipped preset renders nothing, even with an explicit EDL hint (pulse guard)', () => {
    for (const p of Object.values(PRESETS)) {
      expect(effectiveCameraEffect('zoom-in', 2, p.camera), p.id).toBeNull();
      expect(effectiveCameraEffect(undefined, 0, p.camera), p.id).toBeNull();
    }
  });

  it('an explicit EDL hint wins over the fixture default', () => {
    expect(effectiveCameraEffect('pan', 0, SUBTLE)).toBe('pan');
    expect(effectiveCameraEffect('zoom-out', 0, PUNCHY)).toBe('zoom-out');
  });

  it('no hint → fixture default, zoom direction alternating per scene index', () => {
    expect(effectiveCameraEffect(undefined, 0, SUBTLE)).toBe('zoom-in');
    expect(effectiveCameraEffect(undefined, 1, SUBTLE)).toBe('zoom-out');
    expect(effectiveCameraEffect(undefined, 2, SUBTLE)).toBe('zoom-in');
    expect(effectiveCameraEffect(undefined, 0, OUTWARD)).toBe('zoom-out');
    expect(effectiveCameraEffect(undefined, 1, OUTWARD)).toBe('zoom-in');
  });

  it("a 'none' hint falls through to the fixture default", () => {
    expect(effectiveCameraEffect('none', 0, SUBTLE)).toBe('zoom-in');
  });
});

describe('buildCameraFilter', () => {
  it('returns null for no effect, intensity 0, or unknown duration', () => {
    expect(buildCameraFilter(null, 4, DIMS, SUBTLE)).toBeNull();
    expect(buildCameraFilter('zoom-in', 4, DIMS, CLASSIC.camera)).toBeNull();
    expect(buildCameraFilter('zoom-in', null, DIMS, SUBTLE)).toBeNull();
  });

  it('zoom-in: per-frame scale ramp + centered crop + SAR re-pin', () => {
    const f = buildCameraFilter('zoom-in', 4, DIMS, SUBTLE);
    expect(f).toBe(
      "scale=w='trunc(1080*(1+0.08*min(1,t/4.000))/2)*2':h=-2:eval=frame," +
      'crop=1080:1920:(iw-1080)/2:(ih-1920)/2,setsar=1'
    );
  });

  it('zoom-out starts at the target and settles to 1.0', () => {
    const f = buildCameraFilter('zoom-out', 5, DIMS, OUTWARD);
    expect(f).toContain('1.06-0.06*min(1,t/5.000)');
    expect(f).toContain('eval=frame');
  });

  it('chunk punches: +0.05 decaying terms at caption-chunk starts, capped', () => {
    const f = buildCameraFilter('zoom-in', 6, DIMS, PUNCHY, [1.2, 2.4, 3.6, 4.8]);
    expect(f).toContain('+0.05*gte(t,1.200)*max(0,1-(t-1.200)/0.25)');
    expect(f).toContain('gte(t,2.400)');
    expect(f).toContain('gte(t,3.600)');
    expect(f).not.toContain('gte(t,4.800)'); // maxPunchesPerScene = 3
  });

  it('punch times beyond the trimmed length are dropped', () => {
    const f = buildCameraFilter('zoom-in', 2, DIMS, PUNCHY, [1.0, 5.0]);
    expect(f).toContain('gte(t,1.000)');
    expect(f).not.toContain('gte(t,5.000)');
  });

  it('chunkPunch off emits no punch terms even when times are passed', () => {
    const f = buildCameraFilter('zoom-in', 4, DIMS, SUBTLE, [1.0, 2.0]);
    expect(f).not.toContain('gte(');
  });

  it('pan: static 6% oversize, crop x sweeps across the scene', () => {
    const f = buildCameraFilter('pan', 4, DIMS, SUBTLE);
    expect(f).toBe(
      "scale=1144:-2,crop=1080:1920:x='(iw-1080)*min(1,t/4.000)':y=(ih-1920)/2,setsar=1"
    );
  });

  it('shake maps to a single decaying punch at the cut', () => {
    const f = buildCameraFilter('shake', 4, DIMS, PUNCHY);
    expect(f).toContain('max(0,1-t/0.25)');
    expect(f).toContain('eval=frame');
  });
});
