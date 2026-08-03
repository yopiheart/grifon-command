#!/usr/bin/env node
// Litrato ni Marvin para sa `FieldInspector` ng oceanidesph.com.
//
//   node clients/oceanides/kuya-marvin/make-page-portrait.mjs
//
// BAKIT SYA UMIIRAL: si Gabriel lang ang nasa FieldInspector section. Kung si
// Marvin ang nasa ad at si Gabriel ang bumungad sa page, sira ang message match
// — at nasa CLOSE yun naka-upo, ang tanging bagay na sinusubukan nating ayusin.
// Dalawang inspector, hindi isa.
//
// BRIEF NI NEIL (2026-08-03): "street daylight believability... ibang damit
// naman... make him pogi."
//   street   — kalye, hindi ang bakuran ng KM-004. Ibang lugar bawat asset.
//   damit    — powder blue na may kwelyo. Hindi navy (KM-003), hindi rust
//              (KM-004). Kwelyo dahil page ng tiwala to, hindi ad.
//   pogi     — mainit at kumpiyansa, may ngiti. HINDI ibig sabihin nun ay
//              payat o guwapo-na-modelo: ang pagpapapayat sa kanya ang mismong
//              bagay na sumisira ng believability (marvin-avatar).
//
// TEETH RULE (Neil, 2026-07-20): kompleto at pantay ang ngipin sa bawat
// nakangiting render. HUWAG kopyahin ang gap sa reference.
//
// Lahat ng iba ay pareho pa rin sa recipe: body master sa bawat generation,
// daylight master na ilaw (KULAY != ILAW), positibong target bago ang bawal.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const REFS = 'clients/oceanides/kuya-marvin/refs';
const GEN = '.claude/skills/codex-image/generate.mjs';
const OUT = 'clients/oceanides/kuya-marvin/page-portrait';

const BODY = `${REFS}/marvin-ref-5-body-master.jpg`;
const FACE = `${REFS}/marvin-ref-4-front-smiling.jpg`;   // nakangiti, kaya ref-4

const COMMON = [
  'The first image is the body-master and is the source of truth for his exact current body, ' +
    'head-to-body ratio, neck, shoulders, torso, arms, forearm tattoo and wrist watch. The second ' +
    'image is used only for his front face and warm smiling expression.',

  'Exact body, highest priority: normal non-bodybuilder build, natural torso width, relaxed ' +
    'slightly sloping shoulders, average arms, natural waist, exact neck thickness, exact ' +
    'head-to-body scale as the body-master. Do NOT slim him, do NOT broaden him. Keep the forearm ' +
    'tattoo and the wrist watch exactly as placed in the body-master when visible. He has exactly ' +
    'ONE tattoo, on that single forearm only; the other forearm is plain bare skin.',

  'Preserve his real head shape, hairline, short faded haircut, brows, eyes, nose, cheeks, ears, ' +
    'jaw, lips, light mustache, sparse chin stubble, warm tan Filipino skin tone exactly as in the ' +
    'references, natural pores. Render ONE continuous person: natural jaw-to-neck, ear-to-neck, ' +
    'collar, shoulder and shirt connections; face and body share the SAME light direction, skin ' +
    'texture, softness, grain, white balance and focus; face no sharper, brighter or smoother than ' +
    'the body. No halo, no cutout hair, no floating head, no face-swap look.',

  'The whole picture is ONE exposure from ONE ordinary phone camera at ONE moment. His face and ' +
    'the background are equally in focus: NO portrait mode, NO shallow depth of field, NO ' +
    'background blur or bokeh, NO subject cut-out. His neck is thick and continuous into the ' +
    'collar with no rim, no outline and no skin-tone shift at the jaw. Shoulders relaxed and ' +
    'rounded, never squared.',

  // 🔴 TEETH RULE — explicit override sa reference
  'Expression: a warm, genuine, relaxed smile, friendly and unhurried, looking straight into the ' +
    'lens. Render his smile with COMPLETE, even, natural teeth; do NOT reproduce the gap between ' +
    'his upper front teeth from the reference. Eyes open and engaged, slight natural crinkle. He ' +
    'looks like someone you would be glad to see arrive at your gate.',

  // Damit — rotation. Hindi navy, hindi rust.
  'He wears a clean powder-blue short-sleeve collared polo shirt, relaxed fit with a loose drape ' +
    'matching the body-master silhouette, and dark work trousers. No logos, no readable text ' +
    'anywhere on his clothing.',

  // 🔴 DAYLIGHT MASTER — KULAY != ILAW. Positibong target MUNA, saka ang bawal.
  'Lighting: bright tropical midday daylight, open sky, well exposed, neutral white balance, vivid ' +
    'natural colour in the scene: deep blue sky, green leaves, warm sunlit concrete. He is standing ' +
    'in OPEN SHADE so the light on his FACE is soft and even. Under that: no hard shadows on his ' +
    'skin, no sun patch on his face, no rim light, no golden-hour orange cast, and never a flat ' +
    'grey-on-grey look.',

  'Ordinary phone photo, natural daylight, slight phone HDR, mild JPEG softness, natural grain in ' +
    'the shadows, candid framing, authentic feel. Not cinematic, not a studio portrait, no beauty ' +
    'filter, no retouching.',

  'No text, no phone numbers, no invented logos, no watermarks, no fake signage, no duplicate ' +
    'person, no extra fingers, no distorted hands, no plastic skin, no bodybuilder body, no ' +
    'oversized face, no pasted head, no HDR look, no cinematic grading, no studio lighting.',
].join(' ');

const JOBS = [
  {
    out: `${OUT}/marvin-page-a.png`,
    prompt: `${COMMON} Framing: chest-up, camera at eye level, shot from about two metres with an ` +
      `ordinary phone. Scene: he is standing on an ordinary Philippine residential street in the ` +
      `shade of a low concrete wall, painted gates and a few parked motorbikes softly visible ` +
      `further down the street behind him, green leaves overhead, bright blue sky above the ` +
      `rooftops. No vehicle near him.`,
  },
  {
    out: `${OUT}/marvin-page-b.png`,
    prompt: `${COMMON} Framing: waist-up, camera at eye level, shot from about two and a half ` +
      `metres with an ordinary phone, him standing slightly off-centre with his shoulders turned ` +
      `a little while his face stays toward the lens. Scene: an ordinary Philippine street corner ` +
      `in daylight, a painted hollow-block wall and a mango tree behind him, bright blue sky with ` +
      `white cumulus, warm sunlit pavement underfoot. No vehicle in the frame.`,
  },
];

mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
console.log(`Gagawa ng ${JOBS.length} portrait nang sabay-sabay...\n`);

const run = (job) =>
  new Promise((resolve) => {
    const args = [GEN, '--prompt', job.prompt, '--out', job.out, '--size', '1024x1536',
      '--edit', BODY, '--edit', FACE];
    const name = job.out.split('/').pop();
    const s = Date.now();
    const child = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      const ok = code === 0;
      console.log(`${ok ? '  OK  ' : ' BAGSAK '} ${name}  ${((Date.now() - s) / 1000).toFixed(0)}s`);
      if (!ok && err.trim()) console.log(`        ${err.trim().split('\n').slice(-3).join('\n')}`);
      resolve(ok);
    });
  });

const res = await Promise.all(JOBS.map(run));
console.log(`\n${res.filter(Boolean).length}/${JOBS.length} sa ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('⚠️  Machine triage lang. MATA NI NEIL ang tanging balidong hatol sa believability.');
