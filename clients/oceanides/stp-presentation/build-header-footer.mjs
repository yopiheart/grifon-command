import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile, FileBlob } from '@oai/artifact-tool';

const root = process.cwd();
const base = path.join(root, 'clients/oceanides/stp-presentation');
const tmp = path.join(root, '.tmp/oceanides-stp-header-footer');
const skill = 'C:/Users/ADMIN/.codex/plugins/cache/openai-primary-runtime/presentations/26.1011.11113/skills/presentations';
const python = 'C:/Users/ADMIN/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const output = path.join(base, 'output/Oceanides-Advanced-STP-Branded-v1.pptx');
const bands = Presentation.create({slideSize:{width:1280,height:720}});
const logo = new Uint8Array(await fs.readFile(path.join(root,'clients/oceanides/assets/logo.jpg')));

function rectangle(slide,name,x,y,w,h,color) {
  slide.shapes.add({name,geometry:'rect',position:{left:x,top:y,width:w,height:h},fill:color,line:{fill:'none',width:0}});
}
function text(slide,name,value,x,y,w,h,size,color,bold=false) {
  const shape=slide.shapes.add({name,geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  shape.text=value;
  shape.text.style={typeface:'Segoe UI',fontSize:size,color,bold,verticalAlignment:'top',alignment:'left',autoFit:'none',wrap:'none',insets:0};
}
for(let i=1;i<=9;i++) {
  const slide=bands.slides.add();
  rectangle(slide,'Oceanides header',0,0,1280,92,'#ECF7FF');
  rectangle(slide,'Oceanides header rule',0,88,1280,4,'#2DAEEC');
  slide.images.add({name:'Oceanides company logo',blob:logo,contentType:'image/jpeg',position:{left:42,top:9,width:70,height:70},fit:'contain',alt:'Oceanides company logo'});
  text(slide,'Oceanides name','OCEANIDES',132,7,810,26,22,'#0E2C5E',true);
  text(slide,'Oceanides legal name','Plumbing Siphoning & Pest Management Services OPC',132,33,1050,23,16.5,'#0E2C5E',true);
  text(slide,'Oceanides contacts','(02) 8633 8486 / 8330 1329   |   Globe 0917 671 6383   |   Smart 0939 245 6217',132,56,1050,20,13.5,'#0E2C5E');
  text(slide,'Oceanides email','marketing@oceanidessepticandpest.com',132,74,850,15,11.5,'#0E2C5E');
  text(slide,'Oceanides corporate TIN','OPC TIN: 693-974-075-00000',1014,10,230,18,11.5,'#1267A5',true);
  rectangle(slide,'Oceanides footer',0,658,1280,62,'#0E2C5E');
  rectangle(slide,'Oceanides footer rule',0,658,1280,3,'#2DAEEC');
  text(slide,'Oceanides website and Facebook','oceanidesph.com   |   facebook.com/OceanidesMalabanan',42,670,1100,22,15,'#FFFFFF');
  text(slide,'Oceanides company emails','marketing@oceanidessepticandpest.com   |   corporate@oceanidessepticandpest.com',42,695,1120,20,14,'#FFFFFF');
  text(slide,'Oceanides slide number',String(i).padStart(2,'0'),1206,694,38,20,15,'#FFFFFF',true);
}
await (await PresentationFile.exportPptx(bands)).save(path.join(tmp,'brand-bands.pptx'));
// Graft Artifact Tool-authored bands into the source package to retain exact
// native diagram geometry, text runs, theme relationships and speaker notes.
execFileSync(python,[path.join(base,'patch-header-footer.py')],{cwd:root,stdio:'inherit'});
const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
await finalizePresentation({workspaceDir:root,candidatePath:path.join(tmp,'candidate.pptx'),finalPath:output,
  pythonExecutable:python,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),
  layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),
  layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
  explicitTotalSlideCount:9,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
  fontPolicy:{basis:'design',families:['Arial','Segoe UI']},verifyArtifactToolImport:true,
  receiptPath:path.join(base,'header-footer.validation.json')});
const checked=await PresentationFile.importPptx(await FileBlob.load(output));
for(let i=0;i<checked.slides.items.length;i++) {
  const png=await checked.export({slide:checked.slides.items[i],format:'png',scale:1});
  await fs.writeFile(path.join(tmp,`after-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));
}
console.log(JSON.stringify({output,slides:9,renders:tmp}));
