#!/usr/bin/env node
// Rebuild the "Grifon Session Dashboard" artifact page from committed sources.
//
// Unlike the other artifact builders (verified template copies), this page is
// DERIVED: the branch inventory and the executor ledger are computed live from
// git, and the open-issue list is read from a committed JSON snapshot
// (tools/artifacts/data/grifon-session-issues.json — `gh` is not committed and
// the defreezer eats any .tmp/ cache, so the snapshot is refreshed by hand;
// regeneration command is inside that file).
//
// Usage:  node tools/artifacts/build-grifon-session.mjs [--out <path>]
// Then:   publish the emitted HTML with the Artifact tool. If a URL for this
//         artifact is already registered in CLAUDE.md, pass it as `url` so the
//         page REDEPLOYS in place instead of minting a new URL.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TPL = join(REPO_ROOT, 'tools', 'artifacts', 'grifon-session.tpl.html');
const ISSUES = join(REPO_ROOT, 'tools', 'artifacts', 'data', 'grifon-session-issues.json');

// The SessionStart hook caps its "UNMERGED WORK IN FLIGHT" list at this many
// branches (.claude/hooks/session-start.sh). Kept here so the page can say how
// many it hides — if the hook's cap changes, change it here too.
const HOOK_CAP = 12;
const LEDGER_SINCE = '2026-08-02'; // when the Executor: trailer convention started

const outFlag = process.argv.indexOf('--out');
const OUT = outFlag !== -1 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1])
  : join(REPO_ROOT, 'artifacts', 'grifon-session.html');

const git = (...args) =>
  execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ---------------------------------------------------------------- branches
