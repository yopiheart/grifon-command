import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ffmpeg from 'ffmpeg-static';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const results=[];
for(const e of manifest){
 const proxy=path.join(root,e.proxy_relative),original=path.join(root,e.original_relative);
 if(hash(proxy)!==e.proxy_sha256)throw new Error(e.id+' proxy hash mismatch');
 if(fs.existsSync(original)&&hash(original)!==e.original_sha256)throw new Error(e.id+' original hash mismatch');
 const p=spawnSync(ffmpeg,['-hide_banner','-i',proxy,'-map','0:v:0','-map','0:a:0','-af','volumedetect','-f','null','-'],{windowsHide:true,maxBuffer:8*1024*1024});
 if(p.status!==0)throw new Error(e.id+' decode failed');
 const log=p.stderr.toString(),m=log.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
 const duration=+m[1]*3600+ +m[2]*60+ +m[3];
 if(Math.abs(duration-e.duration_seconds)>.15)throw new Error(e.id+' duration drift');
 if(/Error while decoding|Invalid data found|corrupt decoded frame/i.test(log))throw new Error(e.id+' decoder reported damage');
 results.push({id:e.id,proxy_sha256_verified:true,local_original_sha256_verified:fs.existsSync(original),complete_video_and_audio_decode:'PASS',source_seconds:e.duration_seconds,proxy_seconds:duration,mean_volume_db: +(log.match(/mean_volume: ([\d.-]+)/)||[])[1],max_sample_volume_db: +(log.match(/max_volume: ([\d.-]+)/)||[])[1],audio_note:'Measured levels only; not a listening assessment or true-peak/loudness master check.'});
 console.log(e.id+' hash, duration, full audio/video decode PASS');
}
fs.writeFileSync(path.join(root,'evidence','verification.json'),JSON.stringify(results,null,2));
