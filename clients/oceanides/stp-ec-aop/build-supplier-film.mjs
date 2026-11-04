// Local-only edit of supplier footage authorized by Neil on 2026-11-05.
// No generative pixels, model calls, new speech, or equipment reconstruction.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,join,resolve} from 'node:path';
import {chromium} from 'playwright';
import ffmpeg from 'ffmpeg-static';
const dir=dirname(fileURLToPath(import.meta.url)),root=resolve(dir,'../../..');
const work=join(root,'.tmp/oceanides-stp-ec-aop/supplier-edit');
const source=join(dir,'source/BioGreen-Authorized-Source.mp4');
const story=JSON.parse(await readFile(join(dir,'story-aira-tight.json'),'utf8'));
const alignment=JSON.parse(await readFile(join(dir,'output/aira-alignment.json'),'utf8'));
const timing=JSON.parse(await readFile(join(dir,'source-edit-timing.json'),'utf8'));
const output=join(dir,'output/Oceanides-BioGreen-Supplier-Animation-Aira-1080p.mp4');
const sha=x=>createHash('sha256').update(x).digest('hex');
const shots={problem:[[0,4.366666666666666]],overview:[[8,5],[25,5.5]],ec:[[27,3.6],[37,3],[60,10.033333333333333]],settling:[[81,9.466666666666667]],filtration:[[137,3.1],[180,3.1]],aop:[[218,8.8]],verify:[[241,8.133333333333333]],care:[[119,7],[250,8.533333333333333]],economics:[[13,9.066666666666666]],cta:[[253,14.1]]};
const notes={problem:['Treat wastewater','on your site.'],overview:['One system.','A clear journey.'],ec:['Bring particles','together.'],settling:['Collected solids','need removal.'],filtration:['Filter what','remains.'],aop:['UV + ozone.','Further treatment.'],verify:['Clear water','needs proof.'],care:['Less hauling?','Plan for care.'],economics:['Measure before','you commit.'],cta:['Start with','your site.']};
const detail={problem:'A practical starting point for your wastewater decision.',overview:'Electrocoagulation → filtration → advanced oxidation',ec:'Electrical current + metal electrodes',settling:'Upstream particle formation is illustrated here. The sludge-removal step is not shown.',filtration:'Media filtration + fractionation filter',aop:'Advanced oxidation and disinfection, as shown by the supplier.',verify:'Laboratory results must be checked against site discharge requirements.',care:'Power, consumables, maintenance and sludge removal remain.',economics:'Actual flow. Lab results. Available space. Operating costs.',cta:'Site assessment → technical review → cost comparison'};
const mapTime=t=>t-timing.cuts.reduce((n,c)=>n+Math.max(0,Math.min(t,c.end)-c.start),0)+timing.initialLeadSeconds;
const captions=[];
for(let i=0;i<story.scenes.length;i++){
 const s=story.scenes[i],seg=alignment.voice_segments[i],a=alignment.alignment;
 const chars=a.characters.slice(seg.character_start_index,seg.character_end_index).join('');
 if(chars!==s.vo)throw Error('Approved speech mismatch: '+s.id);
 let from=0;
 while(from<chars.length){let to=Math.min(chars.length,from+103);if(to<chars.length){const boundary=chars.lastIndexOf(' ',to);if(boundary>from)to=boundary;}
  const text=chars.slice(from,to).trim();
  const first=seg.character_start_index+from,last=seg.character_start_index+to-1;
  captions.push({scene:s.id,start:Math.max(s.start,mapTime(a.character_start_times_seconds[first])),end:Math.min(s.end,mapTime(a.character_end_times_seconds[last])+.06),text});
  from=to;while(chars[from]===' ')from++;
 }
 const length=shots[s.id].reduce((n,x)=>n+x[1],0);
 if(Math.abs(length-(s.end-s.start))>.0001)throw Error('Shot duration mismatch: '+s.id);
}
const run=(args)=>new Promise((ok,bad)=>{const p=spawn(ffmpeg,['-hide_banner','-nostdin','-loglevel','warning',...args],{cwd:work,stdio:['ignore','ignore','pipe']});let log='';p.stderr.on('data',x=>log+=x);p.on('error',bad);p.on('close',c=>c===0?ok(log):bad(Error(log.slice(-3000))));});
await mkdir(work,{recursive:true});
await writeFile(join(work,'Corbel.ttf'),await readFile('C:/Windows/Fonts/corbel.ttf'));
const logo=(await readFile(join(dir,'../company-profile/assets/logo-transparent.png'))).toString('base64');
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
await page.setContent('<html><body style="margin:0"><canvas width="1920" height="1080"></canvas></body></html>');
await page.evaluate(async logo=>{window.logo=new Image();window.logo.src='data:image/png;base64,'+logo;await window.logo.decode();},logo);
const overlays=[];
try{
 for(const s of story.scenes){
 const data=await page.evaluate(({s,lines,detail,logo})=>{
  const c=document.querySelector('canvas'),g=c.getContext('2d'),dark=['problem','cta'].includes(s.id),ink=dark?'#FFFFFF':'#0B1B33',muted=dark?'#C5D4E7':'#526174';
  g.clearRect(0,0,1920,1080);g.fillStyle=dark?'#0A1F45':'#F4F6FA';g.fillRect(0,0,1920,1080);
  const text=(v,x,y,size,color=ink,weight=400,font='Corbel')=>{g.font=`${weight} ${size}px "${font}",Arial`;g.fillStyle=color;g.fillText(v,x,y);};
  const wrap=(v,x,y,w,size,color,weight=400,font='Corbel',leading=size*1.25)=>{g.font=`${weight} ${size}px "${font}",Arial`;let line='',yy=y;for(const word of v.split(' ')){if(g.measureText(line+word).width>w&&line){text(line.trim(),x,yy,size,color,weight,font);line='';yy+=leading;}line+=word+' ';}if(line)text(line.trim(),x,yy,size,color,weight,font);return yy;};
  g.strokeStyle=dark?'#234471':'#CFD9E7';g.lineWidth=1;g.beginPath();g.moveTo(82,177);g.lineTo(1838,177);g.stroke();
  text('Wastewater / process film',84,94,29,ink,700,'Century Gothic');
  text('On-site wastewater treatment',84,132,24,muted);
  g.drawImage(window.logo,1723,28,118,118);
  const k=(s.id==='settling'?'Residual sludge':s.kicker).replace(/^\d+\s*\/\s*/, '');
  text(k,84,254,21,dark?'#B8D3F0':'#1C63AD',700,'Century Gothic');
  let y=365;for(const line of lines){text(line,80,y,54,ink,700,'Century Gothic');y+=66;}
  wrap(detail,84,y+55,465,29,muted,400,'Corbel',39);
  // Preserve the complete source frame; no equipment crop or AI reconstruction.
  g.clearRect(650,270,1188,615);
  text('Supplier animation / BioGreen',650,923,19,muted);
  text('Final configuration and performance require site assessment and technical validation.',84,1043,19,muted);
  g.fillStyle=dark?'#4779AF':'#1C63AD';g.fillRect(84,975,1754*(s.end/102.8),3);
  if(s.id==='cta'){text('0917 671 6383',84,731,37,ink,700);text('marketing@oceanidessepticandpest.com',84,777,23,muted);}
  return c.toDataURL('image/png').split(',')[1];
 },{s,lines:notes[s.id],detail:detail[s.id]});
 const path=join(work,s.id+'-overlay.png');await writeFile(path,Buffer.from(data,'base64'));overlays.push(path);
 }
}finally{await browser.close();}
// Captions are derived from provider character alignment, with the same verified silence edits.
const stamp=t=>{const cs=Math.round(t*100),h=Math.floor(cs/360000),m=Math.floor(cs/6000)%60,se=Math.floor(cs/100)%60;return `${h}:${String(m).padStart(2,'0')}:${String(se).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;};
let ass='[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding\nStyle: Default,Corbel,31,&H00331B0B,&H00331B0B,&H00FAF6F4,&H00FAF6F4,0,0,0,0,100,100,0,0,3,9,0,2,100,100,102,1\n\n[Events]\nFormat: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text\n';
for(const c of captions)ass+=`Dialogue: 0,${stamp(c.start)},${stamp(c.end)},Default,,0,0,0,,${c.text.replace(/[{}]/g,'')}\n`;
await writeFile(join(work,'captions.ass'),ass);
await writeFile(join(work,'timeline.json'),JSON.stringify({shots,captions},null,2));
const parts=[];
for(let i=0;i<story.scenes.length&&!process.argv.includes('--mix-only');i++){
 const s=story.scenes[i],n=shots[s.id].length,args=['-y'];
 for(const[start,duration]of shots[s.id])args.push('-ss',String(start),'-t',String(duration),'-i',source);
 args.push('-loop','1','-i',overlays[i]);
 let f=shots[s.id].map((_,j)=>`[${j}:v]setpts=PTS-STARTPTS,fps=30,setsar=1[v${j}]`).join(';')+';';
 f+=n>1?`${shots[s.id].map((_,j)=>`[v${j}]`).join('')}concat=n=${n}:v=1:a=0[raw];`:'[v0]null[raw];';
 // Original source marks stay intact. A navy subtitle rail covers the original English
 // caption strip (including its supplier claims), while full equipment framing remains.
 f+='[raw]scale=1188:668:flags=lanczos,drawbox=x=0:y=582:w=1188:h=86:color=0x0A1F45:t=fill[clip];';
 f+=`[${n}:v]format=rgba[bg];[bg][clip]overlay=650:217:shortest=1,drawtext=fontfile=Corbel.ttf:text='${s.kicker.replace(/[^A-Za-z0-9 /.]/g,'')}':x=674:y=816:fontsize=25:fontcolor=white[v]`;
 const target=join(work,s.id+'.mp4');
 await run([...args,'-filter_complex',f,'-map','[v]','-an','-t',String(s.end-s.start),'-r','30','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',target]);
 parts.push(target);console.log('Edited supplier scene: '+s.id);
}
if(!process.argv.includes('--mix-only'))await writeFile(join(work,'concat.txt'),parts.map(p=>`file '${p.replaceAll('\\','/')}'`).join('\n'));
const silent=join(work,'supplier-silent.mp4');
if(!process.argv.includes('--mix-only'))await run(['-y','-f','concat','-safe','0','-i',join(work,'concat.txt'),'-c','copy',silent]);
const d=story.duration,filter=`[0:v]ass=captions.ass[vout];[1:a]loudnorm=I=-16:TP=-1.5:LRA=7,aformat=sample_rates=48000:channel_layouts=stereo,asplit=2[v][sc];[2:a]atrim=duration=${d},loudnorm=I=-28:TP=-3:LRA=7,aformat=sample_rates=48000:channel_layouts=stereo,afade=t=in:st=0:d=0.3,afade=t=out:st=${d-1}:d=1[m];[m][sc]sidechaincompress=threshold=0.03:ratio=5:attack=20:release=300[duck];[v][duck]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.84:level=false[aout]`;
// Relative ASS path avoids Windows drive-colon escaping in FFmpeg filters.
await new Promise((ok,bad)=>{const p=spawn(ffmpeg,['-hide_banner','-nostdin','-loglevel','warning','-y','-i',silent,'-i',join(dir,'output/Oceanides-EC-AOP-Aira-Synced.wav'),'-i',join(dir,'../stp-explainer/output/Oceanides-STP-Flow-Original-150s.mp3'),'-filter_complex',filter,'-map','[vout]','-map','[aout]','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-t',String(d),'-movflags','+faststart',output],{cwd:work,stdio:['ignore','ignore','pipe']});let log='';p.stderr.on('data',b=>log+=b);p.on('error',bad);p.on('close',c=>c===0?ok():bad(Error(log.slice(-3000))));});
const receipt={at:new Date().toISOString(),sourceReference:story.sourceReference,sourceSha256:sha(await readFile(source)),sourceResolution:[854,480],sourceFps:25,sourceDuration:276.829,permission:'User explicitly confirms BioGreen approval to use and rebrand supplier animation, 2026-11-05.',equipmentPixels:'Original supplier footage; no generative reconstruction or hardware geometry changes.',sourceBranding:'Original embedded supplier marks retained to preserve hardware detail. Oceanides main branding outside footage; supplier credited.',sourceCrop:'Complete 854x480 source frame retained with proportional scaling; navy rail covers original English subtitle strip and any image detail behind it; equipment geometry is not redesigned.',script:'Approved 228-word take unchanged; full provider-aligned subtitles included.',output:output.replace(root+'\\','').replaceAll('\\','/'),sha256:sha(await readFile(output)),bytes:(await readFile(output)).length,width:1920,height:1080,fps:30,duration:d,paidCalls:0,shots,captions:captions.length,status:'Local review; final decode, visual and listening acceptance pending.'};
await writeFile(join(dir,'supplier-footage-delivery.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(output);
