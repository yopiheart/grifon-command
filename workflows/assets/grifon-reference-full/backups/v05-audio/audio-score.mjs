// Original score and sound design for this composition. No sampled audio.
// Run with Node; all cue times are absolute seconds on the approved V04 picture.
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const out=path.join(root,'assets/audio');mkdirSync(out,{recursive:true});
const rate=48000,duration=32.9,length=Math.round(rate*duration),tau=2*Math.PI;
const music=[new Float64Array(length),new Float64Array(length)];
const effects=[new Float64Array(length),new Float64Array(length)];
const cues=[];
let seed=27192026;
function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296*2-1;}
const hz=n=>440*2**((n-69)/12);
const clamp=n=>Math.max(0,Math.min(1,n));
const attack=(t,a)=>Math.sin(clamp(t/a)*Math.PI/2)**2;
const release=(t,d,r)=>Math.sin(clamp((d-t)/r)*Math.PI/2)**2;
function voice(bus,at,dur,amp,pan,sample,label){
 const start=Math.round(at*rate),end=Math.min(length,start+Math.round(dur*rate));
 const l=Math.cos((pan+1)*Math.PI/4)*amp,r=Math.sin((pan+1)*Math.PI/4)*amp;
 for(let i=Math.max(0,start);i<end;i++){
  const t=(i-start)/rate,v=sample(t,(i-start)/(end-start));
  bus[0][i]+=v*l;bus[1][i]+=v*r;
 }
 if(label)cues.push({time:at,duration:dur,level:amp,pan,label,bus:bus===music?'music':'sfx'});
}
function note(bus,at,n,dur,amp,pan=0,kind='felt'){
 const f=hz(n);
 if(kind==='pad'){
  // Smooth detuned harmonic voices, with slow breathing and no hard note edge.
  voice(bus,at,dur,amp,pan,t=>{
   const env=attack(t,.8)*release(t,dur,1.25),a=tau*f*t;
   return env*(Math.sin(a+Math.sin(t*.8)*.16)*.56+Math.sin(a*1.0014+.7)*.2+Math.sin(a*.9987+1.3)*.17+Math.sin(a*2+.4)*.075+Math.sin(a*3)*.025)*(.91+.09*Math.sin(t*1.2));
  });
 }else if(kind==='bass'){
  voice(bus,at,dur,amp,pan,t=>attack(t,.018)*release(t,dur,.13)*Math.exp(-t*1.3)*(Math.sin(tau*f*t)+.18*Math.sin(tau*f*2*t)));
 }else{
  const decay=kind==='bell'?1.5:.72;
  voice(bus,at,dur,amp,pan,t=>{
   const env=attack(t,.006)*release(t,dur,.18),a=tau*f*t;
   return env*(Math.sin(a+.6*Math.sin(a*2.002)*Math.exp(-t*6))*Math.exp(-t/decay)*.7+Math.sin(a*2.005)*Math.exp(-t/.25)*.15+Math.sin(a*3.01+.2)*Math.exp(-t/.12)*.055);
  });
 }
}
function tap(at,amp=.055,pan=0,label='soft tactile click'){
 const f=900+random()*210;
 voice(effects,at,.07,amp,pan,t=>attack(t,.0008)*release(t,.07,.012)*(random()*.38*Math.exp(-t*230)+Math.sin(tau*f*t)*.62*Math.exp(-t*140)),label);
}
function sweep(at,dur,amp,pan,label,reverse=false){
 let slow=0,fast=0;
 voice(effects,at,dur,amp,pan,(t,p)=>{
  const a=reverse?1-p:p,noise=random();
  slow+=(noise-slow)*.012;fast+=(noise-fast)*(.035+.25*Math.sin(a*Math.PI)**2);
  const env=Math.sin(Math.PI*p)**2;
  return (fast-slow)*env+Math.sin(tau*(115*t+95*t*t/dur))*.05*env;
 },label);
}
function thump(at,amp=.11,pan=0,label='rounded landing'){
 voice(effects,at,.34,amp,pan,t=>attack(t,.003)*release(t,.34,.1)*Math.exp(-t*16)*Math.sin(tau*(55*t+75*(1-Math.exp(-t*24))/24)),label);
}
function kick(at,amp){
 voice(music,at,.38,amp,0,t=>attack(t,.0015)*release(t,.38,.1)*Math.exp(-t*13)*Math.sin(tau*(47*t+88*(1-Math.exp(-t*30))/30)));
}
function hat(at,amp,pan){
 let low=0;
 voice(music,at,.085,amp,pan,t=>{const v=random();low+=(v-low)*.32;return (v-low)*Math.exp(-t*70)*attack(t,.002)*release(t,.085,.02);});
}

