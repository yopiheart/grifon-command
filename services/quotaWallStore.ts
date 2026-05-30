import type { PlanId } from '../utils/planGate';
import type { MeterUnit } from '../hooks/useQuota';

/**
 * Global store for the quota-wall upgrade modal. When a metered generation
 * returns HTTP 402 `quota_exceeded`, the transport layer (proxyCall in
 * geminiService.ts) publishes the cap-hit here; App.tsx subscribes and renders
 * <QuotaWallModal>. Centralizing detection in the transport means individual
 * modules / wizard steps need zero edits to get the wall.
 *
 * Mirrors the tiny observable + useSyncExternalStore pattern in
 * activeJobsService.ts — no external state lib.
 */

export type QuotaWallState = {
  open: boolean;
  scope: MeterUnit | null;
  plan: PlanId;
  used: number;
  limit: number;
};

const CLOSED: QuotaWallState = {
  open: false,
  scope: null,
  plan: 'free',
  used: 0,
  limit: 0,
};

type Listener = () => void;

class QuotaWallStore {
  private state: QuotaWallState = CLOSED;
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): QuotaWallState => this.state;

  private emit() {
    this.listeners.forEach((l) => l());
  }

  trigger(payload: { scope: MeterUnit; plan: PlanId; used: number; limit: number }) {
    this.state = { open: true, ...payload };
    this.emit();
  }

  dismiss() {
    if (!this.state.open) return;
    this.state = { ...this.state, open: false };
    this.emit();
  }
}

export const quotaWallStore = new QuotaWallStore();

export const triggerQuotaWall = (
  payload: { scope: MeterUnit; plan: PlanId; used: number; limit: number }
) => quotaWallStore.trigger(payload);

export const dismissQuotaWall = () => quotaWallStore.dismiss();
