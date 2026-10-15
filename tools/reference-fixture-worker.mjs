import { writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_FIXTURE_DB, DEFAULT_STEP_MS, fixturePath, fixtureStepMs, loadFixtureDomain, openFixtureJournal } from './reference-fixture-journal.mjs';

export async function runFixtureWorker({ dbPath = DEFAULT_FIXTURE_DB, stepMs = DEFAULT_STEP_MS, statusFile } = {}) {
  const loaded = await loadFixtureDomain();
  const journal = openFixtureJournal({ dbPath, domain: loaded.domain, stepMs });
  const statusPath = statusFile ? fixturePath(statusFile) : null;
  let stopped = false, timer, finish, closed = false;
  function status(state) {
    if (!statusPath) return;
    mkdirSync(path.dirname(statusPath), { recursive: true });
    const temporary = `${statusPath}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify({ version: 1, fixture: true, pid: process.pid, dbPath: journal.dbPath, state, updatedAt: Date.now() }));
    renameSync(temporary, statusPath);
  }
  const finished = new Promise(resolve => {
    finish = resolve;
    function poll() {
      if (stopped) { resolve(); return; }
      try { journal.tickDue(); }
      catch (error) { process.exitCode = 1; console.error(`Fixture worker stopped: ${error.code ?? error.message}`); stopped = true; resolve(); return; }
      timer = setTimeout(poll, 50);
    }
    timer = setTimeout(poll, 0);
  });
  const stop = () => { stopped = true; clearTimeout(timer); finish(); };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  status('running');
  process.stdout.write(`Fixture worker ready: ${process.pid}\n`);
  async function cleanup() {
    if (closed) return;
    closed = true;
    process.removeListener('SIGTERM', stop); process.removeListener('SIGINT', stop);
    journal.close(); await loaded.close(); status('stopped');
  }
  return { pid: process.pid, async close() { stop(); await cleanup(); }, async wait() { await finished; await cleanup(); } };
}
function options(args) {
  const values = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index], value = args[++index];
    if (!value || !['--jobs-db', '--step-ms', '--worker-status'].includes(flag)) throw new Error(`Unknown or incomplete fixture worker option: ${flag}`);
    if (flag === '--jobs-db') values.dbPath = fixturePath(value);
    if (flag === '--step-ms') values.stepMs = fixtureStepMs(value);
    if (flag === '--worker-status') values.statusFile = fixturePath(value);
  }
  return values;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const worker = await runFixtureWorker(options(process.argv.slice(2))); await worker.wait(); }
  catch (error) { console.error(`Fixture worker failed: ${error.message}`); process.exitCode = 1; }
}
