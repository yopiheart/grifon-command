// Portrait review copy of the landscape sequence; never a different film format.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const arg=process.argv.indexOf('--runtime-root');
const req=createRequire(join(arg<0?root:resolve(process.argv[arg+1]),'package.json'));
const sharp=req('sharp'),ffmpeg=req('ffmpeg-static');
const out=join(root,'assets/hero-film/review-cut-v2');
const data=JSON.parse(readFileSync(join(out,'timing.json'),'utf8'));
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wrap=(s,max)=>s.split(' ').reduce((a,w)=>{if(!a.length||(a.at(-1)+' '+w).length>max)a.push(w);else a[a.length-1]+=' '+w;return a;},[]);
const lines=(s,y,size,max,color)=>wrap(s,max).map((x,i)=>`<text x="40" y="${y+i*(size+11)}" fill="${color}" font-size="${size}">${esc(x)}</text>`).join('');
const run=a=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...a],{stdio:'inherit'});
for(const s of data.shots){
 if(process.argv.includes('--reuse-frames')) continue; // Reuse verified portrait frames for audio-only update.
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><g font-family="Arial,sans-serif"><text x="40" y="65" fill="#ffcc00" font-size="26">GRIFON / MOBILE REVIEW / ${s.start}-${s.end}s</text>${lines(s.title,125,38,29,'#f5f5f7')}${lines(s.line,735,30,35,'#f5f5f7')}${lines(s.badge,920,25,37,'#ffcc00')}${lines('Landscape film kept whole. Temporary edit cues; real ad audio missing.',1100,25,42,'#d4d4d8')}<text x="40" y="1240" fill="#9a9aa3" font-size="23">40s rough sequence / final motion pending</text></g></svg>`;
 const panel=join(out,`mobile-overlay-${s.id}.png`);await sharp(Buffer.from(svg)).png().toFile(panel);
 run(['-i',join(out,`shot-${s.id}.mp4`),'-i',panel,'-filter_complex','[0:v]scale=720:405,pad=720:1280:0:230:color=0x09090b[base];[base][1:v]overlay=0:0[v]','-map','[v]','-frames:v',String(s.seconds*24),'-r','24','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an',join(out,`mobile-shot-${s.id}.mp4`)]);
}
const inputs=data.shots.flatMap(s=>['-i',join(out,`mobile-shot-${s.id}.mp4`)]);
const filter=data.shots.map((s,i)=>`[${i}:v]trim=end_frame=${s.seconds*24},setpts=PTS-STARTPTS[v${i}]`).join(';')+';'+data.shots.map((_,i)=>`[v${i}]`).join('')+'concat=n=8:v=1:a=0[v]';
run([...inputs,'-i',join(out,'temp-cues.wav'),'-filter_complex',filter,'-map','[v]','-map','8:a','-t','40','-r','24','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',join(out,'mobile-review.mp4')]);
run(['-i',join(out,'mobile-review.mp4'),'-f','null','-']);
writeFileSync(join(out,'mobile-notes.json'),JSON.stringify({durationSeconds:40,resolution:[720,1280],fps:24,status:'Portrait review container preserves full landscape film; not final aspect ratio',source:'hero-review-16x9.mp4',audio:'Same local temporary cues'},null,2)+'\n');
console.log('Mobile review copy built and decoded.');
