import { describe, it, expect } from 'vitest';
import { auditScript, findingsForBlock } from '../../utils/scriptAudit.js';
import {
  HOOK_WORD_CAP,
  HOOK_SENTENCE_CAP,
  BODY_WORD_CAP,
  BODY_WORD_MIN,
} from '../../utils/scriptGuardrails.js';
import type { Script } from '../../types.js';

/** n words, each a distinct token so the whitespace split is unambiguous. */
const words = (n: number): string => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');

const script = (over: Partial<Script> = {}): Script => ({
  hook1: [words(HOOK_WORD_CAP)],
  hook2: [words(HOOK_WORD_CAP)],
  body: [words(BODY_WORD_CAP), words(BODY_WORD_CAP)],
  ...over,
});

describe('auditScript', () => {
  it('passes a script that sits exactly on every cap', () => {
    const r = auditScript(script());
    expect(r.clean).toBe(true);
    expect(r.findings).toHaveLength(0);
    expect(r.violations).toBe(0);
    expect(r.advisories).toBe(0);
  });

  it('returns a clean, renderable result for a null script', () => {
    const r = auditScript(null);
    expect(r.clean).toBe(true);
    expect(r.findings).toHaveLength(0);
    expect(r.estSeconds).toEqual({ hook1: 0, hook2: 0, body: 0 });
  });

  it('flags a hook over the word cap as a violation, on the right block and line', () => {
    const r = auditScript(script({ hook2: [words(HOOK_WORD_CAP), words(HOOK_WORD_CAP + 3)] }));
    expect(r.violations).toBe(1);
    const f = r.findings[0];
    expect(f.code).toBe('hook_over_words');
    expect(f.block).toBe('hook2');
    expect(f.lineIdx).toBe(1);
    expect(f.actual).toBe(HOOK_WORD_CAP + 3);
    expect(f.limit).toBe(HOOK_WORD_CAP);
  });

  it('flags a hook past the sentence cap even when it is under the word cap', () => {
    const r = auditScript(script({ hook1: ['One. Two. Three.'] }));
    const codes = r.findings.map((f) => f.code);
    expect(codes).toContain('hook_over_sentences');
    expect(codes).not.toContain('hook_over_words');
    const f = r.findings.find((x) => x.code === 'hook_over_sentences')!;
    expect(f.actual).toBe(3);
    expect(f.limit).toBe(HOOK_SENTENCE_CAP);
    expect(f.severity).toBe('violation');
  });

  it('flags a body line over the cap as a violation', () => {
    const r = auditScript(script({ body: [words(BODY_WORD_CAP + 5)] }));
    expect(r.violations).toBe(1);
    expect(r.findings[0].code).toBe('body_over_words');
    expect(r.findings[0].severity).toBe('violation');
  });

  it('treats a short body line as an ADVISORY, never a violation', () => {
    const r = auditScript(script({ body: [words(BODY_WORD_MIN - 2)] }));
    expect(r.violations).toBe(0);
    expect(r.advisories).toBe(1);
    expect(r.findings[0].code).toBe('body_under_words');
    expect(r.findings[0].severity).toBe('advisory');
    expect(r.clean).toBe(false);
  });

  it('never reports both over- and under-cap for the same body line', () => {
    const r = auditScript(script({ body: [words(BODY_WORD_CAP + 4)] }));
    expect(r.findings).toHaveLength(1);
  });

  it('ignores blank and whitespace-only lines', () => {
    const r = auditScript(script({ body: ['', '   ', words(BODY_WORD_CAP)] }));
    expect(r.clean).toBe(true);
  });

  it('accumulates findings across all three blocks', () => {
    const r = auditScript({
      hook1: [words(HOOK_WORD_CAP + 1)],
      hook2: [words(HOOK_WORD_CAP + 1)],
      body: [words(BODY_WORD_CAP + 1)],
    });
    expect(r.violations).toBe(3);
    expect(findingsForBlock(r, 'hook1')).toHaveLength(1);
    expect(findingsForBlock(r, 'hook2')).toHaveLength(1);
    expect(findingsForBlock(r, 'body')).toHaveLength(1);
  });

  it('estimates spoken seconds per block without summing the alternative hooks', () => {
    const r = auditScript(script({ hook1: [words(10)], hook2: [], body: [words(10)] }));
    expect(r.estSeconds.hook1).toBeGreaterThan(0);
    expect(r.estSeconds.hook2).toBe(0);
    expect(r.estSeconds.hook1).toBe(r.estSeconds.body);
  });
});
