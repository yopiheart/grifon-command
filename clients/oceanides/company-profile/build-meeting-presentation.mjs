import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';

const workspaceDir = process.cwd();
const profileDir = path.join(workspaceDir, 'clients/oceanides/company-profile');
const buildDir = path.join(workspaceDir, '.tmp/oceanides-meeting');
const runtimeDir = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
process.env.RUNTIME_NODE_MODULES ??= path.join(runtimeDir, 'node/node_modules');
const skillDir = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const { Presentation, PresentationFile, FileBlob } = await import(pathToFileURL(path.join(runtimeDir, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs')).href);
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, 'container_tools/artifact_tool_utils.mjs')).href);
const sourcePath = path.join(profileDir, 'output/pptx/Oceanides-Company-Profile-Widescreen-STP-Confirmed.pptx');
const sourceSha = '64b49b8234d8bf4839a8c2dc21d8b19ce58a78a6dab112f25e087cf6ea569d1a';
const videoPath = path.join(workspaceDir, 'clients/oceanides/stp-explainer/output/Oceanides-STP-Aira-Tight-Voice-Music-1080p.mp4');
const expectedVideoSha = process.argv[2];
const posterSource = process.argv[3];
const nativeReference = path.join(profileDir, 'assets/meeting/native-video-reference.xml');
const finalPath = path.join(profileDir, 'output/pptx/Oceanides-Company-Profile-STP-Meeting-Review.pptx');
const stagedPath = path.join(path.dirname(finalPath), `.${path.basename(finalPath, '.pptx')}-${crypto.randomUUID()}.pptx`);
const sourceOrder = [1, 2, 3, 4, 6, 7, 5, 'video', 8];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const relationNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
if (!/^[a-f0-9]{64}$/.test(expectedVideoSha ?? '') || !posterSource) {
  throw new Error('Supply the verified tight-video SHA256 and its actual exported opening poster PNG.');
}
await fs.mkdir(buildDir, { recursive: true });
await fs.mkdir(path.join(profileDir, 'assets/meeting'), { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const replaceReview = process.argv[4] === '--replace-review';
if (await fs.stat(finalPath).catch(() => null) && !replaceReview) throw new Error('Keep the existing finalized review deck unless this task-owned review revision is explicitly replaced.');
const sourceBytes = await fs.readFile(sourcePath);
const videoBytes = await fs.readFile(videoPath);
const posterBytes = await fs.readFile(posterSource);
if (hash(sourceBytes) !== sourceSha) throw new Error('The approved source presentation changed.');
if (hash(videoBytes) !== expectedVideoSha) throw new Error('The tight-video file does not match the verified export.');
const tightStory = JSON.parse(await fs.readFile(path.join(workspaceDir, 'clients/oceanides/stp-explainer/story-aira-tight.json'), 'utf8'));
const duration = tightStory.scenes.at(-1).end;
if (!(duration > 90 && duration < 110)) throw new Error('Expected the newly tightened film, not the old 139.3-second take.');
const posterPath = path.join(profileDir, 'assets/meeting/stp-video-poster.png');
await fs.writeFile(posterPath, posterBytes);

const posterDeck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const posterSlide = posterDeck.slides.add();
posterSlide.background.fill = '#F7F7F2';
posterSlide.images.add({ blob: new Uint8Array(posterBytes), contentType: 'image/png', fit: 'contain',
  position: { left: 0, top: 0, width: 1280, height: 720 }, alt: 'Oceanides on-site STP explainer film' });
posterSlide.speakerNotes.textFrame.setText([
  'Before playback: introduce this film as an illustration of how an on-site STP treats building wastewater.',
  'Click the film to start. Use the native video controls to pause or replay when a client asks a question.',
  'After the film: advance to the next slide and discuss a site assessment and written quotation.',
  'Invite the client to share recent siphoning invoices and site conditions for assessment. Savings depend on the proposed system, outlet and operating costs. Sludge removal and equipment care remain part of the assessment.',
  'The film depicts a general treatment process, not an exact supplier design or an Oceanides-owned facility.',
  ...tightStory.sources.map(source => source.url),
].join('\n'));
const posterDraft = path.join(buildDir, 'poster-slide.pptx');
await (await PresentationFile.exportPptx(posterDeck)).save(posterDraft);
const [sourceZip, posterZip] = await Promise.all([
  JSZip.loadAsync(sourceBytes), JSZip.loadAsync(await fs.readFile(posterDraft)),
]);
const presentationXml = await sourceZip.file('ppt/presentation.xml').async('string');
const entries = [...presentationXml.matchAll(/<p:sldId\b[^>]*\/>/g)].map(match => match[0]);
if (entries.length !== 8 || !presentationXml.includes('cx="12192000" cy="6858000"')) throw new Error('Unexpected source deck structure.');
const footerEdits = [];
for (const [sourceNumber, displayNumber] of [[6, 5], [7, 6], [5, 7]]) {
  const member = `ppt/slides/slide${sourceNumber}.xml`;
  const before = await sourceZip.file(member).async('string');
  const oldFooter = `<a:t>${String(sourceNumber).padStart(2, '0')}</a:t>`;
  const newFooter = `<a:t>${String(displayNumber).padStart(2, '0')}</a:t>`;
  if (before.split(oldFooter).length !== 2) throw new Error(`Expected one footer numeral in source slide ${sourceNumber}.`);
  sourceZip.file(member, before.replace(oldFooter, newFooter));
  footerEdits.push({ member, oldFooter, newFooter });
}
sourceZip.file('ppt/presentation.xml', presentationXml.replace(/<p:sldIdLst>.*?<\/p:sldIdLst>/s,
  `<p:sldIdLst>${sourceOrder.map(number => number === 'video' ? `<p:sldId id="264" r:id="RmeetingVideo" xmlns:r="${relationNs}" />` : entries[number - 1]).join('')}</p:sldIdLst>`));
const presentationRels = await sourceZip.file('ppt/_rels/presentation.xml.rels').async('string');
sourceZip.file('ppt/_rels/presentation.xml.rels', presentationRels.replace('</Relationships>',
  `<Relationship Type="${relationNs}/slide" Target="/ppt/slides/slide9.xml" Id="RmeetingVideo" /></Relationships>`));

let videoSlideXml = await posterZip.file('ppt/slides/slide1.xml').async('string');
const nativeXml = await fs.readFile(nativeReference, 'utf8');
const nativePicture = nativeXml.match(/<p:nvPicPr>.*?<\/p:nvPicPr>/s)?.[0];
const nativeTiming = nativeXml.match(/<p:timing>.*?<\/p:timing>/s)?.[0];
if (!nativePicture?.includes('ppaction://media') || !nativeTiming?.includes('delay="indefinite"')) {
  throw new Error('The native PowerPoint reference does not have manual media playback.');
}
const pictureId = videoSlideXml.match(/<p:pic>.*?<p:cNvPr id="([^"]+)"/s)?.[1];
if (!pictureId) throw new Error('Artifact-tool did not author the full-frame poster picture.');
videoSlideXml = videoSlideXml.replace(/<p:sld\b([^>]*)>/, (_, attrs) => `<p:sld${attrs} xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${relationNs}">`);
videoSlideXml = videoSlideXml.replace(/<p:nvPicPr>.*?<\/p:nvPicPr>/s,
  nativePicture.replace(/<p:cNvPr id="2"/, `<p:cNvPr id="${pictureId}"`).replace('<a:hlinkClick r:id=""', '<a:hlinkClick'));
videoSlideXml = videoSlideXml.replace(/<a:blip\b[^>]*r:embed="[^"]+"[^>]*\/>/, '<a:blip r:embed="rId5" />');
videoSlideXml = videoSlideXml.replace('</p:sld>', nativeTiming.replace('spid="2"', `spid="${pictureId}"`) + '</p:sld>');
sourceZip.file('ppt/slides/slide9.xml', videoSlideXml);
sourceZip.file('ppt/slides/_rels/slide9.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` + [
  ['rId1', 'http://schemas.microsoft.com/office/2007/relationships/media', '../media/oceanides-stp-meeting.mp4'],
  ['rId2', `${relationNs}/video`, '../media/oceanides-stp-meeting.mp4'],
  ['rId3', `${relationNs}/slideLayout`, '../slideLayouts/slideLayout1.xml'],
  ['rId4', `${relationNs}/notesSlide`, '../notesSlides/notesSlide9.xml'],
  ['rId5', `${relationNs}/image`, '../media/oceanides-stp-meeting-poster.png'],
].map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('') + '</Relationships>');
sourceZip.file('ppt/notesSlides/notesSlide9.xml', await posterZip.file('ppt/notesSlides/notesSlide1.xml').async('uint8array'));
sourceZip.file('ppt/notesSlides/_rels/notesSlide9.xml.rels', `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="RmeetingSlide" Type="${relationNs}/slide" Target="../slides/slide9.xml"/><Relationship Id="RmeetingNotesMaster" Type="${relationNs}/notesMaster" Target="../notesMasters/notesMaster1.xml"/></Relationships>`);
sourceZip.file('ppt/media/oceanides-stp-meeting.mp4', videoBytes);
sourceZip.file('ppt/media/oceanides-stp-meeting-poster.png', posterBytes);
let types = await sourceZip.file('[Content_Types].xml').async('string');
if (!types.includes('Extension="mp4"')) types = types.replace('</Types>', '<Default Extension="mp4" ContentType="video/mp4"/></Types>');
types = types.replace('</Types>', '<Override PartName="/ppt/slides/slide9.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/notesSlides/notesSlide9.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/></Types>');
sourceZip.file('[Content_Types].xml', types);
const appXml = await sourceZip.file('docProps/app.xml').async('string');
sourceZip.file('docProps/app.xml', appXml.replace(/<ap:Slides>\d+<\/ap:Slides>/, '<ap:Slides>9</ap:Slides>').replace(/<ap:Notes>\d+<\/ap:Notes>/, '<ap:Notes>9</ap:Notes>'));
const candidatePath = path.join(buildDir, 'candidate.pptx');
const receiptPath = path.join(buildDir, `finalization-${expectedVideoSha.slice(0, 12)}-${Date.now()}.json`);
await fs.writeFile(candidatePath, await sourceZip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
try {
  await finalizePresentation({
    workspaceDir, candidatePath, finalPath: stagedPath,
    pythonExecutable: path.join(runtimeDir, 'python/python.exe'),
    integrityValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_package_integrity.py'),
    layoutValidatorPath: path.join(skillDir, 'container_tools/inspect_presentation_layout_geometry.py'),
    layoutArgs: ['--expected-slide-size-emu', '12192000,6858000', '--validate-bullet-geometry', '--validate-heading-fit'],
    explicitTotalSlideCount: 9, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
    fontPolicy: { basis: 'reference', families: ['Arial', 'Segoe UI'], referencePath: sourcePath, referenceSha256: sourceSha },
    verifyArtifactToolImport: true, receiptPath,
  });
  const finalBytes = await fs.readFile(stagedPath);
  const finalZip = await JSZip.loadAsync(finalBytes);
  const originalZip = await JSZip.loadAsync(sourceBytes);
  const allowedChanges = new Set(['ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels', '[Content_Types].xml', 'docProps/app.xml', ...footerEdits.map(edit => edit.member)]);
  const preserved = [];
  for (const [name, file] of Object.entries(originalZip.files)) {
    if (file.dir || allowedChanges.has(name)) continue;
    const before = await file.async('uint8array');
    const after = await finalZip.file(name)?.async('uint8array');
    if (!after || hash(before) !== hash(after)) throw new Error(`Original source member changed: ${name}`);
    preserved.push(name);
  }
  if (hash(await finalZip.file('ppt/media/oceanides-stp-meeting.mp4').async('uint8array')) !== expectedVideoSha) throw new Error('Embedded video bytes changed.');
  const rels = await finalZip.file('ppt/slides/_rels/slide9.xml.rels').async('string');
  if (/TargetMode="External"/.test(rels)) throw new Error('The STP film must be self-contained.');
  const checked = await PresentationFile.importPptx(await FileBlob.load(stagedPath));
  for (let i = 0; i < checked.slides.items.length; i++) {
    const slide = checked.slides.items[i];
    const png = await checked.export({ slide, format: 'png', scale: 1.5 });
    await fs.writeFile(path.join(buildDir, `slide-${i + 1}.png`), new Uint8Array(await png.arrayBuffer()));
    await fs.writeFile(path.join(buildDir, `slide-${i + 1}.json`), await (await slide.export({ format: 'layout' })).text());
  }
  const verification = { sourcePath, sourceSha, sourceOrder, finalPath, finalSha256: hash(finalBytes), byteCount: finalBytes.length,
    finalizationReceipt: receiptPath,
    slideSizeEmu: [12192000, 6858000], slideCount: 9, videoPath, videoSha256: expectedVideoSha, duration,
    embeddedVideo: 'ppt/media/oceanides-stp-meeting.mp4', nativeMovieAction: 'ppaction://media', startDelay: 'indefinite',
    posterSha256: hash(posterBytes), originalMembersPreserved: preserved.length, footerEdits, nativePowerPointPlaybackVerified: false };
  if (!replaceReview && await fs.stat(finalPath).catch(() => null)) throw new Error('A finalized review deck appeared during validation; preserve it.');
  await fs.rename(stagedPath, finalPath);
  await fs.writeFile(path.join(buildDir, 'meeting-verification.json'), JSON.stringify(verification, null, 2) + '\n');
  console.log(JSON.stringify({ finalPath, finalSha256: verification.finalSha256, videoSha256: expectedVideoSha, duration, originalMembersPreserved: preserved.length }));
} finally {
  await fs.rm(stagedPath, { force: true });
}
