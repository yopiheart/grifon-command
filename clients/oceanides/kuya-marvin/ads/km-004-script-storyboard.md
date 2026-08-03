# KM-004-AD — "Ang Resibo" · Script + Storyboard (para sa approval ni Neil)

**Pagbalik ni Marvin. Ikatlong creative ng `OCEANIDES-PRICE-01`, kapalit ng GB-001
habang wala pang boses si Gabriel.**

**Chain:** GB-001 v3 (aprubado, naka-hold sa boses) → recast kay Marvin → preflight
PASADO → **NEIL GATE (itong doc)** → plates → 5 Veo roll → STS clone → edit → verifier → publish.

**Format:** `ugc-talking-compressed` · **Awareness:** `solution_aware` ·
**Destination:** `https://oceanidesph.com/` · **Preset:** `spotlight` ·
**Ad account:** `4165212657057538` · **Page:** `1184710811397498` (Kuya Marvin ng Oceanides)

```
node tools/ad_preflight.mjs --script clients/oceanides/kuya-marvin/ads/km-004/script.spec.json
→ Pasado lahat (1 warning)
```

---

## Bakit kay Marvin ito nababagay, at hindi lang basta kapalit

Hindi ad ni Gabriel ang GB-001. **Data ni Marvin yun na muling itinayo.**

| Piraso | Saan galing |
| --- | --- |
| Ang hook | Linya ni Marvin sa KM-003. 98.5% sa 0:03, sinukat sa 7,047 tao |
| Bakit walang "libre ang tingin" | 41% na bumagsak sa 9.2s-18.4s ng KM-003 |
| Bakit maikli | 8% lang ang umabot sa dulo ng 36.8s |
| Bakit website at hindi Messenger | 100 message ni Marvin, isang order |

Si Gabriel ang nanghiram ng linya. Ang ibinabalik dito ay hindi kopya, orihinal.

---

## Script (77 salita)

```
hook (LOCKED — verbatim mula sa KM-003):
Puno na ang septic tank mo, hindi barado.
```

| # | Linya | Salita |
| --- | --- | --- |
| 1 | Kahit anong plunger, balik nang balik ang problema. | 8 |
| 2 | Pero ang mas nakakatakot, yung singil pagdating ng truck. | 9 |
| 3 | Isa ang presyo sa phone, iba na sa receipt. | 9 |
| 4 | Grabe daw ang singilan. Yan ang sabi nila. | 8 |
| 5 | Kaya nasa page na ang buong presyo, nakasulat. | 8 |
| 6 | Pati ang mga dagdag na itinatago ng iba. | 8 |
| 7 | 🆕 **Kapag hindi pa naman puno, uuwi kami. Hindi ka namin pipilitin.** | 11 |
| 8 | Basahin mo muna bago ka mag-book ng schedule. | 8 |

🔴 **WALANG PRESYO SA SINASALITA.** Standing rule `oceanides_offer_price_page.md` §9.
Ang **card** ang nagpapakita ng ₱5,000, hindi ang bibig ni Marvin.

### Ang linya 7 ang tanging bago, at kailangan ng go mo

