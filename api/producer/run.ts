import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

// Server-side run-state for the unified One-Shot / Concierge flow (grill 2026-07-01).
// This endpoint owns the RUN HEADER: create + checkpoint (POST) and resume-read (GET).
// The per-scene video job queue (the no-double-spend fan-out) lives in producer_scenes
// and is mutated only via api/producer/advance.ts.
//
//   GET  ?runId=<id>  → { run, scenes }  (resume-to-true-state; ownership enforced)
//   POST { runId, ...checkpoint }        → upsert the run header after a stage transition
//
// All writes go through the SERVICE ROLE (producer_runs is RLS-on/no-policies =
// default deny), consistent with this app's "all writes via api/" architecture.

// Run state carries the full ProductionInput + storyboard artifacts (base64/urls) — the
// header can legitimately be a few hundred KB. Keep a sane ceiling well under Vercel's
// default parser but generous enough for the threaded input + stage checkpoint.
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };

const CheckpointBody = z.object({
  runId: z.string().min(8).max(200),
  mode: z.enum(['oneshot', 'concierge']).optional(),
  status: z.enum(['running', 'review', 'done', 'error']).optional(),
  currentStage: z.string().max(60).nullable().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  stages: z.array(z.unknown()).optional(),
  artifacts: z.record(z.string(), z.unknown()).optional(),
  error: z.string().max(2000).nullable().optional(),
  // Optimistic-concurrency guard: the client's last-known revision. The UPDATE is guarded on it
  // and increments; on a create the row is inserted at revision 0 regardless of what's sent.
  revision: z.number().int().nonnegative().optional(),
});

// Checkpoints fire after every stage transition — frequent but bounded per user. A
// generous window budget stops a runaway client from hammering the table.
const RUN_LIMIT = 240;
const RUN_WINDOW_SECONDS = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const admin = getSupabaseAdmin();

  // ── Resume read ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const runId = typeof req.query.runId === 'string' ? req.query.runId : null;
    if (!runId) return res.status(400).json({ error: 'missing_run_id' });

    const { data: run, error } = await admin
      .from('producer_runs')
      .select('*')
      .eq('run_id', runId)
      .maybeSingle();
    if (error) {
      console.error('[producer/run] select failed:', error.message);
      return res.status(500).json({ error: 'read_failed' });
    }
    if (!run) return res.status(404).json({ error: 'not_found' });
    // Ownership: never return another user's run, even with a guessed run_id.
    if (run.user_id !== user.id) return res.status(403).json({ error: 'forbidden' });

    const { data: scenes, error: sErr } = await admin
      .from('producer_scenes')
      .select('*')
      .eq('run_id', runId)
      .order('scene_idx', { ascending: true });
    if (sErr) {
      console.error('[producer/run] scenes select failed:', sErr.message);
      return res.status(500).json({ error: 'read_failed' });
    }
    return res.status(200).json({ run, scenes: scenes ?? [] });
  }

  // ── Create / checkpoint ──────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const parsed = CheckpointBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const { runId, ...patch } = parsed.data;

    const allowed = await rateLimitCheck(`producer:run:${user.id}`, RUN_LIMIT, RUN_WINDOW_SECONDS);
    if (!allowed) {
      res.setHeader('Retry-After', '30');
      return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 30 });
    }

    // Ownership guard before any write: if the run exists, it must be this user's. Also read the
    // current revision so we can guard the UPDATE (optimistic concurrency) below.
    const { data: existing, error: exErr } = await admin
      .from('producer_runs')
      .select('user_id, revision')
      .eq('run_id', runId)
      .maybeSingle();
    if (exErr) {
      console.error('[producer/run] ownership check failed:', exErr.message);
      return res.status(500).json({ error: 'write_failed' });
    }
    if (existing && existing.user_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Build the row from ONLY the fields the client sent (partial checkpoint), always
    // stamping the verified user id — never a client-supplied one.
    const row: Record<string, unknown> = { run_id: runId, user_id: user.id, updated_at: new Date().toISOString() };
    if (patch.mode !== undefined) row.mode = patch.mode;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.currentStage !== undefined) row.current_stage = patch.currentStage;
    if (patch.input !== undefined) row.input = patch.input;
    if (patch.stages !== undefined) row.stages = patch.stages;
    if (patch.artifacts !== undefined) row.artifacts = patch.artifacts;
    if (patch.error !== undefined) row.error = patch.error;

    // ── Create: first checkpoint for this run → INSERT at revision 0. ──
    if (!existing) {
      row.revision = 0;
      const { data: created, error } = await admin
        .from('producer_runs')
        .insert(row)
        .select('*')
        .maybeSingle();
      if (error) {
        console.error('[producer/run] insert failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: true, revision: 0, current: created });
    }

    // ── Checkpoint: guarded UPDATE (WHERE revision = known) → increment. ──
    // Last-write-wins is unsafe: a stale tab could regress stages/current_stage. Guard on the
    // client's known revision; on 0 rows a fresher checkpoint already advanced the row, so return
    // changed:false + the current row and let the client adopt the fresher header state.
    const known = patch.revision ?? existing.revision ?? 0;
    row.revision = known + 1;
    const { data: updated, error } = await admin
      .from('producer_runs')
      .update(row)
      .eq('run_id', runId)
      .eq('revision', known)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('[producer/run] update failed:', error.message);
      return res.status(500).json({ error: 'write_failed' });
    }
    if (!updated) {
      const { data: current } = await admin
        .from('producer_runs')
        .select('*')
        .eq('run_id', runId)
        .maybeSingle();
      return res.status(200).json({ ok: true, changed: false, current: current ?? null });
    }
    return res.status(200).json({ ok: true, changed: true, revision: known + 1, current: updated });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method_not_allowed' });
}
