#!/usr/bin/env node
// Uses independent PostgreSQL backends. Never connects to Supabase or loads .env.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`Usage: node tools/verify-finished-ad-meter.mjs --isolated-test-server

Requires Node 24 and psql (or PSQL_PATH), and a fresh, dedicated local PostgreSQL
test cluster. Set PGHOST=127.0.0.1, PGPORT=<test port>, PGUSER=postgres and
PGDATABASE=grifon_meter_test. The empty admin test database must already exist.
Password authentication may use inherited PGPASSWORD; credentials are not logged.
No application dependencies, provider calls, .env files or remote databases.

The verifier refuses existing Supabase roles, other non-system databases and
non-loopback servers. It creates/drops one randomly named database and the three
bootstrap roles only. Every wait is bounded; a failed check exits nonzero.
The frozen original helper must demonstrate duplicate charges before the real
migration is tested for concurrency, rollback, replay and role permissions.`);
  process.exit(0);
}
assert.deepEqual(args, ['--isolated-test-server'], 'Explicit isolated-test-server opt-in required');
assert.ok(['127.0.0.1', 'localhost', '::1'].includes(process.env.PGHOST), 'PGHOST must be explicit loopback');
assert.match(process.env.PGPORT ?? '', /^\d+$/, 'PGPORT must be explicit');
assert.ok(Number(process.env.PGPORT) > 0 && Number(process.env.PGPORT) < 65536, 'Invalid PGPORT');
assert.equal(process.env.PGUSER, 'postgres', 'Use the isolated test cluster postgres role');
assert.equal(process.env.PGDATABASE, 'grifon_meter_test', 'PGDATABASE must be grifon_meter_test');

const adminDatabase = 'grifon_meter_test';
const database = `grifon_meter_test_${randomBytes(10).toString('hex')}`;
const env = { ...process.env, PGCONNECT_TIMEOUT: '5' };
// Do not let libpq service/address/options override the explicit isolated target.
for (const name of ['PGSERVICE', 'PGSERVICEFILE', 'PGHOSTADDR', 'PGOPTIONS']) delete env[name];
const sessions = new Set();
const results = [];
let createdDatabase = false;
let createdRoles = false;

class Session {
  constructor(db = database) {
    this.child = spawn(process.env.PSQL_PATH || 'psql', ['-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1', '-d', db], {
      cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
    });
    this.output = '';
    this.errors = '';
    this.pending = null;
    this.closed = false;
    sessions.add(this);
    this.child.stdout.setEncoding('utf8');
    this.child.stderr.setEncoding('utf8');
    this.child.stdout.on('data', data => { this.output += data; this.flush(); });
    this.child.stderr.on('data', data => { this.errors += data; });
    this.child.on('error', error => this.fail(error));
    this.exited = new Promise(resolve => this.child.on('close', code => {
      this.closed = true;
      sessions.delete(this);
      this.fail(new Error(`psql exited ${code}: ${this.errors.trim()}`));
      resolve(code);
    }));
    this.child.stdin.on('error', error => this.fail(error));
  }
  fail(error) {
    if (!this.pending) return;
    clearTimeout(this.pending.timer);
    this.pending.reject(error);
    this.pending = null;
  }
  flush() {
    if (!this.pending) return;
    const index = this.output.indexOf(this.pending.marker);
    if (index < 0) return;
    const value = this.output.slice(0, index).trim();
    this.output = this.output.slice(index + this.pending.marker.length).replace(/^\r?\n/, '');
    clearTimeout(this.pending.timer);
    this.pending.resolve(value);
    this.pending = null;
  }
  query(sql) {
    assert.ok(!this.pending && !this.closed, 'Session is not ready');
    const marker = `__meter_done_${randomBytes(12).toString('hex')}__`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.fail(new Error('psql statement exceeded 15 seconds'));
        this.child.kill();
      }, 15_000);
      this.pending = { resolve, reject, timer, marker };
      this.child.stdin.write(`${sql}\n\\echo ${marker}\n`);
    });
  }
  async close() {
    if (!this.closed) this.child.stdin.end('\\q\n');
    await this.exited;
  }
}

async function one(sql, db = database) {
  const session = new Session(db);
  try { return await session.query(sql); }
  finally { await session.close(); }
}
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const json = async (sql, db = database) => JSON.parse(await one(sql, db));
const user = '20000000-0000-0000-0000-000000000001';
const monthKey = unit => `${literal(unit)} || ':monthly:' || to_char(now() at time zone 'UTC', 'YYYY-MM') || ':${user}'`;
const receiptKey = (unit, ad) => `${unit === 'video_ads' ? 'vidjob' : 'omniad'}:${user}:${ad}`;
const call = (unit, ad, limit) => `select public.consume_finished_ad('${user}', ${literal(unit)}, ${literal(ad)}, ${limit});`;

async function reset(credits = 0) {
  await one(`truncate public.rate_limits; delete from public.subscriptions;
    select public.grant_credits('${user}', ${credits}, 0, ${credits});`);
}
async function state(unit) {
  return json(`select json_build_object('monthly', coalesce((select count from public.rate_limits where key = ${monthKey(unit)}), 0),
    'credits', (select ${unit === 'video_ads' ? 'video_ad_credits' : 'omni_style_credits'} from public.subscriptions where user_id = '${user}'),
    'receipts', (select count(*) from public.rate_limits where key like '${unit === 'video_ads' ? 'vidjob' : 'omniad'}:${user}:%' and count = 1));`);
}
async function serviceSession() {
  const session = new Session();
  const pid = Number(await session.query(`set statement_timeout = '12s'; set idle_in_transaction_session_timeout = '20s';
    select pg_backend_pid(); set role service_role;`));
  assert.ok(Number.isInteger(pid) && pid > 0, 'Independent backend PID required');
  return { session, pid };
}
async function waitForLock(waiter, holder) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const observed = await json(`select json_build_object('wait', wait_event_type, 'blockers', pg_blocking_pids(pid))
      from pg_stat_activity where pid = ${waiter};`);
    if (observed.wait === 'Lock' && observed.blockers.includes(holder)) return observed;
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  throw new Error(`Backend ${waiter} was not observed waiting for holder ${holder}`);
}
async function concurrent(name, unit, firstAd, secondAd, limit, credits, rollback, expected) {
  await reset(credits);
  const a = await serviceSession();
  const b = await serviceSession();
  assert.notEqual(a.pid, b.pid);
  try {
    const first = JSON.parse(await a.session.query(`begin; ${call(unit, firstAd, limit)}`));
    assert.equal(first.allowed, true, `${name}: holder must consume before blocking waiter`);
    // The second RPC starts only after A has returned while retaining its locks.
    const pending = b.session.query(call(unit, secondAd, limit));
    // Attach a handler immediately, including while the observer connection runs.
    pending.catch(() => {});
    const observed = await waitForLock(b.pid, a.pid);
    await a.session.query(rollback ? 'rollback;' : 'commit;');
    const second = JSON.parse(await pending);
    assert.equal(second.allowed, expected.allowed, `${name}: waiter allowance`);
    assert.equal(second.alreadyCounted, expected.alreadyCounted, `${name}: waiter receipt`);
    assert.equal(second.fromCredit, expected.fromCredit, `${name}: waiter funding`);
    assert.deepEqual(await state(unit), expected.state, `${name}: durable totals`);
    results.push({ name: `${unit}: ${name}`, holderPid: a.pid, waiterPid: b.pid, observed, first, second, state: expected.state });
    console.log(`PASS ${unit}: ${name} (backends ${a.pid}/${b.pid}, observed Lock held by ${a.pid})`);
  } finally {
    // Close A first so failure cleanup releases any held transaction.
    await a.session.close();
    await b.session.close();
  }
}

async function originalDefect() {
  // Exact quota.ts from 8d5a4be, Git blob 2f01d8e57ff80c12104b67249b857d03f398bc5e.
  // Only imports/exports are removed;
  // the original helpers and their branching/order execute unchanged.
  const source = await readFile(new URL('../tests/sql/finished-ad-meter-legacy-quota.txt', import.meta.url), 'utf8');
  const digest = createHash('sha256').update(source).digest('hex');
  assert.equal(digest, 'f8a9622495830bd5d65fbcac19c6801d510d10a85f5e5fc08bf167b76f3fe826', 'Frozen original quota source changed');
  const executable = stripTypeScriptTypes(source, { mode: 'strip' })
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
  for (const unit of ['video_ads', 'omni_ads']) {
    for (const funding of ['monthly', 'topup']) {
      await reset(funding === 'topup' ? 2 : 0);
      let reads = 0;
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      const key = receiptKey(unit, 'original-same-ad');
      const admin = () => ({ from: () => ({ select: () => ({ eq: (_column, value) => ({ maybeSingle: async () => {
        const data = await json(`select coalesce((select json_build_object('count', count, 'window_start', window_start)
          from public.rate_limits where key = ${literal(value)}), 'null'::json);`);
        if (value === key) {
          assert.equal(data, null, 'Original receipt reads must both precede debit');
          reads += 1;
          if (reads === 2) release();
          await barrier;
        }
        return { data, error: null };
      } }) }) }), });
      const rateLimitCheck = async (value, limit, window) =>
        (await one(`select public.rate_limit_check(${literal(value)}, ${limit}, ${window});`)) === 't';
      const consumeCredit = async (_user, kind) =>
        (await one(`select public.consume_credit('${user}', ${literal(kind)});`)) === 't';
      const helpers = new Function('getSupabaseAdmin', 'rateLimitCheck', 'consumeCredit', 'peekCredits',
        `${executable}\nreturn { consumeFinishedAd, consumeOmniAd };`)(admin, rateLimitCheck, consumeCredit, () => { throw new Error('Unexpected original credit peek'); });
      const helper = unit === 'video_ads' ? helpers.consumeFinishedAd : helpers.consumeOmniAd;
      const plan = funding === 'topup' ? 'free' : 'business';
      const replies = await Promise.all([helper(user, plan, 'original-same-ad'), helper(user, plan, 'original-same-ad')]);
      assert.equal(reads, 2);
      assert.ok(replies.every(reply => reply.allowed), 'Original duplicate submissions must both be allowed');
      const totals = await state(unit);
      const debits = funding === 'monthly' ? totals.monthly : 2 - totals.credits;
      // This is the same exactly-one-debit invariant used by the fixed cases.
      // Missing RPC or a failed setup is NOT accepted as original-defect proof.
      let rejected = false;
      try { assert.equal(debits, 1, 'A finished ad must spend exactly one unit'); }
      catch (error) { if (error.code !== 'ERR_ASSERTION') throw error; rejected = true; }
      assert.ok(rejected && debits === 2, 'Verifier failed to detect original duplicate charge');
      results.push({ name: `${unit}: original ${funding} duplicate-charge rejection`, sourceSha256: digest, reads, debits, totals });
      console.log(`EXPECTED FAIL ${unit}: original ${funding} helper charged ${debits} units for one ad`);
    }
  }
}

async function roles() {
  await reset();
  for (const role of ['anon', 'authenticated']) {
    let denied = false;
    try { await one(`set role ${role}; ${call('video_ads', 'role-check', 1)}`); }
    catch (error) { assert.match(error.message, /permission denied for function consume_finished_ad/); denied = true; }
    assert.ok(denied, `${role} must be denied by an actual SET ROLE call`);
    assert.deepEqual(await state('video_ads'), { monthly: 0, credits: 0, receipts: 0 });
    results.push({ name: `SET ROLE ${role}: denied` });
  }
  const allowed = JSON.parse(await one(`set role service_role; ${call('video_ads', 'role-check', 1)}`));
  assert.equal(allowed.allowed, true);
  results.push({ name: 'SET ROLE service_role: allowed' });
  console.log('PASS actual SET ROLE anon/authenticated denied; service_role allowed');
}

let failure;
try {
  const preflight = await json(`select json_build_object('address', host(inet_server_addr()), 'version', current_setting('server_version'),
    'database', current_database(), 'roles', (select count(*) from pg_roles where rolname in ('anon','authenticated','service_role')),
    'otherDatabases', (select count(*) from pg_database where datname not in ('postgres','template0','template1','grifon_meter_test')),
    'tables', (select count(*) from pg_tables where schemaname not in ('pg_catalog','information_schema')));`, adminDatabase);
  assert.ok(['127.0.0.1', '::1'].includes(preflight.address), 'Server must report a loopback address');
  assert.equal(preflight.database, adminDatabase);
  assert.equal(preflight.roles, 0, 'Requires a fresh isolated cluster without Supabase roles');
  assert.equal(preflight.otherDatabases, 0, 'Refusing a cluster with unrelated databases');
  assert.equal(preflight.tables, 0, 'Admin test database must be empty');
  console.log(`Isolated PostgreSQL ${preflight.version}; no application or provider connections`);
  await one(`create database "${database}";`, adminDatabase);
  createdDatabase = true;
  const schema = await Promise.all(['tests/sql/finished-ad-meter-bootstrap.sql', 'supabase/rate_limit.sql', 'supabase/credits.sql', 'supabase/finished_ad_meter.sql']
    .map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  await one(`begin;\n${schema.join('\n')}\ncommit;`);
  createdRoles = true;
  await one(`set plpgsql.check_asserts = on;\n${await readFile(new URL('../tests/sql/finished-ad-meter.sql', import.meta.url), 'utf8')}`);
  results.push({ name: 'Existing SQL transactional assertions' });
  console.log('PASS existing bootstrap/migrations/transactional assertions');
  await originalDefect();
  for (const unit of ['video_ads', 'omni_ads']) {
    await concurrent('same ad monthly exactly once', unit, 'same', 'same', 1, 0, false,
      { allowed: true, alreadyCounted: true, fromCredit: false, state: { monthly: 1, credits: 0, receipts: 1 } });
    await concurrent('same ad topup exactly once', unit, 'same', 'same', 0, 2, false,
      { allowed: true, alreadyCounted: true, fromCredit: false, state: { monthly: 0, credits: 1, receipts: 1 } });
    await concurrent('different ads last monthly slot', unit, 'first', 'second', 1, 0, false,
      { allowed: false, alreadyCounted: false, fromCredit: false, state: { monthly: 1, credits: 0, receipts: 1 } });
    await concurrent('different ads last topup credit', unit, 'first', 'second', 0, 1, false,
      { allowed: false, alreadyCounted: false, fromCredit: false, state: { monthly: 0, credits: 0, receipts: 1 } });
    await concurrent('rolled back holder then waiter', unit, 'same', 'same', 1, 0, true,
      { allowed: true, alreadyCounted: false, fromCredit: false, state: { monthly: 1, credits: 0, receipts: 1 } });
    await concurrent('rolled back topup holder then waiter', unit, 'same', 'same', 0, 1, true,
      { allowed: true, alreadyCounted: false, fromCredit: true, state: { monthly: 0, credits: 0, receipts: 1 } });
    for (const funding of ['monthly', 'topup']) {
      const limit = funding === 'monthly' ? 1 : 0;
      await reset(funding === 'topup' ? 1 : 0);
      const expected = { monthly: limit, credits: 0, receipts: 1 };
      // Discard the first response after its connection commits, then replay from
      // a new connection. This models a committed debit whose HTTP reply was lost.
      await one(`set role service_role; ${call(unit, 'lost-response', limit)}`);
      const replay = JSON.parse(await one(`set role service_role; ${call(unit, 'lost-response', limit)}`));
      assert.equal(replay.allowed, true);
      assert.equal(replay.alreadyCounted, true);
      assert.equal(replay.fromCredit, false);
      assert.deepEqual(await state(unit), expected);
      await one(`update public.rate_limits set window_start = now() - interval '60 days' where key = ${literal(receiptKey(unit, 'lost-response'))};`);
      const aged = JSON.parse(await one(`set role service_role; ${call(unit, 'lost-response', limit)}`));
      assert.equal(aged.allowed, true);
      assert.equal(aged.alreadyCounted, true);
      assert.deepEqual(await state(unit), expected);
      results.push({ name: `${unit}: ${funding} lost response replay and aged receipt` });
      console.log(`PASS ${unit}: ${funding} lost response replay and aged receipt`);
    }
  }
  await roles();
} catch (error) {
  failure = error;
} finally {
  // End only psql children created by this verifier, before touching its DB.
  for (const session of [...sessions]) session.child.kill();
  await Promise.all([...sessions].map(session => session.exited));
  try {
    if (createdDatabase) await one(`drop database "${database}" with (force);`, adminDatabase);
    if (createdRoles) await one('drop role anon; drop role authenticated; drop role service_role;', adminDatabase);
  } catch (error) { failure ??= error; }
}
if (failure) {
  console.error(`FAIL finished-ad meter: ${failure.message}`);
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: 'PASS', checks: results, cleanup: 'Owned database and bootstrap roles dropped',
    limitations: 'Isolated PostgreSQL only; not target Supabase rollout or PostgREST verification' }, null, 2));
}
