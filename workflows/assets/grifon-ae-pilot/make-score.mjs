// Original understated score, composed procedurally. No external audio or API.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.join(path.dirname(fileURLToPath(import.meta.url)),'source');
const sr=48000,n=sr*30,L=new Float64Array(n),R=new Float64Array(n);
const hz=m=>440*2**((m-69)/12),tau=2*Math.PI;
function note(at,dur,m,amp,pan=0,pad=false){
  const start=Math.floor(at*sr),len=Math.floor(dur*sr),f=hz(m);
  for(let j=0;j<len && start+j<n;j++){
    const t=j/sr,fade=Math.min(1,t/(pad?1.4:.012))*Math.min(1,(dur-t)/(pad?1.4:.25));
    const env=fade*(pad?1:Math.exp(-t*2.5));
    const wave=pad?(Math.sin(tau*f*t)+.35*Math.sin(tau*f*1.002*t)+.15*Math.sin(tau*f*2*t))/1.5:
      (Math.sin(tau*f*t)+.18*Math.sin(tau*f*2*t)*Math.exp(-t*4));
    const v=wave*env*amp; L[start+j]+=v*Math.sqrt((1-pan)/2);R[start+j]+=v*Math.sqrt((1+pan)/2);
    if(!pad){for(const [delay,gain] of [[.375,.24],[.75,.12],[1.125,.06]]){
      const k=start+j+Math.round(sr*delay); if(k<n){L[k]+=v*gain*Math.sqrt((1+pan)/2);R[k]+=v*gain*Math.sqrt((1-pan)/2);}
    }}
  }
}
// Dmaj9 -> Bm7 -> Gmaj9 -> Asus, with a quiet resolution on the brand.
const chords=[[50,57,61,64],[47,54,57,62],[43,50,57,59],[45,52,57,62],[50,57,61,64]];
for(let c=0;c<5;c++)for(let j=0;j<4;j++)note(c*6,7,chords[c][j],.028,(j-1.5)*.3,true);
const seq=[74,78,81,76,74,81,78,73];
for(let k=0;k<35;k++)note(1+k*.75,2.3,seq[k%8],k<7?.035:.048,Math.sin(k)*.55);
note(25.4,4.5,86,.06,.1);note(25.4,4.5,74,.065,-.1);
function wav(name,l,r){
 let peak=0;for(let i=0;i<n;i++){const f=Math.min(1,i/(sr*.7),(n-i)/(sr*1.1));l[i]*=f;r[i]*=f;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));}
 const b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(sr,24);b.writeUInt32LE(sr*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,l[i]))*32767),44+i*4);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,r[i]))*32767),46+i*4);}
 fs.writeFileSync(path.join(dir,name),b);console.log(name+': 30s stereo, peak '+(20*Math.log10(peak)).toFixed(1)+' dBFS');
}
wav('direction-score.wav',L,R);
const sl=new Float64Array(n),ss=new Float64Array(n);let seed=137;
for(const at of [2.6,5,8.4,12.4,16.4,21.4,25.4]){
 for(let j=0;j<sr*.65;j++){
  const t=j/sr;seed=(1664525*seed+1013904223)>>>0;
  const env=Math.sin(Math.PI*t/.65)**3;
  const v=((seed/4294967296-.5)*.012+Math.sin(tau*(180*t+100*t*t))*.027)*env;
  const i=Math.floor((at-.25)*sr)+j;if(i>=0&&i<n){sl[i]+=v;ss[i]+=v;}
 }
}
wav('direction-transitions.wav',sl,ss);
