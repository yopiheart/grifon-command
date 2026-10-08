import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Planning only. Copying and moving need the root's later explicit release.
if((process.argv[2]||'plan')!=='plan')throw Error('Plan-only helper; preservation/move is not released');
const workspace=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const artifact=path.join(workspace,'workflows/assets/grifon-shader-recreation');
const publicTarget=path.join(artifact,'qa/full-failed-review-2'),privateTarget=path.join(artifact,'.tmp/full-failed-review-2');
const expectedFilm='15cbddf056015c6ab16986fb5a22abd71ec03fb8c8b3b0903efcd6de1cbd37ce',expectedSilent='7cdc68b2f4fb89472965a6aaeb16a492fb30e665de2d65c867c229cf74727b5b';
const expectedPair='534db1eb3cb970a6ec709885131205b02e8080de6f1e10dbb32cb5daaa3aad61';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function safe(base,target){
  const absolute=path.resolve(target),relative=path.relative(base,absolute);
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))throw Error('Path escapes checked workspace: '+target);
  let current=base;
  for(const segment of relative.split(path.sep).filter(Boolean)){current=path.join(current,segment);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symlink/junction not allowed: '+current);}
  return absolute;
}
for(const target of[artifact,publicTarget,privateTarget])safe(workspace,target);
if(fs.existsSync(publicTarget)||fs.existsSync(privateTarget))throw Error('Never overwrite an existing v2 preservation target');
const output=safe(workspace,path.resolve(workspace,process.argv[3]||'.tmp/full-v2-preservation-plan.json'));
if(fs.existsSync(output))throw Error('Refuse to overwrite a prepared plan; give a fresh private output path');
if(!output.startsWith(path.join(workspace,'.tmp')+path.sep))throw Error('Plan output must remain private under workspace .tmp');
const media=json(path.join(artifact,'qa/full-media.json')),silent=json(path.join(artifact,'qa/full-silent-media.json')),render=json(path.join(artifact,'qa/full-render.json'));
const pair=json(path.join(artifact,'qa/full-paired-review-receipt.json')),player=json(path.join(artifact,'qa/player-build.json'));
const captureDirectory=safe(artifact,path.join(artifact,'.tmp/full-frames')),capture=json(path.join(captureDirectory,'receipt.json'));
if(media.sha256!==expectedFilm||silent.sha256!==expectedSilent||pair.output.sha256!==expectedPair||player.media.sha256!==expectedFilm)throw Error('Expected current v2 film/silent/pair/player binding differs');
if(JSON.stringify(media.sources)!==JSON.stringify(capture.sources)||JSON.stringify(media.sources)!==JSON.stringify(render.sources))throw Error('Current source bindings disagree');
if(Object.keys(media.sources).length!==13||render.samples.length!==106||capture.frames.length!==710)throw Error('Expected13 inputs/106 samples/710 raw frames');
const payload=[],seen=new Set(),pendingReports=[],existingPackets=[],excludedStalePlayerQA=[];
function add(source,storage,destination,expected){
  const absolute=safe(workspace,source),key=storage+':'+destination;
  if(seen.has(key))return;
  if(!fs.statSync(absolute).isFile())throw Error('Expected a file: '+source);
  const bytes=fs.readFileSync(absolute),sha256=hash(bytes);
  if(expected&&expected!==sha256)throw Error('Expected bytes differ: '+source);
  const target=safe(workspace,path.join(storage==='public'?publicTarget:privateTarget,destination));
  payload.push({source:path.relative(workspace,absolute).replaceAll('\\','/'),destination:path.relative(workspace,target).replaceAll('\\','/'),storage,bytes:bytes.length,sha256});seen.add(key);
}
const artifactFile=(file,storage='public',expected)=>add(path.join(artifact,file),storage,file,expected);
for(const[file,sha256]of Object.entries(media.sources))artifactFile(file,'public',sha256);
for(const file of['build-full.mjs','render-full.mjs','verify-full-capture.mjs','verify-full-guard.mjs','make-full-sample-pairs.mjs','make-full-correction-pairs.mjs','build-full-paired-review.mjs','review-server.mjs','paired-full-review.html','audio.json'])artifactFile(file);
add(fileURLToPath(import.meta.url),'public','helpers/preserve-failed-full-v2.mjs');
const applyHelper=path.join(workspace,'.tmp/apply-failed-full-v2-preservation.mjs');
if(fs.existsSync(applyHelper))add(applyHelper,'public','helpers/apply-failed-full-v2-preservation.mjs');
const qaRequired=['full-media.json','full-silent-media.json','full-render.json','full-render-contact-sheet.jpg','full-source-receipt.json','full-media-verification.json','full-temporal-mux.json','full-temporal-silent.json','full-audio-mux-proof.json','full-guard-negative.json','full-capture-producer.mjs','full-v5-capture-boundary.json','full-production-v2.json','full-production-implementation-v2.md','full-paired-review-receipt.json','full-poster.png','full-shell-v5-checks.json','full-shell-v5-build-output.txt','full-shell-v5-vitest-output.txt','full-shell-v5-stability.json','full-shell-code-review-v5.json','full-canvas-erase-boundary-diagnosis-v2.json','full-canvas-erase-endpoint-diagnosis-v2.json','full-pattern-boundary-diagnosis-v2.json','full-pair-publication-windows-v2.json','root-full-control-checks-v2.json','pair-provenance-guard.mjs','pair-provenance-guard.json','audio-verification.json'];
for(const file of qaRequired)artifactFile('qa/'+file);
for(const sample of render.samples)artifactFile('qa/'+sample.file,'public',sample.sha256);
for(const entry of fs.readdirSync(path.join(artifact,'qa'),{withFileTypes:true})){
  if(!entry.isFile())continue;
  if(entry.name.startsWith('audio-final-'))artifactFile('qa/'+entry.name);
  if(/^full-(native|timed).*v2.*\.(json|md)$/.test(entry.name))artifactFile('qa/'+entry.name);
  if(/^player-.*\.(json|mjs)$/.test(entry.name)){
    const file='qa/'+entry.name,bytes=fs.readFileSync(path.join(artifact,file));
    if(entry.name.endsWith('.mjs')||bytes.toString().includes(expectedFilm))artifactFile(file);
    else excludedStalePlayerQA.push({file,sha256:hash(bytes),reason:'Older film binding; already preserved in failed-v1 evidence'});
  }
}
for(const entry of fs.readdirSync(path.join(artifact,'qa/audio-final-gray-failure-v1'),{withFileTypes:true})){
  if(!entry.isFile())throw Error('Unexpected gray-failure subdirectory');
  const file='qa/audio-final-gray-failure-v1/'+entry.name;
  if(/\.(json|mjs)$/.test(entry.name))artifactFile(file);
  else if(entry.name.endsWith('.raw'))artifactFile(file,'private');
  else throw Error('Unrecognized gray-failure payload: '+file);
}
const controls=json(path.join(artifact,'qa/audio-final-black-tail-controls.json'));
for(const fixture of controls.fixtures){if(fixture.audioStreams!==0||!fixture.file.startsWith('.tmp/audio-final-black-tail-controls-v1/'))throw Error('Unexpected control media scope');artifactFile(fixture.file,'private',fixture.sha256);}
for(const[file,sha256]of Object.entries(player.inputs)){
  if(file.startsWith('tools/'))add(path.join(workspace,file),'public','workspace/'+file,sha256);
  else artifactFile(file,'public',sha256);
}
add(path.join(workspace,player.artifact),'private','widget/'+path.basename(player.artifact),player.sha256);
artifactFile(media.file,'private',expectedFilm);artifactFile(silent.file,'private',expectedSilent);
artifactFile(pair.output.path,'private',expectedPair);
for(const [key,expected]of[['mediaPath',expectedPair],['pagePath',pair.page.sha256],['receiptPath',null]]){
  const file=pair.generation[key];if(!file.startsWith('.tmp/full-paired-generations/'))throw Error('Unexpected immutable generation path');artifactFile(file,'private',expected);
}
for(const file of['full-native-review-v2.md','full-timing-correction-brief-v3.md','full-timed-review-v2.md','full-audio-review-v2.md','full-shell-code-review-v5.md','full-pair-code-review.md','recreation-player-code-review.md']){
  const relative='reference/'+file;if(fs.existsSync(path.join(artifact,relative)))artifactFile(relative);else if(file.includes('v2'))pendingReports.push(relative);
}
for(const file of['receipt.json','receipt-extracted.json','closure.json','plan.json','preparation-check.json','boundaries/receipt.json','erase-boundaries/receipt.json','composition/receipt.json']){
  const relative='.tmp/full-native-critic-v2/'+file;if(fs.existsSync(path.join(artifact,relative)))artifactFile(relative,'private');
}
for(const file of['source-probe.json'])artifactFile('reference/'+file);
for(const dir of fs.readdirSync(path.join(artifact,'qa'),{withFileTypes:true}).filter(x=>x.isDirectory()&&/^(pilot-(failed|v1)|full-(failed|focused))/.test(x.name))){
  const base=path.join(artifact,'qa',dir.name);
  const receipts=fs.readdirSync(base).filter(name=>/preserv.*\.json$|later-review-binding\.json$/.test(name));
  for(const name of receipts){const file='qa/'+dir.name+'/'+name,bytes=fs.readFileSync(path.join(artifact,file));existingPackets.push({file,bytes:bytes.length,sha256:hash(bytes),action:'Bind existing receipt in place; do not copy package'});}
}
const rawFrames=[];
for(const [i,frame]of capture.frames.entries()){
  if(frame.frame!==222+i||frame.file!==String(i).padStart(4,'0')+'.png')throw Error('Native raw frame ordering differs');
  const file=safe(artifact,path.join(captureDirectory,frame.file)),bytes=fs.readFileSync(file);
  if(hash(bytes)!==frame.sha256)throw Error('Raw frame changed: '+frame.frame);
  rawFrames.push({...frame,bytes:bytes.length});
}
const sourceCaptureReceipt=fs.readFileSync(path.join(captureDirectory,'receipt.json'));
if(hash(sourceCaptureReceipt)!==media.captureReceiptSha256||capture.producerToolSha256!==media.captureProducerToolSha256)throw Error('Capture producer binding differs');
const plan={status:'PREPARED_ONLY_NO_COPY_OR_MOVE',filmSha256:expectedFilm,silentSha256:expectedSilent,pairSha256:expectedPair,workspace,artifact,targets:{public:publicTarget,private:privateTarget},sources:media.sources,payload,existingPackets,excludedStalePlayerQA,pendingReports,rawCapture:{source:captureDirectory,proposedDestination:safe(workspace,path.join(privateTarget,'frames')),receiptSha256:hash(sourceCaptureReceipt),frames:rawFrames,action:'Move only after final critic completion and explicit root release; verify all710 hashes before and after'},futureCorrectionWitness:{allowedChangedNativeFrames:[400,403,636,639],expectedUnchangedNativeFrames:706,prefixFrames:222,requireAll710RawHashesCompared:true},exclusions:['Raw reference video/audio/frames','assets/audio and raw AAC/PCM masters/stems','Unselected private .tmp folders','Recursive copies of historical preservation packages'],executionRequirements:['Final independent native-v2 report complete and hash supplied by root','Explicit root preservation release','Rehash every planned source immediately before copying','Refuse existing target snapshots; write new files exclusively','Copy/rehash each payload byte-for-byte','Recheck resolved absolute workspace paths and reject symlinks/junctions before moving raw capture','Verify all710 moved PNGs and capture receipt after move'],providerCalls:0,paidSpendUsd:0};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
const reopened=json(output);if(reopened.rawCapture.frames.length!==710||reopened.payload.length!==payload.length)throw Error('Prepared plan write differs');
console.log(JSON.stringify({plan:path.relative(workspace,output).replaceAll('\\','/'),sha256:hash(fs.readFileSync(output)),publicFiles:payload.filter(x=>x.storage==='public').length,privateFiles:payload.filter(x=>x.storage==='private').length,rawFrames:710,boundExistingReceipts:existingPackets.length,pendingReports,status:plan.status,targetsCreated:false,currentInputsCopied:false,currentFramesMoved:false}));
