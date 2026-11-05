#!/usr/bin/env node
// Owns a disposable PostgreSQL cluster. No application credentials or hosted services.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') {
  console.log(`Usage: npm run verify:provider-recovery [-- --fail-on-known-risk]
Requires Node 24, PG_BIN_DIR (initdb, pg_ctl, psql) and POSTGREST_PATH.
Creates a fresh local cluster, uses unchanged scene SQL and the actual advance
handler through Supabase JS and PostgREST, then removes only its own cluster.
No .env files, application credentials, paid providers or external URLs.
Reports live under .tmp/provider-recovery/<run>/report.{json,md}.
Normal mode characterizes known risks; --fail-on-known-risk exits 2 when risks
reproduce. This is a negative control for this baseline, not a future safety gate.
This is a handler/persistence harness, not browser, real-auth or provider proof.`);
  process.exit(0);
}
assert.ok(args.length === 0 || (args.length === 1 && args[0] === '--fail-on-known-risk'), 'Unknown arguments; use --help');
assert.ok(process.env.PG_BIN_DIR, 'PG_BIN_DIR is required');
assert.ok(process.env.POSTGREST_PATH, 'POSTGREST_PATH is required');
const suffix = process.platform === 'win32' ? '.exe' : '';
const pg = Object.fromEntries(['initdb', 'pg_ctl', 'psql'].map(name => [name, resolve(process.env.PG_BIN_DIR, name + suffix)]));
const postgrest = resolve(process.env.POSTGREST_PATH);
await Promise.all([...Object.values(pg), postgrest].map(path => access(path)));
const evidence = join(root, '.tmp', 'provider-recovery', randomUUID());
const data = join(evidence, 'cluster');
await mkdir(evidence, { recursive: true });

