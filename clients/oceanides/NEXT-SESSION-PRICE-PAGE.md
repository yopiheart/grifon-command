# NEXT SESSION — Oceanides price page + Kuya Gabriel

**Isinulat 2026-07-30 (gabi).** Lahat ng kailangan mo ay nandito. Hindi mo na
kailangang basahin ulit ang buong usapan.

> **I-paste ito sa simula ng susunod na session:**
>
> ```
> Ituloy natin ang Oceanides. Basahin mo muna:
>   clients/oceanides/NEXT-SESSION-PRICE-PAGE.md
>   clients/oceanides/DESIGN.md
>   clients/oceanides/kuya-gabriel/IDENTITY.md
>
> Nasa branch feat/oceanides-price-page ang lahat, 20+ commit. Hindi pa naka-merge.
> ```

---

## 🔴 Unahin: apat na bagay na naghihintay sa akin

**Wala sa apat na to ang kayang tapusin ng agent. Ako lang.**

1. **DENR badge = Region 7 Central Visayas.** Cebu yun, nasa Metro Manila tayo.
   Naka-flag na dati sa `content-calendar.md` L70 at hindi naaksyunan.
   **Tatlong pagpipilian:** tanggalin, palitan ng tamang NCR, o gawing teksto na
   may totoong numero (SEC Reg. No. + BIR TIN + DENR-accredited na tapunan).
   Ang tiyak na numero ay mas malakas kaysa hiram na seal.
   🔴 **Hindi pwedeng mag-live ang page hangga't hindi to naaayos.**
2. **Consent ni Gabriel.** Pirmadong likeness agreement bago lumabas ang mukha
   nya kahit saan. Template: `kuya-marvin/consent-agreement-FINAL-2026-07-20.md`.
   Legal ito, hindi teknikal.
3. **Ilang metro ng hose ang KASAMA** bago mag-₱100 kada 3 metro. Binigay ni
   Boss Jay ang rate pero hindi ang simula. Nakasulat ngayon na "kasama na ang
   standard na hose ng truck" — totoo, at walang inimbentong numero.
4. **Hatol ni Gabriel** sa `profile-v2` at `website-v4`. Tatlong beses na syang
   nauna sa QA ng agent, kaya sya pa rin ang huling mata.

**Kay Boss Jay pa rin, hindi humaharang:** ano pang ibang dagdag (gabi, weekend,
hagdan, makipot na daanan)? At saan-saan sa labas ng NCR?

---

## Ano ang ginawa ngayong gabi

### Ang page — `funnels/oceanides-price-page/`

**Bakit sya umiiral:** 2 araw na live ads, **₱1,284 gastos, 100 message,
₱12.84 kada message, at ISANG order.** Ang leak ay hindi lead gen, ang close.
Palaging pareho ang namamatayan: *magkano?* → *"depende sa location, 4k to
4500"* → tahimik. May public comment pa sa ad: *"From 4500 ... umabot sa 5500."*
Ang sagot sa telepono ay kinukumpirma ang takot, hindi inaalis.

**Kaya sinasagot ng page ang "magkano" nang buo at nakasulat, kasama ang mga
dagdag na itinatago ng iba.**

Laman: ₱5,000 kada truckload · ₱100 kada 3 metrong hose · ₱500-1k na bakbak ·
₱5,000 ulit ang pangalawang truckload · 30-day warranty sa BARA lang · before at
after na litrato · guarantee na *"kung tumaas ang presyo pagdating, kami ang
sasagot sa dagdag."*

Tatlong lane, isang page: **alam nila nasaan ang tank** → direct booking ·
**hindi alam** → libreng checklist · **tenant** → script para sa landlord.

### Si Gabriel — `clients/oceanides/kuya-gabriel/`

Bagong field inspector, kapalit ni Kuya Marvin. 6 reference photo, buong
identity payload sa [`IDENTITY.md`](kuya-gabriel/IDENTITY.md).

| Larawan | Kalagayan |
|---|---|
| `gabriel-cover-v3.png` | ✅ **APPROVED** |
| `gabriel-website-v4.png` | Hinihintay si Gabriel |
| `gabriel-profile-v2.png` | Hinihintay si Gabriel |
| `gabriel-pointing-v1.png` | 🟡 Nakangiti pa. Papalitan ba? |

---

## ⚙️ Dalawang gate na huwag mong bubuksan

Ito ang pinakamahalagang bagay na naiwan ngayong gabi, kaya wag mong burahin.

**Neil, 2026-07-30:** *"lagi nalang sumasablay, nakakalimot parang may amnesia
kayo. Bat ganun need nalang lagi icall out."*

Tama sya, at **structural** ang sanhi. Tumutunog ang hook kapag si Neil ang
nag-Tagalog, kaya tama ang chat replies. Pero **walang nagche-check sa copy na
nakatago sa loob ng file.** Ganun din sa alignment: walang mali kapag isang
component lang ang binasa mo, lumalabas lang kapag buong page na.

