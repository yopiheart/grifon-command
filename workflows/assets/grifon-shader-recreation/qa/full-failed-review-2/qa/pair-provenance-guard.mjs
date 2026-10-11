// Free, isolated provenance/control-flow smoke checks. This is not a media or fidelity review.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const qaRoot=path.dirname(fileURLToPath(import.meta.url));
const assetRoot=path.dirname(qaRoot);
const reportPath=path.join(qaRoot,'pair-provenance-guard.json');
assert(process.argv.slice(2).every(arg=>arg==='--synthetic-only'),'Only --synthetic-only is supported');
const syntheticOnly=process.argv.includes('--synthetic-only');
const previousReport=syntheticOnly&&fs.existsSync(reportPath)?JSON.parse(fs.readFileSync(reportPath,'utf8')):null;
const originalPath=path.join(qaRoot,'pair-provenance-original-builder.mjs');
const privateOriginalPath=path.join(assetRoot,'.tmp/pair-provenance-original.mjs');
const builderPath=path.join(assetRoot,'build-full-paired-review.mjs');
const serverPath=path.join(assetRoot,'review-server.mjs');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const fileHash=file=>hash(fs.readFileSync(file));
const originals={original:fs.readFileSync(originalPath,'utf8'),builder:fs.readFileSync(builderPath,'utf8'),server:fs.readFileSync(serverPath,'utf8')};
const bindings={original:{path:path.relative(assetRoot,originalPath).replaceAll('\\','/'),sha256:fileHash(originalPath)},builder:{path:path.basename(builderPath),sha256:fileHash(builderPath)},server:{path:path.basename(serverPath),sha256:fileHash(serverPath)}};
if(fs.existsSync(privateOriginalPath))assert.equal(fileHash(privateOriginalPath),bindings.original.sha256,'QA original differs from exact private pre-fix helper');
const nativePins={reference:'47c8bbc8e3d06953dd850500e4c7702ce690b3a4bc6708c4fc6a1f3d392df089',opening:'6815c6e5143257c2d8b4fa368735677754b8d57cc0685ccb7d2ce380459a1c69'};
const fixtureRoot=fs.mkdtempSync(path.join(assetRoot,'.tmp/pair-provenance-'));
const results=[];
const report={purpose:'Isolated provenance and immutable HTTP control-flow smoke test; not similarity review or final-film PASS',createdAt:new Date().toISOString(),command:'node workflows/assets/grifon-shader-recreation/qa/pair-provenance-guard.mjs'+(syntheticOnly?' --synthetic-only':''),node:process.version,bindings,verifierSha256:fileHash(fileURLToPath(import.meta.url)),privateFixtureRoot:path.relative(assetRoot,fixtureRoot).replaceAll('\\','/'),boundaries:{nativeProcesses:0,mediaBoundary:'MOCKED: probe JSON, decoded prefix lines, encoder writes, strict decode',fixturePins:'PRIVATE fixture execution rebinds only reference/opening hash literals to synthetic bytes; digest/source/publication checks remain the bound helper code',actualInputAccess:syntheticOnly?'NONE; original defect witness retained only as historical evidence':'Hash-only reads for original defect witness; no audio extraction, decoding or playback',externalNetworkRequests:0,providerCalls:0,paidSpendUsd:0,browserOrGpu:false,helperProcessesStarted:0,loopbackServerPid:process.pid},tests:results};

