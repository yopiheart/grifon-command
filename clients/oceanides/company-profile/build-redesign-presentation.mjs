import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const workspaceDir = process.cwd();
const profileDir = path.join(workspaceDir, 'clients/oceanides/company-profile');
const buildDir = path.join(workspaceDir, '.tmp/oceanides-redesign/deck');
const runtimeDir = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const skillDir = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
process.env.RUNTIME_NODE_MODULES ??= path.join(runtimeDir, 'node/node_modules');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { default: JSZip } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/jszip/lib/index.js')).href);
const { default: sharp } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/sharp/dist/index.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);

const finalPath = path.join(profileDir, 'output/pptx/Oceanides-Company-Profile-Redesign-2026.pptx');
const previousOutput = await fs.readFile(finalPath).catch(() => null);
if (previousOutput && !process.argv.includes('--replace-redesign')) throw new Error('This task-owned output already exists. Use --replace-redesign to revise it.');
const content = JSON.parse(await fs.readFile(path.join(profileDir, 'premium-content.json'), 'utf8'));
if (content.services.length !== 5 || content.delivery.steps.length !== 4) throw new Error('Unexpected service or process coverage.');
const runDir = path.join(buildDir, `run-${Date.now()}`);
await fs.mkdir(runDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
if (previousOutput) await fs.writeFile(path.join(runDir, 'previous-redesign.pptx'), previousOutput);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const videoPath = path.join(workspaceDir, 'clients/oceanides/stp-explainer/output/Oceanides-STP-Aira-Tight-Voice-Music-1080p.mp4');
const videoSha256 = '40f143219c83666316c8c92936326e09370355f466a47699f972b33075c56cea';
const videoBytes = await fs.readFile(videoPath);
if (hash(videoBytes) !== videoSha256) throw new Error('The approved film changed.');
const videoStory = JSON.parse(await fs.readFile(path.join(workspaceDir, 'clients/oceanides/stp-explainer/story-aira-tight.json'), 'utf8'));
const assets = path.join(profileDir, 'assets');
const palette = { navy: '#0A1F45', blue: '#1C63AD', paper: '#F4F6FA', white: '#FFFFFF', ink: '#0B1B33', muted: '#4F6077', rule: '#CCD6E3', pale: '#DFE9F8' };
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
let shapeNumber = 0;
const imageEncodings = [];
const pictureGeometry = [];

function text(slide, value, x, y, width, height, size = 27, color = palette.ink, role = 'body', bold = false) {
  const shape = slide.shapes.add({ geometry: 'textbox', name: `redesign-text-${++shapeNumber}`,
    position: { left: x, top: y, width, height }, fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: role === 'title' ? 'Century Gothic' : 'Corbel', bold, fontSize: size,
    color, verticalAlignment: 'top', alignment: 'left', autoFit: 'none', wrap: 'none',
    insets: { left: 0, right: 0, top: 0, bottom: 0 } };
  return shape;
}
function panel(slide, x, y, width, height, color) {
  slide.shapes.add({ geometry: 'rect', name: `redesign-field-${++shapeNumber}`,
    position: { left: x, top: y, width, height }, fill: color, line: { fill: 'none', width: 0 } });
}
function rule(slide, x, y, width, color = palette.rule) { panel(slide, x, y, width, 1, color); }
function base(fill = palette.paper) { const slide = presentation.slides.add(); slide.background.fill = fill; return slide; }
async function image(slide, file, x, y, width, height, alt, fit = 'contain', crop) {
  const sourceBytes = await fs.readFile(file);
  const decoded = sharp(sourceBytes);
  const metadata = await decoded.metadata();
  const meaningfulAlpha = metadata.hasAlpha && (await decoded.stats()).channels.at(-1).min < 255;
  const embedded = meaningfulAlpha ? sourceBytes : await decoded.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  const encoded = await sharp(embedded).metadata();
  if (encoded.width !== metadata.width || encoded.height !== metadata.height) throw new Error('Source resolution changed.');
  const shape = slide.images.add({ blob: new Uint8Array(embedded), contentType: meaningfulAlpha ? 'image/png' : 'image/jpeg', fit,
    position: { left: x, top: y, width, height }, alt, ...(crop ? { crop } : {}) });
  imageEncodings.push({ source: path.relative(workspaceDir, file), sourceSha256: hash(sourceBytes), embeddedBytes: embedded.length,
    width: metadata.width, height: metadata.height, alphaPreserved: meaningfulAlpha, quality: meaningfulAlpha ? null : 95 });
  if (crop) pictureGeometry.push({ slide: presentation.slides.items.indexOf(slide) + 1, crop, position: [x,y,width,height] });
  return shape;
}
function notes(slide, lines = []) {
  slide.speakerNotes.textFrame.setText([
    'Company facts and contacts: clients/oceanides/company-profile/premium-content.json.',
    'Blue corporate editorial direction informed by https://www.magnific.com/premium-vector/modern-company-profile-brochure-template-layout_422990779.htm. Layout and artwork are authored for Oceanides, not copied from the template.',
    ...lines,
  ].join('\n'));
}
async function emblem(slide, x = 72, y = 48, size = 112) {
  await image(slide, path.join(assets, 'logo-transparent.png'), x, y, size, size, 'Approved Oceanides emblem with full transparent silhouette');
}

// 1. New photographic cover: navy ground, oversized typography and offset blue field.
{
  const slide = base(palette.navy);
  panel(slide, 760, 0, 520, 720, palette.blue);
  await emblem(slide, 72, 44, 112);
  await image(slide, path.join(assets, 'redesign/facade-pexels-14765373.jpg'), 832, 80, 376, 538,
    'Illustrative architecture photograph, not an Oceanides project', 'cover');
  text(slide, 'Property\nservices.', 72, 248, 696, 214, 86, palette.white, 'title', true);
  text(slide, 'For homes and company facilities', 76, 496, 660, 40, 29, palette.pale);
  rule(slide, 76, 564, 584, '#426084');
  text(slide, 'Company profile', 76, 588, 550, 34, 23, palette.white);
  text(slide, 'Oceanides Plumbing Siphoning &\nPest Management Services OPC', 76, 633, 650, 56, 21, palette.pale);
  text(slide, 'Illustrative architecture', 832, 640, 376, 34, 18, palette.white);
  notes(slide, ['Stock architecture: To Tao/Pexels, https://www.pexels.com/photo/windows-in-modern-office-building-14765373/ . License: https://www.pexels.com/license/ . Illustrative use only, not an Oceanides project.',
    'This cover replaces the former white home-cutaway composition.']);
}

// 2. Editorial background: history occupies a solid blue rail while copy stays on paper.
{
  const slide = base();
  panel(slide, 0, 0, 420, 720, palette.blue);
  text(slide, '2021', 62, 92, 310, 128, 88, palette.white, 'title', true);
  text(slide, 'Established', 66, 237, 300, 44, 29, palette.white, 'title');
  text(slide, 'Septic tank cleaning\nand plumbing services', 66, 299, 302, 108, 29, palette.pale);
  rule(slide, 66, 490, 292, '#6B9BCD');
  text(slide, 'Today', 66, 522, 300, 58, 40, palette.white, 'title', true);
  text(slide, 'Five service groups\nfor property upkeep', 66, 591, 302, 79, 26, palette.pale);
  text(slide, 'Company\nbackground', 484, 75, 724, 148, 61, palette.ink, 'title', true);
  text(slide, 'Oceanides coordinates property services\nfor homes, condominiums and\ncompany facilities.', 488, 282, 718, 134, 32);
  text(slide, 'We remain your main contact for scheduling,\nsite access and service coordination from\ninquiry to turnover.', 488, 447, 718, 130, 29, palette.muted);
  text(slide, 'Clear assessment. Agreed scope. Written quotation.', 488, 624, 718, 39, 24, palette.blue);
  notes(slide, ['Founding year: the user-provided Oceanides.pptx, slide 1, states "Oceanides Plumbing Services was established in 2021".',
    'No additional milestone dates, founders or achieved accreditations are inferred.', 'Mission: '+content.mission, 'Vision: '+content.vision]);
}

// 3. Five services in an open two-column editorial map, with a dedicated STP band.
{
  const slide = base(palette.white);
  text(slide, 'Our service\noffering', 72, 54, 688, 139, 57, palette.ink, 'title', true);
  text(slide, 'A defined scope for\neach property concern.', 866, 78, 344, 84, 28, palette.muted);
  const groups = [
    ['01', 'Siphoning', 'Septic tank siphoning and cleaning.\nSite and service assessment.'],
    ['02', 'Plumbing', 'Declogging, pipe leak repairs\nand plumbing troubleshooting.'],
    ['03', 'Renovation & restoration', 'House and condo repairs, ceilings,\nroof leaks, waterproofing and cleaning.'],
    ['04', 'Pest control', 'Assessment, treatment scope\nand service coordination.'],
  ];
  for (let i = 0; i < groups.length; i++) {
    const x = i%2 === 0 ? 72 : 674;
    const y = i < 2 ? 250 : 419;
    rule(slide, x, y-24, 534);
    text(slide, groups[i][0], x, y+1, 62, 43, 25, palette.blue);
    text(slide, groups[i][1], x+78, y, 470, 47, i===2 ? 29 : 32, palette.ink, 'title', true);
    text(slide, groups[i][2], x+78, y+57, 456, 78, 25, palette.muted);
  }
  panel(slide, 0, 584, 1280, 136, palette.blue);
  text(slide, '05', 72, 614, 62, 43, 25, palette.white);
  text(slide, 'Sewage treatment plant', 150, 614, 524, 50, 32, palette.white, 'title', true);
  text(slide, 'On-site wastewater treatment projects.\nAssessment and specialist coordination.', 758, 616, 456, 78, 25, palette.white);
  notes(slide, ['All five approved service groups are represented. Service details remain subject to the assessed site and agreed quotation.']);
}

// 4. Original job evidence, never the AI-recreated tb2 pair.
{
  const slide = base();
  panel(slide, 0, 0, 468, 720, palette.navy);
  text(slide, 'Siphoning', 62, 82, 376, 88, 53, palette.white, 'title', true);
  text(slide, 'Septic tank servicing\nbased on conditions\nand site access.', 66, 210, 348, 137, 29, palette.pale);
  text(slide, 'Septic tank siphoning\n\nSeptic tank cleaning\n\nSite assessment', 66, 398, 350, 200, 27, palette.white);
  text(slide, 'Original job photographs', 520, 50, 688, 44, 24, palette.muted);
  await image(slide, path.join(workspaceDir, 'clients/oceanides/assets/before-1.jpg'), 520, 125, 304, 405,
    'Original before-service photograph supplied for Oceanides, not AI recreated');
  await image(slide, path.join(workspaceDir, 'clients/oceanides/assets/after-1.jpg'), 882, 125, 304, 405,
    'Original matched after-service photograph supplied for Oceanides, not AI recreated');
  text(slide, 'Before service', 520, 560, 304, 45, 27, palette.ink, 'title', true);
  text(slide, 'After service', 882, 560, 304, 45, 27, palette.ink, 'title', true);
  rule(slide, 520, 630, 666);
  text(slide, 'A documented job. Service needs vary by tank and site.', 520, 652, 688, 36, 22, palette.muted);
  notes(slide, ['Original source files: clients/oceanides/assets/before-1.jpg and after-1.jpg.',
    'The AI-recreated tb2-ba2 pair is excluded. Original proportions are preserved without cropping.',
    'Photographs document this specific service, not a guarantee for every site.']);
}

// 5. Plumbing has a blue photographic field, unlike the former paper template.
{
  const slide = base(palette.blue);
  panel(slide, 486, 0, 794, 720, palette.paper);
  text(slide, 'Plumbing', 62, 79, 380, 86, 54, palette.white, 'title', true);
  text(slide, 'Assessment and repair of\ndrainage, pipe and\nwater leak problems.', 66, 216, 366, 141, 28, palette.white);
  await image(slide, path.join(assets, 'plumbing-service.png'), 538, 185, 670, 447,
    'AI-generated plumbing service illustration, not actual Oceanides personnel', 'contain');
  rule(slide, 66, 390, 354, '#6B9BCD');
  text(slide, 'Drain declogging\n\nPlumbing and pipe leak repairs\n\nTroubleshooting based\non site findings', 66, 424, 360, 235, 25, palette.white);
  text(slide, 'AI-generated service illustration', 538, 660, 670, 29, 18, palette.muted);
  notes(slide, ['Illustration: company-profile/assets/plumbing-service.png. It does not depict Oceanides personnel or a completed project. Working hands, wrench and pipe remain visible.']);
}

// 6. Renovation uses a wide top photograph and flat scope columns underneath.
{
  const slide = base(palette.white);
  text(slide, 'Renovation &\nrestoration', 72, 67, 657, 142, 54, palette.ink, 'title', true);
  text(slide, 'Repairs and improvements tailored\nto the property and agreed scope.', 76, 249, 650, 87, 29, palette.muted);
  await image(slide, path.join(assets, 'renovation-service.png'), 768, 70, 440, 293,
    'AI-generated ceiling renovation illustration, not an actual completed project');
  text(slide, 'AI-generated service illustration', 768, 376, 440, 29, 18, palette.muted);
  rule(slide, 72, 451, 1136);
  text(slide, 'House and condo\nrenovation', 72, 486, 538, 82, 30, palette.ink, 'title', true);
  text(slide, 'Ceiling repair or replacement', 72, 599, 550, 53, 27, palette.muted);
  text(slide, 'Roof leak repair\nand waterproofing', 672, 486, 536, 85, 30, palette.ink, 'title', true);
  text(slide, 'House cleaning within the agreed scope', 672, 599, 536, 66, 27, palette.muted);
  notes(slide, ['All approved renovation and restoration scopes retained, including ceiling replacement, roof leaks, waterproofing and house cleaning.',
    'Illustration: company-profile/assets/renovation-service.png. It is not evidence of Oceanides personnel or a completed job.']);
}

// 7. Pest control is a typographic planning slide with a lower blue process band.
{
  const slide = base();
  text(slide, 'Pest control', 72, 70, 1136, 98, 67, palette.ink, 'title', true);
  text(slide, 'Service planning starts with\nthe concern at your property.', 76, 232, 1050, 142, 49, palette.blue, 'title');
  panel(slide, 0, 477, 1280, 243, palette.navy);
  const blocks = [ ['Assessment', 'Review reported concerns\nand signs of pest activity.'], ['Treatment scope', 'Base the proposed service\non site findings.'], ['Coordination', 'Arrange scheduling and\nthe appropriate contractor.'] ];
  for (let i=0;i<3;i++) {
    const x = 72 + i*398;
    text(slide, blocks[i][0], x, 529, 352, 51, 29, palette.white, 'title', true);
    text(slide, blocks[i][1], x, 600, 352, 76, 27, palette.pale);
  }
  notes(slide, ['Pest service is presented as assessment-led planning and coordination. No unsupported pesticide, licensing, treatment guarantee or staff claim is introduced.']);
}

// 8. Technical introduction with a large blue field and process-only film frame.
{
  const slide = base(palette.blue);
  panel(slide, 626, 0, 654, 720, palette.paper);
  text(slide, 'On-site\nwastewater\ntreatment', 62, 74, 548, 239, 57, palette.white, 'title', true);
  text(slide, 'Sewage treatment plant (STP)', 66, 359, 530, 48, 28, palette.white, 'title', true);
  text(slide, 'Building wastewater treatment.\nAssessment, technical proposal\nand specialist coordination.', 66, 433, 530, 141, 29, palette.pale);
  text(slide, 'Site requirements first', 681, 65, 526, 61, 36, palette.ink, 'title', true);
  text(slide, 'Volume. Space. Outlet. Operating costs.', 681, 139, 530, 75, 26, palette.muted);
  await image(slide, path.join(assets, 'premium/stp-process-source.png'), 661, 258, 570, 273,
    'Illustrative treatment cutaway from the approved Oceanides explainer film', 'contain',
    { left: 0.175, top: 0.282, right: 0.135, bottom: 0.16 });
  text(slide, 'Sludge removal and equipment care\ncontinue after installation.', 681, 579, 534, 82, 28, palette.ink);
  text(slide, 'Illustrative process. Actual design follows assessment.', 681, 687, 534, 25, 17, palette.muted);
  notes(slide, [content.stp.qualification, 'Existing approved film model is illustrative, not a supplier-specific design or owned Oceanides facility.', ...videoStory.sources.map(source=>source.url)]);
}

// 9. Existing approved video is embedded unchanged, with manual movie controls.
{
  const slide = base(palette.paper);
  await image(slide, path.join(assets, 'meeting/stp-video-poster.png'), 0, 0, 1280, 720, 'Click to play the approved Oceanides STP explainer');
  notes(slide, ['Click to play the embedded film. Duration 99.733 seconds. Approved picture sequence, narration and music remain byte-for-byte unchanged.',
    'General treatment illustration. Site-specific suitability, capacity and maintenance follow the technical proposal.', ...videoStory.sources.map(source=>source.url)]);
}

// 10. Closing is led by a large white invitation and a separate blue contact field.
{
  const slide = base(palette.navy);
  panel(slide, 850, 0, 430, 720, palette.blue);
  text(slide, 'Site assessment\nand quotation', 72, 66, 752, 159, 57, palette.white, 'title', true);
  text(slide, 'Share the service you need, the location\nand your preferred inspection schedule.', 76, 265, 742, 95, 29, palette.pale);
  rule(slide, 76, 411, 700, '#426084');
  const process = [ ['01', 'Assess'], ['02', 'Quote'], ['03', 'Coordinate'], ['04', 'Turn over'] ];
  for (let i=0;i<4;i++) {
    const x=76+i*182;
    text(slide, process[i][0], x, 452, 160, 41, 26, palette.pale);
    text(slide, process[i][1], x, 510, 172, 51, 25, palette.white, 'title', true);
  }
  text(slide, 'Final scope, pricing and scheduling follow\nthe site assessment and agreed quotation.', 76, 621, 708, 68, 23, palette.pale);
  text(slide, 'Contact', 890, 72, 338, 56, 38, palette.white, 'title', true);
  text(slide, content.contact.phone, 890, 200, 338, 73, 36, palette.white, 'title', true);
  text(slide, 'Globe', 892, 279, 336, 37, 23, palette.white);
  text(slide, 'marketing@\noceanidessepticandpest.com', 890, 381, 350, 85, 25, palette.white);
  text(slide, 'Tramo Street Corner Dandan,\nPasay City, Philippines 1300', 890, 552, 345, 108, 25, palette.white);
  notes(slide, [content.procurement, content.callToAction.body, content.company.legalName]);
}

// Two cover-only alternatives for design review, excluded from the delivered deck.
const alternatives = Presentation.create({ slideSize: { width: 1280, height: 720 } });
{
  const slide=alternatives.slides.add();slide.background.fill=palette.navy;
  await emblem(slide,72,48,112);
  text(slide,'Property\nservices.',72,240,1110,270,108,palette.white,'title',true);
  panel(slide,72,557,82,6,palette.blue);
  text(slide,'Company profile',72,604,584,46,29,palette.white);
  text(slide,'Homes. Condominiums. Company facilities.',672,610,536,45,24,palette.pale);
  notes(slide,['Alternative A: pure typography on navy. This cover variation is for review only.']);
}
{
  const slide=alternatives.slides.add();slide.background.fill=palette.paper;
  await image(slide,path.join(assets,'redesign/facade-pexels-14765373.jpg'),0,0,710,720,'Illustrative architecture photograph','cover');
  panel(slide,710,0,570,720,palette.blue);
  await emblem(slide,760,46,102);
  text(slide,'Property\nservices.',760,277,455,164,60,palette.white,'title',true);
  text(slide,'Company profile',762,499,440,45,28,palette.white);
  text(slide,'For homes and\ncompany facilities',762,568,440,82,26,palette.white);
  panel(slide,0,661,710,59,palette.navy);
  text(slide,'Illustrative architecture',34,677,598,29,18,palette.white);
  notes(slide,['Alternative B: full-height stock photography beside a blue editorial column. This cover variation is for review only.']);
}
const altPath=path.join(runDir,'cover-alternatives.pptx');
await(await PresentationFile.exportPptx(alternatives)).save(altPath);

const rawPath=path.join(runDir,'artifact-authored.pptx');
await(await PresentationFile.exportPptx(presentation)).save(rawPath);
await fs.writeFile(path.join(buildDir,'preview-build.json'),JSON.stringify({runDir,rawPath,altPath},null,2)+'\n');
if(process.argv.includes('--preview-only')) { console.log(JSON.stringify({runDir,rawPath,altPath})); process.exit(0); }
const zip=await JSZip.loadAsync(await fs.readFile(rawPath));
const relNs='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
for(const geometry of pictureGeometry) {
  let xml=await zip.file(`ppt/slides/slide${geometry.slide}.xml`).async('string');
  const pic=xml.match(/<p:pic>.*?<\/p:pic>/s)?.[0];
  if(!pic||xml.match(/<p:pic>/g)?.length!==1) throw new Error('Expected one technical picture.');
  const {left,top,right,bottom}=geometry.crop;
  const crop=`<a:srcRect l="${Math.round(left*100000)}" t="${Math.round(top*100000)}" r="${Math.round(right*100000)}" b="${Math.round(bottom*100000)}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>`;
  const [x,y,w,h]=geometry.position;
  const fixed=pic.replace(/(<p:blipFill>.*?<\/a:blip>|<p:blipFill>.*?<a:blip\b[^>]*\/>)\s*(?:<a:srcRect\b[^>]*\/>|)/s,'$1'+crop)
    .replace(/<a:off\b[^>]*\/>/,`<a:off x="${Math.round(x*9525)}" y="${Math.round(y*9525)}"/>`)
    .replace(/<a:ext\b[^>]*\/>/,`<a:ext cx="${Math.round(w*9525)}" cy="${Math.round(h*9525)}"/>`)
    .replace(/<a:stretch\b([^>]*)\/>/,'<a:stretch$1><a:fillRect/></a:stretch>');
  zip.file(`ppt/slides/slide${geometry.slide}.xml`,xml.replace(pic,fixed));
}
const nativeXml=await fs.readFile(path.join(assets,'meeting/native-video-reference.xml'),'utf8');
const nativePicture=nativeXml.match(/<p:nvPicPr>.*?<\/p:nvPicPr>/s)?.[0];
const nativeTiming=nativeXml.match(/<p:timing>.*?<\/p:timing>/s)?.[0];
if(!nativePicture?.includes('ppaction://media')||!nativeTiming?.includes('delay="indefinite"')) throw new Error('Manual movie reference is missing.');
let movieXml=await zip.file('ppt/slides/slide9.xml').async('string');
const pictureId=movieXml.match(/<p:pic>.*?<p:cNvPr id="([^"]+)"/s)?.[1];
movieXml=movieXml.replace(/<p:sld\b([^>]*)>/,(_,attrs)=>`<p:sld${attrs} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${relNs}">`)
  .replace(/<p:nvPicPr>.*?<\/p:nvPicPr>/s,nativePicture.replace(/<p:cNvPr id="2"/,`<p:cNvPr id="${pictureId}"`).replace('<a:hlinkClick r:id=""','<a:hlinkClick'))
  .replace(/<a:blip\b[^>]*r:embed="[^"]+"[^>]*\/>/,'<a:blip r:embed="rId5" />')
  .replace('</p:sld>',nativeTiming.replace('spid="2"',`spid="${pictureId}"`)+'</p:sld>');
zip.file('ppt/slides/slide9.xml',movieXml);
zip.file('ppt/slides/_rels/slide9.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+[
  ['rId1','http://schemas.microsoft.com/office/2007/relationships/media','../media/oceanides-stp-redesign.mp4'],
  ['rId2',`${relNs}/video`,'../media/oceanides-stp-redesign.mp4'],
  ['rId3',`${relNs}/slideLayout`,'../slideLayouts/slideLayout1.xml'],
  ['rId4',`${relNs}/notesSlide`,'../notesSlides/notesSlide9.xml'],
  ['rId5',`${relNs}/image`,'../media/oceanides-stp-redesign-poster.png'],
].map(([id,type,target])=>`<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')+'</Relationships>');
zip.file('ppt/media/oceanides-stp-redesign.mp4',videoBytes);
zip.file('ppt/media/oceanides-stp-redesign-poster.png',await fs.readFile(path.join(assets,'meeting/stp-video-poster.png')));
let typesXml=await zip.file('[Content_Types].xml').async('string');
if(!typesXml.includes('Extension="mp4"')) typesXml=typesXml.replace('</Types>','<Default Extension="mp4" ContentType="video/mp4"/></Types>');
zip.file('[Content_Types].xml',typesXml);
const candidatePath=path.join(runDir,'candidate.pptx');
await fs.writeFile(candidatePath,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));
// Native PowerPoint embeds all styles of the two installed static fonts in a
// separate private candidate. Every post-save media hash and package gate runs
// again, because native SaveAs can rename media and relationship resources.
const nativeEmbeddedPath=path.join(runDir,'font-embedded.pptx');
const embedScript=path.join(runDir,'embed-fonts.ps1');
const psLiteral=value=>"'"+value.replaceAll("'","''")+"'";
await fs.writeFile(embedScript,`$ErrorActionPreference='Stop'\n$app=$null\n$pres=$null\n$before=@(Get-Process POWERPNT -ErrorAction SilentlyContinue)\ntry {\n$app=New-Object -ComObject PowerPoint.Application\n$pres=$app.Presentations.Open(${psLiteral(candidatePath)},-1,0,0)\n$pres.SaveAs(${psLiteral(nativeEmbeddedPath)},24,-1)\n} finally {\nif($null-ne $pres){$pres.Close()}\nif($null-ne $app -and $before.Count -eq 0 -and $app.Presentations.Count -eq 0){$app.Quit()}\n}\n`,'utf8');
const embedding=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',await fs.readFile(embedScript,'utf8')],{encoding:'utf8',timeout:60000,windowsHide:true});
if(embedding.status!==0) throw new Error(`Native font embedding failed: ${embedding.stderr||embedding.stdout}`);
const embeddedZip=await JSZip.loadAsync(await fs.readFile(nativeEmbeddedPath));
const embeddedMoviePart=Object.keys(embeddedZip.files).filter(name=>name.endsWith('.mp4'));
if(embeddedMoviePart.length!==1||hash(await embeddedZip.file(embeddedMoviePart[0]).async('uint8array'))!==videoSha256) throw new Error('Native font embedding changed the film.');
const nativePresentationXml=await embeddedZip.file('ppt/presentation.xml').async('string');
for(const family of ['Century Gothic','Corbel']) {
  if(!nativePresentationXml.includes(`typeface="${family}"`)) throw new Error(`Missing embedded font ${family}.`);
}
if(Object.keys(embeddedZip.files).filter(name=>/^ppt\/fonts\/.*\.fntdata$/.test(name)).length!==8) throw new Error('Expected eight embedded font styles.');
// PowerPoint inserts an empty relationship on its built-in movie action.
// The action is intrinsic, so omit this empty optional relationship instead of
// leaving a dangling package reference. The media relationships stay intact.
const embeddedMovieXml=await embeddedZip.file('ppt/slides/slide9.xml').async('string');
embeddedZip.file('ppt/slides/slide9.xml',embeddedMovieXml.replace(/<a:hlinkClick r:id=""(?= action="ppaction:\/\/media")/g,'<a:hlinkClick'));
const fontReadyPath=path.join(runDir,'font-embedded-candidate.pptx');
await fs.writeFile(fontReadyPath,await embeddedZip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));
const finalizedPath=path.join(runDir,'deliverable/finalized.pptx');
await fs.mkdir(path.dirname(finalizedPath),{recursive:true});
const receiptPath=path.join(runDir,'finalization.json');
await finalizePresentation({workspaceDir,candidatePath:fontReadyPath,finalPath:finalizedPath,
  pythonExecutable:path.join(runtimeDir,'python/python.exe'),
  integrityValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skillDir,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
  explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
  fontPolicy:{basis:'design',families:['Century Gothic','Corbel']},verifyArtifactToolImport:true,receiptPath,
});
const finalBytes=await fs.readFile(finalizedPath);
const finalZip=await JSZip.loadAsync(finalBytes);
const finalMoviePart=Object.keys(finalZip.files).filter(name=>name.endsWith('.mp4'));
if(finalMoviePart.length!==1||hash(await finalZip.file(finalMoviePart[0]).async('uint8array'))!==videoSha256) throw new Error('Embedded film changed.');
if(/TargetMode="External"/.test(await finalZip.file('ppt/slides/_rels/slide9.xml.rels').async('string'))) throw new Error('Movie cannot be external.');
const checked=await PresentationFile.importPptx(await FileBlob.load(finalizedPath));
if(checked.slides.items.length!==10) throw new Error('Incorrect slide count.');
for(let i=0;i<checked.slides.items.length;i++) {
  const slide=checked.slides.items[i];
  await fs.writeFile(path.join(runDir,`slide-${i+1}.png`),new Uint8Array(await(await checked.export({slide,format:'png',scale:1.5})).arrayBuffer()));
  await fs.writeFile(path.join(runDir,`slide-${i+1}.layout.json`),await(await slide.export({format:'layout'})).text());
}
const expectedPrevious=previousOutput?hash(previousOutput):null;
const current=await fs.readFile(finalPath).catch(()=>null);
if(expectedPrevious!==(current?hash(current):null)) throw new Error('Task output changed concurrently.');
const staged=path.join(path.dirname(finalPath),`.${path.basename(finalPath,'.pptx')}-${crypto.randomUUID()}.pptx`);
try {
  await fs.copyFile(finalizedPath,staged);
  if(hash(await fs.readFile(staged))!==hash(finalBytes)) throw new Error('Staging changed bytes.');
  const currentBeforePromotion=await fs.readFile(finalPath).catch(()=>null);
  if(expectedPrevious!==(currentBeforePromotion?hash(currentBeforePromotion):null)) throw new Error('Output changed before promotion.');
  await fs.rename(staged,finalPath);
} finally {await fs.rm(staged,{force:true});}
const verification={finalPath,finalSha256:hash(finalBytes),bytes:finalBytes.length,slideCount:10,slideSize:[1280,720],
  fontPolicy:['Century Gothic','Corbel'],receiptPath,renderDir:runDir,altPath,imageEncodings,
  videoPath,videoSha256,embeddedVideo:finalMoviePart[0],durationSeconds:99.73333333333333,fontsEmbedded:true,embeddedFontStyles:8,
  manualStart:true,nativeMovieAction:'ppaction://media',nativeStartDelay:'indefinite',nativePowerPointReadOnlyOpen:false,nativeSlideshowPlaybackVerified:false,
  substantiveChanges:['navy photographic cover','Century Gothic and Corbel typography','two-column editorial service map','original unmodified job proof','distinct service layouts','blue technical split','blue contact rail']};
await fs.writeFile(path.join(runDir,'verification.json'),JSON.stringify(verification,null,2)+'\n');
await fs.writeFile(path.join(buildDir,'latest.json'),JSON.stringify(verification,null,2)+'\n');
console.log(JSON.stringify({finalPath,bytes:verification.bytes,finalSha256:verification.finalSha256,runDir,receiptPath,altPath},null,2));
