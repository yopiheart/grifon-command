import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { VoiceDomain } from '../../funnels/oceanides-price-page/dev/voice-lab/domain';
import { HARD_LIMITS, VoiceLedger } from '../../funnels/oceanides-price-page/dev/voice-lab/ledger';
import { SCENARIOS } from '../../funnels/oceanides-price-page/src/voice-lab/scenarios';
import type { LabSnapshot } from '../../funnels/oceanides-price-page/src/voice-lab/contracts';

function domain(scenarioId = 'natural-inquiry') {
  const scenario = SCENARIOS.find(item => item.id === scenarioId)!;
  const snapshot: LabSnapshot = {
    sessionId: 'test-session', mode: 'mock', phase: 'active', scenarioId,
    startedAt: 1_000, expiresAt: 181_000, scripted: true,
    requestStatus: 'collecting', details: structuredClone(scenario.initial), detailsConfirmed: false,
    dispatch: { version: 0, decision: 'pending', pricePhp: null, slot: '', conditions: '' },
    acceptedVersion: null, owner: 'Neil/Zam', nextStep: 'Verify the synthetic details.',
    transcript: [], toolLog: [], timings: [],
    budget: { attempts: 0, reservedUsd: 0, maxAttempts: 10, maxUsd: 5, reservationUsd: 0.5, liveReady: false, blockedReason: 'not_approved', specSha256: 'a'.repeat(64) },
  };
  return new VoiceDomain(snapshot, () => 1_000);
}

function pendingRequest(value: VoiceDomain) {
  expect(value.confirmDetails(true).ok).toBe(true);
  expect(value.requestService().ok).toBe(true);
}

