// Private visual evidence only. Source pixels never enter the Grifon delivery player.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const toolRoot=process.env.GRIFON_TOOL_ROOT||'C:/Users/ADMIN/Desktop/grifon-command';
const ffmpeg=path.join(toolRoot,'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe=path.join(toolRoot,'.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const source=path.join(here,'reference/source-x.mp4');
const film=path.join(here,'grifon-recreation-landscape-provisional.mp4');
const pilot=path.join(here,'grifon-opening-pilot-silent.mp4');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sourceHash='47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089';
if(sha(source)!==sourceHash)throw Error('Native reference hash changed');
const pilotHash='6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69';
if(sha(pilot)!==pilotHash)throw Error('Accepted opening changed');
const gate=JSON.parse(fs.readFileSync(path.join(here,'qa/pilot-joint-gate-v3.json'),'utf8'));
for(const [file,expected]of Object.entries(gate.frozenRuntimeInputs))if(sha(path.join(here,file))!==expected)throw Error('Frozen opening runtime changed: '+file);
const receiptBytes=fs.readFileSync(path.join(here,'qa/full-media.json'));
const media=JSON.parse(receiptBytes.toString('utf8')),filmHash=sha(film);
if(media.file!==path.basename(film)||media.sha256!==filmHash||media.bytes!==fs.statSync(film).size||media.prefixFramesVerified!==222||media.prefixSha256!==pilotHash)throw Error('Full media producer binding differs');
const manifest=JSON.parse(fs.readFileSync(path.join(here,'assets/full/manifest.json'),'utf8'));
const sourceFiles=['full.json','full.html','full.js','full-surfaces.frag','vendor/three.global.js','assets/full/manifest.json',...manifest.files.map(asset=>asset.file)];
const sources=Object.fromEntries(sourceFiles.map(file=>[file,sha(path.join(here,file))]));
function requireSources(){
  if(JSON.stringify(media.sources)!==JSON.stringify(sources))throw Error('Full media source binding differs; changed inputs require a new render');
  for(const [file,expected]of Object.entries(sources))if(sha(path.join(here,file))!==expected)throw Error('Continuation input changed during pair creation: '+file);
}
requireSources();
const capturePath=path.join(here,'.tmp/full-frames/receipt.json');
const captureBytes=fs.readFileSync(capturePath),capture=JSON.parse(captureBytes.toString('utf8'));
const captureHash=crypto.createHash('sha256').update(captureBytes).digest('hex');
if(captureHash!==media.captureReceiptSha256||JSON.stringify(capture.sources)!==JSON.stringify(sources)||capture.frames.length!==710)throw Error('Full capture producer binding differs');
const pagePath=path.join(here,'paired-full-review.html'),pageBytes=fs.readFileSync(pagePath),pageHash=crypto.createHash('sha256').update(pageBytes).digest('hex');
function run(exe,args){const result=spawnSync(exe,args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw Error(`${path.basename(exe)} ${result.status}: ${result.stderr}`);return result;}
function probe(file){return JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]).stdout);}
for(const file of [source,film]){
const video=probe(file).streams.find(s=>s.codec_type==='video');if(video.width!==1920||video.height!==1080||Number(video.nb_read_frames)!==932||video.avg_frame_rate!=='30000/1001')throw Error('Input native full-frame contract differs');
const frames=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp','-of','json',file]).stdout).frames;
const [num,den]=video.time_base.split('/').map(Number);
if(frames.length!==932||frames.some((frame,n)=>Number(frame.best_effort_timestamp)*num*30000!==n*1001*den))throw Error('Input native presentation timestamps differ');
}
const decodedPrefix=file=>run(ffmpeg,['-v','error','-i',file,'-map','0:v:0','-frames:v','222','-f','framemd5','-']).stdout.split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim());
const acceptedPrefix=decodedPrefix(pilot),fullPrefix=decodedPrefix(film);
if(acceptedPrefix.length!==222||JSON.stringify(acceptedPrefix)!==JSON.stringify(fullPrefix))throw Error('Decoded opening prefix changed in the full film');
const output=path.join(here,'.tmp/paired-full.mp4');fs.mkdirSync(path.dirname(output),{recursive:true});
const staging=path.join(here,'.tmp',`paired-full-staging-${crypto.randomUUID()}.mp4`);
const filter='[0:v]trim=end_frame=932,setpts=PTS-STARTPTS,scale=960:540,setsar=1[a];[1:v]trim=end_frame=932,setpts=PTS-STARTPTS,scale=960:540,setsar=1[b];[a][b]hstack=inputs=2:shortest=1[v]';
run(ffmpeg,['-hide_banner','-loglevel','error','-n','-i',source,'-i',film,'-filter_complex',filter,'-map','[v]','-an','-frames:v','932','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',staging]);
const paired=probe(staging),video=paired.streams.find(s=>s.codec_type==='video');
if(video.width!==1920||video.height!==540||Number(video.nb_read_frames)!==932||video.avg_frame_rate!=='30000/1001'||paired.streams.some(s=>s.codec_type==='audio'))throw Error('Paired full media contract differs');
const pairedFrames=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp','-of','json',staging]).stdout).frames;
const [pairedNum,pairedDen]=video.time_base.split('/').map(Number);
if(pairedFrames.length!==932||pairedFrames.some((frame,n)=>Number(frame.best_effort_timestamp)*pairedNum*30000!==n*1001*pairedDen))throw Error('Paired output native presentation timestamps differ');
run(ffmpeg,['-hide_banner','-loglevel','error','-xerror','-i',staging,'-f','null','-']);
if(sha(source)!==sourceHash||sha(film)!==filmHash)throw Error('An input changed during pair creation');
if(sha(pilot)!==pilotHash)throw Error('Accepted opening changed during pair creation');
for(const [file,expected]of Object.entries(gate.frozenRuntimeInputs))if(sha(path.join(here,file))!==expected)throw Error('Frozen opening runtime changed during pair creation: '+file);
requireSources();
if(sha(capturePath)!==captureHash||sha(path.join(here,'qa/full-media.json'))!==crypto.createHash('sha256').update(receiptBytes).digest('hex')||sha(pagePath)!==pageHash)throw Error('A producer receipt or comparison page changed during pair creation');
const pairHash=sha(staging),generation=`.tmp/full-paired-generations/${filmHash.slice(0,12)}-${pairHash.slice(0,12)}-${crypto.randomUUID()}`;
const generationRoot=path.join(here,generation);fs.mkdirSync(generationRoot,{recursive:true});
fs.renameSync(staging,path.join(generationRoot,'pair.mp4'));
fs.writeFileSync(path.join(generationRoot,'review.html'),pageBytes);
const receipt={purpose:'PRIVATE full reference-fidelity inspection; not a Grifon export',createdAt:new Date().toISOString(),producerReceiptSha256:crypto.createHash('sha256').update(receiptBytes).digest('hex'),captureReceiptSha256:captureHash,sources,inputs:{reference:{sha256:sourceHash,bytes:fs.statSync(source).size},film:{sha256:filmHash,bytes:fs.statSync(film).size},acceptedOpening:{sha256:pilotHash,frames:222}},output:{path:'.tmp/paired-full.mp4',sha256:pairHash,bytes:fs.statSync(path.join(generationRoot,'pair.mp4')).size,width:1920,height:540,frames:932,fps:'30000/1001',audio:false},page:{path:'paired-full-review.html',sha256:pageHash},generation:{mediaPath:`${generation}/pair.mp4`,pagePath:`${generation}/review.html`,receiptPath:`${generation}/receipt.json`},layout:{left:'REFERENCE, native frames0-931 at960x540',right:'GRIFON, same native frames at960x540'},method:filter,checks:{encode:0,probe:0,strictDecode:0,inputHashesStable:true,allNativeInputPresentationTimestamps:true,allNativeOutputPresentationTimestamps:true,decodedOpeningFramesUnchanged:222,frozenRuntimeInputsUnchanged:9,continuationRuntimeInputsUnchanged:sourceFiles.length,producerCaptureBinding:true,immutableGeneration:true}};
const finalReceipt=JSON.stringify(receipt,null,2)+'\n';fs.writeFileSync(path.join(generationRoot,'receipt.json'),finalReceipt);
const workingStage=path.join(here,'.tmp',`paired-full-working-${crypto.randomUUID()}.mp4`);
fs.copyFileSync(path.join(generationRoot,'pair.mp4'),workingStage);fs.renameSync(workingStage,output);
const receiptStage=path.join(here,'qa',`full-paired-review-receipt-${crypto.randomUUID()}.json`);
fs.writeFileSync(receiptStage,finalReceipt);fs.renameSync(receiptStage,path.join(here,'qa/full-paired-review-receipt.json'));
console.log(JSON.stringify(receipt));
