const sourceRoot = 'clients/oceanides/assets/';
const archiveContext = {
  source: 'funnels/oceanides-price-page/scripts/build-assets.mjs',
  attestation: 'Neil confirmed the tb2-ba2 and tb2-ba3 pairs were real job photos on 2026-08-01 ("totoo yan").',
  conflict: 'Earlier daily-post documentation described these assets as AI. The later direct attestation is recorded, but original camera files remain with Boss Jay and were not independently inspected here.',
  timing: 'Historical archive. Actual job dates and locations are not verified. No current service availability is implied.',
};

export const posts = [
  {
    id: '01',
    slug: '01-paulit-ulit-ang-bara',
    family: 'problem',
    title: 'PAULIT-ULIT ANG BARA?',
    awareness: 'Problem aware',
    inspiration: 'ChatGPT Tricks news-graphic structure: one oversized problem headline and a dominant contextual photograph. Adapted into the Oceanides matte navy/amber print world.',
    assetSources: [`${sourceRoot}tb2-ba2-before.png`],
    proofContext: archiveContext,
    caption: `Bumabalik ang bara kahit may ginawa ka na?

Ipa-check muna kung saan nanggagaling ang problema. Ang mabagal na drainage o amoy ay hindi sapat para masabing puno agad ang septic tank.

Isulat kung saan may bara, kailan nagsimula, at ano na ang nasubukan. Mas madaling maipaliwanag ang concern kapag malinaw ang info.

Ihanda ang city, concern, at kailan mo gustong magpa-check. Buksan ang inquiry guide para maayos ang info mo bago humingi ng quote.

Ang litrato ay mula sa naunang Oceanides archive.`,
    destination: 'inquiry.html?post=01',
    publicationStatus: 'private-review',
  },
  {
    id: '02',
    slug: '02-bago-ka-magpasipsip',
    family: 'problem',
    title: 'BAGO KA MAGPASIPSIP.',
    awareness: 'Solution aware',
    inspiration: 'OpenAI / ChatGPT Business E51: generous negative space, restrained hierarchy and a single editorial idea. S15 information-stack pattern supplies the three practical questions.',
    assetSources: [],
    proofContext: null,
    caption: `Bago ka magpasipsip, itanong muna ang tatlong ito:

1. Ano ang posibleng sanhi ng problema?
2. Ano ang kasama sa presyo?
3. May posibleng dagdag ba, at kailan ito sisingilin?

Ipa-explain ang gagawin bago ka pumayag. Kung may dagdag, dapat malinaw muna kung bakit at magkano.

I-save ang listahan. Buksan ang inquiry guide at ihanda ang city, concern, at target na schedule bago humingi ng quote.`,
    destination: 'inquiry.html?post=02',
    publicationStatus: 'private-review',
  },
  {
    id: '03',
    slug: '03-parehong-tangke',
    family: 'proof',
    title: 'PAREHONG TANGKE.',
    awareness: 'Solution aware',
    inspiration: 'S21 native before/after proof: matched fixture, equal image treatment and clear chronology. The photos carry the message rather than decorative trust badges.',
    assetSources: [`${sourceRoot}tb2-ba2-before.png`, `${sourceRoot}tb2-ba2-after.png`],
    proofContext: archiveContext,
    caption: `Parehong tangke. Bago at pagkatapos.

Makikita sa pair ang pagbabago sa laman ng parehong tangke.

Nag-iisip kang magpasipsip? Linawin muna kung ano ang kailangan sa property mo at ano ang kasama sa quote.

Buksan ang inquiry guide. Ihanda ang city, concern, at kailan mo gustong magpa-check.

Mga litrato mula sa naunang Oceanides archive.`,
    destination: 'inquiry.html?post=03',
    publicationStatus: 'private-review',
  },
  {
    id: '04',
    slug: '04-sa-resulta-makikita',
    family: 'proof',
    title: 'SA RESULTA MAKIKITA.',
    awareness: 'Solution aware',
    inspiration: 'S21 native proof with the photo-first editorial hierarchy of Kylie E47/E48: a dominant image, a compact comparison and very little competing decoration. No testimonial is borrowed or invented.',
    assetSources: [`${sourceRoot}tb2-ba3-before.png`, `${sourceRoot}tb2-ba3-after.png`],
    proofContext: archiveContext,
    caption: `Sa resulta makikita ang pagbabago.

Ito ang parehong tank bago at pagkatapos. Iba-iba ang kondisyon ng bawat property, kaya ipa-check muna kung ano ang kailangan sa iyo.

Bago ka pumayag sa trabaho, linawin ang gagawin, kasama sa presyo, at posibleng dagdag.

Buksan ang inquiry guide at ihanda ang city, concern, at target na schedule para sa quote review.

Mga litrato mula sa naunang Oceanides archive.`,
    destination: 'inquiry.html?post=04',
    publicationStatus: 'private-review',
  },
  {
    id: '05',
    slug: '05-buong-presyo',
    family: 'decision',
    title: 'BUONG PRESYO. BAGO MAGSIMULA.',
    awareness: 'Solution aware',
    inspiration: 'S4 offer-stack structure rebuilt as a practical work-order checklist. Oceanides print devices make the buying questions feel concrete without unverified inclusions or prices.',
    assetSources: [],
    proofContext: null,
    caption: `Alamin ang buong presyo bago magsimula.

Ano ang gagawin? Ano ang kasama? Ano ang puwedeng may dagdag?

Ipa-explain ang bawat item. Kung may magbabago sa presyo, dapat malinaw muna kung bakit bago ka pumayag sa dagdag na trabaho.

Buksan ang inquiry guide. Ihanda ang city, concern, at target na schedule para malinaw ang request mo sa quote.`,
    destination: 'inquiry.html?post=05',
    publicationStatus: 'private-review',
  },
  {
    id: '06',
    slug: '06-alamin-muna',
    family: 'decision',
    title: 'ALAMIN MUNA. SAKA MAG-BOOK.',
    awareness: 'Solution aware',
    inspiration: 'S28 process-sequence pattern: three visible steps reduce uncertainty. The navy numbered flow follows Oceanides matte field-note typography rather than a generic app diagram.',
    assetSources: [],
    proofContext: null,
    caption: `Alamin muna. Saka mag-book.

Ihanda ang lugar at problema. Linawin ang gagawin, kasama sa presyo, at posibleng dagdag. Saka i-check ang availability at i-confirm ang schedule.

Hindi sapat ang mababang quote kung hindi mo alam kung ano ang kasama. Magtanong muna bago pumayag.

Buksan ang inquiry guide at ayusin ang city, concern, at target na schedule bago humingi ng quote.`,
    destination: 'inquiry.html?post=06',
    publicationStatus: 'private-review',
  },
];
