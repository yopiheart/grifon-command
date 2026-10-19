import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export const HARD_LIMITS = Object.freeze({ maxAttempts: 12, maxUsd: 6, reservationUsd: 0.5, sessionMs: 180_000, maxTextInputs: 20 });
interface LedgerData { version: 1; reservations: Array<{ id: string; at: number; usd: number; specSha256: string }> }

export class VoiceLedger {
  private readonly ledgerPath: string;
  constructor(public readonly directory: string, private readonly now = Date.now) {
    mkdirSync(directory, { recursive: true });
    this.ledgerPath = join(directory, 'budget.json');
  }

  private lock(name: string) {
    const path = join(this.directory, name);
    const id = randomUUID();
    let fd: number;
    try { fd = openSync(path, 'wx', 0o600); }
    catch { throw new Error(name === 'active.lock' ? 'another_session_or_unresolved_lock' : 'budget_locked'); }
    try { writeFileSync(fd, JSON.stringify({ pid: process.pid, id, at: this.now() })); fsyncSync(fd); }
    catch { closeSync(fd); unlinkSync(path); throw new Error('lock_write_failed'); }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      closeSync(fd);
      // Never remove another process's replacement lock.
      try { if (JSON.parse(readFileSync(path, 'utf8')).id === id) unlinkSync(path); } catch { /* Fail closed if the lock cannot be released. */ }
    };
  }

  acquireSession() { return this.lock('active.lock'); }

  private read(): LedgerData {
    if (!existsSync(this.ledgerPath)) return { version: 1, reservations: [] };
    let value: LedgerData;
    try { value = JSON.parse(readFileSync(this.ledgerPath, 'utf8')) as LedgerData; } catch { throw new Error('budget_corrupt'); }
    if (value.version !== 1 || !Array.isArray(value.reservations) || value.reservations.some(r => typeof r.id !== 'string' || !Number.isFinite(r.at) || r.usd !== HARD_LIMITS.reservationUsd || !/^[a-f0-9]{64}$/.test(r.specSha256))) throw new Error('budget_corrupt');
    return value;
  }

  summary() {
    const data = this.read();
    return { attempts: data.reservations.length, reservedUsd: data.reservations.reduce((sum, r) => sum + r.usd, 0), ...HARD_LIMITS };
  }

  reserve(specSha256: string, maxAttempts: number = HARD_LIMITS.maxAttempts, maxUsd: number = HARD_LIMITS.maxUsd) {
    if (!/^[a-f0-9]{64}$/.test(specSha256) || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > HARD_LIMITS.maxAttempts || !Number.isFinite(maxUsd) || maxUsd <= 0 || maxUsd > HARD_LIMITS.maxUsd) throw new Error('invalid_budget_spec');
    const release = this.lock('budget.lock');
    try {
      const data = this.read();
      const reserved = data.reservations.reduce((sum, r) => sum + r.usd, 0);
      if (data.reservations.length >= maxAttempts || reserved + HARD_LIMITS.reservationUsd > maxUsd) throw new Error('budget_exhausted');
      const reservation = { id: randomUUID(), at: this.now(), usd: HARD_LIMITS.reservationUsd, specSha256 };
      data.reservations.push(reservation);
      const temporary = `${this.ledgerPath}.${randomUUID()}.tmp`;
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, JSON.stringify(data, null, 2)); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.ledgerPath);
      return reservation;
    } finally { release(); }
  }
}
