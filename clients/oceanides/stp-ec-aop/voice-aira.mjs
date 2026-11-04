import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,resolve} from 'node:path';

const dir=fileURLToPath(new URL('.',import.meta.url));
const recovery=process.argv.includes('--recovery');
const retry=process.argv.includes('--retry')||recovery;
const specPath=join(dir,recovery?'voice-aira-recovery.spec.json':retry?'voice-aira-retry.spec.json':'voice-aira.spec.json');
const spec=JSON.parse(await readFile(specPath,'utf8'));
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const normalize=s=>s.replace(/\r\n/g,'\n');
const script=normalize(await readFile(join(dir,spec.input.file),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
const body={inputs:story.scenes.map(s=>({text:s.vo,voice_id:'CkDT8SVS21XIVk5BcuDe'})),model_id:'eleven_v4',seed:20261104};
const bodySha=sha(JSON.stringify(body));
const characters=body.inputs.reduce((n,s)=>n+s.text.length,0);
const endpoint='https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128';
const expectedHash='58a3fbb743dc8a413cc05ed2238d60b0c7301c8f2fd2a0f5e1789bd1b6f8f3a8';
if(sha(script)!==spec.input.sha256||script!==story.scenes.map(s=>s.vo).join('\n\n')+'\n'||
   bodySha!==expectedHash||bodySha!==spec.request.bodySha256||JSON.stringify(body)!==JSON.stringify(spec.request.body)||
   spec.request.endpoint!==endpoint||characters!==1509||spec.input.characters!==characters||body.inputs.length!==10||
   spec.voice.voice_id!=='CkDT8SVS21XIVk5BcuDe'||spec.voice.name!=='Aira - Confident News Reporter'||
   JSON.stringify(story.scenes.map(s=>s.id))!==JSON.stringify(spec.input.sceneIds)||
   spec.limits.maxCredits!==1600||spec.limits.maxPaidCalls!==1||spec.limits.automaticRetries!==0||
   spec.limits.newPurchasesOrSubscriptions!==false||spec.limits.otherPaidGenerationOrAnalysis!==false)
  throw Error('Exact narration request differs from the review spec. No paid call.');
if(process.argv.includes('--generate')&&process.argv.includes('--dry-run'))throw Error('Choose dry-run or generate, not both.');
if(!process.argv.includes('--generate')){
  console.log(JSON.stringify({mode:'DRY_RUN',paidCalls:0,status:spec.status,voice:spec.voice,characters,
    estimateCredits:characters,capCredits:1600,bodySha256:bodySha,sceneIds:spec.input.sceneIds},null,2));
  process.exit(0);
}
if(spec.status!=='APPROVED'||!spec.approval?.humanResponse||spec.approval.bodySha256!==bodySha)
  throw Error('New narration requires exact human approval before generation. No paid call.');
if(retry&&!spec.approval.textToSpeechPermissionConfirmed)
  throw Error('Retry requires confirmed Text to Speech permission and fresh human approval. No paid call.');
const key=process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('Provider credential unavailable. No paid call.');
const headers={'xi-api-key':key};
const rs=await Promise.all([
  fetch('https://api.elevenlabs.io/v1/voices/'+spec.voice.voice_id,{headers,signal:AbortSignal.timeout(15000)}),
  fetch('https://api.elevenlabs.io/v1/models',{headers,signal:AbortSignal.timeout(15000)})
]);
if(rs.some(r=>!r.ok))throw Error('Read-only voice/model preflight failed. No paid call.');
const [voice,models]=await Promise.all(rs.map(r=>r.json()));
const model=models.find(m=>m.model_id==='eleven_v4');
if(voice.voice_id!==spec.voice.voice_id||voice.name!==spec.voice.name||voice.category!=='professional'||
  !model?.can_do_text_to_speech||!model.languages?.some(l=>l.language_id==='fil'))
  throw Error('Reviewed voice/model unavailable. No paid call.');
const estimate=Math.ceil(characters*Number(model.model_rates?.character_cost_multiplier??model.token_cost_factor)*
  Number(model.model_rates?.cost_discount_multiplier??1)*Number(voice.sharing?.rate));
if(!Number.isFinite(estimate)||estimate<=0||estimate>1600||Number(voice.sharing?.rate)!==1)
  throw Error('Current rate exceeds or differs from approved spec. No paid call.');
for(const p of [spec.output.audio,spec.output.alignment]){
  try{await readFile(join(dir,p));throw Error('Narration output already exists. Repeat generation is blocked.');}
  catch(e){if(e.code!=='ENOENT')throw e;}
}
const evidence=resolve(dir,'../../../.tmp/oceanides-stp-ec-aop/voice');await mkdir(evidence,{recursive:true});
const receiptPath=join(evidence,recovery?'paid-attempt-03.json':retry?'paid-attempt-02.json':'paid-attempt.json');
const lock=await open(receiptPath,'wx').catch(()=>{throw Error('Paid attempt already exists. No retry is authorized.');});
let receipt={at:new Date().toISOString(),status:'SUBMITTED_ONCE',bodySha256:bodySha,characters,
  estimatedCredits:estimate,maxCredits:1600,maxPaidCalls:1,automaticRetries:0,voiceId:voice.voice_id,model:'eleven_v4'};
await lock.writeFile(JSON.stringify(receipt,null,2));await lock.close();
try{
  const response=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  receipt.httpStatus=response.status;
  if(!response.ok){
    const failure=await response.json().catch(()=>null);
    const safe=v=>typeof v==='string'?v.replaceAll(key,'[redacted]').replace(/sk_[A-Za-z0-9_-]+/g,'[redacted]').slice(0,400):null;
    receipt.providerErrorStatus=safe(failure?.detail?.status);
    receipt.providerErrorMessage=safe(failure?.detail?.message);
    throw Error('Provider returned HTTP '+response.status+'. No automatic retry.');
  }
  const result=await response.json();
  if(typeof result.audio_base64!=='string'||result.audio_base64.length<1000)throw Error('Usable audio not returned. No retry.');
  const bytes=Buffer.from(result.audio_base64,'base64');
  await mkdir(join(dir,'output'),{recursive:true});
  await writeFile(join(dir,spec.output.audio),bytes,{flag:'wx'});
  const alignment={voice_id:voice.voice_id,inputSceneIds:spec.input.sceneIds,voice_segments:result.voice_segments,
    alignment:result.alignment,normalized_alignment:result.normalized_alignment};
  await writeFile(join(dir,spec.output.alignment),JSON.stringify(alignment,null,2)+'\n',{flag:'wx'});
  receipt={...receipt,status:'AUDIO_RECEIVED_PENDING_ALIGNMENT_REVIEW',audioBytes:bytes.length,audioSha256:sha(bytes),
    reportedCharacterCost:response.headers.get('character-cost')};
  const a=result.alignment;
  if(!a||!Array.isArray(a.characters)||a.characters.length!==a.character_start_times_seconds?.length||
     a.characters.length!==a.character_end_times_seconds?.length||!Array.isArray(result.voice_segments))
    throw Error('Alignment incomplete. Raw audio retained; no retry.');
  const covered=new Set();let prev=0;
  for(let i=0;i<a.characters.length;i++){
    const start=a.character_start_times_seconds[i],end=a.character_end_times_seconds[i];
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<prev-.05||end<start)throw Error('Invalid character timing. No retry.');
    prev=start;
  }
  for(const s of result.voice_segments){
    if(s.voice_id!==voice.voice_id||!Number.isInteger(s.dialogue_input_index)||s.dialogue_input_index<0||
       s.dialogue_input_index>=10||!Number.isFinite(s.start_time_seconds)||!Number.isFinite(s.end_time_seconds)||
       s.end_time_seconds<=s.start_time_seconds)throw Error('Invalid scene alignment. Raw audio retained; no retry.');
    covered.add(s.dialogue_input_index);
  }
  if(covered.size!==10)throw Error('Not all scenes covered. Raw take retained; no retry.');
  receipt.status='AUDIO_AND_ALIGNMENT_RECEIVED_PENDING_REVIEW';
  console.log(JSON.stringify({status:receipt.status,paidCalls:1,estimateCredits:estimate,audio:spec.output.audio}));
}catch(e){receipt.status='FAILED_OR_INCOMPLETE_NO_RETRY';receipt.error=String(e.message).replaceAll(key,'[redacted]');throw e;}
finally{
  await writeFile(receiptPath,JSON.stringify(receipt,null,2));
  spec.execution=receipt;spec.status=receipt.status==='FAILED_OR_INCOMPLETE_NO_RETRY'?'FAILED_NO_RETRY':'COMPLETED_PENDING_REVIEW';
  await writeFile(specPath,JSON.stringify(spec,null,2)+'\n');
}