| Gate | Binabantayan |
|---|---|
| `scripts/lint-voice.mjs` | Copy laban sa [`taglish-voice.md`](../../.claude/skills/_shared/taglish-voice.md). Nahuli agad ang 4 na hindi napansin, kasama ang buong ERROR COPY ng form na naiwang English. |
| `scripts/lint-layout.mjs` | Bawat section laban sa isang kaliwang rail. Nahuli ang heading na lumihis ng 22px dahil sa padded na box. |

Naka-wire pareho sa `prebuild`, kaya **bumabagsak ang build** kapag may lumihis.

🔴 **Kapag pumalya ang lint, huwag mo itong ayusin sa pagdagdag sa exception
list. Ang section ang ayusin.** Yun ang pinakamadaling paraan para masira ulit
ito.

---

## Mga aral na huwag nang uulitin

Nasa [`IDENTITY.md`](kuya-gabriel/IDENTITY.md) ang buong kwento ng tatlo.
Maikling bersyon:

1. **"Ang laki ng ulo ko."** Nakahalukipkip sya, kaya pumipiga ang katawan
   papasok at lumalaki ang ulo. Buong katawan pa sa 3 metro, na siyang
   mid-distance zone kung saan namamatay ang mga plate. **Ang lunas ay sukat na
   masusukat** (ulo = 1/3 ng lapad ng balikat), mas malapit na camera, at bukas
   na katawan.
2. **"Parang kinabit lang."** Ipinasa ang litrato ng truck bilang 3rd `--edit`
   ref, at tinuruan nito ang model na **mag-composite** imbes na gumawa ng isang
   eksena. Ilarawan na lang ang truck sa salita.
3. **"Nag-standout masyado yung kulay ng balat ko."** Nasa lilim sya habang
   maaraw ang paligid. Ang *"warm tan skin tone"* ay naglalarawan ng **pigment**
   nya, hindi ng ilaw. **Isang maulap na araw, isang ilaw para sa lahat.**

**Si Gabriel ang nakakita ng tatlo, hindi ang agent.** Hindi lang sya subject.
Ipakita sa kanya bawat batch bago sabihing tapos.

---

## Naiwan kay Kuya Marvin

- **Manatiling PAUSED ang ad.** Retirado ang persona at nagbago ang offer.
- ⚠️ **May utang sa 100 taong nag-message.** Nangako ang ad ng *"Libre ang
  tingin namin sa tangke nyo."* Sinuman sa kanila ang tumawag ay dapat bigyan ng
  libre, hindi ₱499. Legacy cost, hindi bug.
- **Bagong Page para kay Gabriel.** Tama sa policy, walang hinihinging followers
  si Meta. Pero **kailangan pa rin ng 3-5 post bago i-ON ang unang ad** — ang
  unang gagawin ng taong hihingan mo ng pera ay i-click ang Page mo.

---

## Kapag naayos na ang apat, deploy na

```bash
cd funnels/oceanides-price-page
npm install
npm run build                       # tumatakbo ang 2 lint bago ang build
npx vercel deploy --prod --yes
```

Tapos ang env vars, **isang command kada isa, kamay ni Neil** (nasira ang key
noong rep #1 sa maling paste):

```bash
npx vercel env add SUPABASE_URL production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel deploy --prod --yes      # walang epekto ang env hangga't walang bagong deploy
```

Live test: totoong POST sa prod `/api/lead` → `{ok:true}` → tingnan ang row sa
Supabase (`client_id='oceanides'`) → **burahin ang test row**.
I-share ang alias na `oceanides-price-page.vercel.app`, **hindi** ang
deployment URL na may `-<hash>-` (nasa likod yun ng Vercel SSO).
Itala sa `workflows/funnel_deploys.md` — wala sa git ang Vercel settings.

---

## Re-arm pagkatapos ng reboot

```powershell
.\scripts\restore-git-identity.ps1
.\scripts\restore-codex.ps1
```

⚠️ **Naka-block ang `.ps1` sa PC na to.** Kung sumabog ang `codex login`,
gamitin ang **`codex.cmd login`** — nilalaktawan nito ang wrapper. O ayusin nang
minsanan: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Mga link

- **Review artifact** (phone-readable, may swipe-able na page preview):
  `https://claude.ai/code/artifact/99a49f2a-96a1-499a-a681-c257e47f38df`
  Twin: [`artifacts/gabriel-review.html`](../../artifacts/gabriel-review.html) ·
  Build: `node tools/artifacts/build-gabriel-review.mjs`
- **Gmail draft:** *"Kuya Gabriel v1 + ang price page (30 Hulyo)"*
- **Offer doc (Gate 1):** [`workflows/oceanides_offer_price_page.md`](../../workflows/oceanides_offer_price_page.md)
- **Presyo, source of truth:** [`workflows/oceanides_business_model.md`](../../workflows/oceanides_business_model.md)
