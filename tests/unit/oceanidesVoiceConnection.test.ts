import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabConnection } from '../../funnels/oceanides-price-page/src/voice-lab/connection';

class SocketStub {
  static OPEN = 1;
  static CONNECTING = 0;
  static instances: SocketStub[] = [];
  readyState = 0;
  close = vi.fn(() => { this.readyState = 3; });
  send = vi.fn();
  onopen: (() => void) | null = null;
  onmessage: ((message: { data: string }) => void) | null = null;
  onclose: ((event: { reason: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: URL) { SocketStub.instances.push(this); }
}
function setup() {
  SocketStub.instances = [];
  vi.stubGlobal('window', { location: { href: 'http://127.0.0.1:5184/voice-lab.html', origin: 'http://127.0.0.1:5184', protocol: 'http:' } });
  vi.stubGlobal('WebSocket', SocketStub);
  const callbacks = { onSnapshot: vi.fn(), onEvent: vi.fn(), onOpen: vi.fn(), onClose: vi.fn() };
  return { connection: new LabConnection(callbacks), callbacks };
}
const session = { sessionId: 'test-session', wsPath: `/voice-lab/ws?token=${'a'.repeat(64)}`, state: {} };
const response = (body: unknown) => ({ ok: true, json: async () => body });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('Oceanides connection cancellation races (no network)', () => {
  it('cancels a pending REST reservation without ever creating a socket', async () => {
    const { connection, callbacks } = setup();
    let resolveResponse!: (value: unknown) => void;
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveResponse = resolve; })).mockResolvedValue(response({ canceled: true }));
    vi.stubGlobal('fetch', fetcher);
    const starting = connection.start('natural-inquiry', 'live');
    connection.stop();
    resolveResponse(response(session));
    await starting;
    expect(SocketStub.instances).toHaveLength(0);
    expect(callbacks.onOpen).not.toHaveBeenCalled();
    expect(fetcher).toHaveBeenLastCalledWith('/api/voice-lab/session/cancel', expect.objectContaining({ keepalive: true }));
  });

  it('closes a CONNECTING socket immediately instead of waiting for a paid attachment', async () => {
    const { connection, callbacks } = setup();
    const fetcher = vi.fn().mockResolvedValueOnce(response(session)).mockResolvedValue(response({ canceled: true }));
    vi.stubGlobal('fetch', fetcher);
    await connection.start('natural-inquiry', 'live');
    const socket = SocketStub.instances[0];
    expect(socket.readyState).toBe(SocketStub.CONNECTING);
    connection.stop();
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(callbacks.onOpen).not.toHaveBeenCalled();
  });

  it('sends stop then closes an already connected socket without reconnecting', async () => {
    const { connection } = setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(session)));
    await connection.start('natural-inquiry', 'mock');
    const socket = SocketStub.instances[0];
    socket.readyState = SocketStub.OPEN;
    socket.onopen!();
    connection.stop();
    expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'stop' }));
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(SocketStub.instances).toHaveLength(1);
  });
});
