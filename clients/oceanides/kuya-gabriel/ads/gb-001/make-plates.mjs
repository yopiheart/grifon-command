#!/usr/bin/env node
// GB-001 plate factory — tatlong talking plate ni Gabriel, IISANG jobsite.
//
//   node clients/oceanides/kuya-gabriel/ads/gb-001/make-plates.mjs [s1|s2|s3 ...]
//
// Recipe ito, hindi output. Gitignored ang plates/ — ang file na to ang
// pinagmulan, para kayang ulitin ng susunod na session nang eksakto.
//
// ANG DALAWANG BATAS NA HINDI PWEDENG KALIMUTAN
//  1. `gabriel-ref-5-body-master.jpg` sa BAWAT generation. Kapag mukha lang ang
//     ibinigay, iimbento ng model ang katawan at mukhang kinabit ang ulo.
//  2. FACE-TO-CAMERA sa talking plates — front-neutral ref LANG. Ang 3/4 refs
//     ay para sa stills; kulang ang face data doon at nagmo-morph sa Veo.
//
// ANG LUNDAG SA LAPIT (framingRule, Neil 2026-08-03): close -> medium -> tight.
// Ang v1 ay tatlong waist-up body angle kaya walang lundag ang mga cut. Ang
// mukha ang nagbebenta sa talking ad, at ang mahigpit na framing ay siya ring
// nagpapaliit ng identity-drift surface.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const REFS = 'clients/oceanides/kuya-gabriel/refs';
const BODY = `${REFS}/gabriel-ref-5-body-master.jpg`;
const FACE = `${REFS}/gabriel-ref-1-front-neutral.jpg`;
const OUTDIR = 'clients/oceanides/kuya-gabriel/ads/gb-001/plates';

for (const f of [BODY, FACE]) {
  if (!existsSync(f)) { console.error(`[plates] walang ref: ${f} — patakbuhin mula sa repo root`); process.exit(1); }
}

// --- Ang mga bloke, sa pagkakasunod na hinihingi ng marvin-avatar skill ------

const INPUT_ROLES =
  'The body-master image is the source of truth for the man\'s exact current body, head-to-body ratio, neck, ' +
  'shoulders, torso, arms, forearm tattoo and wristband. The second image is used ONLY for his front face and ' +
  'his neutral, unsmiling expression.';

// Pinakamataas na priyoridad. Ang bawat salitang nagpapalaki o nagpapapayat ay
// naglalayo sa kanya sa totoong tao (IDENTITY.md).
const BODY_LOCK =
  'Body exactly as the body master: stocky and large-framed with a soft belly and a round face, broad but SOFT ' +
  'and slightly sloping shoulders that are never squared or held upright, a thick neck with a slight double chin, ' +
  'and ordinary arms. His head is roughly one third the width of his shoulders, exactly as in the body master. ' +
  'Do NOT slim him, do NOT narrow his face, do NOT add muscle, width, height, or a jawline he does not have. ' +
  'If in doubt, render the head slightly smaller rather than slightly larger. He is never athletic, muscular, ' +
  'broad-shouldered, V-shaped, powerful, solid, fit, trim, or heroic.';

const FACE_LOCK =
  'Preserve his real head shape, hairline, brows, small dark slightly monolid eyes, wide round-tipped nose, ' +
  'cheeks, ears, jaw and lips; clean-shaven with only a faint moustache shadow; natural pores and skin texture. ' +
  'His hair is thick and black with real height and volume on top, combed up and swept back, textured and ' +
  'slightly messy, longer on top and tapering naturally at the sides — it is NOT a fade. Warm tan Filipino skin ' +
  'tone exactly as in the references. Render ONE continuous person: natural jaw-to-neck, ear-to-neck, collar, ' +
  'shoulder and shirt connections; the face and the body share the SAME light direction, skin texture, softness, ' +
  'grain, white balance and focus; the face is no sharper, brighter, or smoother than the body. No halo, no ' +
  'cutout hair, no floating head, no face-swap look.';

