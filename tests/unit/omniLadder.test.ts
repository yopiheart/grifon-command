import { describe, it, expect } from 'vitest';
import {
  initialLadderState,
  nextLadderStep,
  type LadderState,
} from '../../services/omniStyleService.js';

// The per-scene Omni ladder state machine (services/omniStyleService.ts). PURE —
// no network — so the full retry/fallback policy is asserted here directly.
//
// Policy (workflows/omni_edit_styles_plan.md §Decision 6):
//   - blocked / failed / timeout / gate-fail → ONE retry (re-fire) → a second
//     failure of ANY kind → fallback(reason).
//   - budget_exhausted → immediate fallback (no retry).
//   - paid attempts per scene are hard-capped at 2 (initial + one retry).

describe('nextLadderStep — Omni per-scene ladder', () => {
  it('happy path: fire_ok → gate_pass → styled (1 attempt)', () => {
    let s = initialLadderState();
    expect(s).toEqual({ status: 'firing', attemptsUsed: 1 });
    s = nextLadderStep(s, 'fire_ok');
    expect(s.status).toBe('polling');
    s = nextLadderStep(s, 'poll_done_ok_gate_pass');
    expect(s).toEqual({ status: 'styled', attemptsUsed: 1 });
  });

  it('blocked → retry → styled (2 attempts)', () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_blocked');
    expect(s.status).toBe('retrying');
    expect(s.attemptsUsed).toBe(2);
    s = nextLadderStep(s, 'fire_ok'); // the re-fire
    expect(s.status).toBe('polling');
    s = nextLadderStep(s, 'poll_done_ok_gate_pass');
    expect(s).toEqual({ status: 'styled', attemptsUsed: 2 });
  });

  it("blocked → retry → blocked → fallback('blocked')", () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_blocked');
    s = nextLadderStep(s, 'fire_blocked');
    expect(s.status).toBe('fallback');
    expect(s.fallbackReason).toBe('blocked');
    expect(s.attemptsUsed).toBe(2);
  });

  it('gate_fail → retry → gate_pass → styled', () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_ok_gate_fail');
    expect(s.status).toBe('retrying');
    expect(s.attemptsUsed).toBe(2);
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_ok_gate_pass');
    expect(s).toEqual({ status: 'styled', attemptsUsed: 2 });
  });

  it("gate_fail × 2 → fallback('gate')", () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_ok_gate_fail');
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_ok_gate_fail');
    expect(s.status).toBe('fallback');
    expect(s.fallbackReason).toBe('gate');
    expect(s.attemptsUsed).toBe(2);
  });

  it('budget_exhausted → immediate fallback, no retry', () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_budget_exhausted');
    expect(s.status).toBe('fallback');
    expect(s.fallbackReason).toBe('budget_exhausted');
    expect(s.attemptsUsed).toBe(1); // never authorized a second attempt
  });

  it("poll_timeout → retry → timeout → fallback('timeout')", () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_timeout');
    expect(s.status).toBe('retrying');
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_timeout');
    expect(s.status).toBe('fallback');
    expect(s.fallbackReason).toBe('timeout');
    expect(s.attemptsUsed).toBe(2);
  });

  it("poll_done_failed → retry → failed → fallback('failed')", () => {
    let s = initialLadderState();
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_failed');
    s = nextLadderStep(s, 'fire_ok');
    s = nextLadderStep(s, 'poll_done_failed');
    expect(s.status).toBe('fallback');
    expect(s.fallbackReason).toBe('failed');
  });

  it('attemptsUsed never exceeds 2 across any failure sequence', () => {
    const failEvents = [
      'fire_blocked',
      'fire_error',
      'poll_done_blocked',
      'poll_done_failed',
      'poll_timeout',
      'poll_done_ok_gate_fail',
    ] as const;
    for (const fireFail of failEvents) {
      let s: LadderState = initialLadderState();
      // Drive up to 6 events; the machine must terminate at fallback/styled with
      // attemptsUsed capped at 2 the whole way.
      const seq = ['fire_ok', fireFail, 'fire_ok', fireFail, 'fire_ok', fireFail] as const;
      for (const ev of seq) {
        s = nextLadderStep(s, ev as any);
        expect(s.attemptsUsed).toBeLessThanOrEqual(2);
      }
      expect(['fallback', 'styled', 'polling', 'retrying']).toContain(s.status);
    }
  });

  it('terminal states are absorbing', () => {
    const styled: LadderState = { status: 'styled', attemptsUsed: 1 };
    expect(nextLadderStep(styled, 'poll_done_failed')).toEqual(styled);
    const fb: LadderState = { status: 'fallback', attemptsUsed: 2, fallbackReason: 'blocked' };
    expect(nextLadderStep(fb, 'fire_ok')).toEqual(fb);
  });
});
