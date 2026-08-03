# OCEANIDES-PRICE-01 — run sheet (manu-mano sa Ads Manager)

**Isinulat 2026-08-03.** Unang campaign na tumuturo sa website. Kopyahin habang
nakabukas ang Ads Manager.

> 🔴 **Bakit hindi ito ginawa ng agent.** Hinaharang ng
> [`.claude/hooks/ad-spend-gate.sh`](../../../../.claude/hooks/ad-spend-gate.sh)
> ang anumang create na may `daily_budget`, kaya hindi kayang itayo ang campaign
> na to sa API kahit PAUSED. Gate yun, hindi bug: **ikaw ang gumagastos.**

---

## ✅ Pre-flight — pasado na ang tatlo (2026-08-03)

1. ✅ **Buhay ang funnel sa `oceanidesph.com`.** Kasama ang bagong dalawang-hanay
   na ₱2,500 vs ₱5,000, ang "uuwi kami" na guarantee, at ang dalawang inspector.
2. ✅ **Napatunayan ang `Lead` sa apex.** Hindi sa Test Events — sa Network tab
   mismo: `facebook.com/tr/?id=1050997330667084&ev=Lead` na sinagot ng `200`
   pagdating sa thank-you page.

   🔴 **Wag nang habulin ang Test Events.** Kailangan nyang matatakan ang browser
   session gamit ang cookie ng `facebook.com`, at hinaharangan yun ng
   third-party cookie blocking ng Chrome. **Nakakarating pa rin ang event** —
   blangko lang ang panel. Kapag may duda ulit, ang tamang tingin ay ang
   **Network tab** (filter `facebook`, hanapin ang `ev=Lead` + `200`).
   ⚠️ Sa Overview naman, tiyaking **kasama ang araw na to sa date range** —
   isang oras ang nasayang dito dahil naka-`Jul 6 – Aug 2` sya at Aug 3 na pala.
   May **30 minutong lag** din sya, nakasulat mismo sa screen.
3. ✅ **May laman na ang Page.** Sa `Kuya Marvin ng Oceanides` tatakbo ang tatlong
   ad (tingnan ang kahon sa ibaba), at limang launch post na ang dumaan doon bago
   pa ang KM-003 — [`../../kuya-marvin/organic/PAGE-LAUNCH-POSTS.md`](../../kuya-marvin/organic/PAGE-LAUNCH-POSTS.md).

⚠️ **Isang linis bago mag-on:** burahin ang test row sa `funnel_leads`
(neilmaglaya / Valenzuela / Tenant, 2026-08-03) para malinis ang bilang ng linggo 1.

---

## Ang structure

```
Campaign   OCEANIDES-PRICE-01
Ad set     OCEANIDES-PRICE-01-NCR-broad
Ad 1       OCEANIDES-PRICE-01-addons-ticket      (static, ✅ handa)
Ad 2       OCEANIDES-PRICE-01-warranty-proof     (static, ✅ handa — aprubado ni Neil 2026-08-03)
Ad 3       OCEANIDES-PRICE-01-km004-video        (video, ✅ handa — KM-004-AD-v1.mp4)
```

### 🔴 ISANG PAGE LANG ANG LAHAT: `1184710811397498`

**`Kuya Marvin ng Oceanides`.** Neil, 2026-08-03: *"sa kuya marvin namin irurun
ung ads."* Dalawa ang naka-connect sa portfolio na `771158756811875` (ito at ang
`291924520660232` na Oceanides Malabanan), pero **isa lang ang gagamitin ng
tatlong ad.** Kapag hinati mo sila, nahahati rin ang like, ang comment, at ang
mensahe sa dalawang bunton, at doon mismo sinasagot ang *"magkano ba talaga"* na
pumapatay sa close mo.

⚠️ **Alamin mo to bago mag-on: dalawang inbox pa rin ang babantayan.** Ang
comment at mensahe galing sa ad ay papunta sa inbox ni **Kuya Marvin**. Ang
Messenger button naman sa landing page ay naka-hardcode sa
`m.me/OceanidesMalabanan`, kaya doon sya papunta sa inbox ng **Oceanides**.
Sinadyang hindi na ginalaw ang config — fallback door lang ang Messenger doon,
ang form ang pangunahing daan, at ang isang deploy-at-retest sa gabi ng launch
ay mas malaking panganib kaysa sa nabibili nito. **Pero sabihan si Zam:
dalawang lugar ang titingnan araw-araw.**

