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
| 5 | Dead air sa **gitna** ng scene (`~1.0s`) | ⬜ | kailangan ng split-at-concat; **may tanong sa jump cut, kay Neil** |
| 6 | Pacing kada format (pareho ang MrBeast at Testimonial) | ⬜ | ilipat ang `HOOK_REVEAL_HOLD_SEC` sa `RenderPreset` |
| 7 | Hook morph, goo ang gitna | ⬜ | [#92](https://github.com/yopiheart/grifon-command/issues/92) · sundan ang `/viral-autopsy` kay Savic |
| 8 | Talking avatar, natutunaw ang mukha | ⬜ | [#93](https://github.com/yopiheart/grifon-command/issues/93) ⛔ TUNED |
| 9 | Nalalaglag ang numero sa karaoke | ⬜ | [#94](https://github.com/yopiheart/grifon-command/issues/94).2 |
| 10 | Dobleng text sa scene 2 | ⬜ | [#94](https://github.com/yopiheart/grifon-command/issues/94).3 |
| 11 | Walang laman ang hook (starvation) | ⬜ | [#104](https://github.com/yopiheart/grifon-command/issues/104) + [#59](https://github.com/yopiheart/grifon-command/issues/59), kulang ang isang regen |

**Panuntunan:** 1 hanggang 4 ay sapat na para magsimula ng **isang** pilot render. Ang 5
hanggang 11 ay kailangan bago ang **buong batch**, kasi bawat isa sa kanila ay lalabas sa
lahat ng 12 sample.

Ang ₱0 na harness ang panukat sa 1-6: `build-restitch-spec` → `resign-restitch-urls` →
`fill-restitch-alignment` → `RUN_RESTITCH=1 npx vitest run tests/integration/restitch-real.test.ts`.

---

## Bahagi 2 — Ang 12 recipe

Kolum: **R** = na-render · **E** = tiningnan ni Neil · **S** = nasa `SAMPLES` manifest na at
nasa `public/samples/formats/`.

| Recipe | Format | Label | R | E | S |
|---|---|---|:-:|:-:|:-:|
| `real_talk` | ugc | Real Talk Review | ⬜ | ⬜ | ⬜ |
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
