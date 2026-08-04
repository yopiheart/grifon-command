# Kuya Marvin — Value Week 01 (Fibo Lim model, walang benta)

**Ginawa 2026-08-04.** Unang linggo ng value-driven organic habang tumatakbo ang
`OCEANIDES-PRICE-01`. Layunin: RECALL + tiwala sa page-check moment + libreng
retargeting pool. **Walang offer, walang presyo, walang hard CTA sa kahit isang
post.** Ang benta, sa ads.

**Voice:** `.claude/skills/_shared/taglish-voice.md` — 50/50, kalmadong eksperto,
kayo/nyo register (ganyan ang page mula pa sa launch posts). Walang apostrophe sa
contractions, walang em dash, walang emoji, walang hashtag, walang number sa
caption, walang "Malabanan", walang imbentong stat.

---

## Ang pattern na kinopyahan (decoded 2026-08-04, hindi pa sa swipe file)

Source: 7 organic image posts ni **Fibo Lim** (Jul 11 to 14, 2026), kasama sina
Hormozi at Brunson bilang corroboration ng strategy level (≥3 source: value lang
sa organic, benta sa ads). URLs at buong capture nasa session transcript
2026-08-04; screenshots hindi kinopya sa repo (hindi atin ang mga litrato).

**Template DNA nya (7/7 posts, walang mintis):**
1. Image = **hook card**, hindi mensahe: litrato nya na nagsasalita (authority) +
   puting tweet-style card (profile pic + verified name + bold contrarian na
   tanong) + maliit na tag na "Read the caption"
2. Caption = ang totoong content: contrarian hook → para kanino → kwento o
   analogy → reframe → simpleng framework. Zero offer, zero link.
3. Cadence 2x/araw, fixed na oras (8AM / 6PM-8PM)
4. Ebidensya: pinakamalakas ang pinaka-kontrobersyal na hook (197 reactions, 102
   Haha, 26 comments, 51 shares); pinakamahina ang pinaka-abstract na analogy
   (19). **Ang debate at ang saveable checklist ang gasolina.**

**Ang adaptation kay Marvin:** ang authority ni Fibo ay stage; ang authority ni
Marvin ay ang trabaho mismo (uniform, puting van, manhole, totoong tank). Dalawang
lane: **Lane A** = hook card + value caption (Fibo mismo), **Lane B** = proof
photo kung saan ang image na mismo ang value (dito tayo may lamang sa kanya).

---

## Hook card template (Lane A) — client world, hindi NOIR

- 4:5 portrait. Background: litrato ni Marvin sa trabaho (tingnan ang per-post
  brief). ⛔ Walang asul na vacuum tanker kahit kailan; puting van lang.
- Puting rounded card sa kaliwa o gitna: profile pic ni Marvin + **"Kuya Marvin
  ng Oceanides"** + bold navy na hook (max 12 salita) + amber accent border
  (navy `#1B2A4A`-ish + amber, sundan ang `clients/oceanides/DESIGN.md`).
- Sa baba ng card, itim na pill: **"Basahin ang caption"**
- Build: HTML template + screenshot render, kapareho ng `templates/*.html` +
  `build.mjs` pattern sa `clients/oceanides/`. Hindi kailangan ng Gemini.
- Background stills na pwede na ngayon: `profile-assets/post2-inspection-4x5.png`,
  `ads/km-003/plates/s2a-hands-timba-toilet.png`, km-004 `plates-9x16/s1..s4.png`.
  Follow-up (susunod na session): 2-3 bagong Marvin still via `marvin-avatar`
  (kasama ang puting van) para hindi paulit-ulit ang background.
- 🔴 **Anti-template rule (Neil, 2026-08-04):** bawat still, IBA ang camera angle
  (waist-up, malayo na may van, low angle sa manhole, three-quarter habang may
  ginagawa) at IBA ang suot (work polo, plain shirt na may tuwalya sa balikat,
  jacket sa dusk shot). Haluin ang register kada gen: daylight master, dusk,
  polished; wag sabay-sabay na iisang look. Ang layunin, mukhang magkakaibang
  araw ng totoong trabaho, hindi isang photoshoot na pinagpira-piraso.

## Posting schedule

Isa kada araw, **6:00 PM** fixed (gabi ang scroll ng may-bahay; dyan din pumutok
ang best post ni Fibo). Order na sadya ang pagsalit ng Lane A at B para hindi
mukhang iisang klase ang grid.

| Araw | Post | Lane | Awareness |
| --- | --- | --- | --- |
| 1 | Amoy tuwing umuulan | A | Problem |
| 2 | Before/after: ubos talaga | B | Solution |
| 3 | Apat na senyales (checklist) | A | Unaware→Problem |
| 4 | Chemical na sumisira | A | Problem |
| 5 | Saan dinadala ang laman | B | Solution |
| 6 | Tatlong senyales ng di tapat na crew | A | Solution |
| 7 | Bakit iba-iba ang presyo | B | Product |

