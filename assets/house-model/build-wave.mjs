import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';

const CONCURRENCY = 6;
const RAW = 'assets/house-model/anchor.png';
const POL = 'assets/house-model/anchor-polished.png';

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour and length, same age. She must be immediately recognisable as the same individual. Now create a NEW photo of her. ';

// ── shared guardrails (every failure we have hit, encoded) ──
const FRAME = ' FRAMING RULE: framed from mid-thigh up or tighter, never full-body, so her face is large enough to be rendered in full detail.';
const HANDS = ' HANDS RULE: her hands are relaxed and at rest, resting flat on a surface, in a pocket, or holding ONE single large simple object with a full natural grip. No fine finger manipulation, no pinching small objects, no fingers interleaved with thin objects. Every visible hand has exactly five correctly proportioned fingers.';
const EYES = ' Her eyes are rendered with full detail: crisp iris texture, a clearly defined round pupil, real corneal moisture, and a correctly shaped catchlight matching the described light source.';
const REAL = ' Real photography: pores visible, natural skin sheen, fine vellus hair, individual hair strands with flyaways, real fabric weight and folds. No airbrushing, no waxy skin, no face slimming, no eye enlarging, no beauty filter. No readable text or brand logos anywhere.';

// ── makeup ladder ──
const M1 = ' Makeup is the modern Filipina no-makeup-makeup look: brows brushed straight up and fluffy, sheer tinted moisturiser letting her real skin show through, concealer only under the eyes, soft peachy cream blush on the apples, a touch of highlight on the cheekbone, one coat of mascara, glossy tinted lip balm in a rosy nude. Dewy, never matte.';
const M2 = ' Makeup is a real Filipina going-out beat: fluffy laminated brows brushed upward, a light-to-medium dewy base that still shows skin texture, concealer under the eyes, warm bronze eyeshadow washed over the lid and crease, soft dark-brown liner smoked into the upper lash line with no hard graphic edge, individual lash extensions, cream blush placed high and blended toward the temple, warm bronzer in the cheek hollow and jaw, liquid highlighter on the cheekbone nose bridge and inner corner, glossy satin lip in a slightly overlined rosy-nude. Never matte, never black graphic liner.';
const M3 = ' Makeup is Filipina soft glam: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small wing, full lash extensions, cream blush draped high across the cheekbones and carried lightly over the nose bridge, warm sculpting bronzer in the cheek hollow and jaw, liquid highlighter on the cheekbone nose tip cupid bow and inner corner, glossy overlined lip in a warm rosy-brown. Skin reads glassy but real pores stay visible.';
const M0 = ' She wears genuinely no makeup at all: bare face, bare brows, bare lashes, natural lip colour, freshly washed skin.';

// ── lane blocks ──
const RAWCAP = ' This is a casual snapshot taken by a friend on their phone - NOT a photoshoot, NOT an ad. The light is whatever was there, not chosen. The framing is imperfect with the horizon tilted a degree or two and the subject slightly off-centre. There is real authored mess in the frame: clutter, worn surfaces, a stranger partly cropped at the frame edge. Shot on an iPhone main camera at 26mm equivalent f/1.8 - the whole scene stays sharp, deep depth of field, no bokeh, no lens blur. Visible luminance noise in the shadows, mild over-sharpening halo, uncorrected inconsistent white balance, visible JPEG texture. No colour grade.';

const POLISH = ' This is a POLISHED post by a lifestyle content creator - still a phone photo, but nothing is accidental. The light was CHOSEN and waited for, the composition is deliberate with a level horizon and the subject placed intentionally, the background is CLEAN and curated with no clutter and no stray strangers, and her hair and outfit are styled. It is NOT a candid and NOT an advertisement. Shot on an iPhone 16 Pro main camera at 26mm equivalent f/1.8 - the ENTIRE scene stays sharp, deep depth of field, no bokeh, no lens blur, no portrait mode. This deep focus is the phone signature and must be preserved.';

const BREAK = 'KEEP the photographic quality of the attached reference - the real-camera rendering, the shallow depth of field, the fine skin detail, the professional craft. But do NOT copy its setting: the dark studio backdrop and the studio lighting must NOT appear anywhere in the new image. She is now on location in a completely different real place with completely different light. ';