function relative(root,file){return path.relative(root,file).replaceAll('\\','/');}
function within(root,file){const rel=path.relative(root,path.resolve(file));return rel!==''&&!rel.startsWith('..')&&!path.isAbsolute(rel);}
function write(root,name,bytes){const file=path.join(root,name);assert(within(root,file));fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return file;}
function json(root,name,value){return write(root,name,JSON.stringify(value,null,2)+'\n');}
function readJson(root,name){return JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));}
function instrument(source,{here,pins=false,run=false}){
  let code=source.replace(/^import .*;\r?\n/gm,'');
  assert(!/^import /m.test(code),'Unexpected import in bound helper');
  const location='const here=path.dirname(fileURLToPath(import.meta.url));';
  assert.equal(code.split(location).length,2,'Helper root declaration changed');
  code=code.replace(location,'const here=__here;');
  if(pins){for(const [name,pin]of Object.entries(nativePins)){assert(code.includes(pin));code=code.replaceAll(pin,pins[name]);}}
  if(run){const native="function run(exe,args){const result=spawnSync(exe,args,{encoding:'utf8',maxBuffer:16*1024*1024});if(result.status!==0)throw Error(`${path.basename(exe)} ${result.status}: ${result.stderr}`);return result;}";assert.equal(code.split(native).length,2,'Native media function changed');code=code.replace(native,'function run(exe,args){return __run(exe,args);}');}
  return {code,sha256:hash(code),transforms:['ES-module imports supplied by isolated VM','here bound to '+relative(assetRoot,here),...(pins?['reference/opening literals rebound to synthetic fixture digests']:[]),...(run?['run(exe,args) bound to deterministic mock or first-probe sentinel']:[])]};
}
function trackedFs(root,events,{readOnly=false}={}){
  const mutators=new Set(['mkdirSync','writeFileSync','renameSync','copyFileSync','unlinkSync','rmSync','appendFileSync','truncateSync']);
  return new Proxy(fs,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return (...args)=>{
    if(mutators.has(key)){events.push({operation:key,paths:args.slice(0,['renameSync','copyFileSync'].includes(key)?2:1).map(file=>relative(root,String(file)))});if(readOnly)throw Error('FORBIDDEN_REAL_SOURCE_WRITE');for(const file of args.slice(0,['renameSync','copyFileSync'].includes(key)?2:1))assert(within(root,String(file)),'Mutation escapes isolated fixture');}
    if(key==='readFileSync')events.push({operation:'read',path:relative(root,String(args[0]))});
    return value.apply(target,args);
  };}});
}
function context(here,events,extra={},readOnly=false){return {fs:trackedFs(here,events,{readOnly}),path,crypto,URL,process:{env:{},argv:[process.execPath,'private-fixture',0],pid:process.pid},console:{log(){}},__here:here,spawnSync(){throw Error('FORBIDDEN_NATIVE_PROCESS');},...extra};}
function executeBuilder(source,here,run,pins=false,readOnly=false){const events=[];const bound=instrument(source,{here,pins,run:true});let error=null;try{vm.runInNewContext(bound.code,context(here,events,{__run:run},readOnly),{filename:'private-bound-builder.mjs',timeout:10000});}catch(caught){error=caught.message;}return {error,events,instrumentedSha256:bound.sha256,transforms:bound.transforms};}
function test(name,fn){return Promise.resolve().then(fn).then(evidence=>{results.push({name,status:'PASS',...evidence});},error=>{results.push({name,status:'FAIL',error:error.message});});}

