import { afterEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { voiceLabPlugin } from '../../funnels/oceanides-price-page/dev/voice-lab/plugin.js';
import { VoiceLedger } from '../../funnels/oceanides-price-page/dev/voice-lab/ledger.js';

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true }); });

describe('Voice lab stale browser protection (no listening server or provider)', () => {
  it.each([undefined, 'old-client'])('rejects protocol %s before any session, lock or provider can be created', async protocolVersion => {
    const directory = mkdtempSync(join(tmpdir(), 'oceanides-protocol-'));
    directories.push(directory);
    const opener = vi.fn();
    const plugin = voiceLabPlugin({ ledgerDirectory: directory, specPath: fileURLToPath(new URL('../../funnels/oceanides-price-page/dev/voice-lab/paid-test-spec.DRAFT.json', import.meta.url)), env: {}, openProvider: opener });
    let middleware!: (request: IncomingMessage, response: ServerResponse, next: () => void) => Promise<unknown>;
    const httpServer = new EventEmitter();
    const watcher = new EventEmitter();
    (plugin.configureServer as (server: unknown) => void)({ middlewares: { use(handler: typeof middleware) { middleware = handler; } }, httpServer, watcher });
    const req = Object.assign(Readable.from([JSON.stringify({ scenarioId: 'natural-inquiry', mode: 'mock', protocolVersion })]), { url: '/api/voice-lab/session', method: 'POST', headers: { host: '127.0.0.1:5184', origin: 'http://127.0.0.1:5184', 'content-type': 'application/json' }, socket: { remoteAddress: '127.0.0.1' } });
    let status = 0;
    let payload = '';
    const response = { writeHead(code: number) { status = code; }, end(value: string) { payload = value; } };
    try {
      await middleware(req as unknown as IncomingMessage, response as unknown as ServerResponse, () => {});
      expect(status).toBe(409);
      expect(JSON.parse(payload)).toEqual({ error: 'client_reload_required' });
      expect(new VoiceLedger(directory).summary()).toMatchObject({ attempts: 0, reservedUsd: 0 });
      expect(existsSync(join(directory, 'active.lock'))).toBe(false);
      expect(opener).not.toHaveBeenCalled();
    } finally { httpServer.emit('close'); watcher.emit('close'); }
  });
});
