// Rebuild .tmp/restitch.json from a real producer run — the input the $0
// re-stitch harness (tests/integration/restitch-real.test.ts) needs.
//
//   node scripts/build-restitch-spec.mjs              # newest usable run
//   node scripts/build-restitch-spec.mjs <run_id>     # a specific run
//
// WHY THIS EXISTS
// The harness is the only way to verify #91 (breathy tail trimmed to VO end) and
// #94.1 (overlay fires on speech onset) without paying for a fresh render. It reads
// a spec from `.tmp/restitch.json` — and `.tmp/` is gitignored, so the cafe-PC
// defreezer eats it every reboot. Hand-rebuilding that spec is the step that makes
// the "$0 verification" quietly cost a session, so it is a script now.
//
// KNOWN GAP — read before trusting absolute-time measurements off the output.
// The EDL also carries `voiceOffsetSec` per scene, and the harness's SpecScene has
// no field for it, so it is NOT carried here. Word timings from forced alignment are
// relative to each scene's own mp3; mapping them to absolute time in the stitched
// output therefore has an unmodelled offset per scene (plus a hook length that has
// to be derived by subtraction). Good enough to confirm a caption tracks its own
// speech; NOT good enough to assert "the overlay fired 0.5s early". Close that gap
// before making an onset claim to the millisecond.
//
// SECRETS: reads SUPABASE_SERVICE_ROLE_KEY from .env and never prints it, same rule
// as scripts/check-elevenlabs-voice.mjs. It also never prints the scene media URLs —
// they are presigned capability URLs, and this output is read in a chat transcript.
// Only counts and liveness verdicts are printed; the URLs go straight to the file.
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const env = readFileSync('.env', 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const URL_ = get('VITE_SUPABASE_URL');
const SRK = get('SUPABASE_SERVICE_ROLE_KEY');
if (!URL_ || !SRK) {
  console.log('RESULT: NO_ENV — VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env');
  process.exit(0);
}

const rest = (path) =>
  fetch(`${URL_}/rest/v1/${path}`, {
    headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, Accept: 'application/json' },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`${path} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
  });

const wantRun = process.argv[2];

// 1. Pick the run. A usable run is simply one whose scenes carry a video_url.
const runs = wantRun
  ? await rest(`producer_runs?run_id=eq.${encodeURIComponent(wantRun)}&select=run_id,status,created_at,artifacts`)
  : await rest('producer_runs?select=run_id,status,created_at,artifacts&order=created_at.desc&limit=12');

if (!runs.length) { console.log('RESULT: NO_RUNS — producer_runs is empty for this key.'); process.exit(0); }
console.log(`RUNS_FOUND=${runs.length}`);

let chosen = null;
let scenes = [];
for (const r of runs) {
  const s = await rest(
    `producer_scenes?run_id=eq.${encodeURIComponent(r.run_id)}&select=scene_idx,status,video_url,audio_url&order=scene_idx.asc`
  );
  const withVideo = s.filter((x) => x.video_url);
  console.log(`  ${r.run_id}  status=${r.status}  scenes=${s.length}  with_video=${withVideo.length}`);
  if (!chosen && withVideo.length >= 2) { chosen = r; scenes = withVideo; }
  if (wantRun) { chosen = r; scenes = withVideo; break; }
}
if (!chosen) { console.log('RESULT: NO_USABLE_RUN — no run has >=2 scenes with a video_url.'); process.exit(0); }
console.log(`\nCHOSEN=${chosen.run_id}  usable_scenes=${scenes.length}`);

// 2. Script lines + overlay/sfx come from the run's artifacts (edl preferred, then storyboard).
const a = chosen.artifacts ?? {};
const edlScenes = a?.edl?.scenes ?? a?.editDecisionList?.scenes ?? null;
const artScenes = a?.scenes ?? null;
const sbScenes = a?.storyboard?.scenes ?? null;
const aspect = a?.aspectRatio ?? a?.edl?.aspectRatio ?? '9:16';
console.log(`ARTIFACT_KEYS=${Object.keys(a).join(',') || '(none)'}`);
console.log(`EDL_SCENES=${edlScenes?.length ?? 0}  STORYBOARD_SCENES=${sbScenes?.length ?? 0}  ASPECT=${aspect}`);

const pick = (idx) => {
  const e = edlScenes?.find?.((x) => (x.sceneIdx ?? x.scene_idx ?? x.index) === idx) ?? edlScenes?.[idx];
  const s = sbScenes?.find?.((x) => (x.sceneIdx ?? x.scene_idx ?? x.index) === idx) ?? sbScenes?.[idx];
  return { e: e ?? {}, s: s ?? {} };
};

const spec = {
  aspectRatio: aspect,
  scenes: scenes.map((row) => {
    const { e, s } = pick(row.scene_idx);
    return {
      sceneIdx: row.scene_idx,
      videoUrl: row.video_url ?? e.sourceVideoUrl,
      // producer_scenes.audio_url is null on this run; the voice mp3 is carried on
      // the EDL as sourceAudioUrl (and mirrored on artifacts.scenes[].audioUrl).
      // Matching R2 objects by filename does NOT work — they are bare UUIDs.
      audioUrl: row.audio_url ?? e.sourceAudioUrl ?? artScenes?.[row.scene_idx]?.audioUrl ?? null,
      isHook: row.scene_idx === 0 || !!e.isHook || !!s.isHook,
      targetDurationSec: e.targetDurationSec ?? e.durationSec ?? s.durationSec ?? null,
      scriptLine: e.scriptLine ?? s.scriptLine ?? s.voiceover ?? s.line ?? '',
      sceneType: e.type ?? e.sceneType ?? s.sceneType ?? undefined,
      captionRegion: e.captionRegion ?? s.captionRegion ?? undefined,
      overlayText: e.overlayText ?? s.overlayText ?? undefined,
      sfxCues: e.sfxCues ?? s.sfxCues ?? undefined,
      // voiceWords is filled by scripts/fill-restitch-alignment.mjs. Without it the
      // harness falls back to silencedetect and CANNOT exercise the #91/#94.1 fixes.
    };
  }),
};

// 3. Liveness: presigned URLs expire. Say so BEFORE the harness burns time on 404s.
let live = 0, dead = 0, noAudio = 0, noLine = 0;
for (const sc of spec.scenes) {
  if (!sc.audioUrl) noAudio++;
  if (!sc.scriptLine) noLine++;
  // Ranged GET, never HEAD: these are presigned GET URLs and SigV4 signs the
  // METHOD, so a HEAD returns 403 on a perfectly good object. That false negative
  // cost a full detour on 2026-08-09 (reported OBJECTS_GONE for 9 live clips).
  try {
    const r = await fetch(sc.videoUrl, { headers: { Range: 'bytes=0-0' } });
    (r.ok || r.status === 206) ? live++ : dead++;
  } catch { dead++; }
}

const TMP = join(process.cwd(), '.tmp');
mkdirSync(TMP, { recursive: true });
const out = join(TMP, 'restitch.json');
writeFileSync(out, JSON.stringify(spec, null, 2));

console.log(`\nWROTE=${out}`);
console.log(`SCENES=${spec.scenes.length}  VIDEO_LIVE=${live}  VIDEO_DEAD=${dead}  NO_AUDIO=${noAudio}  NO_SCRIPTLINE=${noLine}`);
console.log('');
if (dead > 0) {
  console.log('RESULT: URLS_EXPIRED — ' + dead + ' clip URL(s) no longer resolve. The harness accepts BARE FILENAMES served from .tmp, so recovered local copies can stand in. Without them this run cannot be re-stitched.');
} else if (noLine === spec.scenes.length) {
  console.log('RESULT: NO_SCRIPT_LINES — clips are live but no scriptLine was recoverable from artifacts. Captions cannot be burned, so #94.1 is not verifiable from this run.');
} else {
  console.log('RESULT: READY — next: node scripts/fill-restitch-alignment.mjs   (adds measured voiceWords)');
  console.log('then:  $env:RUN_RESTITCH=\'1\'; npx vitest run tests/integration/restitch-real.test.ts');
}
