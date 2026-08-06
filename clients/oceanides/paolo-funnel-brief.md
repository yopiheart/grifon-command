# Paolo Funnel — Build Brief

**Ginawa: 2026-08-05** (session 7, matapos ang buong grill)
**Estado: ITAYO NA, WAG PA BUKSAN** — napagkasunduan ang gate (2026-08-06) pero
sarado lang sya sa unang bayad na load na may certificate. Kulang pa ang copy
at checkout.

Ito ang buong spec ng bagong funnel para kay **"Compliance-Pressured Paolo"** (B2B).
Kinuha mula sa grill noong 2026-08-05. **Basahin ang buong post-mortem at ang mga
numero sa [`workflows/ad_performance_ledger.md`](../../workflows/ad_performance_ledger.md)
§OCEANIDES-PRICE-01 bago simulan** — dito nakasulat ang gagawin, doon ang bakit.

---

## 🟡 NAPAGKASUNDUAN ANG GATE — 2026-08-06, kausap na si Boss Jay

Kumpirmado nya kay Neil: **dumadaan sa facility ang bawat load, babayaran ang
nararapat** (sinabihan sya nang diretso ni Neil na hindi papayag na dodoctorin
o gagamitin sa maling paraan ang certificate), **100% sang-ayon sa mekanismong**
₱6,000/load diretso sa facility bago ang ibang payout, at **normal na 15 araw**
ang promised delivery date ng certificate — hindi artificial na lead time.

🔴 **PERO HINDI PA SYA SARADO. Pangako pa lang ito, wala pang load na dumaan.**
Sarado sya sa araw na may isang load na diretsong binayaran ni Neil sa facility
**at** may certificate galing doon na hawak na natin. Bago iyon: itayo ang
lahat, **wag lang buksan.**

➡️ **Unang hakbang: [`facility-call-script.md`](facility-call-script.md)** — apat
na tanong sa supervisor (saan kinukuha ang waste, magkano talaga, kailan ang
bayad, kanino nakapangalan ang certificate). Ito ang humaharang sa lahat: 15
araw ang orasan at hindi sya umaandar hangga't walang tawag. Ang proof load ay
**hindi kailangang galing sa funnel** — ang susunod na DENR job na dadaan kay
Boss Jay ay pwede na.

✅ **Sariling sistema ni Neil, hindi na dependent kay Boss Jay — pareho** (logistics
AT financial), phased:

1. **Hauler:** naghahanap ng sariling partner online, mga contact ni Boss Jay
   muna ang gamit sa ngayon. Si Neil at ang team ang magbabantay ng byahe.
2. **Dispatch:** dadaan pa kay Boss Jay sa umpisa, iipunin ni Neil ang lahat ng
   contact (inspector, hauler, facility) once matatag na. Alam at okay na si
   Boss Jay — *"ako ang bahala, since Oceanides parin naman ito."*
3. **Pera:** diretsong makikipag-transact si Neil sa supervisor ng facility
   (contact na ibibigay ni Boss Jay). Walang middleman — sya mismo ang
   maglalabas ng ₱6,000/load bago ang ibang payout.

## ✅ Sarado na ang dalawang blocker (2026-08-05)

1. **PayMongo ng Oceanides**, may access si Neil. ⏳ Ibibigay nya ang keys.
   ⛔ **HINDI ang `VITE_PAYMONGO_PUBLIC_KEY` sa root `.env`** — kay Grifon yun, at
   kapag nagamit, **ang kita ng Oceanides ay dadapo sa account ng Grifon.**
2. **Oceanides ang maglalabas ng OR**, hiwalay sa resibo ng online checkout. Tamang
   setup: ang PayMongo ay katunayan ng bayad, **hindi BIR OR.**
   ⚠️ **Ang OR ay hindi awtomatiko** — may taong gagawa nun kada ₱999, at yun mismo
   ang manual na trabahong inalis natin sa pagsingil. **Ipadala sya kasama ng field
   inspector at ibigay kasabay ng report.** Isang hakbang, hindi dalawa, at may
   dala nang papel ang tao pagdating. Tignan ang serye kung nakapangalan sa
   Oceanides — dapat pareho ng entity na tinatanggapan ng PayMongo.

✅ Kumpirmado ni Boss Jay: **buhay pa ang ₱1,600 na payout** (inspector ₱500 +
transport ₱600 + Zam ₱250 + Neil ₱250) sa DENR na trabaho — sistema pa rin nila.

