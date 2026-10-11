import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const qa=path.dirname(fileURLToPath(import.meta.url)),here=path.dirname(qa);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const previous=path.join(here,'.tmp/full-failed-review-2/frames'),current=process.argv[2]==='--negative-original'?previous:path.join(here,'.tmp/full-frames');
const before=read(path.join(previous,'receipt.json')),after=read(path.join(current,'receipt.json')),boundary=read(path.join(qa,'full-v3-capture-boundary.json'));
const preservation=read(path.join(qa,'full-failed-review-2/preservation-receipt.json'));
const expected=[400,403,636,639];
function requireChanged(frames){if(JSON.stringify(frames)!==JSON.stringify(expected))throw Error('Expected exactly400/403/636/639 raw frame changes; observed '+JSON.stringify(frames));}
if(before.frames.length!==710||after.frames.length!==710)throw Error('Expected two710-frame captures');
if(sha(fs.readFileSync(path.join(previous,'receipt.json')))!==preservation.rawCapture.receiptSha256||JSON.stringify(before.sources)!==JSON.stringify(preservation.sources))throw Error('Preserved710-frame source/receipt binding differs');
const compared=[];
for(let i=0;i<710;i++){
  const oldFrame=before.frames[i],newFrame=after.frames[i];
  if(oldFrame.frame!==222+i||newFrame.frame!==222+i||oldFrame.file!==newFrame.file||newFrame.file!==String(i).padStart(4,'0')+'.png')throw Error('Native capture index differs');
  const oldBytes=fs.readFileSync(path.join(previous,oldFrame.file)),newBytes=fs.readFileSync(path.join(current,newFrame.file));
  if(sha(oldBytes)!==oldFrame.sha256||sha(newBytes)!==newFrame.sha256)throw Error('Bound raw capture bytes differ: '+newFrame.frame);
  compared.push({frame:newFrame.frame,file:newFrame.file,oldBytes:oldBytes.length,newBytes:newBytes.length,beforeSha256:oldFrame.sha256,afterSha256:newFrame.sha256,byteIdentical:oldBytes.equals(newBytes)});
}
const changed=compared.filter(x=>!x.byteIdentical).map(x=>x.frame);requireChanged(changed);
if(JSON.stringify(after.sources)!==JSON.stringify(boundary.sources))throw Error('Fresh capture/source binding differs');
if(sha(fs.readFileSync(path.join(current,'receipt.json')))!==read(path.join(qa,'full-silent-media.json')).captureReceiptSha256)throw Error('Fresh silent export/capture receipt binding differs');
if(before.producerToolSha256!==after.producerToolSha256||after.producerToolSha256!==boundary.producerToolSha256)throw Error('Unchanged capture producer differs');
for(const[file,expectedHash]of Object.entries(after.sources))if(sha(fs.readFileSync(path.join(here,file)))!==expectedHash)throw Error('Frozen corrected input changed: '+file);
const controls=[];
const original=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--negative-original'],{encoding:'utf8',maxBuffer:1024*1024});
if(original.status===0||!original.stderr.includes('Expected exactly400/403/636/639 raw frame changes; observed []'))throw Error('Uncorrected710-frame original was not rejected at the difference witness');
controls.push({name:'Actual uncorrected preserved710-frame sequence',command:'node qa/verify-full-timing-v3.mjs --negative-original',exit:original.status,observedChangedFrames:[],result:'EXPECTED_REJECTION',error:'Expected exactly400/403/636/639 raw frame changes; observed []'});
for(const [name,frames]of[['Unexpected fifth frame change',[400,403,407,636,639]]]){
  let error='';try{requireChanged(frames);}catch(e){error=e.message;}
  if(!error)throw Error('Difference witness negative control accepted: '+name);
  controls.push({name,observedChangedFrames:frames,result:'EXPECTED_REJECTION',error});
}
const output=path.join(qa,'full-timing-v3-raw-witness.json');
const report={result:'PASS',claim:'All710 original and fresh PNG bytes checked; exactly four authorized frames changed and706 are byte-identical',priorReceiptSha256:sha(fs.readFileSync(path.join(previous,'receipt.json'))),currentReceiptSha256:sha(fs.readFileSync(path.join(current,'receipt.json'))),boundarySha256:sha(fs.readFileSync(path.join(qa,'full-v3-capture-boundary.json'))),producerToolSha256:after.producerToolSha256,sources:after.sources,comparedFrames:710,changedFrames:changed,unchangedFrames:706,compared,controls,openingPrefixClaim:'Decoded222-frame equality is verified separately by native temporal proof',fidelityStatus:'PENDING_INDEPENDENT_FULL_NATIVE_AND_TIMED_REVIEW',providerCalls:0,paidSpendUsd:0};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
const reopened=read(output);if(reopened.compared.length!==710||reopened.unchangedFrames!==706)throw Error('Raw witness write differs');
console.log(JSON.stringify({file:'qa/full-timing-v3-raw-witness.json',sha256:sha(fs.readFileSync(output)),changedFrames:changed,unchangedFrames:706,negativeControls:controls.length,result:report.result}));
