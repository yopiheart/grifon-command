import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),dir=path.join(root,'workflows/assets/grifon-motion-director-demo'),out=path.join(dir,'qa/smoke');
const ff=path.join(root,'node_modules/ffmpeg-static/ffmpeg.exe');
const cache=path.join(process.env.LOCALAPPDATA,'npm-cache/_npx');
const pp=fs.readdirSync(cache).map(d=>path.join(cache,d,'node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe')).find(p=>fs.existsSync(p));
const result={};
for(const format of ['portrait','landscape']) {
 const file=path.join(dir,format+'.mp4');
 const commands=[['probe',pp,['-v','error','-count_frames','-show_streams','-show_format','-of','json',file]],['decode',ff,['-v','error','-i',file,'-f','null','-']],['sound',ff,['-hide_banner','-nostats','-i',file,'-vn','-af','ebur128=peak=true','-f','null','-']],['black',ff,['-hide_banner','-nostats','-i',file,'-an','-vf','blackdetect=d=0.15:pix_th=0.01','-f','null','-']],['sheet',ff,['-y','-hide_banner','-loglevel','error','-i',file,'-vf',`fps=2,scale=${format==='portrait'?'180:-1':'320:-1'},tile=6x4`,'-frames:v','1',path.join(out,format+'-actual-mp4-sheet.jpg')]]];
 result[format]={};
 for(const [name,exe,args] of commands) { const r=spawnSync(exe,args,{encoding:'utf8',windowsHide:true,maxBuffer:15e6}); fs.writeFileSync(path.join(out,format+'-'+name+'.txt'),(r.stdout||'')+(r.stderr||''));result[format][name]={exit:r.status,error:r.error?.message}; if(name==='probe'&&r.status===0){const p=JSON.parse(r.stdout);result[format].media={duration:p.format.duration,streams:p.streams.map(s=>({type:s.codec_type,codec:s.codec_name,width:s.width,height:s.height,fps:s.r_frame_rate,frames:s.nb_read_frames,duration:s.duration,sample_rate:s.sample_rate,channels:s.channels}))};} }
}
fs.writeFileSync(path.join(out,'media-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
