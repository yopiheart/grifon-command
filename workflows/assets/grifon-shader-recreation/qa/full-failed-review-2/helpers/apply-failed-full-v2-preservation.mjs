import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

if(process.argv[2]!=='apply'||!process.argv[3])throw Error('Usage: node apply-failed-full-v2-preservation.mjs apply <fresh-plan>');
const workspace=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const artifact=path.join(workspace,'workflows/assets/grifon-shader-recreation');
const publicTarget=path.join(artifact,'qa/full-failed-review-2'),privateTarget=path.join(artifact,'.tmp/full-failed-review-2');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function safe(base,target){
  const absolute=path.resolve(target),relative=path.relative(base,absolute);
  if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))throw Error('Path escapes checked workspace: '+target);
  let current=base;
  for(const segment of relative.split(path.sep).filter(Boolean)){current=path.join(current,segment);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symlink/junction not allowed: '+current);}
  return absolute;
}
function verified(file,expected){
  const absolute=safe(workspace,file),stat=fs.statSync(absolute);
  if(!stat.isFile())throw Error('Expected file: '+file);
  const bytes=fs.readFileSync(absolute);
  if(bytes.length!==expected.bytes||hash(bytes)!==expected.sha256)throw Error('Preservation binding differs: '+file);
  return bytes;
}
const planFile=safe(workspace,path.resolve(workspace,process.argv[3])),planBytes=fs.readFileSync(planFile),plan=JSON.parse(planBytes);
if(plan.status!=='PREPARED_ONLY_NO_COPY_OR_MOVE'||plan.workspace!==workspace||plan.artifact!==artifact||plan.targets.public!==publicTarget||plan.targets.private!==privateTarget)throw Error('Unexpected preservation plan scope');
if(plan.rawCapture.frames.length!==710||Object.keys(plan.sources).length!==13)throw Error('Expected710 raw frames/13 inputs');
const required={
  'reference/full-native-review-v2.md':'38506e5d1e80cd42be09e78ab3e135a472bd9cd7f4ab763e3e23fcdd2adae2a5',
  'qa/full-native-review-v2.json':'18a0c0e821da0cfede05a293794105758ae87974658cf8847e037f1795d4cc0e',
  '.tmp/full-native-critic-v2/receipt.json':'46d6f16fe2267ae8746cba288cb773a16e4aefe7fd91900806acc32bd8bde6e7',
  '.tmp/full-native-critic-v2/closure.json':'e48af15fcd481c857647d0b8b62aa7b8d492d02ebafd0af14dd012432428527f'
};
for(const[file,sha256]of Object.entries(required)){
  const relative=path.relative(workspace,path.join(artifact,file)).replaceAll('\\','/');
  if(!plan.payload.some(item=>item.source===relative&&item.sha256===sha256))throw Error('Final critic boundary absent: '+file);
}
for(const target of[publicTarget,privateTarget]){safe(workspace,target);if(fs.existsSync(target))throw Error('Never overwrite a preserved snapshot');}
const sourceFrames=safe(workspace,plan.rawCapture.source),targetFrames=safe(workspace,plan.rawCapture.proposedDestination);
if(sourceFrames!==path.join(artifact,'.tmp/full-frames')||targetFrames!==path.join(privateTarget,'frames'))throw Error('Unexpected raw move scope');
const captureReceipt=fs.readFileSync(safe(workspace,path.join(sourceFrames,'receipt.json')));
if(hash(captureReceipt)!==plan.rawCapture.receiptSha256)throw Error('Raw capture receipt changed');
const allowedDestinations=new Set();
for(const item of plan.payload){
  const destination=safe(workspace,path.join(workspace,item.destination)),base=item.storage==='public'?publicTarget:item.storage==='private'?privateTarget:null;
  if(!base)throw Error('Unknown storage scope');safe(base,destination);
  if(allowedDestinations.has(destination))throw Error('Duplicate preservation destination');allowedDestinations.add(destination);
  verified(path.join(workspace,item.source),item);
}
for(const item of plan.existingPackets)verified(path.join(artifact,item.file),item);
for(const frame of plan.rawCapture.frames)verified(path.join(sourceFrames,frame.file),frame);
fs.mkdirSync(publicTarget);fs.mkdirSync(privateTarget);
const copied=[];
for(const item of plan.payload){
  const bytes=verified(path.join(workspace,item.source),item),destination=safe(workspace,path.join(workspace,item.destination));
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes,{flag:'wx'});verified(destination,item);copied.push(item);
}
for(const frame of plan.rawCapture.frames)verified(path.join(sourceFrames,frame.file),frame);
safe(workspace,sourceFrames);safe(workspace,targetFrames);
if(fs.existsSync(targetFrames))throw Error('Raw move destination already exists');
fs.renameSync(sourceFrames,targetFrames);
for(const frame of plan.rawCapture.frames)verified(path.join(targetFrames,frame.file),frame);
const movedReceipt=fs.readFileSync(path.join(targetFrames,'receipt.json'));
if(hash(movedReceipt)!==plan.rawCapture.receiptSha256||fs.existsSync(sourceFrames))throw Error('Raw move verification differs');
for(const item of plan.existingPackets)verified(path.join(artifact,item.file),item);
for(const item of plan.payload)verified(path.join(workspace,item.destination),item);
const receipt={status:'PRESERVED_BYTE_VERIFIED',filmSha256:plan.filmSha256,silentSha256:plan.silentSha256,pairSha256:plan.pairSha256,planSha256:hash(planBytes),helperSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),rootRelease:'Explicit root release following closed independent native-v2 FAIL, exactly400/403/636/639',sources:plan.sources,payload:copied,existingPackets:plan.existingPackets,excludedStalePlayerQA:plan.excludedStalePlayerQA,pendingReports:plan.pendingReports,rawCapture:{source:sourceFrames,destination:targetFrames,receiptSha256:hash(movedReceipt),frames:plan.rawCapture.frames,count:710,all710BytesVerified:true,sourceAbsent:true},futureCorrectionWitness:plan.futureCorrectionWitness,exclusions:plan.exclusions,providerCalls:0,paidSpendUsd:0};
const receiptFile=path.join(publicTarget,'preservation-receipt.json');fs.writeFileSync(receiptFile,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
const reopened=JSON.parse(fs.readFileSync(receiptFile));if(reopened.payload.length!==copied.length||reopened.rawCapture.frames.length!==710)throw Error('Preservation receipt differs');
console.log(JSON.stringify({file:path.relative(artifact,receiptFile).replaceAll('\\','/'),sha256:hash(fs.readFileSync(receiptFile)),publicFiles:copied.filter(x=>x.storage==='public').length,privateFiles:copied.filter(x=>x.storage==='private').length,rawFrames:710,status:receipt.status}));
