import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const dir=dirname(fileURLToPath(import.meta.url));
const evidence=resolve(dir,'../../..','.tmp/oceanides-stp/aira-tight-sync');
const spec=JSON.parse(await readFile(join(dir,'voice-aira.spec.json'),'utf8'));
if(spec.execution?.status!=='AUDIO_AND_ALIGNMENT_RECEIVED_PENDING_LISTENING')
  throw Error('A complete approved Aira take and alignment are required. No new speech generation.');
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const body={inputs:story.scenes.map(s=>({text:s.vo,voice_id:spec.voice.voice_id})),model_id:'eleven_v4',seed:20261003};
const sha=value=>createHash('sha256').update(value).digest('hex');
if(sha(JSON.stringify(body))!==spec.request.bodySha256)
  throw Error('Narration wording differs from the approved take.');
const raw=join(dir,spec.output.audio),timing=JSON.parse(await readFile(join(dir,spec.output.alignment),'utf8'));
if(sha(await readFile(raw))!==spec.execution.audioSha256)
  throw Error('Raw Aira audio differs from its approved receipt.');
const alignment=timing.alignment,segments=timing.voice_segments;
if(story.scenes.length!==12||segments.length!==12||alignment.characters.length!==spec.input.characters)
  throw Error('The full twelve-input alignment is required.');