// Harmonic arc: E minor 9 -> C major 9 -> G major 9, with a suspended bridge.
const harmony=[
 {at:0,dur:5.9,notes:[52,59,62,66],root:40},
 {at:5.35,dur:3.65,notes:[48,55,59,62],root:36},
 {at:8.35,dur:5.2,notes:[55,62,66,69],root:43},
 {at:12.7,dur:5.5,notes:[50,57,62,64],root:38},
 {at:17.1,dur:5.9,notes:[48,55,59,62],root:36},
 {at:22.5,dur:4.9,notes:[52,59,62,66],root:40},
 {at:26.55,dur:6.35,notes:[55,59,62,69],root:43}
];
for(const chord of harmony){
 chord.notes.forEach((n,i)=>note(music,chord.at,n,chord.dur,.055,[-.65,.4,-.25,.7][i],'pad'));
 cues.push({time:chord.at,duration:chord.dur,label:'harmonic bed',midi:chord.notes,bus:'music'});
}
const chordAt=t=>harmony.findLast(c=>t>=c.at)||harmony[0];
// A soft 80-BPM pulse supports the three approximately three-second hero beats.
for(let i=0;i<28;i++){
 const t=2.63+i*.375;if(t>12.55)break;const c=chordAt(t),n=c.notes[[1,2,3,2,1,3,2,0][i%8]]+12;
 note(music,t,n,.95,i%4===0?.049:.030,Math.sin(i*1.7)*.45);
 if(i%2===0){kick(t,i%8===0?.105:.067);note(music,t,c.root,.58,.093,0,'bass');}
 if(i%2===1)hat(t,.017,(i%4===1?-.4:.4));
}
// Give the warm transition and luminous sphere room instead of filling every cut.
note(music,14.27,76,3.1,.071,-.2,'bell');
note(music,14.44,83,2.7,.044,.28,'bell');
note(music,15.04,78,2.4,.034,-.3,'bell');
for(let i=0;i<8;i++){
 const t=17.65+i*.64;
 note(music,t,[67,71,74,78,74,71,67,74][i],1.4,.027,Math.sin(i)*.45);
}
for(let i=0;i<17;i++){
 const t=22.8+i*.375;if(t>=29.1)break;
 const c=chordAt(t);note(music,t,c.notes[[1,3,2,1][i%4]]+12,1.15,i%4===0?.050:.032,Math.sin(i*1.4)*.5);
 if(i%2===0){kick(t,.065);note(music,t,c.root,.65,.088,0,'bass');}
 if(i%4===3)hat(t,.014,.35);
}