// Deliberate allowlist: no PG service files, NODE_OPTIONS, live flags or app secrets.
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL']) {
  if (process.env[key]) env[key] = process.env[key];
}
env.PGCONNECT_TIMEOUT = '5';
env.PGCLIENTENCODING = 'UTF8';
env.PGPASSFILE = join(evidence, 'no-password-file');
env.PATH = `${resolve(process.env.PG_BIN_DIR)}${delimiter}${env.PATH ?? env.Path ?? ''}`;
delete env.Path;
const owned = new Set();
function command(executable, argv, extra = {}, timeout = 30_000, input) {
  return new Promise((accept, reject) => {
    const child = spawn(executable, argv, { cwd: root, env: { ...env, ...extra }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    owned.add(child);
    let output = '';
    child.stdout.on('data', b => { output += b; });
    child.stderr.on('data', b => { output += b; });
    const timer = setTimeout(() => { child.kill(); reject(new Error(`${executable} timed out`)); }, timeout);
    child.on('error', error => { clearTimeout(timer); owned.delete(child); reject(error); });
    // pg_ctl's Windows server child can inherit pipe handles after pg_ctl exits.
    child.on(executable === pg.pg_ctl ? 'exit' : 'close', code => {
      clearTimeout(timer); owned.delete(child);
      if (executable === pg.pg_ctl) { child.stdout.destroy(); child.stderr.destroy(); }
      if (code !== 0) reject(new Error(`${executable} exited ${code}: ${output.trim()}`));
      else accept(output.trim());
    });
    child.stdin.on('error', () => {}); // Exit code/timeout carries command failure.
    child.stdin.end(input);
  });
}
async function freePort() {
  const server = createServer();
  await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
  const port = server.address().port;
  await new Promise(accept => server.close(accept));
  return port;
}
const dbPort = await freePort();
let restPort = await freePort();
while (restPort === dbPort) restPort = await freePort();
const pgEnv = { PGHOST: '127.0.0.1', PGPORT: String(dbPort), PGUSER: 'postgres', PGDATABASE: 'postgres' };
const sql = statement => command(pg.psql, ['-X', '-q', '-A', '-t', '-w', '-v', 'ON_ERROR_STOP=1'], pgEnv, 30_000, statement);
const sources = ['api/producer/advance.ts', 'supabase/producer_runs.sql', 'tools/verify-provider-recovery.mjs',
  'tests/provider-recovery/scenarios.ts', 'tests/provider-recovery/bootstrap.sql', 'tests/provider-recovery/serverSeams.ts'];
const sourceHashes = Object.fromEntries(await Promise.all(sources.map(async path => [path, createHash('sha256').update(await readFile(join(root, path))).digest('hex')])));
let started = false;
let stopped = true;
let rest;
let restExited;
let failure;
let result;
try {
  await command(pg.initdb, ['-D', data, '-U', 'postgres', '--auth=trust', '--no-locale', '--encoding=UTF8', '--no-sync'], {}, 60_000);
  // Disable Unix-domain sockets as well; this cluster listens only on IPv4 loopback.
  started = true;
  stopped = false;
  await command(pg.pg_ctl, ['-D', data, '-l', join(evidence, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${dbPort} -k ""`, '-w', '-t', '20', 'start']);
  const identity = JSON.parse(await sql("select json_build_object('address',host(inet_server_addr()),'port',inet_server_port(),'database',current_database(),'directory',current_setting('data_directory'),'version',version());"));
  assert.equal(identity.address, '127.0.0.1');
  assert.equal(identity.port, dbPort);
  assert.equal(identity.database, 'postgres');
  assert.equal(resolve(identity.directory).toLowerCase(), resolve(data).toLowerCase(), 'Database is not the owned cluster');
  console.log('Owned PostgreSQL cluster ready; loading unchanged production scene SQL.');
  const bootstrap = await readFile(join(root, 'tests/provider-recovery/bootstrap.sql'), 'utf8');
  const productionSql = await readFile(join(root, 'supabase/producer_runs.sql'), 'utf8');
  await sql(`${bootstrap}\n${productionSql}\ngrant usage on schema public to service_role; grant all on all tables in schema public to service_role;`);
  const config = join(evidence, 'postgrest.conf');
  await writeFile(config, `db-uri = "postgresql://postgres@127.0.0.1:${dbPort}/postgres"\ndb-schemas = "public"\ndb-anon-role = "service_role"\nserver-host = "127.0.0.1"\nserver-port = ${restPort}\ndb-pool = 4\ndb-pool-acquisition-timeout = 3\n`);
  const restLog = [];
  rest = spawn(postgrest, [config], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  owned.add(rest);
  rest.stdout.on('data', b => restLog.push(String(b)));
  rest.stderr.on('data', b => restLog.push(String(b)));
  let restError;
  rest.on('error', error => { restError = error; });
  restExited = new Promise(accept => rest.on('close', code => { owned.delete(rest); accept(code); }));
  const restUrl = `http://127.0.0.1:${restPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (restError) throw restError;
    if (rest.exitCode !== null) throw new Error(`PostgREST exited: ${restLog.join('')}`);
    try { ready = (await fetch(`${restUrl}/producer_scenes?limit=0`, { signal: AbortSignal.timeout(500), redirect: 'error' })).ok; } catch { /* bounded startup */ }
    if (ready) break;
    await new Promise(accept => setTimeout(accept, 100));
  }
  assert.ok(ready, `PostgREST did not become ready: ${restLog.join('')}`);
  console.log('Owned PostgREST ready; executing handler-boundary scenarios.');
  const { build } = await import('esbuild');
  const bundle = join(evidence, 'scenarios.mjs');
  await build({
    entryPoints: [join(root, 'tests/provider-recovery/scenarios.ts')], outfile: bundle,
    platform: 'node', target: 'node24', format: 'esm', bundle: true, packages: 'external',
    plugins: [{ name: 'isolated-server-seams', setup(builder) {
      builder.onResolve({ filter: /\/(_lib\/)?supabaseAdmin\.js$/ }, () => ({ path: join(root, 'tests/provider-recovery/serverSeams.ts') }));
      builder.onResolve({ filter: /\/(_lib\/)?rateLimit\.js$/ }, () => ({ path: join(root, 'tests/provider-recovery/serverSeams.ts') }));
    } }],
  });
  const metadata = { revision: await command('git', ['rev-parse', 'HEAD']), sourceHashes, postgres: identity.version,
    postgrest: await command(postgrest, ['--version']) };
  await writeFile(join(evidence, 'source.json'), JSON.stringify(metadata, null, 2));
  await command(process.execPath, [bundle], {
    ...pgEnv, RECOVERY_REST_URL: restUrl, RECOVERY_EVIDENCE: evidence,
    RECOVERY_PSQL: pg.psql, RECOVERY_PG_CTL: pg.pg_ctl, RECOVERY_CLUSTER: data,
  }, 90_000);
  result = JSON.parse(await readFile(join(evidence, 'report.json'), 'utf8'));
  assert.equal(result.checks.length, 9, 'Incomplete scenario coverage');
  assert.ok(result.checks.every(check => check.status === 'PASS'), 'A scenario failed or did not run');
  result.source = metadata;
} catch (error) {
  failure = error;
  try { result = JSON.parse(await readFile(join(evidence, 'report.json'), 'utf8')); } catch { /* setup failure */ }
} finally {
  if (rest && rest.exitCode === null) rest.kill();
  if (restExited) {
    let timer;
    try { await Promise.race([restExited, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('PostgREST did not stop')), 5000); })]); }
    catch (error) { failure ??= error; }
    finally { clearTimeout(timer); }
  }
  for (const child of owned) child.kill();
  if (started) {
    try { await command(pg.pg_ctl, ['-D', data, '-m', 'immediate', '-w', '-t', '15', 'stop']); stopped = true; }
    catch (error) {
      // The final outage case intentionally stopped this owned cluster.
      try { await command(pg.pg_ctl, ['-D', data, 'status']); failure ??= error; }
      catch (statusError) {
        if (statusError.message.includes('exited 3:')) stopped = true;
        else failure ??= error;
      }
    }
  }
  try {
    // Only the generated cluster under this run's unique evidence directory.
    assert.equal(resolve(data), resolve(evidence, 'cluster'));
    if (stopped) await rm(data, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    else failure ??= new Error(`Cannot establish PostgreSQL stopped; owned cluster retained at ${data}`);
  } catch (error) { failure ??= error; }
}
result ??= { checks: ['Concurrent claimers', 'Committed record, lost response', 'Failed record, fresh recovery',
  'Repeated stale recovery', 'Strict ten-minute threshold', 'Late old-attempt record',
  'Wrong user and invalid auth', 'Completed clip reuse', 'Database outage'].map(name => ({ name, status: 'NOT RUN', detail: 'Setup failed before execution.' })), risks: [], limitations: [] };
result.status = failure ? 'FAIL' : 'PASS';
result.mode = args.includes('--fail-on-known-risk') ? 'negative-control' : 'characterization';
result.exitCode = failure ? 1 : (result.mode === 'negative-control' && result.risks.length ? 2 : 0);
result.safety = result.risks.length ? 'KNOWN RISK' : (failure ? 'NOT ASSESSED' : 'NO RISK OBSERVED');
result.cleanup = !stopped ? `PostgreSQL stop unconfirmed; cluster retained at ${data}`
  : failure ? 'See failure; owned resources cleanup attempted' : 'Owned PostgreSQL cluster removed; PostgREST stopped';
result.source ??= { sourceHashes };
if (failure) result.error = failure.message;
await writeFile(join(evidence, 'report.json'), JSON.stringify(result, null, 2));
const lines = [`# Provider recovery: ${result.status}`, '', `Mode: ${result.mode}; exit code: ${result.exitCode}.`, '', `Safety: **${result.safety}**. A passing characterization is not a safety certification.`, '',
  `Source revision: ${result.source.revision ?? 'not established'}; per-file SHA-256 identities are in report.json.`, '',
  ...result.checks.map(check => `- ${check.status}: ${check.name}. ${check.detail ?? ''}`), '',
  ...result.risks.map(risk => `- KNOWN RISK: ${risk}`), '', ...result.limitations.map(line => `- NOT RUN: ${line}`), '', result.cleanup];
if (failure) lines.push('', `Failure: ${failure.message}`);
await writeFile(join(evidence, 'report.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
console.log(`Evidence: ${evidence}`);
process.exitCode = result.exitCode;
