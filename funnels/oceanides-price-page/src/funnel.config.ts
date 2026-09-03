import type { FunnelConfig } from './config.types';

// ===========================================================================
// OCEANIDES — PRICE PAGE  (funnel_id: oceanides-price-page-v1)
//
// ✅ COPY STATUS: APPROVED (Neil, 2026-08-02 — "Okay na saken ang page. APproved").
// Gate 2 = buong basa nya ng landing + thank-you. Tapos na. Ang copy dito ay
// hindi na draft: bago baguhin ang kahit anong user-visible na string, dapat may
// dahilan na mas malakas kaysa sa panlasa, at dapat alam ni Neil.
// Offer doc (Gate 1): workflows/oceanides_offer_price_page.md
//
// 🆕 APAT NA PAGBABAGO 2026-08-03, aprubado ni Neil bago pa maglaunch ang unang
// campaign (kaya walang baseline na nasira — libre pa ang pagbabago hanggang
// may gumagastos):
//   1. `form.reassurance` — dagdag na 8AM-5PM at ang anti-promise.
//   2. Bagong dalawang-hanay na ₱2,500 vs ₱5,000, kasunod ng objectionReversal.
//   3. Bagong pangalawang guarantee — ang "uuwi kami", may ₱0 na selyo.
//   4. Tinanggal ang FAQ #3, dahil #2 na ang bahay nya.
// Ang tinanggihan sa parehong usapan: ang Hormozi na priced value stack
// (may halaga bawat linya, susumahin sa inflated total). Tatlong dahilan,
// nakasulat para hindi na muling imungkahi: (a) mangangailangan sya ng
// imbentong halaga sa page na ang buong benta ay totoo lahat ng numero dito,
// (b) sa market na sunog sa "sobrang ganda para totohanin", ang inflated total
// ay tunog ng ₱2,500 na scammer at hindi ng alok, (c) ang leak ay ang CLOSE
// (100 message, isang order), at ang value stack ay gamot sa DESIRE. Wala
// tayong desire problem. Ang ginamit sa halip ay ang bahagi ng Value Equation
// na totoo at bakante: Time Delay (#1) at risk reversal (#3).
//
// 🔴 ANG BILIS NG TRUCK AY HINDI PWEDENG IPANGAKO. Nakadepende sa available na
// truck (Neil, 2026-08-03), kaya walang kahit isang linya sa page na nagsasabi
// kung kailan darating. Ang ipinapangako lang ay ang TAWAG. Huwag itong
// bawiin nang walang bagong sagot mula kay Boss Jay.
//
// PRICING is Boss Jay's, confirmed 2026-07-30: ₱5,000 per TRUCKLOAD (full or
// not, it counts as one), a second truckload is ₱5,000 again, the 30-day
// warranty covers BARA only (not refilling — a canteen or apartment fills
// faster than a house and that is not a defect), and extra hose is ₱100 per 3
// metres. Every one of those is on the page in plain words, because the page's
// entire promise is that the price is COMPLETE. Any gap breaks the thing it
// sells — so no placeholder text ships here, ever.
//
// 🟡 Still soft: the number of hose metres INCLUDED before the ₱100/3m starts.
// Boss Jay gave the rate but not the baseline, so the copy says "kasama na ang
// standard na hose ng truck" — true, and it does not invent a number.
//
// WHY THIS PAGE EXISTS
// 2 days of live KM-003 ads: ₱1,284 spend, 100 messages, ₱12.84/message — and
// ONE order. The leak is not lead gen, it is the close. Every conversation died
// the same way: "magkano?" → "depende sa location, 4k to 4500" → silence. A
// public comment on the ad itself: "From 4500 ... nagdagdag ng 100 per tubo, so
// umabot sa 5500 ang binayaran." The phone answer CONFIRMS the fear instead of
// removing it. So this page answers "magkano" completely, in writing, with the
// add-ons other siphoners hide printed right on the page.
//
// AUDIENCE: women 35-64 (77% of ad viewers), households + apartments in NCR.
// AWARENESS (Schwartz): Solution Aware — they know siphoning exists and are
// comparing on price and trust. The fight is mechanism + trust, not agitation.
// Hence price is the hero, not a story.
//
// SECTION ORDER deviates from the plan: valueStack sits BEFORE originStory.
// The premise is "answer magkano immediately" — delaying the price behind a
// mechanism story reintroduces the exact stall this page exists to kill.
//
// VOICE: .claude/skills/_shared/taglish-voice.md §LANGUAGE LOCK (rewritten
// 2026-08-02, ported from the TUNED formula in api/_lib/prompts.ts). The Tagalog
// FRAME carries the sentence; English is limited to four carve-outs (brand names,
// prices/numbers, borrowed verbs inside a Tagalog frame, and nouns Filipinos
// genuinely say in English). The enemy is MANUAL-Tagalog, not Tagalog — pick the
// word a person would SPEAK, never the language. Calm expert. No em dash. No
// apostrophes in contractions (nyo, yun, yan, to, wag, di).
//
// ⚠️ The old note here said "50/50 English/Tagalog". That framing is SUPERSEDED
// and it actively caused damage: it made the ratio look like the rule, which led
// to a proposal to swap `presyo` → `price` on lines that had nothing wrong with
// them. Ratio is a symptom. Enforced by scripts/lint-voice.mjs on `prebuild`.
// ===========================================================================

// ---------------------------------------------------------------------------
// CONTACT — isang lugar lang, ginagamit ng APAT na surface: ang hero, ang
// StickyCta, ang footer, at ang thank-you page. Nakahiwalay sila dito dahil
// ang numerong nasa dalawang lugar ay numerong maghihiwalay sa susunod na
// palit. Zam Grifon ang sumasagot (Neil, 2026-07-30).
// ---------------------------------------------------------------------------
const PHONE = '0935 258 9927';
const PHONE_LABEL = 'Tawag o text, 24 hours';

// Ang totoong Page (Neil, 2026-08-01): facebook.com/OceanidesMalabanan
// Ang `m.me/<username>` ay ang Messenger form ng vanity URL na yun.
//
// ⚠️ NAKATALI TO SA USERNAME, HINDI SA PAGE. Kapag pinalitan ang username ng
// Page, MAPUPUTOL ang link na to at walang magsasabi sa atin. Kaya bago
// palitan ang username kailanman, palitan din ang linyang to. (Tingnan ang
// clients/oceanides/NEXT-SESSION-PRICE-PAGE.md kung bakit hindi inirekomenda
// ang pagpapalit.)
const MESSENGER = 'https://m.me/OceanidesMalabanan';

