import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';
import type { ClientEvent } from '../../src/voice-lab/contracts';
import { VOICE_LAB_PROTOCOL } from '../../src/voice-lab/contracts';
import { VoiceLabService, type VoiceLabOptions } from './service';

const HOST = '127.0.0.1:5184';
const ORIGIN = `http://${HOST}`;
const json = (response: ServerResponse, status: number, value: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
};
export const isLocalRequest = (request: Pick<IncomingMessage, 'headers' | 'socket'>, requireOrigin = false) => request.headers.host === HOST && (!request.headers.origin ? !requireOrigin : request.headers.origin === ORIGIN) && ['127.0.0.1', '::ffff:127.0.0.1', '::1'].includes(request.socket.remoteAddress ?? '');

async function body(request: IncomingMessage) {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 2048) throw new Error('body_too_large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

export function voiceLabPlugin(options?: VoiceLabOptions): Plugin {
  let service: VoiceLabService | undefined;
  return {
    name: 'local-oceanides-voice-lab',
    apply: 'serve',
    configureServer(server) {
      service = new VoiceLabService(options ?? { ledgerDirectory: fileURLToPath(new URL('../../../../.tmp/oceanides-voice-lab/', import.meta.url)), specPath: fileURLToPath(new URL('./paid-test-spec.DRAFT.json', import.meta.url)) });
      const lab = service;
      const wsServer = new WebSocketServer({ noServer: true, maxPayload: 80_000 });
      server.middlewares.use(async (request, response, next) => {
        if (!isLocalRequest(request)) return json(response, 403, { error: 'local_origin_required' });
        const pathname = new URL(request.url ?? '/', ORIGIN).pathname;
        if (pathname === '/') request.url = '/voice-lab.html';
        if (pathname.endsWith('.html') && pathname !== '/voice-lab.html') return json(response, 404, { error: 'not_found' });
        if (!pathname.startsWith('/api/')) return next();
        try {
          if (pathname === '/api/voice-lab/status' && request.method === 'GET') return json(response, 200, lab.status());
          if (pathname === '/api/voice-lab/check-provider' && request.method === 'POST') {
            if (!isLocalRequest(request, true) || !request.headers['content-type']?.startsWith('application/json')) return json(response, 403, { error: 'same_origin_json_required' });
            const value = await body(request);
            if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 0) return json(response, 400, { error: 'empty_object_required' });
            return json(response, 200, await lab.checkProvider());
          }
          if (pathname === '/api/voice-lab/session/cancel' && request.method === 'POST') {
            if (!isLocalRequest(request, true) || !request.headers['content-type']?.startsWith('application/json')) return json(response, 403, { error: 'same_origin_json_required' });
            const value = await body(request);
            if (!value || typeof value.token !== 'string' || !/^[a-f0-9]{64}$/.test(value.token) || Object.keys(value).length !== 1) return json(response, 400, { error: 'invalid_cancel_input' });
            return json(response, 200, { canceled: lab.cancelPreparing(value.token) });
          }
          if (pathname === '/api/voice-lab/session' && request.method === 'POST') {
            if (!isLocalRequest(request, true) || !request.headers['content-type']?.startsWith('application/json')) return json(response, 403, { error: 'same_origin_json_required' });
            const value = await body(request);
            if (!value || value.protocolVersion !== VOICE_LAB_PROTOCOL) return json(response, 409, { error: 'client_reload_required' });
            if (typeof value !== 'object' || Array.isArray(value) || typeof value.scenarioId !== 'string' || !['mock', 'live'].includes(String(value.mode)) || Object.keys(value).some(key => !['scenarioId', 'mode', 'protocolVersion'].includes(key))) return json(response, 400, { error: 'invalid_session_input' });
            return json(response, 201, lab.createSession(value.scenarioId, value.mode as 'mock' | 'live'));
          }
          return json(response, 404, { error: 'not_found' });
        } catch (error) {
          const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'request_failed';
          return json(response, code.includes('active') || code.includes('lock') ? 409 : 400, { error: code });
        }
      });
      server.httpServer?.on('upgrade', (request, socket, head) => {
        const url = new URL(request.url ?? '/', ORIGIN);
        if (url.pathname !== '/voice-lab/ws') return;
        if (!isLocalRequest(request, true) || !/^[a-f0-9]{64}$/.test(url.searchParams.get('token') ?? '')) { socket.write('HTTP/1.1 403 Forbidden\r\n\r\n'); socket.destroy(); return; }
        wsServer.handleUpgrade(request, socket, head, client => {
          let sessionId = '';
          try {
            sessionId = lab.attach(url.searchParams.get('token')!, event => { if (client.readyState === 1) client.send(JSON.stringify(event)); }, () => client.close());
          } catch { client.close(1008, 'Invalid or expired session'); return; }
          client.on('message', (raw, binary) => {
            if (binary) { client.close(1008, 'JSON events required'); return; }
            try { lab.receive(sessionId, JSON.parse(raw.toString('utf8')) as ClientEvent); }
            catch { client.send(JSON.stringify({ type: 'error', code: 'invalid_json', message: 'Invalid JSON event.' })); }
          });
          client.on('error', () => lab.stop(sessionId, 'browser_connection_failed'));
          client.on('close', () => lab.stop(sessionId, 'browser_disconnected'));
        });
      });
      server.httpServer?.once('close', () => { lab.dispose(); wsServer.close(); });
      server.watcher.once('close', () => lab.dispose());
    },
    closeBundle() { service?.dispose(); },
  };
}
