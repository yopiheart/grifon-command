import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const dir=dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(await readFile(join(dir,'voice-aira.spec.json'),'utf8'));
if(spec.execution?.status!=='AUDIO_AND_ALIGNMENT_RECEIVED_PENDING_LISTENING')
  throw Error('An approved, complete Aira-voice take and alignment are required. No guessing scene timing.');
const story=JSON.parse(await readFile(join(dir,'story.json'),'utf8'));
const body={inputs:story.scenes.map(s=>({text:s.vo,voice_id:spec.voice.voice_id})),model_id:'eleven_v4',seed:20261003};
if(createHash('sha256').update(JSON.stringify(body)).digest('hex')!==spec.request.bodySha256)
  throw Error('Narration wording differs from the approved take; stop before synchronizing.');
const timing=JSON.parse(await readFile(join(dir,spec.output.alignment),'utf8'));
const audio=join(dir,spec.output.audio);
if(createHash('sha256').update(await readFile(audio)).digest('hex')!==spec.execution.audioSha256)
  throw Error('Raw voice take differs from the generation receipt.');
const run=args=>new Promise((ok,bad)=>{
  const p=spawn(ffmpeg,['-hide_banner','-nostdin',...args],{stdio:['ignore','ignore','pipe']});
  let log='';p.stderr.on('data',d=>log+=d.toString());p.on('error',bad);
  p.on('close',code=>code===0?ok(log):bad(Error('Local voice timing failed: '+log.slice(-2500))));
});
const log=await run(['-i',audio,'-f','null','-']);
const durationMatch=log.match(/Duration: (\d+):(\d+):([\d.]+)/);
if(!durationMatch)throw Error('Raw audio duration is unavailable.');
const rawDuration=+durationMatch[1]*3600+ +durationMatch[2]*60+ +durationMatch[3];
const ranges=story.scenes.map((s,i)=>{
  if(timing.inputSceneIds?.[i]!==s.id)throw Error('Alignment scene order changed.');
  const segments=timing.voice_segments.filter(seg=>seg.dialogue_input_index===i);
  if(!segments.length||segments.some(seg=>seg.voice_id!==spec.voice.voice_id))throw Error('Missing or incorrect scene voice segment.');
  return {id:s.id,start:Math.min(...segments.map(x=>x.start_time_seconds)),end:Math.max(...segments.map(x=>x.end_time_seconds))};
});
for(let i=0;i<ranges.length;i++)if(ranges[i].start<0||ranges[i].end<=ranges[i].start||
  ranges[i].end>rawDuration+.08||i&&ranges[i].start<ranges[i-1].end-.02)
  throw Error('Scene speech overlaps or lies outside the raw take; stop for review.');
const evidence=resolve('.tmp/oceanides-stp/aira-sync');await mkdir(evidence,{recursive:true});
const clips=[],sceneEvidence=[];let cursor=0;
for(let i=0;i<story.scenes.length;i++){
  const r=ranges[i];
  const cutStart=i?(ranges[i-1].end+r.start)/2:0;
  const cutEnd=i===ranges.length-1?rawDuration:(r.end+ranges[i+1].start)/2;
  const clipSeconds=cutEnd-cutStart;
  const seconds=Math.ceil(Math.max(story.scenes[i].end-story.scenes[i].start,clipSeconds+1.3)*30)/30;
  const out=join(evidence,String(i).padStart(2,'0')+'-'+r.id+'.wav');
  await run(['-y','-i',audio,'-af','atrim=start='+cutStart+':end='+cutEnd+
    ',asetpts=PTS-STARTPTS,aresample=48000,adelay=650:all=1,apad,atrim=duration='+seconds,
    '-ac','2','-c:a','pcm_s16le',out]);
  clips.push(out);
  sceneEvidence.push({id:r.id,rawClipStart:cutStart,rawClipEnd:cutEnd,speechStart:cursor+.65+r.start-cutStart,
    speechEnd:cursor+.65+r.end-cutStart,sceneStart:cursor,sceneEnd:cursor+seconds});
  story.scenes[i].start=cursor;cursor=Math.round((cursor+seconds)*30)/30;story.scenes[i].end=cursor;
}
const args=['-y'];for(const clip of clips)args.push('-i',clip);
await run([...args,'-filter_complex',clips.map((_,i)=>'['+i+':a]').join('')+
  'concat=n='+clips.length+':v=0:a=1[vo]','-map','[vo]','-c:a','pcm_s16le',
  join(dir,'output/Oceanides-STP-Aira-Voice-Synced.wav')]);
story.narrationAttached=true;story.status='Aligned to the approved Aira-voice take; final listening review pending';
await writeFile(join(dir,'story-aira.json'),JSON.stringify(story,null,2)+'\n');
await writeFile(join(evidence,'timing-receipt.json'),JSON.stringify({paidCalls:0,voice:spec.voice,
  rawDuration,finalDuration:cursor,noTimeStretch:true,alignmentSource:'ElevenLabs generation timestamps',
  leadingPaddingPerClipSeconds:.65,minimumAdditionalSpaceSeconds:1.3,scenes:sceneEvidence},null,2)+'\n');
console.log(JSON.stringify({alignedScenes:clips.length,duration:cursor,paidCalls:0,
  next:'render.mjs --narrated --aira, then mix-audio.mjs --voice --aira; listen before client use'}));