---

## POST 1 — Amoy tuwing umuulan (Lane A)
**Hook sa card:** "Bakit tuwing umuulan, may amoy sa banyo nyo?"
**Background:** km-004 plate (banyo/bahay frame) o `s2a-hands-timba-toilet`
**Lever:** timely (habagat ngayon) + mechanism reframe, Suby "name the pain"

```
Bakit tuwing umuulan, may amoy sa banyo nyo?

Madalas to ngayong tag-ulan. Walang amoy buong linggo, tapos isang malakas
na ulan lang, andyan na ulit.

Ganito kasi yun. Kapag malapit nang mapuno yung septic tank, konti na lang
ang natitirang space sa loob. Pag umulan, pumapasok ang tubig sa lupa sa
paligid ng tank, at yung konting space na yun, nawawala. Kaya yung hangin
at amoy, tumataas papunta sa drain nyo.

Yung amoy na pabalik-balik tuwing may bagyo, hindi yan sa inidoro. Senyales
yan na puno na o malapit nang mapuno yung tank.

Kapag ganyan na, hindi na yan aayusin ng air freshener. Yung laman ng tank
ang kailangang bawasan.

May ganyan ba kayo tuwing umuulan? Comment lang, sasagutin ko.
```

---

## POST 2 — Before/after: pakita ang trabaho (Lane B)
**Image:** totoong ba-1 before/after, magkatabi (`assets/before-1.jpg` +
`assets/after-1.jpg`), rendered: `cards/post2-beforeafter.png`
**Lever:** proof-of-work + transparency. Authority + Reciprocity.
⚠️ **Evidence-bound fix (2026-08-04):** ang ba-1 ay DECLOG job (grasa/basura →
dumadaloy na), hindi "ubos na tank" — kaya ang caption ay tungkol sa "pakita
ang trabaho", hindi half-siphon. Ang half-siphon education ay naka-park
hanggang may totoong litrato ng ubos-na-tank na trabaho.

```
Ganito ang itsura ng tapos na trabaho.

Yung kaliwa, bago kami magsimula. Puno ng grasa at basura na nagbabara,
kaya bumabalik ang tubig sa lababo at sa banyo.

Yung kanan, pagkatapos. Malinis na, at dumadaloy na ulit.

Bakit ko to pinapakita? Kasi may mga crew na basta na lang aalis pagkatapos
ng trabaho, hindi man lang ipapakita kung ano ang ginawa. Sa amin, bago
kami umalis, pinapakita namin ang loob. Para kita nyo mismo kung ano ang
binayaran nyo.

Kaya kapag nagpalinis kayo, kahit hindi sa amin, hilingin nyo to: pakita
nyo ang bago at ang pagkatapos. Yung tapat na trabaho, hindi natatakot
magpakita.
```

---

## POST 3 — Apat na senyales, checklist (Lane A)
**Hook sa card:** "Apat na senyales na malapit nang mapuno ang septic tank nyo"
**Background:** `post2-inspection-4x5.png` (Marvin nakatayo sa manhole)
**Lever:** saveable checklist (share/save bait, MrBeast "deliver the promise")

```
Apat na senyales na malapit nang mapuno ang septic tank nyo. I-save nyo to.

Una. Mabagal ang flush, hindi lang sa isang inidoro kundi sa lahat. Kapag
isa lang, baka barado lang yun. Kapag lahat, tank na yun.

Pangalawa. May amoy sa banyo o sa labas malapit sa tank, lalo na tuwing
umuulan o madaling araw.

Pangatlo. May tunog na parang bula sa lababo kapag nag-flush kayo sa
kabilang banyo. Naghahanap ng daan ang hangin kasi wala nang space sa baba.

Pang-apat. Yung lupa sa ibabaw ng tank, basa o mas berde ang damo kumpara
sa paligid.

Kapag dalawa o higit pa dyan ang nakikita nyo, wag nang hintaying umapaw.
Mas madali ang magpa-siphon habang maaga kaysa maglinis ng umapaw na.
```

---

## POST 4 — Chemical na sumisira (Lane A)
**Hook sa card:** "Yung binubuhos nyo sa inidoro, baka sya pa ang sumisira"
**Background:** km-004 plate o hands plate
**Lever:** contrarian myth-bust (pinakamalakas na hook type sa Fibo data)

