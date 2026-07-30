import type { FunnelConfig } from './config.types';

// ===========================================================================
// OCEANIDES — PRICE PAGE  (funnel_id: oceanides-price-page-v1)
//
// ⚠️ COPY STATUS: DRAFT, PENDING GATE 2 (Neil).
// Offer doc (Gate 1): workflows/oceanides_offer_price_page.md
//
// 🔴 Every `[TANONG KAY BOSS JAY]` marker below is a REAL unknown, not filler.
// They must be answered before this page goes live — the whole promise of the
// page is that the price is COMPLETE, so shipping it with a gap would break the
// exact thing it sells. See §8 of the offer doc.
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
// VOICE: .claude/skills/_shared/taglish-voice.md — 50/50 (English for things and
// technical nouns, Tagalog for the human part), grade 4, calm expert. No em dash.
// No apostrophes in contractions (nyo, yun, yan, to, wag, di).
// ===========================================================================

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
    title: 'Oceanides — ₱5,000 Septic Tank Siphoning, Metro Manila',
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
    reassurance:
      'Tatawagan ka namin para kumpirmahin ang oras. Walang bayad hangga\'t hindi pa napagkakasunduan ang presyo.',
    consent: {
      required: false,
      text: 'Oo, pwede nyo akong tawagan o i-text tungkol sa booking na to. Protektado ang detalye ko sa ilalim ng Data Privacy Act of 2012 at ng Privacy Policy nyo. Matatawagan pa rin ako para sa schedule kahit hindi ko to i-check.',
      policyVersion: 'funnel-dpa-v1-2026-07',
    },
    // L3 — progressive qualification. Ang una ang router ng thank-you page.
    qualifiers: [
      {
        id: 'tank_location',
        label: 'Alam mo ba kung nasaan ang septic tank nyo?',
        options: ['Oo, alam ko', 'Hindi ko alam'],
        required: true,
      },
      {
        id: 'role',
        label: 'Ikaw ba ang may-ari?',
        options: ['Ako ang may-ari', 'Tenant ako', 'Ako ang nangangasiwa'],
        required: true,
      },
      { id: 'city', label: 'Saan kayo sa Metro Manila?', options: NCR_CITIES, required: true },
      {
        id: 'property',
        label: 'Anong klaseng property?',
        options: ['Bahay', 'Apartment o boarding house', 'Negosyo o opisina'],
        required: true,
      },
    ],
  },

  // Meta Pixel stays OFF until a live campaign points here (funnel-forge rule).
  tracking: {},

  sections: [
    {
      type: 'hero',
      props: {
        eyebrow: 'Septic tank siphoning · Metro Manila',
        // `**…**` renders amber (lib/goldEmphasis). Anton ships ONE weight, so
        // colour is the brand's only emphasis channel. Keep it to 1-2 runs —
        // amber is the single accent in the system and spending it on five words
        // spends the scroll-stop it exists to buy.
        headline: '₱5,000. **Walang dagdag** pagdating ng truck.',
        subhead:
          'Isang truckload na siphoning, 4,000 litro, may 30-day warranty. Nakasulat ang presyo bago kami magsimula. Kung may dagdag, nasa ibaba nakalista lahat. Wala kaming itinatago.',
        ctaLabel: 'Mag-book ng schedule',
        logo: '/img/logo.webp',
        logoAlt: 'Oceanides',
        image: '/img/hero-truck.webp',
        imageAlt: 'Puting truck ng Oceanides na nakaparada sa kalye sa Metro Manila',
        // 🔴 PLACEHOLDER. Repdigit-9 on purpose (clients/oceanides/DESIGN.md
        // placeholder rule): an obviously fake number can never be mistaken for
        // a real one. Neil has not given the real number yet. DO NOT DEPLOY
        // with this still here.
        phone: '0999 999 9999',
        phoneLabel: 'Tawag o text, 24 oras',
      },
    },

    // L9 authority. 🔴 Walang proof number tayo (walang testimonial, walang taon
    // sa serbisyo, walang bilang ng naserbisyuhan) at BAWAL mag-imbento
    // (clients/oceanides/DESIGN.md Don'ts). Ang papel ang tanging totoong lever
    // na hawak natin — at ito rin ang moat: hindi makaka-issue ng DENR cert ang crew.
    {
      type: 'socialProofBar',
      props: {
        badges: [
          { src: '/img/badge-denr.webp', alt: 'DENR registered' },
          { src: '/img/badge-bir.webp', alt: 'BIR registered' },
        ],
        line: 'SEC-rehistrado. May BIR official receipt. DENR-partner na tapunan. Ito ang mga papel na hindi kayang ibigay ng karaniwang siphoner.',
      },
    },

    {
      type: 'valueStack',
      props: {
        heading: 'Ano ang kasama sa **₱5,000**',
        items: [
          { label: 'Isang truckload na siphoning, 4 cubic o 4,000 litro' },
          { label: 'Hose hanggang [TANONG KAY BOSS JAY] metro, kasama na' },
          { label: 'Litrato ng tangke nyo bago at pagkatapos, para may pagkumparahan' },
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
      props: {
        heading: 'Ang mga dagdag na itinatago ng iba',
        body: [
          'Lahat ng siphoner may ganitong singil. Kami lang ang naglalagay nito sa page bago ka pa mag-book.',
          'Sobrang hose, ₱100 kada 3 metrong dagdag. Kapag malayo ang mapaparadahan ng truck sa tangke nyo.',
          'Bakbak ng takip, ₱500 hanggang ₱1,000. Kapag nakasarado ang tangke at kailangang buksan. Kasama na ang semento at ang pagsasara ulit pagkatapos.',
          'Pangalawang truckload, ₱5,000 ulit. Kapag hindi kasya sa isa ang laman ng tangke nyo. Sasabihin namin bago pa namin simulan ang pangalawa, hindi pagkatapos.',
          'Yun lang. Wala nang iba. At sasabihin namin bago kami magsimula, hindi habang ginagawa.',
        ],
      },
    },

    // Mechanism (Solution Aware). Ginagamit ang hook na 98.5% retention sa 0:03
    // ng KM-003 — napatunayan nang totoo sa 7,047 na tao.
    {
      type: 'originStory',
      props: {
        heading: 'Hindi barado. Puno na.',
        paragraphs: [
          'Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado.',
          'Puno na ang septic tank. Kaya kahit anong plunger, balik nang balik ang problema. Hindi mo naman kasi inaayos ang totoong dahilan.',
          'Kaya ang tinitingnan namin ay ang tangke, hindi ang toilet. Kapag hindi pa naman puno, sasabihin namin. Uuwi kami. Hindi ka namin pipilitin.',
        ],
      },
    },

    {
      type: 'guarantee',
      props: {
        heading: 'Kung tumaas ang presyo pagdating, kami ang sasagot',
        body: 'Yung presyong sinabi namin sa telepono ay yun din ang babayaran mo. Kung may nakita kaming dagdag na hindi namin nasabi sa iyo, kami ang sasagot doon, hindi ikaw. Ang tanging hindi sakop nito ay kung mali ang sinabi mo sa amin, halimbawa isang tangke ang sinabi mo pero dalawa pala.',
      },
    },

    {
      type: 'faqAccordion',
      props: {
        items: [
          {
            q: 'Hindi ko alam kung nasaan ang septic tank namin. Ano ang gagawin ko?',
            a: 'Normal yan, madalas nangyayari. Tingnan mo muna ang 5 lugar na to: (1) kung saan lumalabas sa pader ang tubo galing sa banyo, (2) parisukat na lubog na lupa o mas berdeng damo sa isang bahagi, (3) semento o tiles na hindi tugma sa paligid, (4) maliit na tubong nakalabas sa lupa, (5) tanungin ang kapitbahay, kasi sa subdivision ay pareho ang plano ng bahay. Kunan mo ng litrato at ipadala sa amin, tutulungan ka naming basahin. Libre yan.',
          },
          {
            q: 'Tenant lang ako. Pwede pa rin ba?',
            a: 'Pwede, pero ang may-ari ang kailangang mag-desisyon kasi sa kanya ang tangke. I-copy mo to at ipadala sa kanya: "Boss, puno na po yung septic tank dito. May nakita akong Oceanides, ₱5,000 lahat-lahat, may resibo at 30-day warranty, at nakasulat ang presyo bago sila magsimula. Pwede po ba nating ipa-schedule?" Kapag sumagot sya, sya na ang mag-book dito.',
          },
          {
            q: 'Bakit ₱5,000 eh may nag-aalok sa akin ng ₱2,500?',
            a: 'Kasi ibang bagay yun. Sa ₱2,500 walang resibo, walang warranty, at hindi mo alam kung saan itinapon ang laman. Karaniwan din na yun ang nagiging ₱4,000 o ₱5,500 pagdating ng truck. May comment nga sa ad namin na ganoon mismo ang nangyari sa kanya. Ang sa amin, ₱5,000 sa page at ₱5,000 pa rin sa dulo.',
          },
          {
            q: 'Paano kung hindi kasya sa isang truckload ang tangke namin?',
            a: 'Kada truckload ang bayad, kaya ₱5,000 ulit ang pangalawa. Ganoon din kahit hindi mapuno ang truck, isang truckload pa rin ang bilang. Pero hindi ka namin gugulatin: bago namin simulan ang pangalawa, sasabihin muna namin sa iyo. Ikaw pa rin ang magdedesisyon.',
          },
          {
            q: 'Ano ang sakop ng 30-day warranty?',
            a: 'Ang bara. Kapag bumalik ang bara sa loob ng 30 araw, babalikan namin. Ang hindi sakop ay kung mapuno ulit ang tangke, kasi nakadepende yun sa dami ng gumagamit. Ang kainan, hotel, o apartment na maraming tao ay mas mabilis talagang mapuno kaysa sa bahay, at hindi yun depekto ng trabaho. Kaya kinukunan namin ng litrato ang tangke bago at pagkatapos, para may pagkumparahan kayo at hindi basta salita lang.',
          },
          {
            q: 'Saan kayo pwede pumunta?',
            a: 'Buong Metro Manila. Kung nasa labas ka ng NCR, mag-message ka pa rin at titingnan namin kung kaya, pero hindi pa namin masisiguro.',
          },
        ],
      },
    },

    { type: 'leadFormSection', props: { heading: 'Mag-book ng schedule' } },

    {
      type: 'psBlock',
      // ⚠️ Walang "P.S." sa simula ng string. Ang PsBlock component mismo ang
      // gumagawa ng label (P.S. / P.P.S. / P.P.P.S.). Kapag inulit mo dito,
      // dumodoble sa page. Nakita ni Neil 2026-07-30.
      props: {
        items: [
          'Kung hindi ka pa handang mag-book, i-save mo na lang tong page. Kapag may nag-quote sa iyo, ihambing mo kung ano ang kasama at kung ano ang dagdag. Yun ang pinakamabilis na paraan para malaman kung tapat sila.',
          'Kung emergency at umaapaw na ngayon, wag ka nang mag-fill ng form. Tumawag ka na diretso sa number sa itaas.',
        ],
      },
    },

    {
      type: 'complianceFooter',
      props: {
        logo: '/img/logo.webp',
        brandLine:
          'Oceanides Plumbing Siphoning & Pest Management Services OPC. SEC, BIR, at DENR na rehistrado.',
        disclaimer:
          'Ang presyong nasa page na to ay para sa residential siphoning sa loob ng Metro Manila. Ang mga dagdag na singil ay nakalista sa itaas at sasabihin bago magsimula ang trabaho.',
      },
    },
  ],

  thankYou: {
    headline: 'Nakuha na namin. Tatawagan ka namin.',
    body: 'Nakalista na ang booking mo. Tatawagan ka namin para kumpirmahin ang oras at ang buong presyo bago pa may pumunta.',
    magnetDelivery: 'Habang naghihintay ka, ito ang gawin mo.',
    steps: [
      'Tatawagan ka namin para sa schedule at sa buong presyo.',
      'Pagdating ng truck, uulitin namin ang presyo bago magsimula.',
      'Pagkatapos, bibigyan ka ng BIR official receipt at ng 30-day warranty.',
    ],
    // L1 — ang thank-you page ay hindi resibo, may susunod na hakbang sya.
    // 🔴 TANONG KAY NEIL: anong number ang ilalagay dito?
    nextStep: {
      label: 'I-save ang number namin',
      href: 'tel:+63',
      blurb: 'I-save mo ito para hindi ka na maghanap kapag may nangyari ulit.',
    },
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
          title: 'Hanapin natin ang tangke nyo. Libre to.',
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
              heading: 'Pagkatapos',
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
