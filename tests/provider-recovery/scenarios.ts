import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import handler from '../../api/producer/advance.js';

// Scripted handler-boundary sequences. No imported orchestration or paid proxies.
const evidence = process.env.RECOVERY_EVIDENCE!;
const restOrigin = process.env.RECOVERY_REST_URL!;
const checks = ['Concurrent claimers', 'Committed record, lost response', 'Failed record, fresh recovery',
  'Repeated stale recovery', 'Aged recorded handle stays recoverable', 'Late old-attempt writes',
  'Wrong user and invalid auth', 'Completed clip reuse', 'Database outage'].map(name => ({ name, status: 'NOT RUN', detail: '' }));
const timeline: Record<string, unknown>[] = [];
let activeCase = '';
const realFetch = globalThis.fetch;
let handlerOrigin = '';
let dropRecordReplyFor: string | null = null;
let droppedReplies = 0;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  assert.ok(url.origin === restOrigin || url.origin === handlerOrigin, 'Network destination outside owned loopback services');
  return realFetch(input, { ...init, redirect: 'error' });
};
function command(file: string, args: string[], input?: string): Promise<string> {
  return new Promise((accept, reject) => {
    const child = spawn(file, args, { env: process.env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errors = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Owned command timed out')); }, 15_000);
    child.stdout.on('data', b => { output += b; });
    child.stderr.on('data', b => { errors += b; });
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => { clearTimeout(timer); code === 0 ? accept(output.trim()) : reject(new Error(`Command exited ${code}: ${errors}`)); });
    child.stdin.on('error', () => {}); // Command exit/timeout reports failures.
    child.stdin.end(input);
  });
}
const sql = (statement: string) => command(process.env.RECOVERY_PSQL!, ['-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'], statement);
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const server = createServer(async (request, response) => {
  try {
    let body = '';
    for await (const chunk of request) body += chunk;
    const req = { method: request.method, headers: request.headers, body: JSON.parse(body || '{}') };
    const res = {
      setHeader: (name: string, value: string) => response.setHeader(name, value),
      status: (code: number) => { response.statusCode = code; return res; },
      json: (value: any) => {
        if (dropRecordReplyFor === req.body.runId && req.body.action === 'record' && response.statusCode === 200 && value.changed === true) {
          dropRecordReplyFor = null; droppedReplies++;
          timeline.push({ case: activeCase, fault: 'Socket destroyed after handler committed record', intendedReply: value });
          response.destroy(); return res;
        }
        response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(value)); return res;
      },
    };
    await handler(req as any, res as any);
  } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ harnessException: String(error) })); }
});
await new Promise<void>(accept => server.listen(0, '127.0.0.1', accept));
const address = server.address();
assert.ok(address && typeof address !== 'string');
handlerOrigin = `http://127.0.0.1:${address.port}`;
type Reply = { status: number; body: any };
async function advance(runId: string, action: string, fields: Record<string, unknown> = {}, token = 'owner'): Promise<Reply> {
  const response = await fetch(handlerOrigin, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ action, runId, sceneIdx: 0, ...fields }), signal: AbortSignal.timeout(8000) });
  const result = { status: response.status, body: await response.json() };
  timeline.push({ case: activeCase, action, runId, request: fields, response: result });
  return result;
}
async function ok(runId: string, action: string, fields: Record<string, unknown> = {}) {
  const response = await advance(runId, action, action === 'claim' ? { protocol: 2, ...fields } : fields);
  assert.equal(response.status, 200, `${action}: ${JSON.stringify(response.body)}`);
  return response.body;
}
async function row(runId: string) {
  const value = JSON.parse(await sql(`select row_to_json(s) from public.producer_scenes s where run_id=${literal(runId)} and scene_idx=0;`));
  timeline.push({ case: activeCase, snapshot: value });
  return value;
}
async function seed(runId: string) {
  await sql(`insert into public.producer_runs(run_id,user_id) values (${literal(runId)},'20000000-0000-0000-0000-000000000001');`);
  await ok(runId, 'seed', { sceneCount: 1 });
}
const jobs: { runId: string; id: string }[] = [];
const polls: string[] = [];
function acceptJob(runId: string) {
  const handle = { id: `fake-job-${jobs.length + 1}` };
  jobs.push({ runId, ...handle });
  timeline.push({ case: activeCase, provider: 'accepted', runId, handle });
  return handle;
}
function poll(handle: { id: string }) {
  assert.ok(jobs.some(job => job.id === handle.id), 'Polling an unknown fake job');
  polls.push(handle.id);
  timeline.push({ case: activeCase, provider: 'polled', handle });
  return `https://media.invalid/${handle.id}.mp4`;
}
const count = (runId: string) => jobs.filter(job => job.runId === runId).length;
async function claimAndSubmit(runId: string) {
  assert.equal((await ok(runId, 'claim')).claimed, true);
  return acceptJob(runId);
}
async function failRecords(enabled: boolean) { await sql(`update public.harness_fault set enabled=${enabled};`); }
async function age(runId: string) { await sql(`update public.producer_scenes set updated_at=now()-interval '11 minutes' where run_id=${literal(runId)};`); }
async function scenario(index: number, run: () => Promise<string>) {
  activeCase = checks[index].name;
  try { checks[index].detail = await run(); checks[index].status = 'PASS'; }
  catch (error) { checks[index].status = 'FAIL'; checks[index].detail = String(error); }
}