const B = {
  sony50: ' Shot on a Sony A7 IV with a 50mm f/1.4 prime at f/2, two metres away. Natural undistorted perspective, genuine optical shallow depth of field with smooth gradual falloff and no cut-out edge around her hair. Sony rendering: cool clinical colour, high micro-detail, neutral contrast.',
  canon50: ' Shot on a Canon EOS R6 with a 50mm f/1.4 prime at f/2, two metres away. Natural undistorted perspective, genuine optical shallow depth of field with smooth gradual falloff and no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin, gentle highlight roll-off.',
  fuji50: ' Shot on a Fujifilm X-T5 with a 35mm f/1.4 prime at f/2 (50mm equivalent), two metres away. Genuine optical shallow depth of field with no cut-out edge around her hair. Fujifilm rendering: film-simulation colour, muted greens, gentle contrast, fine organic grain.',
  sony85: ' Shot on a Sony A7 IV with an 85mm f/1.4 prime at f/2, three metres away. Slight telephoto compression, genuine optical shallow depth of field with smooth compressed bokeh and no cut-out edge around her hair. Sony rendering: cool clinical colour, high micro-detail.',
  canon85: ' Shot on a Canon EOS R6 with an 85mm f/1.4 prime at f/2, three metres away. Slight telephoto compression, genuine optical shallow depth of field with smooth compressed bokeh and no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin.',
};

