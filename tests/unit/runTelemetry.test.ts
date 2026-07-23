import { describe, it, expect, beforeEach } from 'vitest';

// P2: runTelemetry is the client-side active-run singleton the Gemini proxy transport
// reads to stamp x-run-id. Set / get / clear round-trip.

import { setActiveRunId, getActiveRunId } from '../../services/runTelemetry.js';

beforeEach(() => {
  setActiveRunId(null);
});

describe('runTelemetry active-run singleton', () => {
  it('defaults to null', () => {
    expect(getActiveRunId()).toBeNull();
  });

  it('set then get returns the id', () => {
    setActiveRunId('apr_abc123');
    expect(getActiveRunId()).toBe('apr_abc123');
  });

  it('clears back to null', () => {
    setActiveRunId('apr_abc123');
    setActiveRunId(null);
    expect(getActiveRunId()).toBeNull();
  });

  it('overwrites a prior id', () => {
    setActiveRunId('apr_one');
    setActiveRunId('apr_two');
    expect(getActiveRunId()).toBe('apr_two');
  });
});