🔴 **WAG I-ON HANGGAT WALA ANG TATLO** (Neil, 2026-08-03). Isang creative lang
ang KM-003 at yun ang pinakamalaking structural na sablay nun — kailangan ng
Andromeda ng format diversity: isang video + dalawang MAGKAIBANG static (papel
na ticket ang isa, litratong pruweba ang isa, hindi kambal).

### Campaign
- Objective **Leads** · conversion location **Website**
- **CBO ₱500/araw** · Highest volume, walang bid cap
- Special ad category **WALA** · A/B test toggle **OFF**

### Ad set
- Dataset **`1050997330667084`** ("Oceanides Price Page") · event **`Lead`**
- ⛔ **HINDI ang `1921429268517231`** (Grifon Pixel, sariling SaaS pixel ni Neil)
- Location **Metro Manila (NCR)** bilang region
- 🔴 **"People LIVING in this location"**, hindi ang default na *living in or
  recently in*. Walang septic tank ang turista.
- Age **25-65+** · Gender **all** (77% babae 35-64 ang audience, pero hayaan ang
  algorithm na hanapin sila. Ang manwal na paghihigpit ay nagtatapon ng inventory.)
- **Advantage+ audience**, walang detailed targeting
- **Advantage+ placements**
- Attribution **7-day click, 1-day view**
- Schedule start **12:00 AM** ng susunod na araw, walang end date

### Ad
- Format **Single image**
- Larawan: **`clients/oceanides/out/price-addons-ticket.png`** (1080×1350)
- Page identity **`1184710811397498`** (Kuya Marvin ng Oceanides)
- CTA **Learn more**
- 🔴 **AI label ON**
- 🔴 **Text improvements + Translate text OFF** (muling isinusulat nila ang copy,
  at tuned Taglish ang bawat linya)

**Website URL** (kasama ang UTM, huwag putulin):
```
https://oceanidesph.com/?utm_source=fb&utm_medium=paid&utm_campaign=oceanides-price-01&utm_content=addons-ticket
```
> Kinukuha ng funnel ang `utm_*` at ang `fbclid` at isinusulat sa `funnel_leads`.
> Kapag walang UTM, papasok pa rin ang lead pero hindi mo malalaman kung saan
> galing. Isang linya to, huwag laktawan.

**Primary text:**
```
"From 4500 tapos since maikli yung hose nila, nagdagdag ng 100 per
tubo, so umabot sa 5500 ang binayaran."

Totoong comment yan sa ad namin. At hindi sya bago.

Lahat ng siphoner may ganitong singil. Sobrang hose. Bakbak ng takip.
Pangalawang truckload. Ang pinagkaiba lang, hindi sinasabi bago
magsimula.

Nasa page namin lahat, nakasulat, bago ka pa mag-book. Pati ang buong
presyo.

Basahin mo muna bago ka mag-book.
```

**Headline:** `Nakasulat bago dumating ang truck.`
**Description:** `Buong presyo at bawat dagdag, nasa page.`

---

## Ad 2 — warranty-proof

- Format **Single image**
- Larawan: **`clients/oceanides/out/warranty-proof.png`** (1080×1350; template
  `clients/oceanides/templates/warranty-proof.html`, totoong ba-1 litrato)
- Page identity, AI label, at Advantage+ toggles: pareho sa Ad 1
- CTA **Learn more**

**Website URL:**
```
https://oceanidesph.com/?utm_source=fb&utm_medium=paid&utm_campaign=oceanides-price-01&utm_content=warranty-proof
```

**Primary text:**
```
Kapag bumalik ang bara sa loob ng 30 araw, babalikan namin. Nakasulat
yan sa page, hindi lang salita.

Kinukunan namin ng before at after na litrato ang bawat tangke, at
ibinibigay namin sa may-ari. May BIR official receipt ka rin, kaya may
mahahabol ka kung may problema.

Ang hindi sakop: kapag napuno ulit ang tangke. Depende yun sa dami ng
gumagamit, hindi sa trabaho. Sinasabi na namin ngayon para walang
gulatan.

Basahin mo muna ang page bago ka mag-book.
```

