import { describe, it, expect } from 'vitest';
import {
  isOneShotSfxEnabled,
  setOneShotSfxEnabled,
  toggleOneShotSfx,
  playCue,
} from '../../services/uiSoundService.js';

// Intent: One-Shot's cinematic SFX layer is ON by default (premium feel out of
// the box), independent of the global synth tick, mutable, and best-effort —
// firing a cue must NEVER throw on a click even with no audio backend present.

describe('One-Shot SFX layer', () => {
  it('is ON by default', () => {
    // Fresh module state with no persisted preference → enabled.
    expect(isOneShotSfxEnabled()).toBe(true);
  });

  it('mutes and unmutes via setter + toggle', () => {
    setOneShotSfxEnabled(false);
    expect(isOneShotSfxEnabled()).toBe(false);

    toggleOneShotSfx();
    expect(isOneShotSfxEnabled()).toBe(true);

    // restore default for any later importer
    setOneShotSfxEnabled(true);
  });

  it('never throws when firing a cue (best-effort, no audio backend)', () => {
    setOneShotSfxEnabled(true);
    expect(() => {
      playCue('tap');
      playCue('open');
      playCue('select');
      playCue('confirm');
    }).not.toThrow();

    // muted path is also a silent no-op
    setOneShotSfxEnabled(false);
    expect(() => playCue('confirm')).not.toThrow();
    setOneShotSfxEnabled(true);
  });
});
