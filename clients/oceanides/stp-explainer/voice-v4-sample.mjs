import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';

const dir=dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(await readFile(join(dir,'voice-v4-sample.spec.json'),'utf8'));
const text=(await readFile(join(dir,spec.input.file),'utf8')).trimEnd();
const digest=value=>createHash('sha256').update(value).digest('hex');
if(digest(text)!==spec.input.sha256||text.length!==spec.input.characters)
  throw Error('Exact sample wording differs from the review spec.');
const exactVoices={aira:'CkDT8SVS21XIVk5BcuDe',megan:'5MxhuJFpo9hpzbxa88y6'};
if(spec.request.model_id!=='eleven_v4'||spec.request.seed!==20261003||
  spec.takes.length!==2||spec.takes.some((take,i)=>
    take.key!==['aira','megan'][i]||take.voice_id!==exactVoices[take.key]||take.libraryRate!==1))
  throw Error('This runner is limited to the reviewed v4 Aira and Megan comparison.');
if(spec.limits.maxPaidCalls!==2||spec.limits.maxPaidCallsPerVoice!==1||
  spec.limits.maxCredits!==600||spec.limits.maxCreditsPerVoice!==300||spec.limits.automaticRetries!==0)
  throw Error('This comparison requires two calls total, one per voice, capped at 600 credits.');
const takes=spec.takes.map(take=>{
  const body={inputs:[{text,voice_id:take.voice_id}],model_id:spec.request.model_id,seed:spec.request.seed};
  if(digest(JSON.stringify(body))!==take.bodySha256)
    throw Error('Provider request differs from the review spec.');
  return {...take,body};
});
const endpoint='https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128';
if(spec.request.endpoint!==endpoint)throw Error('Provider endpoint differs from the reviewed spec.');
if(process.argv.includes('--dry-run')&&process.argv.includes('--generate'))
  throw Error('Dry-run and generation flags cannot be combined.');

if(!process.argv.includes('--generate')){
  console.log(JSON.stringify({mode:'DRY_RUN',paidCalls:0,status:spec.status,
    purpose:spec.purpose,text,charactersPerVoice:text.length,endpoint,
    capCredits:spec.limits.maxCredits,capCreditsPerVoice:spec.limits.maxCreditsPerVoice,
    takes:takes.map(({voiceName,body,output})=>({voiceName,body,output}))},null,2));
}else{
  // Pending approval stops before credentials, requests, or paid-attempt state.
  if(spec.status!=='APPROVED')throw Error('V4 sample spec is pending exact wording and paid-budget approval.');
  const key=process.env.ELEVEN_LABS_API_KEY;
  if(!key)throw Error('Required provider credential is unavailable.');
  const headers={'xi-api-key':key};
  const modelResponse=await fetch('https://api.elevenlabs.io/v1/models',{headers,signal:AbortSignal.timeout(15000)});
  if(!modelResponse.ok)throw Error('Read-only model preflight failed: HTTP '+modelResponse.status);
  const models=await modelResponse.json(),model=models.find(x=>x.model_id===spec.request.model_id);
  if(!model?.can_do_text_to_speech)throw Error('Reviewed model is unavailable; no paid call sent.');
  const multiplier=Number(model.model_rates?.character_cost_multiplier??model.token_cost_factor);
  const discount=Number(model.model_rates?.cost_discount_multiplier??1);
  const credits=Math.ceil(text.length*multiplier*discount);
  if(!Number.isFinite(credits)||credits<=0||credits>spec.limits.maxCreditsPerVoice||
    credits*takes.length>spec.limits.maxCredits)
    throw Error('Current model pricing exceeds the approved credit cap.');
  // Resolve both exact voices and rates before spending on either one.
  for(const take of takes){
    const libraryUrl=new URL('https://api.elevenlabs.io/v1/shared-voices');
    libraryUrl.searchParams.set('search',take.voiceName);libraryUrl.searchParams.set('page_size','100');
    libraryUrl.searchParams.set('include_custom_rates','true');
    const response=await fetch(libraryUrl,{headers,signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Read-only library preflight failed: HTTP '+response.status);
    const library=await response.json();
    const voice=library.voices?.find(v=>v.voice_id===take.voice_id);
    if(!voice||voice.name!==take.voiceName||Number(voice.rate)!==take.libraryRate)
      throw Error('Exact library voice or its rate changed; no paid call sent.');
    const available=await fetch('https://api.elevenlabs.io/v1/voices/'+take.voice_id,
      {headers,signal:AbortSignal.timeout(15000)});
    if(!available.ok)throw Error('Approved '+take.key+' voice is not accessible in the account: HTTP '+available.status+'; no paid call sent.');
  }
  const evidence=resolve('.tmp/oceanides-stp/v4-comparison');
  await mkdir(evidence,{recursive:true});
  const lock=await open(join(evidence,'comparison-attempt.json'),'wx')
    .catch(()=>{throw Error('A comparison attempt already exists; no retry is allowed.');});
  await lock.writeFile(JSON.stringify({at:new Date().toISOString(),maxPaidCalls:2,maxCredits:600}));await lock.close();
  for(const take of takes){
    const receiptPath=join(evidence,take.key+'-paid-attempt.json');
    const attempt=await open(receiptPath,'wx').catch(()=>{throw Error('A paid '+take.key+' attempt already exists; no retry is allowed.');});
    let receipt={at:new Date().toISOString(),status:'SUBMITTED_ONCE',model:spec.request.model_id,
      voiceId:take.voice_id,characters:text.length,inputSha256:digest(text),
      bodySha256:take.bodySha256,maxPaidCalls:1,estimatedCredits:credits,maxCredits:300};
    await attempt.writeFile(JSON.stringify(receipt,null,2));await attempt.close();
    try{
      const response=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/json',Accept:'audio/mpeg'},
        body:JSON.stringify(take.body),signal:AbortSignal.timeout(60000)});
      receipt.httpStatus=response.status;
      if(!response.ok)throw Error('Voice generation failed: HTTP '+response.status+'; no automatic retry.');
      if(!(response.headers.get('content-type')||'').includes('audio'))
        throw Error('Provider response is not audio; no automatic retry.');
      const audio=Buffer.from(await response.arrayBuffer());
      const output=join(dir,take.output);await mkdir(dirname(output),{recursive:true});
      await writeFile(output,audio,{flag:'wx'});
      receipt={...receipt,status:'AUDIO_RECEIVED',bytes:audio.length,audioSha256:digest(audio),
        reportedCharacterCost:response.headers.get('character-cost'),requestId:response.headers.get('request-id'),output};
      console.log(JSON.stringify({voice:take.voiceName,status:receipt.status,bytes:audio.length,estimatedCredits:credits,output,paidCalls:1}));
    }catch(error){receipt.status='FAILED_OR_UNKNOWN_NO_RETRY';throw error;}
    finally{await writeFile(receiptPath,JSON.stringify(receipt,null,2));}
  }
}