// Sarili nyang desisyon (IDENTITY.md 2026-07-30). Hindi to style preference.
const NO_SMILE =
  'Expression: mouth closed and relaxed, NO smile, no visible teeth, no lip-corner lift, no cheek raise, jaw ' +
  'level, eyes open and looking straight down the lens. A calm expert, not an excited salesman.';

// Ang aral na tatlong beses bumagsak sa cover: PIGMENT, hindi ILAW.
const PIGMENT_NOT_LIGHT =
  'His warm tan colouring is his NATURAL SKIN PIGMENT, not a warm light falling on him. The light itself stays ' +
  'neutral. If you compare a patch of his forearm to the concrete beside him, they must read as the same exposure ' +
  'and the same white balance. He must not separate or pop from the background.';

// jobsite-a, napili ni Neil 2026-08-03. WALANG SASAKYAN — dyan nagsisimula ang
// imbentong asul na tanker, at ang truck-as-third-ref ang nagturo sa model na
// mag-composite noong cover v1.
const SCENE =
  'Scene: an ordinary Philippine back yard beside a house. He stands next to an open round concrete septic ' +
  'access cover set into the ground. Plain concrete and patchy grass around it, a simple painted house wall ' +
  'behind him, a few banana and ornamental plants at the edge. There is NO vehicle of any kind anywhere in the ' +
  'frame — no truck, no van, no tanker. No exposed sewage, no mess, no dramatic emergency.';

// Positibong target MUNA, saka ang bawal. Kapag purong bawal, sinasagot ng model
// sa pamamagitan ng pagbawas ng liwanag.
const LIGHT =
  'Light: a bright but fully OVERCAST day — a broad white sky acting as ONE single soft light source for the man ' +
  'AND for the whole scene. Well exposed, neutral white balance, colours alive: the green of the plants and the ' +
  'warm grey of the concrete both read true. One light for everything. No direct sun, no hard shadows on the ' +
  'ground, no bright sun patches, no rim light, no golden-hour orange cast, and no open-shade pocket that would ' +
  'separate him from the scene.';

// Anchors: wristband + hikaw + tattoo. WALANG RELO — kay Marvin yun.
const WARDROBE =
  'Wardrobe: a clean plain navy work polo with the collar open, relaxed fit with the same loose drape as the ' +
  'shirt in the body master, dark work trousers. No readable text, no logos, no printed graphics. Identity ' +
  'anchors exactly as in the body master wherever they are visible: a Polynesian blackwork tribal sleeve tattoo ' +
  'running from the elbow down toward the wrist on the forearm of the arm that also carries the dark rubber ' +
  'wristband; that black rubber wristband on the same wrist; and a small stud earring in one ear. He wears NO ' +
  'watch of any kind.';

// Nakahalukipkip = pinipiga ang torso = lumalaki ang ulo sa mata (v1 lesson).
const POSE =
  'Pose: standing relaxed and open, arms hanging naturally at his sides or hands loose at his hips — NEVER arms ' +
  'crossed, never a hand near his face.';

const REGISTER =
  'Register: an ordinary candid phone photo taken by a coworker — slight phone HDR, mild JPEG softness, natural ' +
  'grain in the shadows, slightly imperfect framing, authentic UGC feel. Not a cinematic frame, not an advertisement.';

const BANS =
  'No text, no captions, no subtitles, no phone numbers, no invented logos, no watermarks, no fake signage, no ' +
  'duplicate person, no extra fingers, no distorted hands, no plastic skin, no bodybuilder body, no oversized ' +
  'head, no pasted-on head, no HDR look, no cinematic grading, no studio lighting, no beauty filter, no ' +
  'portrait-mode background blur.';

