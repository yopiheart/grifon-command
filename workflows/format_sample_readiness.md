# Format Sample Readiness

**Ano to:** ang checklist kung aling format ang handa nang gawan ng sample video preview.
Bawat recipe sa launcher ay may sariling row. Ang layunin ay mapunan ang `SAMPLES`
manifest sa [`components/OneShotAd/recipes.ts`](../components/OneShotAd/recipes.ts) para
may makita ang user sa halip na "Sample soon".

**Bakit may checklist:** 12 recipe, at may quality bar bago ang bayad na render. Sunod-sunod,
hindi sabay.

> **KOREKSYON SA GASTOS (2026-08-10).** Ang lumang linya dito ay `₱550 kada render × 12 =
> ₱6,600`. Mali ang batayan. Ang ₱550 ay galing sa **9-scene** na admin smoke noong
> 2026-07-31. Walang customer na aabot ng 9 — ang `SCENE_CAP` ([`utils/planGate.ts`](../utils/planGate.ts))
> ay **4 para sa Starter at Pro**, 6 sa Business. Kung ang sample ay katulad ng totoong
> output ng produkto, **₱273 kada isa, mga ₱3,280 ang buong 12** — kalahati ng takot.
> Patakbuhin ang `npm run cost:estimate` para sa kasalukuyang numero; binabasa nito ang
> totoong `routeModel()` at `pickSceneDuration()`, kaya kusang gumagalaw kapag nagbago ang
> routing. Dalawang bagay ang nakasabit dito na desisyon ni Neil:
>
> 1. **Ilang scene ang sample?** Kung 4, kamukha nya ang bibilhin ng customer at mas mura.
>    Kung 9, mas maganda ang demo pero hindi na yun ang totoong produkto.
> 2. **Hindi pa verified ang presyo ng Kling.** Naka-calibrate lang sa iisang render na
>    binayaran natin. Isa pang render sa **ibang** scene count ang magpapatino nito.

> **Kasalukuyang estado (2026-08-09): `export const SAMPLES = {}` — WALA PA NI ISA.**
> Kaya ang bawat card sa gallery ay "Sample soon", at ang hero video sa landing ay wala rin.
> Nakasulat na sa `launch_readiness.md`: *wag ipadala sa user ang Slice A bago to malagyan.*

---

## Bahagi 1 — Ang shared quality bar

Hindi per-format ang mga ito. **Isang beses inaayos, lahat ng format ang tinatamaan**, kaya
sila ang unang binabayaran bago ang unang render. Kung may bukas dito, bibilhin mo ang
depekto ng 12 beses.

