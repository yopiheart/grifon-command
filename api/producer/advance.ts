import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

// Per-scene video job queue for the fan-out render stage (grill 2026-07-01). This is
// the NO-DOUBLE-SPEND core: every provider render fires exactly once per (runId,sceneIdx)
// even under resume / retry / two open tabs, because the 'claim' action goes through the
// atomic producer_claim_scene RPC (single-row UPDATE ... WHERE status='pending').
//
// Client fan-out loop, per scene:
//   1. claim   → if claimed:true, THIS caller owns the submit; else poll scene.job_handle
//   2. record  → after submitting the provider job, store its handle (submitting→rendering)
//   3. complete→ on poll success, store the urls (→ done)
//   4. flag    → generation failed after retries (→ flagged, surfaced at a gate)
//   5. requeue → reshoot: a flagged/done scene goes back to pending so it can be reclaimed
//
// Service-role only (producer_scenes is RLS-on/no-policies). Ownership is enforced
// against producer_runs.user_id on every call — a client never asserts its own identity.

// 4mb (was 256kb): 'record_image' carries ONE base64 scene image (+ optional end frame) per
// call — this is what keeps multi-MB images OUT of the run-header checkpoint jsonb, whose
// oversized writes hit Postgres statement timeouts (2026-07-02 SIGLA smoke).
export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('seed'), runId: z.string().min(8).max(200), sceneCount: z.number().int().min(1).max(24) }),
  z.object({ action: z.literal('claim'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23) }),
  z.object({ action: z.literal('record'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23), jobHandle: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal('record_image'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23), imageUrl: z.string().max(3_000_000), endFrameUrl: z.string().max(3_000_000).nullable().optional() }),
  z.object({ action: z.literal('record_thumbnail'), runId: z.string().min(8).max(200), thumbnailUrl: z.string().max(3_000_000) }),
  z.object({ action: z.literal('complete'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23), videoUrl: z.string().max(4000), audioUrl: z.string().max(4000).optional() }),
  z.object({ action: z.literal('flag'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23), reason: z.string().max(500).optional() }),
  z.object({ action: z.literal('requeue'), runId: z.string().min(8).max(200), sceneIdx: z.number().int().min(0).max(23) }),
]);

