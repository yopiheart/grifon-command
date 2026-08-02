import { spawn } from 'node:child_process';

const ANCHOR = 'assets/house-model/anchor.png'; // RAW iPhone anchor — correct, P-phone IS a phone
const CONCURRENCY = 5;

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour and length, same age. She must be immediately recognisable as the same individual. Now create a NEW photo of her. ';

// The first P-phone lane failed because it read as "raw with better clothes".
// This block is the whole differentiator: raw-ugc = accepted light + authored mess.
// polished P-phone = CHOSEN light + CURATED frame.
const POLISH = 'This is a POLISHED post by a lifestyle content creator - it is still a phone photo, but nothing about it is accidental. It is clearly different from a casual snapshot: the light was CHOSEN and waited for, the composition is deliberate with the horizon level and the subject placed intentionally, the background is CLEAN and curated with no clutter, no litter, no stray strangers, no random crop of someone at the frame edge, and her hair and outfit are styled and considered. It is NOT a candid, NOT a friend grabbing a quick photo, NOT an advertisement. It is her own carefully made post. ';

const M3 = ' Makeup is Filipina soft glam: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small wing, full lash extensions, cream blush draped high across the cheekbones and carried lightly over the nose bridge, warm sculpting bronzer in the cheek hollow and jaw, liquid highlighter on the cheekbone, nose tip, cupid bow and inner corner, and a glossy overlined lip in a warm rosy-brown. Skin reads glassy but real pores stay visible on the nose and cheeks.';

const PHONE = ' Shot on an iPhone 16 Pro main camera, 26mm equivalent f/1.8, handheld at chest height. The ENTIRE scene stays sharp and in focus - deep depth of field, no bokeh, no lens blur, no portrait mode. This deep focus is the phone signature and must be preserved. iPhone rendering: slightly over-sharpened edges, fine JPEG texture.';

const FRAME = ' FRAMING RULE: she is framed from mid-thigh up or tighter, never full-body, so her face is large enough to be rendered in full detail.';

// pc-08 failed on a hand doing fine manipulation (fingers on a book spine).
const HANDS = ' HANDS RULE: her hands are either relaxed and at rest, resting flat on a surface, in a pocket, or holding ONE single large simple object with a full natural grip. No fine finger manipulation, no pinching small objects, no fingers interleaved with thin objects. Every visible hand must have exactly five correctly proportioned fingers.';

const EYES = ' Her eyes are rendered with full detail: crisp iris texture, a clearly defined round pupil, real corneal moisture, and a correctly shaped catchlight matching the described light source.';

const TAIL = ' Real photography: pores visible under the makeup, natural skin sheen, individual hair strands, real fabric folds. No airbrushing, no waxy skin, no face slimming, no eye enlarging, no beauty filter. No readable text or brand logos anywhere.';

