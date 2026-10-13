import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';
import JSZip from 'jszip';
import { Presentation, PresentationFile, FileBlob } from '@oai/artifact-tool';

const root = process.cwd();
const skill = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations';
const tmp = path.join(root, '.tmp/oceanides-audited-profile');
const spec = JSON.parse(await fs.readFile(path.join(tmp, 'layout.json'), 'utf8'));
const revision = spec.revision;
const output = path.join(root, `clients/oceanides/company-profile/output/pptx/Oceanides-Company-Profile-${revision}.pptx`);
const presentation = Presentation.create({ slideSize: { width: spec.width, height: spec.height } });
let count = 0;
for (const page of spec.pages) {
  const slide = presentation.slides.add();
  slide.background.fill = page.background;
  for (const el of page.elements) {
    const position = { left: el.x, top: el.y, width: el.w, height: el.h };
    if (el.type === 'image') {
      slide.images.add({ blob: new Uint8Array(await fs.readFile(el.renderPath)), contentType: 'image/jpeg', position, fit: 'cover', alt: el.alt });
    } else {
      const shape = slide.shapes.add({ geometry: el.type === 'text' ? 'textbox' : 'rect', name: 'profile-' + (++count), position, fill: el.type === 'text' ? 'none' : el.color, line: { fill: 'none', width: 0 } });
      if (el.type === 'text') {
        shape.text = el.text;
        shape.text.style = { typeface: spec.fonts[el.font].family, bold: spec.fonts[el.font].bold, fontSize: el.size, color: el.color, verticalAlignment: 'top', alignment: 'left', autoFit: 'none', wrap: 'none', insets: { left: 0, right: 0, top: 0, bottom: 0 } };
      }
    }
  }
  slide.speakerNotes.textFrame.setText(page.notes + '\nSources: owner interview 2026-10-11, supplied prior profile and role/client/address confirmations 2026-10-12; company/provider Drive records supplied 2026-10-13, including BIR Form 2303 and PhilGEPS Red-registration printout. Corporate TIN and branch code: 693-974-075-00000. Reference imagery is labeled. Client logos do not imply endorsement.');
}
const candidate = path.join(tmp, `candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidate);
// Reuse the native movie relationship/timing pattern from the saved STP deck.
// Artifact Tool authors the branded slide and poster; exact MP4 bytes are embedded.
const mediaOwner = spec.pages.findIndex(page => page.media);
if (mediaOwner >= 0) {
  const number = mediaOwner + 1;
  const metadata = spec.pages[mediaOwner].media;
  const videoBytes = await fs.readFile(path.join(root, 'clients/oceanides/company-profile/output/media', metadata.file));
  const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  if (hash(videoBytes) !== metadata.sha256) throw new Error('Existing approved video bytes changed.');
  const zip = await JSZip.loadAsync(await fs.readFile(candidate));
  const member = `ppt/slides/slide${number}.xml`;
  let xml = await zip.file(member).async('string');
  const pictures = [...xml.matchAll(/<p:pic>.*?<\/p:pic>/gs)];
  const poster = pictures.at(-1)?.[0];
  const pictureId = poster?.match(/<p:cNvPr id="([^"]+)"/)?.[1];
  if (!pictureId || pictures.length !== 2) throw new Error('Expected logo and video-poster pictures.');
  const reference = await fs.readFile(path.join(root, 'clients/oceanides/company-profile/assets-video/native-video-reference.xml'), 'utf8');
  let nativePicture = reference.match(/<p:nvPicPr>.*?<\/p:nvPicPr>/s)?.[0];
  const timing = reference.match(/<p:timing>.*?<\/p:timing>/s)?.[0];
  if (!nativePicture?.includes('ppaction://media') || !timing?.includes('delay="indefinite"')) throw new Error('Manual movie reference is missing.');
  nativePicture = nativePicture.replace(/<p:cNvPr id="2"/, `<p:cNvPr id="${pictureId}"`)
    .replace('<a:hlinkClick r:id=""', '<a:hlinkClick')
    .replace('r:link="rId2"', 'r:link="RstpVideo"')
    .replace('r:embed="rId1"', 'r:embed="RstpMedia"');
  xml = xml.replace(poster, poster.replace(/<p:nvPicPr>.*?<\/p:nvPicPr>/s, nativePicture));
  xml = xml.replace('</p:sld>', timing.replaceAll('spid="2"', `spid="${pictureId}"`) + '</p:sld>');
  // The reference adds DrawingML relationship attributes to the picture.
  const rootTag = xml.match(/<p:sld\b[^>]*>/)?.[0] ?? '';
  if (!rootTag.includes('xmlns:a=')) xml = xml.replace('<p:sld ', '<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ');
  if (!rootTag.includes('xmlns:r=')) xml = xml.replace('<p:sld ', '<p:sld xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
  zip.file(member, xml);
  const relMember = `ppt/slides/_rels/slide${number}.xml.rels`;
  const rels = await zip.file(relMember).async('string');
  const relationNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  zip.file(relMember, rels.replace('</Relationships>',
    `<Relationship Id="RstpMedia" Type="http://schemas.microsoft.com/office/2007/relationships/media" Target="../media/oceanides-stp.mp4"/>` +
    `<Relationship Id="RstpVideo" Type="${relationNs}/video" Target="../media/oceanides-stp.mp4"/></Relationships>`));
  zip.file('ppt/media/oceanides-stp.mp4', videoBytes);
  let types = await zip.file('[Content_Types].xml').async('string');
  if (!types.includes('Extension="mp4"')) types = types.replace('</Types>', '<Default Extension="mp4" ContentType="video/mp4"/></Types>');
  zip.file('[Content_Types].xml', types);
  await fs.writeFile(candidate, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } }));
}
const { finalizePresentation } = await import(pathToFileURL(path.join(skill, 'container_tools/artifact_tool_utils.mjs')).href);
await finalizePresentation({ workspaceDir: root, candidatePath: candidate, finalPath: output,
  pythonExecutable: 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  integrityValidatorPath: path.join(skill, 'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath: path.join(skill, 'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs: ['--expected-slide-size-emu', `${spec.width * 9525},${spec.height * 9525}`, '--validate-bullet-geometry', '--validate-heading-fit'],
  explicitTotalSlideCount: spec.pages.length, requiredNativeTableOwnerSlides: [], requiredNativeChartOwnerSlides: [],
  fontPolicy: { basis: 'design', families: ['Segoe UI'] }, verifyArtifactToolImport: true,
  receiptPath: path.join(tmp, `validation-${revision}.json`)
});
const checked = await PresentationFile.importPptx(await FileBlob.load(output));
if (mediaOwner >= 0) {
  const finalZip = await JSZip.loadAsync(await fs.readFile(output));
  const embedded = await finalZip.file('ppt/media/oceanides-stp.mp4').async('nodebuffer');
  const actual = crypto.createHash('sha256').update(embedded).digest('hex');
  if (actual !== spec.pages[mediaOwner].media.sha256) throw new Error('Final embedded movie changed.');
  await fs.writeFile(path.join(tmp, `media-verification-${revision}.json`), JSON.stringify({ slide: mediaOwner + 1, sha256: actual, duration_seconds: spec.pages[mediaOwner].media.duration_seconds, self_contained: true, manual_playback: true, nativePowerPointPlaybackVerified: false }, null, 2));
}
for (let i = 0; i < spec.pages.length; i++) {
  const png = await checked.export({ slide: checked.slides.items[i], format: 'png', scale: 1 });
  await fs.writeFile(path.join(tmp, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({ pptx: output, slides: spec.pages.length, renders: tmp }));