**Headline:** `30 araw na warranty, nakasulat.`
**Description:** `Kasama ang buong presyo sa page.`

---

## Ad 3 — km004-video

- Format **Single video**
- Video: **`clients/oceanides/kuya-marvin/ads/km-004/KM-004-AD-v1.mp4`**
  (720×1280, 29.97s, 9:16)
- Page identity, AI label, at Advantage+ toggles: pareho sa Ad 1
- CTA **Learn more**

🔴 **I-UPLOAD ANG THUMBNAIL, WAG PABAYAAN SI META NA PUMILI.** May sarili syang
auto-pick at madalas kumukuha sa gitna ng video, kung saan nakabuka ang bibig ni
Marvin at walang overlay. Sa ilalim ng video, pindutin ang **Change image** at
i-upload ang **`clients/oceanides/kuya-marvin/ads/km-004/KM-004-thumb-frame0.png`**
— ito ang totoong frame 0, `PUNO NA.` sa navy card sa itaas ng mukha nya,
sinuring nababasa hanggang 180px.

⛔ **Walang gagawing bagong MrBeast na thumbnail.** Don't #1 sa
`clients/oceanides/DESIGN.md` — itinataas ng makintab na ad-plate ang bantay na
ibinababa ng UGC. Aral yun ng KM-003 thumbnail, bayad na natin.

**Website URL:**
```
https://oceanidesph.com/?utm_source=fb&utm_medium=paid&utm_campaign=oceanides-price-01&utm_content=km004-video
```

**Primary text:**
```
Hindi barado. Puno na.

Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan
barado. Puno na ang septic tank. Kaya kahit anong plunger, balik
nang balik ang problema.

Ang tinitingnan namin ay ang tangke, hindi ang toilet. At kapag
hindi pa naman puno, sasabihin namin. Uuwi kami. Hindi ka namin
pipilitin.

₱5,000 kada truckload, may resibo at 30-day warranty, at nakasulat
sa page bago ka pa mag-book pati ang bawat dagdag.

Basahin mo muna bago ka mag-book.
```

**Headline:** `Uuwi kami kung hindi pa puno.`
**Description:** `₱5,000 kada truckload, nakasulat.`

> Sinadyang ang "uuwi kami" ang headline dito at wala sa dalawang static. Ito
> ang tanging linyang hindi kayang kopyahin ng kalaban — kada truckload ang
> kita ng siphoner, kaya walang ibang magsasabi sayo na hindi mo pa sila
> kailangan. Tatlong magkaibang headline sa tatlong ad = tatlong magkaibang
> pasok, hindi tatlong bersyon ng iisa.

---

## ▶ Launch checklist — sundan sa Ads Manager

Manu-mano lahat. Hinaharang ng [`ad-spend-gate.sh`](../../../../.claude/hooks/ad-spend-gate.sh)
ang agent sa anumang may budget, kaya **ikaw ang pipindot ng bawat isa.**

- [ ] Burahin ang test row sa `funnel_leads` (neilmaglaya, 2026-08-03)
- [ ] Campaign: **Leads** · conversion location **Website** · **CBO ₱500/araw**
- [ ] Special ad category **WALA** · A/B test toggle **OFF**
- [ ] Ad set: dataset **`1050997330667084`** · event **`Lead`**
- [ ] ⛔ Tiyaking **HINDI** ang `1921429268517231` (Grifon Pixel)
- [ ] Location **Metro Manila (NCR)** · 🔴 **"People LIVING in this location"**
- [ ] Age 25-65+ · gender all · **Advantage+ audience** · **Advantage+ placements**
- [ ] Attribution **7-day click, 1-day view** · start **12:00 AM** bukas, walang end date
- [ ] Ad 1 addons-ticket — larawan, copy, UTM, Page `1184710811397498`
- [ ] Ad 2 warranty-proof — larawan, copy, UTM, parehong Page
- [ ] Ad 3 km004-video — video, **naka-upload na thumbnail**, copy, UTM, parehong Page
- [ ] 🔴 **AI label ON** sa tatlo
- [ ] 🔴 **Text improvements + Translate text OFF** sa tatlo
- [ ] Isang ad set lang. Isang variable ang linggo 1.
- [ ] Publish, tapos i-check bukas ng umaga kung may **Active** na tatlo (hindi
      `In review` na natigil o `Rejected`)

