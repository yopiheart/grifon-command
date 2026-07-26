import { describe, it, expect } from 'vitest';
import {
  parseImageGateResponse,
  extractJsonObject,
  judgeImageGate,
  gateImage,
  type ImageGateObservations,
} from '../../api/_lib/imageGate.js';

// The scene-image QA gate (api/_lib/imageGate.ts) — EVAL infra, an omniGate clone for
// stills. Only the PURE pieces are tested here (parse + judge) plus the fail-open wrapper
// contract (gateImage with no API key throws inside runImageGate → fails open). runImageGate's
// happy-path vision call is a network op covered by its documented contract, not a live test.

const OK: ImageGateObservations = {
  personPresent: true,
  personMatchesReference: true,
  productLabelText: null,
  labelLegible: null,
  compositionNotes: 'centered medium shot',
};

describe('parseImageGateResponse', () => {
  it('parses a fenced JSON block', () => {
    const raw =
      '```json\n{"personPresent":true,"personMatchesReference":true,"productLabelText":"GRIFON","labelLegible":true,"compositionNotes":"tight"}\n```';
    expect(parseImageGateResponse(raw)).toEqual({
      personPresent: true,
      personMatchesReference: true,
      productLabelText: 'GRIFON',
      labelLegible: true,
      compositionNotes: 'tight',
    });
  });

  it('coerces malformed field types defensively (never over-flags)', () => {
    const raw =
      '{"personPresent":"true","personMatchesReference":"yes","productLabelText":"","labelLegible":"nope","compositionNotes":42}';
    expect(parseImageGateResponse(raw)).toEqual({
      personPresent: false, // non-true → false
      personMatchesReference: null, // non-boolean → null (unverifiable)
      productLabelText: null, // empty string → null
      labelLegible: null, // non-boolean → null
      compositionNotes: '', // non-string → ''
    });
  });

  it('returns null on garbage (caller fails open)', () => {
    expect(parseImageGateResponse('no json here')).toBeNull();
    expect(parseImageGateResponse('')).toBeNull();
    expect(parseImageGateResponse('}{')).toBeNull();
  });
});

// The four framing malformations that actually caused the 23% fail-open rate, captured
// VERBATIM on 2026-07-26 by replaying the stills of run apr_876ef559 through the live
// gate (39 calls, 9 failures). Every one arrived on finishReason STOP with correct,
// complete observations — the verdict was sound and we threw it away over punctuation.
// These strings are the independent source of truth: they are recordings, not constructions.
describe('parseImageGateResponse — real malformed framing from production stills', () => {
  const BODY =
    '{\n  "personPresent": false,\n  "personMatchesReference": null,\n' +
    '  "productLabelText": "HIRAYA GLOW",\n  "labelLegible": true,\n' +
    '  "compositionNotes": "Centered close-up of a dropper bottle on a counter"';
  const EXPECTED = {
    personPresent: false,
    personMatchesReference: null,
    productLabelText: 'HIRAYA GLOW',
    labelLegible: true,
    compositionNotes: 'Centered close-up of a dropper bottle on a counter',
  };

  it('recovers a response with NO closing brace', () => {
    expect(parseImageGateResponse(BODY)).toEqual(EXPECTED);
  });

  it('recovers a response with one surplus brace', () => {
    expect(parseImageGateResponse(`${BODY}\n}\n}`)).toEqual(EXPECTED);
  });

  it('recovers a response with five surplus braces', () => {
    expect(parseImageGateResponse(`${BODY}\n}\n}\n}\n}\n}\n}\n`)).toEqual(EXPECTED);
  });

  it('recovers a response with a stray quote before the close', () => {
    expect(parseImageGateResponse(`${BODY}\n"\n}`)).toEqual(EXPECTED);
  });

  it('still parses the well-formed response identically (no repair path taken)', () => {
    expect(parseImageGateResponse(`${BODY}\n}`)).toEqual(EXPECTED);
  });
});

describe('extractJsonObject', () => {
  it('stops at the real close and ignores trailing prose', () => {
    expect(extractJsonObject('{"a":1} and then some commentary')).toBe('{"a":1}');
  });

  it('never miscounts a brace INSIDE a string (the lastIndexOf bug)', () => {
    // lastIndexOf('}') would have cut after the brace in the VALUE, truncating the object.
    const s = '{"notes":"a } inside text","b":2}';
    expect(extractJsonObject(s)).toBe(s);
  });

  it('is not fooled by an ESCAPED quote when tracking string state', () => {
    const s = '{"notes":"she said \\"hi\\" loudly","b":2}';
    expect(extractJsonObject(s)).toBe(s);
    expect(JSON.parse(extractJsonObject(s)!).b).toBe(2);
  });

  it('drops a dangling comma when closing a truncated object', () => {
    expect(extractJsonObject('{"a":1,')).toBe('{"a":1}');
  });

  it('returns null when there is nothing to repair', () => {
    expect(extractJsonObject('no braces at all')).toBeNull();
    expect(extractJsonObject('}{')).toBeNull();
  });
});

