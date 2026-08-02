import { spawn } from 'node:child_process';

const ANCHOR = 'assets/house-model/anchor-polished.png';
const CONCURRENCY = 5;

const ID = 'Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone, identical hair colour and length, same age. She must be immediately recognisable as the same individual. ';

// Inverted BREAK: KEEP the rendering, DESTROY the scene.
// The anchor is a charcoal-seamless studio portrait - that backdrop and that studio
// lighting will bleed into every derived shot unless explicitly killed.
const BREAK = 'KEEP the photographic quality of the attached reference - the real-camera rendering, the shallow depth of field, the fine skin detail, the professional craft. But do NOT copy its setting: the dark studio backdrop and the studio lighting must NOT appear anywhere in the new image. She is now on location in a completely different real place with completely different light. ';

const M3 = ' Makeup is Filipina soft glam: fluffy laminated brows brushed up, a dewy medium-coverage base, warm peach and bronze eyeshadow through the crease and smoked softly under the lower lash line, dark-brown liner melted into the upper lash line with a very small wing, full lash extensions, cream blush draped high across the cheekbones and carried lightly over the nose bridge, warm sculpting bronzer in the cheek hollow and jaw, liquid highlighter on the cheekbone, nose tip, cupid bow and inner corner, and a glossy overlined lip in a warm rosy-brown. Skin reads glassy and lit from within but real pores stay visible on the nose and cheeks.';

const FRAME = ' FRAMING RULE: she is framed from mid-thigh up or tighter, never full-body, so her face is large enough in frame to be rendered in full detail. Composed deliberately, horizon level.';

const EYES = ' Her eyes must be rendered with full detail: crisp iris texture with visible fibres, a clearly defined round pupil, real corneal moisture, and a correctly shaped catchlight matching the described light source. Never flat, never dead, never doll-like.';

const TAIL = ' Real photography, not a render: pores visible under the makeup, natural skin translucency, individual hair strands with a few flyaways, real fabric weight and folds. No airbrushing, no waxy skin, no face slimming, no eye enlarging, no beauty filter. This is a polished post by a lifestyle content creator, NOT a commercial advertisement and NOT a studio campaign. No readable text or brand logos anywhere.';

const BODY = {
  sony50: ' Shot on a Sony A7 IV with a 50mm f/1.4 prime at f/2, two metres away. Natural undistorted perspective. Genuine optical shallow depth of field with smooth gradual falloff and no cut-out edge around her hair. Sony rendering: cool clinical colour, high micro-detail, neutral contrast.',
  canon50: ' Shot on a Canon EOS R6 with a 50mm f/1.4 prime at f/2, two metres away. Natural undistorted perspective. Genuine optical shallow depth of field with smooth gradual falloff and no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin, gentle highlight roll-off.',
  fuji50: ' Shot on a Fujifilm X-T5 with a 35mm f/1.4 prime at f/2 (50mm equivalent), two metres away. Natural undistorted perspective. Genuine optical shallow depth of field with no cut-out edge around her hair. Fujifilm rendering: film-simulation colour, muted greens, gentle contrast, fine organic grain.',
  canon85: ' Shot on a Canon EOS R6 with an 85mm f/1.4 prime at f/2, three metres away. Slight telephoto compression. Genuine optical shallow depth of field with smooth compressed bokeh and no cut-out edge around her hair. Canon rendering: warm colour science, pleasing red-forward skin, gentle highlight roll-off.',
  sony85: ' Shot on a Sony A7 IV with an 85mm f/1.4 prime at f/2, three metres away. Slight telephoto compression. Genuine optical shallow depth of field with smooth compressed bokeh and no cut-out edge around her hair. Sony rendering: cool clinical colour, high micro-detail.',
};