---

## 1 · Ang alok

| | |
| --- | --- |
| **Tripwire** | **₱999** — septic health check + report |
| **Core** | **₱12,000-15,000 kada dokumentadong load** (DENR manifest + certificate) |
| **Bayad** | Online checkout, PayMongo (GCash + bank transfer + card) |
| **Kailan** | Bayad bago ang bisita. Hindi cash pagdating, hindi pangungulit ni Zam. |

**Bakit ₱999 at hindi ₱499:** sa umpisa, 1-2 stop lang kada araw ang booking kaya
~₱600-1,100 ang gastos kada bisita. **₱999 lang ang buhay dun.** Sa siksik na ruta
(3-4 stop) pareho na silang kumikita. Tingnan ang **A4** sa ledger.

🔴 **Bawal ang CASH refund.** Kapag hindi pa puno ang tangke: **credit**, hindi
cash. *"Hindi ka magbabayad ng sipsip. Ang ₱999 mo ay credit sa sipsip pagdating
ng panahon, isang taon ang bisa."* Panalo pa rin sya, nasa yo pa rin ang pera, at
nawawala ang pinakamahinang linya (*"walang refund kung critical pero ayaw magpasipsip"*)
na sya ring pinakamadaling pagmulan ng reklamo at chargeback.

## 2 · Ang page

**Bagong page, hindi ito ang kasalukuyang landing.** Si Helen ang page ngayon
(*"₱5,000. Walang sorpresang dagdag pagdating ng truck."*). Iba ang bibili.

- **Avatar:** `Oceanides market-research.md` §2. **Hindi na kailangan ng bagong
  market research.**