const manifestFiles=['inter-outlines.json','inter-900.ttf','OFL-Inter.txt','logo.png','script-desktop.png','script-mobile.png','storyboard.png'].map(name=>'assets/full/'+name);
const sourceNames=['full.json','full.html','full.js','full-surfaces.frag','vendor/three.global.js','assets/full/manifest.json',...manifestFiles];
const frozenNames=['pilot.json','pilot.html','pilot.js','surfaces.frag','vendor/three.global.js','assets/sdf-manifest.json','assets/introduction-sdf.bin','assets/relief-sdf.bin','assets/relief-height.bin'];
function fixture(label){
  const root=path.join(fixtureRoot,label);fs.mkdirSync(root);
  for(const file of new Set([...sourceNames,...frozenNames]))write(root,file,Buffer.from('synthetic fixture input: '+file+'\n'));
  json(root,'assets/full/manifest.json',{files:manifestFiles.map(file=>({file}))});
  const pins={reference:hash(Buffer.from('synthetic native reference\n')),opening:hash(Buffer.from('synthetic accepted opening\n'))};
  write(root,'reference/source-x.mp4',Buffer.from('synthetic native reference\n'));
  write(root,'grifon-opening-pilot-silent.mp4',Buffer.from('synthetic accepted opening\n'));
  const film=Buffer.from('synthetic full film input\n');write(root,'grifon-recreation-landscape-provisional.mp4',film);
  const sources=Object.fromEntries(sourceNames.map(file=>[file,fileHash(path.join(root,file))]));
  json(root,'qa/pilot-joint-gate-v3.json',{frozenRuntimeInputs:Object.fromEntries(frozenNames.map(file=>[file,fileHash(path.join(root,file))]))});
  const capturePath=json(root,'.tmp/full-frames/receipt.json',{sources,frames:Array.from({length:710},(_,n)=>({frame:n+222}))});
  const producerPath=json(root,'qa/full-media.json',{file:'grifon-recreation-landscape-provisional.mp4',sha256:hash(film),bytes:film.length,prefixFramesVerified:222,prefixSha256:pins.opening,sources,captureReceiptSha256:fileHash(capturePath)});
  const page=Buffer.from('<!doctype html><title>synthetic private pair</title>\n');write(root,'paired-full-review.html',page);
  const pair=Buffer.from('SYNTHETIC PRIOR IMMUTABLE PAIR 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ\n');
  const generation='.tmp/full-paired-generations/prior';write(root,generation+'/pair.mp4',pair);write(root,generation+'/review.html',page);
  const receipt={purpose:'synthetic immutable binding fixture',producerReceiptSha256:fileHash(producerPath),captureReceiptSha256:fileHash(capturePath),sources,inputs:{reference:{sha256:pins.reference},film:{sha256:hash(film)},acceptedOpening:{sha256:pins.opening,frames:222}},output:{path:'.tmp/paired-full.mp4',sha256:hash(pair),bytes:pair.length},page:{path:'paired-full-review.html',sha256:hash(page)},generation:{mediaPath:generation+'/pair.mp4',pagePath:generation+'/review.html',receiptPath:generation+'/receipt.json'}};
  const receiptPath=json(root,'qa/full-paired-review-receipt.json',receipt);write(root,generation+'/receipt.json',fs.readFileSync(receiptPath));write(root,'.tmp/paired-full.mp4',pair);
  return {root,pins,pair,page,receiptBytes:fs.readFileSync(receiptPath),sources,generation};
}
function previousSnapshot(f){return Object.fromEntries(['.tmp/paired-full.mp4','qa/full-paired-review-receipt.json',f.generation+'/pair.mp4',f.generation+'/review.html',f.generation+'/receipt.json'].map(file=>[file,fileHash(path.join(f.root,file))]));}
function mediaMock(f,mode,trace){return (exe,args)=>{
  const response={status:0,stdout:'',stderr:''};
  if(args.includes('-filter_complex')){
    const output=args.at(-1);assert(within(f.root,output));assert.match(relative(f.root,output),/^\.tmp\/paired-full-staging-[a-f0-9-]+\.mp4$/);assert(args.includes('-n'));assert(!args.includes('-y'));assert(!fs.existsSync(output));
    trace.push({operation:'mockEncode',output:relative(f.root,output),previousPairSha256:fileHash(path.join(f.root,'.tmp/paired-full.mp4'))});
    write(f.root,relative(f.root,output),Buffer.from('SYNTHETIC NEW PAIR MOCK ENCODE\n'));
    if(mode==='encode-failure')throw Error('INDUCED_MOCK_ENCODE_FAILURE');return response;
  }
  const input=args.at(-1),staged=typeof input==='string'&&input.includes('paired-full-staging-');
  if(args.includes('-count_frames')){trace.push({operation:staged?'mockOutputProbe':'mockInputProbe'});response.stdout=JSON.stringify({streams:[{codec_type:'video',width:mode==='probe-failure'&&staged?1918:1920,height:staged?540:1080,nb_read_frames:'932',avg_frame_rate:'30000/1001',time_base:'1/30000'}]});return response;}
  if(args.includes('-show_frames')){trace.push({operation:staged?'mockOutputNativeTimestamps':'mockInputNativeTimestamps'});response.stdout=JSON.stringify({frames:Array.from({length:932},(_,n)=>({best_effort_timestamp:n*1001+(mode==='timestamps-failure'&&staged&&n===500?1:0)}))});return response;}
  if(args.includes('framemd5')){trace.push({operation:'mockDecodedOpening'});response.stdout=Array.from({length:222},(_,n)=>'0, '+n+', synthetic-prefix-'+n).join('\n');return response;}
  if(args.includes('-xerror')){trace.push({operation:'mockStrictDecode'});if(mode==='strictdecode-failure')throw Error('INDUCED_MOCK_STRICT_DECODE_FAILURE');if(mode==='input-stability-failure')write(f.root,'full.js','changed synthetic continuation after decode\n');if(mode==='page-stability-failure')write(f.root,'paired-full-review.html','changed synthetic page after decode\n');return response;}
  throw Error('Unexpected mocked media invocation: '+path.basename(exe));
};}
async function startServer(f){
  let server;const bound=instrument(originals.server,{here:f.root,pins:f.pins});const events=[];
  const ready=new Promise((resolve,reject)=>{const wrappedHttp={createServer(...args){server=http.createServer(...args);server.once('listening',resolve);server.once('error',reject);return server;}};vm.runInNewContext(bound.code,context(f.root,events,{http:wrappedHttp}),{filename:'private-bound-review-server.mjs',timeout:10000});});
  await ready;assert.equal(server.address().address,'127.0.0.1');return {server,port:server.address().port,instrumentedSha256:bound.sha256,transforms:bound.transforms};
}
function request(port,url,{method='GET',range}={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path:url,method,headers:range?{Range:range}:{}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,bytes:Buffer.concat(chunks)}));});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('Loopback request timed out')));req.end();});}
async function stopServer(server){await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));assert(!server.listening);}

