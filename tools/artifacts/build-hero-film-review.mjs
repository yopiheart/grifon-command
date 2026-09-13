// Local assembly only. Original reference images and the first animatic are untouched.
// node tools/artifacts/build-hero-film-review.mjs --runtime-root <existing npm root>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { finalize } from './_gates.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const arg=process.argv.indexOf('--runtime-root');
const req=createRequire(join(arg<0?root:resolve(process.argv[arg+1]),'package.json'));
const sharp=req('sharp'), ffmpeg=req('ffmpeg-static');
const data=JSON.parse(readFileSync(join(root,'tools/artifacts/data/hero-film-review-cut.json'),'utf8'));
if(data.castingStatus!=='approved-for-assembly') throw new Error('CASTING HOLD: owner selection was superseded. Do not build this character-dependent cut until new casting direction is supplied and the shot data is updated.');
const out=join(root,'assets/hero-film/review-cut-v2'); mkdirSync(out,{recursive:true});
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const embed=(p,mime)=>`data:${mime};base64,${readFileSync(join(root,p)).toString('base64')}`;
const duration=data.shots.reduce((s,x)=>s+x.seconds,0);
if(duration!==40) throw new Error('Review contract requires 40 seconds');
const run=args=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
const codec=['-r','24','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','-an'];
let time=0;
for(const s of data.shots){
  s.start=time;time+=s.seconds;s.end=time;
  const bottom=`<rect y="900" width="1920" height="180" fill="#09090b"/><g font-family="Arial,sans-serif"><text x="70" y="945" fill="#ffcc00" font-size="24">${esc(s.badge)}</text><text x="70" y="998" fill="#f5f5f7" font-size="39" font-weight="bold">${esc(s.title)}</text><text x="70" y="1043" fill="#d4d4d8" font-size="25">${esc(s.line)}</text><text x="1850" y="1043" text-anchor="end" fill="#9a9aa3" font-size="22">${s.start}-${s.end}s / REVIEW 02</text></g>`;
  const center=s.kind==='missing'||s.kind==='cta'?`<path d="M180 290Q620 560 960 350T1740 430" fill="none" stroke="#ffcc00" stroke-width="3" opacity=".55"/><g font-family="Arial,sans-serif" text-anchor="middle"><text x="960" y="480" fill="#f5f5f7" font-size="56" font-weight="bold">${esc(s.kind==='cta'?s.title:'HOLD FOR REAL PRODUCT PROOF')}</text><text x="960" y="550" fill="#ffcc00" font-size="33">${esc(s.line)}</text><text x="960" y="630" fill="#c4c4cb" font-size="27">${s.kind==='cta'?'Finished videos require a paid plan.':'No fabricated interface or generated substitute is shown.'}</text></g>`:'';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${s.kind==='video'?'':'<rect width="1920" height="1080" fill="#101013"/>'}${center}${bottom}</svg>`;
  const overlay=Buffer.from(svg);
  const panel=join(out,`shot-${s.id}.png`);
  if(s.kind==='still'){
    const photo=await sharp(join(root,s.source)).resize(1920,900,{fit:'contain',background:'#101013'}).png().toBuffer();
    await sharp({create:{width:1920,height:1080,channels:3,background:'#101013'}}).composite([{input:photo,top:0,left:0},{input:overlay,top:0,left:0}].map((v,i)=>i===1?{...v,input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${bottom}</svg>`)}:v)).png().toFile(panel);
  }else await sharp(overlay).png().toFile(panel);
  if(s.kind==='video'){
    run(['-i',join(root,s.source),'-i',panel,'-filter_complex','[0:v]scale=1600:900,pad=1920:1080:160:0:color=0x101013[base];[base][1:v]overlay=0:0[v]','-map','[v]','-frames:v',String(s.seconds*24),...codec,join(out,`shot-${s.id}.mp4`)]);
    run(['-i',join(out,`shot-${s.id}.mp4`),'-frames:v','1',join(out,'studio-review-poster.png')]);
  }else run(['-loop','1','-framerate','24','-i',panel,'-frames:v',String(s.seconds*24),...codec,join(out,`shot-${s.id}.mp4`)]);
}
// Deterministic 48kHz mono WAV: short soft tones at edit beats, no provider/music assets.
const rate=48000,n=duration*rate,pcm=Buffer.alloc(n*2);const hits=[.7,4.8,8.8,12.8,18.8,33.9,38];
for(let i=0;i<n;i++){const t=i/rate;let v=0;for(const h of hits){const d=t-h;if(d>=0&&d<.35)v+=.12*Math.sin(2*Math.PI*440*d)*Math.sin(Math.PI*d/.35)**2*Math.exp(-d*14);}pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),i*2);}
const header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(rate,24);header.writeUInt32LE(rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);writeFileSync(join(out,'temp-cues.wav'),Buffer.concat([header,pcm]));
const inputs=data.shots.flatMap(s=>['-i',join(out,`shot-${s.id}.mp4`)]);
const filter=data.shots.map((s,i)=>`[${i}:v]trim=end_frame=${s.seconds*24},setpts=PTS-STARTPTS[v${i}]`).join(';')+';'+data.shots.map((_,i)=>`[v${i}]`).join('')+'concat=n=8:v=1:a=0[v]';
run([...inputs,'-i',join(out,'temp-cues.wav'),'-filter_complex',filter,'-map','[v]','-map','8:a','-t','40','-r','24','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart',join(out,'hero-review-16x9.mp4')]);
run(['-i',join(out,'hero-review-16x9.mp4'),'-f','null','-']);
const cards=data.shots.map(s=>`<article id="shot-${s.id}" class="panel"><img alt="${esc(s.badge)}" src="${embed(`assets/hero-film/review-cut-v2/${s.kind==='video'?'studio-review-poster.png':`shot-${s.id}.png`}`,'image/png')}"><div class="notes"><p class="eyebrow">${s.start}-${s.end}s / ${esc(s.badge)}</p><h3>${esc(s.title)}</h3><p>${esc(s.next)}</p></div></article>`).join('');
const template=readFileSync(join(root,'tools/artifacts/hero-film-review.tpl.html'),'utf8');
const replacements={TITLE:esc(data.title),VIDEO:embed('assets/hero-film/review-cut-v2/hero-review-16x9.mp4','video/mp4'),POSTER:embed('assets/hero-film/review-cut-v2/shot-01.png','image/png'),SHOTS:cards,NATIVE:esc(data.native),LOOK:embed('assets/hero-film/studio-look/hero-frame.png','image/png')};
let html=template;for(const [key,value]of Object.entries(replacements))html=html.replaceAll(`{{${key}}}`,value);
writeFileSync(join(root,'artifacts/grifon-hero-film-review.html'),finalize(html,{label:'hero-film-review',required:['<title>','class="ground"','id="shot-08"','controls'],leftover:[/\{\{[A-Z_]+\}\}/g]}));
writeFileSync(join(out,'timing.json'),JSON.stringify({durationSeconds:duration,fps:24,resolution:[1920,1080],audio:data.audio,shots:data.shots,videoSha256:createHash('sha256').update(readFileSync(join(out,'hero-review-16x9.mp4'))).digest('hex')},null,2)+'\n');
console.log('Built review cut and self-contained artifact; all sources preserved.');
