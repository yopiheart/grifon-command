import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const specPath=join(dir,'voice-aira.spec.json');
const spec=JSON.parse(await readFile(specPath,'utf8'));
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const script=(await readFile(join(dir,spec.input.file),'utf8')).replace(/\r\n/g,'\n');
const sha=x=>createHash('sha256').update(x).digest('hex');
const voiceId='CkDT8SVS21XIVk5BcuDe';
const endpoint='https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128';
const body={inputs:story.scenes.map(s=>({text:s.vo,voice_id:voiceId})),model_id:'eleven_v4',seed:20261003};
const characters=body.inputs.reduce((n,x)=>n+x.text.length,0);
if(sha(script)!==spec.input.sha256||sha(JSON.stringify(body))!==spec.request.bodySha256||
  spec.request.bodySha256!=='1ec92d0fcdf22fbcc572c09002335e2ab638e9422bc098bef57216ad43d60f36'||
  JSON.stringify(body)!==JSON.stringify(spec.request.body)||characters!==spec.input.characters||
  spec.voice.voice_id!==voiceId||spec.voice.name!=='Aira - Confident News Reporter'||spec.voice.category!=='professional'||
  spec.request.endpoint!==endpoint||body.inputs.length!==12||characters>2000||
  spec.limits.maxPaidCalls!==1||spec.limits.maxCredits!==1600||spec.limits.automaticRetries!==0||
  spec.limits.newPurchasesOrSubscriptions!==false||spec.limits.otherPaidGenerationOrAnalysis!==false)
  throw Error('Exact Aira-voice request or budget differs from the reviewed spec.');
for(let i=0;i<story.scenes.length;i++)if(spec.input.scenes[i]?.id!==story.scenes[i].id||
  spec.input.scenes[i]?.inputIndex!==i||sha(story.scenes[i].vo)!==spec.input.scenes[i].textSha256)
  throw Error('A scene input differs from the reviewed narration.');
if(process.argv.includes('--dry-run')&&process.argv.includes('--generate'))
  throw Error('Dry-run and generation cannot be combined.');
if(!process.argv.includes('--generate')){
  console.log(JSON.stringify({mode:'DRY_RUN',status:spec.status,paidCalls:0,voice:spec.voice,
    characters,estimatedCredits:characters,maxCredits:1600,endpoint,bodySha256:spec.request.bodySha256,
    inputs:body.inputs.map((x,i)=>({scene:story.scenes[i].id,text:x.text})),output:spec.output},null,2));
  process.exit(0);
}
// A new selected voice needs fresh human approval. Stop before credentials/network.
if(spec.status!=='APPROVED'||!spec.approval?.humanResponse)
  throw Error('Aira-voice full narration is pending exact paid-spec approval; no request sent.');
const key=process.env.ELEVEN_LABS_API_KEY;
if(!key)throw Error('Required provider credential is unavailable.');
const headers={'xi-api-key':key};
const [voiceResponse,modelResponse]=await Promise.all([
  fetch('https://api.elevenlabs.io/v1/voices/'+voiceId,{headers,signal:AbortSignal.timeout(15000)}),
  fetch('https://api.elevenlabs.io/v1/models',{headers,signal:AbortSignal.timeout(15000)})
]);
if(!voiceResponse.ok||!modelResponse.ok)throw Error('Read-only Aira voice/model preflight failed; no paid request sent.');
const voice=await voiceResponse.json(),models=await modelResponse.json();
const model=models.find(m=>m.model_id===body.model_id);
if(voice.voice_id!==voiceId||voice.name!==spec.voice.name||voice.category!=='professional'||
  !model?.can_do_text_to_speech||!model.languages?.some(l=>l.language_id==='fil'))
  throw Error('Exact Aira voice or reviewed model is unavailable; no paid request sent.');
const multiplier=Number(model.model_rates?.character_cost_multiplier??model.token_cost_factor);
const discount=Number(model.model_rates?.cost_discount_multiplier??1);
const voiceRate=Number(voice.sharing?.rate);
if(voiceRate!==1)throw Error('Current Aira voice rate differs from the reviewed rate; no paid request sent.');
const estimate=Math.ceil(characters*multiplier*discount*voiceRate);
if(!Number.isFinite(estimate)||estimate<=0||estimate>spec.limits.maxCredits)
  throw Error('Current estimated charge exceeds the approved cap; no paid request sent.');
