// Producer-run event sink (P2 observability spine). Service-role inserts into the
// existing public.events table (same row shape as api/events.ts) plus the P2 `run_id`
// column, so per-run node lifecycle + COGS rows can be joined to a producer_runs row.
//
// A helper module, NOT a route (no new Vercel function). Called from api/* handlers
// (modelCosts COGS threading) and — via the client analytics transport — for node
// events. Every write is FIRE-AND-FORGET SAFE: all failures are swallowed so telemetry
// can NEVER throw into, or slow, a producer run's request path (mirrors the guard
// discipline in api/_lib/modelCosts.ts).

import type { SupabaseClient } from '@supabase/supabase-js';

/** The producer-run event vocabulary (plan §3.11).
 *
 * 'check_skip' is DELIBERATELY distinct from 'check_fail': a fail means the check RAN
 * and flagged something; a skip means the check never ran at all (infra error, missing
 * reference). Folding skips into 'check_fail' would corrupt the very flag-rate metric
 * the flag-ON window exists to measure — "no flags because the images were good" must
 * stay distinguishable from "no flags because the gate never ran". */
export type RunEventName =
  | 'node_start'
  | 'node_done'
  | 'node_fail'
  | 'check_fail'
  | 'check_skip'
  | 'gate_park'
  | 'gate_approve'
  | 'watchdog_kill'
  | 'cogs';

export interface RunEventInput {
  /** Verified user id when known (events.user_id is nullable — COGS rows may omit it). */
  userId?: string | null;
  runId: string;
  event: RunEventName;
  /** The stage/node this event is about (market_research, script, …). Folded into meta.node. */
  node?: string;
  meta?: Record<string, unknown>;
}

// Hard ceiling on the serialized meta payload — mirrors api/events.ts MAX_META_BYTES.
// Defense-in-depth: an oversized payload is dropped to {} rather than rejected, because
// this sink is best-effort and must never fail a write on telemetry size.
const MAX_META_BYTES = 8 * 1024;

/**
 * Best-effort insert of one producer-run event. Never throws and never rejects — a
 * caller can `void logRunEvent(...)` and move on. `node` is merged into meta (there is
 * no dedicated events column for it), matching the client node-event shape.
 */
export async function logRunEvent(admin: SupabaseClient, input: RunEventInput): Promise<void> {
  try {
    let meta: Record<string, unknown> = {
      ...(input.meta ?? {}),
      ...(input.node ? { node: input.node } : {}),
    };
    try {
      if (JSON.stringify(meta).length > MAX_META_BYTES) meta = {};
    } catch {
      meta = {};
    }
    await admin.from('events').insert({
      user_id: input.userId ?? null,
      session_id: null,
      event: input.event,
      module: null,
      step: null,
      meta,
      run_id: input.runId,
    });
  } catch {
    /* never throw from telemetry */
  }
}