---

## Ang tanong ng linggo 1

**Hindi ito "magkano ang lead."** Ang sinasagot ng unang linggo ay isa lang:

> **Ilang porsyento ng dumadaan sa page ang nagfo-form?**

Kunin sa Ads Manager: **leads ÷ landing page views.** Yan ang totoong scoreboard.
Kapag 3%+, gumagana ang page at budget na lang ang usapan. Kapag mababa sa 1%,
ang page ang aayusin, hindi ang ads.

### 🔴 Pero magbilang ka rin ng BOOKED JOB, mula araw uno

Nakasulat sa lead ang kill gates sa ibaba. Nasa **booked job** ang break-even mo.
Magkaibang bagay yun, at yan mismo ang bitag na naitala na natin bilang **A3** sa
`ad_performance_ledger.md`:

> KM-003: **₱12.85 kada usapan**, tatlong beses na mas mura sa target band.
> **Pasado sa bawat linya ng kill gate.** Isang order.

Ang matigas na numero (§Unit Economics ng ledger): **₱900 net margin kada load**,
kaya **₱900 ang break-even kada booked job**. Sa ₱3,500 kada linggo, kailangan mo
ng **apat na booked job** para patas lang. Kung 30% ang close mo, ang 7 lead ay
dalawang trabaho — mukhang maganda ang cost per lead at lugi ka pa rin.

**Kaya isang hanay lang ang kailangan, kahit sa papel:** ilang lead ang naging
booked job. Kung hindi mo yan bibilangin, uulitin natin ang eksaktong pagkakamali
na kaka-log lang natin.

⚠️ **Asahan ang mabagal na learning.** Kailangan ng ~50 event kada linggo para
lumabas sa learning phase. Sa ₱500/araw, malamang **7-21 lead kada linggo** ang
lalabas. Hindi to depekto, sinadya: kalibrasyon ang linggo 1, hindi scale.

## Kill gates

| Nagastos | Kung ganito | Gawin |
| --- | --- | --- |
| ₱1,500 | **Zero lead** | 🛑 Hinto. Page ang problema o mali ang click, hindi ang creative. |
| ₱1,500 | Marami ang click pero kakaunti ang landing page view | ⏸️ Bagal ng page o agad na umaalis. I-check ang load sa 4G. |
| ₱3,500 (7 araw) | Lead na may makatuwirang presyo | ✅ Tuloy. Saka gawin ang video. |

🔴 **Huwag gumalaw ng budget sa unang 3 araw.** Learning phase, ire-reset lang.

## Huwag gawin nang walang bagong data

- **Huwag magdagdag ng pangalawang ad set.** Isang variable ang linggo 1.
- **Huwag palawakin sa labas ng NCR.** Kumpirmadong may sakop, pero hindi pa alam
  kung alin, at bawal manghula ng geo. Hiwalay na ad set kapag alam na.
- **Huwag i-ON ang Advanced Matching o CAPI.** Sinadya silang naka-off: hashed
  PII papuntang Meta, hindi sakop ng consent checkbox natin at hindi rin ng
  Privacy Policy. Tingnan ang comment sa `funnel.config.ts` sa itaas ng `tracking`.
- ⚠️ **Bagong ad account to at may 2 disabled + 5 unsettled na account si Neil.**
  Sa antas ng tao tumitingin ang Meta, hindi per-account. Kapag may flag, huwag
  makipagtalo, i-pause agad at ayusin.

## Kapag may unang data na

I-log sa [`workflows/ad_performance_ledger.md`](../../../../workflows/ad_performance_ledger.md).
Nandoon na ang KM-003 bilang unang entry at apat na pattern (A1-A4, lahat 1/3).
**Ang A3 ang bantayan:** ang murang cost-per-result ay false positive kapag masama
ang close. Dito, ang katumbas na bitag ay **murang lead na walang nagiging booking.**
