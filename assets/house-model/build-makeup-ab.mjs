import { spawn } from 'node:child_process';

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical identity, identical hair colour and length, same age. She must be immediately recognisable as the same individual. Now create a NEW ultra-realistic vertical photo of her: ';

// ── MAKEUP LADDER — decoded from assets/different camera lens/sample make up looks/ ──
const M = {
  0: ' She is wearing genuinely NO makeup at all - completely bare face, no product of any kind, natural bare brows, bare lashes, natural lip colour. Freshly washed skin.',

  1: ' Makeup is the modern Filipina no-makeup-makeup look: brows brushed straight up and fluffy with a clear gel, sheer tinted moisturiser that lets her real skin show through with light concealer only under the eyes, a soft peachy cream blush on the apples of the cheeks, a touch of natural highlight on the cheekbone and nose bridge, one coat of mascara, and a glossy tinted lip balm in a soft rosy nude. Dewy, never matte. Real skin texture and pores remain clearly visible through the light base.',

  2: ' Makeup is a real Filipina going-out beat: fluffy laminated brows brushed upward and slightly darker at the tail, a light-to-medium dewy base that still shows her skin texture, concealer under the eyes, warm bronze eyeshadow washed over the lid and crease, soft dark-brown liner smoked into the upper lash line with no hard graphic edge, individual lash extensions that are defined but not spidery, cream blush placed HIGH on the cheeks and blended up toward the temple, soft warm bronzer in the cheek hollow and along the jaw, liquid highlighter on the high cheekbone, nose bridge, brow bone and inner eye corner, and a glossy satin lip in a rosy-nude that is slightly overlined. Dewy and glowing, never matte, never black graphic liner.',

  3: ' Makeup is Filipina soft glam done properly: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow blended through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small subtle wing, full lash extensions, cream blush DRAPED high across the cheekbones and carried lightly over the bridge of the nose, warm sculpting bronzer in the cheek hollow, temple and jaw, strong liquid highlighter on the cheekbone, nose tip, cupid bow and inner corner, and a glossy overlined lip in a warm rosy-brown. Skin reads glassy and lit from within but real pores are still visible on the nose and cheeks.',
};

// ── CAMERA BODY RENDERING ──
const C = {
  iphone: ' Shot on an iPhone 16 Pro main camera, 26mm equivalent f/1.8 - the whole scene is sharp with deep depth of field, no bokeh, no lens blur. iPhone rendering: aggressive HDR that lifts the shadows and flattens global contrast, slightly over-sharpened edges, cool-neutral white balance, visible JPEG texture.',

  sony: ' Shot on a Sony A7 IV with an 85mm f/1.8 prime, 3 metres away. Genuine optical shallow depth of field with smooth compressed bokeh and NO cut-out edge around her hair or shoulders. Sony rendering: cool clinical colour science, slightly magenta-leaning skin tones, very high micro-detail and clean sharpness, neutral contrast, no added warmth.',

  canon: ' Shot on a Canon EOS R6 with an 85mm f/1.8 prime, 3 metres away. Genuine optical shallow depth of field with smooth compressed bokeh and NO cut-out edge around her hair or shoulders. Canon rendering: warm colour science with pleasing red-forward skin tones, gentle highlight roll-off, softer contrast, naturally flattering.',
};

const TAIL = ' Real unretouched photography: pores clearly visible, natural skin sheen, fine vellus hair, individual hair strands with flyaways, real fabric folds. No airbrushing, no skin smoothing, no face slimming, no eye enlarging, no beauty filter. No colour grade, no HDR look, no cinematic grading. No readable text or brand logos anywhere.';