for(const file of [spec.output.audio,spec.output.alignment]){
  try{await readFile(join(dir,file));throw Error('Reviewed output already exists; no repeat paid request is allowed.');}
  catch(error){if(error.code!=='ENOENT')throw error;}
}
const evidence=resolve(dir,'../../../.tmp/oceanides-stp/aira-voice');await mkdir(evidence,{recursive:true});
const receiptPath=join(evidence,'paid-attempt.json');
const lock=await open(receiptPath,'wx').catch(()=>{throw Error('An Aira-voice paid attempt already exists; no retry is allowed.');});
let receipt={at:new Date().toISOString(),status:'SUBMITTED_ONCE',voiceId,voiceName:voice.name,
  model:body.model_id,characters,bodySha256:sha(JSON.stringify(body)),estimatedCredits:estimate,
  maxCredits:1600,maxPaidCalls:1,automaticRetries:0};
await lock.writeFile(JSON.stringify(receipt,null,2));await lock.close();
try{
  const response=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});
  receipt.httpStatus=response.status;
  if(!response.ok){
    const failure=await response.json().catch(()=>null);
    const safe=value=>typeof value==='string'?value.replaceAll(key,'[redacted]').replace(/sk_[A-Za-z0-9_-]+/g,'[redacted]').slice(0,800):null;
    receipt.providerErrorStatus=safe(failure?.detail?.status);
    receipt.providerErrorMessage=safe(failure?.detail?.message);
    receipt.requestId=safe(response.headers.get('request-id'));
    throw Error('Aira-voice generation failed: HTTP '+response.status+'; no automatic retry.');
  }
  const result=await response.json();
  if(typeof result.audio_base64!=='string'||result.audio_base64.length<1000)
    throw Error('No usable speech received; no automatic retry.');
  const audio=Buffer.from(result.audio_base64,'base64');
  await mkdir(join(dir,'output'),{recursive:true});
  await writeFile(join(dir,spec.output.audio),audio,{flag:'wx'});
  // Retain the raw take even if alignment is defective; never pay for an automatic replacement.
  const timing={voice_id:voiceId,inputSceneIds:story.scenes.map(s=>s.id),
    voice_segments:result.voice_segments,alignment:result.alignment,normalized_alignment:result.normalized_alignment};
  await writeFile(join(dir,spec.output.alignment),JSON.stringify(timing,null,2)+'\n',{flag:'wx'});
  receipt={...receipt,status:'AUDIO_RECEIVED',bytes:audio.length,audioSha256:sha(audio),
    reportedCharacterCost:response.headers.get('character-cost'),requestId:response.headers.get('request-id')};
  const a=result.alignment;
  if(!a||!Array.isArray(a.characters)||a.characters.length!==a.character_start_times_seconds?.length||
    a.characters.length!==a.character_end_times_seconds?.length||!Array.isArray(result.voice_segments))
    throw Error('Alignment is missing or malformed; raw take retained for review, no retry.');
  let previous=0;
  for(let i=0;i<a.characters.length;i++){
    const start=a.character_start_times_seconds[i],end=a.character_end_times_seconds[i];
    if(!Number.isFinite(start)||!Number.isFinite(end)||start<previous-.05||end<start)
      throw Error('Character timing is inconsistent; raw take retained, no retry.');
    previous=start;
  }
  const coverage=new Set();
  for(const seg of result.voice_segments){
    const idx=seg.dialogue_input_index;
    if(seg.voice_id!==voiceId||!Number.isInteger(idx)||idx<0||idx>=12||
      !Number.isFinite(seg.start_time_seconds)||!Number.isFinite(seg.end_time_seconds)||
      seg.start_time_seconds<0||seg.end_time_seconds<=seg.start_time_seconds||
      !Number.isInteger(seg.character_start_index)||!Number.isInteger(seg.character_end_index)||
      seg.character_start_index<0||seg.character_end_index<seg.character_start_index||seg.character_end_index>a.characters.length)
      throw Error('Scene timing is inconsistent; raw take retained, no retry.');
    coverage.add(idx);
  }
  if(coverage.size!==12)throw Error('Alignment does not cover all twelve scenes; raw take retained, no retry.');
  receipt.status='AUDIO_AND_ALIGNMENT_RECEIVED_PENDING_LISTENING';
  console.log(JSON.stringify({status:receipt.status,voice:voice.name,paidCalls:1,estimatedCredits:estimate,
    output:join(dir,spec.output.audio),alignment:join(dir,spec.output.alignment)}));
}catch(error){receipt.error=error.message;receipt.status='FAILED_OR_INCOMPLETE_NO_RETRY';throw error;}
finally{
  await writeFile(receiptPath,JSON.stringify(receipt,null,2));
  spec.status=receipt.status==='FAILED_OR_INCOMPLETE_NO_RETRY'?'FAILED_NO_RETRY':'COMPLETED_PENDING_REVIEW';spec.execution=receipt;
  await writeFile(specPath,JSON.stringify(spec,null,2)+'\n');
}