Verbatim mula sa live na page ([funnel.config.ts:430](../../../../funnels/oceanides-price-page/src/funnel.config.ts#L430)),
pinaikli lang para pumasok sa 12-salitang kisame:

> *"Kapag hindi pa naman puno, sasabihin namin. Uuwi kami. Hindi ka namin pipilitin."*

**Hindi ito ginagamit ng GB-001 kahit saan**, at sa palagay ko yun ang pinakamalaking
nasayang. Sa kategoryang puno ng manloloko, ang kompanyang nagsasabing *uuwi kami nang
walang bayad* ay ang pinaka-nakakadisarmang bagay na kayang sabihin. Nagiging
kabutihan ang *"basahin mo muna"* imbes na pakiusap.

Pangako sya ng totoong kompanya, kaya sayo ang huling salita.

---

## Storyboard — labing-isang beat

| # | t | Nakikita | Sinasabi | Roll | Gastos |
| --- | --- | --- | --- | --- | --- |
| 1 | 0.0-3.4 | **s1** talking, close, eye-level | hook | Veo 1 | $1 |
| 2 | 3.4-6.6 | **b1** kamay na nagpaplunger, LUBOG sa tubig | linya 1 | clone TTS | $0 |
| 3 | 6.6-10.2 | **s2** talking, medium chest-up, slight-low | linya 2 | Veo 2 | $1 |
| 4 | 10.2-13.6 | **b2** phone sa tenga, tupi ng papel sa ledge | linya 3 | clone TTS | $0 |
| 5 | 13.6-16.6 | **quote card** na may totoong sinabi ng customer | linya 4 | clone TTS | $0 |
| 6 | 16.6-20.0 | **s3** talking, tight face, eye-level | linya 5 | Veo 3 | $1 |
| 7 | 20.0-21.2 | **screen recording**, 1.2s na sulyap sa totoong page | walang salita | — | $0 |
| 8 | 21.2-24.4 | **ticket card**, ₱5,000 + apat na dagdag, nababasa | linya 6 | clone TTS | $0 |
| 9 | 24.4-28.0 | **s4** talking, medium chest-up, eye-level | linya 7 | Veo 4 | $1 |
| 10 | 28.0-31.0 | **s1** talking, close, eye-level (bookend) | linya 8 | Veo 5 | $1 |
| 11 | 31.0-32.4 | **end card**, logo + OCEANIDESPH.COM | walang salita | — | $0 |

Flash 0.07s + whoosh sa beat 4, 7 at 9. Music 0.20. Target na haba matapos ang
speech-cut: **26-30s**. Kung lumagpas, 1.05-1.12x speedup, hindi pagputol ng beat.

---

## Ang totoong sorpresa: mas maraming beat, mas kaunting pera

| | GB-001 v3 | KM-004 |
| --- | --- | --- |
| Beat | 7 | **11** |
| Bayad na Veo roll | 4 (bagsak sa gate) | **5** |
| Gastos | $6-8 na aprubado | **$5-7** |
| Linya kada roll | 2 | **1** |

Hindi ito trick. **May clone si Marvin, wala si Gabriel.** Ang roll 4 ng GB-001 ay
binayarang Veo na ang tanging silbi ay boses, dahil walang ibang paraan para
magsalita si Gabriel. Ang anim na hindi-mukha na beat dito ay pinapasalita ng clone
ni Marvin sa halagang sentimo.

At ang caption churn ang totoong lever ng pace (**P1**, 11 corroborations), hindi ang
bilang ng eksena. Labing-isang beat sa ~28s ay bagong stimulus kada 2.5s.

---

## Labindalawang pagkakamali kahapon na hindi na uulitin

1. **Isang linya kada roll.** Tatlong beses bumagsak ang GB-001 dito sa preflight.
2. **`maxPaidRolls` = 5.** Wala nun sa GB-001, at sampung tawag ang nangyari noong dalawa lang ang aprubado.
3. **1.2s lang ang scroll**, tapos hard cut sa nababasang card. 5.6s na walang makakabasa ang v2.
4. **Walang caption chunk na tatawid sa kuwit.** Kokopyahin ang `gb-001/captions.mjs`.
5. **NO-SMILE clause sa bawat roll.** Tatlong beses ngumiti si Gabriel. May tooth-gap issue si Marvin, kaya mas mabigat pa dito.
6. **Hook overlay sa frame 0, walang fade, y=288.** Nasa y=150 ang v1 at pinutol nang malinis ng 4:5 crop.
7. **Existence guard sa fontfile.** Tahimik syang bumabagsak sa serif at mukhang tama sa thumbnail.
8. **Pre-crop 864x1536 bago ang Veo.** Zero letterbox mula sa pinagmulan.
9. **concat FILTER**, hindi demuxer copy.
10. **Walang pangalan sa Veo dialogue** (RAI filter).
11. **Isang jobsite** sa lahat ng apat na plate.
12. **Dense-sample muna bago mag-re-roll.** Dalawang "depekto" sa KM-003 ay false alarm pala.

**Dagdag pa:** static ang camera sa Veo, punch-in sa edit. Pinanatili ng GB-001 ang
push-in ni Veo, na sinukat na ~7% lang matapos ang speech-cut. Nasa ilalim yun ng
makikita, kaya walang galaw ang mga talking beat nya.

**Verifier bago kita abalahin:** bawat text beat isi-scale ko sa 375px at babasahin
ko mismo, tapos `render_audit.mjs` sa buong cut. Hindi ko kayang i-QA ang tainga.
**Ang boses at ang bigkas ay sayo pa rin.**

---

## Plate spec — Marvin, hindi Gabriel

Ang recipe ay `.claude/skills/marvin-avatar/` + `kuya-marvin/identity-lock/`. Tatlong
bagay na baligtad sa kakagawa lang natin, at dito nagkakamali ang model:

- **Fade ang buhok ni Marvin.** Kay Gabriel ang makapal na sinuklay paurong.
- **May relo si Marvin.** Kay Gabriel ang wristband at hikaw. Walang relo si Gabriel.
- 🔴 **Walang ngiti, at mas mahigpit ito kay Marvin** dahil sa tooth-gap. Ang emosyon
  ay dala ng boses, hindi ng mukha (`PACING Fix 3`).

Isang maulap na araw, isang ilaw, walang sasakyan sa frame, puting cab lang kung
sakali. Walang asul na tanker, hard ban yun.

---

## Neil gate — bago ang unang piso

1. ⛔ **Go ba sa ~$5-7 na Veo?** Limang roll. Hindi ako gagalaw nang wala ka.
2. **Aprubado ba ang linya 7** (*"uuwi kami, hindi ka namin pipilitin"*)? Pangako sya
   ng totoong kompanya at galing sa page mo, pero sayo ang huling salita.
3. **Kling b-roll: oo o hindi?** Dagdag na ~$2-3 para pagalawin ang b1 at b2. Kung
   hindi, still + FFmpeg push-in muna, kapareho ng GB-001 v3. **Mungkahi ko: hindi
   muna.** Isang bagong variable kada ad.
4. **Litrato ni Marvin para sa landing page.** Si Gabriel lang ang nasa
   `FieldInspector` section ngayon. Kung si Marvin ang nag-ad at si Gabriel ang
   bumungad sa page, sira ang message match, at nasa close yun naka-upo.

**Kung may papalitan ka sa script, ngayon mo sabihin.** Mas mura ang palitan ang
salita kaysa mag-render ulit.
