import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin, getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { FixtureInputVerificationError, verifySavedFixtureInputs } from '../_lib/companionInputVerifier.js';
import { validateFixtureInputVerificationReceipt } from '../../services/companionInputVerification.js';

function bounded<T>(promise: PromiseLike<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new FixtureInputVerificationError('FIXTURE_VERIFICATION_DEADLINE'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(value => { signal.removeEventListener('abort', abort); resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'method_not_allowed' }); }
  const body: unknown = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'requestId')
    || typeof (body as Record<string, unknown>).requestId !== 'string' || !/^[a-f0-9]{64}$/.test((body as Record<string, string>).requestId)) return res.status(400).json({ error: 'invalid_fixture_request' });
  const requestId = (body as { requestId: string }).requestId;
  const authz = req.headers.authorization, token = typeof authz === 'string' && authz.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const controller = new AbortController(), deadlineAt = Date.now() + 55_000, timer = setTimeout(() => controller.abort(), 55_000);
  try {
    const user = await bounded(getUserFromAccessToken(token), controller.signal);
    if (!user) return res.status(401).json({ error: 'invalid_token' });
    if (!await bounded(rateLimitCheck(`companion:fixture-inputs:${user.id}`, 3, 60), controller.signal)) {
      res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 60 });
    }
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, publicKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !publicKey) return res.status(503).json({ error: 'fixture_input_verification_unavailable' });
    const privateFetch: typeof fetch = async (input, init) => {
      const target = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
      if (target.origin !== new URL(url).origin) throw new FixtureInputVerificationError('FIXTURE_MEDIA_UNAVAILABLE');
      const response = await fetch(input, { ...init, signal: controller.signal, redirect: 'error' });
      if (Number(response.headers.get('content-length')) > 6_000_000) { await response.body?.cancel(); throw new FixtureInputVerificationError('FIXTURE_MEDIA_LIMIT_UNSUPPORTED'); }
      const reader = response.body?.getReader(); if (!reader) return response;
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength;
        if (size > 6_000_000) { await reader.cancel(); throw new FixtureInputVerificationError('FIXTURE_MEDIA_LIMIT_UNSUPPORTED'); }
        chunks.push(chunk.value);
      }
      return new Response(Buffer.concat(chunks), { status: response.status, statusText: response.statusText, headers: response.headers });
    };
    const client = createClient(url, publicKey, { global: { headers: { Authorization: `Bearer ${token}` }, fetch: privateFetch }, auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const job = await bounded(client.rpc('grifon_fixture_get', { p_request_id: requestId }), controller.signal);
    if (job.error) return res.status(503).json({ error: 'fixture_input_verification_unavailable' });
    if (job.data === null) return res.status(404).json({ error: 'fixture_job_not_found' });
    // Read only the linked snapshot derived from the frozen owner-authorized job.
    let saveId: unknown;
    try { saveId = JSON.parse(job.data.intentText).cloudReference?.saveId; } catch { return res.status(422).json({ error: 'fixture_job_identity_mismatch' }); }
    if (typeof saveId !== 'string' || !/^[a-f0-9]{64}$/.test(saveId)) return res.status(422).json({ error: 'fixture_linked_inputs_required' });
    const saved = await bounded(client.rpc('grifon_reference_get', { p_save_id: saveId }), controller.signal);
    if (saved.error) return res.status(503).json({ error: 'fixture_input_verification_unavailable' });
    if (saved.data === null) return res.status(404).json({ error: 'fixture_snapshot_not_found' });
    const proof = await bounded(verifySavedFixtureInputs(user.id, requestId, job.data, saved.data, async path => {
      const result = await bounded(client.storage.from('grifon-fixture-reference-media').download(path), controller.signal);
      if (result.error || !result.data) throw new FixtureInputVerificationError('FIXTURE_MEDIA_UNAVAILABLE');
      return result.data;
    }, { deadlineAt }), controller.signal);
    if (controller.signal.aborted || Date.now() >= deadlineAt) throw new FixtureInputVerificationError('FIXTURE_VERIFICATION_DEADLINE');
    const written = await bounded(getSupabaseAdmin().rpc('grifon_fixture_input_verification_record', {
      p_owner_id: user.id, p_request_id: requestId, p_source_save_id: proof.sourceSaveId, p_input_hash: proof.inputHash,
      p_manifest_sha256: proof.manifestSha256, p_plan_snapshot_sha256: proof.planSnapshotSha256, p_verified_media: proof.verifiedMedia,
    }).abortSignal(controller.signal), controller.signal);
    if (written.error) return res.status(503).json({ error: 'fixture_input_verification_not_recorded' });
    const receipt = await validateFixtureInputVerificationReceipt(written.data, user.id);
    if (receipt.requestId !== requestId || receipt.sourceSaveId !== proof.sourceSaveId || receipt.inputHash !== proof.inputHash || receipt.manifestSha256 !== proof.manifestSha256 || receipt.planSnapshotSha256 !== proof.planSnapshotSha256 || receipt.verifiedMedia.length !== proof.verifiedMedia.length
      || proof.verifiedMedia.some((media, index) => Object.entries(media).some(([key, value]) => (receipt.verifiedMedia[index] as unknown as Record<string, unknown>)[key] !== value))) return res.status(503).json({ error: 'fixture_input_verification_not_recorded' });
    return res.status(200).json(receipt);
  } catch (error) {
    if (error instanceof FixtureInputVerificationError) return res.status(error.code === 'FIXTURE_DECODER_UNAVAILABLE' ? 503 : 422).json({ error: error.code.toLowerCase() });
    return res.status(503).json({ error: 'fixture_input_verification_unavailable' });
  } finally { clearTimeout(timer); controller.abort(); }
}
