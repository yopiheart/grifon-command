import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const FIXTURE_USERS = new Set(['fixture-user-a', 'fixture-user-b']);
export const DEFAULT_FIXTURE_DB = path.join(root, '.tmp/companion-fixture-jobs/jobs.sqlite');
export const DEFAULT_STEP_MS = 1200;
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export class FixtureJobError extends Error {
  constructor(code, status, detail) { super(detail ?? code); this.code = code; this.status = status; }
}
export function fixturePath(value) {
  const resolved = path.resolve(root, value);
  const relative = path.relative(path.join(root, '.tmp'), resolved);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Fixture state must be a file under this checkout .tmp directory.');
  return resolved;
}
export function fixtureStepMs(value = DEFAULT_STEP_MS) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 25 || parsed > 60_000) throw new Error('Fixture step duration must be 25 to 60000 milliseconds.');
  return parsed;
}
// Reuse the installed Vite loader for extensionless TypeScript domain imports.
// This loader never starts an HTTP listener or loads the app config or .env.
export async function loadFixtureDomain() {
  const { createServer } = await import('vite');
  const loader = await createServer({ root, configFile: false, envFile: false, envDir: false, appType: 'custom', optimizeDeps: { noDiscovery: true, entries: [] }, server: { middlewareMode: true, hmr: false, ws: false, watch: null } });
  try {
    const [queue, protocol] = await Promise.all([
      loader.ssrLoadModule('/services/companionReferenceQueue.ts'),
      loader.ssrLoadModule('/services/companionFixtureJobs.ts'),
    ]);
    return { domain: { ...queue, ...protocol }, close: () => loader.close() };
  } catch (error) { await loader.close(); throw error; }
}
export function openFixtureJournal({ dbPath = DEFAULT_FIXTURE_DB, domain, stepMs = DEFAULT_STEP_MS, now = Date.now }) {
  const file = fixturePath(dbPath), duration = fixtureStepMs(stepMs);
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      request_id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, chat_id TEXT NOT NULL,
      intent_json TEXT NOT NULL, queue_json TEXT NOT NULL,
      revision INTEGER NOT NULL, updated_at INTEGER NOT NULL, next_due_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS events (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL,
      revision INTEGER NOT NULL, kind TEXT NOT NULL, occurred_at INTEGER NOT NULL,
      queue_json TEXT NOT NULL, UNIQUE (request_id, revision)
    );
    CREATE TABLE IF NOT EXISTS command_receipts (
      owner_id TEXT NOT NULL, command_id TEXT NOT NULL, payload_json TEXT NOT NULL,
      result_json TEXT NOT NULL, PRIMARY KEY (owner_id, command_id)
    );
  `);
  const find = db.prepare('SELECT * FROM jobs WHERE request_id = ?');
  function transaction(run) {
    db.exec('BEGIN IMMEDIATE');
    try { const result = run(); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  function snapshot(row) {
    if (!row) return null;
    const intent = JSON.parse(row.intent_json), queue = JSON.parse(row.queue_json);
    const value = { version: 1, fixture: true, intent, queue, updatedAt: row.updated_at, nextDueAt: row.next_due_at };
    if (!domain.isFixtureJobSnapshot(value, intent) || queue.revision !== row.revision) throw new FixtureJobError('CORRUPT_JOURNAL', 500);
    return value;
  }
  function save(intent, queue, kind) {
    if (!domain.isReferenceQueue(queue) || queue.actualCents !== 0 || !same(queue.plan, intent.plan) || queue.scenario !== intent.scenario) throw new FixtureJobError('INVALID_TRANSITION', 500);
    const updatedAt = now(), nextDueAt = queue.status === 'running' && !queue.invalidated ? updatedAt + duration : null;
    db.prepare(`INSERT INTO jobs VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(request_id) DO UPDATE SET queue_json = excluded.queue_json, revision = excluded.revision,
      updated_at = excluded.updated_at, next_due_at = excluded.next_due_at`).run(intent.requestId, intent.ownerId, intent.ownerChatId, JSON.stringify(intent), JSON.stringify(queue), queue.revision, updatedAt, nextDueAt);
    db.prepare('INSERT INTO events (request_id, revision, kind, occurred_at, queue_json) VALUES (?, ?, ?, ?, ?)').run(intent.requestId, queue.revision, kind, updatedAt, JSON.stringify(queue));
    return snapshot(find.get(intent.requestId));
  }
  async function validate(intent, ownerId) {
    if (!FIXTURE_USERS.has(ownerId) || intent?.ownerId !== ownerId) throw new FixtureJobError('FIXTURE_OWNER_REQUIRED', 403);
    if (!await domain.verifyFixtureJobIntent(intent)) throw new FixtureJobError('INVALID_INTENT', 400);
  }
  function requireSame(existing, intent) {
    if (!same(existing.intent, intent)) throw new FixtureJobError('INTENT_CONFLICT', 409);
  }
  return {
    dbPath: file,
    async start(intent, ownerId) {
      // Clone before the asynchronous hash check so callers cannot mutate a validated input.
      intent = JSON.parse(JSON.stringify(intent));
      await validate(intent, ownerId);
      return transaction(() => {
        const existing = snapshot(find.get(intent.requestId));
        if (existing) { requireSame(existing, intent); return existing; }
        const active = db.prepare('SELECT * FROM jobs WHERE owner_id = ? AND chat_id = ? AND next_due_at IS NOT NULL').get(ownerId, intent.ownerChatId);
        // Failed jobs also retain their retry authority until explicitly stopped.
        const failed = db.prepare('SELECT * FROM jobs WHERE owner_id = ? AND chat_id = ?').all(ownerId, intent.ownerChatId).some(row => {
          const value = snapshot(row); return !value.queue.invalidated && ['prepared', 'running', 'paused', 'failed'].includes(value.queue.status);
        });
        if (active || failed) throw new FixtureJobError('ACTIVE_JOB_CONFLICT', 409);
        const queue = domain.createReferenceQueue(intent.plan, intent.inputRevision, intent.scenario);
        return save(intent, domain.transitionReferenceQueue(queue, 'start', intent.plan, intent.inputRevision), 'start');
      });
    },
    get(requestId, ownerId, chatId) {
      if (!FIXTURE_USERS.has(ownerId)) throw new FixtureJobError('FIXTURE_OWNER_REQUIRED', 403);
      const row = find.get(requestId);
      return row?.owner_id === ownerId && row.chat_id === chatId ? snapshot(row) : null;
    },
    async command(command, ownerId) {
      command = JSON.parse(JSON.stringify(command));
      const { intent, action, expectedRevision, commandId } = command;
      await validate(intent, ownerId);
      if (!['retry', 'cancel', 'invalidate'].includes(action) || typeof commandId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(commandId)
        || (expectedRevision !== null && (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1)) || (action === 'retry' && expectedRevision === null)) throw new FixtureJobError('INVALID_COMMAND', 400);
      const payload = JSON.stringify(command);
      return transaction(() => {
        const receipt = db.prepare('SELECT * FROM command_receipts WHERE owner_id = ? AND command_id = ?').get(ownerId, commandId);
        if (receipt) {
          if (receipt.payload_json !== payload) throw new FixtureJobError('COMMAND_CONFLICT', 409);
          return JSON.parse(receipt.result_json);
        }
        const existing = snapshot(find.get(intent.requestId));
        if (existing) requireSame(existing, intent);
        if (expectedRevision !== null && expectedRevision !== existing?.queue.revision) throw new FixtureJobError('REVISION_CONFLICT', 409);
        if (!existing && action === 'retry') throw new FixtureJobError('JOB_NOT_FOUND', 404);
        let queue = existing?.queue ?? domain.createReferenceQueue(intent.plan, intent.inputRevision, intent.scenario);
        if (action === 'invalidate') {
          queue = domain.transitionReferenceQueue(queue, 'cancel', intent.plan, intent.inputRevision);
          queue = domain.invalidateReferenceQueue(queue);
        } else queue = domain.transitionReferenceQueue(queue, action, intent.plan, intent.inputRevision);
        if (action === 'retry' && queue === existing?.queue) throw new FixtureJobError('RETRY_NOT_AVAILABLE', 409);
        const result = existing && same(queue, existing.queue) ? existing : save(intent, queue, action);
        db.prepare('INSERT INTO command_receipts VALUES (?, ?, ?, ?)').run(ownerId, commandId, payload, JSON.stringify(result));
        return result;
      });
    },
    tickDue() {
      return transaction(() => {
        const row = db.prepare('SELECT * FROM jobs WHERE next_due_at <= ? ORDER BY next_due_at, request_id LIMIT 1').get(now());
        if (!row) return null;
        const current = snapshot(row);
        const queue = domain.transitionReferenceQueue(current.queue, 'tick', current.intent.plan, current.intent.inputRevision);
        if (queue === current.queue) throw new FixtureJobError('INVALID_DUE_JOB', 500);
        return save(current.intent, queue, 'tick');
      });
    },
    events(requestId) {
      return db.prepare('SELECT * FROM events WHERE request_id = ? ORDER BY sequence').all(requestId).map(row => ({ sequence: row.sequence, requestId: row.request_id, revision: row.revision, kind: row.kind, occurredAt: row.occurred_at, queue: JSON.parse(row.queue_json) }));
    },
    close() { db.close(); },
  };
}
