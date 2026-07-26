# NEXT SESSION — Oceanides / Kuya Marvin launch

**Isinulat 2026-07-27 (gabi).** Buksan mo ito bukas ng umaga. Lahat ng
kailangan mo ay nandito — hindi mo na kailangang basahin ulit ang buong usapan.

---

## Nasaan tayo

**Tapos at aprubado ni Neil:** KM-003, dalawang variant, parehong pasado sa VERIFIER.

| File | Haba | Hook | Laki |
| --- | --- | --- | --- |
| `km-003/KM-003-AD-v2.mp4` | 37.8s | hook1 — cold read | 30.7 MB |
| `km-003/KM-003-AD-hook2-v1.mp4` | 36.8s | hook2 — contrarian claim | 30.0 MB |

Rebuild kahit alin (galing sa repo root, kailangan ng ffmpeg):

```bash
bash clients/oceanides/kuya-marvin/ads/km-003/build-cut.sh              # hook1
HOOK=hook2 bash clients/oceanides/kuya-marvin/ads/km-003/build-cut.sh   # hook2
```

Buong production record + triage findings: [`km-003-script-storyboard.md`](km-003-script-storyboard.md).

---

## 🔴 HUMAHARANG SA LAUNCH — dalawa lang

### 1. Meta System User token

Nakalagay na sa `.env`: `AD_ACCOUNT_ID=585951286230395`.
Kulang pa: `ACCESS_TOKEN` — naka-comment out sa `.env` na may kumpletong tagubilin.

**Huwag ipaste ang token sa chat** — diretso sa `.env`, tanggalin ang `#`.

Hakbang (business.facebook.com/settings, nasa **Zam Grifon – Personal Brand**):
1. **Users → System users → Add** — `Grifon Ads CLI`, role **Admin**
2. **Assign assets** (madalas dito nagkakamali — kung laktawan, gagana ang token
   pero walang makikita): ad account `585951286230395` → *Manage campaigns*;
   Page ng Oceanides / Kuya Marvin → *Full control*
3. **Generate new token** — pumili ng App (gumawa sa developers.facebook.com kung
   wala), i-tick: `ads_management`, `business_management`, `read_insights`,
   `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`.
   **Kopyahin agad — isang beses lang ipinapakita.**
4. Paste sa `.env`, tanggalin ang `#`
5. `pip install meta-ads` → `meta auth status` → `meta ads adaccount list`
   (exit code 3 = auth problem, malamang scope o hindi naka-assign ang asset)

⚠️ **Itago sa password manager.** Buburahin ng defreezer ang `.env` kada reboot;
kailangan mong ipaste ulit. Hindi pwedeng ilagay sa repo ang sikreto.

`META_CAPI_ACCESS_TOKEN` na nasa `.env` ay **hindi ito** — dataset-scoped CAPI
token yan para sa growth loop, hindi mag-o-authenticate sa Ads API.

### 2. Tatlong numero mula kay Neil

Walang kill threshold kung wala ang mga ito, at hindi mag-iimbento ang agent:

1. Average na halaga ng trabaho ng Oceanides (ticket size)
2. Anong % ng Messenger na usapan ang nagiging booking
3. Target CPA kada nabook na trabaho

Mula doon: **break-even ROAS = 1 ÷ net margin.**
Pansamantalang hangganan: **₱3,500 (1 linggo) na walang nabook na trabaho = hinto.**

---

## ✅ Napagdesisyunan na — huwag nang balikan

