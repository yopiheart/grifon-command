// Original deterministic score and cue stem. No sampled recordings or paid API.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'source');
const sr=48000,duration=30,n=sr*duration,TAU=2*Math.PI;
const music=[new Float64Array(n),new Float64Array(n)],sfx=[new Float64Array(n),new Float64Array(n)];
let seed=55109;const noise=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2147483648-1;};
const hz=m=>440*2**((m-69)/12);
function synth(stem,at,len,fn,pan=0){const off=Math.round(at*sr);for(let j=0;j<len*sr;j++){const i=off+j;if(i<0||i>=n)continue;const t=j/sr,v=fn(t,len);stem[0][i]+=v*Math.sqrt((1-pan)/2);stem[1][i]+=v*Math.sqrt((1+pan)/2);}}
function tone(at,len,m,amp,pan,pad=false){const f=hz(m);synth(music,at,len,(t,d)=>{
 const env=Math.min(1,t/(pad?.9:.004))*Math.min(1,(d-t)/(pad?1.2:.18))*(pad?1:Math.exp(-t*3.3));
 return amp*env*(Math.sin(TAU*f*t)+.2*Math.sin(TAU*f*2.001*t)+.07*Math.sin(TAU*f*3*t));
},pan);}
// D minor add9, Bbmaj7, Fadd9, Csus; high plucks, subtle bass and restrained pulse.
const chords=[[50,57,60,64],[46,53,57,60],[41,48,55,57],[48,55,58,62]];
for(let bar=0;bar<4;bar++)for(let v=0;v<4;v++)tone(bar*6.3,7.2,chords[bar][v],.034,(v-1.5)*.4,true);
for(let k=0;k<45;k++){const at=.4+k*.535714;if(at>24.5)break;const c=chords[Math.min(3,Math.floor(at/6.3))],m=c[(k*3)%4]+24;tone(at,1.2,m,.038,k%2?.45:-.45);if(k%4===0)tone(at,1.0,c[0]-12,.09,0);}
for(let k=0;k<40;k++){const at=3.5+k*.535714;if(at>24.5)break;synth(music,at,.19,t=>Math.sin(TAU*(55*t+30*.025*(1-Math.exp(-t/.025))))*.115*Math.exp(-t*27));if(k%2===1)synth(music,at,.045,t=>noise()*.014*Math.exp(-t*90),.2);}
// Leave air before the signature; no riser running across the closing words.
for(const m of [50,57,60,64,74])tone(26.05,3.9,m,.032,(m%3-1)*.3,true);
for(const [i,at] of [1.1,2.45,3.5,6.65,9.1,12.05,16.35,19.05,20,20.95,22.35,26].entries()){
 synth(sfx,at-.24,.4,(t,d)=>{const e=Math.sin(Math.PI*t/d)**3;return e*(noise()*.027+Math.sin(TAU*(160*t-75*t*t))*.045);},i%2?.3:-.3);
 synth(sfx,at,.22,t=>Math.sin(TAU*(90*t+10*.018*(1-Math.exp(-t/.018))))*.07*Math.exp(-t*26));
}
function save(name,stem){let peak=0,sum=0;for(let i=0;i<n;i++){const t=i/sr,fade=Math.min(1,t/.25,(30-t)/1.1),breath=t>24.9&&t<26?Math.max(.12,1-(t-24.9)/.55):1;for(let ch=0;ch<2;ch++){stem[ch][i]*=fade*(stem===music?breath:1);peak=Math.max(peak,Math.abs(stem[ch][i]));sum+=stem[ch][i]**2;}}
 const b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++)for(let ch=0;ch<2;ch++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,stem[ch][i]))*32767),44+i*4+ch*2);
 fs.writeFileSync(path.join(dir,name),b);return {file:name,duration,channels:2,sampleRate:sr,peakDb:20*Math.log10(peak),rmsDb:10*Math.log10(sum/(n*2))};}
const evidence={origin:'Original deterministic synthesis; no external recordings',auditoryReview:'pending',stems:[save('launch-score.wav',music),save('launch-sfx.wav',sfx)]};
fs.writeFileSync(path.join(dir,'launch-audio.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
