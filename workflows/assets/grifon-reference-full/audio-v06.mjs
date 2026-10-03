// Original V06 score: brighter, syncopated curiosity; authored to approved V04.
// No samples, model calls or reference-audio samples. Node 24, deterministic seed.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'assets/audio-v06');mkdirSync(out,{recursive:true});
const fs=48000,duration=32.9,N=Math.round(fs*duration),TAU=Math.PI*2,bpm=105,beat=60/bpm;
const bus=()=>[new Float64Array(N),new Float64Array(N)];
const music=bus(),detail=bus(),motion=bus(),cues=[],ducks=[];
let rng=9270626;
const noise=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return (rng>>>0)/4294967296*2-1};
const clamp=x=>Math.min(1,Math.max(0,x)),hz=n=>440*2**((n-69)/12);
const attack=(t,d)=>Math.sin(clamp(t/d)*Math.PI/2)**2;
const release=(t,d,r)=>Math.sin(clamp((d-t)/r)*Math.PI/2)**2;
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const copyContext={window:{}};vm.runInNewContext(readFileSync(path.join(root,'copy.js'),'utf8'),copyContext);
const copy=copyContext.window.GRIFON_COPY;
function add(target,at,dur,amp,pan,fn,label,visualAt=null){
 const start=Math.round(at*fs),len=Math.round(dur*fs);
 for(let j=Math.max(0,-start);j<len&&start+j<N;j++){
  const p=j/Math.max(1,len-1),v=fn(j/fs,p,j)*amp;
  const position=typeof pan==='function'?pan(p):pan;
  const a=(Math.max(-1,Math.min(1,position))+1)*Math.PI/4;
  target[0][start+j]+=v*Math.cos(a);target[1][start+j]+=v*Math.sin(a);
 }
 if(label)cues.push({at,duration:dur,label,bus:target===music?'music':target===detail?'detail':'motion',...(visualAt===null?{}:{visualAt})});
}
// A short, rich pluck: harmonics die before the fundamental, rather than a bell
// sine with the same spectrum all the way through. Alternate velocities breathe.
function pluck(at,n,level,pan=0,bright=1,dur=.62){
 const f=hz(n),ph=noise()*.08;
 add(music,at,dur,level,pan,(t)=>{
  const env=attack(t,.0025)*release(t,dur,.11);
  let x=0;
  for(let h=1;h<=9;h++)x+=Math.sin(TAU*f*h*t+ph*h)*Math.exp(-t*(4.5+h*2.2/bright))/Math.pow(h,1.08);
  return x*env;
 });
}
function bass(at,n,level,dur=.28){
 const f=hz(n);
 add(music,at,dur,level,0,t=>{
  const phase=TAU*f*t;
  return attack(t,.004)*release(t,dur,.075)*Math.exp(-t*2.3)*(Math.sin(phase)*.65+Math.sin(phase*2)*.45+Math.sin(phase*3)*.25+Math.sin(phase*4)*.09);
 });
}
function chord(at,notes,dur,level){
 notes.forEach((n,i)=>{
  const f=hz(n);
  add(music,at,dur,level,[-.62,.58,-.2,.3][i%4],t=>{
   const env=attack(t,.24)*release(t,dur,.5);
   return env*(Math.sin(TAU*f*t+Math.sin(t*.6)*.1)*.54+Math.sin(TAU*f*1.0018*t+.8)*.25+Math.sin(TAU*f*2*t)*.13+Math.sin(TAU*f*3*t)*.065)*(.87+.13*Math.sin(t*3.4+i));
  });
 });
 cues.push({at,duration:dur,label:'suspended harmonic colour',bus:'music',midi:notes});
}
function kick(at,level){
 add(music,at,.3,level,0,t=>attack(t,.001)*release(t,.3,.08)*Math.exp(-t*18)*(Math.sin(TAU*(49*t+65*(1-Math.exp(-t*44))/44))+.055*noise()*Math.exp(-t*150)));
}
function rim(at,level,pan=0){
 let lp=0;
 add(music,at,.1,level,pan,t=>{
  const w=noise();lp+=(w-lp)*.28;
  return attack(t,.0008)*release(t,.1,.02)*(Math.sin(TAU*1740*t)*Math.exp(-t*94)*.42+(w-lp)*Math.exp(-t*67)*.85);
 });
}
function hat(at,level,pan,dur=.055){
 let lp=0;
 add(music,at,dur,level,pan,t=>{const w=noise();lp+=(w-lp)*.36;return (w-lp)*attack(t,.001)*release(t,dur,.018)*Math.exp(-t*42)});
}
// Fmaj9 / Dm9 / Cadd9 / Bbmaj9: a new motif, not a transcription of the track.
const sections=[
 {at:0,end:4.15,notes:[53,57,60,64],root:41,arp:[72,76,79,76,74,72,69,76]},
 {at:4.15,end:7.15,notes:[50,57,60,64],root:38,arp:[74,77,81,77,76,74,72,77]},
 {at:7.15,end:10.08,notes:[48,55,60,62],root:36,arp:[72,79,76,74,79,76,74,72]},
 {at:10.08,end:13.05,notes:[46,53,57,60],root:34,arp:[69,72,77,76,72,69,65,72]},
 {at:13.05,end:17.42,notes:[48,55,60,64],root:36,arp:[72,76,79,83,79,76,74,79]},
 {at:17.42,end:22.48,notes:[53,57,60,64],root:41,arp:[77,79,84,81,79,77,76,79]},
 {at:22.48,end:26.82,notes:[50,57,60,64],root:38,arp:[74,77,81,84,81,77,76,81]},
 {at:26.82,end:29.28,notes:[55,60,62,65],root:43,arp:[79,81,86,84,83,81,79,86]},
 {at:29.28,end:32.9,notes:[48,55,60,64],root:36,arp:[]}
];
const sectionAt=t=>sections.find(s=>t>=s.at&&t<s.end)||sections.at(-1);
sections.forEach(s=>chord(s.at,s.notes,s.end-s.at+.4,s.at<13?.024:.038));
// The measured reference builds at the reveal. This score grows there too.
// A narrow breath precedes each major change; quiet holds remain intentional.
function musicArc(t){
 let a=t<1.13?.70:t<10.1?.82:t<12.65?.96:t<13.05?.80:t<17.42?1.45:t<22.48?1.12:t<26.82?1.2:t<29.28?1.45:.85;
 for(const [lo,hi,depth] of [[12.81,13.04,.93],[17.31,17.46,.85],[22.35,22.59,.85],[29.08,29.28,.78]]){
  if(t>=lo&&t<=hi)a*=1-depth*Math.sin((t-lo)/(hi-lo)*Math.PI)**2;
 }
 return a;
}
for(let i=0;;i++){
 const t=.13+i*beat/2;if(t>=29.08)break;
 const sec=sectionAt(t),p=i%8;
 // Two rests in each phrase keep the ostinato inquisitive, not a constant rattle.
 if(p!==3&&p!==6)pluck(t,sec.arp[p],p===0?.072:.047,Math.sin(i*1.3)*.38,t>=13?1.28:1);
 if(t>=13.05&&p===7)pluck(t+beat/4,sec.arp[0]+12,.026,-.28,1.1,.35);
 if(i%2===0){bass(t,sec.root+(i%8===6?12:0),i%8===0?.090:.064);if(t>1.05)kick(t,i%4===0?.15:.085);}
 if(t>.95&&i%4===2)rim(t,.074,Math.sin(i)*.13);
 if(t>.8&&i%2===1)hat(t,.062,(i%4===1?-.45:.45));
 if(t>=13.05&&i%4===0)hat(t+beat*.75,.040,.55,.11);
}

