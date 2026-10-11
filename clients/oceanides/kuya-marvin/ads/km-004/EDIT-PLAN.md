# KM-004 — Edit plan

**Layunin (Neil, 2026-08-03): talunin ang lahat ng edit na nagawa natin.** Ang
babatayan ay **GB-001 v3**, ang pinakamataas nating naabot (approved, grade B).
Lima ang lever dito na hindi pa nagagamit ni GB-001 v3. Apat sa lima ay $0.

---

## 1. Captions — per-word invert. Ito ang pinakamalaking $0 na lever.

Ang `spotlight` ay pinili mo noong 2026-07-27 dahil sa **VO-timed active-word
invert** — gumagalaw kada SALITA, hindi isang beses kada chunk. Pero **hindi pa
sya naitatayo kailanman.** Chunk-pop lang ang gawa (`NOW.md` §PARKED), kaya ang
GB-001 v3 ay chunk-pop lang din. Dito sya unang tatayo.

Bakit sya ang tamang taya: **P1, 11 corroborations — ang pace ay caption churn,
hindi cut rate.** Ang invert ay nagpapataas ng churn mula ~2 galaw kada segundo
papuntang ~4, nang walang dagdag na eksena at walang dagdag na piso.

- Anton caps, **outline hindi box** (P2, 8 corroborations)
- 1-3 salita kada chunk, 0.4-0.6s
- **Walang chunk na tumatawid sa kuwit** (aral 18) — kokopyahin ang
  `captions.mjs` in this folder as the reference implementation
- `y≈1267`, hindi tumatakip sa mukha
- Humihinto kapag may big text sa itaas (batas na isang-layer-lang)

⚠️ **Ito ang unang babagsak kung maubusan tayo ng oras.** Kailangan nya ng
word-level na timing, at ang hawak natin ay RMS envelope lang — hahatiin ang
chunk window ayon sa bilang ng pantig. Kung hindi sya lumapat sa tainga,
babalik tayo sa chunk-pop ng GB-001 na pruweba nang gumagana.

## 2. Hyperframes HTML sa LAHAT ng teksto, may GSAP

Ang GB-001 v3 ay HTML lang sa hook at end card. Dito, siyam:

| Beat | Overlay | Animation |
| --- | --- | --- |
| 1 | `PUNO NA. / HINDI BARADO.` | frame 0, **walang fade** (kinukuha ni Meta ang frame 0 bilang thumbnail) |
| 2 | `HINDI TOILET ANG SIRA.` | slam-in, letter stagger |
| 4 | `IBA ANG RESIBO.` | slam-in |
| 5 | quote card | fade-up sa **1080x1350 na naka-center sa y=285** |
| 7 | `NAKASULAT NA.` | slam-in |
| 8 | ticket card | pareho, 1080x1350 |
| 9 | `UUWI KAMI.` | **slam sa IBABA (y=1150)**, hindi sa itaas |
| 11 | end card + logo | fade-up |

Ang **1080x1350 na naka-center sa y=285** ay eksaktong pumupuno sa feed-safe band
(aral 17). Buo sya sa 4:5 feed, may malinis na padding sa 9:16.

## 3. Kling sa b-roll — at may kahulugan ang galaw, hindi palamuti

Hindi pa nagagamit ng GB-001 v3 (still + push-in lang sya, `⛔ WALA PANG KLING`).
Nandyan na ang `KLING_ACCESS_KEY` sa `.env`.

- **b1** — dahan-dahang macro push-in papasok sa gomang lubog sa tubig. Papalapit
  ka sa mismong bagay na hindi umuubra.
- **b2** — 🔴 **dahan-dahang lateral track mula sa phone papunta sa nakatuping
  papel sa ledge.** Sinasabi ng linya: *"Isa ang presyo sa phone, iba na sa
  receipt."* Ang camera mismo ang naglalakbay mula phone papuntang papel habang
  binibigkas yun. **Kuwento ang galaw, hindi dekorasyon.** Wala pa tayong
  ganitong shot kahit kailan.

Grammar mula sa tuned Kling formula ng app (`geminiService.ts` ~L2376): buksan sa
camera physics prose, walang handheld, may negative tail.

## 4. Galaw sa talking beats — static sa Veo, punch-in sa edit

MOTION DOCTRINE (SKILL.md, 2026-07-27). Pinanatili ng GB-001 v3 ang push-in ni
Veo, at **sinukat ito noong 2026-08-03: ~7% na lang matapos ang speech-cut —
nasa ilalim ng makikita.** Kaya halos walang galaw ang mga talking beat nya.

Dito: **naka-lock ang camera sa generation**, at ang punch-in ay ginagawa sa
`build-cut.sh` sa emphasis, kung saan tayo ang may hawak ng lakas. Wala nang
pulse conflict dahil static na ang pinagmulan.

## 5. Tunog — at dito ang totoong sorpresa

Ang GB-001 v3 ay may music 0.20 at flash+whoosh. Panatilihin lahat yun:

- Music bed **0.20**, hindi 0.10. Sa 0.10 ay wala kang naririnig.
- **Flash 0.07s + whoosh** sa beat 4, 7 at 9. **Tatlo ang max** (aral 7).
- Audio event sa **bawat** beat transition (COHERENCE QA #7) — hindi lang sa
  may flash. Walang tahimik na palit.
- Walang SFX na tumatakip sa unang salita ng linya (COHERENCE QA #8).
- `loudnorm` −14 LUFS sa dulo.

### 🔴 Ang bagong bagay: KATAHIMIKAN bilang instrumento

**Bumababa ang musika papuntang ZERO ng ~0.5s bago ang `UUWI KAMI.`, tapos
babalik sa CTA.**

Wala pang ad natin ang gumamit ng katahimikan. Sa feed na puro ingay, ang biglang
pagkawala ng tunog ay **pisikal** na humihila ng atensyon pabalik — iyon ang
sandaling nagbabago ang postura ng nanonood. At doon eksaktong nakaupo ang
pinakamalakas nating linya, yung septic company na nagsasabing uuwi kami nang
walang bayad.

Libre sya. Isang linya lang sa `build-cut.sh`.

---

## Verifier bago kita abalahin

1. `ad_preflight.mjs --build ... --video ...`
2. `render_audit.mjs` — **sya lang ang nakikinig**
3. Dead-air scan, caption-sync, cropdetect, text integrity sa **full resolution**
   (hindi frame-strip — masyadong maliit para hatulan ang typography, aral 12)
4. **Bawat text beat isi-scale sa 375px at babasahin ko mismo** (aral 17)
5. Frame-strip ng BAWAT clip para sa face-occlusion at ngiti

**Hindi ko naririnig ang audio.** Puro mata ang QA ko. Ang boses, ang bigkas, at
kung natural ba ang mga putol ay tainga mo.
