const sourceRoot = 'funnels/oceanides-price-page/public/img/';
const archiveContext = {
  source: 'funnels/oceanides-price-page/scripts/build-assets.mjs',
  attestation: 'Neil confirmed the tb2-ba2 and tb2-ba3 pairs were real job photos on 2026-08-01 ("totoo yan").',
  conflict: 'Earlier daily-post documentation described these assets as AI. Original camera files remain with Boss Jay and were not independently inspected here.',
  timing: 'Historical archive. Actual job dates and locations are not verified. The photographs illustrate why context matters; they do not diagnose the viewer\'s property.',
};

export const extraPosts = [
  {
    id: '07', slug: '07-nangungupahan-ka', family: 'problem',
    title: 'NANGUNGUPAHAN KA?', support: 'Isama ang owner bago magpa-service.', awareness: 'Problem aware',
    inspiration: 'Saved E65 Alex Hormozi: one dominant subject inside a collectible card frame. The frame is adapted around custom house and key illustrations for tenant coordination; no person, rating, credential, or endorsement is depicted. Source: assets/ad-swipe/E65-alex-hormozi.jpg.',
    assetSources: [], proofContext: { status: 'Custom SVG house and key illustrations. No real property or person is depicted.' },
    caption: `May problema sa drainage ng inuupahan mo? Isama muna ang owner o property manager sa usapan.

Linawin kung sino ang mag-aapprove, sino ang kausap sa property, at paano ang payment. I-send din kung saan may problema at kailan mo unang napansin.

Mas okay kung pareho ang info ng lahat bago magpa-service. Ihanda ang city, concern, at target na araw bago tumawag o mag-message.`,
  },
  {
    id: '08', slug: '08-ikaw-ang-naka-assign', family: 'problem',
    title: 'IKAW ANG NAKA-ASSIGN?', support: 'Isama ang oras ng business sa usapan.', awareness: 'Problem aware',
    inspiration: 'Saved E90 Russell Brunson: a single printed street poster becomes the focal point. Rebuilt as a navy wall and paper notice for the person assigned to building maintenance. No fabricated photograph or venue is shown. Source: assets/ad-swipe/E90-russell-brunson.jpg.',
    assetSources: [], proofContext: null,
    caption: `Ikaw ang naka-assign sa maintenance ng business o building?

Isama sa inquiry ang oras ng operations, sino ang kausap sa site, at kailan mas okay magpa-check. Kung may approval pa mula sa owner o admin, sabihin din.

I-note kung isang area lang ang may problema o may iba pang affected. Ihanda ang city at target na araw. Ipa-confirm ang available na schedule bago ka mag-ayos ng ibang kailangan sa property.`,
  },
  {
    id: '09', slug: '09-hindi-sure-sa-tangke', family: 'problem',
    title: 'HINDI SURE SA TANGKE?', support: 'Sabihin kung ano lang ang alam mo.', awareness: 'Problem aware',
    inspiration: 'Saved E26 Gruns: the visible tip versus the unknown area below the surface. Reinterpreted as a clearly labelled conceptual house-and-tank cutaway. No symptom is treated as a diagnosis and the drawing is not a technical plan. Source: assets/ad-swipe/E26-gruns.jpg.',
    assetSources: [], proofContext: { status: 'Custom SVG conceptual illustration, not a property photograph, construction plan, or diagnostic diagram.' },
    caption: `Hindi mo alam ang size, location, o huling service ng septic tank? Sabihin mo lang na hindi ka sure.

Hindi mo kailangang hulaan ang info para makapagtanong. Unahin kung ano ang napansin mo, saan may problema, at kailan ito nagsimula.

Kung may lumang record o info mula sa owner, ihanda rin. Isama ang city at kailan mo gustong magpa-check para malinaw ang simula ng usapan.`,
  },
  {
    id: '10', slug: '10-isa-lang-ang-barado', family: 'problem',
    title: 'ISA LANG ANG BARADO?', support: 'I-note kung saan may problema.', awareness: 'Problem aware',
    inspiration: 'Saved E91 Russell Brunson: a whiteboard with short notes, arrows, and a central question. Adapted into an observation board with three areas to describe, without fake projections, before/after claims, or diagnostic assertions. Source: assets/ad-swipe/E91-russell-brunson.jpg.',
    assetSources: [], proofContext: null,
    caption: `Sa kitchen sink lang ba may problema? Sa CR? O may iba pang area kang napansin?

Ilista kung saan mabagal bumaba ang tubig at kung sabay-sabay mo itong napansin. Isama kung kailan nagsimula at ano na ang nasubukan.

Mga observation muna, hindi diagnosis. Hindi sapat ang isang sintomas para sabihin agad kung anong service ang kailangan. Ihanda ang city at concern bago humingi ng assessment o quote.`,
  },
  {
    id: '11', slug: '11-bagong-lipat-ka', family: 'decision',
    title: 'BAGONG LIPAT KA?', support: 'Hanapin muna ang service history.', awareness: 'Unaware',
    inspiration: 'Saved E84 Russell Brunson: oversized copy on layered paper strips and a cutout object. Rebuilt with a custom key illustration and move-in records. Only the collage composition is borrowed; no revenue or performance claim transfers. Source: assets/ad-swipe/E84-russell-brunson.jpg.',
    assetSources: [], proofContext: { status: 'Custom SVG key illustration. No real property, owner, or service record is depicted.' },
    caption: `Bagong lipat ka sa bahay? Isama sa mga hihingin sa dating owner o tenant ang service history ng septic tank, kung meron.

Kailan ang huling service? May receipt o lumang record ba? Sino ang dating kausap?

I-save ang info kasama ng ibang records ng bahay. Kung wala, sabihin lang na hindi verified ang history. Kapag magtatanong ka, ihanda ang city at anumang concern na napansin mo sa property.`,
  },
  {
    id: '12', slug: '12-may-renovation-ka', family: 'decision',
    title: 'MAY RENOVATION KA?', support: 'Isama ang septic tank sa planning.', awareness: 'Unaware',
    inspiration: 'Saved E92 Russell Brunson: an oversized message attached to a miniature building. Adapted into a custom isometric home illustration and renovation planning label, without a fictional project photograph or technical recommendation. Source: assets/ad-swipe/E92-russell-brunson.jpg.',
    assetSources: [], proofContext: { status: 'Custom SVG conceptual home illustration. It is not a real property, service result, or construction plan.' },
    caption: `May renovation ka sa bahay? Isama sa usapan ng owner at contractor ang anumang available na info tungkol sa septic tank at drainage.

Ipunin ang lumang plans, service records, at mga concern na napansin mo bago magsimula ang project. Kung may hindi alam, i-note para maitanong.

Kapag kailangan mong humingi ng service advice, sabihin na may renovation, nasaan ang property, at ano ang concern. Ipa-confirm muna kung anong assessment ang kailangan.`,
  },
  {
    id: '13', slug: '13-huling-service', family: 'decision',
    title: 'HULING SERVICE? I-SAVE MO.', support: 'Ipunin ang date, receipt, at ginawa.', awareness: 'Solution aware',
    inspiration: 'Saved E30 Gruns: a hand-drawn pack with bold irregular framing. Reinterpreted as a hand-drawn maintenance folder, using clean Oceanides typography rather than a new handwriting font. No completed record, date, or provider is fabricated. Source: assets/ad-swipe/E30-gruns.jpg.',
    assetSources: [], proofContext: null,
    caption: `Pagkatapos ng anumang service sa property, i-save ang receipt at kung ano ang ginawa.

Isama ang date, pangalan ng provider, at anumang note na ibinigay. Pwedeng isang folder lang sa phone para madaling mahanap.

Kapag may bago kang concern, may mababalikan kang record. Hindi mo kailangang umasa sa memorya lang. Kung magtatanong ka ulit, ihanda ang city, kasalukuyang concern, at available na service history.`,
  },
  {
    id: '14', slug: '14-makakapasok-ba-ang-truck', family: 'decision',
    title: 'MAKAKAPASOK BA ANG TRUCK?', support: 'Ipa-confirm ang access bago ang schedule.', awareness: 'Solution aware',
    inspiration: 'Saved S8/E5 Sabri Suby: a direct question calls out the specific buyer and constraint. Adapted with a dominant existing fleet-context photograph and access questions. E5 is documented in workflows/static_ad_swipe_file.md; the archive has no E5 JPEG.',
    assetSources: [`${sourceRoot}hero-truck.webp`],
    proofContext: { status: 'Existing edited fleet-context image derived from Oceanides assets. Not a photograph of a specific service or confirmation of which vehicle will attend.', limit: 'Access and vehicle setup must be confirmed for each location. No dimensions, equipment, or availability are promised.' },
    caption: `May gate, makitid na street, o parking rules sa property mo?

Isama yan sa unang usapan. Sabihin din kung may kailangan pang i-coordinate sa guard, admin, o owner. Kung may existing photo ng entrance, pwede mo itong ihanda bilang context.

Huwag munang mag-assume kung anong truck o setup ang gagamitin. Ipa-confirm sa provider kung ano ang kailangan sa location mo bago i-finalize ang schedule.`,
  },
  {
    id: '15', slug: '15-i-send-mo-nang-malinaw', family: 'decision',
    title: 'I-SEND MO NANG MALINAW.', support: 'Lugar. Problema. Target na araw.', awareness: 'Solution aware',
    inspiration: 'Saved E58 Meta for Business: a real interface serves as the visual object beside a short outcome message. Uses a screenshot of this actual local inquiry guide, not a fabricated message, testimonial, or completed booking. Source: assets/ad-swipe/E58-meta-for-business.jpg.',
    assetSources: ['clients/oceanides/flagship-2026-10/inquiry.html', 'clients/oceanides/flagship-2026-10/templates/inquiry-ui.webp'],
    proofContext: { status: 'Screenshot of the actual private inquiry preview. The guide prepares a summary; it sends no request and creates no booking.' },
    caption: `Magtatanong ka tungkol sa septic service? Pwede mong gamitin itong format:

“Sa [city] ang property ko. Ang concern ko ay [ano at saan ang problema]. Napansin ko ito noong [kailan]. Gusto ko sanang magpa-check sa [target na araw]. Ano pa ang kailangan mong info?”

Kung hindi ka sure sa isang item, sabihin lang. Panimula ito ng usapan. Ipa-confirm pa rin ang assessment, quote, at available na schedule.`,
  },
  {
    id: '16', slug: '16-unit-mo-lang-ba', family: 'problem',
    title: 'UNIT MO LANG BA?', support: 'Linawin kung sino ang kausap sa property.', awareness: 'Problem aware',
    inspiration: 'Saved E28 Gruns: two contrasting visual halves expose the old-way/new-way distinction. Rebuilt as observation versus assumption for shared-property coordination, without claiming a shared system, blaming a resident, or depicting a diagnosis. Source: assets/ad-swipe/E28-gruns.jpg.',
    assetSources: [], proofContext: null,
    caption: `Sa unit mo lang ba may concern, o may kaparehong napansin sa ibang unit?

Kung apartment o shared building ang property, isama ang owner o admin sa usapan. Linawin kung sino ang may hawak ng available na plans at maintenance records.

Huwag munang mag-assume kung iisang system ang gamit ng lahat. I-note lang ang observations at ipa-check ang kailangan. Ihanda ang city, unit o area na affected, at contact person sa property.`,
  },
  {
    id: '17', slug: '17-photo-lagyan-ng-context', family: 'decision',
    title: 'PHOTO LANG? LAGYAN NG CONTEXT.', support: 'Sabihin kung saan at kailan kinunan.', awareness: 'Solution aware',
    inspiration: 'Saved E57 Meta for Business: an actual notebook organizes a few short, useful questions. Adapted as a photo-context notebook with an existing archive image, blank labels, and a clipped photo rather than a repeated numbered checklist. Source: assets/ad-swipe/E57-meta-for-business.jpg.',
    assetSources: ['clients/oceanides/assets/tb2-ba3-before.png'], proofContext: archiveContext,
    caption: `May photo ka na ng concern? Lagyan ng maikling explanation bago i-send.

Saan sa property ito? Kailan kinunan? Ano ang napansin mong problema? Kung luma ang photo, sabihin din.

Mas malinaw ang usapan kapag may context ang larawan. Hindi rin sapat ang photo lang para makasiguro sa sanhi o sa service na kailangan. Ihanda ang city at concern, saka itanong kung ano pa ang kailangan para ma-assess ito.

Ang litrato sa design ay mula sa naunang Oceanides archive.`,
  },
  {
    id: '18', slug: '18-walang-issue-ngayon', family: 'decision',
    title: 'WALANG ISSUE NGAYON?', support: 'Pwede nang ayusin ang maintenance record.', awareness: 'Unaware',
    inspiration: 'Saved E46 Kylie Cosmetics: restrained colour and one calm focal point. Only the tonal hierarchy is adapted, using a custom maintenance-record illustration instead of a portrait. No person, endorsement, or attendance promise is depicted. Source: assets/ad-swipe/E46-kylie-cosmetics.jpg.',
    assetSources: [], proofContext: { status: 'Custom SVG maintenance-record illustration. No completed service or recommended interval is depicted.' },
    caption: `Wala ka pang concern ngayon? Pwede mong gamitin ang oras para ayusin ang maintenance records ng bahay.

I-save kung kailan ang huling septic service, ano ang ginawa, at anumang advice na ibinigay para sa property mo. Kung may kulang sa record, i-note para maitanong.

Huwag basta kopyahin ang schedule ng ibang bahay. Kapag magpaplano ka ng susunod na service, ipa-assess muna kung ano ang kailangan sa property mo.`,
  },
].map(post => {
  const disclosures = {
    '07': 'Conceptual illustration ang nasa design. Hindi ito plan o diagnosis ng property.',
    '09': 'Conceptual illustration ang nasa design. Hindi ito plan o diagnosis ng property.',
    '11': 'Illustration ng susi ang nasa design. Walang actual property o service record na ipinapakita.',
    '12': 'Conceptual illustration ang bahay sa design. Hindi ito actual project o technical plan.',
    '14': 'Edited fleet-context image ang nasa design. Ipa-confirm ang actual vehicle at setup para sa location mo.',
    '15': 'Screenshot ito ng private inquiry preview. Walang request na ipinapadala at walang booking na ginagawa ang guide.',
    '18': 'Conceptual illustration ang nasa design. Hindi ito plan o diagnosis ng property.',
  };
  return {
    ...post,
    caption: disclosures[post.id] ? `${post.caption}\n\n${disclosures[post.id]}` : post.caption,
    proofContext: post.proofContext ? Object.values(post.proofContext).join(' ') : null,
    destination: `inquiry.html?post=${post.id}`,
    publicationStatus: 'private-review',
  };
});
