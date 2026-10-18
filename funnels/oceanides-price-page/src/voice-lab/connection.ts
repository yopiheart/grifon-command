import type { ClientEvent, LabSnapshot, ServerEvent, SessionMode, SessionResponse } from './contracts';
import { VOICE_LAB_PROTOCOL } from './contracts';

export interface ConnectionCallbacks {
  onSnapshot: (snapshot: LabSnapshot) => void;
  onEvent: (event: ServerEvent) => void;
  onOpen: () => void;
  onClose: (reason: string) => void;
}

/** One explicit session, one socket. There is deliberately no automatic reconnect. */
export class LabConnection {
  private socket: WebSocket | null = null;
  private stopped = false;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private sessionToken: string | null = null;
  private cancellationSent = false;

  constructor(private readonly callbacks: ConnectionCallbacks) {}

  async start(scenarioId: string, mode: SessionMode): Promise<void> {
    if (this.stopped) return;
    const response = await fetch('/api/voice-lab/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, mode, protocolVersion: VOICE_LAB_PROTOCOL }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error === 'client_reload_required' ? 'This tab is out of date. Hard reload (Ctrl+Shift+R) before starting. No paid session was opened.' : typeof body.error === 'string' ? body.error : 'The test session could not start.');
    const session = body as SessionResponse;
    const url = new URL(session.wsPath, window.location.href);
    if (url.origin !== window.location.origin) throw new Error('The test socket must stay on this local server.');
    this.sessionToken = url.searchParams.get('token');
    if (this.stopped) {
      // Stop/unmount while REST was pending must not attach a paid provider socket.
      await this.cancelPreparing();
      return;
    }
    url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(url);
    this.socket = socket;
    if (!this.stopped) this.callbacks.onSnapshot(session.state);
    this.timeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) { this.stop(); this.callbacks.onClose('Connection timed out. No automatic retry.'); }
    }, 8000);
    socket.onopen = () => {
      this.clearTimeout();
      if (this.stopped) { socket.send(JSON.stringify({ type: 'stop' })); socket.close(); return; }
      this.callbacks.onOpen();
    };
    socket.onmessage = (message) => {
      if (this.stopped) return;
      try { this.callbacks.onEvent(JSON.parse(String(message.data)) as ServerEvent); }
      catch { this.callbacks.onClose('Invalid test-server message. Stop and review the session.'); this.stop(); }
    };
    socket.onclose = (event) => {
      this.clearTimeout();
      if (!this.stopped) this.callbacks.onClose(event.reason || 'Connection closed. No automatic retry.');
    };
    socket.onerror = () => {
      if (!this.stopped) this.callbacks.onClose('Socket connection failed. No automatic retry.');
      this.stop();
    };
  }

  send(event: ClientEvent): boolean {
    if (this.stopped || this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(event));
    return true;
  }

  stop(): void {
    this.stopped = true;
    this.clearTimeout();
    const socket = this.socket;
    if (!socket) return;
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' }));
      socket.close(1000, 'Operator stopped the test');
    } else {
      if (socket.readyState === WebSocket.CONNECTING) socket.close();
      void this.cancelPreparing();
    }
  }

  private async cancelPreparing(): Promise<void> {
    if (!this.sessionToken || this.cancellationSent) return;
    this.cancellationSent = true;
    try {
      await fetch('/api/voice-lab/session/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.sessionToken }), keepalive: true,
      });
    } catch { /* A stopped client must never attach; the server preparation timer remains bounded. */ }
  }

  disconnect(): void {
    this.socket?.close(4000, 'Simulated connection loss');
  }

  private clearTimeout(): void {
    if (this.timeout !== null) clearTimeout(this.timeout);
    this.timeout = null;
  }
}
