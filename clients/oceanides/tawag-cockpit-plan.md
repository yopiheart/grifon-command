# Tawag Cockpit — plano ng sales copilot para kay Zam

**Status:** BUILDING — galing sa `/grill-me` session 2026-08-04, aprubado ni Neil ang
bawat desisyon sa baba. **§5 deck APPROVED ni Neil 2026-08-04 ("Okay na to. Approved")
— verbatim na ang copy, wag nang i-rewrite.**
**Saan itatayo:** dagdag sa `/ops` ng [`funnels/oceanides-price-page/`](../../funnels/oceanides-price-page/) —
HINDI bagong page, HINDI bagong deploy.
**Ang malaking litrato:** unang hakbang ng "AI sales copilot para sa newbie agents" na
initiative ni Neil (dating teleprompter-sa-Zoom na idea, hinimay ng grill papuntang
chat + tawag na realidad ng PH SMB sales). Si Zam ang proving ground; ang mga susunod
na hire at ang Grifon high-ticket lane ang scale. Kapatid to ng #26 sa
[`workflows/post_beta_roadmap.md`](../../workflows/post_beta_roadmap.md) (client-artifact
promotion rule): kapag nangailangan ang pangalawang client ng ganito, kandidato na
syang maging produkto.

---

## 1. Mga desisyong sarado na (galing sa grill, huwag nang buksan ulit)

| Tanong | Sagot ni Neil |
|---|---|
| Saan nangyayari ang benta | Outbound na tawag sa leads na nag-fill out ng form sa oceanidesph.com, plus konting chat. HINDI Zoom/Meet. |
| Sino ang unang user | Si Zam (0935 258 9927), susunod si Neil mismo. Hindi hihintayin ang unang hire. |
| Ano ang gamit nya | PC at laptop, bukas habang tumatawag sa cellphone. |
| Paano nya nalalaman na may lead | Live tracker sa `/ops` — pero walang notification; bubuksan nya lang kapag naalala. |
| v0 | Dagdag sa `/ops`: buhay na page + briefing card + objection cards + structured log. WALANG live AI sa v0, deterministic lahat. |
| Laman ng cards | Galing sa alam na: "mahal daw" (kay boss Jay), seen-zone pagkatapos ng presyo, 3 saved replies sa Messenger, market research doc. Si Neil ang nag-a-approve ng BAWAT card bago umabot kay Zam. |
| Sukat ng tagumpay | Dalawang numero mula sa `/ops` data mismo (walang dagdag na trabaho kay Zam): (1) bilis ng unang tawag, target sub-15 min sa gising na oras; (2) booking rate. Unang 20 leads = baseline, susunod na 20 = pagkumpara. Directional, hindi proof. |
| Grifon upsell lane (₱997 buyers, funnel builds) | Phase 2, pagkatapos gumana kay Zam. Parehong tool, palit-laman, English na ang usapan. |
| Recording ng tawag | v1, HINDI v0. Bawal magsimula hangga't walang consent na linya na kumportable si Zam sabihin (RA 4200, all-party consent). |

## 2. v0 scope — apat na parte, lahat maliit

1. **Buhay na `/ops`.** Auto-refresh polling, tunog kapag may bagong lead (may
   toggle — hindi kusang tutunog ang browser nang walang unang pindot, kilalang
   limitasyon), at bilang sa tab title (`(1) Bagong Lead`). Walang email/SMS sa v0;
   kapag lampas sa 15-min target ang bilis-ng-tawag metric, yun ang senyales na
   kailangan na — nakahanda ang eskalasyon, hindi gulat.
2. **Briefing card bawat lead.** Isang tingin BAGO ang tawag: pangalan, lungsod,
   presyo para sa lungsod nya, klase ng property, kung may-ari ba, kung alam nya
   kung nasaan ang tank, saang ad sya galing (utm), at ang bukas na linya. Hindi
   binabasa habang may kausap — kabisado ang bukas pagkatapos ng ilang tawag.
3. **Objection cards.** TATLONG malaking button lang na isang tap ang layo
   (Mahal / Kailan / Legit ba), tig-iisang maikling sagot. Kapag kailangan ni Zam
   mag-scroll habang may kausap, talo ang disenyo. Deck sa §5 — hindi pa aprubado.
