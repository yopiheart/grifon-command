// Pull one producer run's INTAKE back out of Postgres: the hero photo, the presenter
// reference, and the text fields Neil typed. The cafe defreezer wipes the Desktop every
// reboot, so the only surviving copy of a good brief is the `producer_runs` row.
//
//   node --env-file=.env scripts/pull-run-input.mjs --list
//   node --env-file=.env scripts/pull-run-input.mjs <run_id> <out_dir>
//
// Prints field values and byte counts only — never a URL, never a key.
// Sibling of scripts/pull-run-frames.mjs, which pulls the rendered stills instead.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log('RESULT: NO_ENV — VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset.');
  process.exit(1);
}

const get = async (q) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) { console.log(`RESULT: HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`); process.exit(1); }
  return res.json();
};

const [arg1, outDir] = process.argv.slice(2);

if (!arg1 || arg1 === '--list') {
  const rows = await get('producer_runs?select=run_id,created_at,status,engine,current_stage,input->>brandName,input->>productName&order=created_at.desc&limit=25');
  for (const r of rows) {
    console.log(`${r.run_id}  ${String(r.created_at).slice(0, 16)}  ${String(r.status).padEnd(7)} ${String(r.engine).padEnd(8)} ${String(r.current_stage ?? '-').padEnd(18)} ${r.brandName ?? '?'} / ${r.productName ?? '?'}`);
  }
  process.exit(0);
}

if (!outDir) { console.log('Usage: node --env-file=.env scripts/pull-run-input.mjs <run_id> <out_dir>'); process.exit(1); }

const [row] = await get(`producer_runs?run_id=eq.${encodeURIComponent(arg1)}&select=run_id,created_at,status,engine,input,avatar_url,thumbnail_url&limit=1`);
if (!row) { console.log(`RESULT: NO_ROW for ${arg1}`); process.exit(0); }

const i = row.input ?? {};
mkdirSync(outDir, { recursive: true });
const short = row.run_id.replace(/^apr_/, '').slice(0, 8);

const saveImage = (label, value) => {
  if (!value) { console.log(`${label}: none`); return; }
  if (!value.startsWith('data:')) { console.log(`${label}: UNRECOVERABLE (remote url, not a data URL)`); return; }
  const comma = value.indexOf(',');
  const header = value.slice(0, comma);
  const ext = header.includes('png') ? 'png' : header.includes('webp') ? 'webp' : 'jpg';
  const buf = Buffer.from(value.slice(comma + 1), 'base64');
  const path = join(outDir, `${short}-${label}.${ext}`);
  writeFileSync(path, buf);
  console.log(`${label}: ${buf.length} bytes -> ${path}`);
};

console.log(`RUN ${row.run_id}  ${String(row.created_at).slice(0, 16)}  ${row.status} / ${row.engine}`);
for (const k of ['brandName', 'offer', 'price', 'productName', 'productDescription', 'heroDescription',
                 'voiceId', 'language', 'aspectRatio', 'scriptType', 'businessType', 'ugcProFormat',
                 'audioMode', 'serviceArchetype', 'realEstateArchetype', 'isLocalService', 'businessAddress']) {
  if (i[k] !== undefined && i[k] !== '' && i[k] !== null) console.log(`${k}: ${JSON.stringify(i[k])}`);
}
if (i.castHints) console.log(`castHints: ${JSON.stringify(i.castHints)}`);
if (i.avatar) console.log(`avatar.description: ${JSON.stringify(i.avatar.description ?? '')}  (url on input: ${i.avatar.url ? 'present' : 'EMPTY'})`);
console.log(`servicePhotos: ${(i.servicePhotos ?? []).length}`);

saveImage('hero', i.heroImageBase64);
saveImage('presenter', row.avatar_url || i.avatar?.url);
saveImage('thumbnail', row.thumbnail_url);