// Mechanical detail bus. Distinct material signatures for letters, phone,
// camera, hinge and glass -- not the same soft tap pasted onto every object.
function click(at,level,pan=0,material='key',label='key',visualAt=at){
 const modes=material==='paper'?[930,2390,4310]:material==='glass'?[1540,3370,5810]:[1450,2860,4910];
 let lp=0;
 add(detail,at,.10,level,pan,t=>{
  const w=noise();lp+=(w-lp)*.16;
  const body=modes.reduce((sum,f,j)=>sum+Math.sin(TAU*f*t)*Math.exp(-t*(120-j*18))/(j+1),0);
  return attack(t,.0005)*release(t,.1,.02)*(body*.5+(w-lp)*Math.exp(-t*120)*.9);
 },label,visualAt);
}
function keyLine(text,at,span,level,label){
 [...text].forEach((c,i)=>{if(c===' ')return;const t=at+i/(text.length-1)*span;click(t,level*(.88+.12*(i%3)),(i/(text.length-1)-.5)*.23,'key',`${label}: ${c}`,t)});
}
keyLine(copy.opening,.08,.82,.14,'opening character');
keyLine(copy.turningPoint,13.2,.52,.12,'Until now character');
for(const [at,words,name] of [[1.13,copy.launch,'launch'],[4.24,copy.story,'story'],[7.23,copy.grow,'grow']]){
 words.forEach((word,i)=>{const t=at+[0,.12,.26,.45][i];click(t+.025,.145,(i-1.5)*.22,'paper',`${name}: ${word}`,t)});
}
copy.problem.forEach((word,i)=>click(10.2+i*.21,.13,(i-2)*.13,'paper',`problem: ${word}`,10.2+i*.21));
copy.statement.forEach((word,i)=>click([22.8,23.03,23.33,23.74,24.08][i],.13,(i-2)*.05,'key',`closing: ${word}`));

