import { spawn } from 'node:child_process';

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour, same age. She must be immediately recognisable as the same individual. ';

// The attached anchor is a RAW phone snapshot. This must NOT inherit that rendering.
const BREAK = ' IMPORTANT: the attached reference is a casual smartphone snapshot. Do NOT copy its image quality, its flat phone rendering, its deep depth of field or its snapshot look. Copy ONLY her identity and face. The new photograph is made with completely different and far superior equipment, lighting and craft. ';

const M3 = ' Makeup is Filipina soft glam done properly: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow blended through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small subtle wing, full lash extensions, cream blush DRAPED high across the cheekbones and carried lightly over the bridge of the nose, warm sculpting bronzer in the cheek hollow, temple and jaw, strong liquid highlighter on the cheekbone, nose tip, cupid bow and inner corner, and a glossy overlined lip in a warm rosy-brown. Skin reads glassy and lit from within but real pores are still visible on the nose and cheeks.';

const REAL = ' Real photography, not a render: pores visible on the nose and cheeks under the makeup, natural skin translucency, individual hair strands with a few flyaways, real fabric weight and folds, catchlights correctly shaped for the light source. No airbrushing, no waxy skin, no face slimming, no eye enlarging, no beauty filter. Her eyes must be rendered with full detail - crisp iris texture, a clearly defined pupil, real moisture and a correctly shaped catchlight. No readable text or brand logos anywhere.';

const JOBS = [
  ['polanchor-A-canon', BREAK +
    'Create a polished half-body portrait of her, framed from the waist up and filling a good portion of the frame so her face is large and rendered in high detail. She is a lifestyle content creator shooting a proper portrait for her own feed. She stands against a warm neutral plaster wall with soft depth behind her. She wears a fitted cream silk camisole with real fabric weight, a fine gold chain, hair down in soft glossy blown-out waves with real individual strands. ' + M3 +
    ' Shot on a Canon EOS R6 with an 85mm f/1.4 prime at f/2, three metres away. Genuine optical shallow depth of field: the eyes are critically sharp while the wall behind falls into smooth gradual bokeh with no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin tones, gentle highlight roll-off. Lighting is a large softbox at 45 degrees camera-left with a white bounce card on the right filling the shadow side, and a subtle hair light separating her from the background - proper portrait lighting with visible modelling on her cheekbones and a clean soft shadow under the jaw.' + REAL],

  ['polanchor-B-sony', BREAK +
    'Create a polished half-body portrait of her, framed from the waist up and filling a good portion of the frame so her face is large and rendered in high detail. She is a lifestyle content creator shooting a proper portrait for her own feed. She sits on a low stool against a deep charcoal seamless backdrop. She wears a crisp white cotton shirt open at the collar with real fabric folds, small gold hoops, hair down and sleek with a soft middle part. ' + M3 +
    ' Shot on a Sony A7 IV with an 85mm f/1.4 prime at f/2, three metres away. Genuine optical shallow depth of field: the eyes are critically sharp while the backdrop falls smoothly out of focus with no cut-out edge around her hair. Sony rendering: cool clinical colour science, very high micro-detail, neutral contrast. Lighting is a single large octabox almost frontal and slightly above, producing an even wrap, a small shadow under the nose and a clean round catchlight high in both eyes, with the backdrop falling several stops darker.' + REAL],

  ['polanchor-C-window', BREAK +
    'Create a polished half-body portrait of her, framed from the waist up and filling a good portion of the frame so her face is large and rendered in high detail. She is a lifestyle content creator shooting a proper portrait for her own feed. She stands beside a tall window in a bright minimal room with a soft out-of-focus interior behind her. She wears a beige ribbed knit top with real fabric texture, hair down with soft natural waves and a few loose strands. ' + M3 +
    ' Shot on a Fujifilm X-T5 with a 56mm f/1.2 prime at f/1.8, two and a half metres away. Genuine optical shallow depth of field with smooth gradual falloff and no cut-out edge around her hair. Fujifilm rendering: film-simulation colour with slightly muted greens, gentle contrast, fine organic grain. Lighting is one huge north-facing window as the key from camera-left with the room bouncing a soft fill on the right - natural directional daylight with a large soft rectangular catchlight in both eyes.' + REAL],

  ['beachfix-closer', 'Now create a NEW photo of her: an ordinary snapshot taken on a friend iPhone at a beach in the Philippines around midday. NOT a professional travel photograph, NOT a stock photo, NOT an advertisement - a quick casual photo one friend took of another. FRAMING: the photographer stands about two and a half metres away. She is framed from mid-thigh up and occupies roughly the middle half of the frame - close enough that her face is clearly readable and rendered in good detail, but with real environment still visible around her: sand below, sky and sea behind, beach extending to both sides. SUBJECT RENDERING: she does not pop out from the background - she sits inside the scene at the same level of sharpness and contrast as everything around her, no rim light, no glow, no artificial crispness on her outline. LIGHTING: harsh flat overhead tropical noon sun through slight haze, FLAT on her face with no sculpting, only a small hard shadow under her chin and nose, highlights on her shoulders and the sand slightly blown out, phone HDR lifting the shadows so global contrast is flat and slightly milky. ATMOSPHERE: visible haze over the distant water so the far distance is paler and lower in contrast. REAL BEACH MESS: overlapping footprints in the sand, a dark wet-sand tideline, dried seaweed and small debris, a floating rope line with buoys in the water behind her, uneven bands of water colour from pale green to darker blue with visible surface chop, a distant island barely visible through haze. She wears a plain white bandeau bikini top and a beige woven sarong tied at the hip, hair down and windblown, holding a fresh green buko coconut with a straw, standing casually with her weight on one leg, small easy smile to the camera.' +
    ' Makeup is minimal beach makeup: brows brushed up, waterproof mascara, a sheer tinted sunscreen base, cream blush and a glossy lip balm. Dewy and slightly sweaty.' +
    ' Shot on an iPhone 16 Pro main camera, 26mm equivalent f/1.8 - the whole scene from foreground sand to distant horizon is sharp, deep depth of field, no bokeh. iPhone rendering: aggressive HDR, flattened contrast, slightly over-sharpened edges, visible JPEG texture. Slightly imperfect framing, horizon tilted about one degree.' + REAL],
];

await Promise.all(
  JOBS.map(([name, prompt]) =>
    new Promise((res) => {
      spawn(process.execPath, [
        '.claude/skills/codex-image/generate.mjs',
        '--edit', '.tmp/lensref/anchor/A2-tex2.png',
        '--size', '1024x1536',
        '--out', `.tmp/lensref/pol2/${name}.png`,
        '--prompt', ID + prompt,
      ], { stdio: 'ignore' }).on('close', (c) => {
        console.log(`${c === 0 ? '✓' : '✗'} ${name}`);
        res();
      });
    })
  )
);
