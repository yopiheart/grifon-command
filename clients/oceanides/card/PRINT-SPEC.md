# Oceanides business card — spec para sa printer

**Ipadala ito sa printer:** `press-front.png` at `press-back.png`.
Wag ang `comp-*.png` — may guides yun, pang-review lang.

## Sabihin sa printer

| | |
| --- | --- |
| **Sukat (trim)** | **90 x 50 mm** (PH standard) |
| **Kasama sa file** | **3mm bleed sa bawat gilid** — kaya 96 x 56 mm ang file |
| **Resolution** | **300 dpi** — 1134 x 661 px |
| **Papel** | **350gsm** |
| **Finish** | **Matte lamination**, magkabilang mukha |
| **Print** | **Double-sided**, full colour |
| **Unang bilang** | **100–200 lang muna** (tingnan sa ibaba kung bakit) |

Kulay: RGB PNG ang ibinibigay. Karamihan ng shop dito ay tumatanggap nyan at
sila na ang magko-convert sa CMYK gamit ang sariling profile nila. Mas maganda
yun kaysa manghula tayo ng profile na hindi naman sa kanila.

## Bago mo aprubahan ang buong run

**Tatlo. Wag laktawan ang una at pangalawa.**

1. **Humingi ng isang printed proof, tapos itapat sa van.** Ang navy `#0A1F45`
   ay maaaring lumihis sa press — minsan nagiging lila. Kapag hindi tugma sa van
   at sa uniform, ipaayos bago tumakbo ang buong run.
2. **I-scan ang QR sa totoong card**, sa loob ng gusali, sa madilim na lobby, sa
   pangkaraniwang Android. **Hindi sa screen.** Sinukat namin sa file at 0.439mm
   kada module — pasado, pero hindi sobra-sobra. Ang papel at ang lamination ang
   huling variable at doon lang malalaman.
3. **Tingnan ang gilid ng amber tab.** Sadyang tinatabas sya sa kaliwang gilid.
   Kapag may puting guhit sa gilid, kulang ang bleed sa pagkaka-set nila.

## Bakit 100–200 lang muna

Hindi kuripot — may dalawang bagay na maaaring magpabago ng card sa loob ng
ilang buwan:

- **Ang titulo ni Marvin.** Nakalagay ang "Authorized Representative." Totoo lang
  yan kung may sulat si CEO Agosto na nagbibigay sa kanya ng awtoridad na
  kumatok at mag-alok. **Kumpirmahin bago tumakbo ang malaking run.**
- **Ang QR ay may UTM** (`utm_campaign=canvass-01`). Kapag gusto mong hiwalay na
  sukatin ang bawat batch o bawat tao, magbabago yun.

Mas mura ang magpa-print ulit ng 200 kaysa may 1,000 na maling card.

## Ano ang WALA sa card, at bakit

⛔ **Walang DENR, walang LLDA, walang ESC, walang Certificate of Treatment.**

Hindi ito palamuti na nakalimutan. Ang mga papel na yun ay **hindi kay Oceanides**
— ang DENR ID `OL-TR-R3-14-000080` ay kay Globaltec, at ang certificate na
`BEHMC(1)WHN0095001WW260318` ay sa ibang kompanya pa, may confidentiality clause.
Nalinis na sila sa 22 file noong 2026-08-08. Nakasulat sa
`clients/oceanides/compliance-findings-2026-08-08.md`.

**Ang card na hawak ng compliance-sensitive na admin ay nakalimbag na ebidensya.**
Wag magdagdag ng badge dyan hangga't walang sariling ESC ang Oceanides na may
sakop na NCR.

⛔ **Walang lokasyon/branch** — utos ni Neil.
⛔ **Walang presyo** — walang presyo sa CTA ang production rule ng brand.

## Kung may babaguhin

```bash
# i-edit ang front.html / back.html / _card.css, tapos:
node clients/oceanides/card/render-card.mjs --guides   # review, may trim + safe guides
node clients/oceanides/card/render-card.mjs            # press files
```

Dalawang gate ang tatakbo, at babagsak ang render kapag pumalya:

- **Font gate** — kapag hindi nag-load ang Archivo Expanded, hihinto. (Kung wala
  ito, tahimik na Arial ang lalabas at mapapansin mo na lang pagdating ng kahon.)
- **Safe-margin gate** — kapag may elementong lumagpas sa 3mm safe area,
  pinapangalanan sya at hihinto. Ang amber tab lang ang exempt, sadya syang
  tinatabas sa gilid.

Ang QR ay `qr.svg`, galing sa `tools/artifacts/data/oceanides-card-qr.json`.
Para palitan ang link, i-edit ang `tools/artifacts/make-card-qr.py` at patakbuhin.
⚠️ **Kapag pinaikli mo ang URL, lumiliit ang QR version at lumalaki ang module** —
ang 79-character na UTM link ang nagtutulak nito sa version 5 (37x37). Ang isang
maikling redirect na tulad ng `/c1` ay magpapababa nito sa version 2 (25x25) at
halos dodoblehin ang laki ng module sa parehong lapad. Yun ang tunay na upgrade
kung magiging matigas ang QR sa field.
