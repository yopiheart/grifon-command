import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const dir=dirname(fileURLToPath(import.meta.url));
const specPath=join(dir,'music-original.spec.json');
const spec=JSON.parse(await readFile(specPath,'utf8'));
const prompt=(await readFile(join(dir,spec.input.file),'utf8')).replace(/\r\n/g,'\n').trimEnd();
const sha=x=>createHash('sha256').update(x).digest('hex');
const endpoint='https://api.elevenlabs.io/v1/music?output_format=mp3_48000_192';
const body={prompt,music_length_ms:150000,model_id:'music_v2_5',force_instrumental:true};
const estimatedUsageUsd=150/60*spec.limits.publishedApiUsdPerMinute;
if(sha(prompt)!==spec.input.sha256||sha(JSON.stringify(body))!==spec.request.bodySha256||
  JSON.stringify(body)!==JSON.stringify(spec.request.body)||spec.request.endpoint!==endpoint||
  spec.limits.maxPaidCalls!==1||spec.limits.automaticRetries!==0||spec.limits.newPurchasesOrSubscriptions!==false||
  spec.limits.maximumDurationSeconds!==150||spec.limits.maximumUsageUsdBeforeTax!==.50||
  !Number.isFinite(estimatedUsageUsd)||estimatedUsageUsd<=0||estimatedUsageUsd>.50)
  throw Error('Original-music request or usage cap differs from the reviewed spec.');
if(process.argv.includes('--dry-run')&&process.argv.includes('--generate'))throw Error('Choose dry-run or generation.');
if(!process.argv.includes('--generate')){
  console.log(JSON.stringify({mode:'DRY_RUN',status:spec.status,paidCalls:0,prompt,model:body.model_id,
    durationSeconds:150,forceInstrumental:true,estimatedUsageUsdBeforeTax:estimatedUsageUsd,
    maximumUsageUsdBeforeTax:.50,bodySha256:spec.request.bodySha256,output:spec.output.file},null,2));
  process.exit(0);
}
// Music is a separate paid generation, not covered by an earlier voice-sample approval.
if(spec.status!=='APPROVED'||!spec.approval?.humanResponse)
  throw Error('Original score is pending exact music-spec and $0.50 usage approval; no request sent.');
const key=process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('Provider credential unavailable.');
try{await readFile(join(dir,spec.output.file));throw Error('Original score already exists; no paid repeat allowed.');}
catch(error){if(error.code!=='ENOENT')throw error;}
const evidence=resolve('.tmp/oceanides-stp/original-music');await mkdir(evidence,{recursive:true});
const receiptPath=join(evidence,'paid-attempt.json');
const lock=await open(receiptPath,'wx').catch(()=>{throw Error('An original-music attempt exists; no automatic retry.');});
let receipt={at:new Date().toISOString(),status:'SUBMITTED_ONCE',bodySha256:spec.request.bodySha256,
  model:body.model_id,durationSeconds:150,estimatedUsageUsdBeforeTax:estimatedUsageUsd,
  maximumUsageUsdBeforeTax:.50,maxPaidCalls:1,automaticRetries:0};
await lock.writeFile(JSON.stringify(receipt,null,2));await lock.close();
try{
  const response=await fetch(endpoint,{method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json',Accept:'audio/mpeg'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(240000)});
  receipt.httpStatus=response.status;
  if(!response.ok)throw Error('Original-music generation failed: HTTP '+response.status+'; no retry.');
  if(!(response.headers.get('content-type')||'').includes('audio'))throw Error('Provider did not return audio; no retry.');
  const audio=Buffer.from(await response.arrayBuffer());
  if(audio.length<1000)throw Error('Music result is empty; no retry.');
  await mkdir(join(dir,'output'),{recursive:true});await writeFile(join(dir,spec.output.file),audio,{flag:'wx'});
  receipt={...receipt,status:'AUDIO_RECEIVED_PENDING_LISTENING',bytes:audio.length,audioSha256:sha(audio),
    songId:response.headers.get('song-id'),reportedCharacterCost:response.headers.get('character-cost'),
    billingNote:'Usage estimate is based on published API rate. Header values are not independently verified account debits.'};
  console.log(JSON.stringify({status:receipt.status,output:join(dir,spec.output.file),paidCalls:1,estimatedUsageUsdBeforeTax:estimatedUsageUsd}));
}catch(error){receipt.status='FAILED_OR_UNKNOWN_NO_RETRY';receipt.error=error.message;throw error;}
finally{
  await writeFile(receiptPath,JSON.stringify(receipt,null,2));spec.status='COMPLETED_PENDING_REVIEW';spec.execution=receipt;
  await writeFile(specPath,JSON.stringify(spec,null,2)+'\n');
}