// --- Ang tatlong framing ----------------------------------------------------
// Ang s1 ang may HEADROOM. Ang hook overlay ay nabubuhay sa y=285-1635 (feed-safe
// 4:5 band) at ang KM-004 doktrina ay malinaw: ang totoong ayos ay nasa PLATE,
// hindi sa pagbaba ng teksto. Kaya mababa sya sa frame at bakante ang itaas.
const PLATES = {
  s1: {
    beat: 'hook + linya 1 — close, eye-level, may headroom para sa hook overlay',
    camera:
      'Camera: an ordinary phone rear camera at about 1.5 metres, at his eye level, standard photo mode. CLOSE ' +
      'head-and-shoulders framing, from the top of his chest to above his head. SIZE AND PLACEMENT, follow this ' +
      'exactly: the top of his hair sits about one third of the way down from the top edge of the frame, and his ' +
      'head from hairline to chin fills roughly one quarter of the total frame height — he is CLOSE and reads ' +
      'large, not a distant figure standing in a garden. Everything above his hair is clear, uncluttered ' +
      'background, leaving real empty headroom. His head and face are turned fully toward the camera, both eyes ' +
      'and his mouth fully visible; torso and shoulders square to the lens. Keep him horizontally centred. ' +
      // Roll 1 ng plate na to ay isang PLAIN NA PADER at hindi tumugma sa s2/s3 —
      // ibang shoot ang dating, na siya mismong sakit na pinapatay ng framingRule.
      // Kaya sapilitan na ngayon na kita ang bakuran, kahit malabo.
      'BACKGROUND CONTINUITY — REQUIRED: this photo is taken in the SAME back yard as the other shots in this ' +
      'set, and the yard must be recognisable behind him even though the framing is close. Behind and beside his ' +
      'shoulders you can clearly see the yard receding: the concrete path running along the pale painted house ' +
      'wall, the low grey concrete boundary wall, and the banana plants and green shrubs growing along it, all ' +
      'softly out of focus. Do NOT place him against a blank, empty, or featureless wall.',
  },
  s2: {
    beat: 'linya 2 + linya 3 — medium chest-up, slight-low',
    camera:
      'Camera: an ordinary phone rear camera at about 2 metres, held slightly BELOW his eye line and angled a ' +
      'little upward at him, standard photo mode. MEDIUM chest-up framing, from mid-chest to just above his ' +
      'head. His head and face are turned fully toward the camera, both eyes and his mouth fully visible, while ' +
      'his torso and shoulders are angled slightly away from the lens. Keep him horizontally centred.',
  },
  s3: {
    // Slight-HIGH, hindi eye-level. Puna ni Neil 2026-08-03: "parehas ng camera
    // angle ung s1 and s3" — tama, dahil lapit lang ang pinagkaiba nila noon.
    // Tatlong magkaibang taas ngayon: s1 eye-level, s2 slight-low, s3 slight-high.
    beat: 'linya 4 + linya 7 (CTA) — tight face, slight-high',
    camera:
      'Camera: an ordinary phone rear camera at about 1 metre, held SLIGHTLY ABOVE his eye line and angled a ' +
      'little downward at him — a gentle high angle, never a steep one, standard photo mode. TIGHT framing — his ' +
      'face fills most of the frame, from the top of his head down to the base of his neck and the very top of ' +
      'his shoulders. He lifts his chin a little toward the lens so his head and face stay square to the camera, ' +
      'both eyes and his mouth fully visible. This must NOT look like a selfie — no arm in frame, the camera is ' +
      'held by another person. Keep him horizontally centred.',
  },
};

const which = process.argv.slice(2).filter((a) => PLATES[a]);
const targets = which.length ? which : Object.keys(PLATES);

for (const id of targets) {
  const p = PLATES[id];
  const prompt = [
    INPUT_ROLES, BODY_LOCK, FACE_LOCK, NO_SMILE, PIGMENT_NOT_LIGHT,
    SCENE, LIGHT, WARDROBE, POSE, p.camera, REGISTER, BANS,
  ].join(' ');
  const out = path.join(OUTDIR, `${id}.png`);
  console.log(`\n[plates] ${id} — ${p.beat}`);
  const r = spawnSync(process.execPath, [
    '.claude/skills/codex-image/generate.mjs',
    '--prompt', prompt,
    '--out', out,
    '--size', '1024x1536',
    '--edit', BODY,
    '--edit', FACE,
  ], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`[plates] BAGSAK ang ${id} (exit ${r.status})`); process.exit(r.status || 1); }
}
console.log('\n[plates] ✓ tapos. Eyeball gate bago ang Veo — QA ko ay triage lang.');
