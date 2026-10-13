import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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
  slide.speakerNotes.textFrame.setText(page.notes + '\nSources: owner interview 2026-10-11, supplied prior profile and role/client/address confirmations 2026-10-12; company/provider Drive records supplied 2026-10-13. Reference imagery is labeled. Client logos do not imply endorsement. OPC tax details remain to follow.');
}
const candidate = path.join(tmp, `candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidate);
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
for (let i = 0; i < spec.pages.length; i++) {
  const png = await checked.export({ slide: checked.slides.items[i], format: 'png', scale: 1 });
  await fs.writeFile(path.join(tmp, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({ pptx: output, slides: spec.pages.length, renders: tmp }));
