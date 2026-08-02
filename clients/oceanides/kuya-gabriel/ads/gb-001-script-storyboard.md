# GB-001-AD — Script + Storyboard (para sa approval ni Neil)

**Unang ad ni Gabriel. Unang ad na tumuturo sa website, hindi sa Messenger.**

**Chain:** KM-003 data read (2026-08-03) → angle approved ni Neil → **NEIL GATE (itong doc)**
→ plates (`marvin-avatar` + `kuya-gabriel/IDENTITY.md`) → clips (veo-produce) → screen
recording → audio (STS) → overlays → edit → VERIFIER → publish.
**Format:** `ugc-talking-compressed` · **Awareness:** `solution_aware` ·
**Destination:** `https://oceanidesph.com/` (HINDI Messenger) ·
**Ad account:** `4165212657057538` · **Page:** `291924520660232`

---

## Bakit ganito ang hugis nito

Tatlong bagay mula sa KM-003, lahat may numero (`workflows/ad_performance_ledger.md`,
entry 2026-07-28):

| Nakita | Numero | Ginawa dito |
| --- | --- | --- |
| Elite ang hook | Pinakamababang CPM sa lahat ng 30 ad sa account (₱79.29) | **Hindi ginalaw ang hook.** Verbatim. |
| Bumabagsak ang gitna | 41% nawala sa 9.2s-18.4s, doon nakaupo ang "libre ang tingin" | **Pinalitan ang alok.** Hindi na usapan ang hinihingi. |
| Hindi umaabot sa CTA | 8.0% lang ang nakakarating sa dulo ng 36.8s | **18s, hindi 36.8s.** |

At isa pang bagay na hindi nakikita sa retention: **100 message, isang order.** Ang
butas ay ang close. Kaya hindi na Messenger ang dulo nito.

🔴 **WALANG PRESYO SA SCRIPT AT SA OVERLAY.** Standing rule, `oceanides_offer_price_page.md`
§9: ang **page** ang nagsasabi ng presyo, hindi ang ad. Ang ibinebenta dito ay ang
**katotohanang nakasulat sya**, hindi ang numero.

---

## Script (63 salita, ~18s)

```
hook (LOCKED — verbatim mula sa KM-003, 98.5% sa 0:03, na-verify sa 7,047 tao):
Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado.
```

| # | Beat | Spoken / VO | Salita |
| --- | --- | --- | --- |
| s1 | HOOK (talking) | Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado. Puno na. | 14 |
| s2 | ANG TAKOT, PINANGALANAN (talking) | Pero alam mo kung ano ang mas matindi? Yung presyo. Isa ang sinasabi sa telepono, iba na pagdating ng truck. | 20 |
| s3 | MEKANISMO (VO sa ibabaw ng screen recording, walang mukha) | Kaya inilagay namin lahat sa page. Buong presyo, pati yung mga dagdag na itinatago ng iba. Nakasulat, bago pa kami dumating. | 21 |
| s4 | CTA (talking) | Basahin mo muna. Tapos ikaw na ang bahala. | 8 |

**Bakit "mo" at hindi "nyo":** isang tao ang kausap, hindi grupo. Ang Taglish ay
kusang tumatalon sa `nyo` at tahimik nitong sinisira ang write-to-one-person na
rule habang pasado pa rin ang lahat ng ibang check.

