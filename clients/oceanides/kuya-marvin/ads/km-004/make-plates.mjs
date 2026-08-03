#!/usr/bin/env node
// KM-004 plates + b-roll stills. Recipe ito, hindi output.
//
//   node clients/oceanides/kuya-marvin/ads/km-004/make-plates.mjs
//
// BAKIT HINDI tools/codex-image-batch.mjs: walang --edit (identity ref) support
// yun, at SAPILITAN ang dalawang ref sa bawat Marvin generation (marvin-avatar).
// Kapag mukha lang ang ibinigay, iimbento ng model ang katawan at magmumukhang
// kinabit ang ulo ("mukhang kinabit," Neil 2026-07-19). Pinapatakbo nito ang
// generate.mjs nang PARALLEL, hindi sunod-sunod.
//
// Ang dalawang b-roll ay WALANG identity ref — anonymous na kamay sila, kuwento
// ng customer, kaya bawal ang tattoo/relo ni Marvin doon.

import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync } from 'node:fs';

const AD = 'clients/oceanides/kuya-marvin/ads/km-004';
const REFS = 'clients/oceanides/kuya-marvin/refs';
const GEN = '.claude/skills/codex-image/generate.mjs';

const BODY = `${REFS}/marvin-ref-5-body-master.jpg`;
const FACE = `${REFS}/marvin-ref-1-front-neutral.jpg`;

// --- mga bloke, sa pagkakasunod ng marvin-avatar SKILL.md --------------------

const ROLES =
  'The first image is the body-master and is the source of truth for his exact current body, ' +
  'head-to-body ratio, neck, shoulders, torso, arms, forearm tattoo and wrist watch. ' +
  'The second image is used only for his front face and neutral expression.';

const BODY_BLOCK =
  'Exact body, highest priority: normal non-bodybuilder build, natural torso width, relaxed ' +
  'slightly sloping shoulders, average arms, natural waist, exact neck thickness, exact ' +
  'head-to-body scale as the body-master. Keep the forearm tattoo and the wrist watch exactly ' +
  'as placed in the body-master image when visible, on the forearm of the arm that also carries ' +
  'the watch.';

const FACE_BLOCK =
  'Preserve his real head shape, hairline, short faded haircut, brows, eyes, nose, cheeks, ears, ' +
  'jaw, lips, light mustache, sparse chin stubble, warm tan Filipino skin tone exactly as in the ' +
  'references, natural pores. Render ONE continuous person: natural jaw-to-neck, ear-to-neck, ' +
  'collar, shoulder and shirt connections; face and body share the SAME light direction, skin ' +
  'texture, softness, grain, white balance and focus; face no sharper, brighter or smoother than ' +
  'the body. No halo, no cutout hair, no floating head, no face-swap look.';

// EXPRESSION LOCK. Walang emotional-affect word dito (PACING Fix 3) — ang tono ay
// dala ng STS clone, hindi ng mukha. Explicit ang no-smile: tatlong beses ngumiti
// si Gabriel sa GB-001 kahit hinigpitan ang prompt.
const EXPRESSION =
  'Expression is mouth-level only: mouth closed and relaxed, jaw level, NO smile, no visible ' +
  'teeth, no raised cheeks. Eyes open, looking straight into the lens. Calm and unhurried.';

const FACE_TO_CAMERA =
  'His HEAD and FACE are turned fully toward the camera, both eyes and mouth fully visible; ' +
  'torso and shoulders angled slightly away from the lens.';

// jobsite-b — ROTATION. Hindi ang jobsite ng KM-003, hindi rin ang kay GB-001.
const SCENE =
  'He is standing in an ordinary Philippine backyard beside an open concrete septic access cover ' +
  'set into the ground, warm cement underfoot, a weathered painted hollow-block wall behind him, ' +
  'green banana and leafy plants to one side, deep blue sky with white cumulus above. ' +
  'There is NO vehicle anywhere in the frame.';

// ROTATION — desisyon ni Neil 2026-08-03. Rust, hindi navy: KM-003 = navy tee.
const WARDROBE =
  'He wears a plain rust / terracotta relaxed-fit crew-neck field tee with a loose drape matching ' +
  'the body-master shirt silhouette, and dark work pants. No logos, no readable text anywhere on ' +
  'his clothing.';

// 🔴 POSITIBONG TARGET MUNA, SAKA ANG BAWAL. Ang purong listahan ng bawal ay
// sinasagot ng model sa pagbawas ng liwanag — underexposed at malamig ang labas,
// at yun ang gray-on-gray na tinanggihan ni Neil 2026-07-28. KULAY != ILAW.
const LIGHT =
  'Lighting: bright tropical midday daylight, open sky, well exposed, neutral white balance, ' +
  'vivid natural colour in the scene — deep blue sky, green leaves, warm cement. He is standing ' +
  'in OPEN SHADE so the light on his FACE is soft and even. Under that: no hard shadows on his ' +
  'skin, no sun patch on his face, no rim light, no golden-hour orange cast, and never a flat ' +
  'grey-on-grey look.';

const REGISTER =
  'Ordinary phone photo, natural daylight, slight phone HDR, mild JPEG softness, natural grain in ' +
  'the shadows, imperfect candid framing, authentic UGC feel. Not cinematic, not a studio shot.';