const JOBS = [
  // ── RAW-UGC (anchor.png) ────────────────────────────────────────────────
  ['raw', 'r14-sari-sari-load', 'She stands at a sari-sari store window in the morning, one hand resting flat on the counter ledge, buying load. She wears a plain grey shirt and denim shorts, hair tied back with strands stuck to her neck. Hard morning sun from the right throws a hot patch across the wall behind her while her face sits in bounced shade. Around her: sachets hanging in rows, plastic candy jars, a wooden bench, tangled overhead wires, a neighbour partly cropped at the frame edge.', M1],
  ['raw', 'r15-tricycle', 'She sits inside a tricycle sidecar during her commute at midday, one forearm resting on the frame, looking out. She wears a white tank and a canvas sling bag, hair tied up with damp strands at her temples, slightly sweaty. Hard midday sun blasting in from the open side blows out the street completely while her face sits in the shaded interior. Around her: worn vinyl seat, a painted metal panel, a small religious decal, coins in her lap.', M1],
  ['raw', 'r16-laundry-rooftop', 'She stands on a rooftop laundry area in the late afternoon, one hand resting on a clothesline pole, hanging laundry behind her. She wears an old faded t-shirt and cotton shorts, hair in a messy bun. Warm low sun raking from the left with a hard shadow of the water tank cutting across the wall. Around her: hanging clothes on wire lines, plastic basins, a rusted railing, a water drum, corrugated roofs beyond.', M0],
  ['raw', 'r17-convenience-night', 'She stands in a convenience store aisle at night holding a single large cup of instant noodles with both hands, looking toward the camera. She wears an oversized hoodie and shorts, hair down and slightly flat. Harsh overhead white fluorescent directly above casting hard downward shadows with a green-cyan cast the phone has not corrected. Around her: packed shelves, a chest freezer, a floor mat, another customer partly cropped at the frame edge.', M1],
  ['raw', 'r18-gym-after', 'She stands in a gym locker area right after a workout, one hand resting on a locker door, breathing out. She wears a black sports bra and leggings with real fabric folds, hair in a high ponytail with wet strands at her temples, skin flushed and genuinely sweaty. Harsh overhead fluorescent with a slight green cast. Around her: painted lockers, a bench with a towel, a floor drain, scuffed tiles.', M0],
  ['raw', 'r19-streetfood-seated', 'She sits at a plastic table at a street food stall at night, one hand resting flat on the table, a paper plate in front of her. She wears a simple black tee, hair tied up loosely. A single bare warm bulb hangs directly above just out of frame throwing hot orange light down with fast falloff into darkness. Around her: plastic stools, squeeze bottles of sauce, a metal grill with rising smoke, the vendor partly cropped at the frame edge, motorbikes passing behind.', M2],
  ['raw', 'r20-jeepney-stop', 'She stands waiting at a jeepney stop in the late afternoon, one hand in her pocket, looking down the road. She wears a striped shirt and jeans, a tote on her shoulder, hair down and windblown. Warm low sun from behind the buildings with a cool shadow across half the frame. Around her: a painted curb, a rusted signpost, a puddle, tangled wires, other commuters partly cropped at the frame edge.', M1],
  ['raw', 'r21-bedroom-lamp', 'She lies on her side on a rumpled bed at night propped on one elbow, the other hand resting flat on the sheet. She wears an oversized old t-shirt, hair loose and messy. A single warm bedside lamp is the only light, hot and close on one side of her face with the rest of the room falling into noisy near-black. Around her: crumpled sheets, a phone charger cable, a water glass, a wall socket.', M0],

  // ── POLISHED P-PHONE (anchor.png) ───────────────────────────────────────
  ['pphone', 'pp-11-poolside', 'She stands beside a clean resort pool in the late afternoon, one hand resting relaxed at her side, the other holding a single rolled towel. She wears a white one-piece swimsuit with an open oversized linen shirt worn loosely over it as a cover-up, hair down and slightly damp. Warm low side light from camera-right with bright bounce off the pale tile and still water filling her shadow side. The pool area is tidy and empty. GRADE: warm sunlit, rich shadows, golden highlights, slightly saturated, clean whites.', M3],
  ['pphone', 'pp-12-beach-golden', 'She walks along a clean empty shoreline at golden hour, one hand holding the brim of a straw hat, the other relaxed. She wears a flowing white linen dress with real fabric movement, hair down and windblown. Low warm sun from camera-left rakes across her with bright sand bounce filling her face fully so her makeup stays clearly visible. GRADE: punchy warm, deep blue water, golden highlights, moderate contrast, crisp whites.', M3],
  ['pphone', 'pp-13-coffee-counter', 'She stands at a clean minimal coffee shop counter in the morning, both hands wrapped around one large ceramic cup, leaning slightly forward. The counter behind her is tidy with an espresso machine and neat cups. She wears a soft charcoal knit and small gold hoops, hair down and glossy. Broad soft daylight from a shopfront window camera-left wrapping her face evenly. GRADE: airy and clean, bright lifted exposure, low contrast, cool neutral whites.', M3],
  ['pphone', 'pp-14-rooftop-bar-blue', 'She sits at a clean rooftop bar table at blue hour, one forearm resting on the table, the city lights coming on behind her. She wears a black satin slip top and delicate gold jewellery, hair down and sleek. Soft even blue-hour ambient from the open sky with warm practical lamps behind the camera lighting her face cleanly, so she is warm against a cool background. GRADE: cool-warm split, deep blue background, warm skin, gentle contrast.', M3],
  ['pphone', 'pp-15-skincare-window', 'She stands beside a bright window in a clean minimal bathroom, holding one single large glass serum bottle in a full natural grip, looking toward the lens. The counter is tidy with two neatly placed items. She wears a plain white robe with real fabric folds, hair pulled back in a claw clip, skin fresh and dewy. Broad soft daylight through the window as a huge natural softbox wrapping her face evenly. GRADE: neutral and honest, accurate skin, gentle contrast, soft highlight roll-off.', M1],
  ['pphone', 'pp-16-athleisure-bright', 'She stands in a clean bright home studio space, one hand resting on her hip, a rolled yoga mat leaning against the wall beside her. She wears a matching sage sports bra and leggings with real fabric folds, hair in a sleek high ponytail. Broad soft daylight from a large window camera-left, even and flattering, the wall clean and uncluttered. GRADE: airy and clean, bright lifted exposure, low contrast, soft creamy highlights.', M1],
  ['pphone', 'pp-17-colour-wall', 'She stands against a clean painted terracotta wall in the late afternoon, one hand in her pocket, shoulders angled with her face turned to the lens. She wears a crisp white oversized shirt tucked into wide-leg cream trousers, hair down and sleek. Soft open shade with warm bounce off the pavement filling her face evenly, the wall completely clean with no clutter. GRADE: warm neutral editorial, clean whites, gently lifted blacks, warm midtones, low grain.', M3],
  ['pphone', 'pp-18-park-picnic', 'She sits on a clean picnic blanket in a park at golden hour, one hand resting flat on the blanket, a woven basket beside her. She wears a soft butter-yellow sundress with real fabric folds, hair down in loose waves. Low golden sun from camera-left with warm grass bounce filling her shadow side so her face is fully exposed. The park behind her is open and clean. GRADE: warm and gently lifted, raised blacks, soft amber highlights, mild haze.', M3],

  // ── POLISHED P-CAMERA (anchor-polished.png) ─────────────────────────────
  ['pcam', 'pc-11-restaurant-warm', 'She sits at a table in a warm intimate restaurant in the evening, one forearm resting on the table, half turned to the lens. She wears a deep green satin top and small gold earrings, hair down and glossy. Warm tungsten pendant light above and a candle on the table, with a soft bounce from a pale wall filling her face cleanly. The restaurant behind her falls into rich warm bokeh.', M3, B.canon50],
  ['pc-12', 'pc-12-beauty-close', 'A close portrait of her from the shoulders up, chin resting lightly on the back of one hand, head tilted slightly. She wears a simple black scoop-neck top, hair pulled back smoothly with a few strands loose. A single large softbox camera-left as a directional key with a white bounce on the right, a clean round catchlight in both eyes, a soft warm out-of-focus interior behind her.', M3, B.sony85],
  ['pcam', 'pc-13-atelier', 'She stands in a bright sewing atelier, one hand resting flat on a wooden work table with folded fabric bolts on it, looking toward the lens. She wears a soft cream linen shirt and tailored trousers, hair tied back loosely. Large soft daylight from a tall window camera-left raking across the table, the workshop receding into soft warm bokeh behind her.', M3, B.fuji50],
  ['pcam', 'pc-14-bakery', 'She stands at a bakery counter in the morning, both hands holding one single large paper bag of bread, smiling gently toward the lens. She wears a soft camel cardigan over a white top, hair down. Warm morning daylight through a shopfront window camera-right mixed with warm shop lighting, the shelves of bread falling into rich golden bokeh behind her.', M3, B.canon50],
  ['pcam', 'pc-15-hotel-window', 'She sits on the edge of a neatly made hotel bed beside a tall window, one hand resting flat on the bedspread, body angled toward the light. She wears a white cotton robe with real fabric weight, hair down and slightly tousled. One huge window camera-left as a soft directional key with the room bouncing gentle fill, a large rectangular catchlight in both eyes, the room falling softly out of focus behind her.', M1, B.sony50],
  ['pcam', 'pc-16-rooftop-fill', 'She stands on a clean Manila rooftop at golden hour, one hand resting on the parapet, the skyline behind her. She wears a rust-coloured linen dress with real fabric folds, hair down in soft waves. Low golden sun behind her creating a warm rim on her hair, BUT a large white bounce card just off camera throws clean soft fill straight back onto her face so her makeup stays fully visible and she is NOT silhouetted or hazy. The skyline compresses into soft golden bokeh.', M3, B.canon85],
  ['pcam', 'pc-17-plant-shop', 'She stands in a bright plant shop surrounded by foliage, one hand resting flat against a large terracotta pot, half turned to the lens. She wears a soft olive linen shirt and jeans, hair tied back with soft pieces framing her face. Soft daylight through a greenhouse roof from above and behind with green bounce, the plants falling into lush soft bokeh behind her.', M3, B.fuji50],
  ['pcam', 'pc-18-night-practicals', 'She stands on a Manila street in the early evening, one hand in her jacket pocket, half turned toward the lens. She wears a black leather jacket over a white top and dark jeans, hair down. Warm shop practicals and distant streetlights behind her render as large round golden bokeh discs, with soft blue ambient dusk light filling her face cleanly so her features and makeup stay fully readable.', M3, B.sony85],
];

