import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';

const here=path.dirname(fileURLToPath(import.meta.url)),primary=process.env.GRIFON_TOOL_ROOT||'C:/Users/ADMIN/Desktop/grifon-command';
const command=process.argv[2]||'samples',qa=path.join(here,'qa'),scratch=path.join(here,'.tmp/full-frames');
if(!['probe','draft','focused','samples','check','render','encode','verify','mux','remux-video-metadata'].includes(command))throw Error(`Unsupported full command ${command}`);
const spec=JSON.parse(fs.readFileSync(path.join(here,'full.json'),'utf8')),assets=JSON.parse(fs.readFileSync(path.join(here,'assets/full/manifest.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),producerToolSha256=hash(fs.readFileSync(fileURLToPath(import.meta.url)));
const sourceFiles=['full.json','full.html','full.js','full-surfaces.frag','vendor/three.global.js','assets/full/manifest.json',...assets.files.map(x=>x.file)];
const sources=Object.fromEntries(sourceFiles.map(file=>[file,hash(fs.readFileSync(path.join(here,file)))]));
if(sources['full.json']!==assets.specSha256)throw Error('Full asset manifest binds an earlier spec; build the unchanged local assets first');
for(const file of assets.files)if(sources[file.file]!==file.sha256)throw Error(`Unchanged local input differs ${file.file}`);
if(hash(fs.readFileSync(path.join(here,spec.prefixFile)))!==spec.prefixSha256)throw Error('Accepted opening pixels changed');
for(let i=0;i<spec.shots.length;i++)if(spec.shots[i].start!==(i?spec.shots[i-1].end:spec.prefixFrames)||spec.shots[i].end<=spec.shots[i].start)throw Error('Shot table has a gap or overlap');
if(spec.shots.at(-1).end!==spec.frames)throw Error('Shot table does not end at 932');
fs.mkdirSync(qa,{recursive:true});
const ffmpeg=path.join(primary,'node_modules/ffmpeg-static/ffmpeg.exe'),ffprobe=path.join(primary,'.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const silent=path.join(here,'grifon-recreation-landscape-silent.mp4'),muxed=path.join(here,'grifon-recreation-landscape-provisional.mp4'),continuation=path.join(here,'.tmp/full-continuation.mp4');
function run(exe,args){const result=spawnSync(exe,args,{encoding:'utf8',maxBuffer:64*1024*1024});if(result.status!==0)throw Error(`${path.basename(exe)} exit ${result.status}\n${result.stderr}\n${result.stdout}`);return result;}
const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function requireSources(receipt){if(JSON.stringify(receipt.sources)!==JSON.stringify(sources))throw Error('Existing producer source binding differs; changed inputs require capture and encode');}
function requireMedia(receipt,file){requireSources(receipt);if(receipt.file!==path.basename(file)||receipt.bytes!==fs.statSync(file).size||receipt.sha256!==hash(fs.readFileSync(file)))throw Error('Existing producer media binding differs');}
function inspect(file,audioExpected){
  const probe=JSON.parse(run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]).stdout),v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
  if(v.width!==1920||v.height!==1080||+v.nb_read_frames!==932||v.r_frame_rate!=='30000/1001'||v.time_base!=='1/30000'||v.pix_fmt!=='yuv420p'||!!a!==audioExpected)throw Error('Full media dimensions, frame count, rate, timebase or audio contract differs');
  if(audioExpected&&(a.codec_name!=='aac'||+a.sample_rate!==48000||a.channels!==2||Math.abs(+a.duration-31.146667)>.001))throw Error('Original provisional AAC format or logical metadata allowance changed');
  run(ffmpeg,['-v','error','-xerror','-i',file,'-f','null','-']);
  return {file:path.basename(file),bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file)),frames:+v.nb_read_frames,dimensions:[v.width,v.height],fps:v.r_frame_rate,codec:v.codec_name,timeBase:v.time_base,pixFmt:v.pix_fmt,duration:+probe.format.duration,videoDuration:+v.duration,strictDecode:'PASS',sources,producerToolSha256,audio:a?{codec:a.codec_name,sampleRate:+a.sample_rate,channels:a.channels,duration:+a.duration}:null,providerCalls:0,paidSpendUsd:0};
}
function audioProof(file){
  const master=path.join(here,spec.audio.file);
  function packets(video){return JSON.parse(run(ffprobe,['-v','error','-select_streams','a:0','-show_packets','-show_data_hash','sha256','-show_entries','packet=pts,dts,duration,size,data_hash,side_data_list','-of','json',video]).stdout).packets;}
  function stream(video){return JSON.parse(run(ffprobe,['-v','error','-select_streams','a:0','-show_streams','-of','json',video]).stdout).streams[0];}
  function pcm(video){const result=spawnSync(ffmpeg,['-v','error','-xerror','-i',video,'-map','0:a:0','-c:a','pcm_f32le','-f','f32le','-'],{maxBuffer:32*1024*1024});if(result.status!==0)throw Error(`AAC logical decode failed ${result.stderr}`);return {sampleFrames:result.stdout.length/8,sha256:hash(result.stdout)};}
  const sourcePackets=packets(master),outputPackets=packets(file),sourceStream=stream(master),outputStream=stream(file),sourcePcm=pcm(master),outputPcm=pcm(file);
  if(JSON.stringify(sourcePackets)!==JSON.stringify(outputPackets))throw Error('Stream-copy AAC packet payload/timing/priming differs from the approved master');
  if(+sourceStream.duration_ts!==+outputStream.duration_ts||sourceStream.duration!==outputStream.duration||sourceStream.time_base!==outputStream.time_base)throw Error('Approved master AAC stream metadata changed');
  if(sourcePcm.sampleFrames!==1495040||JSON.stringify(sourcePcm)!==JSON.stringify(outputPcm))throw Error('Logical decoded AAC sample frames or pixels differ');
  const proof={file:path.basename(file),sha256:hash(fs.readFileSync(file)),masterFile:spec.audio.file,masterSha256:spec.audio.sha256,packetCount:sourcePackets.length,packetsSha256:hash(Buffer.from(JSON.stringify(sourcePackets))),packetPayloadTimingPrimingPreserved:true,masterStream:{duration:+sourceStream.duration,durationTs:+sourceStream.duration_ts,timeBase:sourceStream.time_base},muxStream:{duration:+outputStream.duration,durationTs:+outputStream.duration_ts,timeBase:outputStream.time_base},logicalDecodedPcm:outputPcm,logicalDecodedDuration:outputPcm.sampleFrames/48000,logicalMetadataToleranceSeconds:.001,masterPcmPreserved:true,sonicStatus:'SONIC_UNVERIFIED',result:'PASS'};
  fs.writeFileSync(path.join(qa,'full-audio-mux-proof.json'),JSON.stringify(proof,null,2)+'\n');
  return {audioProof:'qa/full-audio-mux-proof.json',audioProofSha256:hash(fs.readFileSync(path.join(qa,'full-audio-mux-proof.json'))),logicalDecodedAudioDuration:proof.logicalDecodedDuration,decodedAudioSampleFrames:outputPcm.sampleFrames};
}
function temporalProof(file){
  const frames=JSON.parse(run(ffprobe,['-v','error','-select_streams','v:0','-show_frames','-show_entries','frame=best_effort_timestamp','-of','json',file]).stdout).frames;
  if(frames.length!==932)throw Error('PTS audit frame count differs');
  for(const [n,frame]of frames.entries())if(+frame.best_effort_timestamp!==n*1001)throw Error(`Native PTS drift at ${n}: ${frame.best_effort_timestamp} != ${n*1001}`);
  function md5(video,count){const output=run(ffmpeg,['-v','error','-i',video,'-map','0:v:0','-frames:v',String(count),'-f','framemd5','-']).stdout;return output.split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>line.split(',').at(-1).trim());}
  const original=md5(path.join(here,spec.prefixFile),222),combined=md5(file,222);
  if(original.length!==222||JSON.stringify(original)!==JSON.stringify(combined))throw Error('Accepted opening decoded pixels differ after concat/mux');
  const proof={file:path.basename(file),sha256:hash(fs.readFileSync(file)),prefixFile:spec.prefixFile,prefixSha256:spec.prefixSha256,prefixFramesVerified:222,prefixDecodedMd5:original,ptsTimeBase:'1/30000',ptsFormula:'n * 1001',pts:frames.map(f=>+f.best_effort_timestamp),result:'PASS'};
  const proofFile=audioProofName(file);fs.writeFileSync(path.join(qa,proofFile),JSON.stringify(proof,null,2)+'\n');return {prefixFramesVerified:222,temporalProof:`qa/${proofFile}`,temporalProofSha256:hash(fs.readFileSync(path.join(qa,proofFile)))};
}
function audioProofName(file){return file===muxed?'full-temporal-mux.json':'full-temporal-silent.json';}
if(['probe','draft','focused','samples','check','render'].includes(command)){
  const allowed=new Set([...sourceFiles,spec.prefixFile]);
  const server=http.createServer((request,response)=>{
    try{const route=decodeURIComponent(new URL(request.url,'http://localhost').pathname).slice(1)||'full.html';if(request.method!=='GET'||!allowed.has(route)){response.writeHead(404);response.end();return;}
      const mime={'.html':'text/html','.js':'text/javascript','.json':'application/json','.frag':'text/plain','.png':'image/png','.ttf':'font/ttf','.mp4':'video/mp4'};
      const file=path.join(here,route),size=fs.statSync(file).size,range=request.headers.range;
      if(range){const [start,end]=range.replace('bytes=','').split('-'),a=+start,b=end?+end:size-1;response.writeHead(206,{'Content-Type':mime[path.extname(file)],'Content-Range':`bytes ${a}-${b}/${size}`,'Accept-Ranges':'bytes','Content-Length':b-a+1});fs.createReadStream(file,{start:a,end:b}).pipe(response);}
      else{response.writeHead(200,{'Content-Type':mime[path.extname(file)],'Content-Length':size,'Cache-Control':'no-store'});fs.createReadStream(file).pipe(response);}
    }catch{response.writeHead(404);response.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,errors=[],externalRequests=[],initializationRuns=[];let browser;
  async function open(){
    const start=performance.now();browser=await chromium.launch({headless:true,args:['--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-rasterization']});
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    await context.route('**/*',route=>{if(route.request().url().startsWith(origin+'/'))return route.continue();externalRequests.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.goto(origin+'/full.html');const waitStart=performance.now();
    try{await page.waitForFunction(()=>window.__motionReady||window.__motionError,{}, {timeout:60000});}catch(error){initializationRuns.push({result:'FAIL',timeoutMs:60000,readyWaitMs:performance.now()-waitStart,totalMs:performance.now()-start,errors});fs.writeFileSync(path.join(qa,'full-initialization-failure.json'),JSON.stringify({sources,initializationRuns},null,2)+'\n');throw error;}
    const error=await page.evaluate(()=>window.__motionError);if(error)throw Error(error);
    initializationRuns.push({result:'PASS',timeoutMs:60000,readyWaitMs:performance.now()-waitStart,totalMs:performance.now()-start});console.log(`Continuation initialization PASS ${initializationRuns.at(-1).totalMs.toFixed(1)} ms`);return page;
  }
  async function capture(page,frame){await page.evaluate(async f=>window.seekFullFrame(f),frame);return page.screenshot({type:'png',animations:'disabled'});}
  try{
    const probeFrames=command==='probe'?(process.argv[3]||'').split(',').map(Number):[];
    if(command==='probe'&&(!probeFrames.length||probeFrames.some(frame=>!Number.isInteger(frame)||frame<222||frame>=932)||new Set(probeFrames).size!==probeFrames.length))throw Error('Probe requires unique native continuation frame numbers');
    const probeName=process.argv[4]||'full-probe-6';if(command==='probe'&&!/^full-probe-\d+$/.test(probeName))throw Error('Probe output must be a numbered private probe folder');
    const sampleOutput=command==='probe'?path.join(here,'.tmp',probeName):qa;if(command==='probe'&&fs.existsSync(path.join(sampleOutput,'full-probe.json')))throw Error('Never overwrite a bound private probe');fs.mkdirSync(sampleOutput,{recursive:true});
    let page=await open();const sampleFrames=command==='probe'?probeFrames:command==='focused'?spec.correctionFrames:command==='draft'?[225,235,242,285,324,348,362,383,393,398,401,442,450,463,476,489,500,516,529,555,573,600,617,633,650,740,842,931]:spec.sampleFrames,samples=[],tiles=[];
    for(const [i,frame]of sampleFrames.entries()){
      const bytes=await capture(page,frame),file=`full-frame-${String(frame).padStart(3,'0')}.png`;fs.writeFileSync(path.join(sampleOutput,file),bytes);samples.push({frame,file,sha256:hash(bytes)});
      const label=Buffer.from(`<svg width="480" height="270"><rect x="0" y="0" width="100" height="30" fill="black"/><text x="10" y="22" fill="white" font-family="monospace" font-size="21">f${frame}</text></svg>`);
      tiles.push({input:await sharp(bytes).resize(480,270).composite([{input:label}]).png().toBuffer(),left:i%4*480,top:Math.floor(i/4)*270});
      if((i+1)%20===0)console.log(`Native samples ${i+1}/${sampleFrames.length}`);
    }
    await sharp({create:{width:1920,height:Math.ceil(samples.length/4)*270,channels:3,background:'#000000'}}).composite(tiles).jpeg({quality:93}).toFile(path.join(sampleOutput,`full-${command}-contact-sheet.jpg`));
    const evidence=await page.evaluate(()=>window.__fullEvidence);if(/swiftshader|llvmpipe|software/i.test(evidence.renderer))throw Error(`Hardware renderer required: ${evidence.renderer}`);
    const report={command,sources,producerToolSha256,initializationRuns,samples,evidence,errors,externalRequests,providerCalls:0,paidSpendUsd:0};
    if(['check','render'].includes(command)){
      const replay=[];
      for(const sample of [...samples].reverse()){await capture(page,222+(sample.frame+73)%710);const bytes=await capture(page,sample.frame);if(hash(bytes)!==sample.sha256)throw Error(`Nonlinear seek differs ${sample.frame}`);replay.push({frame:sample.frame,nonlinearSha256:hash(bytes)});if(replay.length%20===0)console.log(`Nonlinear reseek ${replay.length}/${samples.length}`);}
      await browser.close();page=await open();for(const sample of samples){const bytes=await capture(page,sample.frame);if(hash(bytes)!==sample.sha256)throw Error(`Fresh runtime differs ${sample.frame}`);replay.find(x=>x.frame===sample.frame).freshSha256=hash(bytes);}
      report.deterministicReplay={result:'EXACT_PASS',cases:replay};report.invalidFrameRejected=await page.evaluate(async()=>{try{await window.seekFullFrame(932);return false;}catch{return true;}});if(!report.invalidFrameRejected)throw Error('Out-of-range native frame accepted');
      if(command==='render'){
        fs.mkdirSync(scratch,{recursive:true});const frames=[];
        for(let frame=222;frame<932;frame++){const file=`${String(frame-222).padStart(4,'0')}.png`,bytes=await capture(page,frame);fs.writeFileSync(path.join(scratch,file),bytes);frames.push({frame,file,sha256:hash(bytes)});if((frame-222)%30===0)console.log(`Continuation ${frame-222}/710 GPU frames (native ${frame})`);}
        fs.writeFileSync(path.join(scratch,'receipt.json'),JSON.stringify({sources,producerToolSha256,prefixSha256:spec.prefixSha256,frames},null,2)+'\n');
      }
    }
    if(errors.length||externalRequests.length)throw Error(`Runtime/network failure ${JSON.stringify({errors,externalRequests})}`);
    fs.writeFileSync(path.join(sampleOutput,`full-${command}.json`),JSON.stringify(report,null,2)+'\n');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
if(['render','encode'].includes(command)){
  const receiptFile=path.join(scratch,'receipt.json'),receipt=readJson(receiptFile);requireSources(receipt);
  if(receipt.frames.length!==710||receipt.prefixSha256!==spec.prefixSha256)throw Error('Capture count/prefix binding differs');
  for(const [n,frame]of receipt.frames.entries())if(frame.frame!==n+222||hash(fs.readFileSync(path.join(scratch,frame.file)))!==frame.sha256)throw Error(`Captured input changed ${frame.file}`);
  run(ffmpeg,['-y','-framerate','30000/1001','-i',path.join(scratch,'%04d.png'),'-frames:v','710','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-video_track_timescale','30000',continuation]);
  const concat=path.join(here,'.tmp/full-concat.ffconcat');fs.writeFileSync(concat,`ffconcat version 1.0\nfile '${path.join(here,spec.prefixFile).replaceAll('\\','/')}'\nduration 7.407400\nfile '${continuation.replaceAll('\\','/')}'\n`);
  run(ffmpeg,['-y','-f','concat','-safe','0','-i',concat,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','30000','-movie_timescale','30000','-movflags','+faststart',silent]);
  const media={...inspect(silent,false),...temporalProof(silent),captureReceiptSha256:hash(fs.readFileSync(receiptFile)),prefixSha256:spec.prefixSha256,fidelityStatus:'PENDING_INDEPENDENT_FULL_REVIEW'};
  fs.writeFileSync(path.join(qa,'full-silent-media.json'),JSON.stringify(media,null,2)+'\n');
}
if(command==='remux-video-metadata'){
  const receipt=readJson(path.join(qa,'full-silent-media.json'));requireMedia(receipt,silent);
  const corrected=path.join(here,'.tmp/full-silent-precise.mp4');
  run(ffmpeg,['-y','-i',silent,'-map','0:v:0','-c:v','copy','-an','-video_track_timescale','30000','-movie_timescale','30000','-movflags','+faststart',corrected]);
  const checked=inspect(corrected,false);if(Math.abs(checked.videoDuration-932*1001/30000)>.000002)throw Error('Precise MP4 movie timescale did not resolve duration metadata');
  const temporal=temporalProof(corrected);fs.copyFileSync(corrected,silent);
  fs.writeFileSync(path.join(qa,'full-silent-media.json'),JSON.stringify({...inspect(silent,false),...temporalProof(silent),captureReceiptSha256:receipt.captureReceiptSha256,captureProducerToolSha256:receipt.producerToolSha256,captureProducerSnapshot:'qa/full-capture-producer.mjs',previousContainerSha256:receipt.sha256,containerCorrection:'Stream-copy only: movie_timescale30000; all native PTS/prefix pixels unchanged',prefixSha256:spec.prefixSha256,fidelityStatus:'PENDING_INDEPENDENT_FULL_REVIEW'},null,2)+'\n');
}
if(command==='mux'){
  const silentReceipt=readJson(path.join(qa,'full-silent-media.json'));requireMedia(silentReceipt,silent);
  if(hash(fs.readFileSync(path.join(here,spec.audio.file)))!==spec.audio.sha256)throw Error('Approved provisional audio master differs');
  run(ffmpeg,['-y','-i',silent,'-i',path.join(here,spec.audio.file),'-map','0:v:0','-map','1:a:0','-c','copy','-video_track_timescale','30000','-movie_timescale','30000','-movflags','+faststart',muxed]);
  const media={...inspect(muxed,true),...temporalProof(muxed),...audioProof(muxed),captureReceiptSha256:silentReceipt.captureReceiptSha256,captureProducerToolSha256:silentReceipt.captureProducerToolSha256||silentReceipt.producerToolSha256,captureProducerSnapshot:'qa/full-capture-producer.mjs',prefixSha256:spec.prefixSha256,silentSha256:silentReceipt.sha256,audioProvenance:{masterSha256:spec.audio.sha256,recipeSha256:hash(fs.readFileSync(path.join(here,spec.audio.recipe))),sonicStatus:spec.audio.sonicStatus,recipe:'unchanged existing master; stream-copy mux; full AAC tail retained'},fidelityStatus:'PENDING_INDEPENDENT_FULL_REVIEW'};
  fs.writeFileSync(path.join(qa,'full-media.json'),JSON.stringify(media,null,2)+'\n');
  run(ffmpeg,['-y','-v','error','-i',muxed,'-vf',"select='eq(n,114)'",'-frames:v','1',path.join(qa,'full-poster.png')]);
}
if(command==='verify'){
  const receipt=readJson(path.join(qa,'full-media.json'));requireMedia(receipt,muxed);
  if(hash(fs.readFileSync(path.join(here,spec.audio.file)))!==receipt.audioProvenance.masterSha256||hash(fs.readFileSync(path.join(here,spec.audio.recipe)))!==receipt.audioProvenance.recipeSha256)throw Error('Existing audio producer binding differs');
  const report={command,verifiedProducerReceiptSha256:hash(fs.readFileSync(path.join(qa,'full-media.json'))),media:inspect(muxed,true),temporal:temporalProof(muxed),audio:audioProof(muxed)};
  fs.writeFileSync(path.join(qa,'full-media-verification.json'),JSON.stringify(report,null,2)+'\n');
}
console.log(`PASS ${command}; full visual fidelity and sonic status require separate review.`);
