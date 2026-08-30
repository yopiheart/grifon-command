import { describe, it, expect } from 'vitest';
import {
  buildEndFramePrompt,
  SHEET_NOTE,
  SCENE_PROMPT_CAP,
} from '../../services/producerOrchestrator.js';

// Guards the blank-wordmark fix (2026-08-30). The END frame of an unboxing scene ships a
// COMPOSED two-object reference sheet, and every tuned branch that accepts a product photo
// carries NO_UNSOLICITED_PRODUCT — "Do NOT add an outer box, carton, sleeve, pouch, gift set,
// second unit". A two-object sheet IS a second unit, so the model was told both to reproduce
// Reference Image 1 exactly and not to render what it contains, and it resolved the conflict
// by BLANKING both wordmarks while keeping the unbranded bean window.
//
// SHEET_NOTE defuses that by riding the rule's own carve-out ("unless the Scene Prompt
// explicitly names it"). It only works if it actually REACHES the model, and that is the
// failure this file exists to catch: generateSceneImage truncates at 400 chars from the END,
// so a blind append silently loses the note on a long scene prompt — on screen identical to
// a note the model ignored, and a full storyboard run to tell the two apart.
describe('buildEndFramePrompt', () => {
  it('leaves the prompt alone when there is no composed sheet', () => {
    expect(buildEndFramePrompt('END0 bottle reveal', false)).toBe('END0 bottle reveal');
  });

  it('appends the note verbatim on a short prompt', () => {
    const out = buildEndFramePrompt('END0 bottle reveal', true);
    expect(out).toBe(`END0 bottle reveal${SHEET_NOTE}`);
    expect(out.endsWith(SHEET_NOTE)).toBe(true);
  });

  it('keeps the WHOLE note on a prompt long enough to overflow the cap', () => {
    // The regression case. Measured endFramePrompts were 190 and 194 chars, which already
    // sits inside a hair of the budget; anything wordier used to push the note off the end.
    const long = 'X'.repeat(SCENE_PROMPT_CAP);
    const out = buildEndFramePrompt(long, true);

    expect(out.endsWith(SHEET_NOTE)).toBe(true);
    expect(out).toContain('reproduce BOTH labels and wordmarks exactly');
    expect(out.length).toBeLessThanOrEqual(SCENE_PROMPT_CAP);
  });

  it('proves the guard bites: a blind append would have lost the note', () => {
    // Without this assertion the test above could pass for the wrong reason (a short input
    // that never needed trimming). Show the naive path really does truncate.
    const long = 'X'.repeat(SCENE_PROMPT_CAP);
    const naive = `${long}${SHEET_NOTE}`.slice(0, SCENE_PROMPT_CAP);

    expect(naive.endsWith(SHEET_NOTE)).toBe(false);
    expect(naive).not.toContain('reproduce BOTH labels and wordmarks exactly');
  });

  it('never exceeds the cap across a sweep of prompt lengths', () => {
    for (const n of [0, 1, 100, 190, 194, 209, 250, 399, 400, 800]) {
      const out = buildEndFramePrompt('X'.repeat(n), true);
      expect(out.length).toBeLessThanOrEqual(SCENE_PROMPT_CAP);
      expect(out.endsWith(SHEET_NOTE)).toBe(true);
    }
  });

  it('names both objects, which is the carve-out the tuned rule requires', () => {
    expect(SHEET_NOTE).toContain('TWO real objects');
    expect(SHEET_NOTE).toContain('unsolicited prop');
    expect(SHEET_NOTE).toContain('Do NOT copy their side-by-side layout');
  });
});
