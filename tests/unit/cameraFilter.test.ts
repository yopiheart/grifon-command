import { describe, it, expect } from 'vitest';
import { effectiveCameraEffect, buildCameraFilter } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, IMPACT, HYPE, CLEAN } from '../../api/_lib/renderPresets.js';

const DIMS: [number, number] = [1080, 1920];

describe('effectiveCameraEffect', () => {
  it('classic (intensity 0) renders nothing, even with an explicit EDL hint', () => {
    expect(effectiveCameraEffect('zoom-in', 2, CLASSIC.camera)).toBeNull();
    expect(effectiveCameraEffect(undefined, 0, CLASSIC.camera)).toBeNull();
  });

  it('an explicit EDL hint wins over the preset default', () => {
    expect(effectiveCameraEffect('pan', 0, IMPACT.camera)).toBe('pan');
    expect(effectiveCameraEffect('zoom-out', 0, HYPE.camera)).toBe('zoom-out');
  });

  it('no hint → preset default, zoom direction alternating per scene index', () => {
    expect(effectiveCameraEffect(undefined, 0, IMPACT.camera)).toBe('zoom-in');
    expect(effectiveCameraEffect(undefined, 1, IMPACT.camera)).toBe('zoom-out');
    expect(effectiveCameraEffect(undefined, 2, IMPACT.camera)).toBe('zoom-in');
    // clean defaults to zoom-out → alternates the other way
    expect(effectiveCameraEffect(undefined, 0, CLEAN.camera)).toBe('zoom-out');
    expect(effectiveCameraEffect(undefined, 1, CLEAN.camera)).toBe('zoom-in');
  });

  it("a 'none' hint falls through to the preset default", () => {
    expect(effectiveCameraEffect('none', 0, IMPACT.camera)).toBe('zoom-in');
  });
});

describe('buildCameraFilter', () => {
  it('returns null for no effect, intensity 0, or unknown duration', () => {
    expect(buildCameraFilter(null, 4, DIMS, IMPACT.camera)).toBeNull();
    expect(buildCameraFilter('zoom-in', 4, DIMS, CLASSIC.camera)).toBeNull();
    expect(buildCameraFilter('zoom-in', null, DIMS, IMPACT.camera)).toBeNull();
  });

  it('zoom-in: per-frame scale ramp to the preset target + centered crop', () => {
    const f = buildCameraFilter('zoom-in', 4, DIMS, IMPACT.camera);
    expect(f).toBe(
      "scale=w='trunc(1080*(1+0.08*min(1,t/4.000))/2)*2':h=-2:eval=frame," +
      'crop=1080:1920:(iw-1080)/2:(ih-1920)/2'
    );
  });

  it('zoom-out starts at the target and settles to 1.0', () => {
    const f = buildCameraFilter('zoom-out', 5, DIMS, CLEAN.camera);
    expect(f).toContain("1.06-0.06*min(1,t/5.000)");
    expect(f).toContain('eval=frame');
  });

  it('hype chunk punches: +0.05 decaying terms at caption-chunk starts, capped', () => {
    const f = buildCameraFilter('zoom-in', 6, DIMS, HYPE.camera, [1.2, 2.4, 3.6, 4.8]);
    expect(f).toContain('+0.05*gte(t,1.200)*max(0,1-(t-1.200)/0.25)');
    expect(f).toContain('gte(t,2.400)');
    expect(f).toContain('gte(t,3.600)');
    expect(f).not.toContain('gte(t,4.800)'); // maxPunchesPerScene = 3
  });

  it('punch times beyond the trimmed length are dropped', () => {
    const f = buildCameraFilter('zoom-in', 2, DIMS, HYPE.camera, [1.0, 5.0]);
    expect(f).toContain('gte(t,1.000)');
    expect(f).not.toContain('gte(t,5.000)');
  });

  it('impact (chunkPunch off) emits no punch terms even when times are passed', () => {
    const f = buildCameraFilter('zoom-in', 4, DIMS, IMPACT.camera, [1.0, 2.0]);
    expect(f).not.toContain('gte(');
  });

  it('pan: static 6% oversize, crop x sweeps across the scene', () => {
    const f = buildCameraFilter('pan', 4, DIMS, IMPACT.camera);
    expect(f).toBe(
      "scale=1144:-2,crop=1080:1920:x='(iw-1080)*min(1,t/4.000)':y=(ih-1920)/2"
    );
  });

  it('shake maps to a single decaying punch at the cut', () => {
    const f = buildCameraFilter('shake', 4, DIMS, HYPE.camera);
    expect(f).toContain('max(0,1-t/0.25)');
    expect(f).toContain('eval=frame');
  });
});
