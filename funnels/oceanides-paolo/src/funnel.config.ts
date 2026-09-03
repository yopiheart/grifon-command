import type { FunnelConfig } from './config.types';

// ===========================================================================
// OCEANIDES — PAOLO PAGE  (funnel_id: oceanides-paolo-v1)
//
// Ang B2B na kapatid ng price page. Iisa ang kliyente, iisang DESIGN.md, pero
// ibang avatar at ibang alok: hindi presyo ng sipsip ang binebenta dito, papel.
//
// AVATAR: "Compliance-Pressured Paolo" (clients/oceanides/market-research.md
// §2). May-ari ng karinderya, apartment, opisina, school o warehouse sa Metro
// Manila na may permit renewal o DENR inspection na paparating. Hindi sya si
// Helen: si Helen ay may umaapaw na CR at natatakot malokohin, si Paolo ay may
// inspection at natatakot managot.
//
// AWARENESS (Schwartz): Problem Aware. Ang ad ang bumubuhat ng Unaware papuntang
// Problem Aware (RA 9275 education). Ang page ay nagsisimula na sa pain na
// kilala nya: may papeles syang hinahanapan at wala syang maipapakita.
//
// 🔴 ANG COPY DITO AY VERBATIM MULA SA clients/oceanides/paolo-page-copy.md.
// Yun ang source of truth, hindi ang file na to. Bago baguhin ang kahit anong
// user-visible na string, doon muna, tapos dito.
//
// VOICE: .claude/skills/_shared/taglish-voice.md §LANGUAGE LOCK. Tagalog ang
// frame, English lang sa apat na carve-out. Mas mabigat ang English dito kaysa
// sa page ni Helen dahil totoong English ang pangalan ng mga papel: DENR, LLDA,
// RA 9275, manifest, Certificate of Treatment, official receipt. Kalmado at
// tuyot ang tono, hindi tono ng emergency service. Walang em dash. Walang
// apostrophe sa contraction. Enforced ng scripts/lint-voice.mjs sa `prebuild`.
//
// ===========================================================================
// 🟡 ESTADO: ITAYO, WAG BUKSAN (paolo-page-copy.md §ESTADO)
//
// May DALAWANG SINADYANG BUTAS ang page na to, at nakasulat sila bilang literal
// na placeholder para hindi sila maka-ship nang walang nakakapansin:
//
//   ⟦PENDING · A⟧  ang eksaktong core price kada dokumentadong load. Tantsa pa
//                  lang ang ₱6,000 na bayad sa facility. Nasa hero ticket.
//   ⟦PENDING · B⟧  ang claim na nakapangalan sa kliyente ang certificate.
//                  Pangako pa lang ni Boss Jay, hindi pa kumpirmado ng facility.
//                  Nasa objectionReversal #2 (section 13).
//
// 🔴 WALANG NUMERO AT WALANG CLAIM NA PAPALIT SA KANILA kung hindi pa tapos ang
// tawag sa treatment facility (clients/oceanides/facility-call-script.md,
// Tanong 2 at Tanong 4). Kapag na-deploy na may `⟦PENDING` pa sa page, ang page
// mismo ang magsasabi sayo. May nakasulat na FALLBACK para sa B sa copy doc
// kung kailangan ng internal review bago ang tawag.
//
// I-verify din bago mag-ship: ang eksaktong salitang nasa papel ng LLDA (permit
// ba, clearance, o accreditation), at ang SEC Reg. No. na `TO FOLLOW` pa rin
// mula pa noong 2026-08-01.
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
// palitan ang username kailanman, palitan din ang linyang to.
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
    funnelId: 'oceanides-paolo-v1',
    archetype: 'longform',
    title: 'Oceanides · DENR at LLDA na papel, Metro Manila',
    description:
      'Magsisimula sa bayad na septic check, ₱999. Sa loob ng 48 hours, may hawak ka nang report na may sukat, litrato at pirma. Kapag kailangan mo ng papel para sa buong load, sa DENR-accredited na facility galing ang certificate.',
  },

  // 1:1 sa YAML frontmatter ng clients/oceanides/DESIGN.md v1.0.
  // Mirrored sa src/index.css :root para tama na agad ang first paint.
  // Parehong kliyente at parehong mundo ng page ni Helen, kaya walang binago.
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
    // print world, hindi app world
    rounded: 'sm',
  },

  // ---------------------------------------------------------------------------
  // ANG FORM. Limang qualifier, hindi apat. Alam nating dagdag na friction sya.
  // Kapag bumagsak ang completion rate sa unang 100, ang unang tatanggalin ay
  // `role`, sya lang ang hindi nagbabago ng gagawin natin.
  //
  // 🔧 KULANG ANG FIELD: walang PANGALAN NG NEGOSYO sa `fields` union
  // ('name' | 'email' | 'phone' lang). Sa B2B lead, ang row na walang pangalan
  // ng negosyo ay mahina, at ito mismo ang kailangan sa OR. Ang rekomendasyon sa
  // copy doc ay idagdag ang `'company'` sa shared template. Habang wala pa sya,
  // ang `reassurance` sa ibaba ang panandaliang lunas: itinatanong sa tawag.
  // ---------------------------------------------------------------------------
  form: {
    fields: ['name', 'phone', 'email'],
    headline: 'Mag-book ng septic check',
    ctaLabel: 'Kunin ang septic check ko',
    reassurance:
      'Tatawagan ka namin para sa schedule at para sa pangalan ng negosyo mo sa OR, 8AM hanggang 5PM. Hindi kami mangangako ng bukas kung hindi namin kaya.',
    consent: {
      required: false,
      text: 'Oo, pwede nyo akong tawagan o i-text tungkol sa booking na to. Protektado ang info ko sa ilalim ng Data Privacy Act of 2012 at ng Privacy Policy nyo. Matatawagan pa rin ako para sa schedule kahit hindi ko to i-check.',
      policyVersion: 'funnel-dpa-v1-2026-07',
    },
    qualifiers: [
      // 🆕 ANG BAGONG QUALIFIER. Una sya kasi sya ang router ng thank-you page AT
      // ang pila ni Zam. 15 days ang certificate, kaya ang petsa ng renewal ang
      // nagsasabi kung sino ang tatawagan ngayong hapon at sino sa Lunes. Sya
      // lang ang totoong urgency lever ng buong alok.
      {
        id: 'renewal_window',
        label: 'Kailan ang permit renewal o inspection nyo?',
        options: [
          'Sa loob ng 30 days',
          'Sa loob ng 1 hanggang 3 months',
          'Mahigit 3 months pa',
          'Wala pang schedule, o hindi ko alam',
        ],
        required: true,
      },
      // 🔴 TATLO, HINDI LIMA (2026-08-06, tanong ni Neil: "hindi ba sila
      // tamarin fill up yan?"). Ang panuntunan sa pagpili: ang field ay dapat
      // nagbabago ng GINAGAWA natin, o ng SINASABI natin. Kapag wala sa dalawa,
      // buwis sya sa conversion at nakukuha naman sa tawag sa loob ng sampung
      // segundo.
      //   renewal_window → nagbabago ng ginagawa (pila ni Zam) AT ng sinasabi
      //                    (variant ng thank-you page). Sya ang urgency lever.
      //   city           → nagbabago ng ginagawa nang husto. Isang siyudad muna
      //                    ang ruta (A4), kaya dito nagaganap ang sala.
      //   papers         → nagbabago ng sinasabi sa tawag, at may PANGALAWANG
      //                    trabaho: pinapaharap nya sa tao ang butas nya sa
      //                    mismong sandali ng pag-commit (Cialdini). Huli sya
      //                    kasi dalawang tap na ang nailagak nya bago sya
      //                    dumating dun.
      // TINANGGAL: `establishment` (hula lang sa laki ng tangke) at `role`
      // (sampung segundo sa tawag). Wala sa dalawa ang nagpapabago ng kahit ano
      // bago ang unang tawag.
      { id: 'city', label: 'Saan kayo sa Metro Manila?', options: NCR_CITIES, required: true },
      {
        id: 'papers',
        label: 'May papel ba ang huling pasipsip nyo?',
        options: [
          'Wala, walang naibigay sa amin',
          'Meron, pero resibo lang',
          'Meron, may manifest at certificate',
          'Hindi ko alam',
        ],
        required: true,
      },
    ],
  },

  // 🔴 PATAY ANG PIXEL, SINADYA. Walang campaign na nakaturo sa page na to, at
  // ang hard rule ng funnel-forge ay naka-off ang pixel hanggang may totoong
  // campaign. Ang pixel na tumatakbo sa page na walang traffic ay walang
  // sinasagip na signal at nangongolekta lang ng data ng totoong tao.
  //
  // Kapag may live campaign na nakaturo dito, ito ang laman:
  //     tracking: { metaPixelId: '1050997330667084' }
  // Yun ang dataset na "Oceanides Price Page", ad account 4165212657057538,
  // portfolio "Neil Maglaya" 771158756811875.
  //
  // ⛔ HINDI KAILANMAN ang `1921429268517231`. Yun ang "Grifon Pixel", sariling
  // SaaS pixel ni Neil para sa Grifon app. Ang paghalo ng SaaS signups at ng
  // septic bookings sa isang dataset ay sumisira ng optimization ng dalawa nang
  // sabay at hindi na mahihiwalay pagkatapos. Nakasulat din ang ban sa
  // workflows/ad_performance_ledger.md at sa kuya-marvin/ads/NEXT-SESSION.md.
  //
  // BUILD-TIME to. Kapag binuksan, kailangan ng bagong deploy. Walang env var na
  // mababago sa Vercel dashboard para dito.
  tracking: {},

  sections: [
    // ANG GROUND LADDER (paolo-page-copy.md §"Ang page · 17 section"). Sumusunod
    // sya sa page ni Helen. Isang pagbabago lang: umakyat ang desk sa gitna ng
    // quotation at ng kwento.
    //
    //   arrival                 navy-gradient   hero
    //   papel                   navy-deep       proof strip + kliyente
    //   quotation               paper           risk + ano ang bibilhin
    //   ang desk na pipirmahan  navy-deep       ANG FORM
    //   kwento at pangako       navy            benchmark, mekanismo, garantiya
    //   FAQ                     paper           balik sa quotation stock
    //   huling tulak            navy-deep       orasan, CTA, P.S.
    //   footer                  void            ang ilalim ng page
    //
    // Hindi to binabasa ng section component. Landing.tsx ang nagpipinta ng
    // band, at binabaligtad ng `paper` na ground ang text ladder ng lahat ng
    // nasa loob nya.

    // ---------------------------------------------------------------------
    // 1 · hero
    //
    // Headline: Option A sa copy doc (72%, ang RECOMMENDED). Tugma sa Problem
    // Aware, at ang villain ay GAWI hindi brand (S24 format-enemy, 15 ads / 5
    // brands). Ang B (orasan agad) at ang C (₱200,000 sa headline) ay nakasulat
    // sa copy doc bilang variant, hindi bilang default.
    //
    // ⚠️ HALATANG BASAG ANG TICKET habang `⟦PENDING · A⟧` pa ang laman ng
    // dalawang add-on. Sinadya yun. Wag punan ng numerong hindi pa kumpirmado.
    //
    // 🎨 Dalawang linya lang ang addOns dito, hindi apat, kaya mas mataas ang
    // puti sa loob ng ticket. Wag punan. Ang puwang mismo ang nagsasabing
    // maikli ang listahan.
    // ---------------------------------------------------------------------
    {
      type: 'hero',
      ground: 'navy-gradient',
      props: {
        eyebrow: 'DENR at LLDA na papel · Metro Manila',
        headline: 'Ang huling pasipsip mo, **walang papel**. Yun ang unang hahanapin sa inspection.',
        // S8 audience callout, ang pinakamalakas na pattern sa Swipe File (19
        // ads / 8 brands). Pangalanan ang eksaktong bumibili.
        audience:
          'Para sa restaurant, apartment, building, school at warehouse sa Metro Manila na may permit renewal o DENR inspection na paparating.',
        subhead:
          'Magsisimula sa bayad na septic check, ₱999. Sinusukat namin ang tangke, kinukunan ng litrato, at sa loob ng 48 hours ay nasa yo na ang report na may pirma. Ipa-file mo agad. Kapag kailangan mo ng papel para sa buong load, kami ang kukuha, at sa DENR-accredited na treatment facility galing ang certificate.',
        ctaLabel: 'Kunin ang septic check ko',
        logo: '/img/logo.webp',
        logoAlt: 'Oceanides',
        phone: PHONE,
        phoneLabel: PHONE_LABEL,
        // Hindi ito lumalabas sa hero mismo. Binabasa lang sya ng StickyCta.
        messenger: MESSENGER || undefined,
        ticket: {
          tab: 'Nakasulat na presyo',
          lead: {
            label: 'Septic check + report na may pirma',
            sub: 'May sukat, may litrato, may petsa. Ipa-file mo agad.',
            amount: '₱999',
          },
          // 🔴 ISANG NUMERO LANG ANG TICKET (Neil, 2026-08-01, at inulit nya
          // 2026-08-06 sa page na to). Nasa ticket dati ang ₱12-15k kada load,
          // DALAWANG BESES pa. Ibig sabihin, ang unang nakikita ng bagong
          // bisita ay mga ₱25,000 bago pa nya malaman kung ano ang binibili
          // nya at bago pa natin masabi ang ₱200,000 kada araw na multa.
          // Nag-anchor tayo sa PRESYO NATIN bago sa PANGANIB NIYA. Ang core
          // price ay nasa FAQ na ngayon (parehong F05 na pattern ng DENR cert
          // sa page ni Helen), at ang tunay na sagot ay nasa quotation kasi
          // depende sya sa laki at bilang ng tangke.
          addOnsLabel: 'Kapag kailangan mo ng dokumentadong load:',
          addOns: [
            { label: 'Presyo kada load, depende sa laki at bilang ng tangke', amount: 'Nasa quotation' },
            { label: 'Ang quotation mismo, kasama na sa check', amount: 'Kasama na' },
          ],
          footnote: 'Isang numero lang ang babayaran mo ngayon. ₱999.',
        },
        trustChips: ['SEC Registered', 'DENR-registered hauler', 'LLDA permit', 'BIR official receipt'],
      },
    },

    // ---------------------------------------------------------------------
    // 2 · socialProofBar
    //
    // Bakit numero at hindi selyo (L9, 4 funnels / 3 operators): sa page na ang
    // buong benta ay papel, ang numerong kayang tingnan ng kahit sino ay mas
    // malakas kaysa artwork. May sariling peklat tayo dito. Maling DENR region
    // ang badge artwork noon, at ang maling selyo sa trust page ay mas masama
    // kaysa walang selyo.
    //
    // 🔴 Ang "mahigit 1,000" ay may pinagmulan (Boss Jay, sa pamamagitan ni
    // Neil, 2026-08-01), hindi imbento. Wag palitan ng numerong mukhang eksakto.
    // ---------------------------------------------------------------------
    {
      type: 'socialProofBar',
      ground: 'navy-deep',
      props: {
        line: 'Mahigit 1,000 na tangke na ang na-service namin sa Metro Manila. SEC Registered, may DENR hauler registration, may LLDA permit, at may MOA sa treatment facility na tinatanggap ng DENR. Ito ang mga papel na hindi kayang ibigay ng pasipsip na tinatawagan mo ngayon.',
        receipts: [
          { label: 'DENR Certificate of Treatment No.', value: 'BEHMC(1)WHN0095001WW260318' },
          { label: 'DENR ID No.', value: 'OL-TR-R3-14-000080' },
          { label: 'BIR TIN (Non-VAT)', value: '260-084-087-00000' },
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 3 · clientsMarquee
    //
    // Mas mabigat ito kay Paolo kaysa kay Helen. Kay Helen, ang ibig sabihin
    // nito ay "may ibang nagtiwala." Kay Paolo: "pumasa na kami sa procurement
    // at sa admin ng mga kompanyang mas mahigpit kaysa sayo." (S16 borrowed
    // authority, 18 ads / 6 brands.)
    //
    // 🔴 PANGALAN LANG, WALANG LOGO. Wala tayong karapatan sa artwork nila, at
    // print world to. Verbatim mula sa company profile deck ng Oceanides.
    // "Papa Johns" na walang apostrophe, house rule sa typography.
    // ---------------------------------------------------------------------
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

    // ---------------------------------------------------------------------
    // 4 · objectionReversal
    //
    // Dito nakaupo ang buong risk. Isang section lang, tuyot, walang drama.
    //
    // ⚠️ Ang `₱200,000 kada araw` lang ang numerong ligtas. Nasa batas mismo sya
    // (RA 9275 Sec. 28 ceiling). Ang mga tiyak na schedule ng multa sa EMB
    // practice (halimbawa ang ~₱23.5k initial assessment) ay WAG ilagay sa page
    // kung hindi pa na-verify sa DENR-EMB o PAB.
    //
    // 🎨 `paper` ground, walang icon, walang hazard band. Mukhang MEMO ang
    // section na to, hindi ad. Ang isang `==highlight==` sa unang linya lang ang
    // kulay sa buong section.
    // ---------------------------------------------------------------------
    {
      type: 'objectionReversal',
      ground: 'paper',
      props: {
        heading: 'Sino ang mananagot kapag na-trace ang tapunan',
        body: [
          'Ikaw. ==Ikaw ang generator ng waste, kaya ikaw ang mananagot, kahit iba ang kumuha nun sayo.== Ganon nakasulat sa RA 9275, ang Clean Water Act.',
          'Kaya ang tanong sa inspection ay hindi kung may nagsipsip ba. Ang tanong ay saan napunta, at ano ang maipapakita mong papel.',
          'Kapag walang manifest, walang certificate, at hindi mo alam kung saan itinapon, ang natitira mo na lang na sagot ay ang pangalan ng taong tinawagan mo. Hindi yun papel.',
          'Ang multa sa ilalim ng RA 9275 ay umaabot ng ₱200,000 kada araw ng violation. Nakasulat yan sa batas mismo, Section 28. Hindi ito banta. Sya ang dahilan kung bakit may hinihinging papel sayo.',
          'Ang totoong risk ay hindi ang multa. Sya ay ang hindi mo malaman na wala ka palang papel hanggang sa may humingi na.',
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 5 · valueStack
    //
    // Bakit "48 hours" at hindi "sa mismong araw": manwal muna ang unang mga
    // report, at ang pangakong hindi natin kayang panindigan ay sya ring unang
    // sisira ng buong page. Ang 48 hours ay may lubag, at mabilis pa rin.
    //
    // 🔴 HATI ANG REPORT: pahina 1-2 = tuyot na assessment (yun ang ipa-file
    // nya), pahina 3 = ang alok. Kapag hinaluan ng urgency ang assessment,
    // brochure na sya, at yun mismo ang credibility na binabayaran nya. Build
    // rule ito, hindi copy line, pero dito sya nakasulat kasi dito sya
    // naipapangako.
    // ---------------------------------------------------------------------
    {
      type: 'valueStack',
      ground: 'paper',
      props: {
        heading: 'Ano ang kasama sa **₱999**',
        items: [
          { label: 'Pagsukat ng tangke mo: laki, ilan, at gaano na kapuno' },
          { label: 'Litrato ng tangke, ng takip, at ng paligid' },
          { label: 'Nakasulat na assessment kung ano ang lagay nya ngayon' },
          { label: 'Ang gap mo sa RA 9275, nakalista' },
          { label: 'Pirmado at may petsang report, sa loob ng 48 hours' },
          { label: 'Quotation para sa dokumentadong load, kung kailangan mo sya' },
          { label: 'BIR official receipt para sa ₱999' },
        ],
        // Ang lumang linya dito ay "Isang presyo, hindi range." ⛔ Kay HELEN yun.
        // Sya ang sagot sa siphoner na nagko-quote ng range tapos nanggugulat
        // pagdating. Hindi ganon ang laban ni Paolo, at mas masama pa: ang core
        // NIYA ay totoong range (depende sa laki at bilang ng tangke), kaya
        // kokontrahin nya ang FAQ sa ibaba ng parehong page. Ang trabaho ng
        // linyang to ay gawing SIMULA ang ₱999, hindi bilihin.
        totalLine: '₱999 kada visit. Dito nagsisimula ang papeles mo.',
      },
    },

    // ---------------------------------------------------------------------
    // 6 · leadFormSection. ANG FORM: pang-6 sa 17, hindi pang-14.
    //
    // Kaagad pagkatapos ng value stack, bago ang buong kabanata ng objection,
    // kwento, garantiya at FAQ. Ang naunang limang section ay isang buong
    // argumento na: pinangalanan ang pain (1), pinatunayan ang papel (2),
    // pinatunayan na may ibang nagtiwala (3), sinukat ang risk (4), at inilista
    // kung ano ang bibilhin (5). Ang hindi pa handa ay tuloy lang sa pagbabasa,
    // at ang bawat CTA sa ibaba ay bumabalik sa parehong form.
    //
    // ⚠️ DESISYON ITO, HINDI SUKAT. Wala pang `FormViewed` data, hindi pa
    // naka-deploy ang event noong pinatay ang campaign. I-ship ang `FormViewed`
    // sa page na to mula araw uno, at sa unang 100 bisita malalaman kung
    // kailangan pa syang itaas o ibaba.
    //
    // ⛔ ISANG FORM LANG. May dev warning sa Landing.tsx na eksaktong isa ang
    // inaasahan. Ang mga CTA sa ibaba ay `ctaBlock`, hindi pangalawang form (L8,
    // isang anchor, maraming button).
    //
    // Isang heading lang ang lumalabas: pinapatay ng LeadFormSection ang
    // headline sa loob ng card kapag may section-level `heading`.
    //
    // 🎨 Ito ang unang `navy-deep` na kabanata pagkatapos ng dalawang `paper` na
    // section. Ang paglipat mismo ng stock ang nagsasabing dumating ka na sa
    // desk. Wag maglagay ng divider, wag maglagay ng "STEP 1 OF 2".
    // ---------------------------------------------------------------------
    { type: 'leadFormSection', ground: 'navy-deep', props: { heading: 'Mag-book ng septic check' } },

    // ---------------------------------------------------------------------
    // 7 · costOfDelay bilang dalawang-hanay
    //
    // Ang benchmark laban sa suki. Ginagamit ang `costOfDelay` bilang generic na
    // komparison. Config lahat ang teksto, at ang amber ay nasa PANGALAWANG
    // hanay, kaya doon dapat ang sa atin. Ligtas ang paulit-ulit na section
    // type: naka-key sa `${type}-${index}` ang Landing.tsx.
    //
    // ⚠️ Ang ₱6,000 dito ay HINDI ang core price, sya ang gastos sa facility, at
    // ang paglalantad nya ang buong argumento. Kung magbago sya sa tawag,
    // MAGBABAGO RIN ANG LINYANG ITO, hindi lang ang `⟦PENDING · A⟧` sa hero.
    // ---------------------------------------------------------------------
    {
      type: 'costOfDelay',
      ground: 'navy',
      props: {
        eyebrow: 'Bago ka maghambing',
        heading: 'May suki ka nang mas mura. **Alam namin.**',
        body: [
          'At hindi ka namin sisisihin dun. Mas mura talaga sya, kasi may hindi sya binabayaran.',
          'Ang ₱6,000 kada load na binabayad sa treatment facility ay ang pinakamalaking gastos sa buong trabaho. Ang siphoner na hindi dumadaan dun ay may ₱6,000 na dagdag kada byahe. Doon galing ang murang presyo.',
        ],
        compare: {
          nowLabel: 'Ang mas murang pasipsip',
          nowItems: [
            'Walang manifest. Walang mapapatunayan kung saan napunta.',
            'Walang certificate galing sa treatment facility.',
            'Karaniwang personal na resibo, hindi BIR official receipt.',
            'Kapag na-inspect ka, ikaw pa rin ang mananagot. Ang tinipid mo ay nasa yo pa rin.',
          ],
          laterLabel: 'Ang dokumentadong load',
          laterItems: [
            'May manifest na may pangalan mo.',
            'May Certificate of Treatment galing sa DENR-accredited na facility.',
            'May BIR official receipt na maipapasok mo sa libro.',
            'May maipapakita ka kapag may humingi.',
          ],
        },
        close:
          'Hindi mura ang mura kapag ikaw pa rin ang mananagot. ==Ang binabayaran mo dito ay ang papel, hindi ang sipsip.==',
      },
    },

    // ---------------------------------------------------------------------
    // 8 · originStory
    //
    // Ang mekanismo. Dito nabubuhay ang 15 days, bilang paliwanag at hindi
    // bilang palusot.
    //
    // 🔴 ANG 15 ARAW AY NAKA-PRINT SA PAGE NANG SINADYA. Sya ang pinakamalaking
    // kahinaan ng alok at sya rin ang pinakamalakas na patunay na totoo ang
    // daan. Ang siphoner na kayang maglabas ng certificate bukas ay hindi
    // dumaan sa facility. Aminin ang mabagal, at nagiging patunay sya.
    //
    // ⛔ Bawal ang puting truck na asul, walang ganong truck ang Oceanides.
    // ---------------------------------------------------------------------
    {
      type: 'originStory',
      ground: 'navy',
      props: {
        heading: 'Paano nagiging papel ang laman ng tangke mo',
        paragraphs: [
          'Kinukuha ng truck ang laman ng tangke mo at diretsong dinadala sa treatment facility na tinatanggap ng DENR. Doon sya tinitimbang at ginagamot. Hindi sya itinatapon sa ilog, sa bakanteng lote, o sa kanal sa kabilang bayan.',  // voice-ok: sadyang ritmo ng tatlo (ilog, lote, kanal), sisirain sya ng particle
          'Kapag naproseso na, doon lumalabas ang certificate. ==15 days ang normal na hintay, at yun ang totoo.== Hindi namin sya kayang bilisan, at hindi rin namin sya bibilisan para lang may maisagot sayo.',
          'Kaya kung Setyembre ang renewal mo, ngayong Agosto dapat magsimula. Hindi kasi ang truck ang mabagal. Ang papel ang may sariling orasan.',
        ],
        image: '/img/hero-truck.webp',
        imageAlt: 'Puting truck ng Oceanides na nakaparada sa kalye sa Metro Manila',
      },
    },

    // ---------------------------------------------------------------------
    // 9 · guarantee #1, ang presyo
    //
    // ⚠️ ANG `chips` AY AUDIT ROW, HINDI DEKORASYON. Bawat isa ay may kaukulang
    // linya sa itaas ng page. Kapag nagdagdag ka dito ng walang pinagmulan, ang
    // totoong anim ay nasisira kasama nya.
    //
    // 🔴 WALANG STAR RATING AT WALANG REVIEW COUNT. Zero pa ang totoong review
    // ng brand na to, at hard ban ang pekeng proof sa clients/oceanides/DESIGN.md.
    // ---------------------------------------------------------------------
    {
      type: 'guarantee',
      ground: 'navy',
      props: {
        eyebrow: 'Ang unang pangako',
        heading: 'Ang presyo sa quotation ay ang presyo sa invoice',
        seal: { value: '₱0', unit: 'DAGDAG', label: 'Kung hindi namin nasabi' },
        body: 'Bago pumasok ang truck, may nakasulat kang quotation: ilang load, magkano kada load, ano ang kasama. ==Kung may nakita kaming dagdag na hindi namin nasabi sayo, kami ang sasagot doon, hindi ikaw.== Ang hindi lang sakop nito ay kung mali ang sinabi mo sa amin, halimbawa isang tangke ang sinabi mo pero dalawa pala.',
        chips: [
          'Nakasulat na quotation bago magsimula',
          'BIR official receipt',
          'DENR-accredited na tapunan',
          'Manifest na may pangalan mo',
          'SEC Registered',
          'Walang bayad bago kayo magkasundo sa presyo',
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 10 · guarantee #2, ang credit rule
    //
    // Ito ang pumapatay sa pinakamahal na kaso at sa pinakamadaling pagmulan ng
    // chargeback.
    //
    // Bakit credit at hindi cash: ₱1,100 na ang nagastos bago pa dumating ang
    // tao (inspector ₱500 + transport ₱600). Ang cash refund ay ₱999 pa na labas
    // sa ibabaw nun. Ang credit ay panalo pa rin sa tao, nasa yo pa rin ang
    // pera, at nawawala ang pinakamahinang linya na sya ring pinakamadaling
    // pagmulan ng reklamo. ⛔ Bawal ang cash refund.
    //
    // Cialdini, admit-against-interest: ang "kada load kami kumikita" ay
    // pag-amin ng sarili nating interes, at yun ang nagpapaniwala sa linyang
    // katabi nya.
    // ---------------------------------------------------------------------
    {
      type: 'guarantee',
      ground: 'navy',
      props: {
        eyebrow: 'Ang pangalawang pangako',
        heading: 'Kung hindi pa kailangan ng sipsip, **sasabihin namin**.',
        seal: { value: '1', unit: 'TAON', label: 'Bisa ng credit mo' },
        body: 'Minsan hindi pa naman puno ang tangke, at hindi mo pa talaga kailangan ng load. Sasabihin namin yun sayo, nakasulat pa rin sa report. ==Hindi masusunog ang ₱999 mo. Nagiging credit sya sa sipsip pagdating ng panahon, isang taon ang bisa.== Kada load kami kumikita, kaya alam mo kung gaano kabigat sa amin ang linyang to. Nakasulat pa rin sya dito.',
      },
    },

    // ---------------------------------------------------------------------
    // 11 · fieldInspector
    //
    // 🔴 May pirmadong consent si Gabriel at aprubado ang mga litrato (Neil,
    // 2026-08-01). Parehong gate ito ng lahat ng plate ni Marvin. WALANG MUKHA
    // NG TAO ANG LUMALABAS NANG WALA NITO.
    //
    // 🎨 Ang salitang PIPIRMA ang buong trabaho ng section na to. Kay Helen, ang
    // tanong ay "sino ang papasok sa bakuran ko." Kay Paolo, ang tanong ay
    // "kanino nakapangalan ang papel na ipapasa ko."
    // ---------------------------------------------------------------------
    {
      type: 'fieldInspector',
      ground: 'navy',
      props: {
        eyebrow: 'Sino ang darating',
        heading: 'Si **Marvin** o si **Gabriel** ang pipirma sa report mo',
        body: [
          'Sila ang field inspector namin. Sila ang susukat ng tangke mo, sila ang kukuha ng litrato, at sila ang pipirma sa report na ipa-file mo.',
          'Kapag may tanong ka habang nandyan sila, sila ang kausapin mo. Hindi ka namin ipapasa sa iba.',
        ],
        image: '/img/marvin.webp',
        imageAlt: 'Si Marvin, field inspector ng Oceanides',
        name: 'Marvin',
        role: 'Field Inspector',
        second: {
          image: '/img/gabriel.webp',
          imageAlt: 'Si Gabriel, field inspector ng Oceanides',
          name: 'Gabriel',
          role: 'Field Inspector',
        },
      },
    },

    // ---------------------------------------------------------------------
    // 12 · faqAccordion
    //
    // 🔴 ANG FAQ #4 ANG PINAKAMAHALAGANG LINYA SA BUONG PAGE. Sya lang ang lugar
    // kung saan tayo tumatanggi sa pera. Ang huling pangungusap ("mas mabuting
    // sa iba ka na lang kumuha") ay hindi bravado, sya ang nagpapaniwala sa
    // bawat claim sa itaas nya. WAG SYANG PALAMBUTIN.
    //
    // ⚠️ May kulang na FAQ dito, at sinadya: "kanino nakapangalan ang
    // certificate?" Sya ang `⟦PENDING · B⟧` sa section 13.
    // ---------------------------------------------------------------------
    {
      type: 'faqAccordion',
      ground: 'paper',
      props: {
        heading: 'Mga **tanong** na madalas itanong',
        items: [
          {
            q: 'Anong papel ba talaga ang matatanggap ko?',
            a: 'Dalawa, at magkaiba sila. Una, ang report namin sa septic check: sukat, litrato, assessment, pirma, petsa. Nasa yo yun sa loob ng 48 hours. Pangalawa, kapag nagpakuha ka ng dokumentadong load: ang manifest at ang Certificate of Treatment galing sa treatment facility. Ang manifest ay lumalabas kasabay ng trabaho. Ang certificate ay 15 days.',  // voice-ok: FAQ na sagot tungkol sa papel, listahan sya at hindi kwento
          },
          // 🆕 ANG PRESYO NG CORE, INILIPAT DITO MULA SA HERO TICKET
          // (2026-08-06). Parehong F05 na pattern ng DENR cert sa page ni
          // Helen: presyo sa loob ng FAQ, pagkatapos ng value stack. Ang taong
          // naghahanap ng numero ay hahanapin nya sya. Ang taong hindi pa alam
          // kung ano ang binibili nya ay hindi dapat sya ang unang nakikita.
          {
            q: 'Magkano ang dokumentadong load?',
            a: '⟦PENDING · A⟧ kada load, at nagbabago sya sa laki at bilang ng tangke mo. Kaya nga may check muna: pagkatapos naming sukatin, may nakasulat kang quotation na nagsasabi kung ilang load talaga ang kailangan mo at kung magkano lahat. Kasama na yun sa ₱999. Hindi ka namin bibigyan ng numero ngayon na babaguhin namin pagdating ng truck.',
          },
          {
            q: 'Bakit 15 days ang certificate? May mas mabilis ba?',
            a: 'Wala, at hindi rin namin sya ipapangako. Ang certificate ay galing sa treatment facility, hindi sa amin. Pagkatapos nilang tanggapin at gamutin ang laman, doon lang sya lumalabas. Yung 15 days na yun mismo ang patunay na dumaan nga sa tamang daan. Kung may nag-aalok sayo ng certificate bukas, tanungin mo kung saan dumaan.',
          },
          {
            q: 'May suki na kaming pasipsip. Mas mura sila. Bakit kami lilipat?',
            a: 'Wag mo silang tanggalin. Tanungin mo lang sila ng dalawang bagay: saan itinatapon, at may maibibigay ba silang manifest at certificate. Kung meron, mabuti, mas mura sila at wala kang problema. Kung wala, ang tinipid mo ay nasa yo pa rin, kasi ikaw pa rin ang generator at ikaw pa rin ang mananagot sa RA 9275. Ang isang inspection lang ang layo nyan.',
          },
          {
            q: 'Pwede bang yung ilan lang sa loads namin ang idokumento? Para makatipid.',
            a: 'Hindi kami papayag. At sasabihin ko sayo nang diretso kung bakit, kahit alam kong may ibang papayag: ang papel na hindi sumasakop sa lahat ng load ay hindi proteksyon. Ikaw pa rin ang generator ng lahat ng yun. At may hawak ka pang papel na nagsasabing ayos ka, kaya hindi ka na maghahanap ng totoong solusyon. Yun ang mas malala kaysa sa walang papel. Kapag ganon ang hanap mo, mas mabuting sa iba ka na lang kumuha.',
          },
          {
            q: 'May official receipt ba? Kailangan namin sya sa libro.',
            a: 'Meron. BIR official receipt, nakapangalan sa negosyo mo, at ibinibigay kasabay ng report ng field inspector. Isang pagdating, hindi dalawa. Non-VAT kami, at nasa taas ng page ang TIN namin.',
          },
          {
            q: 'Saan kayo pumupunta?',
            a: 'Buong Metro Manila. May mga araw na iisang lugar lang kami para masiksik ang ruta, kaya kung hindi agad ang schedule mo, yun ang dahilan. Kung nasa labas ka ng NCR, mag-message ka pa rin at titingnan namin, pero hindi pa namin masisiguro.',
          },
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 13 · objectionReversal #2 · ⟦PENDING · B⟧
    //
    // 🔴 HINDI PA PUWEDENG I-SHIP ANG SECTION NA TO. Nakasalalay sya sa Tanong 4
    // ng clients/oceanides/facility-call-script.md: kanino ba talaga nakapangalan
    // ang manifest at ang Certificate of Treatment, sa kliyente o sa Oceanides?
    // Pangako pa lang ni Boss Jay, hindi pa kumpirmado ng facility mismo.
    //
    // Bakit hindi pwedeng manghula: ang buong bagay na binibili ni Paolo ay
    // PAPEL NA MAY PANGALAN NYA. Kung sa Oceanides pala nakapangalan ang
    // certificate, hindi sya walang halaga, pero IBANG PRODUKTO NA SYA, at ibang
    // copy, at posibleng ibang presyo. Ito ang isang claim sa page na hindi
    // pwedeng mali kahit isang beses.
    //
    // FALLBACK habang wala pa ang sagot, nakasulat sa paolo-page-copy.md. Ito
    // lang ang pwedeng mabuhay sa page bago ang tawag, at PALITAN ANG DALAWANG
    // LINYA SA IBABA, hindi dagdag:
    //
    //   "Ang manifest ay may pangalan ng negosyo mo, at sya ang katunayan na sa
    //   DENR-accredited na facility napunta ang waste mo. Sabihin mo lang sa
    //   amin kung ano ang eksaktong hinihingi sayo, at titingnan natin kung ano
    //   ang kaya naming ilabas."
    // ---------------------------------------------------------------------
    {
      type: 'objectionReversal',
      ground: 'paper',
      props: {
        heading: 'Kanino nakapangalan ang papel',
        body: [
          '⟦PENDING · B⟧ Sa negosyo mo naman nakapangalan ang manifest at ang Certificate of Treatment, hindi sa amin. Ikaw ang generator, kaya ang papel ay dapat nagsasabi ng pangalan mo.',
          '⟦PENDING · B⟧ Ibig sabihin nun, kapag may humingi sayo ng patunay, hindi mo kailangang tumawag muna sa amin. Nasa yo na sya.',
          'Ang hinahanap sa inspection ay hindi kung sino ang kumuha. Ang hinahanap kasi ay kung saan napunta ang waste mo, at ano ang katunayan nun.',
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 14 · costOfDelay #2, ang orasan
    //
    // Ang huling argumento bago ang CTA. ANG SCARCITY DITO AY TOTOO: hindi
    // tumataas ang presyo, ang kalendaryo lang ang gumagalaw. Yun lang ang
    // scarcity sa buong page.
    //
    // ⛔ Walang countdown, walang "limited slots", walang "tataas ang presyo."
    // Hindi sila totoo, at hard ban sila sa clients/oceanides/DESIGN.md.
    // ---------------------------------------------------------------------
    {
      type: 'costOfDelay',
      ground: 'navy-deep',
      props: {
        eyebrow: 'Ang orasan',
        heading: 'Hindi tumataas ang presyo. **Ang petsa ang gumagalaw.**',
        body: [
          'Wala kaming countdown dito at walang diskwentong mawawala mamaya. Pareho pa ring presyo sa susunod na buwan.',
          'Ang nagbabago lang ay kung ilang araw na lang ang natitira bago ang renewal mo. 15 days ang certificate, at hindi sya nagmamadali kahit ikaw ay nagmamadali na.',
        ],
        compare: {
          nowLabel: 'Kapag ngayon ka nag-book',
          nowItems: [
            'May report ka sa loob ng 48 hours. Kahit hindi ka pa magpasipsip, may naipa-file ka na.',
            'Kasya pa ang 15 days bago ang renewal mo.',
            'Ikaw ang pumipili ng araw kung kailan papasok ang truck.',
          ],
          laterLabel: 'Kapag may humingi na',
          laterItems: [
            'Kulang na ang 15 days, at walang mabibilis dun.',
            'Kung ano ang makuha mo, yun na. Wala ka nang oras mamili.',
            'Dyan mismo nagsisimula ang pag-iisip ng papel na hindi totoo. Doon nagsisimula ang mas malaking problema.',
          ],
        },
        close:
          'Walang mawawala sayo kapag naghintay ka, maliban sa araw. ==At ang araw lang naman ang hindi kayang bilisan ng kahit sinong siphoner.==',
      },
    },

    // ---------------------------------------------------------------------
    // 15 · ctaBlock
    //
    // L8, isang anchor. Lahat ng button sa page ay `#lead-form`, walang
    // pangalawang alok at walang pangalawang form.
    // ---------------------------------------------------------------------
    {
      type: 'ctaBlock',
      ground: 'navy-deep',
      props: {
        label: 'Kunin ang septic check ko',
        urgency: 'Bumabalik ka sa form sa itaas. Isang minuto lang sya.',
      },
    },

    // ---------------------------------------------------------------------
    // 16 · psBlock, F01 P.S. ladder
    //
    // ⚠️ Walang "P.S." sa simula ng string. Ang PsBlock component mismo ang
    // gumagawa ng label (P.S. / P.P.S. / P.P.P.S.). Kapag inulit mo dito,
    // dumodoble sa page.
    //
    // ANG PANGATLONG P.S. ANG PINAKA-MAHALAGA. Ang headline-then-P.S. na reader
    // ang pangalawang pinakamalaking grupo (Suby), at ang pinakamasakit na
    // katotohanan ng alok ay nakasulat dun nang buo. Ang pag-amin sa dulo ang
    // nagpapatibay sa lahat ng nasa itaas.
    // ---------------------------------------------------------------------
    {
      type: 'psBlock',
      ground: 'navy-deep',
      props: {
        items: [
          'Yung pangako namin sa presyo, totoo: kung may dagdag na hindi namin nasabi sa quotation, kami ang sasagot, hindi ikaw. Nakasulat yan sa taas, hindi lang salita sa telepono.',
          'Kung hindi mo pa kailangan ngayon, i-save mo na lang tong page. Kapag may nagkuwento sayo ng mas murang pasipsip, dalawang tanong lang: saan itatapon, at may manifest ba. Yun ang pinakamabilis na paraan para malaman kung papel ba talaga ang binabayaran mo.',
          'Kung wala pang 15 days ang renewal o inspection mo, mag-message ka pa rin, pero sasabihin ko na agad: hindi aabot ang certificate. Ang kaya naming ibigay ay ang septic check at ang report, at ang simula ng tamang daan para sa susunod. Mas mabuting marinig mo yan ngayon kaysa sa ikatlong linggo.',
        ],
      },
    },

    // ---------------------------------------------------------------------
    // 17 · complianceFooter
    //
    // ANG HULING PINTO. Ang nakarating dito na hindi nag-form at hindi tumawag
    // ay hindi talunan, may tanong lang sya na walang sumagot. Nakalimbag na
    // numero at Messenger, bago ang legal.
    // ---------------------------------------------------------------------
    {
      type: 'complianceFooter',
      ground: 'void',
      props: {
        logo: '/img/logo.webp',
        contactLine: 'May tanong bago ka mag-book? Nandito kami.',
        phone: PHONE,
        phoneLabel: PHONE_LABEL,
        messenger: MESSENGER || undefined,
        links: [{ label: 'Privacy Policy', href: '/privacy' }],
        brandLine:
          'Oceanides Plumbing Siphoning & Pest Management Services OPC. Registered sa SEC at BIR.',
        disclaimer:
          'Ang ₱999 ay para sa septic check at report sa loob ng Metro Manila. Ang presyo ng dokumentadong load ay depende sa laki at sa bilang ng load, at nakasulat sya sa quotation bago magsimula. Ang Certificate of Treatment ay galing sa treatment facility at 15 days ang karaniwang hintay.',
      },
    },
  ],

  // =========================================================================
  // ANG THANK-YOU PAGE
  //
  // Naka-route sa `renewal_window`. Ang bagong qualifier ang nagdedesisyon kung
  // anong handout ang lalabas. DITO UNANG SINASABI ANG PINAKAMAHIRAP NA
  // KATOTOHANAN, at sinadya yun: kung wala pang 15 days ang renewal nya, hindi
  // aabot ang certificate. Mas mabuting marinig nya yun dito kaysa sa ikatlong
  // linggo.
  //
  // ⚠️ ANG SUSI NG BAWAT VARIANT AY DAPAT BYTE-FOR-BYTE NA KATUMBAS NG OPTION
  // STRING SA `renewal_window` sa itaas. Kapag hindi tugma, tahimik na
  // bumabagsak ang page sa `fallback` at walang magsasabi sa atin.
  // =========================================================================
  thankYou: {
    eyebrow: 'BOOKING CONFIRMED',
    headline: 'Nakuha na namin. Tatawagan ka namin.',
    body: 'Nakalista na ang septic check mo. Tatawagan ka namin para sa schedule at para sa pangalan ng negosyo mo sa OR.',  // voice-ok: kapareho ng reassurance sa :139, transactional confirmation
    magnetDelivery: 'Habang naghihintay ka, ito ang ihanda mo.',
    stepsHeading: 'Ito ang susunod na mangyayari',
    steps: [
      'Tatawagan ka namin para sa schedule. 8AM hanggang 5PM kami tumatawag, kaya kung gabi ka nag-book, bukas ng umaga ang tawag.',
      'Susukatin at kukunan ng litrato ni Marvin o ni Gabriel ang tangke mo. Mga isang oras lang sya.',
      'Sa loob ng 48 hours, nasa email mo na ang report na may pirma. Kasama na ang quotation kung kailangan mo ng dokumentadong load.',
    ],
    nextStep: {
      label: 'I-save ang number namin',
      href: 'tel:+639352589927',
      blurb: 'I-save mo ito para hindi ka na maghanap kapag may humingi na ng papel sayo.',
    },
    phone: PHONE,
    phoneLabel: PHONE_LABEL,
    magnet: {
      qualifierId: 'renewal_window',
      fallback: 'Wala pang schedule, o hindi ko alam',
      variants: {
        'Sa loob ng 30 days': {
          title: 'Mahigpit ang oras mo. Ito ang totoo.',
          blocks: [
            {
              heading: 'Basahin mo to bago pa tayo mag-usap',
              body: [
                '15 days ang certificate mula sa treatment facility, at hindi namin sya kayang bilisan. Kung wala pang 15 days ang inspection mo, hindi sya aabot. Sinasabi ko na sayo ngayon para hindi ka umasa.',
                'Ang kaya naming ibigay bago yun: ang septic check at ang pirmadong report, at ang manifest kapag napasipsip agad. Sa maraming inspection, malaking pagkakaiba na yun kumpara sa walang maipapakita.',
                'Kapag inuna ka namin sa pila, doon galing yun sa sagot mong to.',
              ],
            },
            {
              heading: 'Ihanda mo na habang naghihintay',
              body: [
                'Ang eksaktong pangalan ng negosyo mo at ang TIN, para tama agad ang OR at ang manifest.',  // voice-ok: noun-phrase na list item sa ihanda-mo checklist, hindi pangungusap
                'Kung ano ang eksaktong hinihingi sayo. Kunan mo ng litrato ang notice o ang checklist kung meron, at ipadala mo sa amin.',
                'Kung may papel ang huling pasipsip nyo, ihanda mo. Kung wala, sabihin mo lang, mas madalas yun kaysa sa akala mo.',
              ],
            },
          ],
        },
        'Sa loob ng 1 hanggang 3 months': {
          title: 'Tama ang timing mo.',
          blocks: [
            {
              heading: 'Bakit tama',
              body: [
                '15 days ang certificate mula sa treatment facility. Sa loob ng 1 hanggang 3 months, sobra-sobra pa yun, kaya walang magmamadali, at ikaw pa ang pipili ng araw.',
                'Ito rin ang pagkakataong makita kung ilang load talaga ang kailangan bago pa dumating ang deadline. Mas mura yun kaysa sa mahulaan sa huling linggo.',
              ],
            },
            {
              heading: 'Ihanda mo na',
              body: [
                'Ang eksaktong pangalan ng negosyo mo at ang TIN, para tama agad ang OR at ang manifest.',  // voice-ok: noun-phrase na list item sa ihanda-mo checklist, hindi pangungusap
                'Linisin ang daanan papunta sa takip ng tangke, at tingnan kung saan pwedeng pumarada ang truck.',
                'Kung may papel ang huling pasipsip nyo, ihanda mo. Kung wala, sabihin mo lang.',
              ],
            },
          ],
        },
        'Mahigit 3 months pa': {
          title: 'Maaga ka, at mabuti yun.',
          blocks: [
            {
              heading: 'Ito ang gagawin natin',
              body: [
                'Susukatin namin ang tangke mo at bibigyan ka ng report ngayon, kahit malayo pa ang renewal. Ang report na yun ang magsasabi kung kailan ka talaga dapat magpasipsip, hindi ang kalendaryo.',
                'Kapag hindi pa kailangan ng load, sasabihin namin at hindi ka namin pipilitin. Nagiging credit ang ₱999 mo, isang taon ang bisa.',
              ],
            },
            {
              heading: 'Ihanda mo na',
              body: [
                'Ang eksaktong pangalan ng negosyo mo at ang TIN, para tama agad ang OR.',
                'Kung alam mo kung kailan ang huling pasipsip nyo, sabihin mo. Yun ang pinakamabilis na paraan para matantsa kung gaano na kapuno.',
              ],
            },
          ],
        },
        'Wala pang schedule, o hindi ko alam': {
          title: 'Ayos lang. Simulan natin sa pagtingin.',
          blocks: [
            {
              heading: 'Ang unang hakbang',
              body: [
                'Marami palang establisyimento ang may hinihinging papel na hindi nila alam kung hindi pa sila tinatanungan. Kaya ang unang gagawin natin ay tingnan ang lagay ng tangke mo at isulat sya.',
                'Sa report na yun, makikita mo kung ano ang meron ka at ano ang kulang, bago pa may tumanong.',
              ],
            },
            {
              heading: 'Ihanda mo na',
              body: [
                'Ang eksaktong pangalan ng negosyo mo at ang TIN, para tama agad ang OR.',
                'Kung may natatandaan kang huling pasipsip at may naibigay silang papel, ihanda mo. Kung wala, sabihin mo lang.',
                'Kung may notice o checklist na naibigay sayo kahit kailan, kunan mo ng litrato at ipadala.',
              ],
            },
          ],
        },
      },
    },
  },
};