describe('Oceanides voice lab: promises and customer intent', () => {
  it('keeps the NCR price per truckload and refuses a provincial quote', () => {
    const value = domain();
    const rate = value.lookupRate('Parañaque');
    expect(rate).toMatchObject({ ok: true, eligible: true, finalTotalRequiresDispatch: true });
    expect(JSON.stringify(rate)).toContain('5,000');
    expect(JSON.stringify(rate)).toContain('truckload');
    expect(JSON.stringify(rate)).toContain('4,000');
    expect(value.lookupRate('Antipolo')).toMatchObject({ ok: false, eligible: false });
  });

  it('requires detail readback before submitting and dispatch approval before accepting', () => {
    const value = domain();
    expect(value.requestService().ok).toBe(false);
    expect(value.customerAccept(0, true).ok).toBe(false);
    expect(value.confirmDetails(false).ok).toBe(false);
    pendingRequest(value);
    expect(value.state.requestStatus).toBe('awaiting_dispatch');
    expect(value.customerAccept(0, true).ok).toBe(false);
  });

  it('requires explicit acceptance of the approved quote version', () => {
    const value = domain();
    pendingRequest(value);
    expect(value.dispatch({ decision: 'approved', pricePhp: 5000, slot: 'TEST: tomorrow AM' }).ok).toBe(true);
    const version = value.state.dispatch.version;
    expect(value.customerAccept(version).ok).toBe(false);
    expect(value.customerAccept(version, false).ok).toBe(false);
    expect(value.customerAccept(version - 1, true).ok).toBe(false);
    expect(value.customerAccept(version, true).ok).toBe(true);
    expect(value.state.requestStatus).toBe('booked');
  });

  it.each([
    { pricePhp: 10000, slot: 'TEST: tomorrow AM' },
    { pricePhp: 5000, slot: 'TEST: next afternoon' },
  ])('invalidates customer acceptance when price or slot changes: %j', quote => {
    const value = domain();
    pendingRequest(value);
    value.dispatch({ decision: 'approved', pricePhp: 5000, slot: 'TEST: tomorrow AM' });
    const oldVersion = value.state.dispatch.version;
    value.customerAccept(oldVersion, true);
    value.dispatch({ decision: 'approved', ...quote });
    expect(value.state.requestStatus).toBe('dispatch_approved');
    expect(value.state.acceptedVersion).toBeNull();
    expect(value.customerAccept(oldVersion, true).ok).toBe(false);
  });

  it('invalidates confirmation and booking after an address correction', () => {
    const value = domain();
    pendingRequest(value);
    value.dispatch({ decision: 'approved', pricePhp: 5000, slot: 'TEST: tomorrow AM' });
    value.customerAccept(value.state.dispatch.version, true);
    value.updateDetails({ city: 'Pasig', address: '999 TEST Revised Street, Pasig' });
    expect(value.state).toMatchObject({ requestStatus: 'collecting', detailsConfirmed: false, acceptedVersion: null });
    expect(value.state.dispatch.decision).toBe('pending');
    expect(value.requestService().ok).toBe(false);
    expect(value.state.details.address).toContain('999 TEST');
  });

  it('rejects incomplete final quotes and preserves pending dispatch ownership', () => {
    const value = domain();
    pendingRequest(value);
    expect(value.dispatch({ decision: 'approved', pricePhp: 0, slot: 'TEST slot' }).ok).toBe(false);
    expect(value.dispatch({ decision: 'approved', pricePhp: 5000, slot: '' }).ok).toBe(false);
    expect(value.state.requestStatus).toBe('awaiting_dispatch');
    expect(value.state.nextStep).toContain('Neil/Zam');
  });

  it('keeps rejected dispatch and a failed tool out of the booked state', () => {
    const value = domain();
    pendingRequest(value);
    value.dispatch({ decision: 'rejected' });
    expect(value.state.requestStatus).toBe('human_needed');
    expect(value.customerAccept(value.state.dispatch.version, true).ok).toBe(false);
    value.tool('fail_tool', {});
    expect(value.state.requestStatus).toBe('human_needed');
    expect(value.state.toolLog.at(-1)).toMatchObject({ ok: false });
    expect(value.state.nextStep).toContain('Neil/Zam');
    const failing = domain();
    failing.tool('fail_tool', {});
    expect(failing.state.requestStatus).toBe('failed');
  });

  it('stops selling after an explicit refusal', () => {
    const value = domain();
    value.scriptedTurn('No thanks');
    expect(value.state.requestStatus).toBe('declined');
    expect(value.requestService().ok).toBe(false);
    expect(value.updateDetails({ address: '999 Changed TEST Street' }).ok).toBe(false);
    expect(value.scriptedTurn('What is the price?').reply).not.toContain('5,000');
  });

  it('does not revive a refusal through failures, tools, or dispatch actions', () => {
    const value = domain();
    value.tool('decline', {});
    expect(value.tool('fail_tool', {}).ok).toBe(false);
    expect(value.state.requestStatus).toBe('declined');
    expect(value.tool('lookup_rate', { city: 'Pasig' }).ok).toBe(false);
    expect(value.tool('confirm_details', { confirmed: true }).ok).toBe(false);
    expect(value.tool('create_service_request', {}).ok).toBe(false);
    expect(value.dispatch({ decision: 'approved', pricePhp: 5000, slot: 'TEST slot' }).ok).toBe(false);
    expect(value.customerAccept(value.state.dispatch.version, true).ok).toBe(false);
    expect(value.state.requestStatus).toBe('declined');
  });

  it('preserves human handoff context when a later tool fails', () => {
    const value = domain();
    value.humanRequest('Caller needs a person to discuss access.');
    const nextStep = value.state.nextStep;
    value.tool('fail_tool', {});
    value.tool('confirm_details', { confirmed: true });
    value.tool('create_service_request', {});
    expect(value.state.requestStatus).toBe('human_needed');
    expect(value.state.nextStep).toBe(nextStep);
  });

  it('saves human ownership without claiming a transfer or ETA', () => {
    const value = domain('human-request');
    const result = value.humanRequest();
    expect(result).toMatchObject({ owner: 'Neil/Zam', transferred: false, eta: null });
    expect(value.state.requestStatus).toBe('human_needed');
    expect(value.state.details.contact).toContain('TEST');
    expect(value.state.nextStep).toMatch(/no transfer|no.*callback time/i);
  });

  it('routes outside-NCR rate and discount inquiries to human review', () => {
    for (const line of ['What is the rate?', 'That is expensive. Can you discount it?']) {
      const value = domain('outside-ncr');
      const result = value.scriptedTurn(line);
      expect(result.reply).not.toContain('5,000');
      expect(value.state.requestStatus).toBe('human_needed');
      expect(JSON.stringify(value.state.toolLog)).toContain('Neil/Zam');
    }
  });

  it('does not pretend that an unsupported mock utterance was understood', () => {
    const value = domain();
    expect(value.scriptedTurn('xyz unknown simulated utterance').reply).toMatch(/scripted mock/i);
    expect(value.state.requestStatus).toBe('collecting');
  });
});

