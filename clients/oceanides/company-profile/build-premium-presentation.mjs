import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const workspaceDir = process.cwd();
const profileDir = path.join(workspaceDir, 'clients/oceanides/company-profile');
const buildDir = path.join(workspaceDir, '.tmp/oceanides-premium/deck');
const runtimeDir = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const skillDir = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
process.env.RUNTIME_NODE_MODULES ??= path.join(runtimeDir, 'node/node_modules');
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { default: JSZip } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/jszip/lib/index.js')).href);
const { default: sharp } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/sharp/dist/index.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);

const finalPath = path.join(profileDir, 'output/pptx/Oceanides-Company-Profile-Premium-2026.pptx');
const replacePremium = process.argv.includes('--replace-premium');
const previousOutput = await fs.readFile(finalPath).catch(() => null);
if (previousOutput && !replacePremium) throw new Error('Premium output exists. Use --replace-premium only to revise this task-owned new deck.');
const content = JSON.parse(await fs.readFile(path.join(profileDir, 'premium-content.json'), 'utf8'));
if (content.services.length !== 5 || content.delivery.steps.length !== 4) throw new Error('Expected five service groups and four delivery steps.');
const runDir = path.join(buildDir, `run-${Date.now()}`);
await fs.mkdir(runDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
if (previousOutput) await fs.writeFile(path.join(runDir, 'previous-premium.pptx'), previousOutput);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const videoPath = path.join(workspaceDir, 'clients/oceanides/stp-explainer/output/Oceanides-STP-Aira-Tight-Voice-Music-1080p.mp4');
const videoSha256 = '40f143219c83666316c8c92936326e09370355f466a47699f972b33075c56cea';
const videoBytes = await fs.readFile(videoPath);
if (hash(videoBytes) !== videoSha256) throw new Error('The approved STP film changed.');
const videoStory = JSON.parse(await fs.readFile(path.join(workspaceDir, 'clients/oceanides/stp-explainer/story-aira-tight.json'), 'utf8'));
const palette = { paper: '#F7F7F2', ink: '#17212B', blue: '#1C63AD', navy: '#0A1F45', muted: '#556270', rule: '#CDD4D8', light: '#DFE8F5' };
const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
let shapeNumber = 0;
const imageEncodings = [];
const jpegAssets = new Set(['cover-property-minimal.png', 'plumbing-service.png', 'renovation-service.png',
  'pest-control-service.png', 'tb2-ba2-before.png', 'tb2-ba2-after.png']);

function text(slide, value, x, y, width, height, size = 27, color = palette.ink, heading = false) {
  const shape = slide.shapes.add({ geometry: 'textbox', name: `premium-text-${++shapeNumber}`,
    position: { left: x, top: y, width, height }, fill: 'none', line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: heading ? 'Segoe UI' : 'Arial', bold: heading, fontSize: size,
    color, verticalAlignment: 'top', alignment: 'left', autoFit: 'none', wrap: 'none',
    insets: { left: 0, right: 0, top: 0, bottom: 0 } };
  return shape;
}
function rule(slide, x, y, width, color = palette.rule) {
  slide.shapes.add({ geometry: 'rect', name: `premium-rule-${++shapeNumber}`,
    position: { left: x, top: y, width, height: 1 }, fill: color, line: { fill: 'none', width: 0 } });
}
async function image(slide, file, x, y, width, height, alt, crop) {
  const sourceBytes = await fs.readFile(file);
  let embeddedBytes = sourceBytes;
  let contentType = 'image/png';
  if (jpegAssets.has(path.basename(file))) {
    const decoded = sharp(sourceBytes);
    const metadata = await decoded.metadata();
    if (metadata.hasAlpha && (await decoded.stats()).channels.at(-1).min !== 255) throw new Error(`Preserve meaningful alpha in ${path.basename(file)}.`);
    embeddedBytes = await decoded.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
    const encoded = await sharp(embeddedBytes).metadata();
    if (encoded.width !== metadata.width || encoded.height !== metadata.height) throw new Error('Image compression changed resolution.');
    contentType = 'image/jpeg';
    imageEncodings.push({ asset: path.relative(workspaceDir, file), sourceBytes: sourceBytes.length,
      embeddedBytes: embeddedBytes.length, width: metadata.width, height: metadata.height, quality: 95, chromaSubsampling: '4:4:4' });
  }
  slide.images.add({ blob: new Uint8Array(embeddedBytes), contentType, fit: 'contain',
    position: { left: x, top: y, width, height }, alt, ...(crop ? { crop } : {}) });
}
function base(number, dark = false) {
  const slide = presentation.slides.add();
  slide.background.fill = dark ? palette.navy : palette.paper;
  text(slide, 'Company profile', 72, 672, 260, 25, 18, dark ? palette.light : palette.muted);
  text(slide, String(number).padStart(2, '0'), 1164, 672, 44, 25, 18, dark ? palette.light : palette.muted);
  return slide;
}
const commonNotes = [
  'Company legal name, five service groups, delivery and current contacts: clients/oceanides/company-profile/profile-content.json and premium-content.json.',
  'Design inspiration: supplied Oceanides.pptx, especially slides 1, 2, 3, 4, 6, 9, 12 and 23. Reference images, equipment, staff and third-party marks are not reused.',
];
function notes(slide, lines = []) { slide.speakerNotes.textFrame.setText([...commonNotes, ...lines].join('\n')); }
const assets = path.join(profileDir, 'assets');
const [siphoning, plumbing, renovation, pest, stpService] = content.services;

// 1. A minimal opening, with the complete approved transparent emblem.
{
  const slide = base(1);
  await image(slide, path.join(assets, 'logo-transparent.png'), 72, 42, 172, 172, 'Approved Oceanides emblem, preserved in full');
  text(slide, 'Company\nprofile', 72, 264, 414, 168, 72, palette.blue, true);
  text(slide, 'Property services for homes\nand company facilities', 72, 468, 418, 80, 28);
  await image(slide, path.join(assets, 'cover-property-minimal.png'), 494, 142, 716, 478,
    'AI-generated conceptual property cutaway, not an actual project or engineering plan');
  text(slide, 'AI-generated conceptual illustration', 518, 628, 686, 26, 18, palette.muted);
  notes(slide, ['Logo: company-profile/assets/logo-transparent.png. Full emblem and alpha retained.',
    'Cover illustration: company-profile/assets/cover-property-minimal.png. Source brief: company-profile/assets/generated-sources.json.']);
}

// 2. Two sourced milestones, without invented expansion dates.
{
  const slide = base(2);
  text(slide, 'Company background', 72, 54, 1136, 88, 64, palette.blue, true);
  text(slide, 'Oceanides coordinates property services for homes,\ncondominiums and company facilities.', 72, 176, 1136, 86, 30);
  text(slide, 'We remain your main contact for scheduling, site access\nand service coordination from inquiry to turnover.', 72, 278, 1136, 76, 27, palette.muted);
  rule(slide, 72, 391, 1136);
  text(slide, '2021', 72, 419, 198, 78, 58, palette.blue, true);
  text(slide, 'Septic and plumbing services', 300, 422, 870, 48, 32, palette.ink, true);
  text(slide, content.history.stages[0].detail, 300, 480, 870, 42, 27);
  rule(slide, 72, 540, 1136);
  text(slide, 'Today', 72, 561, 210, 78, 58, palette.blue, true);
  text(slide, 'A broader property service offering', 300, 567, 880, 44, 32, palette.ink, true);
  text(slide, 'Five service groups for the care and upkeep of homes and facilities.', 300, 614, 886, 38, 25);
  notes(slide, ['Founding-year source: user-provided Oceanides.pptx, slide 1, "Oceanides Plumbing Services was established in 2021".',
    'Current offering: premium-content.json. No intervening milestone dates or years-of-experience claim inferred.',
    'Mission: ' + content.mission, 'Vision: ' + content.vision]);
}

// 3. A flat service index, with one row per group.
{
  const slide = base(3);
  text(slide, 'Our services', 72, 54, 1136, 88, 64, palette.blue, true);
  const titles = ['Siphoning', 'Plumbing', 'Renovation & restoration', 'Pest control', 'Sewage treatment plant (STP)'];
  const descriptions = ['Septic tank servicing based on\ntank conditions and site access.', 'Assessment and repair of drainage,\npipe and water leak problems.', 'Repairs and improvements tailored\nto the property and agreed scope.', 'Service planning based on pest concerns\nand a property assessment.', 'Coordination of projects that treat\nbuilding wastewater on site.'];
  for (let i = 0; i < titles.length; i++) {
    const y = 178 + i * 94;
    text(slide, String(i + 1).padStart(2, '0'), 72, y + 2, 56, 46, 30, palette.blue, true);
    text(slide, titles[i], 154, y + 1, 498, 64, i === 4 ? 30 : 32, palette.ink, true);
    text(slide, descriptions[i], 690, y, 518, 68, 25);
    if (i < titles.length - 1) rule(slide, 154, y + 77, 1054);
  }
  notes(slide);
}

// 4. Full portrait evidence photos, kept as an explicit matched pair.
{
  const slide = base(4);
  text(slide, 'Siphoning', 72, 54, 1136, 88, 64, palette.blue, true);
  text(slide, 'Septic tank servicing based on\ntank conditions and site access.', 72, 182, 440, 88, 28);
  text(slide, 'Service scope', 72, 320, 440, 44, 30, palette.ink, true);
  text(slide, 'Septic tank siphoning\nSeptic tank cleaning\nSite and service assessment', 72, 379, 440, 128, 26);
  text(slide, 'Actual Oceanides job photos', 72, 568, 435, 34, 22, palette.muted);
  await image(slide, path.join(workspaceDir, 'clients/oceanides/assets/tb2-ba2-before.png'), 552, 178, 280, 420,
    'Actual job photo before septic tank service');
  await image(slide, path.join(workspaceDir, 'clients/oceanides/assets/tb2-ba2-after.png'), 880, 178, 280, 420,
    'Matched actual job photo after septic tank service');
  text(slide, 'Before service', 552, 614, 280, 38, 25, palette.blue, true);
  text(slide, 'After service', 880, 614, 280, 38, 25, palette.blue, true);
  notes(slide, ['Matched before/after pair: clients/oceanides/assets/tb2-ba2-before.png and tb2-ba2-after.png. Neil confirmed these as real job photos on 2026-08-01.',
    'Original image proportions and complete evidence retained. Results describe this documented job, not a universal service guarantee.']);
}

// 5. Plumbing illustration with the working hands and tools intact.
{
  const slide = base(5);
  text(slide, 'Plumbing', 72, 54, 1136, 88, 64, palette.blue, true);
  await image(slide, path.join(assets, 'plumbing-service.png'), 72, 184, 632, 422,
    'AI-generated service illustration of a plumbing repair');
  text(slide, 'Assessment and repair of\ndrainage, pipe and water\nleak problems.', 764, 204, 444, 126, 28);
  text(slide, 'Drain declogging\n\nPlumbing and pipe\nleak repairs\n\nTroubleshooting based\non site findings', 764, 357, 444, 266, 26);
  text(slide, content.provenance.visualAssets.label, 72, 626, 632, 26, 18, palette.muted);
  notes(slide, ['Illustration: company-profile/assets/plumbing-service.png. Source brief: company-profile/assets/generated-sources.json. It does not depict Oceanides personnel or an actual completed job.']);
}

// 6. Full renovation scope, with a single principal image.
{
  const slide = base(6);
  text(slide, 'Renovation & restoration', 72, 54, 1136, 88, 64, palette.blue, true);
  text(slide, 'Repair and improvement work\ntailored to the property and\nagreed scope.', 72, 182, 468, 114, 28);
  text(slide, 'House and condominium\nrenovation\n\nCeiling repair or replacement\n\nRoof leak repair and waterproofing\n\nHouse cleaning within scope', 72, 328, 485, 302, 25);
  await image(slide, path.join(assets, 'renovation-service.png'), 578, 205, 630, 420,
    'AI-generated service illustration of ceiling restoration');
  text(slide, content.provenance.visualAssets.label, 578, 640, 630, 26, 18, palette.muted);
  notes(slide, ['Service scope includes restoration, ceiling repair or replacement, roof leak repair and waterproofing, and house cleaning within the agreed scope.',
    'Illustration: company-profile/assets/renovation-service.png. Source brief: company-profile/assets/generated-sources.json. It does not depict Oceanides personnel or an actual completed project.']);
}

// 7. Pest service remains assessment-led, without invented treatment claims.
{
  const slide = base(7);
  text(slide, 'Pest control', 72, 54, 1136, 88, 64, palette.blue, true);
  await image(slide, path.join(assets, 'pest-control-service.png'), 72, 184, 632, 422,
    'AI-generated service illustration of pest treatment');
  text(slide, 'Service planning based on\nreported pest concerns and\na property assessment.', 764, 204, 444, 126, 28);
  text(slide, 'Assessment of pest activity\n\nTreatment scope based\non site findings\n\nScheduling and\ncontractor coordination', 764, 357, 444, 266, 26);
  text(slide, content.provenance.visualAssets.label, 72, 626, 632, 26, 18, palette.muted);
  notes(slide, ['Illustration: company-profile/assets/pest-control-service.png. Source brief: company-profile/assets/generated-sources.json. It does not depict Oceanides personnel or an actual completed job.']);
}

// 8. A distinct frame from the existing film provides the technical introduction.
{
  const slide = base(8);
  text(slide, 'On-site sewage treatment\nplant (STP)', 72, 54, 1136, 156, 64, palette.blue, true);
  text(slide, 'An STP treats building wastewater\nbefore discharge through a suitable\noutlet. Oceanides coordinates the\nassessment and technical proposal.', 72, 262, 550, 140, 27);
  text(slide, 'Suitability depends on wastewater\nvolume, space, outlet requirements\nand operating costs. Sludge removal\nand equipment care continue.', 72, 448, 550, 140, 25);
  const overviewPath = path.join(assets, 'premium/stp-process-source.png');
  await image(slide, overviewPath, 648, 300, 560, 255,
    'Illustrative STP treatment cutaway from the existing Oceanides explainer film',
    { left: 0.175, top: 0.282, right: 0.135, bottom: 0.16 });
  text(slide, 'Illustrative process. Actual design follows assessment.', 648, 620, 560, 50, 18, palette.muted);
  notes(slide, [content.stp.qualification,
    'Visual: existing approved film overview frame, company-profile/assets/premium/stp-process-source.png. The model illustrates a general domestic-wastewater process, not an exact supplier design or Oceanides-owned facility.',
    ...videoStory.sources.map(source => source.url)]);
}

// 9. Artifact-tool authors the poster and notes. Native PowerPoint XML adds the film.
{
  const slide = presentation.slides.add();
  slide.background.fill = palette.paper;
  await image(slide, path.join(assets, 'meeting/stp-video-poster.png'), 0, 0, 1280, 720,
    'Oceanides STP explainer film. Click the movie to play.');
  notes(slide, ['Click the film to play. Native PowerPoint media controls support pause and replay.',
    'Duration: 99.733 seconds. Original approved narration, music and image sequence retained byte-for-byte.',
    'The film shows an illustrative treatment process. Capacity, treatment design, outlet requirements and operating costs follow the technical proposal.',
    ...videoStory.sources.map(source => source.url)]);
}

// 10. Contacts and delivery share a simple closing composition.
{
  const slide = base(10, true);
  text(slide, 'Site assessment and quotation', 72, 54, 1136, 88, 64, palette.paper, true);
  text(slide, 'Tell us the service you need, the\nproperty location and your preferred\ninspection schedule. We will coordinate\nthe assessment and prepare a quotation.', 72, 184, 560, 142, 27, palette.light);
  text(slide, content.contact.phone, 72, 386, 580, 60, 42, palette.paper, true);
  text(slide, content.contact.email, 72, 460, 604, 38, 25, palette.paper);
  text(slide, 'Tramo Street Corner Dandan,\nPasay City, Philippines 1300', 72, 516, 585, 72, 25, palette.light);
  for (let i = 0; i < content.delivery.steps.length; i++) {
    const step = content.delivery.steps[i];
    const detail = [
      'Review the concern, site access\nand work requirements.',
      'Confirm scope and pricing\nbefore scheduling.',
      'Arrange the team or specialist\nand coordinate site access.',
      'Review the agreed work and\nfollow-up within scope.',
    ][i];
    const y = 184 + i * 112;
    text(slide, String(i + 1).padStart(2, '0'), 730, y + 4, 56, 42, 26, palette.light, true);
    text(slide, step.name, 808, y, 400, 42, 30, palette.paper, true);
    text(slide, detail, 808, y + 51, 400, 65, 25, palette.light);
  }
  text(slide, content.callToAction.scopeNote, 72, 633, 1136, 34, 18, palette.light);
  notes(slide, [content.procurement, content.callToAction.body, content.company.legalName]);
}

const rawPath = path.join(runDir, 'artifact-authored.pptx');
await (await PresentationFile.exportPptx(presentation)).save(rawPath);
const zip = await JSZip.loadAsync(await fs.readFile(rawPath));
const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
// This runtime omits the declared crop for a contain-fit picture. Preserve it
// as native source-rectangle cropping, without altering the original asset.
let technicalXml = await zip.file('ppt/slides/slide8.xml').async('string');
const technicalPicture = technicalXml.match(/<p:pic>.*?<\/p:pic>/s)?.[0];
if (!technicalPicture || technicalXml.match(/<p:pic>/g)?.length !== 1) throw new Error('Expected one technical illustration on slide 8.');
const correctedPicture = technicalPicture
  .replace(/(<p:blipFill>.*?<\/a:blip>|<p:blipFill>.*?<a:blip\b[^>]*\/>)\s*(?:<a:srcRect\b[^>]*\/>|)/s,
    '$1<a:srcRect l="17500" t="28200" r="13500" b="16000" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>')
  .replace(/<a:off\b[^>]*\/>/, '<a:off x="6172200" y="2857500"/>')
  .replace(/<a:ext\b[^>]*\/>/, '<a:ext cx="5334000" cy="2428875"/>')
  .replace(/<a:stretch\b([^>]*)\/>/, '<a:stretch$1><a:fillRect/></a:stretch>');
if (!correctedPicture.includes('<a:srcRect l="17500"')) throw new Error('The technical source crop was not encoded.');
technicalXml = technicalXml.replace(technicalPicture, correctedPicture);
zip.file('ppt/slides/slide8.xml', technicalXml);
const nativeXml = await fs.readFile(path.join(assets, 'meeting/native-video-reference.xml'), 'utf8');
const nativePicture = nativeXml.match(/<p:nvPicPr>.*?<\/p:nvPicPr>/s)?.[0];
const nativeTiming = nativeXml.match(/<p:timing>.*?<\/p:timing>/s)?.[0];
if (!nativePicture?.includes('ppaction://media') || !nativeTiming?.includes('delay="indefinite"')) throw new Error('Native reference lacks click-to-play behavior.');
let movieXml = await zip.file('ppt/slides/slide9.xml').async('string');
const pictureId = movieXml.match(/<p:pic>.*?<p:cNvPr id="([^"]+)"/s)?.[1];
if (!pictureId) throw new Error('The video slide lacks the required full-frame artifact-tool poster.');
movieXml = movieXml.replace(/<p:sld\b([^>]*)>/, (_, attrs) => `<p:sld${attrs} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${relNs}">`);
movieXml = movieXml.replace(/<p:nvPicPr>.*?<\/p:nvPicPr>/s,
  nativePicture.replace(/<p:cNvPr id="2"/, `<p:cNvPr id="${pictureId}"`).replace('<a:hlinkClick r:id=""', '<a:hlinkClick'));
movieXml = movieXml.replace(/<a:blip\b[^>]*r:embed="[^"]+"[^>]*\/>/, '<a:blip r:embed="rId5" />');
movieXml = movieXml.replace('</p:sld>', nativeTiming.replace('spid="2"', `spid="${pictureId}"`) + '</p:sld>');
zip.file('ppt/slides/slide9.xml', movieXml);
zip.file('ppt/slides/_rels/slide9.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + [
  ['rId1', 'http://schemas.microsoft.com/office/2007/relationships/media', '../media/oceanides-stp-premium.mp4'],
  ['rId2', `${relNs}/video`, '../media/oceanides-stp-premium.mp4'],
  ['rId3', `${relNs}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
  ['rId4', `${relNs}/notesSlide`, '../notesSlides/notesSlide9.xml'],
  ['rId5', `${relNs}/image`, '../media/oceanides-stp-premium-poster.png'],
].map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('') + '</Relationships>');
zip.file('ppt/media/oceanides-stp-premium.mp4', videoBytes);
zip.file('ppt/media/oceanides-stp-premium-poster.png', await fs.readFile(path.join(assets, 'meeting/stp-video-poster.png')));
let typesXml = await zip.file('[Content_Types].xml').async('string');
if (!typesXml.includes('Extension="mp4"')) typesXml = typesXml.replace('</Types>', '<Default Extension="mp4" ContentType="video/mp4"/></Types>');
zip.file('[Content_Types].xml', typesXml);
const candidatePath = path.join(runDir, 'candidate.pptx');
await fs.writeFile(candidatePath, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
const finalizedPath = path.join(runDir, 'deliverable/finalized.pptx');
await fs.mkdir(path.dirname(finalizedPath), { recursive: true });
const receiptPath = path.join(runDir, 'finalization.json');
await finalizePresentation({ workspaceDir, candidatePath, finalPath: finalizedPath,
  pythonExecutable: path.join(runtimeDir, 'python/python.exe'),
  integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
  explicitTotalSlideCount: 10, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: 'design', families: ['Arial', 'Segoe UI'] }, verifyArtifactToolImport: true, receiptPath,
});
const finalBytes = await fs.readFile(finalizedPath);
const finalZip = await JSZip.loadAsync(finalBytes);
if (hash(await finalZip.file('ppt/media/oceanides-stp-premium.mp4').async('uint8array')) !== videoSha256) throw new Error('Embedded film bytes changed.');
if (/TargetMode="External"/.test(await finalZip.file('ppt/slides/_rels/slide9.xml.rels').async('string'))) throw new Error('The film must be embedded internally.');
const checked = await PresentationFile.importPptx(await FileBlob.load(finalizedPath));
if (checked.slides.items.length !== 10) throw new Error('Incorrect final slide count.');
for (let i = 0; i < checked.slides.items.length; i++) {
  const slide = checked.slides.items[i];
  const png = await checked.export({ slide, format: 'png', scale: 1.5 });
  await fs.writeFile(path.join(runDir, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
  await fs.writeFile(path.join(runDir, `slide-${i + 1}.layout.json`), await (await slide.export({ format: 'layout' })).text());
}
const outputNow = await fs.readFile(finalPath).catch(() => null);
if ((previousOutput ? hash(previousOutput) : null) !== (outputNow ? hash(outputNow) : null)) throw new Error('The premium output changed during this build. Preserve it and retry.');
const stagedOutput = path.join(path.dirname(finalPath), `.${path.basename(finalPath, '.pptx')}-${crypto.randomUUID()}.pptx`);
try {
  await fs.copyFile(finalizedPath, stagedOutput);
  if (hash(await fs.readFile(stagedOutput)) !== hash(finalBytes)) throw new Error('Staged output bytes differ from the finalized deck.');
  const outputBeforePromotion = await fs.readFile(finalPath).catch(() => null);
  if ((previousOutput ? hash(previousOutput) : null) !== (outputBeforePromotion ? hash(outputBeforePromotion) : null)) throw new Error('The premium output changed before promotion.');
  await fs.rename(stagedOutput, finalPath);
} finally {
  await fs.rm(stagedOutput, { force: true });
}
const verification = { finalPath, finalSha256: hash(finalBytes), bytes: finalBytes.length, slideCount: 10,
  slideSize: [1280, 720], fontPolicy: ['Arial', 'Segoe UI'], receiptPath, renderDir: runDir,
  videoPath, videoSha256, embeddedVideo: 'ppt/media/oceanides-stp-premium.mp4', durationSeconds: 99.73333333333333,
  manualStart: true, nativeMovieAction: 'ppaction://media', nativeStartDelay: 'indefinite',
  nativePowerPointReadOnlyOpen: false, nativeSlideshowPlaybackVerified: false };
verification.imageEncodings = imageEncodings;
await fs.writeFile(path.join(runDir, 'verification.json'), JSON.stringify(verification, null, 2) + '\n');
await fs.writeFile(path.join(buildDir, 'latest.json'), JSON.stringify(verification, null, 2) + '\n');
console.log(JSON.stringify(verification, null, 2));
