import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url)),qa=path.join(here,'qa'),scratch=path.join(here,'.tmp/full-frames');
const primary=process.env.GRIFON_TOOL_ROOT||'C:/Users/ADMIN/Desktop/grifon-command',ffmpeg=path.join(primary,'node_modules/ffmpeg-static/ffmpeg.exe');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const media=read(path.join(qa,'full-media.json')),render=read(path.join(qa,'full-render.json')),capture=read(path.join(scratch,'receipt.json')),pilot=read(path.join(qa,'pilot-media.json')),manifest=read(path.join(here,'assets/full/manifest.json'));
function input(file,expected){const bytes=fs.readFileSync(path.join(here,file)),actual=sha(bytes);if(actual!==expected)throw Error(`Input bytes differ: ${file}`);return {file,bytes:bytes.length,sha256:actual};}
if(JSON.stringify(media.sources)!==JSON.stringify(render.sources)||JSON.stringify(media.sources)!==JSON.stringify(capture.sources))throw Error('Export/capture/render source bindings differ');
const inputs=Object.entries(media.sources).map(([file,expected])=>input(file,expected));
const acceptedInputs=Object.entries(pilot.sources).map(([file,expected])=>input(file,expected));
const acceptedMedia=input(pilot.file,pilot.sha256),exportedMedia=input(media.file,media.sha256);
if(acceptedMedia.bytes!==pilot.bytes||exportedMedia.bytes!==media.bytes)throw Error('Bound media byte count differs');
const captureSnapshot=input(media.captureProducerSnapshot,media.captureProducerToolSha256);
if(capture.producerToolSha256!==captureSnapshot.sha256||render.producerToolSha256!==captureSnapshot.sha256)throw Error('Historical capture producer binding differs');
if(sha(fs.readFileSync(path.join(scratch,'receipt.json')))!==media.captureReceiptSha256)throw Error('Capture receipt bytes differ');
const producer=input('render-full.mjs',media.producerToolSha256);
const copiedAssets=manifest.files.map(asset=>{
  const copy=input(asset.file,asset.sha256),source=input(asset.source,asset.sha256);
  if(copy.bytes!==asset.bytes||source.bytes!==asset.bytes)throw Error(`Original asset size differs ${asset.file}`);
  return {...copy,originalSource:asset.source,originalBytesVerified:true};
});
input(manifest.captureEvidence,manifest.captureEvidenceSha256);
if(capture.frames.length!==710)throw Error('Continuation count differs');
for(const [n,frame]of capture.frames.entries())if(frame.frame!==222+n||sha(fs.readFileSync(path.join(scratch,frame.file)))!==frame.sha256)throw Error(`Native capture differs ${n}`);
for(const sample of render.samples)input(`qa/${sample.file}`,sample.sha256);
if(render.errors.length||render.externalRequests.length||render.deterministicReplay.result!=='EXACT_PASS'||!render.invalidFrameRejected)throw Error('Runtime determinism/readiness evidence differs');
const blackFrames=capture.frames.filter(frame=>frame.frame>=853),blackCapture=await sharp(path.join(scratch,blackFrames[0].file)).removeAlpha().raw().toBuffer();
if(blackFrames.length!==79||blackFrames.some(frame=>frame.sha256!==blackFrames[0].sha256)||blackCapture.some(value=>value!==0))throw Error('Authored black tail differs');
function ff(args,maxBuffer=32*1024*1024){const result=spawnSync(ffmpeg,args,{maxBuffer});if(result.status!==0)throw Error(`Black-tail decode failed ${result.stderr}`);return result.stdout;}
const decodedTail=ff(['-v','error','-xerror','-i',path.join(here,media.file),'-vf',"select='gte(n,853)'",'-map','0:v:0','-an','-frames:v','79','-f','framemd5','-']).toString('utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim());
const blackDecoded=ff(['-v','error','-xerror','-i',path.join(here,media.file),'-vf',"select='eq(n,931)'",'-map','0:v:0','-an','-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','-']);
if(decodedTail.length!==79||decodedTail.some(value=>value!==decodedTail[0])||blackDecoded.length!==1920*1080*3||blackDecoded.some(value=>value!==0))throw Error('Encoded black tail differs');
const proofs=['full-media.json','full-silent-media.json','full-render.json','full-media-verification.json','full-temporal-mux.json','full-temporal-silent.json','full-audio-mux-proof.json','full-guard-negative.json','full-poster.png'].map(file=>{const bytes=fs.readFileSync(path.join(qa,file));return {file:`qa/${file}`,bytes:bytes.length,sha256:sha(bytes)};});
const report={result:'PASS',claim:'Exact current source, original asset, immutable prefix, captured frame and export byte bindings; black tail decoded separately',exportedMedia,acceptedMedia,inputs,acceptedInputs,copiedAssets,producer,captureSnapshot,captureReceiptSha256:media.captureReceiptSha256,capturedContinuationFrames:710,sampledFrames:render.samples.length,deterministicCases:render.deterministicReplay.cases.length,blackTail:{start:853,endExclusive:932,frames:79,capturedRgbMaximum:0,decodedRgbMaximum:0,decodedFrameMd5:decodedTail[0]},proofs,providerCalls:0,paidSpendUsd:0,fidelityStatus:'PENDING_INDEPENDENT_FULL_REVIEW',sonicStatus:'SONIC_UNVERIFIED'};
fs.writeFileSync(path.join(qa,'full-source-receipt.json'),JSON.stringify(report,null,2)+'\n');
console.log('PASS exact source/capture/export bindings and79 decoded black-tail frames; fidelity is a separate gate');