if(syntheticOnly){
  results.push({name:'original stale-media defect reproduced; corrected builder rejects before media/write',status:'NOT_RUN',reason:'--synthetic-only avoids all current reference/film/source input access; retained evidence is timestamp/hash-bound history'});
  const historical=previousReport?.historicalOriginalDefect;
  if(historical&&historical.bindings.original.sha256===bindings.original.sha256)report.historicalOriginalDefect=historical;
}else await test('original stale-media defect reproduced; corrected builder rejects before media/write',()=>{
  const producer=readJson(assetRoot,'qa/full-media.json');assert.match(producer.sha256,/^045ba2b0/);
  const manifest=readJson(assetRoot,'assets/full/manifest.json');const currentSources=Object.fromEntries(['full.json','full.html','full.js','full-surfaces.frag','vendor/three.global.js','assets/full/manifest.json',...manifest.files.map(asset=>asset.file)].map(file=>[file,fileHash(path.join(assetRoot,file))]));
  const mismatches=Object.entries(currentSources).filter(([file,digest])=>producer.sources[file]!==digest).map(([file,currentSha256])=>({file,receiptSha256:producer.sources[file],currentSha256}));assert(mismatches.length>0);
  const preservedNames=['reference/source-x.mp4','grifon-opening-pilot-silent.mp4','grifon-recreation-landscape-provisional.mp4','qa/full-media.json','paired-full-review.html',...Object.keys(currentSources)];
  const before=Object.fromEntries(preservedNames.map(file=>[file,fileHash(path.join(assetRoot,file))]));assert.equal(before['grifon-recreation-landscape-provisional.mp4'],producer.sha256);
  const sentinelCalls=[];const sentinel=(exe,args)=>{sentinelCalls.push({executable:path.basename(exe),operation:'first media probe',input:path.basename(args.at(-1))});throw Error('MOCK_FIRST_MEDIA_PROBE_REACHED');};
  const old=executeBuilder(originals.original,assetRoot,sentinel,false,true);assert.equal(old.error,'MOCK_FIRST_MEDIA_PROBE_REACHED');assert.equal(sentinelCalls.length,1);assert.equal(old.events.filter(event=>event.operation!=='read').length,0);
  const correctedCalls=[];const corrected=executeBuilder(originals.builder,assetRoot,(...args)=>{correctedCalls.push(args);throw Error('UNEXPECTED_MEDIA_PROBE');},false,true);assert.equal(corrected.error,'Full media source binding differs; changed inputs require a new render');assert.equal(correctedCalls.length,0);assert.equal(corrected.events.filter(event=>event.operation!=='read').length,0);
  const after=Object.fromEntries(preservedNames.map(file=>[file,fileHash(path.join(assetRoot,file))]));assert.deepEqual(after,before);
  return {oldFilmSha256:producer.sha256,producerReceiptSha256:before['qa/full-media.json'],mismatches,original:{caughtError:old.error,mediaCalls:sentinelCalls,writes:0,instrumentedSha256:old.instrumentedSha256,transforms:old.transforms},corrected:{caughtError:corrected.error,mediaCalls:0,writes:0,instrumentedSha256:corrected.instrumentedSha256,transforms:corrected.transforms},realInputsUnchanged:true};
});
if(!syntheticOnly&&results[0].status==='PASS')report.historicalOriginalDefect={observedAt:report.createdAt,bindings,test:results[0]};