const BANS =
  'No text, no phone numbers, no invented logos, no watermarks, no fake signage, no duplicate ' +
  'person, no extra fingers, no distorted hands, no warped equipment, no plastic skin, no ' +
  'bodybuilder body, no oversized face, no pasted head, no HDR look, no cinematic grading, no ' +
  'studio lighting, no beauty filter.';

const plate = (framing) =>
  [ROLES, BODY_BLOCK, FACE_BLOCK, EXPRESSION, FACE_TO_CAMERA, framing, SCENE, WARDROBE, LIGHT, REGISTER, BANS].join(' ');

// --- ang anim ---------------------------------------------------------------

const JOBS = [
  {
    out: `${AD}/plates/s1.png`,
    refs: [BODY, FACE],
    prompt: plate(
      'Framing: close head-and-shoulders portrait at eye level, shot at arm\'s length. Place him ' +
      'slightly LOW in the tall frame so there is clean, uncluttered sky and wall in the upper ' +
      'third above his head.',
    ),
  },
  {
    out: `${AD}/plates/s2.png`,
    refs: [BODY, FACE],
    prompt: plate(
      'Framing: medium chest-up, camera a little BELOW eye level looking slightly up at him.',
    ),
  },
  {
    out: `${AD}/plates/s3.png`,
    refs: [BODY, FACE],
    prompt: plate(
      'Framing: tight face close-up at eye level, his face filling much of the frame, top of head ' +
      'to upper chest.',
    ),
  },
  {
    out: `${AD}/plates/s4.png`,
    refs: [BODY, FACE],
    prompt: plate(
      'Framing: close-up head-and-shoulders at eye level filling the frame. Keep the LOWER third ' +
      'of the frame simple and uncluttered.',
    ),
  },
  // --- b-roll: ANONYMOUS na kamay. Walang identity ref, walang anchor ni Marvin.
  {
    out: `${AD}/broll/b1.png`,
    refs: [],
    prompt:
      'Ordinary phone photo, close shot: a person\'s anonymous hands gripping a rubber toilet ' +
      'plunger, the rubber cup fully SUBMERGED in murky water inside a toilet bowl, a plastic ' +
      'dipper and a pail on the tiled bathroom floor beside it. Only hands and forearms are ' +
      'visible — no face, no tattoos, no watch, no jewellery, no rings. Bright ordinary bathroom ' +
      'daylight from a window, well exposed, neutral white balance, natural colour. Slight phone ' +
      'HDR, mild JPEG softness, natural grain, imperfect candid framing, authentic UGC feel. ' +
      'No text, no readable labels or writing, no logos, no watermarks, no extra fingers, no ' +
      'distorted hands, no plastic skin, no cinematic grading, no studio lighting.',
  },
  {
    out: `${AD}/broll/b2.png`,
    refs: [],
    prompt:
      'Ordinary phone photo, over-the-shoulder from behind and slightly to the side so NO face is ' +
      'visible: ONE anonymous hand holding a mobile phone up to an ear, the phone screen dark and ' +
      'switched off. A folded sheet of plain paper rests on a low concrete ledge in the ' +
      'foreground. Ordinary Philippine backyard, a painted hollow-block wall and green leafy ' +
      'plants behind, bright tropical daylight, well exposed, neutral white balance, natural ' +
      'colour. No tattoos, no watch, no jewellery, no rings. Slight phone HDR, mild JPEG ' +
      'softness, natural grain, imperfect candid framing. No text, no readable writing on the ' +
      'paper, no logos, no watermarks, no extra fingers, no distorted hands, no cinematic grading.',
  },
];

// --- runner: PARALLEL, hindi sunod-sunod ------------------------------------

mkdirSync(`${AD}/plates`, { recursive: true });
mkdirSync(`${AD}/broll`, { recursive: true });

const have = (p) => existsSync(p) && statSync(p).size > 1000;
const force = process.argv.includes('--force');
const todo = JOBS.filter((j) => force || !have(j.out));

if (!todo.length) {
  console.log('Buo na lahat. --force kung gusto mong ulitin.');
  process.exit(0);
}

const t0 = Date.now();
console.log(`Gagawa ng ${todo.length} larawan nang sabay-sabay...\n`);

const run = (job) =>
  new Promise((resolve) => {
    const args = [GEN, '--prompt', job.prompt, '--out', job.out, '--size', '1024x1536'];
    for (const r of job.refs) args.push('--edit', r);
    const name = job.out.split('/').pop();
    const s = Date.now();
    const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const secs = ((Date.now() - s) / 1000).toFixed(0);
      const ok = code === 0 && have(job.out);
      console.log(`${ok ? '  OK  ' : ' BAGSAK '} ${name}  ${secs}s`);
      if (!ok && err.trim()) console.log(`        ${err.trim().split('\n').slice(-3).join('\n        ')}`);
      resolve(ok);
    });
  });

const results = await Promise.all(todo.map(run));
const good = results.filter(Boolean).length;
console.log(`\n${good}/${todo.length} pasado — ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('\n⚠️  Machine triage lang ito. MATA NI NEIL ang tanging balidong hatol.');
process.exit(good === todo.length ? 0 : 1);
