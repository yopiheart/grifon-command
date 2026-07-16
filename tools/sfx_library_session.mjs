#!/usr/bin/env node
// SFX library generation session — Slice 0 of workflows/sfx_upgrade_plan.md.
//
// Generates the variant bank (4-6 variants per cue class) via the ElevenLabs
// sound-generation API, then runs the transient-at-zero QA the plan mandates:
// every sample must have its first audible transient within ONSET_MAX_MS of
// t=0 (measured on the DECODED stream, i.e. exactly what renderFfmpeg hears).
// Samples with longer lead-ins are auto-trimmed and re-checked; unfixable ones
// are rejected. Survivors land in assets/sfx-lab/bank/<class>/ awaiting Neil's
// ear-test WITH the music bed (audition mixes built by --audition).
//
// Node, not Python: the cafe-PC defreezer wipes Python entirely; node +
// node_modules/ffmpeg-static ship with the repo's npm install (same reasoning
// as render_qa.mjs).
//
// Usage:
//   node tools/sfx_library_session.mjs                    # dry-run: print plan + budget, no calls
//   node tools/sfx_library_session.mjs --yes              # generate (skips raw files that already exist)
//   node tools/sfx_library_session.mjs --qa               # (re)run onset QA over raw/ into bank/
//   node tools/sfx_library_session.mjs --audition         # build per-class ear-test mixes over the music beds
//   node tools/sfx_library_session.mjs --class chaching --yes   # one class only
//
// Budget (Neil-approved 2026-07-12): stay within the 150 included
// generations/mo; HARD STOP at 200 total. The counter persists in
// assets/sfx-lab/session-state.json so re-runs never double-spend — a raw
// file on disk is never re-generated.
//
// Secrets: ELEVEN_LABS_API_KEY from environment or repo-root .env.
// Exit codes: 0 ok, 1 usage/config, 2 API failure, 3 budget stop.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LAB = join(REPO_ROOT, 'assets', 'sfx-lab');
const RAW = join(LAB, 'raw');
const BANK = join(LAB, 'bank');
const AUDITION = join(LAB, 'audition');
const STATE_FILE = join(LAB, 'session-state.json');
const QA_REPORT = join(LAB, 'qa-report.json');
const MUSIC_DIR = join(REPO_ROOT, 'api', '_lib', 'assets', 'music');

const FFMPEG = createRequire(import.meta.url)('ffmpeg-static');

const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation';
const HARD_STOP = 200;          // Neil's absolute cap (~$2 max overage past 150)
const INCLUDED = 150;           // Starter monthly included sound generations
const ONSET_MAX_MS = 10;        // plan: transient lead-in <= 10ms
const TRIM_LEAD_MS = 3;         // lead kept ahead of the detected onset when trimming
const PROMPT_INFLUENCE = 0.45;

// One-shot discipline appended to every prompt: the #1 real-world cause of
// "late" SFX is silence padding before the hit (sfx_upgrade_plan FM2).
const SUFFIX =
  ' Single one-shot sound effect only. No background noise, no music, no room tone, ' +
  'clean studio quality. The sound starts INSTANTLY — the transient hits at the very ' +
  'first millisecond, with no silence or fade-in before it. Warm smooth high end — ' +
  'no shrill, piercing, or harsh high frequencies.';
  // anti-shrill clause added 2026-07-13 after round-1 harshness triage: 9 of 76
  // first-roll samples came back piercing (metrics + Gemini ear pass concurred).
  // NB: the API caps prompt text at 450 chars — keep base+mod+suffix under that.

// Variant modifiers keep the pool sonically diverse (rotation must not sound
// like the same file 6 times). Order is stable: v1..v6.
const MODS = [
  'Tight and punchy.',
  'Brighter, slightly higher pitched.',
  'Deeper and rounder.',
  'Softer, more subtle.',
  'Aggressive, extra transient snap.',
  'Airy, with a short natural tail.',
];

