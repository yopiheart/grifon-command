import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile, FileBlob } from '@oai/artifact-tool';

const workspaceDir = process.cwd();
const TMP_DIR = path.join(workspaceDir, '.tmp', 'oceanides-profile');
const SKILL_DIR = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const RUNTIME_PYTHON = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const revision = process.argv[2] || '';
if (revision && !/^[a-zA-Z0-9-]+$/.test(revision)) throw new Error('Use an alphanumeric revision suffix.');
const FINAL_PPTX = path.join(workspaceDir, `clients/oceanides/company-profile/output/pptx/Oceanides-Company-Profile${revision?'-'+revision:''}.pptx`);
const { finalizePresentation } = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')).href);
const spec = JSON.parse(await fs.readFile(path.join(TMP_DIR, 'layout.json'), 'utf8'));
const presentation = Presentation.create({slideSize: {width: spec.width, height: spec.height}});
const sources = [
 'Logo: latest JPG supplied by Neil on 2026-10-01, canonical clients/oceanides/assets/logo.jpg.',
 'Service scope, Oceanides coordination and intended audience: user briefing in this chat.',
 'Phone, email and address: user-supplied Facebook Page screenshot 1000040025.jpg; phone also explicitly confirmed by Neil.',
 'Legal company name: workflows/oceanides_business_model.md, existing company records.',
 'Design inspiration: Metro Rod Services Explained brochure; Oceanides colors from clients/oceanides/DESIGN.md.',
 'No assertion of supplier accreditation, equipment ownership, licenses, project volume, treatment-system capability or maintenance-free operation.'
];
let count = 0;
for (const page of spec.pages) {
 const slide = presentation.slides.add();
 slide.background.fill = page.background;
 for (const el of page.elements) {
  const position = {left:el.x, top:el.y, width:el.w, height:el.h};
  if (el.type === 'image') {
   const bytes = new Uint8Array(await fs.readFile(el.renderPath ?? path.join(workspaceDir, el.path)));
   slide.images.add({blob:bytes, contentType:'image/jpeg', fit:el.fit, position, alt:el.alt});
  } else {
   const shape = slide.shapes.add({geometry:el.type==='text'?'textbox':'rect', name:`profile-${++count}`, position,
     fill:el.type==='text'?'none':el.color, line:{fill:'none',width:0}});
   if (el.type==='text') {
    shape.text = el.text;
    shape.text.style = {typeface:spec.fonts[el.font].family, bold:spec.fonts[el.font].bold,
      fontSize:el.size, color:el.color, verticalAlignment:'top', alignment:'left',
      autoFit:'none', wrap:'none', insets:{left:0,right:0,top:0,bottom:0}};
   }
  }
 }
 slide.speakerNotes.textFrame.setText(sources.join('\n')+'\n'+
   (spec.pages.indexOf(page)===0?'Cover vehicle: clients/oceanides/assets/tb2-truck-street.png, approved real vehicle source in client design/asset records.':'' )+
   (spec.pages.indexOf(page)===2?'Matched before/after pair: clients/oceanides/assets/tb2-ba2-before.png and tb2-ba2-after.png. Neil confirmed real job photos on 2026-08-01; see client DESIGN.md and asset-builder source.':''));
}

const candidatePath = path.join(TMP_DIR,'candidate.pptx');
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
await finalizePresentation({workspaceDir, candidatePath, finalPath:FINAL_PPTX,
 pythonExecutable:RUNTIME_PYTHON,
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu',`${spec.width*9525},${spec.height*9525}`,'--validate-bullet-geometry','--validate-heading-fit'],
 explicitTotalSlideCount:6, requiredNativeTableOwnerSlides:[], requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:['Arial','Arial Narrow']}, verifyArtifactToolImport:true,
 receiptPath:path.join(TMP_DIR,`presentation-validation${revision?'-'+revision:''}.json`)});
const checked = await PresentationFile.importPptx(await FileBlob.load(FINAL_PPTX));
for (let i=0;i<spec.pages.length;i++) {
 const slide = checked.slides.items[i];
 const preview = await checked.export({slide,format:'png',scale:1.5});
 await fs.writeFile(path.join(TMP_DIR,`pptx-page-${i+1}.png`),new Uint8Array(await preview.arrayBuffer()));
 const layout = await slide.export({format:'layout'});
 await fs.writeFile(path.join(TMP_DIR,`pptx-page-${i+1}.json`),await layout.text());
}
console.log(`Created and finalized ${FINAL_PPTX}`);