function impact(at,level,label,visualAt=at,tone=68){
 add(motion,at,.46,level,0,t=>{
  const phase=TAU*(tone*t+110*(1-Math.exp(-t*35))/35);
  return attack(t,.0018)*release(t,.46,.15)*(Math.sin(phase)*Math.exp(-t*13)+Math.sin(phase*2)*.27*Math.exp(-t*20)+noise()*.12*Math.exp(-t*75));
 },label,visualAt);ducks.push({at,width:.18,amount:.25});
}
function swish(at,dur,level,label,panFrom=.65,panTo=-.1,peak=.28,visualAt=at){
 let slow=0,fast=0,phase=0;
 add(motion,at,dur,level,p=>panFrom+(panTo-panFrom)*smooth(p),(t,p)=>{
  const w=noise(),band=.025+.30*(1-p)**1.5;
  slow+=(w-slow)*.012;fast+=(w-fast)*band;
  const env=p<peak?Math.sin(p/peak*Math.PI/2)**2:Math.exp(-(p-peak)*6)*release(t,dur,.16);
  phase+=TAU*(260+1700*(1-p)**2)/fs;
  return ((fast-slow)*1.1+Math.sin(phase)*.07)*env;
 },label,visualAt);
}
function reverse(at,dur,level,label,target){
 let lp=0,phase=0;
 add(motion,at,dur,level,p=>Math.sin(p*Math.PI)*.4,(t,p)=>{
  const w=noise();lp+=(w-lp)*(.03+.32*p);
  phase+=TAU*(180+2500*p**3)/fs;
  return (lp*.8+Math.sin(phase)*.13)*p**2.3*attack(t,.02)*release(t,dur,.008);
 },label,target);
}
function glint(at,notes,level,label,visualAt=at){
 notes.forEach((n,i)=>{
  const f=hz(n),dur=.65+i*.13;
  add(detail,at+i*.04,dur,level/(1+i*.25),i%2===0?-.3:.3,t=>attack(t,.0018)*release(t,dur,.15)*(Math.sin(TAU*f*t)*Math.exp(-t*9)+Math.sin(TAU*f*2.01*t)*Math.exp(-t*22)*.18));
 });
 cues.push({at,duration:.9,label,bus:'detail',visualAt});
}
for(const [at,exit,name] of [[1.13,2.16,'product'],[4.24,5.03,'story'],[7.23,8.08,'business']]){
 swish(at,.43,.32,`${name} collage enters`,.6,-.1,.17,at);
 swish(exit,.69,.40,`${name} collage swipes left`,.3,-.8,.6,exit);
}
for(const [kind,at] of [['camera',2.63],['phone',5.65],['laptop',8.61]]){
 swish(at,1.19,.55,`${kind}: rotational sweep`,.82,0,.20,at);
 impact(at+.73,.22,`${kind}: slide settles`,at+.73,kind==='camera'?79:kind==='phone'?110:65);
 // Mechanical finale occurs at the actual end of the 1.19s object turn.
 const stop=at+1.19;
 if(kind==='camera'){
  click(stop-.035,.24,0,'key','shutter first curtain',stop);
  click(stop+.016,.19,.08,'paper','shutter second curtain',stop);
  add(detail,stop,.18,.08,0,t=>Math.sin(TAU*790*t)*Math.exp(-t*38)*attack(t,.001)*release(t,.18,.04),'shutter spring',stop);
 }else if(kind==='phone'){
  click(stop,.18,0,'glass','phone glass contact',stop);glint(stop+.04,[81,88],.046,'phone confirmation',stop);
 }else{
  click(stop,.20,0,'key','laptop hinge lock',stop);click(stop+.045,.12,.15,'paper','hinge release',stop);
 }
}
// Transition noise follows visible tile/reveal windows, with room before bloom.
for(const [at,end,name] of [[2.36,2.93,'camera tiles'],[5.36,5.98,'phone tiles'],[8.33,8.78,'laptop tiles'],[12.83,13.19,'warm tiles']]){
 for(let j=0;j<7;j++)click(at+j*(end-at)/7,.028+(j%3)*.011,(j%2===0?-.35:.35),'glass',name,at);
}
reverse(12.64,.39,.30,'anticipation into warm reveal',13.03);
impact(13.03,.29,'warm reveal opens',13.03,65);
reverse(13.87,.39,.36,'sphere suction',14.27);
impact(14.27,.39,'sphere bloom',14.27,57);
glint(14.27,[79,84,88],.11,'sphere overtone bloom',14.27);
swish(14.27,1.28,.26,'orb expands and settles',0,0,.04,14.27);
// Small digital relay bursts accompany the card entry and typing reveal.
for(const [i,at] of [17.65,18.86,20.8].entries()){
 click(at,.16,i===1?.35:-.35,'glass','message card arrival',at);
 glint(at+.025,[79+i*2,84+i*2],.055,'message glass accent',at);
 const span=[.7,1.22,1.2][i];
 for(let k=0;k<5;k++)click(at+.11+k*span/5,.034,i===1?.3:-.3,'key','text reveal relay',at+.11+k*span/5);
 ducks.push({at,width:.15,amount:.15});
}
reverse(22.19,.28,.23,'dialogue to statement breath',22.48);
swish(25.3,.9,.25,'outline trace',-.45,.35,.6,25.3);
for(const [at,pan] of [[26.82,0],[27.05,-.55],[27.1,.55]]){
 swish(at-.06,.36,.33,'workflow card travel',pan*.6,pan,.45,at);
 click(at+.20,.19,pan,'glass','workflow card contact',at+.20);
}
reverse(28.87,.40,.37,'strip compresses into logo',29.28);
impact(29.28,.34,'logo resolves',29.28,65);
// One unified brand resolution; no competing melodic tail across the final hold.
for(const [i,n] of [72,79,84].entries()){
 const at=29.28+i*.075,f=hz(n);
 add(detail,at,2.7,.095/(1+i*.18),(i-1)*.3,t=>attack(t,.004)*release(t,2.7,.55)*(Math.sin(TAU*f*t)*Math.exp(-t*1.7)+Math.sin(TAU*f*2.005*t)*.24*Math.exp(-t*5)+Math.sin(TAU*f*3*t)*.08*Math.exp(-t*10)),'Grifon resolution',29.28);
}
bass(29.28,36,.16,1.4);