const ranges=story.scenes.map((s,i)=>{
  const seg=segments[i];
  if(seg.dialogue_input_index!==i||seg.voice_id!==spec.voice.voice_id||timing.inputSceneIds[i]!==s.id)
    throw Error('Voice segment identity or order changed.');
  const chars=alignment.characters.slice(seg.character_start_index,seg.character_end_index);
  if(chars.join('').replace(/\s/g,'')!==s.vo.replace(/\s/g,''))
    throw Error('Aligned words differ from approved scene '+s.id+'.');
  const letterIndices=chars.flatMap((c,j)=>/[\p{L}\p{N}]/u.test(c)?[seg.character_start_index+j]:[]);
  return {id:s.id,rawStart:seg.start_time_seconds,rawEnd:seg.end_time_seconds,
    firstLetterStart:alignment.character_start_times_seconds[letterIndices[0]],
    lastLetterEnd:alignment.character_end_times_seconds[letterIndices.at(-1)]};
});
const run=args=>new Promise((ok,bad)=>{
  const p=spawn(ffmpeg,['-hide_banner','-nostdin',...args],{stdio:['ignore','pipe','pipe']});
  const chunks=[];let log='';p.stdout.on('data',d=>chunks.push(d));p.stderr.on('data',d=>log+=d.toString());
  p.on('error',bad);p.on('close',code=>code===0?ok({data:Buffer.concat(chunks),log}):bad(Error('Local tight synchronization failed: '+log.slice(-2500))));
});
await mkdir(evidence,{recursive:true});
const decoded=await run(['-i',raw,'-map','0:a:0','-ac','1','-ar','44100','-c:a','pcm_f32le','-f','f32le','pipe:1']);
await writeFile(join(evidence,'raw-decode.txt'),decoded.log);
const rate=44100,samples=decoded.data.length/4,rawDuration=samples/rate,threshold=10**(-50/20),quiet=[];
if(!Number.isInteger(samples)||rawDuration<100||rawDuration>101)throw Error('Unexpected or incomplete raw voice duration.');
let quietStart=null;
for(let i=0;i<=samples;i++){
  const value=i<samples?decoded.data.readFloatLE(i*4):1;
  if(!Number.isFinite(value))throw Error('Invalid decoded sample.');
  if(Math.abs(value)<=threshold){if(quietStart===null)quietStart=i;}
  else if(quietStart!==null){if((i-quietStart)/rate>=.12)quiet.push({startSample:quietStart,endSample:i,start:quietStart/rate,end:i/rate});quietStart=null;}
}
const cuts=[],boundaries=[];
for(let i=1;i<ranges.length;i++){
  const boundary=ranges[i].rawStart;
  if(Math.abs(boundary-ranges[i-1].rawEnd)>.02)throw Error('Non-contiguous provider scene ranges.');
  const silence=quiet.find(q=>q.start<=boundary+.06&&q.end>=boundary-.06);
  if(!silence)throw Error('No verified quiet boundary near '+ranges[i].id+'. Stop instead of cutting speech.');
  const silenceSeconds=silence.end-silence.start;
  if(silenceSeconds>.35){
    const guard=Math.ceil(.125*rate),startSample=silence.startSample+guard,endSample=silence.endSample-guard;
    if(startSample>=endSample||startSample/rate<ranges[i-1].lastLetterEnd||endSample/rate>ranges[i].firstLetterStart)
      throw Error('Boundary cut would overlap an aligned letter. Stop before changing '+ranges[i].id+'.');
    let peak=0;for(let j=startSample;j<endSample;j++)peak=Math.max(peak,Math.abs(decoded.data.readFloatLE(j*4)));
    if(peak>threshold)throw Error('A proposed cut contains an audible sample.');
    cuts.push({beforeScene:ranges[i].id,startSample,endSample,start:startSample/rate,end:endSample/rate,
      removedSeconds:(endSample-startSample)/rate,peakDbfs:peak?20*Math.log10(peak):null,verifiedThresholdDbfs:-50});
  }
  boundaries.push({beforeScene:ranges[i].id,providerBoundary:boundary,silenceStart:silence.start,
    silenceEnd:silence.end,silenceSeconds,rawVisualBoundary:(silence.start+silence.end)/2});
}
const leadFrames=4,leadSamples=leadFrames*rate/30,tailSamples=Math.ceil(.6*rate),removedSamples=cuts.reduce((n,c)=>n+c.endSample-c.startSample,0);
const contentSamples=leadSamples+samples-removedSamples,finalFrames=Math.ceil((contentSamples+tailSamples)*30/rate),finalSamples=finalFrames*rate/30;
const chunks=[Buffer.alloc(leadSamples*4)];let sourceCursor=0;
for(const cut of cuts){chunks.push(decoded.data.subarray(sourceCursor*4,cut.startSample*4));sourceCursor=cut.endSample;}
chunks.push(decoded.data.subarray(sourceCursor*4),Buffer.alloc((finalSamples-contentSamples)*4));
const pcm=Buffer.concat(chunks),header=Buffer.alloc(44);
header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);
header.writeUInt16LE(3,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*4,28);
header.writeUInt16LE(4,32);header.writeUInt16LE(32,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
const sourceWav=join(evidence,'tight-preserved-source-f32.wav');await writeFile(sourceWav,Buffer.concat([header,pcm]));
const output=join(dir,'output/Oceanides-STP-Aira-Tight-Voice-Synced.wav');
await run(['-y','-i',sourceWav,'-ar','48000','-ac','2','-c:a','pcm_s16le',output]);
const translate=t=>leadFrames/30+t-cuts.reduce((n,c)=>n+Math.max(0,Math.min(t,c.end)-c.start),0);
let cursor=0;
const sceneEvidence=ranges.map((r,i)=>{
  const end=i===ranges.length-1?finalFrames/30:Math.round(translate(boundaries[i].rawVisualBoundary)*30)/30;
  if(end<=cursor)throw Error('Invalid tight scene duration.');
  const speechStart=translate(r.firstLetterStart),speechEnd=translate(r.lastLetterEnd);
  if(speechStart<cursor-.04||speechEnd>end+.04)throw Error('Speech would lie outside its matching visual scene.');
  const result={...r,sceneStart:cursor,sceneEnd:end,speechStart,speechEnd};
  story.scenes[i].start=cursor;story.scenes[i].end=end;cursor=end;return result;
});
story.narrationAttached=true;story.status='Tight continuous Aira timing; approved speech unchanged, final listening review pending';
await writeFile(join(dir,'story-aira-tight.json'),JSON.stringify(story,null,2)+'\n');
const receipt={at:new Date().toISOString(),paidCalls:0,rawSource:spec.output.audio,rawSha256:spec.execution.audioSha256,
  alignmentSource:spec.output.alignment,rawDuration,finalDuration:finalFrames/30,frames:finalFrames,
  approvedWords:spec.input.words,approvedCharacters:spec.input.characters,allTwelveInputsPreserved:true,
  noTimeStretch:true,intraScenePausesUntouched:true,addedPerScenePaddingSeconds:0,
  initialLeadSeconds:leadFrames/30,finalTailAfterRawSeconds:(finalSamples-contentSamples)/rate,
  retainedNonCutFloatSamplesBitExact:true,removedSilenceSeconds:removedSamples/rate,
  cuts,boundaries:boundaries.map(b=>({...b,finalVisualBoundary:Math.round(translate(b.rawVisualBoundary)*30)/30,
    retainedSilenceSeconds:b.silenceSeconds-(cuts.find(c=>c.beforeScene===b.beforeScene)?.removedSeconds||0)})),
  scenes:sceneEvidence,synchronizedWavSha256:sha(await readFile(output)),sourceWavSha256:sha(await readFile(sourceWav))};
await writeFile(join(evidence,'timing-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({duration:receipt.finalDuration,frames:finalFrames,removedSilenceSeconds:receipt.removedSilenceSeconds,
  addedPerScenePaddingSeconds:0,paidCalls:0,output,next:'render.mjs --narrated --aira --tight, then mix-audio.mjs --voice --aira --tight'}));
