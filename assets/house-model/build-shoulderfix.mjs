import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const POL = 'assets/house-model/anchor-polished.png';

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour and length, same age. She must be immediately recognisable as the same individual. Now create a NEW photo of her. ';

const BREAK = 'KEEP the photographic quality of the attached reference - the real-camera rendering, the shallow depth of field, the fine skin detail, the professional craft. But do NOT copy its setting: the dark studio backdrop and the studio lighting must NOT appear anywhere in the new image. She is now on location in a completely different real place with completely different light. ';

// ── THE FIX (pc-13 / pc-16 failed on these two, pc-18 passed because a
//    structured leather jacket hid the shoulder geometry entirely) ──
const SHOULDERS = ' HEAD AND SHOULDER GEOMETRY - this is the most important instruction in the prompt. Her head, neck and shoulders must be anatomically consistent with each other and correctly proportioned: the head is neither too large nor too small for the shoulder width, the neck reads as a natural continuation of the torso, and the shoulder line is narrow and natural rather than wide and squared. Her head and her torso face broadly the SAME direction - she does NOT have her body turned away with her head cranked back over her shoulder toward the lens, because that neck rotation always reads wrong. Crop tightly enough that the full span of both shoulders is not the dominant shape in the frame.';

const M3 = ' Makeup is Filipina soft glam: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small wing, full lash extensions, cream blush draped high across the cheekbones, warm sculpting bronzer in the cheek hollow and jaw, liquid highlighter on the cheekbone nose tip and inner corner, glossy overlined lip in a warm rosy-brown. Skin reads glassy but real pores stay visible.';

const HANDS = ' HANDS RULE: her hands are relaxed and at rest, resting flat on a surface, in a pocket, or holding ONE single large simple object with a full natural grip. No fine finger manipulation. Every visible hand has exactly five correctly proportioned fingers.';
const EYES = ' Her eyes are rendered with full detail: crisp iris texture, a clearly defined round pupil, real corneal moisture, and a correctly shaped catchlight matching the described light source.';
const REAL = ' Real photography: pores visible, natural skin sheen, fine vellus hair, individual hair strands with flyaways, real fabric weight and folds. No airbrushing, no waxy skin, no face slimming, no eye enlarging, no beauty filter. No readable text or brand logos anywhere.';

const JOBS = [
  ['pc-13b-atelier',
   'She stands in a bright sewing atelier, framed from just below the chest up so the frame is filled by her head and upper chest, one hand resting flat on a wooden work table with folded fabric bolts. She wears a soft cream linen shirt buttoned higher with a proper collar that covers her shoulders and collarbone completely, hair tied back loosely. Her head and body both face the same direction, angled gently toward the lens. Large soft daylight from a tall window camera-left raking across the table, the workshop receding into soft warm bokeh behind her.',
   ' Shot on a Fujifilm X-T5 with a 35mm f/1.4 prime at f/2 (50mm equivalent), one and a half metres away. Genuine optical shallow depth of field with no cut-out edge around her hair. Fujifilm rendering: film-simulation colour, muted greens, gentle contrast, fine organic grain.'],

  ['pc-16b-rooftop',
   'She stands on a clean Manila rooftop in the late afternoon, framed from just below the chest up so the frame is filled by her head and upper chest, one hand resting on the parapet, the skyline soft behind her. She wears a rust-coloured linen shirt with sleeves and a collar that covers her shoulders completely, hair down in soft waves. Her head and body both face the same direction, turned gently toward the lens with no twist in the neck. The sun is LOW AND TO HER SIDE, not behind her, so the same single sunlight that lights the whole scene also lights her face directly and warmly from camera-left, with a soft natural shadow falling to the right of her nose. There is NO separate fill on her face and NO bounce card - her face is lit by the same light as everything else in the frame. The skyline compresses into soft golden bokeh.',
   ' Shot on a Canon EOS R6 with an 85mm f/1.4 prime at f/2, two and a half metres away. Slight telephoto compression, genuine optical shallow depth of field with smooth compressed bokeh and no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin.'],
];

mkdirSync('.tmp/lensref/fix', { recursive: true });
await Promise.all(JOBS.map(([name, scene, body]) => new Promise((res) => {
  const t0 = Date.now();
  spawn(process.execPath, [
    '.claude/skills/codex-image/generate.mjs',
    '--edit', POL, '--size', '1024x1536',
    '--out', `.tmp/lensref/fix/${name}.png`,
    '--prompt', ID + BREAK + scene + SHOULDERS + M3 + body + HANDS + EYES + REAL,
  ], { stdio: 'ignore' }).on('close', (c) => {
    console.log(`${c === 0 ? '✓' : '✗'} ${name} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    res();
  });
})));