describe('judgeImageGate — identity (rank 1)', () => {
  it('flags identity_drift when an identity scene shows NO person', () => {
    const r = judgeImageGate({ ...OK, personPresent: false }, { referenceMode: 'avatar' });
    expect(r.pass).toBe(false);
    expect(r.flags).toContain('identity_drift');
  });

  it('flags identity_drift when the person clearly is NOT the reference', () => {
    const r = judgeImageGate({ ...OK, personMatchesReference: false }, { referenceMode: 'both' });
    expect(r.pass).toBe(false);
    expect(r.flags).toEqual(['identity_drift']);
  });

  it('does NOT flag when match is null (unverifiable — conservative)', () => {
    const r = judgeImageGate({ ...OK, personMatchesReference: null }, { referenceMode: 'avatar_venue' });
    expect(r.pass).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it('ignores identity entirely for a non-identity mode (b-roll / product-only)', () => {
    const r = judgeImageGate({ ...OK, personPresent: false, personMatchesReference: false }, { referenceMode: 'product' });
    expect(r.flags).not.toContain('identity_drift');
  });
});

describe('judgeImageGate — product label (rank 2)', () => {
  it('flags garbled_label when the label is explicitly illegible', () => {
    const r = judgeImageGate({ ...OK, labelLegible: false }, { referenceMode: 'product', expectedLabelText: 'Grifon Brew' });
    expect(r.pass).toBe(false);
    expect(r.flags).toContain('garbled_label');
  });

  it('flags garbled_label on a CLEAR garble vs the expected name', () => {
    const r = judgeImageGate(
      { ...OK, productLabelText: 'XKZQWP', labelLegible: true },
      { referenceMode: 'product', expectedLabelText: 'GRIFON' }
    );
    expect(r.pass).toBe(false);
    expect(r.flags).toEqual(['garbled_label']);
  });

  it('does NOT flag a near-match (conservative — only clear garble flags)', () => {
    // 'GRIF0N' vs 'GRIFON' — one substitution, similarity 0.83 ≥ 0.5.
    const r = judgeImageGate(
      { ...OK, productLabelText: 'GRIF0N', labelLegible: true },
      { referenceMode: 'product', expectedLabelText: 'GRIFON' }
    );
    expect(r.pass).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it('does NOT flag when read text CONTAINS the expected name (substring)', () => {
    const r = judgeImageGate(
      { ...OK, productLabelText: 'GRIFON COFFEE CO', labelLegible: true },
      { referenceMode: 'product', expectedLabelText: 'GRIFON' }
    );
    expect(r.pass).toBe(true);
  });

  it('does NOT flag on a null read (product simply not framed) when legible is unknown', () => {
    const r = judgeImageGate(
      { ...OK, productLabelText: null, labelLegible: null },
      { referenceMode: 'product', expectedLabelText: 'GRIFON' }
    );
    expect(r.pass).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it('does not evaluate the label at all when no expectedLabelText is given', () => {
    const r = judgeImageGate({ ...OK, labelLegible: false }, { referenceMode: 'avatar' });
    expect(r.flags).not.toContain('garbled_label');
  });
});

describe('judgeImageGate — composition is LOG-ONLY (never flags)', () => {
  it('records compositionNotes but never adds a flag for it', () => {
    const r = judgeImageGate(
      { ...OK, compositionNotes: 'badly off-center, subject cropped at the edge' },
      { referenceMode: 'avatar' }
    );
    expect(r.pass).toBe(true);
    expect(r.flags).toEqual([]);
    expect(r.compositionNotes).toBe('badly off-center, subject cropped at the edge');
  });
});

describe('judgeImageGate — combined + clean pass', () => {
  it('collects both flags at once', () => {
    const r = judgeImageGate(
      { personPresent: false, personMatchesReference: false, productLabelText: 'ZZZZ', labelLegible: false, compositionNotes: 'x' },
      { referenceMode: 'both', expectedLabelText: 'GRIFON' }
    );
    expect(r.pass).toBe(false);
    expect(r.flags).toEqual(expect.arrayContaining(['identity_drift', 'garbled_label']));
  });

  it('passes a clean identity+label scene', () => {
    const r = judgeImageGate(
      { personPresent: true, personMatchesReference: true, productLabelText: 'GRIFON', labelLegible: true, compositionNotes: 'clean' },
      { referenceMode: 'both', expectedLabelText: 'GRIFON' }
    );
    expect(r).toEqual({ pass: true, flags: [], compositionNotes: 'clean' });
  });
});

describe('gateImage — fail-open wrapper (mirrors omniGate doctrine)', () => {
  it('returns pass:true reason gate_unavailable when the vision call cannot run (no API key)', async () => {
    const prev = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY; // getAi throws GEMINI_NOT_CONFIGURED → runImageGate throws → gateImage fails open
    try {
      const result = await gateImage({ imageBase64: 'data:image/png;base64,AAAA', referenceMode: 'avatar' });
      // The fail-open CONTRACT is unchanged — still pass:true, no flags, same reason.
      expect(result.observations).toBeNull();
      expect(result.verdict).toMatchObject({ pass: true, flags: [], reason: 'gate_unavailable' });
      // …and it now says WHY. Two live runs failed open on 22% then 37.5% of scenes with every
      // non-run looking identical; this field is what makes that rate explainable.
      expect(result.verdict.detail).toContain('GEMINI_NOT_CONFIGURED');
    } finally {
      if (prev !== undefined) process.env.GEMINI_API_KEY = prev;
    }
  });
});