function run(job) {
  const [lane, name, scene, makeup, body] = job;
  const isRaw = lane === 'raw';
  const isPhone = lane === 'pphone';
  const anchor = isRaw || isPhone ? RAW : POL;
  const head = isRaw || isPhone ? '' : BREAK;
  const cap = isRaw ? RAWCAP : isPhone ? POLISH : (body || B.sony50);
  const prompt = ID + head + scene + FRAME + makeup + cap + HANDS + EYES + REAL;
  const out = `.tmp/lensref/wave1/${name}.png`;
  if (existsSync(out)) { console.log(`· ${name} (skip)`); return Promise.resolve(true); }
  const t0 = Date.now();
  return new Promise((res) => {
    spawn(process.execPath, [
      '.claude/skills/codex-image/generate.mjs',
      '--edit', anchor, '--size', '1024x1536', '--out', out, '--prompt', prompt,
    ], { stdio: 'ignore' }).on('close', (c) => {
      const s = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`${c === 0 ? '✓' : '✗'} ${name.padEnd(24)} ${s}s`);
      res(c === 0);
    });
  });
}

mkdirSync('.tmp/lensref/wave1', { recursive: true });
let i = 0;
const out = [];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < JOBS.length) out.push(await run(JOBS[i++]));
  })
);
console.log(`\nTOTAL: ${out.filter(Boolean).length}/${JOBS.length}`);