const directories: string[] = [];
function ledgerDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'oceanides-voice-test-'));
  directories.push(directory);
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0)) {
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}oceanides-voice-test-`)) throw new Error('Unexpected test directory');
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Oceanides voice lab: persistent bounded reservations', () => {
  it('retains reservations across restart and specification changes', () => {
    const directory = ledgerDirectory();
    new VoiceLedger(directory).reserve('a'.repeat(64));
    const restarted = new VoiceLedger(directory);
    expect(restarted.summary()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
    restarted.reserve('b'.repeat(64));
    expect(new VoiceLedger(directory).summary()).toMatchObject({ attempts: 2, reservedUsd: 1 });
  });

  it('blocks the eleventh attempt, even through a new service instance', () => {
    const directory = ledgerDirectory();
    for (let i = 0; i < 10; i++) new VoiceLedger(directory).reserve('a'.repeat(64));
    expect(new VoiceLedger(directory).summary()).toMatchObject({ attempts: 10, reservedUsd: 5 });
    expect(() => new VoiceLedger(directory).reserve('b'.repeat(64))).toThrow('budget_exhausted');
  });

  it('cannot raise the hard budget through caller-supplied limits', () => {
    const value = new VoiceLedger(ledgerDirectory());
    expect(() => value.reserve('a'.repeat(64), 11, 5)).toThrow('invalid_budget_spec');
    expect(() => value.reserve('a'.repeat(64), 10, 6)).toThrow('invalid_budget_spec');
    expect(value.summary().attempts).toBe(0);
    expect(HARD_LIMITS.sessionMs).toBe(180_000);
  });

  it('enforces smaller approved allowances without silently topping them up', () => {
    const value = new VoiceLedger(ledgerDirectory());
    value.reserve('a'.repeat(64), 1, 0.5);
    expect(() => value.reserve('a'.repeat(64), 1, 0.5)).toThrow('budget_exhausted');
  });

  it('refuses a second simultaneous session across ledger instances', () => {
    const directory = ledgerDirectory();
    const release = new VoiceLedger(directory).acquireSession();
    try { expect(() => new VoiceLedger(directory).acquireSession()).toThrow('another_session_or_unresolved_lock'); }
    finally { release(); }
    const releaseAgain = new VoiceLedger(directory).acquireSession();
    releaseAgain();
  });

  it('fails closed on corrupted persisted reservations', () => {
    const directory = ledgerDirectory();
    const value = new VoiceLedger(directory);
    value.reserve('a'.repeat(64));
    const path = join(directory, 'budget.json');
    const stored = JSON.parse(readFileSync(path, 'utf8'));
    stored.reservations[0].usd = -100;
    writeFileSync(path, JSON.stringify(stored));
    expect(() => new VoiceLedger(directory).reserve('b'.repeat(64))).toThrow('budget_corrupt');
  });
});
