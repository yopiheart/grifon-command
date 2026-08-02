# Grifon House Model — believable UGC stills

Isang naka-lock na Filipina house model (18-22) para sa ads, creatives, at lifestyle
content sa iba't ibang niche. Ginawa 2026-08-02 gamit ang `codex-image` bridge
(gpt-image-2). Extension ito ng `raw-ugc` register sa
[workflows/believability_dna.md](../../workflows/believability_dna.md).

## Ang anchor

| File | Ano |
| --- | --- |
| `anchor.png` | 1024x1536, ang **raw** anchor (iPhone). Para sa `raw-ugc` **at** `polished P-phone`. |
| `anchor-polished.png` | 1024x1536, ang **camera** anchor (Sony A7 IV, 85mm). Para sa `polished P-camera`. |
| `anchor-*-4x5.png` | 1024x1280, ang delivery crops |

### ⚠️ Isang anchor kada RENDERING, hindi kada register

Ito ang pinakamahalagang tuntunin sa buong file, at natutunan namin siya sa pagbagsak
ng unang polished lane. **Hindi lang identity ang minamana sa `--edit` — pati ang
rendering.** Kung raw na phone snapshot ang anchor, magmumukhang phone snapshot ang
lahat ng gagawin mula doon, kahit anong ilagay mo sa prompt.

Pero hindi ibig sabihin na kada register ay may sariling anchor. **Kada rendering.**
Ang P-phone ay phone din, kaya tama sa kanya ang raw anchor — ang bumagsak doon ay
mahinang styling at makeup, hindi ang anchor. Ang P-camera lang ang tunay na
nangailangan ng bago.

Sa bawat bagong anchor, ilagay ang **BREAK block** sa prompt (nasa
`build-polished-anchor.mjs`): tahasang sabihing *huwag kopyahin ang image quality ng
reference, ang mukha lang*. Wala nun, hihilahin ka pabalik sa rendering ng anchor.

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

## VERDICT NI NEIL (2026-08-02) — ano ang pumasa, at bakit bumagsak ang iba

Tinignan ni Neil ang lahat isa-isa. Ang bumagsak ay **binura na** sa repo — nasa git
history pa rin kung kailanganin. Tatlong bagay ang natutunan, at lahat sila structural.

### ⛔ Bumagsak ang BUONG `polished-ugc` lane. Root cause: mali ang anchor.

Ang buong lane ay ginawa gamit ang `--edit` mula sa `anchor.png` — at **raw-ugc na kuha
sa iPhone yun.** Kaya hindi lang identity ang minana, pati ang rendering: ang talas, ang
tonality, ang patag na dating ng phone. Ang salita ni Neil: *"kinopya lang ung same
character sa reference image, parang di sya na polish, na stack sya sa raw, inadapt nya
ung quality/camera ng reference image."* Tama siya. Naglagay lang ako ng mas magandang
damit at ilaw sa ibabaw ng isang raw na larawan.

**Hindi ito naaayos sa prompt.** Kailangan ng **sariling anchor** ang bawat register:
isang tao, maraming anchor. Bago mag-generate ng polished, gumawa muna ng tunay na
polished na portrait niya, i-approve, at yun ang gamiting anchor ng buong lane. Kasama
sa prompt ang isang BREAK block na tahasang nagsasabing *huwag kopyahin ang image
quality ng reference, ang mukha lang* — nasa `.tmp/lensref/polanchor.mjs`.

### 👁 Ang eye dead zone

Tatlo ang bumagsak dahil sa mata: mall OOTD, fitting room, bathroom mirror. Pareho silang
**buong katawan o malayo**, kaya 100-150px lang ang mukha. Kulang yun para maging
kapani-paniwala ang mata at lumalabas na patay at AI.

Pero ang beach shot na sobrang layo ay **pumasa** — kasi hindi na basa ang mata doon.
Kaya may dead zone:

> **Sapat ang laki ng mukha para titigan pero kulang para i-render nang maayos = sira.**
> Tatlong-kapat na katawan pataas, o talagang malayo. Iwasan ang gitna.

Nakatulong din ang paglalagay ng tahasang eye instruction sa prompt (*crisp iris texture,
defined pupil, real moisture, correctly shaped catchlight*) — nasa `polanchor.mjs`.

### ⏱ Ang matagal na shot ay senyales na TINGNAN, hindi senyales na bagsak

Tumagal si `pp-05` (poolside) ng 614s samantalang mga 240s ang iba, at ang lumabas ay
hindi pool kundi isang babae na naka-beige knit sa sofa. **Hindi siya pumalya, pumalit
siya** — habang naghihirap ang Codex sa isang eksenang natatapik ang safety layer
(dito: swimwear + nakalubog na binti), pumipili siya ng ligtas na larawan imbes na
sumuko, at *matagumpay* pa ang exit code.

⚠️ **Pero huwag itong gawing bagsak-agad.** Sa wave 1, tatlo ang lumagpas sa doble:
`pp-11` (516s), `r15-tricycle` (911s), `r21-bedroom-lamp` (1019s). **Tama silang
tatlo**, at dalawa sa kanila ang pinakamagagandang raw shot sa buong library.
Ang matagal ay ibig sabihin **naghirap** ang Codex — safety retry man o komplikadong
eksena lang.

> Kapag lumagpas sa doble ng karaniwang oras: **tingnan mo bago tanggapin.**
> Hindi awtomatikong mali, pero doon nagtatago ang mali.

