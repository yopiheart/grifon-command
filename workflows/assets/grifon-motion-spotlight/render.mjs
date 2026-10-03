// Uses the pinned CLI from the existing npm cache; never installs or calls cloud.
import { existsSync, readdirSync, readFileSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const cache = process.env.MOTION_NPM_CACHE || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'npm-cache/_npx');
const cached = existsSync(cache) ? readdirSync(cache).map(dir => path.join(cache, dir, 'node_modules')) : [];
const hfPackage = cached.find(dir => {
  const pkg = path.join(dir, 'hyperframes/package.json');
  return existsSync(pkg) && JSON.parse(readFileSync(pkg, 'utf8')).version === '0.7.68';
});
const cli = process.env.HYPERFRAMES_CLI || (hfPackage && path.join(hfPackage, 'hyperframes/bin/hyperframes.mjs'));
const ffmpeg = process.env.HYPERFRAMES_FFMPEG_PATH || path.join(root, 'node_modules/ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
const probeFolder = cached.find(dir => existsSync(path.join(dir, 'ffprobe-static/bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')));
const ffprobe = process.env.HYPERFRAMES_FFPROBE_PATH || (probeFolder && path.join(probeFolder, 'ffprobe-static/bin', process.platform, process.arch, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'));
const chromePath = chromium.executablePath();
const headlessPath = chromePath.replace(/chromium-(\d+)/, 'chromium_headless_shell-$1').replace('chrome-win64', 'chrome-headless-shell-win64').replace(/chrome\.exe$/, 'chrome-headless-shell.exe');
const browser = process.env.HYPERFRAMES_BROWSER_PATH || (existsSync(headlessPath) ? headlessPath : chromePath);
for (const [name, value] of Object.entries({cli, ffmpeg, ffprobe, browser})) {
  if (!value || !existsSync(value)) throw new Error(`Missing ${name}; see README setup. No automatic install or cloud fallback.`);
}
const env = { ...process.env, HYPERFRAMES_NO_TELEMETRY:'1', HYPERFRAMES_BROWSER_PATH:browser,
  HYPERFRAMES_FFMPEG_PATH:ffmpeg, HYPERFRAMES_FFPROBE_PATH:ffprobe };
const task = process.argv[2] || 'check';
const formats = process.argv[3] ? [process.argv[3]] : ['portrait','landscape'];
if (!['check','render','finish','snapshot'].includes(task) || formats.some(x=>!['portrait','landscape'].includes(x))) throw new Error('Usage: node render.mjs check|render|finish|snapshot [portrait|landscape]');
const scratch = path.join(root, '.tmp/grifon-motion-spotlight');
mkdirSync(scratch,{recursive:true});
mkdirSync(path.join(here,'qa'),{recursive:true});
function run(exe,args,log) {
  const result = spawnSync(exe,args,{env,cwd:root,encoding:'utf8',maxBuffer:20*1024*1024,windowsHide:true});
  if(log) writeFileSync(log,(result.stdout || '')+(result.stderr || ''));
  if(result.error || result.status!==0) throw new Error(`${path.basename(exe)} exited ${result.status}: ${result.error || result.stderr || result.stdout}`);
  return result.stdout;
}
for(const format of formats) {
  const project=path.join(here,format);
  console.log(`${task}: ${format}`);
  if(task==='check') {
    run(process.execPath,[cli,'check',project,'--json','--at','0.8,2.5,5.2,6.7,7.5,10,14,16.6,17.2,19,20.7,22,24.95','--at-transitions'],path.join(here,'qa',`${format}-hyperframes.json`));
  } else if(task==='snapshot') {
    run(process.execPath,[cli,'snapshot',project,'--at','1.5,3.5,6.7,7.8,10,14,16.4,17.3,19,20.7,22,24.9','--describe','false','--output',path.join(here,'qa',`${format}-frames`)],path.join(scratch,`${format}-snapshot.log`));
  } else {
    const silent=path.join(scratch,`${format}-silent.mp4`);
    if(task==='render')run(process.execPath,[cli,'render',project,'--fps','24','--workers','2','--quality','high','--output',silent],path.join(scratch,`${format}-render.log`));
    const output=path.join(scratch,`${format}-finished.mp4`);
    run(ffmpeg,['-y','-i',silent,'-i',path.join(root,'api/_lib/assets/music/testimonial.mp3'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af','atrim=duration=25,asetpts=PTS-STARTPTS,loudnorm=I=-14:TP=-2:LRA=11,aresample=48000,aformat=channel_layouts=stereo,alimiter=limit=0.707946:level=false,afade=t=in:st=0:d=0.35,afade=t=out:st=23.8:d=1.2','-c:a','aac','-b:a','192k','-ar','48000','-t','25','-movflags','+faststart',output],path.join(scratch,`${format}-audio.log`));
    const info=run(ffprobe,['-v','error','-count_frames','-show_streams','-show_format','-of','json',output]);
    writeFileSync(path.join(here,'qa',`${format}-media.json`),info);
    run(ffmpeg,['-v','error','-i',output,'-f','null','-']);
    const parsed=JSON.parse(info);const video=parsed.streams.find(s=>s.codec_type==='video');
    const audio=parsed.streams.find(s=>s.codec_type==='audio');
    const expected=format==='portrait'?[1080,1920]:[1920,1080];
    if(video.width!==expected[0] || video.height!==expected[1] || video.nb_read_frames!=='600' || video.r_frame_rate!=='24/1' || !audio || Math.abs(Number(parsed.format.duration)-25)>.05) throw new Error(`Media contract failed: ${format}`);
    copyFileSync(output,path.join(here,`${format}.mp4`));
    console.log(`${format}: 600 frames, 25s, ${video.width}x${video.height}, audio present, full decode passed`);
  }
}