// The shopping list (workflows/omni_edit_presets.md "SFX bank — shopping list"
// + 4-6 variants of each existing generic class, sfx_upgrade_plan Slice 0).
// variants: 6 for preset-mapped generics + HIGH diegetic, 4 for the rest.
// money-rustle (LOW, "cha-ching covers most") is deliberately skipped — headroom.
// tonal: true => audition against BOTH beds (music-bed-clash constraint).
const CLASSES = [
  // whoosh base reworded 3x 2026-07-13: "airy whoosh/swipe" gave bubbles,
  // "whoosh of air rushing past" gave pops/thuds — now pure wind language.
  // If this roll also fails, STOP: fill whoosh from CC0 packs (plan fallback).
  { id: 'whoosh',       n: 6, dur: 1.0, tonal: false, base: 'A gust of wind blowing past the microphone, fast wind sweep, pure air movement sound' },
  { id: 'boom',         n: 6, dur: 1.2, tonal: false, base: 'A deep cinematic impact boom, a heavy sub hit' },
  { id: 'pop',          n: 6, dur: 0.5, tonal: false, base: 'A quick soft bubble pop, a small UI pop' },
  // ding capped at 4 (2026-07-13): v5/v6 re-rolls came back piercing twice —
  // bright bells trend shrill; 4 clean survivors (v1-v4) meet rotation minimum
  { id: 'ding',         n: 4, dur: 1.0, tonal: true,  base: 'A bright short single-note bell ding, a clean notification chime' },
  // snap base reworded 2026-07-13 after silent duds (v1-v3 round 1) + harsh/dull (v5/v6)
  { id: 'snap',         n: 6, dur: 0.5, tonal: false, base: 'A crisp finger snap, fingers clicking once, natural sounding and clearly audible' },
  { id: 'sparkle',      n: 6, dur: 1.2, tonal: true,  base: 'A magical shimmering sparkle chime, glittery and short' },
  { id: 'drop',         n: 4, dur: 1.0, tonal: false, base: 'A punchy short bass drop hit' },
  { id: 'glitch',       n: 4, dur: 0.6, tonal: false, base: 'A short digital glitch stutter hit, electronic malfunction' },
  { id: 'riser',        n: 4, dur: 1.5, tonal: false, base: 'A quick tension riser sweeping upward, short build' },
  { id: 'swish',        n: 4, dur: 0.6, tonal: false, base: 'A fast fabric swish, a quick swipe through air' },
  // — diegetic layer (pattern P13, E8-E14 reel batch evidence) —
  { id: 'notification', n: 6, dur: 0.8, tonal: true,  base: 'A modern smartphone push notification pop, a soft friendly app alert tone, iOS style' },
  { id: 'chaching',     n: 6, dur: 1.2, tonal: true,  base: 'A cash register cha-ching, bell ring with coin drawer sliding open, a money sound' },
  { id: 'typing',       n: 4, dur: 1.5, tonal: false, base: 'A fast keyboard typing burst, crisp mechanical key presses' },
  { id: 'shutter',      n: 4, dur: 0.5, tonal: false, base: 'A single DSLR camera shutter click' },
  { id: 'paper',        n: 4, dur: 0.8, tonal: false, base: 'A quick paper rustle, a single page flip' },
];

// ---------- helpers ----------

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envText = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
    const line = envText.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  } catch { /* no .env */ }
  return undefined;
}

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')); }
  catch { return { generations: 0, history: [] }; }
}
function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

function ffmpeg(args) {
  const r = spawnSync(FFMPEG, args, { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')} failed: ${(r.stderr || '').toString().slice(-400)}`);
  return r;
}

/** Decode to mono 44.1k s16le and return {onsetMs, durMs, peak} of the DECODED
 * stream — the same thing renderFfmpeg's decoder will hear at mux time. */
function probeOnset(file) {
  const r = ffmpeg(['-hide_banner', '-loglevel', 'error', '-i', file,
    '-ac', '1', '-ar', '44100', '-f', 's16le', '-']);
  const pcm = r.stdout;
  const n = Math.floor(pcm.length / 2);
  if (n === 0) return { onsetMs: null, durMs: 0, peak: 0 };
  let peak = 0;
  for (let i = 0; i < n; i++) { const v = Math.abs(pcm.readInt16LE(i * 2)); if (v > peak) peak = v; }
  if (peak < 500) return { onsetMs: null, durMs: (n / 44100) * 1000, peak }; // effectively silent
  const thresh = Math.max(peak * 0.1, 655); // -20dB rel peak, floor ~-34dBFS
  let onset = -1;
  for (let i = 0; i < n; i++) { if (Math.abs(pcm.readInt16LE(i * 2)) >= thresh) { onset = i; break; } }
  return { onsetMs: (onset / 44100) * 1000, durMs: (n / 44100) * 1000, peak };
}

// ---------- generation ----------

async function generateOne(apiKey, text, durationSeconds, outFile) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, duration_seconds: durationSeconds, prompt_influence: PROMPT_INFLUENCE }),
    });
    if (resp.ok) {
      const buf = Buffer.from(await resp.arrayBuffer());
      writeFileSync(outFile, buf);
      return buf.length;
    }
    const detail = (await resp.text()).slice(0, 300);
    if (resp.status === 401 || resp.status === 403) {
      throw Object.assign(new Error(`AUTH ${resp.status}: ${detail}`), { fatal: true });
    }
    if (attempt === 3) throw new Error(`HTTP ${resp.status}: ${detail}`);
    const waitS = resp.status === 429 ? 20 * attempt : 5 * attempt;
    console.log(`    retry ${attempt}/2 in ${waitS}s (HTTP ${resp.status})`);
    await new Promise((r) => setTimeout(r, waitS * 1000));
  }
}