| # | Bagay | Estado | Saan |
|---|---|---|---|
| 1 | Lead-in dead air sa TTS scene | ✅ 08-09 | `api/_lib/voiceLeadIn.ts` |
| 2 | Lead-in dead air sa STS scene (sabay ang video, buhay ang labi) | ✅ 08-09 | `renderFfmpeg.ts` |
| 3 | Hook reveal hold 1.0 → 0.5 | ✅ 08-09 | `renderFfmpeg.ts` |
| 4 | Dobleng linya (static subtitle + karaoke) | ✅ 08-09 | `drawPlan.ts` |
| 5 | Dead air sa **gitna** ng scene (`~1.0s`) | 🔶 08-10 | **Gawa na, naka-patay pa.** `api/_lib/voiceMidGap.ts` + `MID_GAP_TRIM_ENABLED`. Basahin sa ibaba. |
| 6 | Pacing kada format (pareho ang MrBeast at Testimonial) | ✅ 08-10 | **Napihit na.** Neil gave the numbers and they are live in [`renderPresets.ts`](../api/_lib/renderPresets.ts): `impact`/`hype` 0.35, `clean` 0.7, `classic` 0.5 frozen. Section below is kept as the rationale record. |
| 7 | Hook morph, goo ang gitna | ⛔ 08-13 | [#92](https://github.com/yopiheart/grifon-command/issues/92) · **NOT agent-doable as filed. Do not write the speed-ramp yet** — read the gate 7 section below before touching `renderFfmpeg`. |
| 8 | Talking avatar, natutunaw ang mukha | ⬜ | [#93](https://github.com/yopiheart/grifon-command/issues/93) ⛔ TUNED |
| 9 | Nalalaglag ang numero sa karaoke | ⚠️ 08-10 | **Mali ang naka-file na root cause.** Hindi caption bug. Basahin sa ibaba. |
| 10 | Dobleng text sa scene 2 | ✅ 08-09 | **Kapareho lang ng #4.** Sarado na ng `subtitleCoveredByKaraoke`, `drawPlan.ts:656` |
| 11 | Walang laman ang hook (starvation) | ⬜ | [#104](https://github.com/yopiheart/grifon-command/issues/104) + [#59](https://github.com/yopiheart/grifon-command/issues/59), kulang ang isang regen |

**Panuntunan:** 1 hanggang 4 ay sapat na para magsimula ng **isang** pilot render. Ang 5
hanggang 11 ay kailangan bago ang **buong batch**, kasi bawat isa sa kanila ay lalabas sa
lahat ng 12 sample.

### 🔶 Gate 5: naka-code na ang mid-scene trim, naka-patay pa (2026-08-10)

Yung `~1.0s` na katahimikan sa **gitna** ng VO ay hindi nakikita ng `chooseTrim` (buntot lang
ang inaalis nun). Bagong module na kapatid ng `voiceLeadIn.ts`:
[`api/_lib/voiceMidGap.ts`](../api/_lib/voiceMidGap.ts). Ang patakaran:

- `0.6s` pataas lang ang pinuputol. Mas mataas sya sa `0.25s` ng lead-in kasi mas kita ang
  putol sa gitna ng pangungusap kaysa sa umpisa.
- **May natitirang `0.15s` palagi.** Kino-compress, hindi binubura, para di tunog clipped.
- **Dalawa lang kada scene.** Kapag bawat hinga pinutol, nagiging kabado ang dating.
- Sa `talking` scene sabay pinuputol ang video at ang audio, kaya **may jump cut**. Tanggap yun
  (grammar yan ng UGC at Reels, mukhang self-edit), mas masama ang dead air. Sa `b-roll` at
  `cinematic` audio lang, tuloy lang ang clip, walang jump kasi walang bibig sa screen.

**Naka-patay pa sya.** `MID_GAP_TRIM_ENABLED='true'` ang bubukas nito; habang wala yun, pareho
pa rin ang labas ng render. Ang susunod ay isang pilot render na bukas ang flag, tapos mata at
tenga mo ang magdedesisyon kung tama ang `0.6s` at ang `0.15s`.

₱0 ang panukat: [`tests/unit/voiceMidGap.test.ts`](../tests/unit/voiceMidGap.test.ts) para sa
planner, rebase at filtergraph; at `RUN_MIDGAP=1 npx vitest run tests/integration/midgap-render.test.ts`
para sa totoong ffmpeg (gawa nya ang sariling media, at pinapatunayan nyang wala na talaga ang
butas sa audio, hindi lang naikli ang scene).

### Koreksyon sa gate 9 at 10 (2026-08-10, code trace)

**Gate 10 ay kapareho lang ng gate 4.** Iisang butas, dalawang row. Pinatay na sya ng
`subtitleCoveredByKaraoke` ([`api/_lib/drawPlan.ts:656`](../api/_lib/drawPlan.ts#L656)) at may
test sa [`tests/unit/speechAnchor.test.ts:162`](../tests/unit/speechAnchor.test.ts#L162).
Isara na ang #94.3.

**Gate 9 ay hindi caption bug.** Sabi ng issue, hindi raw ma-match ng aligner ang numeral kaya
nalalaglag sa karaoke timeline. Hindi yan ang mekanismo:

1. Ang karaoke ay kumukuha ng **teksto** sa `scene.scriptLine`. Ang aligner ay pang-**timing**
   lang. Kahit masira ang timing ng isang salita, nasa screen pa rin ang salita.
2. Walang code path na nagbubura ng salita. Sa `karaoke` may base layer na bukas sa buong chunk;
   sa `word-pop` ang enable ay `between(t, wd.start, l.endSec)`, kaya tumatagal hanggang dulo.
3. Ang tunay na dahilan ay nasa fixture ng sarili nating test: ang `scriptLine` ay
   `"Ako si Sarah. Eight hours sa desk araw-araw."` habang ang overlay ay `"8 hours"`.
   **Nagbaybay ang model.** Wala talagang "8" sa karaoke kasi wala syang "8" sa script.

Kaya **script-side compliance** ang klase nito, hindi renderer. Sinasabi ng tuned prompt na digit
ang gamitin (`Prices and numbers — "₱650", "P22 vs P180", "30 days"`,
[`api/_lib/prompts.ts:359`](../api/_lib/prompts.ts#L359)) pero hindi laging sumusunod ang model.
⛔ TUNED ang lunas, kaya Neil-gated at kailangan ng ≥3 sample bago mag-propose.

### ⛔ Gate 7: the filed fix is the SECOND choice, and it may be the wrong layer (2026-08-13)

**Status: investigated, no code written, deliberately.** NOW.md listed gate 7 as "next code I can
take without you." A read of the path before editing it says otherwise, which is the third time
that instinct has paid. Four findings, each independently enough to stop:

1. **Neil already ruled on how #92 gets verified, and it is not a dedicated render.**
   [`sample_batch_test_spec.md`](sample_batch_test_spec.md) line 10: #92 *"rides along"* with the
   sample batch **instead of paying for a dedicated render** (his call 2026-08-01: *"ayoko muna
   mag generate… isahang render na lang."*). So even a perfect patch cannot be confirmed until
   the batch runs. Writing it first inverts his own sequencing.
2. **The speed-ramp is explicitly the fallback, not the fix.**
   [`edit_style_research.md`](edit_style_research.md) §6 is the design of record: the **prompt fix
   ships first** (named concrete anchor + decisive transformation verbs, ⛔ TUNED and Neil-gated),
   and the renderer speed-ramp is labelled **"renderer insurance"** to run *after* Slice 3. The
   same paragraph flags it: **"VO-sync makes this experimental."** Speed-ramping a mid-clip window
   with `setpts` moves the video timeline against a fixed VO, which is the exact desync class
   gates 1 to 5 just spent a week closing. We would be re-opening a solved problem to mask an
   unsolved one.
3. **The renderer cannot find the blob.** Per the Edit DNA the mush sits mid-clip, ~1.8-3.4s of a
   4.2s scene. Nothing in [`renderFfmpeg.ts`](../api/_lib/renderFfmpeg.ts) detects it: `chooseTrim`
   knows only the VO end and `preset.hook.revealHoldSec`, and every other hook-aware branch keys
   off `isHook` / `keepFullClip`, never off clip content. A speed-ramp therefore needs either a
   hardcoded window (wrong for every clip of a different length) or a detector that does not
   exist. The filed one-liner hides a missing component.
4. 🔴 **The root cause may not be the renderer at all.** The hook blob was declared **DEAD**
   2026-06-10 on the wizard path, frame-stepped and verified ~1/10 against an 8/10 baseline
   (Phase D `109d367` + the anchor-color fix, `launch_readiness.md`). #92 was then filed
   2026-08-01 off the **producer** smoke, and the producer is a different path:
   `handoff_oneshot_concierge_unified_flow.md` records that *"the producer rebuild had dropped the
   start→end hook-morph the 8-step wizard still had,"* and `july_close_out_plan.md` notes O1
   hook-morph routing was **removed** from the producer (`65e69de`). `endFrame` plumbing survives
   in [`utils/sceneRender.ts`](../utils/sceneRender.ts) + `types.ts` but appears in **no** `api/`
   render path. **So the live hypothesis is a wiring regression in the producer, not residual
   mush needing a mask.** If that is right, a speed-ramp would paper over a dropped fix and make
   the real defect harder to see.

**What to do instead, in order.** (a) Confirm on the batch's hook scene whether the producer emits
a start→end morph at all; that is a $0 read of one storyboard payload during a run that is already
paid for. (b) If the morph is missing, this is a producer wiring fix and #92 should be re-filed as
such. (c) Only if the morph is present AND still mushy does the prompt fix fire, Neil-gated,
TUNED. (d) The speed-ramp stays last and stays optional. **Do not skip to (d) because it is the
only step an agent can do alone.**

### ✅ Gate 6: RESOLVED — the dial is turned (rationale record, 2026-08-10)

`HOOK_REVEAL_HOLD_SEC` ay isang module constant dati sa `renderFfmpeg.ts`, kaya **pareho ang
hinihintay ng MrBeast hook at ng Testimonial hook** bago pumutol. Nasa `RenderPreset` na sya
ngayon bilang `hook.revealHoldSec` ([`renderPresets.ts`](../api/_lib/renderPresets.ts)), at
binabasa na sya ng `chooseTrim`.

**Sinadyang 0.5 pa rin lahat.** Zero pagbabago sa itsura, at napapatunayan yun ng test: pareho
ang labas ng `chooseTrim` na walang preset at ng `chooseTrim` na CLASSIC. Hindi isinakay ang
panlasa sa isang refactor.

**✅ Sinagot na ni Neil (08-10). Naka-code na ang lahat ng numero:**

| Preset | Format | Dati | **Live ngayon** | Bakit |
|---|---|---|---|---|
| `impact` · `hype` | MrBeast, Temu, UGC Pro | 0.5 | **0.35** | Mabilis ang grammar nila. Ang hintay ay lumalabas na pag-aatubili. |
| `clean` | Testimonial | 0.5 | **0.7** | Restraint mismo ang estilo. May hininga bago pumutol, hindi dead air. |
| `classic` | kill-switch override | 0.5 | **0.5, hindi ginalaw** | Naka-lock sya sa live render at may regression test. |

Verified in [`renderPresets.ts`](../api/_lib/renderPresets.ts) (`revealHoldSec` per preset) and
guarded by [`renderFfmpeg.test.ts`](../tests/unit/renderFfmpeg.test.ts), which asserts
`CLEAN > HYPE`, `CLEAN > IMPACT`, and `CLASSIC === 0.5`.

⚠️ **Still owed: the eyeball.** The numbers are code-correct and taste-unconfirmed. Nobody has
watched 0.35 and 0.7 on real footage. That validation rides the first pilot render, alongside
gate 5 — one render, two gates.

> **Doc-drift note (found 2026-08-13):** this section asked Neil for numbers he had already given,
> and the gate table still read 🔶, for three days after the code shipped. NOW.md was right and
> this file was stale. When a gate closes, close it in BOTH places in the same commit.

### ✅ SAGOT NA: verbatim ang tokenization ng aligner (2026-08-10, bayad na probe)

Naitanong: kapag digit ang naisulat (`"₱149"`), isang token ba ang ibinabalik ng ElevenLabs
forced-alignment, o ang binigkas na `"one","hundred","forty","nine","pesos"`? Mahalaga sya kasi
proporsyonal ang mapping sa [`voiceChunkWindows`](../api/_lib/drawPlan.ts#L334) at bilang ng
salita ang batayan, kaya kung lumolobo ang bilang, **nadi-drift ang lahat ng chunk pagkatapos ng
presyo.**

Hindi to sinasagot ng docs ng ElevenLabs at hindi rin kayang sagutin ng pagbabasa ng code.
Pinatakbo ang [`scripts/check-alignment-numerals.mjs`](../scripts/check-alignment-numerals.mjs)
(isang TTS + isang alignment, `eleven_v3`):

```
SCRIPT_LINE=Only ₱149 today. 8 hours lang, 30 days na warranty.
ALIGNER_TOKENS=["Only","₱149","today.","8","hours","lang,","30","days","na","warranty."]
COUNT_DELTA=0
```

**VERBATIM.** Ibinabalik ng aligner ang mismong token ng teksto na ipinadala natin. Buo ang
`"₱149"`. **Walang drift. Wala ring dapat ayusin sa `voiceChunkWindows`** — at ang "fix" na
muntik nang gawin (bilangin ang binigkas na token) ay **sisira** sana sa mapping, dahil pinipilit
nyang limahin ang tunay na isang token.

Nakatala rin nito ang mas malaking bagay: **matibay ang pundasyon na pinatungan noong 08-09.**
Apat na bagay ang nakasabit ngayon sa alignment (lead-in cut, end trim, caption windows, SFX
anchors), at pantay ang tokenization nya sa script. Wag nang tanungin ulit. Kapag kailangang
i-verify, nasa `scripts/` ang probe, pero **may bayad sya** — huwag patakbuhin nang basta.

Ang ₱0 na harness ang panukat sa 1-6: `build-restitch-spec` → `resign-restitch-urls` →
`fill-restitch-alignment` → `RUN_RESTITCH=1 npx vitest run tests/integration/restitch-real.test.ts`.

---

## Bahagi 2 — Ang 12 recipe

Kolum: **R** = na-render · **E** = tiningnan ni Neil · **S** = nasa `SAMPLES` manifest na at
nasa `public/samples/formats/`.

| Recipe | Format | Label | R | E | S |
|---|---|---|:-:|:-:|:-:|
| `real_talk` | ugc | Real Talk Review | 🔶¹ | ⬜ | ⬜ |
| `hype_drop` | ugc | Hype Drop | ⬜ | ⬜ | ⬜ |
| `rapid_fire` | product_ugc | Rapid Fire | ⬜ | ⬜ | ⬜ |
| `pure_hype` | product_ugc | Pure Hype | ⬜ | ⬜ | ⬜ |
| `try_on` | ugc_pro | Try-On Reveal | ⬜ | ⬜ | ⬜ |
| `before_after` | ugc_pro | Before & After | ⬜ | ⬜ | ⬜ |
| `unboxing` | ugc_pro | Unboxing | ⬜ | ⬜ | ⬜ |
| `unboxing_asmr` | ugc_pro | Unboxing ASMR | ⬜ | ⬜ | ⬜ |
| `demo` | ugc_pro | Watch It Work | ⬜ | ⬜ | ⬜ |
| `tutorial` | ugc_pro | Steps 1-2-3 | ⬜ | ⬜ | ⬜ |
| `commercial` | commercial | Commercial (Business tier) | ⬜ | ⬜ | ⬜ |
| `auto` | ugc_pro | Let AI Pick | n/a | n/a | n/a |

`auto` ay hindi sample-able: pumipili sya ng ibang recipe, kaya ang sample nya ay kung ano
ang napili.

**¹ `real_talk` may na-render na, pero HINDI sya counted.** `apr_69e5adc6` (07-31): 9 scenes,
0:35, umabot sa First Cut. **Yun mismo ang pinanggalingan ng 7-issue punch list** (#89 hanggang
#95) na pinagmulan ng mga gate dito, kaya ipapakita nya sa customer ang eksaktong sira na
inaayos natin. **9 scenes din sya, samantalang 4 na ang napagkasunduan noong 08-10**, kaya mali
na ang haba. Ang silbi nya ay **panghambing lang** (ang "bago" laban sa pilot na "pagkatapos"),
at kahit dun, hindi sya perpektong katapat dahil sa magkaibang bilang ng scene. **Huwag itong
ilagay sa `SAMPLES`.** Tanong ito ni Neil noong 08-13; nakasulat na para hindi na maulit.

### Ang paglalagay kada format (napagkasunduan kay Neil, 08-13)

**Isa-isa, hindi hintayin ang lahat ng 12.** Sinusuportahan na to ng code, walang babaguhin:
`SAMPLES` ay `Partial<Record<RecipeId, RecipeSample>>` na walang laman
([`recipes.ts:108`](../components/OneShotAd/recipes.ts#L108)), at ang recipe na wala pa dun ay
**"Sample soon"** placeholder ang lalabas. Kaya kayang may tatlong buhay na card habang siyam
ang naghihintay.

Kada format, ganito ang takbo, at **hindi tumatawid sa 3 nang walang 2:**

1. **R** — i-render.
2. **E** — panoorin ni Neil. 🔴 **Sya lang ang makakapagsabi ng pasado.** Walang sample na
   pumapasok sa gallery na hindi nya nakita.
3. **S** — ilagay ang file sa `public/samples/formats/` at isang susi sa `SAMPLES`. Live na agad
   ang card na yun, tuloy lang sa placeholder ang iba.

⚠️ **Hindi sya auto-play, at dapat alam ni Neil to.**
`autoplay = hoverCapable && !reduceMotion` ([`LaunchScreen.tsx:1495`](../components/OneShotAd/LaunchScreen.tsx#L1495)).
Sa desktop, hover bago gumalaw. **Sa cellphone, poster muna at may Play chip na kailangang
pindutin** dahil walang hover dun. Karamihan ng customer ay naka-cellphone, kaya kung tunay na
auto-play ang gusto, hiwalay na usapan yun (mute + `playsInline` + data at 12 video sa isang
page). ⚠️ **Kailanman hindi pa natakbo ang path na to** dahil walang laman ang `SAMPLES`, kaya
ang unang sample ang magiging unang totoong test ng card mismo.

**Ang unang tatlo, sa ganitong pagkakasunod** (isa kada beses, tingnan bago ang susunod):

1. **`real_talk`** — ito ang pinaka-karaniwan at ito ang naka-render na sa `apr_69e5adc6`,
   kaya may pang-hambing tayo bago at pagkatapos ng apat na pag-aayos.
2. **`before_after`** — dito lumalabas ang transformation beat at ang application verb rule.
3. **`unboxing_asmr`** — walang boses (`audioMode: 'sfx_only'`), kaya ibang path ang
   sinusubukan nya: puro music at SFX at burned text.

Kung pasado ang tatlo, ang natitirang siyam ay pwede nang batch.

---

## Bahagi 3 — Ang hero video sa landing

Walang `<video>` sa buong `components/landing/`. **Galing sa parehong batch ang hero**, hindi
sya hiwalay na trabaho: kunin ang pinakamalakas sa mga na-eyeball na, tapos yun ang ilagay.

Wag maghanda ng hiwalay na shoot para dito.

---

## Kaugnay

- [`oneshot_format_showcase.md`](oneshot_format_showcase.md) — ang Slice A / Slice B na plano
- [`sample_batch_test_spec.md`](sample_batch_test_spec.md) — ang test spec at ang mga asset
  (Hiraya Glow, nasa `tests/fixtures/sample-batch/`)
- [`launch_readiness.md`](launch_readiness.md) — ang scoreboard
