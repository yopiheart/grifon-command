// Local visual evidence only: 10 samples/second, timestamped, 2-second windows.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ffmpeg from 'ffmpeg-static';
const root=path.dirname(fileURLToPath(import.meta.url));
const entries=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
const windows={K01:[4,6,16],K02:[8,17,29],K03:[11,18,75],K04:[2,22,38],K05:[10,13,31]};
for(const e of entries)for(const start of windows[e.id]){
 const vf=`trim=start=${start}:end=${start+2},fps=10,scale=320:180,drawtext=fontfile=api/_lib/assets/fonts/Inter-Black.ttf:text='%{pts\\:hms}':fontsize=17:x=7:y=7:fontcolor=white:box=1:boxcolor=black@0.75,tile=4x5`;
 const out=path.join(root,'sheets',`${e.id}-detail-${start}.jpg`);
 const p=spawnSync(ffmpeg,['-v','error','-i',path.join(root,e.proxy_relative),'-vf',vf,'-frames:v','1','-q:v','3','-y',out],{windowsHide:true});
 if(p.status!==0)throw new Error(p.stderr.toString());
 console.log(e.id+' '+start+'-'+(start+2));
}