Hindi blanket ang swimwear block — pumasa si `pp-03` na naka-one-piece sa dusk, at
pumasa si `pp-11` nang lagyan ng linen shirt na cover-up. Kombinasyon ang tumatapik,
hindi isang salita. Kapag natapik, **magdagdag ng cover-up o alisin ang tubig sa
katawan**, huwag basta ulitin.

### ✋ Ang hands rule

Bumagsak ang `pc-08` (bookshop) dahil sa kamay: hinahawakan niya ang gilid ng libro sa
istante. **Fine manipulation ang sumisira.** Ang kamay na nakapatong lang, nasa bulsa,
o may hawak na isang malaking simpleng bagay na may buong hawak ay halos hindi pumapalya.

> ⛔ Walang pinipisil na maliit na bagay, walang daliring nakasingit sa manipis na bagay,
> walang masalimuot na paggalaw ng daliri. Isang malaking bagay na may buong hawak, o
> nakapahinga lang.

Verbatim na block: `build-pcamera.mjs` at `build-pphone.mjs` → `const HANDS`.

### 📏 50mm ang default ng camera lane

Sa 24/50/135mm test, **50mm lang ang nag-maintain ng identity.** Hindi yun sanhi — siya
ang pinakamalapit sa geometry ng anchor, kaya siya ang pinaka-ligtas. Ang 85mm ay
gumagana pa rin (pumasa ang `ab-4`) pero 50mm ang default kapag mahalaga ang consistency.

### 🏖 Framing distance
Pumasa ang beach fix pero *"super layo"* — masyadong maliit. Ang tamang layo ay
mid-thigh up sa mga 2.5 metro: basa ang mukha, nandoon pa rin ang kapaligiran.

## MAKEUP — ang pinakamalaking butas ng unang 22 shot

**Pinagsama ko ang dalawang magkahiwalay na bagay: `unretouched` (post-processing) at
`walang makeup` (bago pa pindutin ang shutter).** Sinulat ko ang *"bare face with no
makeup"* at *"no foundation"* sa halos lahat ng 22 shot. Pero ang mga babae sa
`Bumble dating quality/` ay may foundation, contour, lashes, gawang kilay at lip — hindi
sila retouched, **inayusan nila ang mukha nila bago lumabas.** Yun ang dahilan kung bakit
mas plain ang unang 22 kaysa sa refs. Hindi kulang sa realism — pinagbawalan ko ang
makeup na suot naman talaga nila.

Ang pitong sample sa `sample make up looks/` ay **iisang pamilya**: modern Filipina clean
girl at soft glam. Walang editorial, walang graphic. Palaging: **fluffy at brushed-up na
kilay**, **dewy at hindi kailanman matte**, **mainit na bronze sa mata**, **malambot na
brown liner na hindi kailanman itim**, **cream blush na mataas sa pisngi**, **makintab na
lip**. Iyan ang PH standard ngayon.

| Level | Ano | Kailan |
| --- | --- | --- |
| **M0** | Totoong wala | Paggising, bathroom, skincare, post-workout **lang** |
| **M1** | No-makeup makeup: brushed brows, tinted moisturiser, cream blush, lip balm, isang mascara | raw-ugc araw-araw |
| **M2** | Labas-beat: + laminated brows, lash extensions, bronze wash, smoked brown liner, bronzer, highlighter, glossy overlined lip | raw-ugc gabi, mall, resto |
| **M3** | Soft glam: + draped blush sa cheekbone at ilong, maliit na wing, sculpting contour, glassy skin | polished-ugc |
| **M4** | Full glam: + body highlight, blowout, tumpak lahat | photoshoot |

Verbatim na blocks: `.tmp/lensref/ab.mjs` → `const M`. A/B batch: `library-makeup/`.

⚠️ **Nababago ng ilaw kung gaano kalakas mag-register ang makeup.** Sa malambot na
harapang ilaw (`ab-5`), malinaw na kitang-kita ang M1. Sa matapang na backlight
(`ab-3` rooftop), **nalulusaw ang M3 pababa sa M1** — nauubos ng sikat ang blush drape at
ang liner. Tama yun sa pisika, pero ibig sabihin: kapag glam ang kailangan, **pumili ng
ilaw na magpapakita ng makeup**, o doblehin ang M3 sa backlit na eksena. Huwag umasang
sapat na ang level number.

## CAMERA BODY — hiwalay sa focal length

Hindi kinokopya ng model ang lens ng anchor — napatunayan sa 24/50/135mm test: nagbabago
ang geometry ng mukha (nakausli sa 24mm, patag sa 135mm). Pero **hindi ko binanggit ang
camera body kahit isang beses sa unang 22.**

| Register | Body | Rendering |
| --- | --- | --- |
| raw-ugc | iPhone 16 Pro | Patag na HDR, tinataas ang shadows, sobrang sharpen, cool-neutral |
| | Galaxy S24 Ultra | Mas saturated at mas matalim kaysa iPhone |
| polished P-camera | Sony A7 IV | Malamig, klinikal, may magenta sa balat, mataas ang micro-detail |
| | Canon EOS R6 | Mainit, mapula ang balat, malambot ang roll-off |
| | Fujifilm X-T5 | Film simulation, kakaiba ang greens |
| photoshoot | Phase One XF / Hasselblad H6D | Medium format studio |

⛔ **Huwag gumamit ng cinema format sa stills.** RED, ARRI, VENICE, IMAX 70mm, 16mm —
motion picture cameras lahat. Walang tunay na koleksyon ng *litrato* na kuha doon na
masasampol ng model, kaya malabong "cinematic" ang labas at hindi partikular na rendering.
**Para sa video (Veo, Seedance) tama sila** — mali lang ang medium.

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
