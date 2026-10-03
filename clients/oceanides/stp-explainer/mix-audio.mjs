import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const dir=dirname(fileURLToPath(import.meta.url));
const spec=JSON.parse(await readFile(join(dir,'voice-personal.spec.json'),'utf8'));
const musicSpec=JSON.parse(await readFile(join(dir,'music-original.spec.json'),'utf8'));
if(musicSpec.execution?.status!=='AUDIO_RECEIVED_PENDING_LISTENING')
  throw Error('Fresh original Flow score is required; the rejected saved-music preview cannot be used as fallback.');
const voiced=process.argv.includes('--voice');
const story=JSON.parse(await readFile(join(dir,voiced?'story-narrated.json':'story.json'),'utf8'));
const duration=story.scenes.at(-1).end;
if(!(duration>0&&duration<=150))throw Error('Review the original score length for a video outside 0-150 seconds.');
const music=join(dir,musicSpec.output.file);
if(createHash('sha256').update(await readFile(music)).digest('hex')!==musicSpec.execution.audioSha256)
  throw Error('Original score differs from its paid-generation receipt.');
const evidence=resolve('.tmp/oceanides-stp/audio-cost');await mkdir(evidence,{recursive:true});
const run=args=>new Promise((ok,bad)=>{
  const p=spawn(ffmpeg,['-hide_banner','-nostdin',...args],{stdio:['ignore','ignore','pipe']});
  let log='';p.stderr.on('data',d=>log+=d.toString());p.on('error',bad);
  p.on('close',code=>code===0?ok(log):bad(Error('Local audio process failed: '+log.slice(-3000))));
});
const bed=join(evidence,voiced?'music-bed-narrated.wav':'music-bed-preview.wav');
// A complete new score, trimmed once and faded; no repeated stock segment.
const musicLufs=voiced?-28:-24;
await run(['-y','-i',music,'-af',
  'atrim=duration='+duration+',loudnorm=I='+musicLufs+':TP=-6:LRA=7,'+
  'afade=t=in:st=0:d=1.2,afade=t=out:st='+(duration-3)+':d=3,aresample=48000:out_chlayout=stereo',
  '-c:a','pcm_s16le',bed]);
const preview='Oceanides-STP-Original-Score-Preview-1080p.mp4';
let output,mixEvidence;
if(voiced){
  const voice=join(dir,'output/Oceanides-STP-Personal-Voice-Synced.wav');
  const log=await run(['-i',voice,'-af','loudnorm=I=-16:TP=-1.5:LRA=7:print_format=json','-f','null','-']);
  const match=log.match(/\{\s*"input_i"[\s\S]*?\}/);
  if(!match)throw Error('Voice loudness analysis did not return measurements.');
  const levels=JSON.parse(match[0]);
  if(!Number.isFinite(Number(levels.input_i)))throw Error('Voice is empty or unmeasurable.');
  const norm='loudnorm=I=-16:TP=-1.5:LRA=7:measured_I='+levels.input_i+
    ':measured_TP='+levels.input_tp+':measured_LRA='+levels.input_lra+
    ':measured_thresh='+levels.input_thresh+':offset='+levels.target_offset+':linear=true,aresample=48000';
  const video=join(dir,'output/Oceanides-STP-Personal-Voice-Visual-1080p.mp4');
  output=join(dir,'output/Oceanides-STP-Personal-Voice-Music-1080p.mp4');
  await run(['-y','-i',video,'-i',voice,'-i',bed,'-filter_complex',
    '[1:a]'+norm+',asplit=2[sc][v];[2:a][sc]sidechaincompress=threshold=0.05:ratio=3:attack=25:release=400[duck];'+
    '[v][duck]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.84:level=false:latency=true[mix]',
    '-map','0:v:0','-map','[mix]','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',output]);
  mixEvidence={voiceTargetLufs:-16,voiceTruePeakTargetDbtp:-1.5,voiceInput:levels,sidechain:{threshold:.05,ratio:3,attackMs:25,releaseMs:400},voiceTiming:'Provider alignment, then local silence padding; no speech time stretch'};
}else{
  output=join(dir,'output',preview);
  await run(['-y','-i',join(dir,'output/Oceanides-STP-Cost-Explainer-Visual-Draft-1080p.mp4'),'-i',bed,
    '-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','192k','-t',String(duration),'-movflags','+faststart',output]);
  mixEvidence={voiceAttached:false,note:'Music draft only. Correct personal voice has not been generated.'};
}
const levels=await run(['-i',output,'-map','0:a:0','-af','ebur128=peak=true','-f','null','-']);
await writeFile(join(evidence,voiced?'narrated-levels.txt':'preview-levels.txt'),levels);
await writeFile(join(evidence,voiced?'narrated-mix.json':'preview-mix.json'),JSON.stringify({
  at:new Date().toISOString(),output,duration,paidCalls:0,musicSource:spec.localMix.music,
    musicTargetLufs:musicLufs,musicFadeInSeconds:1.2,musicFadeOutSeconds:3,musicLooped:false,
  noAddedSoundEffects:true,...mixEvidence
},null,2)+'\n');
console.log(JSON.stringify({output,duration,voiceAttached:voiced,paidCalls:0,levelsEvidence:evidence}));