const JOBS = [
  ['pc-01-street-blazer', 'She stands on a quiet tree-lined Manila street in the late afternoon, hands in her blazer pockets, shoulders angled away with her face turned back to the lens. She wears a black oversized blazer over a white tee and small gold earrings, hair down with a soft middle part. Soft open shade with a bright bounce off a pale wall behind the camera giving even wrap and a clean catchlight. Behind her the street compresses into soft green bokeh.', BODY.sony50],

  ['pc-02-cafe-window', 'She sits at a marble cafe table beside a tall window in the morning, both hands around a ceramic latte cup, leaning slightly toward the window. She wears an oversized cream cable-knit sweater and small gold hoops, hair loosely tied back with soft face-framing pieces. Broad soft morning daylight through the window as a huge natural softbox wrapping her face, gentle shadow on the far side. The cafe interior falls into soft warm bokeh behind her.', BODY.canon50],

  ['pc-03-kitchen', 'She stands at a kitchen counter in a bright home kitchen, mid-motion pouring dressing over a bowl of salad, looking down at what she is doing. She wears a soft oatmeal linen shirt with sleeves rolled up and a thin gold necklace, hair tied back loosely with strands escaping. Large soft daylight from a window on the left raking across the counter, warm bounce off a wooden worktop, the background falling gently darker and out of focus. A chopping board with cut vegetables and a linen cloth arranged naturally in the foreground.', BODY.canon50],

  ['pc-04-home-wall', 'She leans against a plain warm-white interior wall in a bright minimal apartment, arms loosely crossed, weight on one hip. She wears a fitted rib tank and soft wide-leg trousers with real fabric folds, hair down and glossy. Soft indirect daylight from a window off camera-left, gentle directional wrap with a soft shadow of her shoulder on the wall, the wall falling slightly out of focus behind her.', BODY.canon85],

  ['pc-05-skincare-portrait', 'A close portrait of her from the shoulders up, one hand lightly resting against her jaw, head tilted slightly, shot for a skincare post. She wears a plain white cotton tank, hair pulled back into a low tuck with a few strands loose. A single large window camera-left as a soft directional key with the right side of her face falling into gentle open shade, no fill card, a clean vertical catchlight in both eyes. A soft warm out-of-focus room behind her.', BODY.sony85],

  ['pc-06-rooftop-golden', 'She stands on a Manila rooftop at golden hour, one hand lifting her hair off her neck, the city skyline behind her. She wears a cream linen co-ord set and a fine gold chain, hair down in soft waves. Low golden-hour sun behind her creating a warm rim on her hair and shoulders, BUT a large white bounce card just off camera throws clean soft fill straight back onto her face so her makeup stays fully visible and is NOT washed out by the backlight - her face is properly exposed and modelled, not silhouetted or hazy. The skyline compresses into soft golden bokeh.', BODY.canon85],

  ['pc-07-palengke', 'She stands in a bright Philippine wet market aisle, one hand resting on a crate of calamansi, half turned toward the lens. She wears a simple white sleeveless top and denim, a woven bag on her shoulder, hair tied back. Soft daylight filtering through the market roof from above and behind, with warm bounce off the produce, the busy stalls and vendors falling into rich colourful bokeh behind her.', BODY.fuji50],

  ['pc-08-interior-shelf', 'She stands in a warm wood-panelled bookshop interior, one hand touching the spine of a book on a shelf, looking toward the lens over her shoulder. She wears a soft brown knit cardigan over a white top, hair down. Warm tungsten shop lighting from above mixed with cool daylight from a shopfront window camera-right, the shelves receding into soft warm bokeh behind her.', BODY.fuji50],

  ['pc-09-wardrobe-rail', 'She stands beside a clothing rail in a small boutique, one hand pushing a hanger aside, mid-motion, looking down at the clothes. She wears a fitted black slip dress with real fabric weight and delicate gold jewellery, hair down and glossy. Soft diffused ceiling light plus a warm accent lamp camera-left, the rail of garments falling into soft neutral bokeh behind her.', BODY.sony50],

  ['pc-10-street-night', 'She stands on a Manila street in the early evening just after sunset, one hand adjusting the strap of her bag, half turned toward the lens. She wears a black satin slip skirt with a fitted knit top and small gold hoops, hair down. Warm shop practicals and a distant streetlight behind her rendering as large round golden bokeh discs, with soft blue ambient dusk light from the open sky filling her face cleanly so her features and makeup stay fully readable.', BODY.sony85],
];

function run([name, scene, body]) {
  const prompt = ID + BREAK + scene + FRAME + M3 + body + EYES + TAIL;
  const t0 = Date.now();
  return new Promise((res) => {
    spawn(process.execPath, [
      '.claude/skills/codex-image/generate.mjs',
      '--edit', ANCHOR,
      '--size', '1024x1536',
      '--out', `.tmp/lensref/pcam/${name}.png`,
      '--prompt', prompt,
    ], { stdio: 'ignore' }).on('close', (c) => {
      console.log(`${c === 0 ? '✓' : '✗'} ${name.padEnd(26)} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
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