const NCR_CITIES = [
  'Quezon City',
  'Manila',
  'Caloocan',
  'Makati',
  'Pasig',
  'Taguig',
  'Parañaque',
  'Las Piñas',
  'Muntinlupa',
  'Marikina',
  'Mandaluyong',
  'San Juan',
  'Pasay',
  'Valenzuela',
  'Malabon',
  'Navotas',
  'Pateros',
  'Wala sa listahan',
];

export const funnelConfig: FunnelConfig = {
  meta: {
    clientId: 'oceanides',
    funnelId: 'oceanides-price-page-v1',
    archetype: 'longform',
    title: 'Oceanides · ₱5,000 Septic Tank Siphoning, Metro Manila',
    description:
      'Isang presyo, nakasulat bago magsimula. Nakalista rin ang mga dagdag na itinatago ng iba. May BIR receipt at 30-day warranty.',
  },

  // 1:1 sa YAML frontmatter ng clients/oceanides/DESIGN.md v1.0.
  // Mirrored sa src/index.css :root para tama na agad ang first paint.
  brand: {
    colors: {
      primary: '#F5B301',
      surface: '#0E2C5E',
      surfaceElevated: '#0A1F45',
      onSurface: '#FFFFFF',
      onSurfaceMuted: '#DFE8F5',
      onSurfaceDim: '#8FB3DD',
      proofBand: '#F4F6FA',
    },
    fonts: {
      display: "Anton, 'Roboto Condensed', 'Arial Narrow', Impact, sans-serif",
      body: "Inter, 'Helvetica Neue', Arial, sans-serif",
      accent: "'JetBrains Mono', ui-monospace, monospace",
    },
    rounded: 'sm', // print world, hindi app world
  },

  form: {
    // phone is REQUIRED here (grifon-starter deliberately omitted it) — walang
    // booking na hindi natatawagan. Walang address field: tatawagan sila para
    // doon, kaya nananatiling config-only ang build.
    fields: ['name', 'phone', 'email'],
    headline: 'Mag-book ng schedule',
    ctaLabel: 'Kunin ang schedule ko',
    // ANG ORAS AT ANG ANTI-PROMISE (Neil, 2026-08-03). Dalawang bagay ang
    // idinagdag dito at pareho silang tumutugon sa `Time Delay` ng Value
    // Equation — ang tanging lever na walang laman ang page na to.
    //
    // 🔴 WALANG IPINAPANGAKO TUNGKOL SA TRUCK, sinadya. Nakadepende sa
    // available na truck kung kailan makakapunta (Neil, 2026-08-03: "malabo
    // kasi... ayoko mangako sa part na to"), kaya ang ipinapangako lang dito ay
    // ang TAWAG — nasa kontrol ni Zam yun, at nasa thank-you page na ang 8AM-5PM
    // simula pa noong 2026-08-01. Wala lang sya sa landing, kung saan sya
    // kailangan: nagfo-form sila nang hindi alam kung may sasagot ba.
    //
    // Ang pangalawang pangungusap ay ang lever mismo. Ang kalaban ay nagsasabi
    // ng "same day, 24/7" tapos hindi dumarating. Ang pag-amin na hindi natin
    // alam ay parehong galaw ng "uuwi kami" sa ibaba: nananalo tayo sa
    // inaamin, hindi sa ipinapangako.
    reassurance:
      'Tatawagan ka namin para sa schedule at sa buong presyo, 8AM hanggang 5PM. Hindi kami mangangako ng bukas kung hindi namin kaya. Walang bayad kung hindi pa kayo nagkakasundo sa presyo.',
    consent: {
      required: false,
      text: 'Oo, pwede nyo akong tawagan o i-text tungkol sa booking na to. Protektado ang info ko sa ilalim ng Data Privacy Act of 2012 at ng Privacy Policy nyo. Matatawagan pa rin ako para sa schedule kahit hindi ko to i-check.',
      policyVersion: 'funnel-dpa-v1-2026-07',
    },
    // L3 — progressive qualification. Ang una ang router ng thank-you page.
    qualifiers: [
      {
        id: 'tank_location',
        label: 'Alam mo ba kung nasaan ang septic tank mo?',
        options: ['Oo, alam ko', 'Hindi ko alam'],
        required: true,
      },
      {
        id: 'role',
        label: 'Ikaw ba ang may-ari?',
        options: ['Ako ang may-ari', 'Tenant ako', 'Ako ang caretaker'],
        required: true,
      },
      { id: 'city', label: 'Saan ka sa Metro Manila?', options: NCR_CITIES, required: true },
      {
        id: 'property',
        label: 'Anong klaseng property?',
        options: ['Bahay', 'Apartment o boarding house', 'Negosyo o opisina'],
        required: true,
      },
    ],
  },

  // Meta Pixel — BUHAY na (Neil, 2026-08-02). Dataset "Oceanides Price Page",
  // ad account 4165212657057538, portfolio "Neil Maglaya" 771158756811875.
  //
  // ⛔ HINDI ITO ang `1921429268517231`. Yun ang "Grifon Pixel", sariling SaaS
  // pixel ni Neil para sa Grifon app. Ang paghalo ng SaaS signups at ng septic
  // bookings sa isang dataset ay sumisira ng optimization ng dalawa nang sabay at
  // hindi na mahihiwalay pagkatapos. Nakasulat din ang ban sa
  // workflows/ad_performance_ledger.md at sa kuya-marvin/ads/NEXT-SESSION.md.
  //
  // BUILD-TIME to. Kapag napalitan ang ID, kailangan ng bagong deploy — walang
  // env var na mababago sa Vercel dashboard para dito.
  //
  // 🔴 NAKA-OFF ANG AUTOMATIC ADVANCED MATCHING, sinadya (2026-08-02). Kinukuha
  // nito ang name/phone/email mismo sa form at ipinapadala sa Meta (naka-hash)
  // para sa audience matching. Ang consent checkbox natin ay sumasakop sa
  // PAGTAWAG tungkol sa booking, hindi sa pagbabahagi ng data sa Meta para sa
  // advertising — at `required: false` pa sya, kaya may pumapasok na lead na
  // hindi man lang sya na-tick. Kapag sinakop na ng consent + ng totoong Privacy
  // Policy ang paggamit na ito, sampung segundo lang buksan. Ang pagpatay nito
  // pagkatapos mangolekta ay hindi na nakakabawi sa nakolekta na.
  //
  // 🔴 WALA RIN TAYONG CONVERSIONS API, sinadya (2026-08-02). Browser pixel lang.
  // Aalukin ka ng Events Manager ng apat na paraan para i-set up sya (Birch,
  // Set up with Meta, partner, manual) — LAKTAWAN LAHAT sa ngayon:
  //   1. Ang CAPI ay ang SERVER-SIDE na bersyon mismo ng Advanced Matching sa
  //      itaas. Parehong hashed email/phone papuntang Meta, iisang consent gap.
  //      Ang tanggihan ang isa tapos buksan ang isa ay hindi magkatugma.
  //   2. Walang CAPI code ang funnel na to. Ang `api/lead.ts` ay sa Supabase lang
  //      sumusulat. (Ang `api/_lib/metaCapi.ts` ay sa GRIFON app, hindi dito.)
  //      Kaya ang "Set up manually" ay code na hindi pa naisusulat.
  //   3. Ang "Set up with Meta" ay nangangailangan ng domain na wala pa tayo.
  //   4. Ang Birch ay third-party vendor na papasok sa gitna ng leads natin at
  //      ng Meta. Ang "17.8% lower cost per result" ay marketing number nila,
  //      hindi sukat ng account na to.
  // Tamang pagkakasunod: domain -> Privacy Policy -> deploy -> totoong traffic
  // -> saka CAPI. Totoong tumutulong sya (iOS signal loss, ad blockers), pero
  // wala syang sinasagip na signal kung wala pang traffic.
  tracking: { metaPixelId: '1050997330667084' },

  sections: [
    // GROUNDS (`ground`, 2026-08-01). The page reads in chapters, and each
    // chapter changes stock the way a printed sales piece does:
    //   hero            navy-gradient  the arrival
    //   proof strip     navy-deep      a thin darker trust band
    //   presyo chapter  paper          quotation, objection, before/after
    //   kwento chapter  navy           mechanism + the promise
    //   FAQ             paper          back to the quotation stock
    //   form + P.S.     navy-deep      the desk you sign at
    //   footer          void           the bottom of the page
    // Section components never read this — Landing.tsx paints the band, and the
    // paper grounds flip the text ladder for everything inside them.
    {
      type: 'hero',
      ground: 'navy-gradient',
      props: {
        eyebrow: 'Septic tank siphoning · Metro Manila',
        // `**…**` renders amber (lib/goldEmphasis). Anton ships ONE weight, so
        // colour is the brand's only emphasis channel. Keep it to 1-2 runs —
        // amber is the single accent in the system and spending it on five words
        // spends the scroll-stop it exists to buy.
        // "Sorpresang dagdag", hindi "dagdag": may listed add-on na lumalabas
        // lang pagdating (halimbawa bakbak na nakita sa mismong araw), kaya ang
        // "walang dagdag pagdating" ay may kasong hindi totoo — at ang guarantee
        // ay sumasagot lang sa dagdag na HINDI nasabi. Ang kayang panindigan ay
        // walang dagdag na hindi mo pa nababasa. (5-carrier review, 2026-08-02)
        headline: '₱5,000. **Walang sorpresang dagdag** pagdating ng truck.',
        // S8 audience callout (9 ads / 5 brands). 77% of the ad audience was
        // women 35-64 running a household, and Zam's 2 days in the inbox were
        // households, apartments, and tenants — so the callout names them, not
        // a generic "customer".
        audience:
          'Para sa may bahay, apartment, at negosyo sa Metro Manila na puno na ang septic tank.',
        subhead:
          'Isang truckload na siphoning, 4,000 litro, may 30-day warranty sa bara. Nakasulat ang presyo bago kami magsimula. Kung may dagdag, nasa ibaba nakalista lahat. Wala kaming itinatago.',
        ctaLabel: 'Mag-book ng schedule',
        logo: '/img/logo.webp',
        logoAlt: 'Oceanides',
        // Zam Grifon, admin / sales support. Sya ang sumasagot sa tumatawag
        // (Neil, 2026-07-30). Nasa PHONE const sa itaas ang numero, kaya isang
        // lugar lang ang papalitan kapag nagbago.
        phone: PHONE,
        phoneLabel: PHONE_LABEL,
        // Hindi ito lumalabas sa hero mismo. Binabasa lang sya ng StickyCta.
        messenger: MESSENGER || undefined,
        // ANG QUOTATION, NAKA-PRINT. Walang bagong numero dito — pareho lahat
        // ng nasa objectionReversal sa ibaba. Ang pinagkaiba ay nakikita mo na
        // sila BAGO ka mag-scroll, at nakasulat sila na parang resibo, hindi
        // parang claim. Yun ang buong punto ng page.
        ticket: {
          tab: 'Nakasulat na presyo',
          // Walang "4,000 litro" dito — nasa subhead na yun. Isang numero lang
          // ang ticket: ang presyo (Neil, 2026-08-01).
          lead: {
            label: 'Isang truckload na siphoning',
            sub: 'Kasama na ang standard na hose ng truck',
            amount: '₱5,000',
          },
          addOnsLabel: 'Kung kailangan lang:',
          addOns: [
            { label: 'Sobrang hose, kada 3 metro', amount: '₱100' },
            // Dalawang linya ang bakbak scenario, hindi isa: ang tunay na ceiling
            // kapag kami rin ang magdadala ng semento ay ₱1,500, at ang ticket na
            // may "Wala nang iba" sa footnote ay hindi pwedeng may singil na wala
            // sa listahan. Resibo to — isang linya kada singil. Tugma sa
            // objectionReversal sa ibaba. (5-carrier review, 2026-08-02)
            { label: 'Bakbak ng takip, kasama ang pagsasara', amount: '₱500 - 1,000' },
            { label: 'Semento sa pagsasara, kung kami ang magdadala', amount: '₱500' },
            { label: 'Pangalawang truckload', amount: '₱5,000' },
          ],
          footnote: 'Wala nang iba. Sasabihin namin bago magsimula.',
        },
        // Ang papeles, hinila sa fold. Teksto, hindi seal: ang badge artwork ay
        // maling DENR region, at ang maling seal sa trust page ay mas masama
        // kaysa sa walang seal.
        trustChips: ['SEC Registered', 'BIR official receipt', 'DENR-partner na tapunan'],
      },
    },

    // L9 authority. 🔴 Walang proof number tayo (walang testimonial, walang taon
    // sa serbisyo, walang bilang ng naserbisyuhan) at BAWAL mag-imbento
    // (clients/oceanides/DESIGN.md Don'ts). Ang papel ang tanging totoong lever
    // na hawak natin — at ito rin ang moat: hindi makaka-issue ng DENR cert ang crew.
    //
    // 🔴 WALA NANG BADGE IMAGES (2026-08-01). Maling region ang DENR mark sa
    // `/img/badge-denr.webp`, at ang maling seal sa page na ang buong benta ay
    // TIWALA ay mas masama kaysa sa walang seal. Sumama na ang BIR badge para
    // pare-pareho. Nasa disk pa rin ang dalawang file, hindi na lang naka-render.
    // Ang papeles ay nasa hero na ngayon bilang `trustChips` — nasa itaas ng
    // fold at hindi pwedeng maling artwork.
    {
      type: 'socialProofBar',
      ground: 'navy-deep',
      props: {
        // 🟢 TOTOO ANG BILANG. Si Boss Jay ang nag-vouch nito (Neil, 2026-08-01),
        // kaya hindi to sakop ng "walang fake proof" ban — may pinanggalingan.
        // "Mahigit 1,000" ang sinasabi, HINDI isang numerong mukhang eksakto
        // (walang "1,247"): ang pekeng katiyakan ang unang bagay na sinusuri ng
        // tao sa trust page. Kapag may naibigay na si Boss Jay na eksaktong
        // bilang na may talaan, palitan to ng bilang na yun.
        line: 'Mahigit 1,000 na tangke na ang na-service namin sa Metro Manila. SEC Registered. May BIR official receipt. DENR-partner na tapunan. Ito ang mga papel na hindi kayang ibigay ng karaniwang siphoner.',
        // TOTOONG numero, galing kay Neil 2026-08-01, verbatim — walang binago
        // sa format. DP5: mas malakas ang tiyak na numero kaysa hiram na seal;
        // kahit sino pwedeng mag-verify. SEC Reg. No. = TO FOLLOW pa kay Neil,
        // idadagdag dito pagdating.
        receipts: [
          { label: 'DENR Certificate of Treatment No.', value: 'BEHMC(1)WHN0095001WW260318' },
          { label: 'DENR ID No.', value: 'OL-TR-R3-14-000080' },
          { label: 'BIR TIN (Non-VAT)', value: '260-084-087-00000' },
        ],
      },
    },

    // Kasunod agad ng proof strip kasi iisang kabanata sila: ang papel at ang
    // kliyente. Ang strip ang nagsasabing legal kami, ito ang nagsasabing may
    // ibang nagtiwala na.
    //
    // 🔴 PANGALAN LANG, WALANG LOGO. Wala tayong karapatan sa artwork nila, at
    // print world to — hindi SaaS deck. Ang listahan ay galing mismo sa company
    // profile deck ng Oceanides (Neil, 2026-08-01), verbatim: walang idinagdag,
    // walang inayos ang pagkakasunod, walang hinulaan.
    //
    // "Papa Johns" na walang apostrophe — house rule sa typography (tingnan ang
    // taglish-voice.md), at ito rin ang hinuhuli ng lint-voice.
    {
      type: 'clientsMarquee',
      ground: 'navy-deep',
      props: {
        label: 'Na-service na rin namin:',
        names: [
          'Avida',
          'Papa Johns Pizza',
          'Toyota',
          'Yellow Cab Pizza Co.',
          'Uniqlo',
          'Jollibee',
          'Eagle Cement',
          'Starmall',
          'Mang Inasal',
          'Siomai King',
          'GH Greenhills',
          'Ayala Land',
          'San Miguel Properties',
          'Brenton International Venture Manufacturing Corp.',
        ],
      },
    },

    {
      type: 'valueStack',
      ground: 'paper',
      props: {
        heading: 'Ano ang kasama sa **₱5,000**',
        items: [
          { label: 'Isang truckload na siphoning, 4 cubic o 4,000 litro' },
          { label: 'Kasama na ang standard na hose ng truck' },
          { label: 'Before at after na litrato ng tank mo, para may makita ka' },
          { label: '30-day warranty kung bumalik ang bara' },
          { label: 'BIR official receipt' },
          { label: 'Legal na tapunan sa DENR-partner facility' },
          { label: 'Nakasulat na presyo bago kami magsimula' },
        ],
        totalLine: '₱5,000 kada truckload. Isang presyo, hindi range.',
      },
    },

    // Ang buong ad, ito. Lahat sila may ganitong singil. Tayo lang ang nagsasabi
    // bago pa mangyari. (Cialdini: Authority + Liking. Suby: aminin ang maliit na
    // negatibo bago pa nila matuklasan.)
    {
      type: 'objectionReversal',
      ground: 'paper',
      props: {
        heading: 'Ang mga dagdag na itinatago ng iba',
        // `==…==` = highlighter (goldEmphasis) — iisang linya kada section,
        // yung sinasabi ang buong benta. Kapag lahat naka-highlight, wala.
        body: [
          'Lahat ng siphoner may ganitong singil. ==Kami lang ang naglalagay nito sa page bago ka pa mag-book.==',
          'Sobrang hose, ₱100 kada 3 metrong dagdag. Kapag malayo sa tangke mo ang pwedeng paradahan ng truck.',
          // ⚠️ HINDI kasama ang semento (Neil, 2026-08-01 — mali ang dating
          // "kasama na ang semento"): customer ang magbibigay; kung Oceanides
          // ang magdadala, dagdag ₱500; pwede rin nilang ipagawa sa iba.
          'Bakbak ng takip, ₱500 hanggang ₱1,000. Kapag nakasarado ang tangke at kailangang buksan. Kasama ang pagsasara ulit, pero ikaw ang magbibigay ng semento. Kung kami ang magdadala ng semento, dagdag na ₱500. Kung ayaw mo ng dagdag, pwede mong ipagawa ang pagsasara sa ibang marunong.',
          'Pangalawang truckload, ₱5,000 ulit. Kapag hindi kasya sa isa ang laman ng tangke mo. Sasabihin namin bago pa namin simulan ang pangalawa, hindi pagkatapos.',
          'Yun lang. Wala nang iba. At sasabihin namin bago kami magsimula, hindi habang ginagawa.',
        ],
      },
    },

    // ANG ₱2,500, INAHON PALABAS NG ACCORDION (Neil, 2026-08-03).
    //
    // Ito ang pinakamalakas na close-argument sa buong page at nakatago sya
    // noon sa ikatlong fold ng FaqAccordion, sa ika-siyam na section. Hindi
    // binubuksan ng skimmer ang accordion, at ang skimmer ang pinakamalaking
    // grupo. Tinanggal na ang FAQ item sa ibaba — dito na sya buo.
    //
    // 🔴 WALANG BAGONG CLAIM DITO. Bawat linya ay galing sa aprubadong sagot ng
    // FAQ #3, hinati lang sa dalawang hanay. Ang `objectionReversal` sa itaas
    // ay sumasagot sa mga DAGDAG na singil; ito ay sumasagot sa ibang laban
    // — "ang mura ay mas mahal pala." Magkaibang objection, magkaibang section.
    //
    // ⚠️ GINAGAMIT ANG `costOfDelay` BILANG GENERIC NA DALAWANG-HANAY. Wala
    // syang salitang "delay" sa loob — config lahat ang eyebrow, heading, body,
    // compare at close (tingnan ang CostOfDelay.tsx), at ang `attention` amber
    // ay nasa PANGALAWANG hanay, kaya doon dapat ang sa atin. Ang pangalan ng
    // prop (`nowLabel`/`laterLabel`) ang tanging hindi bagay, at ang pagpapalit
    // nun ay paggalaw sa shared template ng lahat ng funnel para sa isang
    // pangalan. Ligtas ang paulit-ulit na section type: naka-key sa
    // `${type}-${index}` ang Landing.tsx.
    {
      type: 'costOfDelay',
      ground: 'paper',
      props: {
        eyebrow: 'Bago ka maghambing',
        heading: 'Bakit ₱5,000 eh may nag-aalok ng **₱2,500**?',
        body: [
          'Kasi ibang bagay yun. Magkaiba sila ng kasama, at madalas magkaiba rin sila ng presyo pagdating ng truck.',
        ],
        compare: {
          nowLabel: 'Ang ₱2,500',
          nowItems: [
            'Walang BIR official receipt. Walang mahahabol kapag may nangyari.',
            'Walang warranty. Kapag bumalik ang bara sa isang linggo, bagong bayad ulit.',
            'Hindi mo alam kung saan itinapon ang laman.',
            'Karaniwang nagiging ₱4,000 o ₱5,500 pagdating ng truck. May comment sa ad namin na ganoon mismo ang nangyari sa kanya.',
          ],
          laterLabel: 'Ang ₱5,000 namin',
          laterItems: [
            'May BIR official receipt.',
            '30-day warranty sa bara.',
            'DENR-partner na tapunan, may papel.',
            '₱5,000 sa page, ₱5,000 pa rin sa dulo.',
          ],
        },
        close:
          'Hindi mura ang ₱2,500 kapag ₱5,500 ang binayaran mo. ==Ang mura ay yung presyong hindi na nagbago.==',
      },
    },

    // Ang tanging outcome proof na hawak natin. Walang testimonial, walang
    // review count, walang taon-sa-serbisyo, at bawal mag-imbento. Dalawang
    // TUGMANG pares lang — parehong fixture, parehong ilaw. Ang hindi tugmang
    // pares ay walang pinapatunayan at sinisira pa ang tabi nya.
    {
      type: 'beforeAfter',
      ground: 'paper',
      props: {
        eyebrow: 'Totoong trabaho',
        heading: 'Tingnan mo ang **before at after**.',
        pairs: [
          {
            before: '/img/ba-1-before.webp',
            after: '/img/ba-1-after.webp',
            alt: 'bilog na septic tank manhole',
            caption: 'Puno hanggang labi. After, kita na ang sahig at ang dingding ng tank.',
          },
          {
            before: '/img/ba-2-before.webp',
            after: '/img/ba-2-after.webp',
            alt: 'square na tank na may pulang tubo',
            caption: 'Parehong tank, parehong pulang tubo. Ang laman lang ang nagbago.',
          },
        ],
        note: 'May before at after na litrato ang bawat trabaho, at ibinibigay namin sayo. Hindi to pang-porma. Ito ang tinitingnan kapag may tanong sa warranty, para hindi na salita laban sa salita.',
      },
    },

    // Mechanism (Solution Aware). Ginagamit ang hook na 98.5% retention sa 0:03
    // ng KM-003 — napatunayan nang totoo sa 7,047 na tao.
    {
      type: 'originStory',
      ground: 'navy',
      props: {
        heading: 'Hindi barado. Puno na.',
        paragraphs: [
          'Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado.',
          'Puno na ang septic tank. Kaya kahit anong plunger, balik nang balik ang problema. Hindi mo naman kasi inaayos ang totoong dahilan.',
          'Kaya ang tinitingnan namin ay ang tangke, hindi ang toilet. ==Kapag hindi pa naman puno, sasabihin namin. Uuwi kami.== Hindi ka namin pipilitin.',
        ],
        // Nandito na ang litrato ng truck, hindi na sa hero. Sa ilalim ng CTA
        // sya dati, kaya sliver lang sya sa fold at walang nakakakita.
        image: '/img/hero-truck.webp',
        imageAlt: 'Puting truck ng Oceanides na nakaparada sa kalye sa Metro Manila',
      },
    },

    // ⚠️ ANG `chips` AY AUDIT ROW, HINDI DEKORASYON. Bawat isa ay may kaukulang
    // linya sa itaas ng page: nakasulat na presyo = ticket footnote · BIR at
    // DENR at before/after = valueStack · SEC = trustChips at proof strip ·
    // walang bayad bago magkasundo = `form.reassurance`. Kapag nagdagdag ka
    // dito ng walang pinagmulan, ang totoong anim ay nasisira kasama nya.
    //
    // 🔴 WALANG STAR RATING AT WALANG REVIEW COUNT DITO, kahit ganyan ang IM8
    // na pinagbasehan ng device (Neil, 2026-08-02). Zero review ang brand na to
    // sa ngayon. Ang bituing walang bilang ay hindi mas maliit na bersyon ng
    // social proof, peke sya, at hard ban yun sa clients/oceanides/DESIGN.md.
    // Kapag may totoong reviews na sa FB Page, doon pa lang bubuksan ito.
    {
      type: 'guarantee',
      ground: 'navy',
      props: {
        eyebrow: 'Ang pangako namin',
        heading: 'Kung tumaas ang presyo pagdating, kami ang sasagot',
        // Ang 30-day warranty ay nasa valueStack at nasa FAQ na. Ito ang tanging
        // numero sa page na kayang basahin sa bilis ng scroll, kaya inuulit sya
        // dito bilang selyo, hindi bilang bagong pangako.
        seal: { value: '30', unit: 'ARAW', label: 'Warranty sa bara' },
        body: 'Yung presyong sinabi namin sa telepono ay yun din ang babayaran mo. Kung may nakita kaming dagdag na hindi namin nasabi sayo, ==kami ang sasagot doon, hindi ikaw.== Ang hindi lang sakop nito ay kung mali ang sinabi mo sa amin, halimbawa isang tangke ang sinabi mo pero dalawa pala.',
        chips: [
          'Nakasulat na presyo bago magsimula',
          'BIR official receipt',
          'DENR-partner na tapunan',
          'SEC Registered',
          'Before at after na litrato',
          'Walang bayad bago magkasundo',
        ],
      },
    },

    // ANG PANGALAWANG RISK REVERSAL (Neil, 2026-08-03: "mukang goods nga to").
    //
    // Magkatabi sila nang sinadya. Ang una ay tungkol sa PRESYO (kung tumaas,
    // kami ang sasagot); ito ay tungkol sa PANGANGAILANGAN (kung wala ka
    // palang kailangan, wala kang babayaran). Magkaibang takot, kaya magkahiwalay
    // na pangako.
    //
    // 🔴 HINDI TO KAYANG KOPYAHIN NG KALABAN, at yun ang buong halaga nya.
    // Kada truckload ang kita ng siphoner, kaya walang ibang magsasabi sayo na
    // hindi mo pa sila kailangan. Ang huling pangungusap ang nagsasabi mismo
    // nito — Cialdini: ang aminin ang sarili mong interes ang nagpapaniwala sa
    // linyang susunod.
    //
    // 🟢 TOTOO ANG ₱0 (Neil, 2026-08-03). Walang sinisingil sa customer kapag
    // hindi pa puno. Pero ⚠️ ₱200-300 ang nagagastos ng Oceanides sa biyahe,
    // kaya SINADYANG hindi to isinulat bilang "libreng tingin" — ang unang
    // pangungusap ay nagsasabing may TAWAG muna bago umalis ang truck. Doon
    // nasasala ang biyaheng walang trabaho. Kapag ginawa itong alok ng libreng
    // inspection, ang gate na yun ang mawawala at ang ₱200-300 ay magiging
    // kada-tumatawag na gastos, hindi kada-pumalpak-ang-tawag.
    //
    // Ang linyang to ay nasa `originStory` din sa itaas, sinadya. Doon sya
    // katapusan ng kwento, dito sya kasulatan — parehong ginagawa ng 30-day
    // warranty, na tatlong beses lumalabas sa page na to.
    {
      type: 'guarantee',
      ground: 'navy',
      props: {
        eyebrow: 'Ang pangalawang pangako',
        heading: 'Kung hindi pa puno ang tangke mo, **uuwi kami**.',
        seal: { value: '₱0', unit: 'BAYAD', label: 'Kapag hindi pa puno' },
        body: 'Tumatawag muna kami bago umalis ang truck, para masabi mo ang lagay ng tangke. Pero kung mali pala ang hula at hindi pa naman puno pagdating namin, sasabihin namin sayo at uuwi kami. ==Wala kang babayaran, at hindi ka namin pipilitin.== Kada truckload ang kita namin, kaya alam mo kung gaano kabigat sa amin ang linyang to. Nakasulat pa rin sya dito.',
      },
    },

    // Ang huling tanong bago mag-book: sino ang papasok sa bakuran ko. Dito sya
    // sinasagot, pagkatapos ng garantiya at bago ang FAQ, kasi kapag tapos na
    // ang usapang presyo, tao na ang natitirang alalahanin.
    //
    // 🔴 May pirmadong consent si Gabriel at aprubado ang mga litrato (Neil,
    // 2026-08-01). Parehong gate ito ng lahat ng plate ni Marvin. Walang mukha
    // ng tao ang lumalabas dito nang wala nito.
    {
      type: 'fieldInspector',
      ground: 'navy',
      props: {
        eyebrow: 'Sino ang darating',
        heading: 'Si **Marvin** o si **Gabriel** ang haharap sayo',
        body: [
          'Sila ang field inspector namin. Sila ang titingin sa tangke mo pagdating, sila ang magsasabi ng buong presyo bago magsimula ang trabaho, at sila ang bahala na maayos ang lahat bago umalis ang team.',
          'Kapag may tanong ka habang nandyan ang truck, sila ang kausapin mo. Hindi ka namin ipapasa sa iba.',
        ],
        image: '/img/marvin.webp',
        imageAlt: 'Si Marvin, field inspector ng Oceanides',
        name: 'Marvin',
        role: 'Field Inspector',
        // 🔴 DALAWA NA SILA (2026-08-03). Si Marvin ang nasa KM-004 na video ad,
        // si Gabriel ang nasa GB-001. Kung isang mukha lang ang nasa page at iba
        // ang galing sa ad, sira ang message match — at nasa CLOSE yun naka-upo,
        // ang tanging bagay na sinusubukan nating ayusin (A3: 100 message,
        // isang order). Si Marvin ang nauuna dahil sya ang tumatakbong ad.
        //
        // Para bumalik sa isang tao: tanggalin ang `second`, ibalik ang `image`
        // at `name` sa isa, at ibalik ang heading sa "Si X ang haharap sayo".
        second: {
          image: '/img/gabriel.webp',
          imageAlt: 'Si Gabriel, field inspector ng Oceanides',
          name: 'Gabriel',
          role: 'Field Inspector',
        },
      },
    },

    {
      type: 'faqAccordion',
      ground: 'paper',
      props: {
        heading: 'Mga **tanong** na madalas itanong',
        items: [
          {
            q: 'Hindi ko alam kung nasaan ang septic tank namin. Ano ang gagawin ko?',
            a: 'Normal yan, madalas nangyayari. Tingnan mo muna ang 5 lugar na to: (1) kung saan lumalabas sa pader ang tubo galing sa banyo, (2) parisukat na lubog na lupa o mas berdeng damo sa isang bahagi, (3) semento o tiles na hindi tugma sa paligid, (4) maliit na tubong nakalabas sa lupa, (5) tanungin ang kapitbahay, kasi sa subdivision ay pareho ang plano ng bahay. Kunan mo ng litrato at ipadala sa amin, tutulungan ka naming basahin. Libre yan.',
          },
          {
            q: 'Tenant lang ako. Pwede pa rin ba?',
            a: 'Pwede, pero ang may-ari ang kailangang mag-desisyon kasi sa kanya ang tangke. I-copy mo to at ipadala sa kanya: "Boss, puno na po yung septic tank dito. May nakita akong Oceanides, ₱5,000 lahat-lahat, may resibo at 30-day warranty, at nakasulat ang presyo bago sila magsimula. Pwede po ba nating ipa-schedule?" Kapag sumagot sya, sya na ang mag-book dito.',  // voice-ok: naka-quote na script na ipapadala sa Messenger, may po na
          },
          // ⬆️ WALA NA DITO ANG "Bakit ₱5,000 eh may ₱2,500?" (2026-08-03).
          // Sarili nyang section na sya ngayon, sa itaas ng page, kasunod ng
          // objectionReversal. Masyado syang malakas para nakatago sa accordion.
          // Huwag ibalik dito nang hindi tinatanggal doon: kapag dalawang beses
          // lumabas ang parehong argumento sa magkaibang anyo, ang pangalawa ay
          // nagmumukhang paulit-ulit at hindi na diin.
          {
            q: 'Paano kung hindi kasya sa isang truckload ang tangke namin?',
            a: 'Kada truckload ang bayad, kaya ₱5,000 ulit ang pangalawa. Ganoon din kahit hindi mapuno ang truck, isang truckload pa rin ang bilang. Pero hindi ka namin gugulatin: bago namin simulan ang pangalawa, sasabihin muna namin sayo. Ikaw pa rin ang bahala.',
          },
          {
            q: 'Ano ang sakop ng 30-day warranty?',
            a: 'Ang bara. Kapag bumalik ang bara sa loob ng 30 days, babalikan namin. Ang hindi sakop ay kung mapuno ulit ang tangke, kasi nakadepende yun sa dami ng gumagamit. Ang kainan, hotel, o apartment na maraming tao ay mas mabilis talagang mapuno kaysa sa bahay, at hindi yun depekto ng trabaho. Kaya kinukunan namin ng before at after na litrato ang tank mo, para may makita ka at hindi basta salita lang.',
          },
          // DENR Certificate of Treatment = HIWALAY na serbisyo, hindi kasama
          // sa ₱5,000 (Neil, 2026-08-01): ₱12,000 residential / ₱15,000
          // company. Nasa workflows/oceanides_business_model.md ang margin
          // math — ito ang B2B moat. FAQ ang tamang bahay nya (F05 evidence:
          // presyo sa loob ng FAQ pagkatapos ng value stack), hindi ang
          // ticket — ang ticket ay singil ng siphoning job lang.
          {
            q: 'Kailangan ko ng DENR Certificate of Treatment. Meron ba kayo?',
            a: 'Meron. Dagdag na service yun: ₱12,000 para sa bahay, ₱15,000 para sa negosyo o company. Ito yung official na papel na nagpapatunay na dinala sa DENR-partner na tapunan ang laman ng tangke mo. Madalas hinihingi to ng building admin, ng barangay, o para sa permit. Ang karaniwang siphoner, hindi makakapagbigay nyan. Sabihin mo lang sa tawag kung kailangan mo.',
          },
          {
            q: 'Saan kayo pwede pumunta?',
            a: 'Buong Metro Manila. Kung nasa labas ka ng NCR, mag-message ka pa rin at titingnan namin kung kaya, pero hindi pa namin masisiguro.',
          },
        ],
      },
    },

    // ANG HULING ARGUMENTO BAGO ANG FORM (hiniling ni Neil, 2026-08-02: loss
    // aversion "para makonsensya sila mag paservice na at marealize nila ung
    // gastos at aberya").
    //
    // 🔴 KUNG ANO ANG HINDI PWEDE DITO ANG HUMUBOG NITO. Dalawang karaniwang
    // loss-aversion lever ang sarado sa page na to: bawal ang fake countdown
    // (DESIGN.md, "walang fake proof"), at HINDI totoong tumataas ang presyo sa
    // paghihintay. ₱5,000 pa rin sa susunod na buwan. Ang pagsasabi ng "tataas
    // to" sa page na ang buong benta ay tapat na presyo ay magpapabagsak ng mas
    // maraming tiwala kaysa sa urgency na mabibili nito.
    //
    // Kaya ang nawawala dito ay hindi pera, ang PAGPILI. Ngayon, sya ang
    // pumipili ng araw at ng kausap. Pag umapaw na, kung sino ang unang sumagot
    // ang makukuha nya, at yun mismo ang sitwasyon ng ₱2,500 na naging ₱5,500 na
    // naka-quote na sa FAQ galing sa totoong comment sa ad namin. Walang bagong
    // numerong pumapasok sa funnel sa section na to.
    {
      type: 'costOfDelay',
      ground: 'navy-deep',
      props: {
        eyebrow: 'Habang hinihintay mo',
        heading: 'Hindi bumababa ang **₱5,000** kapag hinintay mo.',
        body: [
          'Alam namin na kaya mo pang tiisin. Isang buwan pa, baka dalawa. Ganyan naman ang karamihan, at hindi ka namin sisisihin doon.',
          'Pero wala kang matitipid sa paghihintay. Pareho pa ring ₱5,000 sa susunod na buwan. Ang nagbabago lang ay kung sino ang pumipili.',
          'Kung negosyo o apartment ang property mo, mas mabigat pa: bawat araw na hindi magamit ang CR ay araw na may nawawala sayo.',
        ],
        compare: {
          nowLabel: 'Kapag ngayon ka nag-book',
          nowItems: [
            'Ikaw ang pumipili ng araw at ng oras.',
            'Nakasulat na ang buong presyo bago pa dumating ang truck.',
            'May oras kang maghanda. Malilinis mo ang daanan at matitingnan mo kung saan pwedeng pumarada.',
          ],
          laterLabel: 'Kapag umapaw na',
          laterItems: [
            'Kung sino ang unang sumagot sa tawag mo, sya na. Wala ka nang oras mamili.',
            'Dyan mismo nangyayari ang ₱2,500 na nagiging ₱5,500 pagdating ng truck.',
            'May lilinisin ka pa bago pa makapagsimula ang kahit sinong tawagin mo.',
          ],
        },
        close:
          'Wala kaming countdown dito at walang diskwentong mawawala mamaya. ==Pareho lang ang ₱5,000 bukas.== Ang pinagkaiba lang, ngayon ikaw pa ang pumipili.',
      },
    },

    // Isang heading lang ang lumalabas dito. Kapag may `heading` ang section,
    // pinapatay ng LeadFormSection ang headline sa loob ng card — dating
    // dalawang beses na magkasunod ang "Mag-book ng schedule" (Neil, dobleng
    // heading sa render pass 2026-08-01). Ang section-level heading ang piniling
    // manatili kasi sya lang ang may Anton + amber rule na treatment ng ibang
    // section; ang `form.headline` sa config ay ginagamit pa rin ng heroOptin.
    { type: 'leadFormSection', ground: 'navy-deep', props: { heading: 'Mag-book ng schedule' } },

    {
      type: 'psBlock',
      ground: 'navy-deep',
      // ⚠️ Walang "P.S." sa simula ng string. Ang PsBlock component mismo ang
      // gumagawa ng label (P.S. / P.P.S. / P.P.P.S.). Kapag inulit mo dito,
      // dumodoble sa page. Nakita ni Neil 2026-07-30.
      props: {
        // Ang unang item ay ang guarantee, inuulit. Ang headline-then-P.S. na
        // reader (Suby: sila ang pangalawang pinakamalaking grupo pagkatapos ng
        // skimmer) ay hindi nakakakita ng guarantee kung isang beses lang sya
        // sa gitna ng page. F01 P.S. ladder. (5-carrier review, 2026-08-02)
        items: [
          'Yung guarantee namin, totoo: kapag may dagdag pagdating ng truck na hindi namin sinabi bago magsimula, kami ang sasagot, hindi ikaw. Nakasulat yan sa taas, hindi lang salita sa telepono.',
          'Kung hindi ka pa handang mag-book, i-save mo na lang tong page. Kapag may nag-quote sayo, ihambing mo kung ano ang kasama at kung ano ang dagdag. Yun ang pinakamabilis na paraan para malaman kung tapat sila.',
          'Kung emergency at umaapaw na ngayon, wag ka nang mag-fill ng form. Tumawag ka na diretso sa number sa itaas.',
        ],
      },
    },

    {
      type: 'complianceFooter',
      ground: 'void',
      props: {
        logo: '/img/logo.webp',
        // ANG HULING PINTO (Neil, 2026-08-01). Ang nakarating dito na hindi
        // nag-form at hindi tumawag ay hindi talunan, may tanong lang sya na
        // walang sumagot. Nakalimbag na numero at Messenger, bago ang legal.
        contactLine: 'May tanong bago ka mag-book? Nandito kami.',
        phone: PHONE,
        phoneLabel: PHONE_LABEL,
        messenger: MESSENGER || undefined,
        // Ang consent text sa form ay nangangako ng "Privacy Policy nyo" mula pa
        // noong una, pero walang link at walang page sa likod nun hanggang
        // 2026-08-02. Hindi sya problema noong walang pixel at walang ads;
        // naging problema sya nang buhayin ang Meta Pixel at magsimula tayong
        // mangolekta ng pangalan, phone at email ng totoong tao. Static page sa
        // `public/privacy.html`, hindi Vite entry — walang pixel sa page na
        // nagpapaliwanag ng pixel. Ang `/privacy` ay rewrite sa vercel.json,
        // katulad ng `/thank-you`.
        links: [{ label: 'Privacy Policy', href: '/privacy' }],
        brandLine:
          'Oceanides Plumbing Siphoning & Pest Management Services OPC. Registered sa SEC at BIR.',
        disclaimer:
          'Ang presyong nasa page na to ay para sa residential siphoning sa loob ng Metro Manila. Ang mga dagdag na singil ay nakalista sa itaas at sasabihin bago magsimula ang trabaho.',
      },
    },
  ],

  thankYou: {
    // 🆕 BAGONG COPY 2026-08-01, para kay Neil sa Gate 2. Dalawang string lang:
    // ang chip sa taas (status stamp ng print world, tulad ng nasa bawat chapter
    // ng landing) at ang heading sa ibabaw ng tatlong hakbang. Walang bagong
    // pangako, walang bagong numero. Kung hindi bagay sa tenga mo, burahin lang
    // ang linya at mawawala ang chip o ang heading, hindi masisira ang page.
    // English ang chip na to, sinadya (Neil, 2026-08-01). Ang "Booking
    // natanggap" ay Taglish sa isang label na ang trabaho ay maging RESIBO —
    // at ang resibo sa totoong buhay ay English ang tatak. Nag-a-uppercase na
    // ang EyebrowChip sa CSS, kaya kung ano man ang case dito ay CONFIRMED
    // pa rin ang lalabas.
    eyebrow: 'BOOKING CONFIRMED',
    headline: 'Nakuha na namin. Tatawagan ka namin.',
    body: 'Nakalista na ang booking mo. Tatawagan ka namin para i-confirm ang oras at ang buong presyo bago pa may pumunta.',
    // Ito ang eyebrow ng handout chapter ngayon, hindi na ang kicker sa pinaka-
    // taas ng page: nauuna kasi dati sa "Nakuha na namin" at parang nagsasalita
    // na ng susunod bago pa masabing natanggap nga.
    magnetDelivery: 'Habang naghihintay ka, ito ang gawin mo.',
    stepsHeading: 'Ito ang susunod na mangyayari',
    steps: [
      // ANG ORAS NG TAWAG (Neil, 2026-08-01: "8AM to 5PM"). Tatlong beses
      // sinasabi ng page na "tatawagan ka namin" at ni minsan hindi kung
      // kailan, samantalang iyon ang tanging tanong ng kaka-book lang.
      // Window ito, hindi bilis: walang pangakong "sa loob ng isang oras."
      'Tatawagan ka namin para sa schedule at sa buong presyo. 8AM hanggang 5PM kami tumatawag, kaya kung gabi ka nag-book, bukas ng umaga ang tawag.',
      'Pagdating ng truck, uulitin namin ang presyo bago magsimula.',
      'Tapos, bibigyan ka ng BIR official receipt at ng 30-day warranty.',
    ],
    // L1 — ang thank-you page ay hindi resibo, may susunod na hakbang sya.
    // Number ni Zam, pareho ng nasa hero (0935 258 9927), naka-E.164 para
    // diretsong madial sa cellphone.
    nextStep: {
      label: 'I-save ang number namin',
      href: 'tel:+639352589927',
      blurb: 'I-save mo ito para hindi ka na maghanap kapag may nangyari ulit.',
    },
    // Nakalimbag na numero katabi ng button. Hindi mo mase-save ang numerong
    // hindi mo nakikita, at sa desktop ay wala talagang nangyayari kapag
    // pinindot ang `tel:` na walang nakasulat na numero sa tabi.
    phone: PHONE,
    phoneLabel: PHONE_LABEL,
    // Routed sa qualifier na `tank_location`. Ang tenant ay sinasagot na sa FAQ
    // sa landing page — mas maaga yun, kaya ang landlord na mismo ang nag-fo-form.
    magnet: {
      qualifierId: 'tank_location',
      fallback: 'Oo, alam ko',
      variants: {
        'Oo, alam ko': {
          title: 'Ihanda mo lang to bago kami dumating',
          blocks: [
            {
              heading: 'Tatlong bagay',
              body: [
                'Linisin ang daanan papunta sa takip ng tangke. Kung may nakapatong, alisin muna.',
                'Tingnan kung saan pwedeng pumarada ang truck. Kapag malayo sa tangke, may dagdag na ₱100 kada tubo, at mas mabuting alam mo yan bago pa.',
                'Kung nakasarado ng semento ang takip, sabihin mo sa amin sa tawag. May bakbak na ₱500 hanggang ₱1,000, at gusto naming masabi yan bago ka pa magulat.',
              ],
            },
          ],
        },
        'Hindi ko alam': {
          title: 'Hanapin natin ang tangke mo. Libre to.',
          blocks: [
            {
              heading: 'Tingnan mo ang 5 lugar na to',
              body: [
                'Kung saan lumalabas sa pader ang tubo galing sa banyo. Deretso ang tubo, kaya nandoon ang direksyon ng tangke.',
                'Parisukat na lubog na lupa, o isang bahagi kung saan mas berde ang damo o walang tumutubo.',
                'Semento o tiles na hindi tugma sa paligid. Madalas dyan tinakpan ang takip.',
                'Maliit na tubong nakalabas sa lupa. Yan ang vent, madalas nakadikit sa tangke.',
                'Tanungin ang kapitbahay. Sa subdivision, pareho ang plano ng bahay, kaya nasa parehong lugar ang tangke nila.',
              ],
            },
            {
              heading: 'Tapos',
              body: [
                'Kunan mo ng litrato ang mga nakita mo at ipadala sa amin kapag tumawag kami. Tutulungan ka naming basahin kung alin doon ang tangke.',
                'Walang bayad ito. Kapag nakita na, doon lang tayo magbo-book ng schedule.',
              ],
            },
          ],
        },
      },
    },
  },
};
