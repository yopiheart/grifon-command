---
name: marvin-avatar
description: Generate identity-consistent, believable images of Marvin (Kuya Marvin ng Oceanides) via codex-image. Use whenever creating or regenerating ANY Marvin still — avatar plates, field/UGC content shots, profile assets — or when fixing pasted-face, oversized-head, inflated-body, or identity-drift failures on Marvin generations. Adapted from GPT 5.6 Sol's generate-marvin-oceanides-images skill (original zip archived at clients/oceanides/kuya-marvin/marvin-oceanides-image-skill.zip).
---

# Marvin Avatar — identity-locked image generation

## GENERATION LANE (final, Neil 2026-07-19): Claude codex lane VALIDATED — taste recipe ang susi

**Ang codex-image lane sa file na ito ang primary generator ng Marvin stills**, gamit ang buong taste recipe sa ibaba. History ng araw na ito: ang unang Claude rolls (v1–v3, 1/7 approved) ay tinalo ni GPT 5.6 Sol (8/8) — pero pagkatapos ma-decode ang approved taste profile mula sa 8 winners ni Sol, ang taste-match rolls (`marvin-taste-1/2/3`) ay **3/3 APPROVED ni Neil at hinusgahang LAMANG kay Sol**: "kay GPT parang PALE ang skin; sa Claude may konting saturation ang kulay ng skin kaya mas realistic." Ang winning delta ay ang explicit na **"warm tan Filipino skin tone exactly as in the references"** sa bawat prompt (ang pale-drift ay dokumentadong failure mode mula 2026-07-16 Zam reruns — si Sol walang proteksyon doon). Si Sol ang alternate lane kapag gusto ni Neil ng interactive iteration sa ChatGPT. QA/triage ay Claude pa rin palagi (builder ≠ reviewer sa Sol lane; sa Claude lane, si Neil ang final grader gaya ng dati).

**Canonical taste standard:** [clients/oceanides/kuya-marvin/Approved images from gpt 5.6/](../../../clients/oceanides/kuya-marvin/Approved%20images%20from%20gpt%205.6/) — 8 Neil-approved frames. Bawat bagong still ay ginagrade LABAN DITO, hindi sa ibang AI generation. Ang taste profile na lumalabas sa 8:

