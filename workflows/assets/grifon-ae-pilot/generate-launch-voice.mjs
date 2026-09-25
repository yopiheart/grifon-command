// Explicitly approved local production take. No application prompt/model changes.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(fs.readFileSync(path.join(base,'launch/production.json'),'utf8'));
const approvedText='Your next ad starts with a clear idea. Find the angle. Shape the story. See every scene. Then make it yours. Grifon. From your first brief to your next ad.';
if(spec.narrationDraft!==approvedText||spec.voiceProposal.voiceId!=='nPczCjzI2devNBz1zQrb'||spec.voiceProposal.model!=='eleven_multilingual_v2'||!spec.voiceProposal.approval.startsWith('Neil explicitly approved'))throw Error('Exact approved spec mismatch');
const key=process.env.ELEVEN_LABS_API_KEY;if(!key)throw Error('ElevenLabs credential not available in process environment');
const ledgerPath=path.join(base,'launch/voice-ledger.json');
const ledger=fs.existsSync(ledgerPath)?JSON.parse(fs.readFileSync(ledgerPath,'utf8')):{maxTakes:2,maxCredits:500,attempts:[]};
if(ledger.attempts.some(x=>x.status==='submitting'))throw Error('Uncertain prior submission; do not blindly retry');
if(ledger.attempts.length>=2||ledger.attempts.length*approvedText.length+approvedText.length>500)throw Error('Approved limit reached');
const headers={'xi-api-key':key};
async function read(endpoint){const r=await fetch('https://api.elevenlabs.io'+endpoint,{headers});if(!r.ok){const body=await r.json().catch(()=>({}));const code=typeof body.detail?.status==='string'?body.detail.status:'unknown';throw Error('Read-only provider preflight failed: HTTP '+r.status+' / '+code);}return r.json();}
const voice=await read('/v1/voices/'+spec.voiceProposal.voiceId);
console.log(JSON.stringify({voiceName:voice.name,category:voice.category}));
if(voice.name!=='Brian - Deep, Resonant and Comforting'||voice.category!=='premade')throw Error('Approved stock voice unavailable or changed');
const sub=await read('/v1/user/subscription');
const remaining=sub.character_limit-sub.character_count;
if(!Number.isFinite(remaining)||remaining<approvedText.length)throw Error('Insufficient included credits; no overage/purchase authorized');
console.log('Preflight passed: Brian stock voice; sufficient included credits; exact 155-character script.');
if(!process.argv.includes('--generate')){console.log('Read-only preflight only.');process.exit(0);}
const take=ledger.attempts.length+1,entry={take,characters:approvedText.length,status:'submitting',startedAt:new Date().toISOString()};ledger.attempts.push(entry);
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');
const r=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+spec.voiceProposal.voiceId+'/with-timestamps',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({text:approvedText,model_id:spec.voiceProposal.model})});
if(!r.ok){entry.status='failed-http';entry.httpStatus=r.status;fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');throw Error('TTS failed HTTP '+r.status+'; attempt counted, no automatic retry');}
const data=await r.json();if(!data.audio_base64||!data.alignment)throw Error('Incomplete provider response; leave attempt uncertain');
const stem='launch-voice-take-'+take;fs.writeFileSync(path.join(base,'source',stem+'.mp3'),Buffer.from(data.audio_base64,'base64'));
fs.writeFileSync(path.join(base,'source',stem+'-timing.json'),JSON.stringify({alignment:data.alignment,normalized_alignment:data.normalized_alignment},null,2)+'\n');
entry.status='completed';entry.file='source/'+stem+'.mp3';entry.providerSpeechEndSeconds=Math.max(...data.alignment.character_end_times_seconds);entry.completedAt=new Date().toISOString();
fs.writeFileSync(ledgerPath,JSON.stringify(ledger,null,2)+'\n');console.log(JSON.stringify({take,characters:entry.characters,speechEndSeconds:entry.providerSpeechEndSeconds,status:entry.status},null,2));
