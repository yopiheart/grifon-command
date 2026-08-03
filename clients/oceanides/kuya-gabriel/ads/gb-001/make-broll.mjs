#!/usr/bin/env node
// GB-001 b-roll — dalawang insert na bumabasag sa magkaparehong beat.
//
//   node clients/oceanides/kuya-gabriel/ads/gb-001/make-broll.mjs [b1|b2 ...]
//
// BAKIT ITO UMIIRAL (Neil, 2026-08-03): tatlong plate lang ang ad, kaya ang
// beat 1->2 at 3->4 ay parehong plate na magkasunod. Punch-in lang ang
// naghihiwalay. Ang b-roll ang naghihiwalay nang totoo — at $0 sya: still mula
// sa codex-image + push-in sa FFmpeg, walang bagong Veo roll. Tuloy ang boses,
// ibang larawan lang ang nakikita.
//
// ⛔ WALANG MUKHA, WALANG IDENTITY REF. Kuwento ng CUSTOMER ang dalawang ito
// ("kahit anong plunger", "isa ang presyo sa phone"), kaya ANONYMOUS na kamay —
// walang tattoo, walang wristband, walang hikaw. Ang Gabriel anchors ay para
// LANG sa b-roll kung saan sya mismo ang nagde-demo (marvin-avatar skill).
//
// ⛔ WALANG NABABASANG TEKSTO. Dyan nag-iimbento ang model at dyan bumabagsak
// ang render_audit. Kaya walang numero, walang resibong may print, walang screen
// na naka-on.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const OUTDIR = 'clients/oceanides/kuya-gabriel/ads/gb-001/broll';

// Iisang araw, iisang ilaw — kailangang kapatid ng plates ang dating nito,
// kung hindi ay mukha syang stock footage na siningit.
const LOOK =
  'Light: soft, even, neutral daylight from an overcast sky — no direct sun, no hard shadows, no warm orange ' +
  'cast, neutral white balance, well exposed. Register: an ordinary candid phone photo, slight phone HDR, mild ' +
  'JPEG softness, natural grain in the shadows, slightly imperfect framing, authentic UGC feel. Not cinematic, ' +
  'not an advertisement, no studio lighting, no beauty filter.';

const HANDS =
  'The hands are an ordinary adult Filipino person\'s hands with warm tan skin, plain short clean nails, and ' +
  'NO tattoos, NO wristband, NO watch, NO rings, NO jewellery of any kind. Natural skin texture and knuckles.';

const BANS =
  'No face, no head, no person\'s face anywhere in frame. No text, no writing, no numbers, no printing, no ' +
  'captions, no logos, no brand marks, no watermarks, no signage. No extra fingers, no distorted or malformed ' +
  'hands, no plastic skin, no portrait-mode background blur, no HDR look, no cinematic grading.';

const BROLL = {
  b1: {
    beat: 'beat 2 — L1 "Kahit anong plunger, balik nang balik ang problema."',
    // Roll 1 ay may goma ng plunger na NAKALITAW sa ibabaw ng tubig — naka-pose,
    // hindi ginagamit. At mahaba at walang siko ang ibabang braso.
    prompt:
      'A close, waist-height phone photo taken looking down into an ordinary, clean Philippine household ' +
      'bathroom: two hands grip the wooden handle of a common rubber plunger, one hand directly above the ' +
      'other, both forearms entering the frame together from the upper right with the elbows out of shot. ' +
      'CRITICAL — the plunger has BOTH of its parts and both must be clearly readable: a wooden handle, and at ' +
      'the bottom of that handle a big black rubber bell, a full rounded dome about as wide as a hand. That ' +
      'black rubber bell is pressed down over the drain opening at the bottom of the toilet bowl and sits ' +
      'UNDER the water but stays plainly VISIBLE through it — the water is clear and shallow enough that you ' +
      'can see the whole round shape of the rubber bell beneath the surface, slightly rippled by the water. The ' +
      'wooden handle rises up out of the water into the hands. The rubber bell must NOT be missing, hidden, ' +
      'cropped, or dissolved into the water. The bowl of the plain white toilet is filled with clear water. Plain ' +
      'tiled floor and a plastic tabo and pail at the edge of the frame, soft daylight from a small window out ' +
      'of shot. Everything is clean: clear water only, no filth, no sewage, no mess, no splashing. ' + HANDS +
      ' ' + LOOK + ' ' + BANS,
  },
  b2: {
    beat: 'beat 4 — L3 "Isa ang presyo sa phone, iba na sa receipt."',
    // Roll 1 ay may DALAWANG KALIWANG KAMAY (nakita ni Neil, 2026-08-03). Ang
    // lunas ay hindi mas mahabang utos kundi ISANG KAMAY — kapag isa lang, wala
    // nang pwedeng ma-mirror ng model. Nakapatong na lang ang papel, hindi
    // hawak. At ang "completely blank" ko ay gumawa ng bagong sira: purong
    // puting parihaba na mukhang tinapal. Nakatupad ngayon ang printed side
    // papasok — totoong papel ang dating, at wala pa ring makikitang teksto.
    prompt:
      'A close phone photo, seen from behind and slightly to the side, of a person standing outdoors in an ' +
      'ordinary Philippine back yard. ONE HAND ONLY is visible anywhere in the picture: their right hand, ' +
      'holding a dark smartphone flat against their right ear as they take a call. CRITICAL — the phone is the ' +
      'correct way round for a real call: its glass SCREEN faces INWARD, pressed against the side of their head ' +
      'and ear, so the screen cannot be seen at all; what the camera sees is the phone\'s plain outer BACK ' +
      'shell and its side edge, with the small camera lenses on that back panel. Their other arm is completely ' +
      'out of frame and must not appear. Resting on a low ' +
      'concrete ledge in the soft foreground is a small off-white slip of paper, folded once with its printed ' +
      'side folded inward and hidden, slightly creased and a little dog-eared so it reads as real used paper — ' +
      'no text, print, writing or numbers are visible on it anywhere. Only the one hand, the side of the ' +
      'shoulder and the back edge of the head come into frame — the face is NOT visible at all. They wear a ' +
      'plain light grey cotton t-shirt: NOT a navy shirt and NOT a polo, because this person is the customer ' +
      'and must not be mistaken for the man in the talking shots, who wears navy. Behind them, ' +
      'softly out of focus, a grey concrete boundary wall, patchy grass and green banana leaves. ' + HANDS +
      ' ' + LOOK + ' ' + BANS,
  },
};

const which = process.argv.slice(2).filter((a) => BROLL[a]);
const targets = which.length ? which : Object.keys(BROLL);

for (const id of targets) {
  const b = BROLL[id];
  const out = path.join(OUTDIR, `${id}.png`);
  console.log(`\n[broll] ${id} — ${b.beat}`);
  const r = spawnSync(process.execPath, [
    '.claude/skills/codex-image/generate.mjs',
    '--prompt', b.prompt,
    '--out', out,
    '--size', '1024x1536',
  ], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`[broll] BAGSAK ang ${id} (exit ${r.status})`); process.exit(r.status || 1); }
}
console.log('\n[broll] ✓ tapos.');