const JOBS = [
  ['ab-1-mall-M2', 'standing in a shopping mall corridor in the evening in a full outfit-of-the-day pose, one hand adjusting her bag strap, weight on one hip, photographed by a friend about four metres away. Framed head to just below the knee, off-centre to the right, horizon tilted about two degrees. She wears a fitted black sleeveless top tucked into a brown mini skirt, a small shoulder bag, strappy black sandals, hair down and straight. Harsh flat overhead white fluorescent and LED downlights with a slight green-cyan cast and warm spill from a shopfront on the left. Around her a real Philippine mall: polished tile with reflections, glass shopfronts, a directory pillar, a bench, other shoppers motion-blurred behind, a security guard cropped at the frame edge.', M[2], C.iphone],

  ['ab-2-resto-M2', 'seated at a table in a busy Filipino restaurant at night, caught mid-laugh holding up a ceramic mug with both hands, photographed by a friend across the table. Framed from the waist up, off-centre left, a plate of rice and grilled meat intruding at the bottom right, horizon tilted two degrees. She wears a cropped brown knit top, small gold hoops, hair down and slightly messy. Warm orange tungsten from a pendant lamp overhead mixed with cool spill from a window on the right so the white balance is inconsistent across her face. Real Manila restaurant: condiment bottles, a tissue holder, a sweating glass of iced water, other diners behind, a waiter cropped at the frame edge.', M[2], C.iphone],

  ['ab-3-rooftop-M3', 'standing on a Manila rooftop at golden hour, backlit by the low sun so a warm rim wraps her hair and shoulders, one hand lifting her hair off her neck, posed deliberately for her own feed. Composed on the right third with the skyline filling the left, horizon level. She wears a cream linen co-ord set and a fine gold chain, hair down in soft waves. Low golden-hour sun directly behind her creating strong backlight and lens flare, warm concrete bouncing soft fill onto her face.', M[3], C.iphone],

  ['ab-4-street-M3-sony', 'standing on a quiet tree-lined Manila street in open shade in the late afternoon, hands in her blazer pockets, shoulders angled away with her face turned back to the lens, a portrait shot by a photographer friend. Framed from the chest up and centred, the street compressed into soft creamy blur behind her, horizon level. She wears a black oversized blazer over a white tee and small gold earrings, hair down with a soft middle part. Soft open shade with a bright bounce from a pale wall behind the camera giving even wrap and a clean catchlight in both eyes.', M[3], C.sony],

  ['ab-5-plainwall-M1-canon', 'sitting on a wooden stool against a plain off-white wall at home, a close portrait from the shoulders up, one hand lightly touching her jaw, head tilted slightly, shot for a skincare-flavoured post. Centred and tight, horizon level, with a real imperfection in the wall paint and the edge of a doorframe entering at the far left. She wears a plain white cotton tank, hair pulled back into a low tuck with a few strands loose. A single large window to her left acts as a soft directional key with the right side of her face falling into gentle open shade, no fill card, a clean vertical catchlight in both eyes.', M[1], C.canon],

  ['ab-6-bathroom-M0', 'standing in front of a bathroom mirror in a small Manila apartment in the morning taking a mirror selfie, phone held at chest height partly covering her chin, a small plain glass dropper bottle in her free hand. Framed from mid-thigh up, slightly off-centre, horizon tilted one degree. She wears an oversized white t-shirt with a damp patch at the collar, hair in a claw clip with wet strands at her temples. Soft daylight from a frosted window on the left mixed with a cool white LED strip above the mirror. Real small Manila bathroom: white tiles with grout, a cluttered sink ledge, a hanging towel, a plastic tabo, smudges on the mirror glass.', M[0], C.iphone],
];

await Promise.all(
  JOBS.map(([name, scene, makeup, cam]) =>
    new Promise((res) => {
      spawn(process.execPath, [
        '.claude/skills/codex-image/generate.mjs',
        '--edit', '.tmp/lensref/anchor/A2-tex2.png',
        '--size', '1024x1536',
        '--out', `.tmp/lensref/ab/${name}.png`,
        '--prompt', ID + scene + makeup + cam + TAIL,
      ], { stdio: 'ignore' }).on('close', (c) => {
        console.log(`${c === 0 ? '✓' : '✗'} ${name}`);
        res();
      });
    })
  )
);
