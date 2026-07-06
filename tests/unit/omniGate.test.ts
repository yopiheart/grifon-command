import { describe, it, expect } from 'vitest';
import {
  parseGateResponse,
  judgeGate,
  looksBlocked,
  type OmniGateVerdict,
} from '../../api/_lib/omniGate.js';

// The Omni QA gate (api/_lib/omniGate.ts) — EVAL infra. Only the PURE pieces are
// tested here (parse + judge); runOmniGate itself makes a vision call and fails
// open, which is covered by its documented contract, not a network test.

describe('parseGateResponse', () => {
  it('parses a fenced JSON block', () => {
    const raw = '```json\n{"renderedText":["SALE"],"hasCaptions":false,"believability":"real-human"}\n```';
    expect(parseGateResponse(raw)).toEqual({
      renderedText: ['SALE'],
      hasCaptions: false,
      believability: 'real-human',
    });
  });

  it('parses prose-wrapped JSON', () => {
    const raw =
      'Here is my analysis: {"renderedText":[],"hasCaptions":true,"believability":"likely-ai"} — done.';
    expect(parseGateResponse(raw)).toEqual({
      renderedText: [],
      hasCaptions: true,
      believability: 'likely-ai',
    });
  });

  it('coerces malformed field types defensively', () => {
    const raw = '{"renderedText":"SALE","hasCaptions":"nope","believability":"weird"}';
    expect(parseGateResponse(raw)).toEqual({
      renderedText: [], // non-array → []
      hasCaptions: false, // non-true → false
      believability: 'real-human', // unknown → real-human (never over-flags)
    });
  });

  it('returns null on garbage (caller fails open)', () => {
    expect(parseGateResponse('no json here at all')).toBeNull();
    expect(parseGateResponse('')).toBeNull();
    expect(parseGateResponse('}{')).toBeNull();
  });
});

describe('judgeGate', () => {
  const ok: OmniGateVerdict = {
    renderedText: ['THE SALE STARTS'],
    hasCaptions: false,
    believability: 'real-human',
  };

  it('passes when directed text is present, no captions, believable', () => {
    const r = judgeGate(ok, { directedWords: ['sale'], expectPerson: true });
    expect(r).toEqual({ pass: true, reasons: [] });
  });

  it("fails 'missing_directed_text' when a directed word is absent", () => {
    const r = judgeGate(
      { renderedText: ['HELLO WORLD'], hasCaptions: false, believability: 'real-human' },
      { directedWords: ['SALE'], expectPerson: false }
    );
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('missing_directed_text');
  });

  it("fails 'invented_captions' when captions appear", () => {
    const r = judgeGate(
      { ...ok, hasCaptions: true },
      { directedWords: ['sale'], expectPerson: false }
    );
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('invented_captions');
  });

  it("fails 'believability' for likely-ai when a person is expected", () => {
    const r = judgeGate(
      { ...ok, believability: 'likely-ai' },
      { directedWords: ['sale'], expectPerson: true }
    );
    expect(r.pass).toBe(false);
    expect(r.reasons).toContain('believability');
  });

  it('ignores believability when no person is expected (b-roll)', () => {
    const r = judgeGate(
      { ...ok, believability: 'likely-ai' },
      { directedWords: ['sale'], expectPerson: false }
    );
    expect(r).toEqual({ pass: true, reasons: [] });
  });

  it('empty directedWords never triggers missing_directed_text', () => {
    const r = judgeGate(
      { renderedText: [], hasCaptions: false, believability: 'real-human' },
      { directedWords: [], expectPerson: false }
    );
    expect(r.pass).toBe(true);
  });

  it('collects multiple failure reasons at once', () => {
    const r = judgeGate(
      { renderedText: ['NOPE'], hasCaptions: true, believability: 'likely-ai' },
      { directedWords: ['SALE'], expectPerson: true }
    );
    expect(r.pass).toBe(false);
    expect(r.reasons).toEqual(
      expect.arrayContaining(['missing_directed_text', 'invented_captions', 'believability'])
    );
  });
});

describe('looksBlocked — safety-filter classification', () => {
  it('matches the EXACT blocked-at-poll payload recorded from the live smoke (2026-07-06)', () => {
    // Verbatim upstream body: HTTP 400 on interactions GET after a
    // background:true create of a filter-tripping clip. This string is the
    // deterministic evidence for the poll.ts blocked-at-poll branch — the
    // live block itself is nondeterministic (same clip styled fine minutes
    // later), so the classification is pinned here instead.
    const live =
      '{"error":{"message":"Request blocked due to safety violations (harmful content). Please modify your input and retry.","code":""}}';
    expect(looksBlocked(live)).toBe(true);
  });

  it('does not classify ordinary upstream errors as blocks', () => {
    expect(looksBlocked('{"error":{"message":"Internal error encountered.","code":500}}')).toBe(false);
    expect(looksBlocked('')).toBe(false);
    expect(looksBlocked('RESOURCE_EXHAUSTED: quota exceeded for model')).toBe(false);
  });
});
