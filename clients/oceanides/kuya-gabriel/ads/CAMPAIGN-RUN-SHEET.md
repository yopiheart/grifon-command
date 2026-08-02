# OCEANIDES-PRICE-01 — run sheet (manu-mano sa Ads Manager)

**Isinulat 2026-08-03.** Unang campaign na tumuturo sa website. Kopyahin habang
nakabukas ang Ads Manager.

> 🔴 **Bakit hindi ito ginawa ng agent.** Hinaharang ng
> [`.claude/hooks/ad-spend-gate.sh`](../../../../.claude/hooks/ad-spend-gate.sh)
> ang anumang create na may `daily_budget`, kaya hindi kayang itayo ang campaign
> na to sa API kahit PAUSED. Gate yun, hindi bug: **ikaw ang gumagastos.**

---

## Bago ka magsimula, tatlo

1. **Redeploy ang funnel.** Nasa commit na ang `Lead` fix pero hindi pa live.
   ```powershell
   cd funnels\oceanides-price-page
   npx vercel deploy --prod --yes
   ```
2. **Mag-test submit sa `oceanidesph.com`** (hindi sa `.vercel.app`). Ang tanging
   `Lead` na pumutok noon ay galing sa `.vercel.app`, kaya wala pang patunay sa
   apex. Tingnan sa Events Manager → Test events. Tapos burahin ang test row.
3. **3-5 post sa Page** — tingnan ang [`../organic/PAGE-POSTS-PRE-AD.md`](../organic/PAGE-POSTS-PRE-AD.md).
   Kung matagal na at may laman ang Page, pasado na.

---

## Ang structure

```
Campaign   OCEANIDES-PRICE-01
Ad set     OCEANIDES-PRICE-01-NCR-broad
Ad         OCEANIDES-PRICE-01-addons-ticket
```

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
- Page identity **`291924520660232`**
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

## Ang tanong ng linggo 1

**Hindi ito "magkano ang lead."** Ang sinasagot ng unang linggo ay isa lang:

> **Ilang porsyento ng dumadaan sa page ang nagfo-form?**

Kunin sa Ads Manager: **leads ÷ landing page views.** Yan ang totoong scoreboard.
Kapag 3%+, gumagana ang page at budget na lang ang usapan. Kapag mababa sa 1%,
ang page ang aayusin, hindi ang ads.

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
