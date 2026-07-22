import { describe, it, expect } from 'vitest';
import { LegacyBody } from '../../api/gemini/text.js';

// The legacy passthrough forwarder must only accept Grifon's pinned text models.
// An authenticated client could otherwise request arbitrary/expensive models.
// A disallowed model fails safeParse and takes the existing invalid_body 400 path.
describe('gemini/text LegacyBody — model allowlist', () => {
  const ALLOWED = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
  ];

  it.each(ALLOWED)('accepts the pinned model %s', (model) => {
    const result = LegacyBody.safeParse({ model, contents: 'hello' });
    expect(result.success).toBe(true);
  });

  it('rejects a model outside the allowlist', () => {
    const result = LegacyBody.safeParse({ model: 'gemini-3.0-ultra', contents: 'hello' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty model string', () => {
    const result = LegacyBody.safeParse({ model: '', contents: 'hello' });
    expect(result.success).toBe(false);
  });

  it('still strips unknown keys (e.g. the meterUnit hint) from the parsed body', () => {
    const result = LegacyBody.safeParse({
      model: 'gemini-3.1-flash-lite',
      contents: 'hello',
      meterUnit: 'captions',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('meterUnit');
    }
  });
});