const ADVANCE_LIMIT = 600;
const ADVANCE_WINDOW_SECONDS = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const body = parsed.data;

  const allowed = await rateLimitCheck(`producer:advance:${user.id}`, ADVANCE_LIMIT, ADVANCE_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', '30');
    return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 30 });
  }

  const admin = getSupabaseAdmin();

  // Ownership guard: the run must exist and belong to this user before any scene write.
  const { data: run, error: rErr } = await admin
    .from('producer_runs')
    .select('user_id')
    .eq('run_id', body.runId)
    .maybeSingle();
  if (rErr) {
    console.error('[producer/advance] run lookup failed:', rErr.message);
    return res.status(500).json({ error: 'write_failed' });
  }
  if (!run) return res.status(404).json({ error: 'run_not_found' });
  if (run.user_id !== user.id) return res.status(403).json({ error: 'forbidden' });

  const nowIso = new Date().toISOString();

  switch (body.action) {
    case 'seed': {
      // Insert one pending row per scene; ignore rows that already exist so re-seeding
      // (e.g. a resumed run re-entering the video stage) never resets in-flight scenes.
      const rows = Array.from({ length: body.sceneCount }, (_, i) => ({
        run_id: body.runId, scene_idx: i, status: 'pending', updated_at: nowIso,
      }));
      const { error } = await admin
        .from('producer_scenes')
        .upsert(rows, { onConflict: 'run_id,scene_idx', ignoreDuplicates: true });
      if (error) {
        console.error('[producer/advance] seed failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, seeded: body.sceneCount });
    }

    case 'claim': {
      // Atomic: flips exactly one pending scene to 'submitting'. Only the winner submits
      // the provider job; everyone else gets the current row and polls its handle.
      const { data: claimed, error } = await admin.rpc('producer_claim_scene', {
        p_run_id: body.runId, p_scene_idx: body.sceneIdx,
      });
      if (error) {
        console.error('[producer/advance] claim rpc failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      const { data: scene } = await admin
        .from('producer_scenes')
        .select('*')
        .eq('run_id', body.runId)
        .eq('scene_idx', body.sceneIdx)
        .maybeSingle();
      return res.status(200).json({ claimed: claimed === true, scene: scene ?? null });
    }

    case 'record': {
      // Store the provider handle. Guard on status='submitting' so a stale/duplicate
      // record can't clobber a scene that already advanced. `changed:false` (0 rows) tells the
      // client it lost the race — the scene left 'submitting' under it — so it re-reads state.
      const { data, error } = await admin
        .from('producer_scenes')
        .update({ job_handle: body.jobHandle, status: 'rendering', updated_at: nowIso })
        .eq('run_id', body.runId).eq('scene_idx', body.sceneIdx).eq('status', 'submitting')
        .select('scene_idx');
      if (error) {
        console.error('[producer/advance] record failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: (data?.length ?? 0) > 0 });
    }

    case 'record_image': {
      // Persist the scene's image(s) on its OWN row, written once per scene — never inside the
      // run-header checkpoint jsonb (multi-MB payloads there hit statement timeouts and the 2mb
      // parser cap, leaving stale checkpoints that made resume re-buy images — 2026-07-02).
      // UPSERT because images generate BEFORE the video-stage 'seed'; on conflict only the image
      // columns update (status/attempts/handle untouched), so this can never reset an in-flight scene.
      const { error } = await admin
        .from('producer_scenes')
        .upsert(
          { run_id: body.runId, scene_idx: body.sceneIdx, image_url: body.imageUrl, end_frame_url: body.endFrameUrl ?? null, updated_at: nowIso },
          { onConflict: 'run_id,scene_idx' }
        );
      if (error) {
        console.error('[producer/advance] record_image failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: true });
    }

    case 'record_thumbnail': {
      // The producer's cover frame, on its OWN column for the same reason record_image exists:
      // generateThumbnail returns a base64 DATA URL, and multi-MB payloads in the run-header
      // artifacts jsonb hit statement timeouts + the 2mb parser cap. Deliberately does NOT touch
      // `revision` — this is an out-of-band artifact write, not a checkpoint, so it can never
      // interfere with the optimistic-concurrency guard in api/producer/run.ts.
      const { error } = await admin
        .from('producer_runs')
        .update({ thumbnail_url: body.thumbnailUrl, updated_at: nowIso })
        .eq('run_id', body.runId);
      if (error) {
        // Includes the "column does not exist" case when producer_runs.sql has not been
        // re-run yet — the caller treats this as best-effort, so the run is unaffected.
        console.error('[producer/advance] record_thumbnail failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: true });
    }

    case 'complete': {
      const patch: Record<string, unknown> = { status: 'done', video_url: body.videoUrl, updated_at: nowIso };
      if (body.audioUrl !== undefined) patch.audio_url = body.audioUrl;
      const { data, error } = await admin
        .from('producer_scenes')
        .update(patch)
        .eq('run_id', body.runId).eq('scene_idx', body.sceneIdx).in('status', ['submitting', 'rendering'])
        .select('scene_idx');
      if (error) {
        console.error('[producer/advance] complete failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: (data?.length ?? 0) > 0 });
    }

    case 'flag': {
      const { data, error } = await admin
        .from('producer_scenes')
        .update({ status: 'flagged', flagged_reason: body.reason ?? null, updated_at: nowIso })
        .eq('run_id', body.runId).eq('scene_idx', body.sceneIdx)
        .select('scene_idx');
      if (error) {
        console.error('[producer/advance] flag failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: (data?.length ?? 0) > 0 });
    }

    case 'requeue': {
      // Reshoot / stale-claim escape: return a scene to pending so the claim path can re-run it
      // exactly once. Clears the stale handle/urls so nothing dangles. GUARDED so it can never
      // wipe an in-flight scene: allowed when the scene is flagged/done/failed, OR when it is a
      // STALE 'submitting' claim (no recorded handle AND untouched for >10min) — the single-driver
      // v1's reaper-free escape from a crash that died between claim and record — OR a STALE
      // 'rendering' scene (>10min): a reload mid-reshoot leaves a recorded handle nobody polls at
      // the First Cut gate, and provider jobs finish or die well inside 10min, so after that the
      // requeue costs at most one extra render vs. a permanently un-reshootable scene. A 0-row
      // result (changed:false) means the guard blocked it (actively in flight) → the client re-reads.
      const staleIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await admin
        .from('producer_scenes')
        .update({ status: 'pending', job_handle: null, video_url: null, audio_url: null, flagged_reason: null, updated_at: nowIso })
        .eq('run_id', body.runId).eq('scene_idx', body.sceneIdx)
        .or(`status.in.(flagged,done,failed),and(status.eq.submitting,job_handle.is.null,updated_at.lt."${staleIso}"),and(status.eq.rendering,updated_at.lt."${staleIso}")`)
        .select('scene_idx');
      if (error) {
        console.error('[producer/advance] requeue failed:', error.message);
        return res.status(500).json({ error: 'write_failed' });
      }
      return res.status(200).json({ ok: true, changed: (data?.length ?? 0) > 0 });
    }
  }
}
