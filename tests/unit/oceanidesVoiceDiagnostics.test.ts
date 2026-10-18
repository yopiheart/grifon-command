import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { VoiceLabService } from '../../funnels/oceanides-price-page/dev/voice-lab/service';
import type { ServerEvent } from '../../funnels/oceanides-price-page/src/voice-lab/contracts';
import { checkProviderKey, credentialFormatPlausible } from '../../funnels/oceanides-price-page/dev/voice-lab/diagnostics';
import { voiceLabPlugin } from '../../funnels/oceanides-price-page/dev/voice-lab/plugin';
import type { ProviderSocket } from '../../funnels/oceanides-price-page/dev/voice-lab/realtime';

const specPath = fileURLToPath(new URL('../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json', import.meta.url));
const hash = createHash('sha256').update(readFileSync(specPath)).digest('hex');
const sentinel = 'xai-TEST-ONLY-PRIVATE-SENTINEL-NOT-A-REAL-CREDENTIAL';
const WsClient = createRequire(new URL('../../funnels/oceanides-price-page/package.json', import.meta.url))('ws') as { new (url: string, options: unknown): ProviderSocket & EventEmitter };
class FakeProvider extends EventEmitter {
  readyState = 0;
  closes = 0;
  sent: unknown[] = [];
  send(value: string) { this.sent.push(JSON.parse(value)); }
  close() { this.closes++; this.readyState = 3; }
}
const fixtures: Array<{ directory: string; service: VoiceLabService }> = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'oceanides-diagnostics-'));
  const provider = new FakeProvider();
  const events: ServerEvent[] = [];
  const opener = vi.fn(() => provider);
  const service = new VoiceLabService({ ledgerDirectory: directory, specPath, now: () => 1000, env: { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash, XAI_API_KEY: sentinel }, openProvider: opener });
  fixtures.push({ directory, service });
  const response = service.createSession('natural-inquiry', 'live');
  const token = new URL(response.wsPath, 'http://127.0.0.1:5184').searchParams.get('token')!;
  const id = service.attach(token, event => events.push(event));
  return { service, provider, events, opener, id };
}
const extraDirectories: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const value of fixtures.splice(0)) { value.service.dispose(); extraDirectories.push(value.directory); }
  for (const directory of extraDirectories.splice(0)) {
    if (!resolve(directory).startsWith(`${resolve(tmpdir())}${sep}oceanides-diagnostics-`)) throw new Error('Unexpected test cleanup directory');
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('Voice provider failure diagnostics (fake provider only)', () => {
  it.each([401, 403, 429, 500])('retains only HTTP status %i and terminates the rejected handshake once', statusCode => {
    const value = fixture();
    value.provider.emit('unexpected-response', { headers: { Authorization: sentinel } }, { statusCode, headers: { private: sentinel }, body: sentinel });
    const failures = value.events.filter(event => event.type === 'error');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ message: expect.stringContaining(`httpStatus=${statusCode}`) });
    expect(JSON.stringify(value.events)).not.toContain(sentinel);
    expect(value.provider.closes).toBe(1);
    expect(value.service.status().active).toBe(false);
    expect(value.opener).toHaveBeenCalledTimes(1);
    expect(value.service.budget()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
  });

  it.each([401, 403, 429, 500])('aborts a real ws handshake rejected by an owned loopback HTTP %i server', async statusCode => {
    const server = createServer((_request, response) => { response.writeHead(statusCode); response.end(sentinel); });
    await new Promise<void>(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Loopback fixture did not bind');
    const directory = mkdtempSync(join(tmpdir(), 'oceanides-diagnostics-'));
    const events: ServerEvent[] = [];
    let closed: Promise<void> = Promise.resolve();
    const opener = vi.fn(() => {
      const socket = new WsClient(`ws://127.0.0.1:${address.port}`, { headers: { Authorization: `Bearer ${sentinel}` }, handshakeTimeout: 1000 });
      closed = new Promise<void>(resolveClosed => socket.once('close', () => resolveClosed()));
      return socket;
    });
    const service = new VoiceLabService({ ledgerDirectory: directory, specPath, env: { OCEANIDES_VOICE_LIVE: '1', OCEANIDES_VOICE_APPROVED_SPEC_SHA256: hash, XAI_API_KEY: sentinel }, openProvider: opener });
    fixtures.push({ directory, service });
    try {
      const session = service.createSession('natural-inquiry', 'live');
      service.attach(new URL(session.wsPath, 'http://127.0.0.1:5184').searchParams.get('token')!, event => events.push(event));
      await closed;
      expect(events.filter(event => event.type === 'error')).toHaveLength(1);
      expect(events.filter(event => event.type === 'error')[0]).toMatchObject({ message: expect.stringContaining(`httpStatus=${statusCode}`) });
      expect(JSON.stringify(events)).not.toContain(sentinel);
      expect(service.status().active).toBe(false);
      expect(service.budget()).toMatchObject({ attempts: 1, reservedUsd: 0.5 });
      expect(opener).toHaveBeenCalledOnce();
    } finally { service.dispose(); await new Promise<void>(resolveClosed => server.close(() => resolveClosed())); }
  });

  it('keeps an allowlisted TLS code while dropping the hostile message and stack', () => {
    const value = fixture();
    value.provider.emit('error', Object.assign(new Error(sentinel), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', stack: sentinel }));
    expect(value.events.filter(event => event.type === 'error')[0]).toMatchObject({ message: expect.stringContaining('UNABLE_TO_VERIFY_LEAF_SIGNATURE') });
    expect(JSON.stringify(value.events)).not.toContain(sentinel);
  });

  it('does not report a provider failure after an intentional stop while connecting', () => {
    const value = fixture();
    value.service.stop(value.id);
    value.provider.emit('error', new Error(sentinel));
    value.provider.emit('close', 1006, Buffer.from(sentinel));
    expect(value.events.filter(event => event.type === 'error')).toHaveLength(0);
    expect(value.provider.closes).toBe(1);
  });

  it('keeps the first failure and projects close status without the private close reason', () => {
    const value = fixture();
    value.provider.readyState = 1;
    value.provider.emit('open');
    value.provider.emit('message', Buffer.from(JSON.stringify({ type: 'session.created' })));
    value.provider.emit('close', 1008, Buffer.from(sentinel));
    value.provider.emit('error', Object.assign(new Error(sentinel), { code: 'ECONNRESET' }));
    const failures = value.events.filter(event => event.type === 'error');
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ message: expect.stringContaining('closeCode=1008') });
    expect(value.service.status().providerFailure).toMatchObject({ phase: 'session_created', closeCode: 1008, transportCode: null });
    expect(JSON.stringify(value.service.status())).not.toContain(sentinel);
  });

  it('only displays allowlisted provider codes, never hostile provider error fields', () => {
    const value = fixture();
    value.provider.emit('message', Buffer.from(JSON.stringify({ type: 'error', error: { code: 'invalid_api_key', message: sentinel, body: sentinel, headers: { secret: sentinel } } })));
    expect(value.events.filter(event => event.type === 'error')[0]).toMatchObject({ message: expect.stringContaining('providerCode=invalid_api_key') });
    expect(JSON.stringify(value.events)).not.toContain(sentinel);
    const second = fixture();
    second.provider.emit('error', Object.assign(new Error(sentinel), { code: sentinel }));
    expect(JSON.stringify(second.events)).not.toContain(sentinel);
    expect(second.service.status().providerFailure?.transportCode).toBeNull();
  });
});

function checkFixture(fetcher: typeof fetch) {
  const directory = mkdtempSync(join(tmpdir(), 'oceanides-diagnostics-'));
  const opener = vi.fn(() => new FakeProvider());
  const service = new VoiceLabService({ ledgerDirectory: directory, specPath, env: { XAI_API_KEY: sentinel }, openProvider: opener, fetchProvider: fetcher });
  fixtures.push({ directory, service });
  return { directory, service, opener };
}

describe('Explicit free provider account check (injected fetch only)', () => {
  it.each(['plain-test-value', 'xai-', 'xai-contains space', 'xai-contains\tspace', '"xai-test"', "'xai-test'", 'xai-test"tail'])('rejects a malformed test credential without fetching: case %#', async key => {
    const fetcher = vi.fn();
    const result = await checkProviderKey(key, fetcher);
    expect(credentialFormatPlausible(key)).toBe(false);
    expect(result).toEqual({ httpStatus: null, transportCategory: 'invalid_credential_format', credentialFormatPlausible: false, keyBlocked: null, keyDisabled: null, teamBlocked: null, allModels: null, allEndpoints: null, pinnedModelAcl: null });
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(key);
  });

  it('accepts trimmed plausible shapes without imposing a fixed length or extra character set', () => {
    expect(credentialFormatPlausible(' xai-a ')).toBe(true);
    expect(credentialFormatPlausible('xai-TEST.+/=')).toBe(true);
    expect(credentialFormatPlausible(undefined)).toBe(false);
  });

  it.each([401, 403, 429, 500])('returns only HTTP %i without reading a failed response body', async status => {
    const response = new Response(sentinel, { status });
    const json = vi.spyOn(response, 'json');
    const text = vi.spyOn(response, 'text');
    const cancel = vi.spyOn(response.body!, 'cancel');
    const fetcher = vi.fn(async () => response);
    const value = checkFixture(fetcher);
    const result = await value.service.checkProvider();
    expect(result).toMatchObject({ httpStatus: status, keyBlocked: null, keyDisabled: null, teamBlocked: null, allModels: null, allEndpoints: null, pinnedModelAcl: null });
    expect(cancel).toHaveBeenCalledOnce();
    expect(json).not.toHaveBeenCalled();
    expect(text).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0][0]).toBe('https://api.x.ai/v1/api-key');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'GET', redirect: 'error' });
    expect(JSON.stringify(result)).not.toContain(sentinel);
    expect(JSON.stringify(value.service.status())).not.toContain(sentinel);
    expect(value.service.budget()).toMatchObject({ attempts: 0, reservedUsd: 0 });
    expect(value.opener).not.toHaveBeenCalled();
  });

  it('projects only approved booleans from a successful response containing identity and redacted-key canaries', async () => {
    const response = Response.json({ name: sentinel, redacted_api_key: sentinel, user_id: sentinel, team_id: sentinel, api_key_id: sentinel, api_key_blocked: false, api_key_disabled: true, team_blocked: false, acls: ['api-key:model:*', 'api-key:endpoint:*', sentinel] });
    const value = checkFixture(vi.fn(async () => response));
    expect(await value.service.checkProvider()).toEqual({ httpStatus: 200, transportCategory: null, credentialFormatPlausible: true, keyBlocked: false, keyDisabled: true, teamBlocked: false, allModels: true, allEndpoints: true, pinnedModelAcl: true });
    expect(JSON.stringify(value.service.status())).not.toContain(sentinel);
    expect(value.service.budget().attempts).toBe(0);
    expect(value.opener).not.toHaveBeenCalled();
  });

  it('returns null for missing flags and only recognizes the pinned model ACL', async () => {
    const result = await checkProviderKey(sentinel, vi.fn(async () => Response.json({ acls: ['api-key:model:grok-voice-3.0', sentinel] })));
    expect(result).toEqual({ httpStatus: 200, transportCategory: null, credentialFormatPlausible: true, keyBlocked: null, keyDisabled: null, teamBlocked: null, allModels: false, allEndpoints: false, pinnedModelAcl: true });
  });

  it('classifies TLS errors without their message, stack or private cause data', async () => {
    const value = checkFixture(vi.fn(async () => { throw Object.assign(new Error(sentinel), { cause: { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', message: sentinel }, stack: sentinel }); }));
    expect(await value.service.checkProvider()).toMatchObject({ httpStatus: null, transportCategory: 'tls' });
    expect(JSON.stringify(value.service.status())).not.toContain(sentinel);
    expect(value.service.budget().attempts).toBe(0);
  });

  it('coalesces concurrent explicit checks and never repeats them automatically', async () => {
    let release: (response: Response) => void = () => {};
    const fetcher = vi.fn(() => new Promise<Response>(resolveResponse => { release = resolveResponse; }));
    const value = checkFixture(fetcher);
    const first = value.service.checkProvider();
    const second = value.service.checkProvider();
    expect(first).toBe(second);
    release(Response.json({ api_key_blocked: false }));
    await Promise.all([first, second]);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(value.service.status().providerCheck?.keyBlocked).toBe(false);
  });

  it('bounds the whole operation including a stalled response body', async () => {
    vi.useFakeTimers();
    const response = new Response(new ReadableStream<Uint8Array>({ start() {} }), { status: 200 });
    const fetcher = vi.fn(async () => response);
    const result = checkProviderKey(sentinel, fetcher);
    await vi.advanceTimersByTimeAsync(8000);
    expect(await result).toMatchObject({ httpStatus: 200, transportCategory: 'timeout' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not perform a fetch when the server credential is absent', async () => {
    const fetcher = vi.fn();
    expect(await checkProviderKey(undefined, fetcher)).toMatchObject({ httpStatus: null, transportCategory: 'missing_credential', credentialFormatPlausible: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('Check-provider local HTTP gate (no listening server)', () => {
  it('requires exact loopback origin and an empty JSON object before any account fetch', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'oceanides-diagnostics-'));
    extraDirectories.push(directory);
    const fetcher = vi.fn(async () => Response.json({ api_key_blocked: false }));
    const plugin = voiceLabPlugin({ ledgerDirectory: directory, specPath, env: { XAI_API_KEY: sentinel }, fetchProvider: fetcher });
    let middleware: (request: IncomingMessage, response: ServerResponse, next: () => void) => Promise<unknown> = async () => {};
    const httpServer = new EventEmitter();
    const watcher = new EventEmitter();
    const configure = plugin.configureServer as (server: unknown) => void;
    configure({ middlewares: { use(handler: typeof middleware) { middleware = handler; } }, httpServer, watcher });
    async function request(raw: string, origin = 'http://127.0.0.1:5184', method = 'POST', host = '127.0.0.1:5184', remoteAddress = '127.0.0.1') {
      const req = Object.assign(Readable.from([Buffer.from(raw)]), { url: '/api/voice-lab/check-provider', method, headers: { host, origin, 'content-type': 'application/json' }, socket: { remoteAddress } });
      let status = 0;
      let payload = '';
      const res = { writeHead(code: number) { status = code; }, end(value: string) { payload = value; } };
      await middleware(req as unknown as IncomingMessage, res as unknown as ServerResponse, () => {});
      return { status, payload };
    }
    try {
      expect((await request('{}', 'https://hostile.example')).status).toBe(403);
      expect((await request('{}', 'http://127.0.0.1:5184', 'POST', 'localhost:5184')).status).toBe(403);
      expect((await request('{}', 'http://127.0.0.1:5184', 'POST', '127.0.0.1:5184', '192.0.2.10')).status).toBe(403);
      expect((await request('{"key":"not-accepted"}')).status).toBe(400);
      expect((await request('[]')).status).toBe(400);
      expect((await request('{}', 'http://127.0.0.1:5184', 'GET')).status).toBe(404);
      expect(fetcher).not.toHaveBeenCalled();
      const result = await request('{}');
      expect(result.status).toBe(200);
      expect(result.payload).not.toContain(sentinel);
      expect(fetcher).toHaveBeenCalledOnce();
    } finally { httpServer.emit('close'); watcher.emit('close'); }
  });
});