// --boost: appended when re-rolling slots whose first roll came back near-silent
// (observed on snap/pop/shutter: max volume -40..-55 dBFS = unusable duds).
const BOOST = ' Loud and clearly audible, close-mic, strong full signal level.';

async function runGeneration(apiKey, classFilter, dryRun, boost) {
  const state = loadState();
  const plan = [];
  for (const c of CLASSES) {
    if (classFilter && c.id !== classFilter) continue;
    for (let v = 1; v <= c.n; v++) {
      const out = join(RAW, `${c.id}-v${v}.mp3`);
      if (existsSync(out)) continue; // never re-spend on an existing raw file
      plan.push({ c, v, out, text: `${c.base}. ${MODS[v - 1]}${SUFFIX}${boost ? BOOST : ''}` });
    }
  }
  const total = CLASSES.reduce((s, c) => s + (classFilter && c.id !== classFilter ? 0 : c.n), 0);
  console.log(`Plan: ${plan.length} generation(s) to run (${total - plan.length} already on disk).`);
  console.log(`Budget: ${state.generations} spent so far; included ${INCLUDED}/mo; HARD STOP ${HARD_STOP}.`);
  if (dryRun) {
    for (const p of plan) console.log(`  [dry] ${p.c.id}-v${p.v}  ${p.c.dur}s  "${p.text.slice(0, 90)}…"`);
    console.log('\nDry run — nothing spent. Re-run with --yes to generate.');
    return;
  }
  mkdirSync(RAW, { recursive: true });
  for (const p of plan) {
    if (state.generations >= HARD_STOP) {
      console.error(`HARD STOP: ${state.generations} generations reached the ${HARD_STOP} cap. Aborting.`);
      process.exit(3);
    }
    if (state.generations === INCLUDED) {
      console.log(`NOTE: passing ${INCLUDED} included generations — now ~$0.04/gen overage (cap ${HARD_STOP}).`);
    }
    process.stdout.write(`  [${state.generations + 1}] ${p.c.id}-v${p.v} (${p.c.dur}s) … `);
    try {
      const bytes = await generateOne(apiKey, p.text, p.c.dur, p.out);
      state.generations += 1;
      state.history.push({ file: `${p.c.id}-v${p.v}.mp3`, bytes });
      saveState(state);
      console.log(`ok (${(bytes / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.log('FAILED');
      console.error(`    ${e.message}`);
      if (e.fatal) { console.error('Auth/scope failure — aborting session (no further spend).'); process.exit(2); }
    }
  }
  console.log(`\nGeneration pass done. Total spent this month (per local counter): ${state.generations}.`);
}

// ---------- QA ----------

function runQa(classFilter) {
  mkdirSync(BANK, { recursive: true });
  const report = { onsetMaxMs: ONSET_MAX_MS, checkedAt: null, samples: [] };
  const rawFiles = existsSync(RAW) ? readdirSync(RAW).filter((f) => f.endsWith('.mp3')) : [];
  let pass = 0, trimmed = 0, rejected = 0;
  for (const f of rawFiles.sort()) {
    const cls = f.replace(/-v\d+\.mp3$/, '');
    if (classFilter && cls !== classFilter) continue;
    const rawPath = join(RAW, f);
    const outDir = join(BANK, cls);
    const outPath = join(outDir, f);
    const p0 = probeOnset(rawPath);
    const entry = { file: f, class: cls, rawOnsetMs: p0.onsetMs === null ? null : +p0.onsetMs.toFixed(2), durMs: +p0.durMs.toFixed(0) };
    if (p0.onsetMs === null) {
      entry.verdict = 'REJECT-silent';
      rejected++;
    } else if (p0.onsetMs <= ONSET_MAX_MS) {
      mkdirSync(outDir, { recursive: true });
      // copy via re-mux (no re-encode) so bank files are byte-stable
      ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', rawPath, '-c', 'copy', outPath]);
      entry.verdict = 'PASS';
      entry.bankOnsetMs = entry.rawOnsetMs;
      pass++;
    } else {
      // trim so the transient lands at ~t=0, then re-verify the decoded result.
      // atrim runs in the DECODED domain (sample-accurate); -ss input seeking
      // snaps to MP3 frame boundaries (~26ms) and produced 13-30ms misses.
      mkdirSync(outDir, { recursive: true });
      const ss = Math.max(0, (p0.onsetMs - TRIM_LEAD_MS) / 1000);
      ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', rawPath,
        '-af', `atrim=start=${ss.toFixed(5)},asetpts=PTS-STARTPTS`,
        '-c:a', 'libmp3lame', '-q:a', '2', '-ar', '44100', outPath]);
      const p1 = probeOnset(outPath);
      entry.trimmedFromMs = +p0.onsetMs.toFixed(2);
      entry.bankOnsetMs = p1.onsetMs === null ? null : +p1.onsetMs.toFixed(2);
      if (p1.onsetMs !== null && p1.onsetMs <= ONSET_MAX_MS) { entry.verdict = 'PASS-trimmed'; trimmed++; }
      else { entry.verdict = 'REJECT-trim-failed'; rejected++; }
    }
    // a rejected sample must never sit in the bank awaiting an ear-test
    if (entry.verdict.startsWith('REJECT') && existsSync(outPath)) unlinkSync(outPath);
    report.samples.push(entry);
    console.log(`  ${entry.verdict.padEnd(18)} ${f}  raw-onset=${entry.rawOnsetMs}ms${entry.bankOnsetMs !== undefined ? ` bank-onset=${entry.bankOnsetMs}ms` : ''}`);
  }
  report.summary = { pass, trimmed, rejected, total: pass + trimmed + rejected };
  writeFileSync(QA_REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(`\nQA: ${pass} clean pass, ${trimmed} pass after trim, ${rejected} rejected. Report: ${QA_REPORT}`);
}

// ---------- audition mixes (ear-test WITH the music bed) ----------

function buildAudition(classFilter) {
  mkdirSync(AUDITION, { recursive: true });
  const beds = { mrbeast: join(MUSIC_DIR, 'mrbeast.mp3'), testimonial: join(MUSIC_DIR, 'testimonial.mp3') };
  for (const c of CLASSES) {
    if (classFilter && c.id !== classFilter) continue;
    const dir = join(BANK, c.id);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith('.mp3')).sort();
    if (!files.length) continue;
    const bedList = c.tonal ? ['mrbeast', 'testimonial'] : ['mrbeast'];
    for (const bedName of bedList) {
      const totalS = 1 + files.length * 2 + 1;
      const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', beds[bedName]];
      for (const f of files) args.push('-i', join(dir, f));
      let fc = `[0:a]atrim=0:${totalS},volume=0.25[bed];`;
      const mixIns = ['[bed]'];
      files.forEach((f, i) => {
        const delayMs = (1 + i * 2) * 1000;
        fc += `[${i + 1}:a]adelay=${delayMs}|${delayMs},volume=0.9[s${i}];`;
        mixIns.push(`[s${i}]`);
      });
      fc += `${mixIns.join('')}amix=inputs=${mixIns.length}:duration=first:normalize=0[out]`;
      const out = join(AUDITION, `${c.id}-audition-${bedName}.mp3`);
      args.push('-filter_complex', fc, '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', out);
      ffmpeg(args);
      console.log(`  audition: ${c.id} over ${bedName} bed → ${files.length} variants at t=1s,3s,5s… (${out})`);
    }
  }
}

// ---------- main ----------

const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const classFilter = argv.includes('--class') ? argv[argv.indexOf('--class') + 1] : null;

const doQa = flag('--qa');
const doAudition = flag('--audition');
const doGenerate = !doQa && !doAudition;

if (doGenerate) {
  const apiKey = loadEnvKey('ELEVEN_LABS_API_KEY');
  if (!apiKey) { console.error('ELEVEN_LABS_NOT_CONFIGURED: ELEVEN_LABS_API_KEY not found (env or .env).'); process.exit(1); }
  await runGeneration(apiKey, classFilter, !flag('--yes'), flag('--boost'));
}
if (doQa) runQa(classFilter);
if (doAudition) buildAudition(classFilter);
