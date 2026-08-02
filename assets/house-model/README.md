# Grifon House Model — believable UGC stills

Isang naka-lock na Filipina house model (18-22) para sa ads, creatives, at lifestyle
content sa iba't ibang niche. Ginawa 2026-08-02 gamit ang `codex-image` bridge
(gpt-image-2). Extension ito ng `raw-ugc` register sa
[workflows/believability_dna.md](../../workflows/believability_dna.md).

## Ang anchor

| File | Ano |
| --- | --- |
| `anchor.png` | 1024x1536, ang identity anchor. **Ito ang ipapasa sa `--edit` sa LAHAT ng bagong shot.** |
| `anchor-4x5.png` | 1024x1280, ang delivery crop |

Hindi ito basta magandang litrato — **anchor** siya, at may tatlong dahilan kung bakit
siya ang napili sa apat na candidate: malaki at malinaw ang mukha (~350px), neutral ang
open-shade na ilaw, at walang nakabaked na kakaibang kulay o matigas na anino. Ang
kandidatong may phone flash ay mas believable pero tumatagos ang specular highlights niya
sa lahat ng susunod na shot — kaya hindi siya pwedeng maging anchor kahit mas maganda ang
texture niya.

Dumaan ang anchor sa **skin-texture pass** bago i-lock. Ang unang generation ay mas
makinis kaysa sa brief, at kung makinis ang anchor ay makinis lahat ng gagawin mula doon.

## Paano gumawa ng bagong shot

```bash
node .claude/skills/codex-image/generate.mjs \
  --edit assets/house-model/anchor.png \
  --size 1024x1536 \
  --out .tmp/lensref/lib/gen-XX-name.png \
  --prompt "<ID_LOCK> + <scene> + <CAPTURE>"
```

Para sa marami, gamitin ang `.tmp/lensref/run-library.mjs` na pattern (fan-out, concurrency 5).
Walang `--edit` support ang `tools/codex-image-batch.mjs`, kaya hindi siya pwede dito.

### ID_LOCK (verbatim, huwag baguhin)

> Use the woman in the attached photo as the EXACT SAME PERSON: identical face, identical
> bone structure, identical cheekbones jawline nose eyes and lips, identical skin tone and
> skin texture, identical hair colour and length, same age. She must be immediately
> recognisable as the same individual. Now create a NEW ultra-realistic vertical iPhone
> photo of her:

### CAPTURE (verbatim, huwag baguhin)

> Shot on an iPhone main camera at roughly 26mm equivalent f/1.8, so the background stays
> sharp and in focus like a real phone photo - no shallow cinematic bokeh, no lens blur,
> deep depth of field. Casual snapshot, NOT a photoshoot, NOT an ad, NOT a fashion
> editorial. Real unretouched skin: visible pores, natural oil sheen, fine vellus hair,
> faint under-eye shadow, no beauty filter, no skin smoothing, no airbrushing. No HDR, no
> cinematic grading, no colour grade, no studio lighting, no over-polishing, no readable
> text or branding anywhere.

Sa pagitan ng dalawa, ilagay ang scene: lugar, oras, pose, damit, **ilaw na pinangalanan
ayon sa pisikal na pinagmulan**, mga phone artifact, at 5-8 konkretong PH prop.

## Ang apat na bagay na nagpapa-99%

Galing ito sa pagbabasa ng `assets/different camera lens/` at ito ang pinaka-mahalaga:

1. **Sharp ang background.** Ito ang pinakamalaking tell. Halos lahat ng AI na sumusubok
   gumawa ng phone photo ay nagdadagdag ng DSLR bokeh. Deep depth of field ang phone.
   Kailangan ng explicit na negation, hindi sapat ang banggitin lang ang phone.
2. **Sirang white balance.** Warm tungsten na may halong cool LED, hindi pantay sa mukha.
   Hindi ito kusang gagawin ng model — masyado siyang matulungin.
3. **Sinasadyang imperfection.** Tilted horizon, mababa sa frame, naputol na braso ng
   stranger sa gilid. Naka-specify, hindi iniwan sa tsamba.
4. **Buto, hindi features.** Para maging "model" na mukha: mataas at malapad na cheekbones,
   malinaw na jawline, mahabang leeg, magkalayong mata, maikling philtrum, kaunting taba sa
   mukha. **Hiwalay ito sa retouch.** Ang unang batch ay believable pero ordinaryo dahil
   nag-specify ako ng features at hindi ng istruktura.