4. **Structured log pagkatapos ng tawag.** Nasa `/ops` na ang status pipeline
   (`new → tinawagan → booked → tapos → hindi_natuloy`); dagdag lang: picklist ng
   objection na narinig + petsa ng follow-up. Apat na pindot, hindi essay. **Ang
   log ay pagpapabuti ng cards, hindi pagsukat kay Zam** — usapan ni Neil sa kanya
   sa umpisa, at hindi kailanman gagamitin ang log para pagalitan sya. Ang log na
   to ang binhi ng v1 playbook.

## 3. Build spec (para sa session na magbi-build)

Lahat sa loob ng `funnels/oceanides-price-page/` — sariling Vercel project,
walang import mula sa repo root, ESM `.js` extension sa imports (funnel-forge rules).

- **`src/lib/rates.ts` (BAGO).** Hilahin ang buong rates table palabas ng
  [`src/pages/Presyo.tsx`](../../funnels/oceanides-price-page/src/pages/Presyo.tsx)
  (kasama ang aliases at kalapit-lugar fallback) para parehong ini-import ng
  Presyo page at ng Ops cockpit. **Iisa lang ang lugar na ina-update kapag nagbago
  ang presyo — ito ang depensa laban sa lumang-presyo-sa-cards, hindi paalala kundi
  arkitektura.** Ang note sa itaas ng Presyo.tsx ("DITO muna bago sa kahit anong
  chat o poster") ay lilipat sa bagong file.
- **`src/pages/Ops.tsx`.** (a) polling + tunog + title badge; (b) expandable na
  briefing card kada lead row — ang lungsod ay galing sa `utm.qualifiers.city`,
  ang presyo ay lookup sa `rates.ts`; (c) tatlong objection buttons; (d) log UI
  (objection picklist + follow-up date picker).
- **`api/ops.ts`.** Dagdag sa `Patch` schema: `objection` (sarado ang listahan,
  parehong disiplina ng `STATUSES`) at `follow_up_at` (date, nullable). Parehong
  client_id na sala, parehong cookie auth — walang bagong auth surface.
- **Supabase migration.** Dalawang nullable na column sa `funnel_leads`:
  `objection text`, `follow_up_at timestamptz`. Walang ibang galaw sa schema.
- **`src/data/cards.ts` (BAGO).** Ang aprubadong deck (§5) bilang data. Dadaan sa
  `lint-voice.mjs` (sakop nya ang `src/` — tama yan, customer-facing spoiler ang
  laman kahit internal ang page).
- **Smoke bago i-deploy:** `smoke-tester` sa 390×844 at desktop, i-check ang
  cockpit flow: login → lead list → card open → log → tunog toggle. Deploy runbook
  sa [`workflows/funnel_deploys.md`](../../workflows/funnel_deploys.md).

**Laki:** isa hanggang dalawang session. Mechanical at spec-tight ang kalahati
(rates extraction, api/ops PATCH, migration) — kandidatong Codex/Sol lane; ang UI
ng cockpit ay mas bagay sa `code-executor` o main loop dahil may disenyo.

## 4. Mga metric at kung paano babasahin

- **Bilis ng unang tawag:** `created_at` hanggang unang `tinawagan`. Target:
  sub-15 min sa gising na oras. Sukat to ng notification, hindi ni Zam.
- **Booking rate:** `booked / tinawagan`. Sukat to ng cards + ng offer.
- Unang 20 leads = baseline (kakasimula lang ng campaign, wala tayong dati).
  Susunod na 20 pagkatapos ng cards = pagkumpara. **Directional lang** — nagbabago
  rin ang ads at lead mix sa pagitan, kaya walang drama sa isang percentage point.
- **Kung 8 sa 10 tawag ay namamatay sa presyo kahit tama ang sagot:** hindi yan
  kabiguan ng tool — yan ang ebidensya na dadalhin ni Neil kay boss Jay para
  pag-usapan ang presyo o ang offer. Kasama sa trabaho ng tool ang ituro kung
  nasaan talaga ang problema.

## 5. Unang deck ng cards (✅ APPROVED ni Neil 2026-08-04 — kopyahin VERBATIM sa `cards.ts`)

Boses: kalmadong eksperto, hindi masiglang salesman. Taglish per
[`taglish-voice.md`](../../.claude/skills/_shared/taglish-voice.md). Walang em dash,
walang apostrophe sa contractions. Si Zam ang nagsasalita, kausap ang lead sa phone.

**BUKAS NA LINYA (outbound sa form lead):**
> "Hello po, si Zam po to ng Oceanides. Nakita ko po yung form nyo sa website
> namin, yung sa [lungsod] po. Tinawagan ko po kayo para masagot agad kung magkano
> at kung kailan kami pwede. Ilang minuto lang po to."

**CARD 1 — MAHAL DAW:**
> "Ganyan po ang presyo kasi kasama na lahat: hose ng truck, before at after na
> litrato ng tank nyo, 30-day warranty kung bumalik ang bara, at BIR receipt.
> Walang dagdag na singil pagdating ng truck, nakasulat na presyo bago kami
> magsimula. Yung mas mura po, kadalasan may dagdag pa sa hose tapos di nyo alam
> kung saan itinatapon. Sa amin po, DENR-partner facility ang tapunan."

**CARD 2 — KAILAN KAYO PWEDE / PAG-IISIPAN KO MUNA:**
> "Sige po, walang problema. Isang bagay lang po: kapag umapaw na, mas magastos
> na po yun kasi may lilinisin pa. Kung gusto nyo po, i-hold ko na ang schedule
> nyo ngayon, libre ang pag-hold, tapos text nyo na lang ako kung tuloy. Anong
> araw po ang maganda sa inyo?"

**CARD 3 — LEGIT BA KAYO:**
> "Kumpleto po ang papeles namin: DENR ang tapunan, may Certificate of Treatment
> kami, at BIR official receipt ang matatanggap nyo. Nasa website po namin lahat.
> At bago kami magsimula, nakasulat na po ang presyo, para walang gulatan."

Bawat bagong objection na lalabas sa mga tawag: log ni Zam → draft ng AI
(`grifon-cmo` voice) → approve ni Neil → pasok sa deck. Ganyan lumalago ang playbook.

## 6. Mga phase pagkatapos ng v0

- **v1 — Autopsy.** Recording ng tawag (may consent line na bahagi ng spec, hindi
  habol) + transcription (Gemini — patunay na kaya nya ang Taglish audio:
  `tools/analyze_video.py` ng viral-autopsy) + pag-grade laban sa lumalaking deck.
  Hindi magsisimula hangga't walang laman ang objection log at walang consent
  script na pumasa kay Zam.
- **v2 — Live assist.** Chat copilot muna bago video. Malayo pa; huwag i-spec ngayon.
- **Phase 2 — Grifon high-ticket lane.** Parehong cockpit, ibang deck (₱997
  build-with-us buyers, funnel builds, managed ads), English na usapan, briefing
  card na may totoong background feed (scheduled B2B calls na yun, hindi inbound).

## 7. Premortem — mga depensa na nakapasok na sa plano

1. **Hindi nag-log si Zam** → 4 na pindot max, bahagi ng workflow na ginagawa na
   nya, at ang log ay hindi kailanman gagamitin laban sa kanya (usapan sa umpisa).
2. **Kulang ang leads** → problema ng campaign, hindi ng tool; directional ang metric.
3. **Lumang presyo sa cards** → `rates.ts` na iisang source, arkitektura hindi paalala.
4. **Nakakaabala habang live** → briefing BAGO tumawag; 3 button lang habang live.
5. **Nawala ang atensyon ni Neil (Grifon launch)** → v0 gumagana kahit walang
   nag-aalaga; static cards na tama ang presyo ay kapaki-pakinabang mag-isa.
6. **Presyo pala talaga ang problema** → ang objection log mismo ang magiging
   ebidensya para sa usapang presyo kay boss Jay. Feature, hindi failure.
7. **Tahimik na pumalpak ang tunog** → toggle na kailangang i-on (browser autoplay
   limits), at ang bilis-ng-tawag metric ang taga-huli kapag hindi gumagana.
8. **Legal sa v1** → walang recording sa v0; ang v1 ay naka-gate sa consent line.

**Hindi nagalaw sa grill:** kailan papasok si boss Jay sa usapan. Desisyon ni Neil;
mungkahi: ipakita kapag may resulta na, hindi kapag plano pa lang.

## 8. Susunod na hakbang

1. **Neil:** aprubahan / i-edit ang §5 deck (ito na lang ang blocker ng build).
2. Build session: §3 spec, tapos smoke, tapos deploy, tapos sabihan si Zam
   (kasama ang "para sa cards ang log, hindi para sa yo" na usapan).
3. Pagkatapos ng unang 20 leads: basahin ang dalawang metric, tapos v1 na usapan.
