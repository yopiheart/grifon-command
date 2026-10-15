import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import * as queueDomain from '../../services/companionReferenceQueue.js';
import * as fixtureDomain from '../../services/companionFixtureJobs.js';
import { openFixtureJournal } from '../../tools/reference-fixture-journal.mjs';
import { startRecoveryServer } from '../../tools/verify-recovery-server.mjs';

const children: ChildProcess[] = [], cleanup: (() => void | Promise<void>)[] = [];
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function waitUntil(predicate: () => boolean, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (!predicate()) { if (Date.now() > deadline) throw new Error('Fixture process condition timed out.'); await delay(20); }
}
async function hardStop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
}
async function worker(dbPath: string, stepMs: number) {
  const child = spawn(process.execPath, ['tools/reference-fixture-worker.mjs', '--jobs-db', dbPath, '--step-ms', String(stepMs), '--worker-status', path.join(path.dirname(dbPath), `${randomUUID()}-worker.json`)], { cwd: path.resolve('.'), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  children.push(child);
  let output = '';
  child.stdout?.on('data', data => { output += data; });
  child.stderr?.on('data', data => { output += data; });
  await waitUntil(() => {
    if (child.exitCode !== null) throw new Error(`Fixture worker exited: ${output}`);
    return output.includes('Fixture worker ready:');
  });
  return child;
}
function state(stepMs: number) {
  const directory = path.resolve('.tmp/companion-fixture-process-tests', randomUUID()); mkdirSync(directory, { recursive: true });
  const dbPath = path.join(directory, 'jobs.sqlite');
  const journal = openFixtureJournal({ dbPath, domain: { ...queueDomain, ...fixtureDomain }, stepMs });
  cleanup.push(() => journal.close()); return { directory, dbPath, journal };
}
async function job() {
  const hash = 'b'.repeat(64), review = createSampleReview(createReferenceDraft(), hash, 0);
  return fixtureDomain.createFixtureJobIntent('fixture-user-a', `chat-${randomUUID()}`, confirmSampleReview(review, hash, 0));
}
async function freePort() {
  const listener = net.createServer(); listener.listen(0, 'localhost'); await once(listener, 'listening');
  const port = (listener.address() as net.AddressInfo).port;
  await new Promise<void>((resolve, reject) => listener.close(error => error ? reject(error) : resolve())); return port;
}
async function rawStatus(url: string, headers: Record<string, string>) {
  return new Promise<number>((resolve, reject) => {
    http.get(url, { headers }, response => { response.on('end', () => resolve(response.statusCode!)); response.resume(); }).on('error', reject);
  });
}
async function fixtureRequest(stage: string, url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options), body = await response.text();
    return { status: response.status, headers: response.headers, json: async () => JSON.parse(body) };
  }
  catch (error) { throw new Error(`Fixture HTTP stage '${stage}' failed at ${url}`, { cause: error }); }
}
function listenerUrl(host: ReturnType<typeof startRecoveryServer> extends Promise<infer T> ? T : never, port: number) {
  const address = host.server.httpServer.address() as net.AddressInfo;
  expect(host.server.httpServer.listening).toBe(true);
  expect(address.port).toBe(port);
  expect(['::1', '127.0.0.1']).toContain(address.address);
  // Use the actual listening family; localhost's dual-stack fallback races Vite startup on Windows.
  return `http://${address.family === 'IPv6' ? `[${address.address}]` : address.address}:${port}`;
}
afterEach(async () => { for (const child of children.splice(0)) await hardStop(child); for (const close of cleanup.splice(0).reverse()) await close(); });