// Short stereo early reflections retain tactile attacks. Musical dotted delay
// adds movement; the feedback loop is damped and stays behind direct sound.
function reflections(b,delays,wet,feedback){
 const original=b.map(x=>Float64Array.from(x));
 for(let ch=0;ch<2;ch++)for(const [j,seconds] of delays.entries()){
  const len=Math.round((seconds+ch*.0017)*fs),line=new Float64Array(len);let cursor=0,lp=0;
  for(let i=0;i<N;i++){const y=line[cursor];lp+=(y-lp)*.24;line[cursor]=original[ch][i]*.82+original[1-ch][i]*.18+lp*feedback;b[ch][i]+=y*wet/delays.length;cursor=(cursor+1)%len}
 }
}
reflections(music,[beat*.75,beat*1.5],.20,.27);
reflections(detail,[.021,.043,.073],.12,.31);
reflections(motion,[.037,.063],.16,.37);
const sfx=bus(),mix=bus();let peak=0;
for(let i=0;i<N;i++){
 const t=i/fs,fade=attack(t,.006)*release(t,duration,.68);
 let duck=1;for(const d of ducks){const dt=t-d.at;if(dt>=-.012&&dt<d.width)duck*=1-d.amount*Math.exp(-Math.max(0,dt)*18)}
 for(let ch=0;ch<2;ch++){
  music[ch][i]*=musicArc(t)*duck*fade;
  detail[ch][i]*=fade;motion[ch][i]*=fade;
  sfx[ch][i]=detail[ch][i]+motion[ch][i];mix[ch][i]=music[ch][i]+sfx[ch][i];
  peak=Math.max(peak,Math.abs(mix[ch][i]));
 }
}
const headroom=Math.min(1,.82/peak);
function writeWav(name,b){
 const buffer=Buffer.alloc(44+N*4);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(fs,24);buffer.writeUInt32LE(fs*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(N*4,40);
 let energy=0,pk=0;for(let i=0;i<N;i++)for(let ch=0;ch<2;ch++){const v=b[ch][i]*headroom;if(!Number.isFinite(v)||Math.abs(v)>=1)throw Error('Invalid audio');pk=Math.max(pk,Math.abs(v));energy+=v*v;buffer.writeInt16LE(Math.round(v*32767),44+(i*2+ch)*2)}
 writeFileSync(path.join(out,name),buffer);return {name,peakDBFS:20*Math.log10(pk),rmsDBFS:10*Math.log10(energy/N/2)};
}
const files=[writeWav('music-stem.wav',music),writeWav('detail-stem.wav',detail),writeWav('motion-stem.wav',motion),writeWav('sfx-stem.wav',sfx),writeWav('mix-premaster.wav',mix)];
writeFileSync(path.join(out,'cue-sheet.json'),JSON.stringify({version:6,duration,sampleRate:fs,tempo:bpm,tempoNote:'Original 105 BPM composition; reference onset analysis suggests a ~104.5 BPM pulse, not an auditory identification.',seed:9270626,provenance:'Original local synthesis; no audio samples from reference or other projects.',files,cues:cues.sort((a,b)=>a.at-b.at)},null,2)+'\n');
console.log(JSON.stringify({duration,bpm,headroom,files,cues:cues.length}));