// Every origin/* ref ahead of main, newest-committed first — the same ordering
// the hook uses, so "the first 12" here are exactly the 12 it shows.
function branches() {
  const refs = git('for-each-ref', '--sort=-committerdate',
    '--format=%(refname:short)|%(committerdate:short)', 'refs/remotes/origin')
    .split('\n').filter(Boolean);

  const rows = [];
  for (const line of refs) {
    const [ref, date] = line.split('|');
    if (ref === 'origin' || ref === 'origin/main' || ref === 'origin/HEAD') continue;
    const ahead = Number(git('rev-list', '--count', `origin/main..${ref}`));
    if (!ahead) continue;
    const files = git('diff', '--name-only', `origin/main...${ref}`)
      .split('\n').filter(Boolean).length;
    rows.push({ ref: ref.replace(/^origin\//, ''), date, ahead, files });
  }
  if (!rows.length) throw new Error('BUILD_FAILED: no branches ahead of main — refs missing?');
  return rows;
}

// ---------------------------------------------------------------- ledger
// Parse the lane table out of tools/executor_ledger.mjs. Lanes with zero
// commits do not appear in its output at all — which is the finding this page
// is built around — so absent known lanes are rendered explicitly as zero.
const KNOWN_LANES = ['main-loop', 'code-executor', 'codex-sol'];

function ledger() {
  const raw = execFileSync(process.execPath,
    [join(REPO_ROOT, 'tools', 'executor_ledger.mjs'), `--since=${LEDGER_SINCE}`],
    { cwd: REPO_ROOT, encoding: 'utf8' });

  const header = raw.match(/(\d+)\s+commits scanned\s+·\s+(\d+)\s+carry an Executor trailer\s+\((\d+)%/);
  const lanes = [];
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\S[^\s]*)\s+(\d+)\s+(\d+)\s+\+(\d+)\s+-(\d+)\s+(\d+)\/(\d+)\s+\((\d+)%\)/);
    if (!m) continue;
    lanes.push({
      lane: m[1], commits: Number(m[2]), files: Number(m[3]),
      fixes: Number(m[6]), pct: Number(m[8]),
    });
  }
  if (!lanes.length) throw new Error('BUILD_FAILED: could not parse any lane row from executor_ledger.mjs');

  for (const name of KNOWN_LANES) {
    if (!lanes.some((l) => l.lane === name)) {
      lanes.push({ lane: name, commits: 0, files: 0, fixes: 0, pct: null });
    }
  }
  lanes.sort((a, b) => b.commits - a.commits);

  return {
    lanes,
    scanned: header ? Number(header[1]) : null,
    tagged: header ? Number(header[2]) : null,
    coverage: header ? Number(header[3]) : null,
  };
}

// ---------------------------------------------------------------- render
const tpl = readFileSync(TPL, 'utf8');
const issueData = JSON.parse(readFileSync(ISSUES, 'utf8'));
const br = branches();
const led = ledger();

const branchTable = br.map((b, i) => {
  const hidden = i >= HOOK_CAP;
  return `<tr class="${hidden ? 'dim' : ''}">`
    + `<td class="num">${esc(b.date)}</td>`
    + `<td><b>${esc(b.ref)}</b>${hidden ? ' <span class="pid no">HIDDEN</span>' : ''}</td>`
    + `<td class="num">+${b.ahead}</td>`
    + `<td class="num">${b.files}</td></tr>`;
}).join('\n        ');

const issueTable = issueData.buckets.map((bucket) => {
  const rows = issueData.issues.filter((i) => i.bucket === bucket.id);
  if (!rows.length) return '';
  const head = `<tr class="bucket${bucket.flag ? ' no' : ''}"><td colspan="3">${esc(bucket.label)} &middot; ${rows.length}</td></tr>`;
  const body = rows.map((i) =>
    `<tr><td class="num"><span class="pid${bucket.flag ? ' no' : ''}">#${i.n}</span></td>`
    + `<td><b>${esc(i.title)}</b>${i.note ? `<br><span class="meta">${esc(i.note)}</span>` : ''}</td>`
    + `<td class="num">${esc(i.date)}</td></tr>`).join('\n        ');
  return `${head}\n        ${body}`;
}).filter(Boolean).join('\n        ');

const ledgerTable = led.lanes.map((l) => {
  const zero = l.commits === 0;
  return `<tr class="${zero ? 'dim' : ''}">`
    + `<td><b>${esc(l.lane)}</b>${zero ? ' <span class="pid no">WALANG DATOS</span>' : ''}</td>`
    + `<td class="num">${l.commits}</td>`
    + `<td class="num">${l.files || '—'}</td>`
    + `<td class="num">${l.pct === null ? '—' : `${l.fixes}/${l.commits} (${l.pct}%)`}</td></tr>`;
}).join('\n        ');

const ledgerMeta = led.scanned
  ? `<strong>${led.scanned} commit</strong> ang na-scan, <strong>${led.tagged}</strong> ang may trailer (${led.coverage}% coverage).`
  : 'hindi ma-parse ang header ng ledger.';

const sol = led.lanes.find((l) => l.lane === 'codex-sol');

// The published artifact is wrapped in a <head> by the platform, so this file
// carries no <meta charset> of its own — but the committed twin's whole job is to
// be opened as a BARE FILE (Viber/email/Drive), where nothing declares an encoding
// and a literal UTF-8 em-dash decodes as Windows-1252 mojibake ("â€™"). Caught by the
// 390x844 mobile gate 2026-08-06. Fix: keep the shipped bytes pure ASCII by
// converting every non-ASCII char to a numeric entity.
//
// Entities are NOT decoded inside <style>, so the stylesheet is excluded from the
// pass and asserted ASCII-only instead.
function asciify(input) {
  const styleRe = /<style>[\s\S]*?<\/style>/;
  const style = input.match(styleRe);
  if (!style) throw new Error('BUILD_FAILED: no <style> block found in template');
  // eslint-disable-next-line no-control-regex
  const nonAscii = /[^\x00-\x7F]/;
  if (nonAscii.test(style[0])) {
    throw new Error('BUILD_FAILED: <style> block contains non-ASCII (entities do not decode in CSS)');
  }
  const [before, after] = input.split(style[0]);
  const enc = (s) => s.replace(/[^\x00-\x7F]/g, (c) => `&#${c.codePointAt(0)};`);
  return enc(before) + style[0] + enc(after);
}

const html = asciify(tpl
  .replaceAll('{{STAMP}}', issueData.captured)
  .replaceAll('{{ISSUE_COUNT}}', String(issueData.issues.length))
  .replaceAll('{{BRANCH_COUNT}}', String(br.length))
  .replaceAll('{{BRANCH_HIDDEN}}', String(Math.max(0, br.length - HOOK_CAP)))
  .replaceAll('{{SOL_COMMITS}}', String(sol ? sol.commits : 0))
  .replaceAll('{{BRANCH_TABLE}}', branchTable)
  .replaceAll('{{ISSUE_TABLE}}', issueTable)
  .replaceAll('{{LEDGER_TABLE}}', ledgerTable)
  .replaceAll('{{LEDGER_META}}', ledgerMeta));

// Sanity gates: a truncated template or an unfilled slot must never ship silently.
const required = ['<title>', 'class="ground"', 'class="grain"', 'class="sig"', '</script>'];
const missing = required.filter((t) => !html.includes(t));
if (missing.length) {
  console.error(`BUILD_FAILED: template missing ${missing.join(', ')}`);
  process.exit(1);
}
const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
if (leftover) {
  console.error(`BUILD_FAILED: unfilled placeholders ${[...new Set(leftover)].join(', ')}`);
  process.exit(1);
}
if (/background-clip:\s*text/i.test(html)) {
  console.error('BUILD_FAILED: background-clip:text is banned in artifacts (Android WebView mispaints it)');
  process.exit(1);
}
// The twin ships without a <meta charset>; pure-ASCII bytes are what make it
// render correctly as a bare file anywhere. asciify() should guarantee this.
// eslint-disable-next-line no-control-regex
if (/[^\x00-\x7F]/.test(html)) {
  console.error('BUILD_FAILED: non-ASCII bytes survived — the bare-file twin will mojibake');
  process.exit(1);
}

writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} (${Math.round(html.length / 1024)}KB)`);
console.log(`  ${br.length} branches ahead of main (${Math.max(0, br.length - HOOK_CAP)} hidden by the hook cap)`);
console.log(`  ${issueData.issues.length} open issues (snapshot ${issueData.captured})`);
console.log(`  lanes: ${led.lanes.map((l) => `${l.lane}=${l.commits}`).join(' ')}`);
