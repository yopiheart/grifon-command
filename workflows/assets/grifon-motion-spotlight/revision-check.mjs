// Local Hyperframes frame renders: demonstrate one copy edit stays in its beat.
import {readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import sharp from 'sharp';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'../../..');
const scratch=path.join(root,'.tmp/grifon-motion-spotlight/revision');mkdirSync(scratch,{recursive:true});
const cache=process.env.MOTION_NPM_CACHE || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(),'AppData/Local'),'npm-cache/_npx');
const modules=readdirSync(cache).map(d=>path.join(cache,d,'node_modules'));
const installed=modules.find(d=>existsSync(path.join(d,'hyperframes/package.json'))&&JSON.parse(readFileSync(path.join(d,'hyperframes/package.json'),'utf8')).version==='0.7.68');
const cli=process.env.HYPERFRAMES_CLI || (installed&&path.join(installed,'hyperframes/bin/hyperframes.mjs'));
const normal=chromium.executablePath(),shell=normal.replace(/chromium-(\d+)/,'chromium_headless_shell-$1').replace('chrome-win64','chrome-headless-shell-win64').replace(/chrome\.exe$/,'chrome-headless-shell.exe');
const browser=process.env.HYPERFRAMES_BROWSER_PATH || (existsSync(shell)?shell:normal);
if(!cli||!existsSync(cli)||!existsSync(browser))throw Error('Missing local Hyperframes/browser; see README.');
const probeFolder=modules.find(d=>existsSync(path.join(d,'ffprobe-static/bin/win32/x64/ffprobe.exe')));
const env={...process.env,HYPERFRAMES_NO_TELEMETRY:'1',HYPERFRAMES_BROWSER_PATH:browser,HYPERFRAMES_FFMPEG_PATH:path.join(root,'node_modules/ffmpeg-static/ffmpeg.exe'),HYPERFRAMES_FFPROBE_PATH:path.join(probeFolder,'ffprobe-static/bin/win32/x64/ffprobe.exe')};
function run(args){const p=spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,maxBuffer:20e6});if(p.status!==0)throw Error(p.stderr||p.stdout);}
const spec=JSON.parse(readFileSync(path.join(here,'demo.json'),'utf8'));spec.copy.opening='YOUR IDEA.';
writeFileSync(path.join(scratch,'revision.json'),JSON.stringify(spec));
run([path.join(here,'build.mjs'),path.join(scratch,'revision.json'),scratch]);
const times=[1.5,10,19,22,24.9],results=[];
// Preserve the same seek sequence as the baseline snapshot command.
const captureTimes=[1.5,3.5,6.7,7.8,10,14,16.4,17.3,19,20.7,22,24.9];
function difference(a,b){
 if(a.length!==b.length)throw Error('Frame dimensions changed');
 let max=0,sum=0,changedChannels=0;
 for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;if(d)changedChannels++;}
 return {maxChannelDifference:max,meanAbsoluteChannelDifference:sum/a.length,changedChannels,pixelIdentical:changedChannels===0};
}
// Keep the existing conservative sample-comparison limits; report actual
// differences in the JSON. A bounded comparison is not a blanket pixel-identity claim.
// Larger differences fail rather than being attributed to render noise.
const materiallyUnchanged=m=>m.maxChannelDifference<=1&&m.meanAbsoluteChannelDifference<=.02;
for(const format of ['portrait','landscape']){
 const output=path.join(scratch,format+'-frames');
 run([cli,'snapshot',path.join(scratch,format),'--at',captureTimes.join(','),'--describe','false','--output',output]);
 for(const time of times){
  const originalFolder=path.join(here,'qa',format+'-frames');
  const find=folder=>path.join(folder,`frame-${String(captureTimes.indexOf(time)).padStart(2,'0')}-at-${time}s.png`);
  const a=await sharp(find(originalFolder)).removeAlpha().raw().toBuffer();
  const b=await sharp(find(output)).removeAlpha().raw().toBuffer();
  const diff=difference(a,b);
  if(time===1.5 ? diff.maxChannelDifference<100||diff.changedChannels<1000 : !materiallyUnchanged(diff))throw Error(`${format}: wrong revision difference at ${time}s: ${JSON.stringify(diff)}`);
  results.push({format,time,expectedTextChange:time===1.5,...diff});
 }
}
// Negative control: an unintended later-beat text edit must be rejected.
const bad=JSON.parse(readFileSync(path.join(here,'demo.json'),'utf8'));bad.copy.payoff='BROKEN';
const badRoot=path.join(scratch,'negative-control');mkdirSync(badRoot,{recursive:true});
writeFileSync(path.join(badRoot,'bad.json'),JSON.stringify(bad));
run([path.join(here,'build.mjs'),path.join(badRoot,'bad.json'),badRoot]);
run([cli,'snapshot',path.join(badRoot,'portrait'),'--at','19','--describe','false','--output',path.join(badRoot,'frames')]);
const negative=difference(await sharp(path.join(here,'qa/portrait-frames/frame-08-at-19s.png')).removeAlpha().raw().toBuffer(),await sharp(path.join(badRoot,'frames/frame-00-at-19s.png')).removeAlpha().raw().toBuffer());
if(materiallyUnchanged(negative))throw Error('Unintended later-beat edit was not detected');
writeFileSync(path.join(here,'qa/revision-check.json'),JSON.stringify({pass:true,edit:'YOUR PRODUCT. -> YOUR IDEA.',method:'Hyperframes snapshots; bounded RGB comparison, not pixel-identical claim',unchangedLimits:{maxChannelDifference:1,meanAbsoluteChannelDifference:.02},results,negativeControl:{edit:'THE SPOTLIGHT. -> BROKEN',rejected:true,...negative}},null,2)+'\n');
console.log('PASS: only opening text materially changes; later frames meet recorded RGB limits; unintended later-beat edit rejected.');
