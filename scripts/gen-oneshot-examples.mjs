// Parallel Codex image-gen for the One-Shot guided-slot reference examples.
// Fans all prompts out at once (not sequential) and TIMES the batch — so we can
// see exactly how long N images take, like the "100 in ~4 min" parallel path.
//
// Usage: node scripts/gen-oneshot-examples.mjs
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';

const GEN = '.claude/skills/codex-image/generate.mjs';
const SIZE = '1024x1024';

const IMAGES = [
  { out: 'public/examples/ex-product-handheld.png', prompt: "Photorealistic casual phone snapshot: a Filipino person's hand holding a consumer product (a bottled juice drink) with the brand label clearly readable and the whole product visible in frame, bright natural daylight, simple everyday background, authentic UGC look, not a studio shoot, sharp focus, no text overlays or watermarks" },
  { out: 'public/examples/ex-storefront.png', prompt: 'Photorealistic phone snapshot of a small Filipino business storefront facade with a simple hanging signboard, bright daylight, real street, authentic everyday look, sharp focus, no text overlays or watermarks' },
  { out: 'public/examples/ex-ambiance.png', prompt: 'Photorealistic cozy inviting interior of a small Filipino service business such as a salon or cafe, warm pleasant lighting, clean and bright, authentic phone photo, no text overlays or watermarks' },
  { out: 'public/examples/ex-staff.png', prompt: 'Photorealistic candid photo of a real staff member working at a small Filipino business, bright natural light, authentic, sharp focus, no text overlays or watermarks' },
  { out: 'public/examples/ex-team.png', prompt: 'Photorealistic candid photo of a small Filipino team working together at their business, real genuine moment, bright natural light, authentic, no text overlays or watermarks' },
  { out: 'public/examples/ex-facade.png', prompt: 'Photorealistic real-estate listing photo: exterior curb view of a modest Filipino house or low-rise condo building, bright daylight, clear and wide, no text overlays or watermarks' },
  { out: 'public/examples/ex-living.png', prompt: 'Photorealistic real-estate listing photo: a bright clean living room (sala) of a Filipino home, wide angle, natural daylight, tidy, no text overlays or watermarks' },
  { out: 'public/examples/ex-kitchen.png', prompt: 'Photorealistic real-estate listing photo: a clean bright residential kitchen, natural daylight, tidy, no text overlays or watermarks' },
  { out: 'public/examples/ex-bedroom.png', prompt: 'Photorealistic real-estate listing photo: a tidy bright bedroom with made bed, natural daylight, no text overlays or watermarks' },
  { out: 'public/examples/ex-view.png', prompt: 'Photorealistic photo: the view from a condo balcony or large window overlooking city skyline or greenery, bright daylight, no text overlays or watermarks' },
  { out: 'public/examples/ex-amenities.png', prompt: 'Photorealistic real-estate photo: a clean condominium amenity such as a swimming pool or gym lobby, bright, inviting, no text overlays or watermarks' },
  { out: 'public/examples/ex-location.png', prompt: 'Photorealistic photo of a Filipino neighborhood street / location on a clear day, real and authentic, no text overlays or watermarks' },
];

const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;
const have = (out) => existsSync(out) && statSync(out).size > 1000;
const TODO = IMAGES.filter((i) => !have(i.out));
const SKIPPED = IMAGES.length - TODO.length;
const t0 = Date.now();
console.log(`▶ ${TODO.length} images to generate in PARALLEL via Codex (${SKIPPED} already present, skipped)…\n`);

function gen({ out, prompt }) {
  const start = Date.now();
  const name = out.split('/').pop();
  return new Promise((resolve) => {
    const child = spawn('node', [GEN, '--prompt', prompt, '--out', out, '--size', SIZE], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.stdout.on('data', () => {}); // drain
    child.on('close', (code) => {
      const dur = Date.now() - start;
      const ok = code === 0 && existsSync(out) && statSync(out).size > 1000;
      console.log(`${ok ? '✓' : '✗'} ${name.padEnd(28)} ${fmt(dur).padStart(7)}${ok ? '' : `   (exit ${code}) ${err.trim().split('\n').slice(-1)[0]}`}`);
      resolve({ name, ok, dur });
    });
  });
}

const results = await Promise.all(TODO.map(gen));
const total = Date.now() - t0;
const okCount = results.filter((r) => r.ok).length;
console.log(`\n──────────────────────────────────────────`);
console.log(`TOTAL: ${okCount}/${TODO.length} new images in ${fmt(total)} (wall-clock, parallel) · ${SKIPPED} skipped`);
if (okCount < TODO.length) process.exitCode = 1;
