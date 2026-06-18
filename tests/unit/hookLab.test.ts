import { describe, it, expect } from 'vitest';
import { parseHookVariants, toHookVariant } from '../../services/hookLabService.js';

describe('parseHookVariants — surreal hook shaping', () => {
  it('parses a clean JSON array into variants carrying the three fields', () => {
    const raw = JSON.stringify([
      { hookLine: 'Your sales, defying gravity', surrealConcept: 'A store floating in clouds', imagePrompt: 'A surreal floating store, dark cinematic, gold accent' },
      { hookLine: 'Wake up the algorithm', surrealConcept: 'A giant eye opening in the sky', imagePrompt: 'A colossal eye over a city, charcoal sky, gold iris' },
    ]);
    const out = parseHookVariants(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      hookLine: expect.any(String),
      surrealConcept: expect.any(String),
      imagePrompt: expect.any(String),
    });
    expect(out[0].id).toBeTruthy();
  });

  it('strips ```json fences before parsing', () => {
    const raw = '```json\n[{"hookLine":"A","surrealConcept":"B","imagePrompt":"C"}]\n```';
    expect(parseHookVariants(raw)).toHaveLength(1);
  });

  it('accepts a { variants: [...] } envelope', () => {
    const raw = JSON.stringify({ variants: [{ hookLine: 'A', surrealConcept: 'B', imagePrompt: 'C' }] });
    expect(parseHookVariants(raw)).toHaveLength(1);
  });

  it('drops entries missing a hookLine or imagePrompt (no half-baked variants)', () => {
    const raw = JSON.stringify([
      { hookLine: 'Has both', imagePrompt: 'yes', surrealConcept: 'x' },
      { hookLine: 'No image prompt', surrealConcept: 'x' },
      { surrealConcept: 'no hook line', imagePrompt: 'yes' },
    ]);
    expect(parseHookVariants(raw)).toHaveLength(1);
  });

  it('returns [] on non-JSON garbage instead of throwing', () => {
    expect(parseHookVariants('the model rambled instead of json')).toEqual([]);
  });

  it('toHookVariant tolerates alias keys (hook/concept/prompt) and assigns an id', () => {
    const v = toHookVariant({ hook: 'aliased', concept: 'c', prompt: 'p' });
    expect(v.hookLine).toBe('aliased');
    expect(v.surrealConcept).toBe('c');
    expect(v.imagePrompt).toBe('p');
    expect(v.id).toBeTruthy();
  });

  it('assigns unique ids across variants', () => {
    const out = parseHookVariants(JSON.stringify([
      { hookLine: 'A', surrealConcept: 'B', imagePrompt: 'C' },
      { hookLine: 'D', surrealConcept: 'E', imagePrompt: 'F' },
    ]));
    expect(out[0].id).not.toBe(out[1].id);
  });
});