for(const [mode,error]of [['encode-failure','INDUCED_MOCK_ENCODE_FAILURE'],['probe-failure','Paired full media contract differs'],['timestamps-failure','Paired output native presentation timestamps differ'],['strictdecode-failure','INDUCED_MOCK_STRICT_DECODE_FAILURE'],['input-stability-failure','Continuation input changed during pair creation: full.js'],['page-stability-failure','A producer receipt or comparison page changed during pair creation']]){
  await test('failed '+mode+' preserves prior pair and bound receipt',()=>{
    const f=fixture(mode),before=previousSnapshot(f),trace=[];const result=executeBuilder(originals.builder,f.root,mediaMock(f,mode,trace),f.pins);assert.equal(result.error,error);assert.deepEqual(previousSnapshot(f),before);
    assert(!result.events.some(event=>event.operation==='renameSync'||event.operation==='copyFileSync'));assert.equal(fs.readdirSync(path.join(f.root,'.tmp/full-paired-generations')).length,1);
    return {mockedMediaBoundary:true,caughtError:result.error,previousBindingUnchanged:true,publishedGenerations:0,orphanStagingFiles:fs.readdirSync(path.join(f.root,'.tmp')).filter(file=>file.startsWith('paired-full-staging-')).length,trace,instrumentedSha256:result.instrumentedSha256};
  });
}
await test('successful mocked builder checks staging before unique generation publication',()=>{
  const f=fixture('success'),originalGeneration=Object.fromEntries(['pair.mp4','review.html','receipt.json'].map(file=>[file,fileHash(path.join(f.root,f.generation,file))]));const builds=[];
  for(let n=0;n<2;n++){
    const trace=[];const result=executeBuilder(originals.builder,f.root,mediaMock(f,'success',trace),f.pins);assert.equal(result.error,null);
    const receipt=readJson(f.root,'qa/full-paired-review-receipt.json');assert.equal(receipt.output.sha256,fileHash(path.join(f.root,receipt.generation.mediaPath)));assert.equal(receipt.output.sha256,fileHash(path.join(f.root,'.tmp/paired-full.mp4')));assert.equal(receipt.page.sha256,fileHash(path.join(f.root,receipt.generation.pagePath)));assert(fs.readFileSync(path.join(f.root,receipt.generation.receiptPath)).equals(fs.readFileSync(path.join(f.root,'qa/full-paired-review-receipt.json'))));
    assert.deepEqual(receipt.sources,f.sources);assert.equal(receipt.checks.allNativeOutputPresentationTimestamps,true);assert.equal(receipt.checks.immutableGeneration,true);
    assert.deepEqual(trace.map(event=>event.operation),['mockInputProbe','mockInputNativeTimestamps','mockInputProbe','mockInputNativeTimestamps','mockDecodedOpening','mockDecodedOpening','mockEncode','mockOutputProbe','mockOutputNativeTimestamps','mockStrictDecode']);
    const firstPublish=result.events.findIndex(event=>event.operation==='renameSync');assert(firstPublish>0);const stabilityReads=result.events.slice(0,firstPublish).filter(event=>event.operation==='read').map(event=>event.path);for(const file of ['reference/source-x.mp4','grifon-recreation-landscape-provisional.mp4','grifon-opening-pilot-silent.mp4',...frozenNames,...sourceNames,'.tmp/full-frames/receipt.json','qa/full-media.json','paired-full-review.html'])assert(stabilityReads.filter(name=>name===file).length>=2,'Missing final stability read '+file);
    builds.push({stagingPath:trace.find(event=>event.operation==='mockEncode').output,generation:receipt.generation,trace,instrumentedSha256:result.instrumentedSha256});
  }
  assert.notEqual(builds[0].stagingPath,builds[1].stagingPath);assert.notEqual(builds[0].generation.mediaPath,builds[1].generation.mediaPath);assert.deepEqual(Object.fromEntries(['pair.mp4','review.html','receipt.json'].map(file=>[file,fileHash(path.join(f.root,f.generation,file))])),originalGeneration);
  return {mockedMediaBoundary:true,successfulBuilds:2,uniqueStagingAndGenerations:true,priorImmutableGenerationUnchanged:true,builds};
});

