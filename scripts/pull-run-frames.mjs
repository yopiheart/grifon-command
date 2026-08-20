// Pull every stored still for one producer run out of Postgres and write them to disk.
//
// WHY THIS EXISTS: a producer run's scene stills and hook end frames live ONLY in
// `producer_scenes.image_url` / `.end_frame_url` as base64 data URLs. Supabase is the single
// copy. Anything Neil approved at a storyboard gate is therefore one tier-suspension away from
// being gone, and the approved frames ARE the record of what "good" looks like (2026-08-20:
// the hook shape Neil approved on 2026-08-13 could not be found in any repo doc, only in a
// Postgres row). This script is how an approved frame becomes a committed file.
//
// SECRETS: takes credentials from process.env ONLY and never prints them. Supply them by
// running node with the project's env file loaded:
//
//   node --env-file=.env scripts/pull-run-frames.mjs <run_id> <out_dir> [scene_idx]
//
// Omit scene_idx to pull every scene in the run. Prints only scene indexes, byte counts and
// output paths — never a URL, never a key.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log('RESULT: NO_ENV — VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset.');
  console.log('Run with: node --env-file=.env scripts/pull-run-frames.mjs <run_id> <out_dir> [scene_idx]');
  process.exit(1);
}

const [runId, outDir, sceneIdx] = process.argv.slice(2);
if (!runId || !outDir) {
  console.log('Usage: node --env-file=.env scripts/pull-run-frames.mjs <run_id> <out_dir> [scene_idx]');
  process.exit(1);
}

const query =
  `producer_scenes?run_id=eq.${encodeURIComponent(runId)}` +
  (sceneIdx === undefined ? '' : `&scene_idx=eq.${encodeURIComponent(sceneIdx)}`) +
  '&select=scene_idx,image_url,end_frame_url&order=scene_idx.asc';

const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' },
});
if (!res.ok) {
  console.log(`RESULT: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
  process.exit(1);
}

const rows = await res.json();
if (!rows.length) {
  console.log(`RESULT: NO_ROWS for run ${runId}${sceneIdx === undefined ? '' : ` scene ${sceneIdx}`}`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
const shortRun = runId.replace(/^apr_/, '').slice(0, 8);
let written = 0;
let skipped = 0;

// A still is only recoverable when it was checkpointed as a data URL. Older/remote rows hold a
// presigned R2 URL instead, which expires after 25h — report those as UNRECOVERABLE rather than
// writing a file full of a dead link.
const save = (idx, label, value) => {
  if (!value) { console.log(`scene ${idx} ${label}: none`); skipped++; return; }
  if (!value.startsWith('data:')) {
    console.log(`scene ${idx} ${label}: UNRECOVERABLE (remote url, not a data URL)`);
    skipped++;
    return;
  }
  const comma = value.indexOf(',');
  const header = value.slice(0, comma);
  const ext = header.includes('png') ? 'png' : header.includes('webp') ? 'webp' : 'jpg';
  const buf = Buffer.from(value.slice(comma + 1), 'base64');
  const path = join(outDir, `${shortRun}-s${String(idx).padStart(2, '0')}-${label}.${ext}`);
  writeFileSync(path, buf);
  console.log(`scene ${idx} ${label}: ${buf.length} bytes -> ${path}`);
  written++;
};

for (const row of rows) {
  save(row.scene_idx, 'still', row.image_url);
  save(row.scene_idx, 'endframe', row.end_frame_url);
}

console.log(`\nRESULT: ${written} file(s) written, ${skipped} skipped, ${rows.length} scene row(s) read.`);