- **Value stack:** nakasulat na sa `offer-optimizer-denr-2026-07-20.md` (RUN B
  tripwire). ⚠️ **RAW at hindi approved yun.** Tatlong bagay dun ang bawal
  dalhin nang buo: ang `₱9,500` core (lumalabag sa ₱12k/load floor), ang
  **imbentong penalty-payment guarantee** (*"babayaran namin ang unang ₱5,000 ng
  multa"* — totoong pera ni Neil, bawal sa copy hangga't walang tanggap nya), at
  ang pagiging libre ng tripwire (napalitan na ng desisyong ₱999).
- **Ang binibili ni Paolo ay ang PAPEL, hindi ang sipsip.** Nakasulat sa research.
  Ang RA 9275 at ang **₱200,000 kada araw** na ceiling ang bleeding neck, hindi
  ang baradong lababo.
- **Ang LLDA ang wedge.** Bago sya, at sya ang madalas hanapin ng malalaking
  kompanya. Hindi sya *"kaya rin namin"* — sya ang dahilan kung bakit tayo ang
  tatawagan at hindi ang suki nila.
- ⚠️ **A2 sa ledger:** sa KM-003, **41% ang nawala eksakto sa "libre ang tingin."**
  Sariling babala natin laban sa diagnostic offer. Ang bayad at tiyak na alok ang
  sagot dun, pero i-check ang retention kapag may video na.

**Bagong required na qualifier sa form:** **kailan ang permit renewal o inspection
nyo.** Labinlimang araw ang certificate mula sa facility, kaya ito ang nag-uuri
kung sino ang tatawagan muna ni Zam — at sya rin ang urgency lever: *"kung
Setyembre ang renewal nyo, ngayong Agosto dapat magsimula."*

🔴 **Ilagay ang form nang MAS MATAAS.** Pang-14 sa 17 section sya sa lumang page.
Tingnan muna ang `FormViewed` data bago magpasya kung gaano kataas.

## 3 · Ang teknikal

**Checkout.** Isang upuan lang, hindi tatlong araw. `api/checkout.ts` sa root ay
**65 linya** at may `createCheckoutSession` na sa `api/_lib/paymongo.ts`.
⚠️ **Bawal mag-import ang funnel mula sa repo root** — standalone Vercel project
sya. Kailangan ng sariling pinaliit na kopya sa `funnels/<slug>/api/`.

**Apat na panuntunan:**

1. 🔴 **I-save ang lead BAGO ang checkout.** Form → row sa `funnel_leads` →
   *tapos* checkout. Kapag nakabitin ang lead sa likod ng bayad, **nawawala ang
   bawat hindi natuloy** at hindi natin sila mabibilang o masusundan.
2. **Subaybayan ang credit.** May hawak kang pera at may utang kang serbisyo kapag
   hindi pala puno. Kailangan ng field sa row at ng tanaw ni Zam sa `/ops`.
3. **`Purchase` pixel event** + bagong AEM config + relearning ng Meta. Hindi sya
   libre — isama sa timeline.
4. **Down payment bago umalis ang truck sa core**, hindi terms. Nasunog na si Neil
   sa cheque at sa kliyenteng nagsara. May leverage tayo: hindi lalabas ang
   certificate hangga't hindi bayad.

## 4 · Ang operasyon (nakasalalay dito ang buong plano)

- **Walang truck ang check.** Sukat ng tangke, ilan ang tangke, at ang status —
  umaapaw, puno, barado, kapal ng burak, likido o purong solid.
- **2 oras kada kliyente** kasama ang byahe → **3-4 kada tao kada araw.**
- **HIGPITAN ANG GEO. Isang siyudad muna, hindi buong 20km radius.** Ang gastos
  kada bisita ay ₱1,100 kapag iisa sa maghapon at ~₱400 kapag apat. **Ginagawa
  ang density, hindi hinihintay.** Ito ang pinakamalaking lever sa buong funnel.
- **Isama ang pamasahe sa dispatch.** Hindi utang, hindi abono. Isang ₱300 na
  problema ang pumapatay sa buong serbisyo.
- **Kunin ang number ng truck driver kada trabaho.** Libre, simulan agad.
- **Kontratahin ang mga malabanan nang direkta.** Ito ang nagpapalit sa Oceanides
  mula phonebook papuntang kompanya, at sya ang pinakamalaking galaw sa plano.

## 5 · AI septic health report (endorsed, may 3 kondisyon)

Video at sukat mula sa field inspector → AI → report na may logo, sa loob ng minuto.
Panalo sya dahil **nagsasara habang nakatayo pa dun ang tao**, at dahil **pantay
ang lahat ng inspector** kasama ang bago pa lang.

1. 🔴 **Hindi ang AI ang magdedesisyon kung puno na.** Sukat ang ilalagay ng tao,
   at ang rekomendasyon ay susunod sa **nakasulat na panuntunan**. Kapag AI ang
   nagsabing critical at mali sya, may naibentang ₱12-15k na trabaho ang isang
   hallucination — at ang nagdesisyon ay pag-aari ng nagbebenta.
2. **Hatiin ang dokumento.** Pahina 1-2 = tuyot na assessment (sukat, litrato,
   RA 9275 gap, pirma) — yan ang ipa-file nya. Pahina 3 = alok. Kapag hinaluan ng
   urgency ang assessment, brochure na sya, at yun mismo ang credibility na
   binabayaran nya.
3. **May offline na daan.** Basement at likod-bahay ay walang signal.

⚠️ **Ubos ang Gemini budget.** Hindi maitatayo agad. Huwag hayaang sya ang
humarang sa unang test — kayang gawin ang unang mga report nang manwal.

---

## Sunod na hakbang

1. 🟡 Napagkasunduan ang **GATE** (Boss Jay, 2026-08-06) — **hindi pa sarado.**
2. ✅ Sarado ang **dalawang blocker** sa itaas.
3. ✅ Kumpirmado ang "sariling sistema" ni Neil — pareho, phased (itaas).
4. **Unang tawag sa supervisor ng facility** — tatlong tanong sa ledger §HARD
   GATE (saan kinukuha ang waste, kailan ang bayad, magkano talaga).
5. ✅ **TAPOS ang copy ng page** (`grifon-cmo` + `grifon-creative-director`,
   2026-08-06): [`paolo-page-copy.md`](paolo-page-copy.md). Buo ang 17 section,
   ang form ay **pang-6 na** (hindi pang-14), at nandun na ang bagong qualifier na
   `renewal_window`. 🔴 May dalawang literal na `⟦PENDING⟧` placeholder sa loob
   (core price + ang pangalan sa certificate) na hindi puwedeng punan hangga't
   walang tawag sa facility.
6. Checkout (`code-executor` o `codex-executor`, may buong brief).
7. Bagong creative at bagong targeting — **`home` ang luma, mali na sya.**
8. 🔴 **Buksan lang kapag may isang bayad na load + hawak na certificate.**
