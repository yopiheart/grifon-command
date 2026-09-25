// Deterministic local intake; does not call any AI/API or alter source videos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ffmpeg from 'ffmpeg-static';
const root=path.dirname(fileURLToPath(import.meta.url));
const downloads='C:/Users/Administrator/Downloads';
const entries=[
 ['K01','five-years','0VSGSQ'],['K02','creative-freedom','UJQD22'],
 ['K03','the-formula','i5078i'],['K04','closet-swap','UKzQSe'],['K05','sourceready','waSmcN']
];
for(const d of ['originals','proxies','audio','sheets','frames','evidence'])fs.mkdirSync(path.join(root,d),{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
async function run(args,expected=0){return new Promise((resolve,reject)=>{const p=spawn(ffmpeg,args,{windowsHide:true});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code===expected?resolve(err):reject(new Error('ffmpeg exit '+code+': '+err.slice(-1200))));});}
const manifest=[];
for(const [id,slug,suffix] of entries){
 const name=fs.readdirSync(downloads).find(x=>x.startsWith('Kendel')&&x.endsWith(suffix+'.mp4'));if(!name)throw new Error('Missing '+suffix);
 const source=path.join(downloads,name),original=path.join(root,'originals',id+'-'+slug+'.mp4');
 if(!fs.existsSync(original))fs.copyFileSync(source,original);
 if(hash(source)!==hash(original))throw new Error('Copy hash mismatch '+id);
 const info=await run(['-hide_banner','-i',original],1);
 const m=info.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/),duration=+m[1]*3600 + +m[2]*60 + +m[3];
 const streams=info.split('\n').filter(l=>/Stream.*(?:Video|Audio):/.test(l));
 manifest.push({id,slug,original_filename:name,original_relative:'originals/'+path.basename(original),proxy_relative:'proxies/'+id+'-'+slug+'.mp4',original_bytes:fs.statSync(source).size,original_sha256:hash(source),duration_seconds:duration,streams,canonical_url:null,source:'User-supplied file; filename credits Kendel.jpg; permalink not supplied',verification:'Visual sampling and local speech transcription, not source-project inspection'});
}
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log('All original copies verified.');
// Limit decoder concurrency so AE/user applications remain usable.
let next=0;
await Promise.all([0,1].map(async()=>{while(next<manifest.length){const e=manifest[next++],src=path.join(root,e.original_relative),proxy=path.join(root,e.proxy_relative);
 if(!fs.existsSync(proxy)){await run(['-hide_banner','-loglevel','error','-i',src,'-map','0:v:0','-map','0:a:0','-vf','scale=1280:720:force_original_aspect_ratio=decrease:force_divisible_by=2','-c:v','libx264','-preset','fast','-crf','22','-threads','2','-c:a','aac','-b:a','128k','-movflags','+faststart','-y',proxy]);}
 e.proxy_bytes=fs.statSync(proxy).size;e.proxy_sha256=hash(proxy);
 await run(['-hide_banner','-loglevel','error','-i',src,'-vn','-ac','1','-ar','16000','-y',path.join(root,'audio',e.id+'.wav')]);
 // Entire duration covered at 1-second spacing. Sheet numbers map to 20-second windows.
 const filter="fps=1,scale=320:180,drawtext=fontfile=api/_lib/assets/fonts/Inter-Black.ttf:text='%{pts\\:hms}':fontsize=17:x=7:y=7:fontcolor=white:box=1:boxcolor=black@0.75,tile=4x5";
 await run(['-hide_banner','-loglevel','error','-i',src,'-vf',filter,'-fps_mode','vfr','-q:v','3','-y',path.join(root,'sheets',e.id+'-%02d.jpg')]);
 const cuts=await run(['-hide_banner','-i',proxy,'-vf',"select='gt(scene,0.22)',showinfo",'-an','-f','null','-']);
 const times=[...cuts.matchAll(/pts_time:([\d.]+)/g)].map(m=>+m[1]);
 fs.writeFileSync(path.join(root,'evidence',e.id+'-cut-candidates.json'),JSON.stringify({threshold:.22,note:'Luminance-change candidates, NOT verified shot boundaries. Animation and flashes can trigger them; continuous camera movement can produce none.',times},null,2));
 console.log(e.id+' ready: '+e.duration_seconds+'s, '+(e.proxy_bytes/1048576).toFixed(1)+' MiB proxy');
}}));
fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
