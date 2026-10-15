import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DEFAULT_FIXTURE_DB, DEFAULT_STEP_MS, FIXTURE_USERS, FixtureJobError, fixturePath, fixtureStepMs, openFixtureJournal } from './reference-fixture-journal.mjs';

const prefix = '/__companion-fixture-jobs';
const root = fileURLToPath(new URL('../', import.meta.url));
const maxBodyBytes = 262_144;
function json(response, status, value) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-content-type-options', 'nosniff');
  response.end(JSON.stringify(value));
}
function readJson(request) {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')) throw new FixtureJobError('JSON_REQUIRED', 415);
  if (Number(request.headers['content-length'] ?? 0) > maxBodyBytes) throw new FixtureJobError('BODY_TOO_LARGE', 413);
  return new Promise((resolve, reject) => {
    const chunks = []; let bytes = 0, failed = false;
    request.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > maxBodyBytes) { failed = true; reject(new FixtureJobError('BODY_TOO_LARGE', 413)); return; }
      if (!failed) chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => {
      if (failed) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new FixtureJobError('INVALID_JSON', 400)); }
    });
  });
}
function fixtureBoundary(request, port) {
  const hosts = [`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`];
  const host = request.headers.host, origin = request.headers.origin;
  if (!hosts.includes(host) || (origin !== undefined && !hosts.some(value => origin === `http://${value}`))
    || request.headers['sec-fetch-site'] === 'cross-site') throw new FixtureJobError('LOCAL_ORIGIN_REQUIRED', 403);
  const owner = request.headers['x-grifon-fixture-user'];
  if (!FIXTURE_USERS.has(owner)) throw new FixtureJobError('FIXTURE_OWNER_REQUIRED', 403);
  return owner;
}
export async function startRecoveryServer({ referenceJobs = false, port = 5173, dbPath = DEFAULT_FIXTURE_DB, workerStatus, stepMs = DEFAULT_STEP_MS } = {}) {
  if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('Use an unprivileged local port.');
  const duration = fixtureStepMs(stepMs);
  let journal, worker, closing = false;
  // A fixture-only frontend server: never load .env or the live API middleware.
  const server = await createServer({
  root,
  configFile: false,
  envFile: false,
  envDir: false,
  ...(referenceJobs ? { optimizeDeps: { entries: ['companion-chat-preview.html'] } } : {}),
  plugins: [react(), {
    name: 'recovery-deny-api',
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        const url = new URL(request.url ?? '/', `http://localhost:${port}`);
        if (url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)) {
          if (!referenceJobs) { json(response, 404, { error: 'FIXTURE_HOST_DISABLED' }); return; }
          void (async () => {
            try {
              const owner = fixtureBoundary(request, port);
              if (url.pathname === `${prefix}/job` && request.method === 'GET') {
                const requestId = url.searchParams.get('requestId'), chatId = url.searchParams.get('chatId');
                if (!/^[a-f0-9]{64}$/.test(requestId ?? '') || !chatId || chatId.length > 200 || /[\u0000-\u001f]/.test(chatId)) throw new FixtureJobError('INVALID_LOOKUP', 400);
                const result = journal.get(requestId, owner, chatId);
                json(response, result ? 200 : 404, result ?? { error: 'JOB_NOT_FOUND' });
              } else if (url.pathname === `${prefix}/start` && request.method === 'POST') {
                const body = await readJson(request);
                if (!body || typeof body !== 'object' || !body.intent) throw new FixtureJobError('INVALID_BODY', 400);
                json(response, 200, await journal.start(body.intent, owner));
              } else if (url.pathname === `${prefix}/command` && request.method === 'POST') {
                const body = await readJson(request);
                if (!body || typeof body !== 'object' || !body.intent) throw new FixtureJobError('INVALID_BODY', 400);
                json(response, 200, await journal.command(body, owner));
              } else json(response, 404, { error: 'FIXTURE_ROUTE_NOT_FOUND' });
            } catch (error) { json(response, error.status ?? 500, { error: error.code ?? 'FIXTURE_HOST_ERROR' }); }
          })();
          return;
        }
        if (url.pathname.startsWith('/api/') && !(/^\/api\/_lib\/[\w/-]+\.ts$/.test(url.pathname) && request.method === 'GET')) {
          response.statusCode = 503;
          response.end('Recovery verification requires a mocked API response.');
          return;
        }
        next();
      });
    },
  }],
  server: { host: 'localhost', port, strictPort: true, fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.tmp/**'] }, watch: { ignored: ['**/.tmp/**', '**/.tools/**', '**/.playwright-mcp/**'] } },
});
  async function close() {
    if (closing) return;
    closing = true;
    if (worker && worker.exitCode === null && worker.signalCode === null) {
      const exited = new Promise(resolve => worker.once('exit', resolve));
      worker.kill();
      await exited;
    }
    journal?.close();
    await server.close();
  }
  try {
    if (referenceJobs) {
      const [queue, protocol] = await Promise.all([server.ssrLoadModule('/services/companionReferenceQueue.ts'), server.ssrLoadModule('/services/companionFixtureJobs.ts')]);
      journal = openFixtureJournal({ dbPath, domain: { ...queue, ...protocol }, stepMs: duration });
    }
    await server.listen();
    if (referenceJobs) {
      const args = [path.join(root, 'tools/reference-fixture-worker.mjs'), '--jobs-db', journal.dbPath, '--step-ms', String(duration)];
      if (workerStatus) args.push('--worker-status', fixturePath(workerStatus));
      worker = spawn(process.execPath, args, { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      worker.stdout.on('data', data => process.stdout.write(data));
      worker.stderr.on('data', data => process.stderr.write(data));
      worker.on('error', error => { console.error(`Fixture worker launch failed: ${error.message}`); });
      worker.on('exit', (code, signal) => { if (!closing) console.error(`Fixture worker exited (${code ?? signal}); restart the local host or standalone worker with the same journal to resume.`); });
    }
    return { server, journal, worker, close };
  } catch (error) { await close(); throw error; }
}
function options(args) {
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--reference-jobs') { values.referenceJobs = true; continue; }
    const value = args[++index];
    if (!value || !['--port', '--jobs-db', '--worker-status', '--step-ms'].includes(flag)) throw new Error(`Unknown or incomplete recovery server option: ${flag}`);
    if (flag === '--port') values.port = Number(value);
    if (flag === '--jobs-db') values.dbPath = fixturePath(value);
    if (flag === '--worker-status') values.workerStatus = fixturePath(value);
    if (flag === '--step-ms') values.stepMs = fixtureStepMs(value);
  }
  if (!values.referenceJobs && (values.dbPath || values.workerStatus || values.stepMs)) throw new Error('Fixture job options require --reference-jobs.');
  return values;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const host = await startRecoveryServer(options(process.argv.slice(2)));
    const shutdown = () => { void host.close().then(() => { process.exitCode = 0; }); };
    process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
    process.stdout.write(`Recovery fixture host ready: http://localhost:${host.server.config.server.port}\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