## Delivery: 4:5

Walang native 4:5 ang gpt-image-2 (`1024x1024`, `1024x1536`, `1536x1024` lang). Kaya:
mag-generate ng `1024x1536`, tapos i-crop:

```js
sharp(src).extract({ left: 0, top: 64, width: 1024, height: 1280 })
```

Native pixels, zero upscale. Mag-compose na alam mong may mapuputol sa taas at baba.

⛔ **Huwag mag-upscale o mag-sharpen.** Nakasulat sa `believability_dna.md` na sinisira
mismo ng upscale ang mga imperfection na siyang trust signal, at plastic ang labas.
Kung kailangan ng 1080x1350 para sa Meta, lanczos lang — 5% na bump, hindi tunay na upscale.

## Mga hangganan

- **Craft ang kinuha sa refs, hindi mukha.** May totoo at nakikilalang tao sa
  `assets/different camera lens/` (kasama si Anne Curtis). Lens, ilaw, grade, at capture
  context lang ang kinuha. Walang mukha ng sinuman ang ginaya.
- **Dev-time tool ang `codex-image`.** Hindi siya nakakabit sa produkto. Assets ang gamit
  nito, hindi ito nangangahulugang ganito na ang lalabas sa app — Gemini pa rin ang
  production image model.
- **Dalawang register ang nasa library: `raw-ugc` at `polished-ugc`.** Hindi pa ginagawa
  ang `cinematic` (BJ Pascual) na lane. Huwag paghaluin ang register sa isang prompt —
  mush ang labas, at yun mismo ang nagmumukhang AI.

## `polished-ugc` — `library-polished/`

Post pa rin ng totoong tao, pero **inayos**. Ang linya: kung magmukha siyang ad, patay na
ang lane dahil meron nang lane para doon. Runner: `.tmp/lensref/run-polished.mjs`.

⚠️ **Hindi iisang register ang `instagram content creators/` na folder** — feed yun ng
creator at tatlong bagay ang laman. Ang `imgi_16` ay **studio beauty shot** (gray seamless,
malaking soft key, blowout na buhok) — kabilang siya sa `cinematic` na lane, hindi dito.
Suriin bawat ref bago gamitin.

Limang axis ang pinagkaiba sa `raw-ugc`: **pinili ang ilaw** (hindi tinanggap), **sinadya
ang composition** (patag ang horizon, nasa third), **may grade**, **styled** ang damit at
buhok, at **evened ang balat** — pero hindi plastic.

Dalawang sub-lane, at teknikal ang pagkakaiba:

| | Optics | Bokeh |
| --- | --- | --- |
| **P-phone** (`pol-01`…`05`) | iPhone 26mm f/1.8 | ⛔ **Bawal pa rin.** Deep DoF. |
| **P-camera** (`pol-06`…`10`) | full-frame mirrorless 85mm f/1.8 | ✅ **Pinapayagan** — siya mismo ang nagsasabing hindi ito phone. |

Ang bokeh ang buong punto ng P-camera, kaya kailangan ng hard rule sa prompt: *gradual at
optically correct* ang paglipat mula sharp papuntang blur, **walang cut-out na gilid sa
buhok o balikat**. Doon palaging bumabagsak ang AI kapag umaarte itong may telephoto —
parang stickers na idinikit ang tao sa malabong background. Nasa `run-polished.mjs` ang
verbatim na negation.

### SKIN block (verbatim — ito ang pumipigil na maging ad)

> Skin is lightly and tastefully retouched the way a creator edits their own photo - tone
> evened out and stray marks softened, but real skin remains: pores still clearly visible
> across the cheeks and nose, natural highlight sheen on the high points, fine vellus hair
> at the hairline and jaw, real skin translucency. Absolutely no plastic skin, no waxy
> smoothing, no airbrushed blur, no beauty filter, no face slimming or eye enlarging.

Ang `no face slimming or eye enlarging` ang pinaka-mahalagang linya doon. Wala yun,
unti-unting hinahaba ng model ang mata at pinapayat ang panga kada generation, at
pagkatapos ng ilang shot ay iba na ang tao.