| Bagay | Desisyon | Bakit |
| --- | --- | --- |
| Ad account | `585951286230395` (Hidden Luxurious Condos) | ACTIVE, may payment method, ₱1,228.74/araw limit. Ang totoong Oceanides account (`481608629454262`, business `534113769107319`) ay **UNSETTLED** — may hindi pa bayad. |
| Ad credit | **WALA** | Ang ₱5,156 ay **billing threshold**, hindi libreng pera — kung kailan sisingilin ang Visa ...5464, hindi kung magkano ang libre. Babayaran ang bawat piso. |
| Pixel | **Huwag gumawa** | Messages campaign ito — `messaging_conversation_started` sa antas ng Page, walang pixel. Ang tanging naka-attach na dataset ay **"Grifon Pixel"** (`1921429268517231`) — sariling SaaS pixel ni Neil. Huwag itong i-tick sa ad set. |
| Objective | **Engagement → Messaging apps**, maximize conversations | Kailangan ng ~50 events/linggo para makalabas sa learning. Sa ₱500/araw: usapan = 44–87/linggo ✅; sales = ~10/linggo ❌. Ang Sales → Messaging ay kailangan din ng CAPI for Business Messaging na wala pa tayo. |
| Structure | 1 CBO campaign, 1 ad set, PH broad + Advantage+ | Playbook para sa <₱1k/araw |
| Budget | ₱500/araw | Min ay ₱61.81, limit ay ₱1,228.74 — pasok |
| Delivery encode | CRF 20 (~7.6 Mbps) | Ini-re-encode ng Meta ang lahat; 40% mas maliit, walang pagkakaiba |
| Preset (KM-004) | `spotlight` | Buto ng IMPACT + VO-timed active-word invert |

**Lipat sa Sales → Messaging** kapag (a) 50+ usapan/linggo na, at (b) may CAPI
nang nagbabalik ng nabook na trabaho. Hindi ngayon.

---

## 🟡 Desisyon ni Neil bukas

1. **I-merge ba ang `feat/km-003-hook2-ab` sa main?** Naroon ang hook2 variant +
   ang CRF 20 na pagbabago — parehong aprubado na. Naiwang unmerged para sa
   tawag mo. *(Ang unmerged branch ang paulit-ulit na dahilan kung bakit
   naiisip ng agent na "hindi pa gawa" ang isang bagay — see CLAUDE.md.)*
2. **Alin ang ilalabas — hook1, hook2, o pareho bilang ad set?**
   Panoorin mo pareho. Machine gates lang ang pumasa; mata mo ang huling hatol.
3. **Creative diversification.** Magkapareho ang hook1 at hook2 mula seg2
   pababa, byte-for-byte. Malinis bilang eksperimento pero **mahina sa
   Andromeda** — cosmetic dupe ang basa niya, mas mataas ang CPM. Humihingi ang
   playbook ng **4–6 na tunay na magkakaibang creative**. Kailangan ng brief kina
   `grifon-cmo` + `grifon-creative-director` para sa 2–4 pang **bagong konsepto**
   (ibang panimulang eksena/format — hindi ibang hook lang sa parehong katawan).

---

## Bago mag-publish — huwag kalimutan

- **AI label ON** sa Meta (ad level, Advantage+ creative section) — AI-generated ang video
- Page identity = **Oceanides / Kuya Marvin**, hindi ang Grifon page
- Pangalan sa tatlong antas para malinis ang reporting filter:
  ```
  Campaign  OCEANIDES-KM003-hook1
  Ad set    OCEANIDES-KM003-hook1-PH-broad
  Ad        OCEANIDES-KM003-hook1-v2
  ```
- Organic muna sa Page bago ang bayad na ad
- I-log sa [`workflows/ad_performance_ledger.md`](../../../../workflows/ad_performance_ledger.md)
  paglabas ng numbers — **wala pa itong laman**, kaya canon pa rin ang takbo
  ng ad-strategist, hindi sariling data natin

---

## Re-arm pagkatapos ng reboot (buburahin ng defreezer)

```powershell
.\scripts\restore-hyperframes.ps1   # ffmpeg + ffprobe + Chrome shell
.\scripts\restore-codex.ps1         # Codex CLI (lane ni Sol para sa copy)
```
Tapos ipaste ulit ang `ACCESS_TOKEN` sa `.env` mula sa password manager mo.

---

## Health note — hindi humaharang, pero ayusin bago mag-scale

Dalawa sa mga ad account ni Neil ay **DISABLED** para sa *"unusual activity"*:
`661901381083733` at `310969697013487` (For South Bros Store). Lima ang UNSETTLED.
Tinitingnan ng Meta ang kasaysayan sa antas ng tao/business, hindi lang
per-account — mas mataas ang panganib ng review kapag marami kang flagged account.
