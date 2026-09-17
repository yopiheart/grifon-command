// Local editorial assembly. No provider calls, original edits or fabricated UI.
// node assets/hero-film/rough-cut-v3/build.mjs --runtime-root <existing npm root>
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join, resolve} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const dir=fileURLToPath(new URL('.',import.meta.url)), root=resolve(dir,'../../..');
const ri=process.argv.indexOf('--runtime-root');
const req=createRequire(join(ri<0?root:resolve(process.argv[ri+1]),'package.json'));
const sharp=req('sharp'), ffmpeg=req('ffmpeg-static');
const data=JSON.parse(readFileSync(join(dir,'timeline.json'),'utf8'));
const W=data.width,H=data.height,FPS=data.fps;
const tmp=join(dir,'.render'); mkdirSync(tmp,{recursive:true});
const font=join(root,'api/_lib/assets/fonts/Inter-Black.ttf');
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const inputPaths=[...new Set([...data.shots.filter(s=>s.source).map(s=>s.source),data.music,'public/logo.png','api/_lib/assets/fonts/Inter-Black.ttf'])];
const sources=inputPaths.map(path=>({path,sha256:hash(join(root,path))}));
const run=args=>execFileSync(ffmpeg,['-hide_banner','-nostdin','-y',...args],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
const quiet=args=>run(['-v','error',...args]);
const esc=t=>t.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const text=async(t,size,color='#FFFFFF')=>sharp({text:{text:`<span foreground="${color}">${esc(t)}</span>`,font:`Inter Black ${size}`,fontfile:font,rgba:true,dpi:72}}).png().toBuffer();
const svg=s=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${s}</svg>`);
async function centered(t,size,top,color){const b=await text(t,size,color);const m=await sharp(b).metadata();return {input:b,left:Math.round((W-m.width)/2),top};}
async function badge(s){
  const layers=[{input:svg('<rect width="960" height="42" fill="#09090B" fill-opacity=".88"/>'),left:0,top:0},
    {input:await text('ROUGH CUT 03',12,'#FFCC00'),left:22,top:14},
    {input:await text(s.label,12),left:185,top:14}];
  return sharp({create:{width:W,height:H,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
}
const codec=['-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an'];
let cursor=0;
for(const s of data.shots){
  s.start=cursor;s.end=cursor+s.seconds;cursor=s.end;
  const frames=s.seconds*FPS, overlay=join(tmp,`${s.id}-overlay.png`), clip=join(tmp,`${s.id}.mp4`);
  writeFileSync(overlay,await badge(s));
  if(s.kind==='still'){
    // Start at a full-frame fit. A maximum 2.5% center push adds editorial motion only.
    // Source dimensions exceed delivery dimensions; no generated detail or subject animation.
    const z=`1+${s.zoom-1}*(on/${frames-1})*(on/${frames-1})*(3-2*on/${frames-1})`;
    quiet(['-i',join(root,s.source),'-i',overlay,'-filter_complex',`[0:v]zoompan=z='${z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=${W}x${H}:fps=${FPS},setsar=1[base];[base][1:v]overlay=0:0[v]`,'-map','[v]','-frames:v',String(frames),...codec,clip]);
  }else if(s.kind==='video'){
    quiet(['-i',join(root,s.source),'-i',overlay,'-filter_complex',`[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x09090b,setsar=1[base];[base][1:v]overlay=0:0[v]`,'-map','[v]','-frames:v',String(frames),...codec,clip]);
  }else{
    const base=[{input:svg('<rect width="960" height="540" fill="#09090B"/><path d="M70 390H890" stroke="#303036" stroke-width="1"/>'),left:0,top:0}];
    if(s.kind==='endcard'){
      const logo=await sharp(join(root,'public/logo.png')).resize(70,70,{fit:'inside'}).png().toBuffer();
      const lm=await sharp(logo).metadata();
      base.push({input:svg('<circle cx="480" cy="180" r="49" fill="none" stroke="#FFCC00" stroke-width="1"/>'),left:0,top:0},
        {input:logo,left:Math.round((W-lm.width)/2),top:Math.round(180-lm.height/2)},await centered(s.title,48,258),await centered(s.subtitle,19,329,'#D4D4D8'));
    }else{
      base.push(await centered('FOOTAGE PENDING',14,162,'#FFCC00'),await centered(s.title,46,222),await centered(s.subtitle,20,299,'#D4D4D8'),await centered(`${s.seconds} SECOND EDIT SLOT`,12,418,'#A1A1AA'));
    }
    base.push({input:await badge(s),left:0,top:0});
    const panel=join(tmp,`${s.id}-panel.png`);
    await sharp({create:{width:W,height:H,channels:4,background:'#09090B'}}).composite(base).png().toFile(panel);
    // A gold rule separates the missing-footage label from the reserved slot length.
    const fx=s.kind==='endcard'?'null':'drawbox=x=70:y=389:w=820:h=2:color=0xFFCC00:t=fill';
    quiet(['-loop','1','-framerate',String(FPS),'-i',panel,'-vf',fx,'-frames:v',String(frames),...codec,clip]);
  }
  console.log(`Rendered ${s.id}: ${s.start}-${s.end}s ${s.kind}`);
}
if(cursor!==40) throw Error(`Unexpected duration ${cursor}`);
const inputs=data.shots.flatMap(s=>['-i',join(tmp,`${s.id}.mp4`)]);
const n=data.shots.length;
const joiner=data.shots.map((s,i)=>`[${i}:v]trim=end_frame=${s.seconds*FPS},setpts=PTS-STARTPTS[v${i}]`).join(';')+';'+data.shots.map((_,i)=>`[v${i}]`).join('')+`concat=n=${n}:v=1:a=0[v]`;
const video=join(dir,'hero-rough-cut-03.mp4');
quiet([...inputs,'-stream_loop','-1','-i',join(root,data.music),'-filter_complex',joiner+`;[${n}:a]atrim=duration=${cursor},asetpts=PTS-STARTPTS,loudnorm=I=-20:TP=-2:LRA=9,aresample=48000,afade=t=in:st=0:d=1,afade=t=out:st=37:d=3[a]`,'-map','[v]','-map','[a]','-t',String(cursor),'-r',String(FPS),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','160k','-ac','2','-movflags','+faststart',video]);
const decode=quiet(['-i',video,'-progress','pipe:1','-f','null','-']);
const frames=Number([...decode.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]);
if(frames!==cursor*FPS) throw Error(`Wrong frame count ${frames}`);
// Sample the actual encoded result, including each scene's last frame.
const cells=[];
for(const s of data.shots){
  for(const [j,t] of [s.start+.125,s.end-1/FPS].entries()){
    const p=join(tmp,`check-${s.id}-${j}.png`);
    quiet(['-ss',String(t),'-i',video,'-frames:v','1',p]);
    cells.push({input:await sharp(p).resize(480,270).png().toBuffer(),left:j*480,top:(Number(s.id)-1)*270});
  }
}
await sharp({create:{width:960,height:data.shots.length*270,channels:3,background:'#09090B'}}).composite(cells).jpeg({quality:88}).toFile(join(dir,'contact-sheet.jpg'));
quiet(['-ss','1','-i',video,'-frames:v','1',join(dir,'poster.jpg')]);
// FFmpeg diagnostics use stderr; capture the actual exit code and scan output.
const {spawnSync}=await import('node:child_process');
const scan=spawnSync(ffmpeg,['-hide_banner','-nostdin','-i',video,'-vf','blackdetect=d=0.25:pix_th=0.02:pic_th=0.98','-af','volumedetect','-f','null','-'],{encoding:'utf8',maxBuffer:4*1024*1024});
if(scan.status!==0) throw Error(scan.stderr);
writeFileSync(join(dir,'media-scan.txt'),scan.stderr.replace(/\r\n?/g,'\n').split('\n').map(line=>line.trimEnd()).join('\n'));
const black=[...scan.stderr.matchAll(/black_start:([^\n]+)/g)].map(x=>x[0]);
if(black.length) throw Error(`Unexpected black intervals: ${black}`);
const maxVolume=Number(scan.stderr.match(/max_volume: ([-\d.]+) dB/)?.[1]);
if(!Number.isFinite(maxVolume)||maxVolume>-1||maxVolume< -40) throw Error(`Invalid audio peak ${maxVolume}`);
for(const s of sources)if(hash(join(root,s.path))!==s.sha256)throw Error(`Source changed: ${s.path}`);
writeFileSync(join(dir,'verification.json'),JSON.stringify({durationSeconds:cursor,decodedFrames:frames,fps:FPS,dimensions:[W,H],fullDecodeExit:0,scanExit:scan.status,blackIntervals:black,maxVolumeDb:maxVolume,outputSha256:hash(video),sources,shots:data.shots,audio:data.musicNote,visualReview:'Contact sheet requires inspection; this script does not certify taste, readability or listening.',newGenerationCalls:0},null,2)+'\n');
console.log(`Built and decoded ${frames} frames. Audio peak ${maxVolume}dB. Original hashes preserved.`);