- **Flat overcast / open-shade light lang** — NEVER golden hour, sun patches, o dramatic side-light (ito ang nagpapa-"edited/photoshop" look; ito ang bumagsak sa Claude v2/v3 rolls).
- Simple scene: Marvin + company vehicle / kalsada / bahay — hindi prop-dense authored clutter. **VEHICLE RULE (Neil, 2026-07-20): ang totoong sasakyan ng Oceanides ay white cab + silver aluminum CLOSED VAN (ref: `clients/oceanides/assets/Aluminum-C-VAN-6-Wheeler-Truck-14-m.jpg` — ipasa bilang PANGATLONG `--edit` ref na may explicit input-role line, "do NOT turn it into a tanker"). Ang asul na vacuum tanker sa mga lumang approved frames ay RETIRED sa Marvin content — walang ganoong truck ang Oceanides, believability/truth risk.**
- Matte, natural na skin; mukha kailanman hindi mas sharp o mas maliwanag sa katawan.
- Selfie framing OK (approved kahit full selfie-arm sa frame); relaxed standing poses, phone sa kamay.
- Wardrobe: navy activewear tee na may maliit na light-blue (#38B6FF) accent — APPROVED look; may totoong "OCEANIDES MALABANAN" uniform shirt din (real company branding — allowed sa IMAHE; ang "never Malabanan" hard rule ay para sa COPY/scripts).
- Tattoo sa isang forearm + silver watch, exactly per body master. **TEETH RULE (Neil, 2026-07-20): COMPLETE, even teeth sa bawat smiling render — HUWAG i-reproduce ang tooth gap ng reference.** Ilagay sa prompt bilang explicit override sa face-ref input-role line ("render his smile with COMPLETE, even, natural teeth; do NOT reproduce the gap").

Create believable phone-camera photos of Marvin for the Kuya Marvin ng Oceanides personal brand ([workflows/oceanides_kuya_marvin_brand.md](../../../workflows/oceanides_kuya_marvin_brand.md)). Identity, current body proportions, and natural face-body integration are HARDER requirements than polish. Raw-ugc register only — never cinematic (SOP Gate 1 rule).

**Root cause this skill exists:** face-only reference sets make the model INVENT the body → head reads pasted-on ("mukhang kinabit," Neil 2026-07-19, lock-2/3/4). The fix is the body-master anchor + integration block below (diagnosed by GPT 5.6 Sol, validated against our believability system).

## References (originals only — never AI outputs)

All under [clients/oceanides/kuya-marvin/refs/](../../../clients/oceanides/kuya-marvin/refs/):

- `marvin-ref-5-body-master.jpg` — **mandatory in every generation.** Source of truth for body, head-to-body ratio, neck, shoulders, torso, arms, forearm tattoo, wrist watch.
- `marvin-ref-1-front-neutral.jpg` — front face, neutral/mild expression.
- `marvin-ref-2-three-quarter.jpg` / `marvin-ref-3-three-quarter-b.jpg` — three-quarter face angle.
- `marvin-ref-4-front-smiling.jpg` — teeth-visible smile. (Ang totoong ngiti niya ay may maliit na upper-front tooth gap, pero per Neil 2026-07-20: **complete teeth sa lahat ng render** — see TEETH RULE sa taste profile.)

**2 identity refs per generation:** body master + the ONE face ref matching the requested angle/expression. (**Exception:** ang vehicle ref ay pwedeng PANGATLONG `--edit` kapag kasama ang company van sa eksena — scene ref ito, hindi identity ref; laging may sariling input-role line.) Never chain an AI output as a reference; if a result drifts, restart from the originals with ONE targeted correction (see the retry blocks in Sol's original prompt-template.md inside the archived zip).

## Two modes

1. **Talking-avatar plate (Lane A, chest-up):** arm's-length selfie framing IS allowed — it's the raw-ugc trust format, and chest-up frames showed no pasted look (lock-1/lock-5 passed). Still attach the body master so shoulders/neck/collar stay true.
2. **Field/content shot (body visible below chest):** NO selfie perspective. Coworker POV: ordinary phone 2x rear camera ~50mm equivalent from 2.5–3 m, eye- or chest-height, standard photo mode. This is where pasted-face failures live — the full template is mandatory.

## Prompt blocks (assemble in this order)

1. **Input roles:** "The body-master image is the source of truth for Marvin's exact current body, head-to-body ratio, neck, shoulders, torso, arms, tattoo, and watch. The second image is used only for his [front / three-quarter] face and [neutral / mild / teeth-visible] expression."
2. **Exact body (highest priority):** normal non-bodybuilder build, natural torso width, relaxed slightly sloping shoulders, average arms, natural waist, exact neck thickness, exact head-to-body scale. **Never** describe him as broad, solid, athletic, heroic, powerful, muscular, or V-shaped — these inflate the body. Keep the forearm tattoo and wrist watch **exactly as placed in the body-master image** when visible (state it positionally, not left/right — mirror confusion risk).
3. **Face + integration:** preserve real head shape, hairline, short faded haircut, brows, eyes, nose, cheeks, ears, jaw, lips, light mustache, sparse chin stubble, warm tan Filipino skin tone exactly as in the references, natural pores. Render ONE continuous person: natural jaw-to-neck, ear-to-neck, collar, shoulder, shirt connections; face and body share the SAME light direction, skin texture, softness, grain, white balance, and focus; **face no sharper, brighter, or smoother than the body.** No halo, cutout hair, floating head, or face-swap look. Expression: mouth-level only, eyes open matching the reference gaze (eyes-open rule, 2026-07-16).
4. **Scene:** one simple believable action, hands occupied. Ordinary Philippine homes/streets, clean blue vacuum truck, realistic hoses. No exposed sewage, no dramatic emergencies.
5. **Wardrobe:** relaxed-fit navy crew-neck field shirt with loose drape matching the body master's shirt silhouette, dark work pants. No logos, no readable text. (Brand accent color on wardrobe is an OPEN question — Sol proposed an Oceanides-blue #38B6FF accent, SOP says navy + gold #F5B301; plain navy until Neil decides.)
6. **Camera + register (raw-ugc):** per mode above, then: natural daylight named by source, slight phone HDR, mild JPEG softness, natural grain in shadows, imperfect candid framing, authentic UGC feel.
7. **Ban tail:** no text, phone numbers, invented logos, watermarks, fake signage, duplicate Marvin, extra fingers, distorted hands, warped equipment, plastic skin, bodybuilder body, oversized face, pasted head, no HDR-look, no cinematic grading, no studio lighting, no beauty filter.

## Hard QA gates (compare against body master, not another generation)

Reject and regenerate if ANY answer is no:

1. Unmistakably Marvin, not a similar-looking man?
2. Body matches the body master — no added muscle/width/height, no slimming?
3. Head-to-body ratio same as body master?
4. Jaw–neck–collar–shoulder–shirt connect naturally?
5. Face and body share the same lighting, softness, grain, color, focus?
6. Tattoo + watch accurate (when visible)?
7. Hands, equipment believable?
8. Reads as an ordinary phone photo, not an AI composite or glossy ad?

Warning signs: face sharper/larger than body, squared shoulders, shirt stretched over chest, thin/disconnected neck, hair halo, skin-tone shift at jaw or collar, portrait-mode bokeh.

**Never** fix a large head by enlarging the body, or a small body by shrinking the head. **Agent QA is triage only — Neil's eyeball is the only valid believability verdict** (agent_lessons / prompt-pack calibration note).

## Dalawang-lane verdict (FINAL, Neil 2026-07-19)

| Lane | Likeness | Resolution | Role |
|---|---|---|---|
| **gpt-image-2 (codex bridge, itong skill)** | **100%** (kinumpirma ni Marvin mismo) | 1024×1536 max | **PLATE FACTORY** — lahat ng video plates + walking/field shots |
| **nano banana 2** (`gemini-3.1-flash-image-preview`, minimal "arm-C" prompting — maikling direktang utos, HINDI mahabang scaffold) | ~90% stills / ~87% sa video | 2K (1536×2752) | Detail-rich STILLS lang (approved: nano-C, C1, C2); bantayan ang invented text/logos sa background, dobleng tattoo, at object-logic errors (hal. phone na kita sa sariling selfie) |

Dahil 1K lang ang codex plates, ang malayong framing ay nagpapalitaw ng morph sa video — kaya ang **CONTENT RULE: laging malapit ang camera kay Marvin.** Iwasan din ang kamay-sa-mukha na poses sa talking plates (fina-freeze ng Veo → statue tell, test-7). Approved video takes bilang reference ng production look: veo-test-2, -4, -5 sa `motion-test/`.

## Camera-distance rule (Neil + Marvin + Zam, 2026-07-19)

**Ang AI slop ay nahahalata lang kapag malayo ang camera.** Sa mid/far framing (chest-up mula sa braso, full-body, high-angle na kita ang katawan) ang mukha ay maliit sa pixels → doon lumalabas ang AI feel sa motion. Sa **CLOSE-UP (register-1 na lapit: mukha ang pumupuno sa frame, tuktok ng ulo hanggang upper chest)** nawawala ang tell — "looks real" verdict pati kina Marvin at Zam (marvin-veo-test-5). **Lane A production recipe: close-up arm's-length selfie plate + NEUTRAL expression + `veo-3.1-lite-generate-preview` (mas believable kaysa quality — raw beats polished) + expression lock.** Mid/far framing: stills lang, hindi tina-talking-video.

## Motion corollary (Veo talking tests/plates) — EXPRESSION LOCK

Ang eyes-open/mouth-only rule ng stills ay mas mahigpit sa MOTION: bawat expression change habang nagsasalita (brow raise, pagkunot ng noo, squint, mas malapad na ngiti) ay nagti-trigger ng mid-video identity morph (napatunayan sa marvin-veo-test-1, 2026-07-19 — ang prompted na "slight brow raise" ang nagpabago ng mukha kay Neil eyeball). Sa bawat Veo prompt: **"expression stays CONSTANT and calm for the entire video, identical to the input image in every frame; only mouth, jaw, and lips move plus natural blinks and slight head sway; NO eyebrow/forehead/squint/expression changes of any kind."** Ang emotional color ay dinadala ng BOSES at ng script, hindi ng mukha.

## Invocation

```bash
node .claude/skills/codex-image/generate.mjs \
  --prompt "<assembled prompt>" \
  --out clients/oceanides/kuya-marvin/identity-lock/<name>.png \
  --size 1024x1536 \
  --edit clients/oceanides/kuya-marvin/refs/marvin-ref-5-body-master.jpg \
  --edit clients/oceanides/kuya-marvin/refs/<face-ref>.jpg
```

Batches: parallel runner pattern (spawn generate.mjs concurrently — see identity-lock/manifest*.json for reproducible prompt sets). Content-angle ideas for batches: Sol's content-angles.md in the archived zip (12 field scenes + 50/30/20 education/proof/founder mix, 4:5 for feed stills).