for(const [label,mutate,expected]of [
  ['generation-page',f=>write(f.root,f.generation+'/review.html','tampered generation page'),'Comparison generation bytes differ from its receipt'],
  ['generation-pair',f=>{const pair=Buffer.from(f.pair);pair[0]^=1;write(f.root,f.generation+'/pair.mp4',pair);},'Comparison generation bytes differ from its receipt'],
  ['producer-receipt',f=>fs.appendFileSync(path.join(f.root,'qa/full-media.json'),' '),'Comparison producer binding differs'],
  ['producer-film',f=>write(f.root,'grifon-recreation-landscape-provisional.mp4','tampered producer film'),'Comparison producer binding differs'],
  ['working-page',f=>write(f.root,'paired-full-review.html','tampered working page'),'Comparison page version differs'],
  ['generation-receipt',f=>fs.appendFileSync(path.join(f.root,f.generation+'/receipt.json'),' '),'Comparison generation bytes differ from its receipt'],
]){
  await test('server rejects mismatched '+label+' with 503',async()=>{
    const f=fixture('server-'+label);mutate(f);const running=await startServer(f);const statuses=[];try{for(const route of ['/paired-full','/paired-full.mp4','/paired-full-receipt.json']){const res=await request(running.port,route);assert.equal(res.status,503);assert(res.bytes.toString().includes(expected));assert.equal(res.headers['cache-control'],'no-store');statuses.push({route,status:res.status});}}finally{await stopServer(running.server);}
    return {statuses,caughtBindingError:expected,serverClosed:true,instrumentedSha256:running.instrumentedSha256};
  });
}
await test('server caches byte-identical page/pair/receipt across working and generation mutations',async()=>{
  const f=fixture('server-immutable'),running=await startServer(f);const routes=['/paired-full','/paired-full.mp4','/paired-full-receipt.json'];let evidence;
  try{
    const firstHead=await request(running.port,'/paired-full.mp4',{method:'HEAD'});assert.equal(firstHead.status,200);assert.equal(Number(firstHead.headers['content-length']),f.pair.length);assert.equal(firstHead.bytes.length,0);
    const before=await Promise.all(routes.map(route=>request(running.port,route)));for(const res of before)assert.equal(res.status,200);assert(before[0].bytes.equals(f.page));assert(before[1].bytes.equals(f.pair));assert(before[2].bytes.equals(f.receiptBytes));
    const firstRange=await request(running.port,'/paired-full.mp4',{range:'bytes=0-9'});assert.equal(firstRange.status,206);assert(firstRange.bytes.equals(f.pair.subarray(0,10)));
    const changedFiles=['.tmp/paired-full.mp4','qa/full-paired-review-receipt.json','paired-full-review.html','qa/full-media.json','grifon-recreation-landscape-provisional.mp4','reference/source-x.mp4','grifon-opening-pilot-silent.mp4','full.js',f.generation+'/pair.mp4',f.generation+'/review.html',f.generation+'/receipt.json'];
    for(const file of changedFiles)write(f.root,file,'mutated disk file '+file+'\n');
    const after=await Promise.all(routes.map(route=>request(running.port,route)));for(let n=0;n<after.length;n++){assert.equal(after[n].status,200);assert(after[n].bytes.equals(before[n].bytes));assert.equal(after[n].headers['content-length'],before[n].headers['content-length']);}
    const rangeChecks=[];for(const [start,end]of [[0,9],[10,24],[25,f.pair.length-1],[0,f.pair.length-1]]){const res=await request(running.port,'/paired-full.mp4',{range:`bytes=${start}-${end}`});assert.equal(res.status,206);assert.equal(res.headers['content-range'],`bytes ${start}-${end}/${f.pair.length}`);assert(res.bytes.equals(f.pair.subarray(start,end+1)));rangeChecks.push({start,end,status:res.status,sha256:hash(res.bytes)});}
    const head=await request(running.port,'/paired-full.mp4',{method:'HEAD',range:'bytes=10-24'});assert.equal(head.status,206);assert.equal(head.bytes.length,0);assert.equal(Number(head.headers['content-length']),15);
    for(const range of ['bytes=999-1000','bytes=10-9','bytes=-5','bytes=0-1,3-4']){const res=await request(running.port,'/paired-full.mp4',{range});assert.equal(res.status,416);}
    evidence={firstRequest:'HEAD initializes immutable cache',mutatedDiskFiles:changedFiles,byteIdenticalRoutes:routes.map((route,n)=>({route,sha256:hash(before[n].bytes),bytes:before[n].bytes.length,status:after[n].status})),successiveRanges:rangeChecks,invalidRangesRejected:4,serverClosed:true,instrumentedSha256:running.instrumentedSha256};
  }finally{await stopServer(running.server);}
  return evidence;
});
await test('failed server load can retry after fixture binding repair',async()=>{
  const f=fixture('server-retry'),running=await startServer(f);try{write(f.root,f.generation+'/review.html','tampered page');const failed=await request(running.port,'/paired-full');assert.equal(failed.status,503);write(f.root,f.generation+'/review.html',f.page);const repaired=await request(running.port,'/paired-full');assert.equal(repaired.status,200);assert(repaired.bytes.equals(f.page));return {statuses:[503,200],serverClosed:true};}finally{await stopServer(running.server);}
});
await test('bound helper sources unchanged throughout smoke run',()=>{assert.equal(fileHash(originalPath),bindings.original.sha256);assert.equal(fileHash(builderPath),bindings.builder.sha256);assert.equal(fileHash(serverPath),bindings.server.sha256);return {allBindingsUnchanged:true};});
report.passed=results.filter(result=>result.status==='PASS').length;report.failed=results.filter(result=>result.status==='FAIL').length;report.notRun=results.filter(result=>result.status==='NOT_RUN').length;report.status=report.failed?'FAIL':'PASS';report.commandExitCode=report.failed?1:0;report.limits=['Synthetic fixture bytes are not playable media; native geometry/timestamps/strict-decode responses are mocked.','Original defect reproduction terminates at the first mocked media probe; it does not encode or validate the stale film.','No source-fidelity, audio, provider, browser/GPU, deployment or final-film validation is claimed.','Failed builder checks may leave orphan private staging files; prior working/bound generation remains intact.','--synthetic-only is repeatable without current real media; its historical original-defect evidence is not a new live-input check.'];
fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,passed:report.passed,failed:report.failed,notRun:report.notRun,commandExitCode:report.commandExitCode,report:relative(assetRoot,reportPath),bindings}));
process.exitCode=report.commandExitCode;