const JOBS = [
  ['pp-01-rooftop-golden', 'She stands on a clean modern Manila rooftop at golden hour, one hand resting on the parapet, the skyline behind her. She wears a cream linen co-ord set and a fine gold chain, hair down in soft waves. Low golden sun from camera-left rakes warm light across her face with a bright bounce off the pale concrete filling the shadow side so her face is fully and evenly exposed and her makeup stays clearly visible. GRADE: warm and gently lifted, raised blacks, soft amber highlights, mild haze, slightly desaturated shadows.'],

  ['pp-02-cafe-airy', 'She sits at a clean marble cafe table beside a tall window in the morning, both hands wrapped around a single large ceramic latte cup, leaning slightly toward the light. A small vase with one stem sits on the table. She wears an oversized cream cable-knit sweater and small gold hoops, hair loosely tied back with soft face-framing pieces. Broad soft morning daylight through the window as a huge natural softbox wrapping her face evenly. GRADE: airy and clean, bright lifted exposure, low contrast, cool neutral whites, soft creamy highlights.'],

  ['pp-03-dusk-water', 'She stands at the edge of calm shallow water at dusk with a pink and lavender Philippine sky behind her, arms relaxed at her sides, hair caught by a light breeze. The water is mirror-flat and reflects the sunset colours, the beach is clean and empty. She wears a simple black one-piece swimsuit with a thin gold body chain, hair down and slightly damp at the ends. Soft post-sunset ambient light with no direct sun, even and shadowless, cool sky fill with warm pink from the horizon. GRADE: soft pastel, lifted blacks, low contrast, pink and lavender highlights, muted cool shadows, gentle grain.'],

  ['pp-04-bedroom-ootd', 'She stands in a tidy styled bedroom beside a leaning full-length wooden mirror, one hand resting relaxed at her side, the other hanging naturally. The room is clean and intentional with a made bed and one plant. She wears a fitted white ribbed tank tucked into wide-leg charcoal trousers, a small leather shoulder bag on her shoulder, hair styled straight and glossy. Soft daylight from a large window camera-left plus a warm bedside lamp giving a clean directional key with warm fill. GRADE: warm and clean, neutral whites, gentle contrast, slightly warm midtones, soft shadows.'],

  ['pp-05-poolside', 'She sits on the clean tiled edge of a resort pool in the late afternoon, one hand resting flat on the tile beside her, legs in the water. The pool is still and empty, the surroundings uncluttered. She wears a white ribbed one-piece and a thin gold anklet, hair down and slightly damp, skin dewy. Warm low side light from camera-right with bright bounce off the pale tile and water filling her shadow side. GRADE: warm sunlit, rich but not crushed shadows, golden highlights, slightly saturated, clean whites.'],

  ['pp-06-garden-greens', 'She stands in a lush clean tropical garden in open shade, one hand resting on a large monstera leaf with a full flat palm, half turned toward the lens. She wears a soft sage linen dress with real fabric folds, hair down with soft natural waves. Even soft open shade under the canopy with bright green bounce, no harsh sun patches, her face evenly lit. GRADE: muted filmic, desaturated greens, lifted milky blacks, cool neutral cast, fine grain, low contrast.'],

  ['pp-07-balcony-blue-hour', 'She stands on a clean minimal condo balcony at blue hour, both forearms resting on the railing, the city lights beginning to come on behind her. The balcony is tidy with one plant. She wears an oversized grey knit cardigan over a black top, hair down and slightly messy in a styled way. Soft even blue-hour ambient from the open sky as the key with warm tungsten spilling from the room behind the camera onto her face, so she is cleanly lit and warm against a cool background. GRADE: cool-warm split, deep blue background, warm skin, gentle contrast, clean shadows.'],

  ['pp-08-market-flowers', 'She stands at a clean flower stall in the morning holding one single large bouquet wrapped in paper with both arms, looking toward the lens. The stall behind her is tidy rows of buckets with blooms. She wears a simple white poplin shirt and jeans, hair tied back with soft pieces framing her face. Bright soft overcast morning daylight, even and shadowless, colours saturated by the flat light. GRADE: punchy and saturated, vivid florals, crisp whites, moderate contrast, clean neutral balance.'],

  ['pp-09-window-portrait', 'She sits on a clean linen sofa beside a large bright window in a minimal room, one hand resting relaxed on the arm of the sofa, body angled toward the light. The room behind her is uncluttered with one framed print. She wears a soft beige knit top, hair down and glossy. One huge window camera-left as a soft directional key with the room bouncing gentle fill on the right, a clean large rectangular catchlight in both eyes. GRADE: neutral and honest, accurate skin, gentle contrast, soft highlight roll-off, very fine grain.'],

  ['pp-10-street-styled', 'She stands on a clean modern Manila street in the late afternoon, one hand in the pocket of her trousers, shoulders angled with her face turned to the lens. The street behind her is tidy and modern with no clutter and no strangers. She wears a crisp white oversized shirt tucked into tailored black trousers with a slim belt, hair down and sleek. Soft open shade from a building camera-left with warm late sun bouncing off pale pavement to fill her face evenly. GRADE: warm neutral editorial, clean whites, gentle lifted blacks, slightly warm midtones, low grain.'],
];

function run([name, scene]) {
  const prompt = ID + POLISH + scene + FRAME + M3 + PHONE + HANDS + EYES + TAIL;
  const t0 = Date.now();
  return new Promise((res) => {
    spawn(process.execPath, [
      '.claude/skills/codex-image/generate.mjs',
      '--edit', ANCHOR,
      '--size', '1024x1536',
      '--out', `.tmp/lensref/pphone/${name}.png`,
      '--prompt', prompt,
    ], { stdio: 'ignore' }).on('close', (c) => {
      console.log(`${c === 0 ? '✓' : '✗'} ${name.padEnd(24)} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      res(c === 0);
    });
  });
}

let i = 0;
const out = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < JOBS.length) out.push(await run(JOBS[i++]));
  })
);
console.log(`\nTOTAL: ${out.filter(Boolean).length}/${JOBS.length}`);