```
Yung chemical na binubuhos nyo para maging okay ang septic tank, baka sya
pa ang sumisira.

Alam ko, ang dami nyan sa hardware. May pampatunaw daw, may pampatanggal
ng amoy.

Ganito kasi gumagana ang septic tank. May bacteria sa loob nyan na sya
mismong tumutunaw ng dumi. Sila ang libreng trabahador nyo, araw-gabi,
walang bayad.

Kapag nagbuhos kayo ng matapang na chemical, tulad ng muriatic, namamatay
sila. Kaya yung tank na dapat tumutunaw ng laman nya, nagiging imbakan na
lang. Mas mabilis mapuno, mas mabilis umamoy.

Kaya bago kayo bumili ng pampatunaw, alamin nyo muna kung ano talaga ang
problema. Kung puno na, walang chemical na makakaayos nyan.
```

---

## POST 5 — Saan dinadala ang laman (Lane B)
**Image:** puting van sa site o `post2-inspection` framing (hindi hook card;
totoong-litrato ang dating)
**Lever:** proseso transparency + identity claim (DENR papers) nang hindi
nagyayabang. Market sophistication play.

```
Saan ba talaga dinadala ang laman ng septic tank nyo?

Kakaunti ang nagtatanong nito, pero importante sya.

Kapag nasipsip na ang laman, hindi yan basta itinatapon kung saan. May mga
treatment facility na accredited ng DENR, at doon yan dapat dinadala para
ma-process nang tama.

Yung ibang nagpapamura, dito nagtitipid. Itinatapon sa ilog, sa creek, o
sa lupang walang may-alam. Mura nga sa inyo, pero sa tubig at lupa ng
lugar nyo rin yun babalik.

Kaya kapag nagpa-siphon kayo, kahit kanino, itanong nyo: saan nyo dadalhin
to? Yung legit na kumpanya, may sagot agad, at may papel na maipapakita.
```

---

## POST 6 — Tatlong senyales ng di tapat na crew (Lane A)
**Hook sa card:** "Tatlong senyales na dapat nyo bantayan bago magpa-siphon"
**Background:** Marvin still (bagong gen kung meron na; kung wala, selfie-gate)
**Lever:** kills ang #1 objection ng kategorya (scam fear). Solution Aware.

```
Tatlong senyales na dapat nyo bantayan bago kayo magpa-siphon.

Una. Iba ang presyo sa message, iba pagdating sa bahay. Yung patong
pagdating. Ang tama, sasabihin ang buong presyo bago magsimula, at yun na
yun.

Pangalawa. Walang resibo at ayaw sabihin kung saan dadalhin ang laman ng
tank. May patakaran ang DENR kung saan yan dapat dalhin. Kapag itinapon
kung saan lang, kayo rin ang mapapahamak.

Pangatlo. Sobrang bilis natapos. Ang tubig sa tank, mabilis sipsipin. Yung
makapal na latak sa ilalim, matagal. Kapag ilang minuto lang lahat tapos
malaki ang tank nyo, malamang tubig lang ang nakuha.

Hindi ko sinasabing lahat ng mura ay ganyan. Ang sinasabi ko lang,
magtanong kayo bago magbayad. Yung tapat na crew, hindi naiinis sa tanong.
```

---

## POST 7 — Bakit iba-iba ang presyo (Lane B)
**Image:** resibo/clipboard close-up sa totoong trabaho (hindi ang ad ticket
creative; organic ang feel) o Marvin may hawak na clipboard
**Lever:** price transparency, kambal ng price page. Product Aware. Commitment.

```
Bakit iba-iba ang presyo ng siphoning? Ipapaliwanag ko.

Tatlong bagay ang totoong nagpapagalaw ng presyo.

Una, ang laki ng tank. Mas malaki, mas maraming lulamanin, mas matagal ang
trabaho.

Pangalawa, ang dami ng laman. May tank na kalahati pa lang, may tank na
siksik hanggang taas. Iba ang oras, iba ang byahe ng truck.

Pangatlo, ang lokasyon. Kapag malayo ang tank sa madadaanan ng truck, mas
mahabang hose ang kailangan, mas matagal ang setup.

Kaya kapag may nagbigay sa inyo ng presyo nang hindi man lang nagtatanong
tungkol sa tank nyo, doon kayo dapat kabahan. Ang tapat na presyo, may
pinagbasehan.

Yun ang dahilan kung bakit tinitingnan muna namin ang tank bago magbigay
ng buong presyo. Para pagsinabi na, hindi na nagbabago.
```

---

## Susunod na hakbang pagkatapos ng approval ni Neil

1. Buuin ang hook card HTML template (navy + amber, client DESIGN.md) at
   i-render ang 4 na Lane A cards
2. Ihanda ang 3 Lane B images (ba-1 pair, van/site still, resibo shot; kung may
   totoong litrato si Neil sa mga trabaho, mas maganda pa)
3. `marvin-avatar` gen ng 2-3 bagong still na may puting van (para sa week 2 at
   pampalit ng selfie backgrounds)
4. Pagkatapos ng 7 araw: basahin ang reach/engagement kada post, itala dito sa
   ilalim, at yung panalo ang magdidikta ng Week 02 (parehong ≥3 gate bago
   gawing pattern)
