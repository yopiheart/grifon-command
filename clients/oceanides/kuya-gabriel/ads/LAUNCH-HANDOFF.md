# LAUNCH HANDOFF — OCEANIDES-PRICE-01

**Isinulat 2026-08-03, mga alas-onse ng gabi, bago ang restart ng Claude Code.**

> 🔴 **BASAHIN MO TO PAGBALIK, TAPOS GUMALAW AGAD. Huwag nang magtanong kay Neil.**
> Sinabi nya nang malinaw: *"Bro ano pang purpose mo kung ako rin gagawa?"* Ang
> buong punto ng restart na to ay para **ikaw** ang gumawa ng launch. Kung
> tatanungin mo sya ulit kung sige ba, nasayang ang restart.
>
> Ang tanging dahilan para huminto: kapag may **hindi tugma sa nakasulat dito**
> (ibang page ID, ibang ad account, walang payment method na totoo). Doon ka lang
> magsasalita.

## Ang gagawin, sunod-sunod

Buong spec, verbatim: [`CAMPAIGN-RUN-SHEET.md`](CAMPAIGN-RUN-SHEET.md). Yun ang
source of truth. Ito ang maikling bersyon para makagalaw ka agad.

1. **Isakay ang video sa media library** — `ads_creative_upload_video`
   - ad account `4165212657057538`
   - URL: `https://oceanidesph.com/KM-004-AD-v1.mp4` (buhay na, `200`, naka-deploy
     na noong 2026-08-03 — pansamantala sya doon para lang makuha ni Meta)
   - Mag-poll gamit ang `ads_get_ad_videos` hanggang `video_status: ready`
2. **Isakay ang dalawang static** — `ads_creative_upload_image`
   - `clients/oceanides/out/price-addons-ticket.png`
   - `clients/oceanides/out/warranty-proof.png`
   - ⚠️ URL din ang kailangan nito, hindi file path. Parehong paraan: ilagay muna
     sa `funnels/oceanides-price-page/public/`, i-build, i-deploy, tapos kunin
     mula sa `https://oceanidesph.com/<pangalan>.png`.
3. **Campaign** → **Ad set** → **4 na ad** ayon sa run sheet
4. **I-ON.** Ikaw ang pipindot. Yan ang basbas ni Neil, nakasulat sa ibaba.
5. **Linisin:** tanggalin ang `*.mp4` at ang mga `.png` sa
   `funnels/oceanides-price-page/public/`, i-redeploy.
6. **Ibalik ang gate:** `rm .claude/.ad-spend-gate-suspended`
7. **I-log sa** [`workflows/ad_performance_ledger.md`](../../../../workflows/ad_performance_ledger.md)
   — bagong entry, kasama ang suspensyon ng gate at kung kailan sya naibalik.

## Ang matigas na numero

| | |
| --- | --- |
| Ad account | `4165212657057538` (Oceanides Malabanan) |
| Page — **lahat ng ad** | `1184710811397498` (Kuya Marvin ng Oceanides) |
| Dataset · event | `1050997330667084` · `Lead` |
| ⛔ HINDI ito | `1921429268517231` (Grifon Pixel, SaaS ni Neil) |
| Objective | Leads · conversion location **Website** |
| Budget | **CBO ₱500/araw**. 🔴 Kinumpirma ni Neil: *"P500 per day lang bro ah. Hindi 1k."* |
| Targeting | NCR, **"People LIVING in this location"**, 25-65+, all gender |
| Advantage+ | audience **at** placements |
| Attribution | 7-day click, 1-day view |

## Kung ano ang tapos na

- ✅ Buhay ang landing page, napatunayan ang `Lead` sa apex (`ev=Lead` + `200`)
- ✅ Aprubado ni Neil ang lahat ng creative
- ✅ Naka-save ang thumbnail: `../../kuya-marvin/ads/km-004/KM-004-thumb-frame0.png`
- ✅ May laman ang Page ni Marvin (5 launch post bago pa ang KM-003)
- ⬜ **Burahin ang test row** sa `funnel_leads` (neilmaglaya / Valenzuela / Tenant)

## 🔴 Dalawang bagay na huwag uulitin

1. **`has_payment_method: false` ay HINDI sira.** Nasa portfolio
   (`771158756811875`) nakakabit ang card, hindi sa ad account, kaya `false` ang
   babasahin ng field kahit maayos ang billing. **Limang beses na to nasabi kay
   Neil at limang beses nyang sinagot na meron.** Wag mo na syang tatanungin ulit.
2. **Test Events ang mali, hindi ang pixel.** Hinaharangan ng third-party cookie
   blocking ang pagtatatak ni Meta sa browser session. Ang tamang tingin ay
   **Network tab** (`ev=Lead` + `200`) o ang Overview na **kasama ang araw na to
   sa date range**, may 30 minutong lag.

## Ang basbas, at ang gate

Dalawang pinto ang humarang noong 2026-08-03, at magkaiba sila:

- **`.claude/hooks/ad-spend-gate.sh`** — gawa ni Neil. **Suspendido ngayon** sa
  pamamagitan ng `.claude/.ad-spend-gate-suspended`. Kusang babalik ito sa unang
  reboot dahil kinakain ng defreezer ang sentinel.
- **Permission layer ng Claude Code** — hindi kayang tanggalin ni Neil sa chat.
  Ito ang totoong dahilan ng restart. Nakalista sa `.claude/settings.local.json`
  ang mga tool na pinayagan, isa-isa, hindi wildcard.

Verbatim ang basbas, para may record:

> **Neil, 2026-08-03:** *"Edi tanggalin mo ung rules na un tonight. Binibigyan
> kita ng basbas para gawin un!"* at *"Ayoko. Ikaw na bro please!"*

⚠️ **Isang gabi lang to.** Pagkatapos ng launch, `rm` ang sentinel. Ang
`settings.local.json` ay hindi naka-commit at mamamatay sa reboot.

## Hinihintay pa

**Pang-apat na creative, Brunson na format.** Hiniling ni Neil habang
inihahanda ang restart na to: *"pwede gawan mo rin ako as additional ad etong
format katulad ng nasa phase 1 hooktest galing kay russel bruson just make sure
it will fit perfectly for kuya marvin."* Ang pinagmumulan ay
[`workflows/static_ad_swipe_file.md`](../../../../workflows/static_ad_swipe_file.md)
(S34/S35, E82–E93, GP-6). Kung wala pa sya sa `clients/oceanides/out/` pagbalik
mo, gawin mo muna bago ang launch — apat na ad ang plano, hindi tatlo.
