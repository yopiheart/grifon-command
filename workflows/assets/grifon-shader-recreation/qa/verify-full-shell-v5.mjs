import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const here=path.dirname(path.dirname(fileURLToPath(import.meta.url))),baseline=path.join(here,'qa/full-focused-review-4-inputs'),baselinePrivate=path.join(here,'.tmp/full-focused-review-4-inputs');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),read=file=>fs.readFileSync(path.join(here,file));
const focusedBytes=read('qa/full-focused.json'),focused=JSON.parse(focusedBytes),oldFocused=JSON.parse(fs.readFileSync(path.join(baseline,'qa/full-focused.json')));
const currentSources=Object.fromEntries(Object.keys(focused.sources).map(file=>[file,hash(read(file))]));
if(JSON.stringify(currentSources)!==JSON.stringify(focused.sources))throw Error('Current inputs do not match focused producer binding');
if(hash(read('render-full.mjs'))!==focused.producerToolSha256)throw Error('Current producer does not match focused binding');
const shellFrames=[357,362,369,376],unchangedInputs=[];
for(const[file,sha256]of Object.entries(oldFocused.sources)){
  if(['full.js','full.json','assets/full/manifest.json'].includes(file))continue;
  if(currentSources[file]!==sha256)throw Error(`Non-shell input changed: ${file}`);
  unchangedInputs.push({file,sha256});
}
function outsideShell(source){
  const start=source.indexOf('    const patternMaterial='),end=source.indexOf('    const metal=',start);
  if(start<0||end<=start)throw Error('Expected scoped shell runtime boundary');
  return (source.slice(0,start)+'__SHELL_GEOMETRY_AND_MATERIAL__\n'+source.slice(end)).replace('shell.geometry=shellGeometries[frame-357];','');
}
const oldRuntime=fs.readFileSync(path.join(baseline,'full.js'),'utf8'),runtime=read('full.js').toString(),oldOutside=outsideShell(oldRuntime);
function requireRuntimeStable(value){if(outsideShell(value)!==oldOutside)throw Error('Runtime outside shell material/geometry/selection changed');}
requireRuntimeStable(runtime);
function outsideShellConfig(value){const copy=structuredClone(value);for(const key of Object.keys(copy.camera))if(key.startsWith('shell'))delete copy.camera[key];return JSON.stringify(copy);}
const oldSpec=JSON.parse(fs.readFileSync(path.join(baseline,'full.json'))),spec=JSON.parse(read('full.json')),oldConfig=outsideShellConfig(oldSpec);
function requireConfigStable(value){if(outsideShellConfig(value)!==oldConfig)throw Error('Configuration outside shell keys changed');}
requireConfigStable(spec);
const oldManifest=JSON.parse(fs.readFileSync(path.join(baseline,'assets/full/manifest.json'))),manifest=JSON.parse(read('assets/full/manifest.json'));
if(manifest.specSha256!==currentSources['full.json'])throw Error('Asset manifest does not bind current spec');
delete oldManifest.specSha256;delete manifest.specSha256;
if(JSON.stringify(oldManifest)!==JSON.stringify(manifest))throw Error('Asset manifest changed beyond spec binding');
const unchangedPNGs=[],changedShellPNGs=[];
for(const sample of focused.samples){
  const bytes=read('qa/'+sample.file),sha256=hash(bytes),old=oldFocused.samples.find(entry=>entry.frame===sample.frame),oldBytes=fs.readFileSync(path.join(baselinePrivate,'qa',old.file));
  if(sha256!==sample.sha256||hash(oldBytes)!==old.sha256)throw Error(`Capture payload binding differs at ${sample.frame}`);
  if(shellFrames.includes(sample.frame)){changedShellPNGs.push({frame:sample.frame,file:'qa/'+sample.file,previousSha256:old.sha256,sha256});continue;}
  if(!bytes.equals(oldBytes))throw Error(`Non-shell native PNG changed at ${sample.frame}`);
  unchangedPNGs.push({frame:sample.frame,file:'qa/'+sample.file,sha256});
}
if(unchangedPNGs.length!==51||changedShellPNGs.length!==4)throw Error('Expected exact 51 unchanged plus4 shell focused frames');
const prefix=JSON.parse(read('qa/pilot-media.json')),prefixInputs=Object.entries(prefix.sources).map(([file,sha256])=>{if(hash(read(file))!==sha256)throw Error(`Accepted opening source changed: ${file}`);return {file,sha256};});
if(prefix.sha256!=='6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69'||prefixInputs.length!==9)throw Error('Accepted opening identity differs');
if(hash(read(prefix.file))!==prefix.sha256)throw Error('Accepted opening movie changed');
const negativeControls=[];
function expectReject(name,fn){let rejected=false;try{fn();}catch{rejected=true;}if(!rejected)throw Error(`Negative control accepted: ${name}`);negativeControls.push({name,rejected:true,fileMutation:false});}
expectReject('non-shell material source edit',()=>requireRuntimeStable(runtime.replace('    const metal=','    const changedMetal=')));
const alteredConfig=structuredClone(spec);alteredConfig.glyphs[0]='changed';expectReject('non-shell glyph configuration edit',()=>requireConfigStable(alteredConfig));
expectReject('non-shell native PNG byte edit',()=>{const bytes=Buffer.from(read(unchangedPNGs[0].file));bytes[bytes.length-1]^=1;if(hash(bytes)!==unchangedPNGs[0].sha256)throw Error('PNG differs');});
const receipt={status:'TECHNICAL_SCOPE_AND_NON_SHELL_STABILITY_PASS',fidelity:'INDEPENDENT_FOCUSED_REVIEW_PENDING',sources:focused.sources,producerToolSha256:focused.producerToolSha256,focusedReceiptSha256:hash(focusedBytes),baselineFocusedReceiptSha256:hash(fs.readFileSync(path.join(baseline,'qa/full-focused.json'))),outsideShellRuntimeSha256:hash(Buffer.from(oldOutside)),outsideShellRuntimeBytesEqual:true,nonShellConfigurationExact:true,assetManifestOnlySpecBindingChanged:true,unchangedInputs,unchangedPNGs,changedShellPNGs,acceptedPrefix:{file:prefix.file,sha256:prefix.sha256,frames:222,inputs:prefixInputs},negativeControls,initializationRuns:focused.initializationRuns,errors:focused.errors,externalRequests:focused.externalRequests,providerCalls:0,paidSpendUsd:0};
const output=path.join(here,'qa/full-shell-v5-stability.json');fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
const reopened=JSON.parse(fs.readFileSync(output));if(reopened.unchangedPNGs.length!==51||reopened.acceptedPrefix.inputs.length!==9)throw Error('Written stability proof differs');
console.log(JSON.stringify({status:receipt.status,unchangedNativePNGs:51,changedShellPNGs:4,unchangedRenderInputs:unchangedInputs.length,acceptedPrefixInputs:prefixInputs.length,negativeControls:negativeControls.length,receiptSha256:hash(fs.readFileSync(output)),fidelity:receipt.fidelity}));
