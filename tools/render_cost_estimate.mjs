#!/usr/bin/env node
/**
 * render_cost_estimate.mjs — what a finished ad ACTUALLY costs, from the real code paths.
 *
 * WHY THIS EXISTS
 * `workflows/pricing_unit_economics.md` §2 has the canonical per-ad math, finalized
 * 2026-06-19. It assumes **Veo Fast @1080p** for every scene. The producer does not do
 * that any more:
 *
 *     routeModel()  (services/producerOrchestrator.ts)  talking   -> Veo 3.1 Lite @720p
 *                                                       b-roll    -> Kling 3.0
 *                                                       cinematic -> Kling 3.0
 *     run.input.resolution ?? '720p'                    default is 720p, not 1080p
 *
 * So the doc and the code have drifted, and every peso figure quoted from the doc is a
 * guess about a pipeline we no longer run. That drift is how `format_sample_readiness.md`
 * ended up projecting **₱6,600** for the 12-recipe sample batch off a single 9-scene admin
 * smoke — a scene count no paying customer can even reach (SCENE_CAP maxes at 6).
 *
 * This tool does not restate the doc. It IMPORTS the live `routeModel`,
 * `pickSceneDuration`, `SCENE_CAP` and `RECIPES` (transpiled on the fly with the esbuild
 * already in node_modules) and prices whatever they currently say. When someone changes
 * the routing, this number moves by itself. That is the whole point.
 *
 * It is read-only and costs ₱0 to run. It never calls a provider.
 *
 *   node tools/render_cost_estimate.mjs                 # plans + sample batch + drift
 *   node tools/render_cost_estimate.mjs --scenes=4      # price one specific scene count
 *   node tools/render_cost_estimate.mjs --fx=60         # different peso rate
 *   node tools/render_cost_estimate.mjs --json          # machine-readable
 *
 * ⚠ PRICE PROVENANCE IS TRACKED PER ROW (see PRICES). Veo rows are verified against the
 * live Gemini pricing page; the Kling row is NOT verified and is flagged in every output.
 * Do not quote a Kling-heavy total as billing-grade until someone reads Kling's price page
 * and updates the row. Same discipline as the header of api/_lib/modelCosts.ts.
 */

import { pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ prices */

// USD. `src` is the provenance; anything not 'verified' is surfaced as a warning.
const PRICES = {
  'Veo_3.1_Lite':    { perSec: 0.08, src: 'verified',   note: 'pricing_unit_economics.md §2 (2026-06-19)' },
  'Veo_3.1_Fast':    { perSec: 0.12, src: 'verified',   note: 'pricing_unit_economics.md §2 (2026-06-19)' },
  'Veo_3.1_Quality': { perSec: 0.40, src: 'verified',   note: 'pricing_unit_economics.md §2 (2026-06-19)' },
  'Kling_3_0':       { perSec: 0.05, src: 'UNVERIFIED', note: 'inferred from a ~$0.25 5s O1 render in agent_lessons_archive; READ KLING PRICING' },
  'Kling_O1':        { perSec: 0.05, src: 'UNVERIFIED', note: 'same inference as Kling_3_0' },
};

// Per-scene, non-video: every scene needs a generated start frame. $0.04/image is the
// api/_lib/modelCosts.ts row. This is deliberately NOT folded into the fixed cost — the
// doc's flat "~₱70 incl. ~8 images" silently assumes an 8-scene ad, so it under-prices
// short ads and over-prices long ones.
const SCENE_IMAGE_USD = 0.04;

// Everything that is not per-scene: avatar + thumbnail + all text calls + ElevenLabs
// voice + the FFmpeg final render. Small by construction — video is ~80% of COGS.
const FIXED_PHP_PER_AD = 40;

// The one real measurement we own: the 2026-07-31 producer smoke. Neil GO'd a full
// 9-scene render and it came back ≈₱550. Every estimate below is checked against it,
// because a model that cannot reproduce the one render we actually paid for is a model
// that should not be setting a ₱-thousands batch budget.
const OBSERVED = { php: 550, scenes: 9, label: '2026-07-31 producer smoke' };

// Failed/regenerated clips are billed too. The doc's published table carries +30%.
const REGEN_BUFFER = 0.30;

/* ------------------------------------------------- load the real routing code */

async function loadLive() {
  const esbuild = await import(pathToFileURL(join(ROOT, 'node_modules/esbuild/lib/main.js')).href);
  const built = await esbuild.build({
    stdin: {
      contents: `
        export { routeModel, pickSceneDuration } from './services/producerOrchestrator.ts';
        export { SCENE_CAP } from './utils/planGate.ts';
        export { RECIPES } from './components/OneShotAd/recipes.ts';
      `,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    // Bare specifiers stay external so we never try to bundle @supabase et al. The bundle
    // is written under .tmp/ (not a data: URL) precisely so those externals still resolve
    // against the repo's own node_modules at import time.
    packages: 'external',
    write: false,
    logLevel: 'silent',
  });

  const tmpDir = join(ROOT, '.tmp');
  mkdirSync(tmpDir, { recursive: true });
  const out = join(tmpDir, '_cost_estimate_bundle.mjs');
  writeFileSync(out, built.outputFiles[0].text);
  try {
    // Cache-bust so a second run in the same process never reads a stale bundle.
    return await import(pathToFileURL(out).href + '?t=' + Date.now());
  } finally {
    try { rmSync(out); } catch { /* best-effort */ }
  }
}

/* ----------------------------------------------------------------- the model */

const SCENE_TYPES = ['talking', 'b-roll', 'cinematic'];

/** What one scene of a given type costs, at the CURRENT routing. `klingPerSec` is passed
 *  in rather than read from PRICES so the calibration pass can solve for it. */
function sceneCost(live, type, resolution, klingPerSec) {
  const model = live.routeModel(type, 'Veo_3.1_Lite', 0, resolution);
  const seconds = live.pickSceneDuration(type, model, resolution);
  const price = PRICES[model];
  if (!price) throw new Error(`No price row for model "${model}" — add it to PRICES.`);
  const perSec = model.startsWith('Kling') ? klingPerSec : price.perSec;
  return {
    type, model, seconds,
    usd: seconds * perSec + SCENE_IMAGE_USD,
    videoUsd: seconds * perSec,
    provenance: price.src,
  };
}

/** A finished ad = fixed cost + N scenes of some type mix, + regen buffer. */
function adCost(live, { scenes, resolution, mix, fx, klingPerSec }) {
  const perType = Object.fromEntries(
    SCENE_TYPES.map((t) => [t, sceneCost(live, t, resolution, klingPerSec)]),
  );
  const weighted = SCENE_TYPES.reduce((sum, t) => sum + (mix[t] ?? 0) * perType[t].usd, 0);
  const scenePhp = weighted * scenes * fx;
  const raw = FIXED_PHP_PER_AD + scenePhp;
  return {
    scenes,
    resolution,
    scenePhp,
    fixedPhp: FIXED_PHP_PER_AD,
    rawPhp: raw,
    bufferedPhp: raw * (1 + REGEN_BUFFER),
    perType,
    anyUnverified: SCENE_TYPES.some((t) => (mix[t] ?? 0) > 0 && perType[t].provenance !== 'verified'),
  };
}

/** Back-solve Kling's per-second rate from a real observed render.
 *
 *  We own exactly one paid measurement (OBSERVED). The Veo and image rows are verified,
 *  so the only free variable large enough to explain a gap is Kling — which is precisely
 *  the row flagged UNVERIFIED. Rather than quietly shipping a number that cannot
 *  reproduce reality, solve for the rate that does, and show both.
 *
 *  Returns null when the observation is already explained without Kling (nothing to solve).
 */
function calibrateKling(live, { php, scenes, resolution, mix, fx }) {
  const zero = adCost(live, { scenes, resolution, mix, fx, klingPerSec: 0 });
  // Kling seconds contributed per ad, weighted by the mix.
  const klingSecs = SCENE_TYPES.reduce((sum, t) => {
    const s = zero.perType[t];
    return sum + (s.model.startsWith('Kling') ? (mix[t] ?? 0) * s.seconds : 0);
  }, 0) * scenes;
  if (klingSecs <= 0) return null;
  // php = (fixed + sceneCosts) * (1 + buffer), solve the Kling term.
  const residualPhp = php / (1 + REGEN_BUFFER) - zero.rawPhp;
  return { perSec: residualPhp / (klingSecs * fx), klingSecs, residualPhp };
}

/* ------------------------------------------------------------------- output */

const peso = (n) => '₱' + Math.round(n).toLocaleString('en-PH');

function main(argv) {
  const arg = (name, dflt) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : dflt;
  };
  const fx = Number(arg('fx', 58));
  const asJson = argv.includes('--json');
  const forcedScenes = arg('scenes', null);
  const resolution = arg('res', '720p');
  const klingOverride = arg('kling', null);

  return loadLive().then((live) => {
    // Three mixes, because the real per-recipe mix is decided by the storyboard at run
    // time and is not knowable from static code. Reporting a range is honest; reporting a
    // single number would not be. "Typical" is the shape a UGC ad actually takes: one
    // talking scene carrying the VO, the rest b-roll.
    const MIXES = {
      'all talking':   { talking: 1 },
      'typical UGC':   { talking: 0.4, 'b-roll': 0.6 },
      'all cinematic': { cinematic: 1 },
    };

    const typical = MIXES['typical UGC'];

    // Calibrate against the one render we actually paid for, then price everything with
    // the calibrated rate. The listed (UNVERIFIED) rate is still shown so the size of the
    // correction is visible rather than buried.
    const listedKling = PRICES.Kling_3_0.perSec;
    const solved = calibrateKling(live, { php: OBSERVED.php, scenes: OBSERVED.scenes, resolution, mix: typical, fx });
    const klingPerSec = klingOverride !== null ? Number(klingOverride)
      : solved && solved.perSec > 0 ? solved.perSec
      : listedKling;
    const price = (opts) => adCost(live, { resolution, fx, klingPerSec, ...opts });

    const report = { fx, resolution, klingPerSec, listedKling, plans: {}, mixes: {}, batch: {} };

    if (asJson) {
      for (const [label, mix] of Object.entries(MIXES)) {
        report.mixes[label] = Object.fromEntries(
          [1, 4, 6, 9].map((n) => [n, price({ scenes: n, mix }).bufferedPhp]),
        );
      }
      for (const [plan, cap] of Object.entries(live.SCENE_CAP)) {
        report.plans[plan] = cap === 0 ? 0 : price({ scenes: cap, mix: typical }).bufferedPhp;
      }
      report.batch.recipes = live.RECIPES.length;
      report.observed = OBSERVED;
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const probe = price({ scenes: 1, mix: typical });

    console.log('');
    console.log('  RENDER COST — computed from the live routing code, not from the doc');
    console.log(`  ₱${fx}/$ · ${resolution} · +${REGEN_BUFFER * 100}% regen buffer · fixed ${peso(FIXED_PHP_PER_AD)}/ad`);
    console.log('  ' + '-'.repeat(70));

    console.log(`\n  CALIBRATION — anchored on the ${OBSERVED.label} (${peso(OBSERVED.php)}, ${OBSERVED.scenes} scenes):`);
    if (klingOverride !== null) {
      console.log(`    Kling forced to $${klingPerSec}/s via --kling. Calibration skipped.`);
    } else if (solved && solved.perSec > 0) {
      console.log(`    Veo + image rows are verified, so Kling is the only free variable.`);
      console.log(`    Rate that reproduces that render:  $${klingPerSec.toFixed(3)}/s  (listed guess was $${listedKling.toFixed(3)}/s)`);
      console.log(`    Everything below uses the calibrated rate. Replace it with the real`);
      console.log(`    published number as soon as someone reads Kling's pricing page.`);
    } else {
      console.log(`    Could not solve — the observation is already met without Kling spend.`);
      console.log(`    Falling back to the listed $${listedKling.toFixed(3)}/s.`);
    }

    console.log('\n  PER SCENE, as routeModel() + pickSceneDuration() decide today:');
    for (const t of SCENE_TYPES) {
      const s = probe.perType[t];
      const tag = s.provenance === 'verified' ? '' : '  <- price UNVERIFIED';
      console.log(`    ${t.padEnd(10)} ${s.model.padEnd(15)} ${String(s.seconds).padStart(2)}s   ${peso(s.usd * fx).padStart(6)}${tag}`);
    }

    console.log('\n  ONE FINISHED AD, by scene count:');
    console.log('    scenes   ' + Object.keys(MIXES).map((m) => m.padStart(14)).join(''));
    for (const n of forcedScenes ? [Number(forcedScenes)] : [1, 4, 6, 8, 9]) {
      const row = Object.values(MIXES)
        .map((mix) => peso(price({ scenes: n, mix }).bufferedPhp).padStart(14))
        .join('');
      console.log(`    ${String(n).padStart(6)}   ${row}`);
    }

    console.log('\n  WHAT A PAYING CUSTOMER ACTUALLY GETS (SCENE_CAP, utils/planGate.ts):');
    for (const [plan, cap] of Object.entries(live.SCENE_CAP)) {
      if (cap === 0) {
        console.log(`    ${plan.padEnd(10)} ${String(cap).padStart(2)} scenes   no video rendered`);
        continue;
      }
      const c = price({ scenes: cap, mix: typical });
      console.log(`    ${plan.padEnd(10)} ${String(cap).padStart(2)} scenes   ${peso(c.bufferedPhp).padStart(7)} / finished ad`);
    }

    console.log(`\n  THE SAMPLE BATCH (${live.RECIPES.length} recipes, workflows/format_sample_readiness.md):`);
    for (const n of [4, 6, 9]) {
      const each = price({ scenes: n, mix: typical }).bufferedPhp;
      const note = n === OBSERVED.scenes ? '   <- what the ₱6,600 projection assumed' : '';
      console.log(`    ${String(n).padStart(2)} scenes each   ${peso(each).padStart(7)} x ${live.RECIPES.length}   =  ${peso(each * live.RECIPES.length)}${note}`);
    }

    // The two findings that made this tool worth writing.
    const cin = probe.perType.cinematic;
    const bro = probe.perType['b-roll'];
    console.log('\n  FLAGS:');
    if (cin.seconds > bro.seconds) {
      console.log(`    · cinematic bills ${cin.seconds}s vs b-roll's ${bro.seconds}s. pickSceneDuration() asks for 6s,`);
      console.log(`      Kling only offers [5,10], and the fallback rounds UP. Every cinematic scene`);
      console.log(`      costs ${peso((cin.usd - bro.usd) * fx)} more than a b-roll one for screen time you then trim.`);
    }
    const unverified = SCENE_TYPES.filter((t) => probe.perType[t].provenance !== 'verified');
    if (unverified.length) {
      const models = [...new Set(unverified.map((t) => probe.perType[t].model))];
      console.log(`    · ${models.join(', ')} price is UNVERIFIED — ${unverified.join(' + ')} scenes route there.`);
      console.log(`      Calibrated against one render, not read off a price page. One more paid`);
      console.log(`      render at a DIFFERENT scene count would pin it properly.`);
    }
    console.log(`    · pricing_unit_economics.md §2 still prices every scene at Veo Fast @1080p.`);
    console.log(`      The producer defaults to ${resolution} and routes b-roll/cinematic to Kling.`);
    console.log(`      The doc's ₱380 / ₱528 / ₱673 table describes a pipeline we no longer run.`);
    console.log('');
  });
}

main(process.argv.slice(2)).catch((err) => {
  console.error('render_cost_estimate failed:', err.message);
  process.exitCode = 1;
});
