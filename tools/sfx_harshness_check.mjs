#!/usr/bin/env node
// Harshness triage over assets/sfx-lab/bank — the "machine ear-test" that runs
// BEFORE Neil's real one (born 2026-07-13 when round-1 samples hurt Neil's ears;
// its 9 piercing flags were corroborated by the ffmpeg metrics).
//
// Two independent judges per sample, combined into a suspect score:
//   1. ffmpeg metrics: max level / clipping headroom, and high-frequency energy
//      ratios (band-limited mean vs full-band mean; >4kHz = presence/sibilance,
//      >7kHz = piercing territory — a ratio near 0 dB means nearly ALL energy
//      lives up there).
//   2. Gemini ear pass (gemini-3.5-flash, audio input): per class, hears every
//      variant in order and rates harshness/piercing/matches-class/keep.
//
// Usage:  node tools/sfx_harshness_check.mjs
// Output: ranked table on stdout + .tmp/sfx-harshness/report.json
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANK = join(REPO_ROOT, 'assets', 'sfx-lab', 'bank');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'sfx-harshness');
const req = createRequire(import.meta.url);
const FFMPEG = req('ffmpeg-static');
const { GoogleGenAI } = req('@google/genai');

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envText = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
    const line = envText.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '');
  } catch { /* no .env */ }
  return undefined;
}

function vol(file, extraFilter) {
  const af = (extraFilter ? extraFilter + ',' : '') + 'volumedetect';
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file, '-af', af, '-f', 'null', '-'], { encoding: 'utf8' });
  const mean = +(r.stderr.match(/mean_volume: ([-\d.]+) dB/) || [])[1];
  const max = +(r.stderr.match(/max_volume: ([-\d.]+) dB/) || [])[1];
  return { mean, max };
}

const classes = readdirSync(BANK);
const metrics = {};
for (const cls of classes) {
  for (const f of readdirSync(join(BANK, cls)).filter((x) => x.endsWith('.mp3')).sort()) {
    const p = join(BANK, cls, f);
    const full = vol(p);
    const hf = vol(p, 'highpass=f=4000');
    const shrill = vol(p, 'highpass=f=7000');
    metrics[f] = {
      class: cls,
      meanDb: full.mean, maxDb: full.max,
      hfRatioDb: +(hf.mean - full.mean).toFixed(1),
      shrillRatioDb: +(shrill.mean - full.mean).toFixed(1),
      clipRisk: full.max >= -0.2,
    };
  }
}

// The Gemini ear is NOISY run-to-run (observed 2026-07-13: identical files
// flipped keep<->DROP between two runs), so verdicts are majority-voted over
// VOTES independent passes — same pattern the repo uses for all stochastic
// Gemini judgment (gemini-eval / adversarial-verify doctrine).
const VOTES = +(process.argv.find((a) => a.startsWith('--votes='))?.split('=')[1] ?? 3);
const apiKey = loadEnvKey('GEMINI_API_KEY');
if (!apiKey) { console.error('GEMINI_NOT_CONFIGURED: GEMINI_API_KEY not found (env or .env).'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });
const ballots = {}; // file -> array of per-run verdicts
for (let round = 1; round <= VOTES; round++) {
  for (const cls of classes) {
    const files = readdirSync(join(BANK, cls)).filter((x) => x.endsWith('.mp3')).sort();
    if (!files.length) continue;
    const parts = [{
      text: `You are a sound designer QA-ing an SFX bank for social-media video ads. ` +
        `You will hear ${files.length} short one-shot samples, all meant to be the cue class "${cls}". ` +
        `They are provided in order: ${files.join(', ')}. For EACH sample, judge:\n` +
        `- harshness 0-10 (10 = painful/piercing to listen to at normal volume: shrill highs, harsh digital edge, ear-fatiguing resonance)\n` +
        `- piercing: true if it has a sharp high-frequency spike that would hurt on earphones\n` +
        `- matches_class: does it actually sound like a "${cls}" cue?\n` +
        `- keep: would you keep it in a professional ad SFX bank?\n` +
        `Return ONLY JSON: [{"file":"...","harshness":n,"piercing":bool,"matches_class":bool,"keep":bool,"note":"<10 words"}]`,
    }];
    for (const f of files) {
      parts.push({ inlineData: { mimeType: 'audio/mpeg', data: readFileSync(join(BANK, cls, f)).toString('base64') } });
    }
    try {
      const resp = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: [{ role: 'user', parts }] });
      const txt = resp.text.replace(/^```json?\s*|\s*```$/g, '');
      for (const v of JSON.parse(txt)) (ballots[v.file] ??= []).push(v);
      console.error(`gemini ok: ${cls} (vote ${round}/${VOTES})`);
    } catch (e) {
      console.error(`gemini FAILED for ${cls} vote ${round}: ${String(e).slice(0, 200)}`);
    }
  }
}

const majority = (votes, pick) => votes.filter(pick).length > votes.length / 2;
const median = (ns) => { const s = [...ns].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const verdicts = {};
for (const [f, votes] of Object.entries(ballots)) {
  verdicts[f] = {
    votes: votes.length,
    harshness: median(votes.map((v) => v.harshness ?? 0)),
    piercing: majority(votes, (v) => v.piercing),
    matches_class: !majority(votes, (v) => v.matches_class === false),
    keep: !majority(votes, (v) => v.keep === false),
    contested: votes.some((v) => v.keep === false) && votes.some((v) => v.keep !== false),
    note: votes.map((v) => v.note).filter(Boolean).join(' / ').slice(0, 120),
  };
}

const rows = Object.entries(metrics).map(([f, m]) => {
  const g = verdicts[f] || {};
  const score =
    (g.harshness ?? 0) +
    (g.piercing ? 3 : 0) +
    (m.shrillRatioDb > -6 ? 2 : 0) +
    (m.clipRisk ? 1 : 0) +
    (g.matches_class === false ? 2 : 0);
  return { file: f, ...m, gemini: g, suspectScore: +score.toFixed(1) };
}).sort((a, b) => b.suspectScore - a.suspectScore);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(rows, null, 2));
console.log('file | maxDb | hf>4k | hf>7k | clip | gemHarsh | pierce | match | keep | score | note');
for (const r of rows) {
  const g = r.gemini;
  console.log([r.file, r.maxDb, r.hfRatioDb, r.shrillRatioDb, r.clipRisk ? 'Y' : '-',
    g.harshness ?? '?', g.piercing ? 'Y' : '-', g.matches_class === false ? 'NO' : 'ok',
    g.keep === false ? 'DROP' : (g.contested ? 'ok?' : 'ok'), r.suspectScore, g.note || ''].join(' | '));
}