let failure;
try {
  await sql(`create table public.harness_fault(enabled boolean); insert into public.harness_fault values(false);
    create function public.reject_harness_record() returns trigger language plpgsql as $$ begin
      if NEW.status='rendering' and OLD.status='submitting' and (select enabled from public.harness_fault) then
        raise exception 'injected record write failure';
      end if; return NEW; end $$;
    create trigger harness_record_fault before update on public.producer_scenes for each row execute function public.reject_harness_record();
    grant select on public.harness_fault to service_role;`);
  await scenario(0, async () => {
    const id = 'race-claim'; await seed(id);
    const legacy = await advance(id, 'claim');
    assert.equal(legacy.status, 409);
    assert.equal(legacy.body.error, 'producer_refresh_required');
    assert.equal((await row(id)).attempts, 0, 'Old browser must stop before it can submit');
    // Hold the row until both real PostgREST SQL requests are waiting on locks.
    const holder = spawn(process.env.RECOVERY_PSQL!, ['-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'], { env: process.env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let holderOutput = ''; holder.stdout.on('data', b => { holderOutput += b; });
    holder.stderr.on('data', b => { holderOutput += b; });
    holder.on('error', error => { holderOutput += String(error); });
    holder.stdin.on('error', () => {});
    const holderDeadline = setTimeout(() => holder.kill(), 15_000);
    const exited = new Promise(resolve => holder.on('close', code => { clearTimeout(holderDeadline); resolve(code); }));
    holder.stdin.write(`begin; select 1 from public.producer_scenes where run_id='${id}' for update;\n\\echo LOCKED\n`);
    let requests: Promise<any>[] = [];
    let requestsSettled: Promise<PromiseSettledResult<any>[]> | undefined;
    try {
      for (let n = 0; n < 100 && !holderOutput.includes('LOCKED'); n++) await new Promise(resolve => setTimeout(resolve, 25));
      assert.ok(holderOutput.includes('LOCKED'), 'Test lock holder did not acquire row');
      requests = [ok(id, 'claim'), ok(id, 'claim')];
      requestsSettled = Promise.allSettled(requests);
      let blocked = 0;
      for (let n = 0; n < 100 && blocked < 2; n++) {
        blocked = Number(await sql("select count(*) from pg_stat_activity where wait_event_type='Lock' and query like '%producer_claim_scene%';"));
        if (blocked < 2) await new Promise(resolve => setTimeout(resolve, 25));
      }
      assert.equal(blocked, 2, 'Both real SQL requests must overlap behind the row lock');
      timeline.push({ case: activeCase, blockedSqlBackends: blocked });
    } finally {
      holder.stdin.end('rollback;\n\\q\n'); await exited;
      // Observe early request failures while the lock probe runs and drain after releasing it.
      await requestsSettled;
    }
    const answers = await Promise.all(requests);
    assert.equal(answers.filter(answer => answer.claimed).length, 1);
    for (const answer of answers) if (answer.claimed) acceptJob(id);
    assert.equal(count(id), 1); assert.equal((await row(id)).attempts, 1);
    return 'Two blocked PostgreSQL backends; one winning claim and one accepted fake job.';
  });
  await scenario(1, async () => {
    const id = 'lost-reply'; await seed(id); const handle = await claimAndSubmit(id);
    dropRecordReplyFor = id;
    await assert.rejects(advance(id, 'record', { attempt: 1, jobHandle: handle }), /fetch failed/);
    assert.equal(droppedReplies, 1, 'Expected precisely the injected socket drop');
    assert.deepEqual((await row(id)).job_handle, handle);
    const resumed = await ok(id, 'claim'); assert.equal(resumed.claimed, false);
    assert.deepEqual(resumed.scene.job_handle, handle);
    assert.equal((await ok(id, 'complete', { attempt: resumed.scene.attempts, videoUrl: poll(resumed.scene.job_handle) })).changed, true);
    assert.equal((await row(id)).status, 'done'); assert.equal(count(id), 1);
    return 'HTTP socket destroyed after commit; client fetch rejects; scripted resume polls durable handle without submission.';
  });
  await scenario(2, async () => {
    const id = 'fresh-failure'; await seed(id); const handle = await claimAndSubmit(id);
    await failRecords(true);
    const failed = await advance(id, 'record', { attempt: 1, jobHandle: handle }).finally(() => failRecords(false));
    assert.equal(failed.status, 500); assert.equal(failed.body.error, 'write_failed');
    assert.equal((await row(id)).job_handle, null);
    assert.equal((await ok(id, 'requeue', { attempt: 1 })).changed, false);
    assert.equal((await ok(id, 'claim')).claimed, false); assert.equal(count(id), 1);
    return 'Actual trigger exception rolls back the write; fresh recovery cannot claim again.';
  });
  await scenario(3, async () => {
    const id = 'repeat-stale'; await seed(id);
    const handle = await claimAndSubmit(id);
    const requeues = [];
    let attempt = 1;
    await failRecords(true);
    try {
      assert.equal((await advance(id, 'record', { attempt, jobHandle: handle })).status, 500);
      for (let retry = 0; retry < 2; retry++) {
        await age(id);
        requeues.push((await ok(id, 'requeue', { attempt })).changed);
        const claim = await ok(id, 'claim');
        if (claim.claimed) {
          attempt = claim.scene.attempts;
          assert.equal((await advance(id, 'record', { attempt, jobHandle: acceptJob(id) })).status, 500);
        }
      }
    } finally { await failRecords(false); }
    const saved = await row(id);
    assert.equal(count(id), 1, 'Repeated stale recovery accepted another fake provider job');
    assert.deepEqual(requeues, [false, false]);
    assert.equal(saved.attempts, 1); assert.equal(saved.status, 'submitting'); assert.equal(saved.job_handle, null);
    return 'Aged handle-less claims stayed parked through two retries; one fake provider submission total.';
  });
  await scenario(4, async () => {
    const id = 'aged-handle'; await seed(id); const handle = await claimAndSubmit(id);
    assert.equal((await ok(id, 'record', { attempt: 1, jobHandle: handle })).changed, true);
    await age(id);
    assert.equal((await ok(id, 'requeue', { attempt: 1 })).changed, false);
    const resumed = await ok(id, 'claim');
    assert.equal(resumed.claimed, false);
    assert.deepEqual(resumed.scene.job_handle, handle);
    assert.equal((await ok(id, 'complete', { attempt: resumed.scene.attempts, videoUrl: poll(resumed.scene.job_handle) })).changed, true);
    assert.equal((await row(id)).status, 'done'); assert.equal(count(id), 1);
    return 'An aged rendering row retained its saved handle and completed by polling it.';
  });
  await scenario(5, async () => {
    const id = 'late-record'; await seed(id); const oldHandle = await claimAndSubmit(id);
    assert.equal((await ok(id, 'record', { attempt: 1, jobHandle: oldHandle })).changed, true);
    assert.equal((await ok(id, 'complete', { attempt: 1, videoUrl: poll(oldHandle) })).changed, true);
    assert.equal((await ok(id, 'requeue', { attempt: 1 })).changed, true);
    const newHandle = await claimAndSubmit(id);
    assert.equal((await row(id)).attempts, 2);
    const lateRecord = await ok(id, 'record', { attempt: 1, jobHandle: oldHandle });
    const currentRecord = await ok(id, 'record', { attempt: 2, jobHandle: newHandle });
    assert.equal(lateRecord.changed, false, 'The old attempt recorded its handle into the newer claim');
    assert.equal(currentRecord.changed, true);
    const rendering = await row(id);
    assert.deepEqual(rendering.job_handle, newHandle);
    assert.equal((await ok(id, 'complete', { attempt: 1, videoUrl: poll(oldHandle) })).changed, false);
    assert.equal((await ok(id, 'flag', { attempt: 1, reason: 'old failure' })).changed, false);
    assert.equal((await ok(id, 'flag', { reason: 'image_check: late image verdict' })).changed, false);
    assert.deepEqual(await row(id), rendering);
    assert.equal((await ok(id, 'complete', { attempt: 2, videoUrl: poll(newHandle) })).changed, true);
    const completed = await row(id);
    assert.equal((await ok(id, 'requeue', { attempt: 1 })).changed, false);
    assert.deepEqual(await row(id), completed); assert.equal(count(id), 2);
    return 'After an explicit reshoot of a finished clip, late writes from the old attempt and an unfenced image flag left the new handle and output intact.';
  });
  await scenario(6, async () => {
    const id = 'ownership'; await seed(id); const before = await row(id);
    for (const action of ['claim', 'requeue', 'record', 'complete']) {
      const fields = action === 'record' ? { attempt: 1, jobHandle: { id: 'unowned' } } : action === 'complete' ? { attempt: 1, videoUrl: 'https://media.invalid/unowned.mp4' } : { attempt: 1 };
      assert.equal((await advance(id, action, fields, 'stranger')).status, 403);
    }
    assert.equal((await advance(id, 'claim', {}, '')).status, 401);
    assert.equal((await advance(id, 'claim', {}, 'invalid')).status, 401);
    assert.deepEqual(await row(id), before);
    return 'Actual handler ownership predicate denies writes; synthetic invalid/missing tokens denied; row unchanged.';
  });
  await scenario(7, async () => {
    const id = 'finished'; await seed(id); const handle = await claimAndSubmit(id);
    assert.equal((await ok(id, 'record', { attempt: 1, jobHandle: handle })).changed, true);
    const url = poll(handle);
    assert.equal((await ok(id, 'complete', { attempt: 1, videoUrl: url })).changed, true);
    const resumed = await ok(id, 'claim'); assert.equal(resumed.claimed, false);
    assert.equal(resumed.scene.video_url, url); assert.equal(count(id), 1);
    assert.equal((await row(id)).status, 'done');
    return 'Completed URL returned on claim; scripted caller reuses it without new provider acceptance.';
  });
  await scenario(8, async () => {
    const id = 'db-outage'; await seed(id); const handle = await claimAndSubmit(id);
    assert.equal((await row(id)).job_handle, null);
    await command(process.env.RECOVERY_PG_CTL!, ['-D', process.env.RECOVERY_CLUSTER!, '-m', 'immediate', '-w', '-t', '10', 'stop']);
    const response = await advance(id, 'record', { attempt: 1, jobHandle: handle });
    assert.equal(response.status, 500); assert.equal(response.body.error, 'write_failed');
    return 'Owned PostgreSQL server stopped; handler returns write_failed instead of reporting a durable handle.';
  });
} catch (error) { failure = error; }
finally {
  server.closeAllConnections(); await new Promise<void>(accept => server.close(() => accept()));
  globalThis.fetch = realFetch;
  await writeFile(join(evidence, 'report.json'), JSON.stringify({ checks, timeline, acceptedJobs: jobs, polls,
    limitations: ['Real Supabase Auth, hosted deployment, RLS rollout and production rate limiting (synthetic auth and allowed rate-limit seam).',
      'Actual provider billing/idempotency, customer-credit metering, browser recovery, full producer orchestration and customer approval gates.'] }, null, 2));
}
if (failure) console.error(failure);
if (failure || checks.some(check => check.status !== 'PASS')) process.exitCode = 1;