**Bakit hindi nagpipilit ang huling linya:** Solution Aware sila at puno ng
manloloko ang kategorya. Ang *"tapos ikaw na ang bahala"* ay nagpapababa ng bantay.
Kapareho ng disqualification line sa page (*"kapag hindi pa naman puno, sasabihin
namin, uuwi kami"*) na aprubado na.

### On-screen text

- **s1 OVERLAY** (frame 0, **WALANG fade-in**): `HINDI BARADO. PUNO NA.`
  🔴 Frame 0 ang kinukuha ni Meta bilang thumbnail. Ang KM-003 ay nag-fade in ng
  hook sa ~0.5s kaya **blangkong mukha** ang napili ni Meta at kinailangan pang
  manwal na pumili ng t=1.4s. Huwag nang ulitin.
- **s2** captions BEGIN (IMPACT grammar, 1-2 salita kada chunk, speech-locked)
- **s3** captions lang. Ang page mismo ang visual, wag nang lagyan ng word-card.
- **s4 END-CARD**: `BASAHIN MO MUNA` / `OCEANIDESPH.COM`
  Walang piso, walang numero. Nakasulat lang, hindi binibigkas.

---

## Storyboard

| # | t | Visual | Plate spec | Motion | Text | Audio |
| --- | --- | --- | --- | --- | --- | --- |
| s1 | 0.0-4.2 | Talking waist-up, **eye-level**, tabi ng puting van, maulap | Gabriel close/waist-up neutral, pre-crop 864×1536 | Veo Option B: FRAME 0 mid-syllable, dialogue-first, ISANG slow push-in, END-CLEAN, EXPRESSION LOCK | Hook overlay LANG, walang caption | STS clip audio; music bed pumapasok mababa |
| — | @4.2 | **Flash 0.07s** (1/2) | — | — | — | whoosh |
| s2 | 4.2-9.6 | Talking waist-up, **slight-low**, tank area sa likod | Gabriel, ibang anggulo, parehong araw | Veo Option B, slow push-in | Captions (face-safe, y≈1267-1560) | STS |
| s3 | 9.6-15.4 | 🆕 **SCREEN RECORDING ng totoong page.** Kamay na hawak ang phone, naka-scroll sa `oceanidesph.com` hanggang sa ticket at sa listahan ng add-on. | ⚠️ **HINDI AI.** Totoong screen capture. Zero peligro sa nasirang teksto, at ang page mismo ang patunay ng sinasabi ng VO. | Screen capture + FFmpeg slow push-in ($0) | Captions | Clone TTS VO |
| — | @~15.4 | **Flash 0.07s** (2/2) | — | — | — | whoosh |
| s4 | 15.4-18.0 | Talking waist-up, **eye-level**, sa harap ng van | Gabriel, pangatlong anggulo | Veo Option B | Captions; END-CARD sa huling ~1.2s | STS; music out |

**Gastos: ~$3.** Tatlong Veo roll lang (s1, s2, s4). **Libre ang s3** — screen
recording sya, hindi generation. Ito rin ang pinakamalakas na beat: sa halip na
sabihin ni Gabriel na nakasulat ang presyo, **nakikita mo mismo.**

---

## Plate spec — Gabriel (basahin ang [`../IDENTITY.md`](../IDENTITY.md) bago mag-render)

Hindi ko uulitin ang buong payload. Ito ang mga bumabagsak kapag nakalimutan:

- 🔴 **`gabriel-ref-5-body-master.jpg` sa BAWAT generation.** Kapag mukha lang ang
  ibinigay, iimbento ng model ang katawan at magmumukhang kinabit ang ulo.
- 🔴 **WALANG NGITI.** Desisyon mismo ni Gabriel (2026-07-30). Sarado at nakarelaks
  ang bibig, pantay ang baba, diretso sa lens. Kalmadong eksperto. Sa kategoryang
  puno ng manloloko, ang labis na sigla ay mukhang scam.
- 🔴 **Isang maulap na araw, isang ilaw para sa lahat.** Walang anino sa lupa,
  walang maliwanag na batik. Ang `warm tan` ay **pigment nya, hindi ilaw sa kanya** —
  kapag hindi mo pinaghiwalay sa prompt, lulutang sya sa background. Ito ang
  bumagsak nang tatlong beses sa cover.
- **Waist-up sa 2 metro**, hindi buong katawan sa 3. Hindi nakahalukipkip. Ulo ≈
  1/3 ng lapad ng balikat, katulad ng body master.
- **Anchors:** Polynesian blackwork sa braso (sabihing positional: *"the forearm of
  the arm that also carries the dark wristband"*), itim na rubber wristband, stud
  na hikaw. **WALANG RELO** — kay Marvin yun.
- **Buhok:** makapal, may volume sa tuktok, sinuklay paurong. **HINDI fade** (kay
  Marvin ang fade).
- **Damit:** malinis na navy work polo. Walang nababasang teksto, walang logo.
- 🔴 **Puting cab + silver aluminum closed van LANG. WALANG asul na tanker** — imbento
  sya, hard ban sa `clients/oceanides/DESIGN.md`.
- **Pre-crop 1024×1536 → 864×1536 BAGO mag-Veo.** Zero letterbox mula sa pinagmulan,
  kaya walang crop at walang upscale sa edit (aral ng KM-003 v1).

---

---

## ✅ PRODUCTION RECORD — v1 (2026-08-03)

**Deliverable:** `gb-001/GB-001-AD-v1.mp4` — **20.4s**, 1080×1920, 30fps, 15.8 MB.
**Rebuild:** `bash clients/oceanides/kuya-gabriel/ads/gb-001/build-cut.sh` (repo root, ffmpeg sa PATH).
**Gastos:** 4 na Veo roll (~$4) + 3 codex-image plate (ChatGPT plan) + $0 sa screen recording.

**Nagbago sa plano:** 20.4s, hindi 18s. Nag-uunat ang Veo ng dialogue para punuin
ang 8s kada roll, kaya kahit pagkatapos ng speech-cut at ng 1.12x ay 20.4s pa rin.
Pasok pa rin sa 15-20s na intent, at kalahati ng 36.8s ng KM-003.

**Speech-cut, hindi hand-timed.** Ang `.tmp/speechcut.mjs` ang naghahanap ng
totoong salita sa RMS envelope (50ms window, -26 dB, tinatahi ang patlang na mas
maikli sa 0.35s). 22.2s raw → **14.8s ng puro salita**. Ito ang deterministikong
bersyon ng ginawang kamay sa hook ng KM-003.

### Dalawang depekto na nahuli ng QA

1. 🔴 **NGUMITI si Gabriel sa unang s2 roll** — may ngipin at taas ng pisngi.
   Hard rule yun na sarili nyang desisyon, at **hindi sya nahuhuli ng
   EXPRESSION LOCK ng `veo-produce.mjs`** (sinasabi lang nun ang *"NO smiling
   wider"*, hindi *"walang ngiti"*). Kinailangan ng hiwalay na no-smile na linya
   sa `--setting`. Ang `s2b.mp4` ang nasa cut. **Idagdag ito sa bawat susunod na
   roll ni Gabriel.**
2. Ang unang s3 scroll ay dumaan sa ₱5,000 ticket nang napakabilis at nagtapos sa
   dalawang segundong **puting espasyo**. Ngayon: 1.4s na hinto sa ticket, tapos
   scroll na nagtatapos pa rin sa loob ng value stack.

### ⚠️ Ang hindi ko kayang i-QA

**Hindi ko naririnig ang audio.** Puro mata ang QA ko: identity, framing, ilaw,
mukha, teksto, timing ng putol sa frame. **Ang boses, ang bigkas ng Taglish, at
kung natural ba ang mga putol ay tainga mo, hindi akin.** Pakinggan mo bago
i-upload.

**Wala pang per-word captions.** Kailangan ng speech map na hindi ko ma-verify
nang walang tainga. May bottom-third band kada beat pansamantala. Susunod na pass.

---

## Neil gate — bago ang unang piso

1. ⛔ **Veo render ay BAYAD at GATED.** ~$3. Hindi ako magre-render nang walang sabi mo.
2. ⛔ **Codex CLI ay hindi naka-login.** Kailangan ng `codex login` sa browser bago
   ang plates. Hindi ko kayang gawin, sayo lang yun.
3. 🔧 `.\scripts\restore-hyperframes.ps1` para sa ffmpeg + ffprobe.
4. 🔧 `ELEVEN_LABS_API_KEY` sa `.env` para sa STS.
5. **Aprubahan ang script sa itaas.** Kapag may pinalitan ka, sabihin mo bago ang
   plates — mas mura ang palitan ang salita kaysa mag-render ulit.

**Kung ayaw mong gumastos ngayon:** ilabas muna ang static (`price-addons-ticket.png`,
approved 2026-08-03) nang mag-isa. Mabubuhay ang campaign nang wala ang video, at
sasabihin mismo ng unang data kung sulit pa ang $3.