describe('independent fixture worker processes', () => {
  it('continues with no browser, stops unchanged after a hard crash, and resumes the same mid-step attempt', async () => {
    const { directory, dbPath, journal } = state(300), intent = await job();
    const original = await worker(dbPath, 300);
    await journal.start(intent, intent.ownerId);
    await waitUntil(() => journal.events(intent.requestId).length >= 2);
    await hardStop(original);
    const stopped = journal.get(intent.requestId, intent.ownerId, intent.ownerChatId), stoppedEvents = journal.events(intent.requestId);
    expect(stopped?.queue.status).toBe('running');
    expect(stopped?.queue.steps.some(step => step.status === 'succeeded')).toBe(true);
    await delay(650);
    expect(journal.get(intent.requestId, intent.ownerId, intent.ownerChatId)).toEqual(stopped);
    expect(journal.events(intent.requestId)).toEqual(stoppedEvents);
    const restartAt = Date.now(), restarted = await worker(dbPath, 300);
    await waitUntil(() => journal.get(intent.requestId, intent.ownerId, intent.ownerChatId)?.queue.status === 'complete');
    const result = journal.get(intent.requestId, intent.ownerId, intent.ownerChatId), events = journal.events(intent.requestId);
    expect(restarted.pid).not.toBe(original.pid);
    expect(events.map(event => event.revision)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(events.filter(event => event.kind === 'start')).toHaveLength(1);
    expect(result?.queue.steps.map(step => step.attempts)).toEqual([1, 1, 1, 1, 1, 1, 1, 1]);
    expect(result?.queue.actualCents).toBe(0);
    expect(events.slice(stoppedEvents.length).every(event => event.occurredAt >= restartAt)).toBe(true);
    const resumedEvents = events.slice(stoppedEvents.length);
    for (let index = 1; index < resumedEvents.length; index++) expect(resumedEvents[index].occurredAt - resumedEvents[index - 1].occurredAt).toBeGreaterThanOrEqual(300);
    writeFileSync(path.join(directory, 'restart-evidence.json'), JSON.stringify({ fixture: true, browserCreated: false, originalPid: original.pid, restartedPid: restarted.pid, restartAt, stopped, stoppedEvents, result, events }, null, 2));
  }, 30_000);

  it('lets two processes share due work without duplicate submissions, transitions, or attempts', async () => {
    const { directory, dbPath, journal } = state(100), intent = await job();
    const processes = await Promise.all([worker(dbPath, 100), worker(dbPath, 100)]);
    await journal.start(intent, intent.ownerId);
    await waitUntil(() => journal.get(intent.requestId, intent.ownerId, intent.ownerChatId)?.queue.status === 'complete');
    const events = journal.events(intent.requestId), result = journal.get(intent.requestId, intent.ownerId, intent.ownerChatId);
    expect(events.map(event => event.revision)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result?.queue.steps.every(step => step.attempts === 1 && step.status === 'succeeded')).toBe(true);
    for (let index = 1; index < events.length; index++) expect(events[index].occurredAt - events[index - 1].occurredAt).toBeGreaterThanOrEqual(100);
    writeFileSync(path.join(directory, 'concurrent-evidence.json'), JSON.stringify({ fixture: true, pids: processes.map(process => process.pid), events, result }, null, 2));
  }, 30_000);

  it('exposes only opt-in local fixture routes with bounded JSON and read-only status', async () => {
    const { dbPath } = state(60_000), intent = await job(), port = await freePort();
    const host = await startRecoveryServer({ referenceJobs: true, port, dbPath, stepMs: 60_000 }); cleanup.push(() => host.close());
    const base = listenerUrl(host, port), prefix = `${base}/__companion-fixture-jobs`;
    const headers = { 'x-grifon-fixture-user': intent.ownerId, 'content-type': 'application/json' };
    const start = () => fixtureRequest('start', `${prefix}/start`, { method: 'POST', headers, body: JSON.stringify({ intent }) });
    const first = await start(); expect(first.status).toBe(200); const snapshot = await first.json();
    expect(first.headers.get('cache-control')).toBe('no-store');
    const duplicates = await Promise.all([start(), start()]);
    for (const response of duplicates) { expect(response.status).toBe(200); expect(await response.json()).toEqual(snapshot); }
    const statusPath = `${prefix}/job?requestId=${intent.requestId}&chatId=${intent.ownerChatId}`;
    expect(await (await fixtureRequest('status one', statusPath, { headers })).json()).toEqual(snapshot);
    expect(await (await fixtureRequest('status two', statusPath, { headers })).json()).toEqual(snapshot);
    expect((await fixtureRequest('other owner', statusPath, { headers: { ...headers, 'x-grifon-fixture-user': 'fixture-user-b' } })).status).toBe(404);
    expect((await fixtureRequest('other chat', statusPath.replace(intent.ownerChatId, 'wrong-chat'), { headers })).status).toBe(404);
    expect((await fixtureRequest('real user', statusPath, { headers: { ...headers, 'x-grifon-fixture-user': 'real-user' } })).status).toBe(403);
    expect((await fixtureRequest('hostile origin', statusPath, { headers: { ...headers, origin: 'https://example.com' } })).status).toBe(403);
    expect(await rawStatus(statusPath, { ...headers, host: 'untrusted.example' })).toBe(403);
    expect((await fixtureRequest('malformed JSON', `${prefix}/start`, { method: 'POST', headers, body: '{' })).status).toBe(400);
    expect((await fixtureRequest('wrong content type', `${prefix}/start`, { method: 'POST', headers: { ...headers, 'content-type': 'text/plain' }, body: '{}' })).status).toBe(415);
    expect((await fixtureRequest('oversized JSON', `${prefix}/start`, { method: 'POST', headers, body: 'x'.repeat(262_145) })).status).toBe(413);
    expect((await fixtureRequest('blocked API', `${base}/api/gemini/generate`, { method: 'POST' })).status).toBe(503);
    expect((await fixtureRequest('blocked journal', `${base}/${path.relative(path.resolve('.'), dbPath).replaceAll('\\', '/')}`)).status).toBe(403);
    expect(host.journal.events(intent.requestId)).toHaveLength(1);
    const disabledPort = await freePort(), disabled = await startRecoveryServer({ port: disabledPort }); cleanup.push(() => disabled.close());
    const disabledBase = listenerUrl(disabled, disabledPort);
    expect(disabled.worker).toBeUndefined(); expect(disabled.journal).toBeUndefined();
    expect((await fixtureRequest('disabled fixture route', `${disabledBase}/__companion-fixture-jobs/job`, { headers })).status).toBe(404);
    expect((await fixtureRequest('disabled blocked API', `${disabledBase}/api/gemini/generate`, { method: 'POST' })).status).toBe(503);
    expect((await fixtureRequest('disabled blocked journal', `${disabledBase}/${path.relative(path.resolve('.'), dbPath).replaceAll('\\', '/')}`)).status).toBe(403);
  }, 30_000);
});