// Picture-locked SFX. Deliberate holds are allowed to stay quiet.
for(let i=0;i<12;i++)tap(.08+i*(.82/11),.046+(i%3)*.006,(i-5.5)*.025,'opening keystroke');
for(const [t,name] of [[1.13,'product collage'],[4.24,'story collage'],[7.23,'business collage']]){
 sweep(t-.06,.36,.15,-.22,`${name}: paper glide`);
 for(let i=0;i<4;i++)tap(t+[0,.12,.26,.45][i],.042,(i-1.5)*.17,`${name}: word`);
}
for(const [t,name] of [[2.63,'camera'],[5.65,'phone'],[8.61,'laptop']]){
 sweep(t-.28,.79,.22,.3,`${name}: approaching turn`);
 thump(t+.24,.12,-.05,`${name}: weight`);
 sweep(t+.38,.62,.069,-.3,`${name}: turn tail`);
}
for(const t of [10.2,10.41,10.62,10.83,11.04])tap(t,.038,-.18,'problem phrase');
sweep(12.62,.64,.19,-.15,'warm reveal inhale',true);
thump(13.12,.12,0,'warm reveal release');
sweep(13.55,.8,.105,.1,'sphere contraction');
thump(14.27,.16,0,'sphere bloom');
note(effects,14.28,88,2.5,.042,.5,'bell');
for(const [at,n,pan] of [[17.65,79,-.3],[18.86,83,.3],[20.8,86,-.25]]){
 tap(at,.04,pan,'message arrival');note(effects,at+.025,n,.8,.038,pan,'felt');
 cues.push({time:at,duration:.8,label:'glass message accent',bus:'sfx'});
}
for(const t of [22.8,23.03,23.33,23.74,24.08])tap(t,.033,0,'closing phrase');
sweep(25.3,.88,.105,-.35,'outline trace');
for(const [t,pan] of [[26.82,0],[27.05,-.6],[27.1,.6]]){
 sweep(t-.12,.4,.10,pan,'workflow card glide');thump(t+.07,.075,pan,'workflow card landing');
}
sweep(28.87,.47,.22,-.1,'strip to brand');
thump(29.28,.13,0,'brand landing');
for(const [at,n,amp,pan] of [[29.28,74,.075,-.3],[29.4,79,.061,.12],[29.59,83,.047,.4]]){
 note(effects,at,n,2.85,amp,pan,'bell');cues.push({time:at,duration:2.85,label:'Grifon three-note signature',midi:n,bus:'sfx'});
}
note(music,29.28,43,2.4,.12,0,'bass');

function space(bus,wet){
 // Four damped combs per channel. Stereo offsets keep the tail diffuse.
 const source=bus.map(c=>Float64Array.from(c));
 for(let ch=0;ch<2;ch++){
  for(const [j,seconds] of [.0297,.0371,.0411,.0437].entries()){
   const delay=Math.round((seconds+ch*.0013)*rate),line=new Float64Array(delay);let cursor=0,lp=0;
   for(let i=0;i<length;i++){
    const delayed=line[cursor];lp+=(delayed-lp)*.36;
    line[cursor]=(source[ch][i]*.78+source[1-ch][i]*.22)+lp*(.78+j*.017);
    bus[ch][i]+=delayed*wet/4;cursor=(cursor+1)%delay;
   }
  }
 }
}
space(music,.34);space(effects,.24);
const mix=[new Float64Array(length),new Float64Array(length)];
for(let i=0;i<length;i++){
 const t=i/rate,fade=attack(t,.018)*release(t,duration,.72);
 for(let ch=0;ch<2;ch++){
  music[ch][i]*=fade;effects[ch][i]*=fade;
  mix[ch][i]=music[ch][i]+effects[ch][i];
 }
}
function wav(file,bus){
 const data=Buffer.alloc(44+length*4);data.write('RIFF');data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*4,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(length*4,40);
 let peak=0,energy=0;
 for(let i=0;i<length;i++)for(let ch=0;ch<2;ch++){const v=bus[ch][i];peak=Math.max(peak,Math.abs(v));energy+=v*v;if(Math.abs(v)>=1)throw Error(`Clipping in ${file}`);data.writeInt16LE(Math.round(v*32767),44+(i*2+ch)*2);}
 writeFileSync(path.join(out,file),data);return {file,peakDb:20*Math.log10(peak),rmsDb:10*Math.log10(energy/(length*2)),frames:length};
}
const files=[wav('music-stem.wav',music),wav('sfx-stem.wav',effects),wav('mix-premaster.wav',mix)];
const manifest={title:'Your Next Ad - original sound pass',version:1,duration,sampleRate:rate,channels:2,tempo:80,seed:27192026,source:'Local deterministic synthesis; no external samples, no AI provider calls.',pictureSha256:'1cb32367d0aeff59cc4d6aacefa9fbabda12a070a669cb1be833414d244a2bd2',files,cues:cues.sort((a,b)=>a.time-b.time)};
writeFileSync(path.join(out,'cue-sheet.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({duration,files,cueCount:cues.length}));
