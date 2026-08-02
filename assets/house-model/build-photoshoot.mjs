import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

// Photoshoot lane anchor. Derives from the RAW anchor (cleanest identity source),
// with a hard BREAK so none of the phone rendering carries over.
const SRC = 'assets/house-model/anchor.png';

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour, same age. She must be immediately recognisable as the same individual. ';

const BREAK = 'IMPORTANT: the attached reference is a casual smartphone snapshot. Do NOT copy its image quality, its flat phone rendering, its deep depth of field or its snapshot look. Copy ONLY her identity and face. This new photograph is a high-end fashion and beauty editorial made with medium-format equipment, a professional lighting team and a makeup artist. ';

// M4 — full glam, MUA-executed. One step above the soft glam of the polished lanes.
const M4 = ' Makeup is full editorial glam applied by a professional makeup artist: laminated brows brushed up and cleanly defined, a flawless dewy medium-coverage base with precise concealer, sculpted warm bronzer through the cheek hollow temple and jaw, cream blush draped high across the cheekbones, warm bronze and copper eyeshadow blended through the crease with a soft smoked lower lash line, dark-brown liner melted into the upper lash line with a clean small wing, full lash extensions, intense liquid highlighter on the cheekbone nose tip cupid bow brow bone and inner corner, glossy overlined lip in a warm rosy-brown, and a subtle body highlight along the collarbone and shoulders. Precise and expensive-looking. Real skin texture and pores remain visible under the makeup - editorial retouching keeps texture, it does not erase it.';

const SHOULDERS = ' HEAD AND SHOULDER GEOMETRY - critical: her head, neck and shoulders are anatomically consistent and correctly proportioned, the head neither too large nor too small for the shoulder width, the neck a natural continuation of the torso, the shoulder line narrow and natural rather than wide and squared. Her head and torso face broadly the SAME direction - no body turned away with the head cranked back over the shoulder.';

const EYES = ' Her eyes are rendered with full detail: crisp iris texture, a clearly defined round pupil, real corneal moisture, and a correctly shaped catchlight matching the described light source.';
const HANDS = ' HANDS RULE: hands relaxed and at rest or resting lightly against her own face, neck or hair with a full natural contact. No fine finger manipulation. Every visible hand has exactly five correctly proportioned fingers.';
const REAL = ' Real photography, not a render: visible pores on the nose and cheeks under the makeup, natural skin translucency and subsurface warmth, individual hair strands, real fabric weight. No plastic skin, no waxy smoothing, no airbrushed blur, no face slimming, no eye enlarging. No readable text or brand logos anywhere.';

const JOBS = [
  ['shoot-A-beauty-seamless',
   'A high-end beauty editorial portrait, framed from just below the shoulders up so her head and face dominate the frame. She stands against a smooth warm grey studio seamless backdrop. She wears a simple black strapless top, hair styled in a full glossy blowout with soft volume and real individual strands, small gold hoops. Lighting is a large beauty dish placed high and frontal with a white reflector below her chin, giving even wrapped light, a clean butterfly shadow under the nose, a bright round catchlight high in both eyes, and a soft gradient falling off on the backdrop behind her.' +
   ' Shot on a Phase One XF IQ4 medium format camera with a 110mm f/2.8 lens at f/5.6. Medium-format rendering: enormous tonal depth, extremely fine detail, smooth highlight roll-off, shallow but controlled depth of field with the backdrop softly out of focus.'],

  ['shoot-B-hasselblad-editorial',
   'A fashion editorial portrait, framed from the waist up. She stands against a deep beige studio seamless backdrop, body angled slightly with her head following the same direction, chin lifted. She wears a structured cream blazer with strong shoulders worn over bare skin, hair pulled back sleek and wet-look with a few strands loose, statement gold earrings. Lighting is a large softbox at 45 degrees camera-left as the key with a subtle rim light from behind camera-right separating her shoulder from the backdrop, and a controlled shadow shaping her cheekbone - proper editorial lighting with visible modelling.' +
   ' Shot on a Hasselblad H6D-100c medium format camera with an 80mm f/2.8 lens at f/8. Medium-format rendering: exceptional micro-detail and tonal separation, rich colour depth, smooth highlight roll-off, the backdrop clean and evenly lit.'],

  ['shoot-C-direct-flash',
   'A fashion editorial portrait in the direct-flash snapshot style, framed from the waist up. She stands close to a plain light grey studio wall, body and head both facing the camera. She wears a wet-look black slip dress with real fabric weight, hair slicked back and glossy, chunky silver jewellery. Lighting is a single hard on-camera flash fired straight at her: flat bright frontal light, strong specular highlights on the skin and the wet fabric, a hard-edged dark shadow of her body thrown onto the wall just behind her, small square catchlights in both eyes, and the corners of the frame falling off slightly darker. Deliberately harsh and graphic - the snapshot-flash editorial look.' +
   ' Shot on a Phase One XF IQ4 medium format camera with an 80mm f/2.8 lens at f/11 with studio flash. Medium-format rendering: extreme detail in the specular highlights and skin texture, deep clean blacks in the cast shadow.'],
];

mkdirSync('.tmp/lensref/shoot', { recursive: true });
await Promise.all(JOBS.map(([name, scene]) => new Promise((res) => {
  const t0 = Date.now();
  spawn(process.execPath, [
    '.claude/skills/codex-image/generate.mjs',
    '--edit', SRC, '--size', '1024x1536',
    '--out', `.tmp/lensref/shoot/${name}.png`,
    '--prompt', ID + BREAK + scene + SHOULDERS + M4 + HANDS + EYES + REAL,
  ], { stdio: 'ignore' }).on('close', (c) => {
    console.log(`${c === 0 ? '✓' : '✗'} ${name} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    res();
  });
})));
