// Local silent storyboard timing pass. No generation services or Blender calls.
// Run after build-hero-film-storyboard.mjs. Optional --runtime-root points to an
// existing root npm installation supplying sharp and ffmpeg-static.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../', import.meta.url));
const arg = process.argv.indexOf('--runtime-root');
const runtime = arg < 0 ? root : resolve(process.argv[arg + 1]);
const require = createRequire(join(runtime, 'package.json'));
const sharp = require('sharp');
const ffmpeg = require('ffmpeg-static');
const data = JSON.parse(readFileSync(join(root,'tools/artifacts/data/hero-film-storyboard.json'),'utf8'));
const html = readFileSync(join(root,'artifacts/grifon-hero-film-storyboard.html'),'utf8');
const drawings = [...html.matchAll(/<svg viewBox="0 0 560 265"[^>]*>([\s\S]*?)<\/svg>/g)].map(m => m[1]);
if (drawings.length !== 6 || data.panels.length !== 6) throw new Error('Expected exactly six storyboard panels');
const timings = [6,7,7,8,7,5];
const lines = [
  ['One owner. One bottled coffee.','A simple product photo starts the journey.'],
  ['The same photo and business brief','enter the real Grifon controls.'],
  ['Read the actual ad plan.','Gold ribbons open the living studio.'],
  ['HOLD FOR ACTUAL UGC EXPORT','Original voice. Same coffee. Paid-plan output.'],
  ['HOLD FOR ACTUAL CINEMATIC EXPORT','Same coffee. Original Grifon footage.'],
  ['Owner reviews both results.','Build my free ad plan.']
];
const cues = ['Room tone / bottle contact / shutter','Tactile input / quiet pulse / edited wait','Pulse grows / soft studio reveal accent','Original export voice leads / score ducks','Export sound / restrained score if suitable','Room tone returns / gentle musical resolution'];
const esc = s => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const wrap = (s, max=35) => s.split(' ').reduce((rows,w) => {
  if (!rows.length || (rows.at(-1)+' '+w).length>max) rows.push(w);
  else rows[rows.length-1]+=' '+w;
  return rows;
},[]);
const out = join(root,'assets/hero-film/storyboard-animatic');
mkdirSync(out,{recursive:true});
let elapsed=0;
for (let i=0;i<6;i++) {
  const end=elapsed+timings[i];
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><defs><radialGradient id="bg"><stop stop-color="#202024"/><stop offset="1" stop-color="#09090b"/></radialGradient></defs><rect width="1280" height="720" fill="url(#bg)"/><g font-family="Arial,sans-serif"><text x="60" y="48" fill="#ffcc00" font-size="19">GRIFON / ROUGH STORYBOARD CUT / ${elapsed}-${end}s</text><text x="60" y="81" fill="#d4d4d8" font-size="19">${esc(data.panels[i].act)} / Panel ${i+1} of 6</text><text x="1220" y="48" text-anchor="end" fill="#ff8563" font-size="19">SILENT TIMING PASS</text><g transform="translate(360 93)">${drawings[i]}</g><text x="640" y="397" text-anchor="middle" fill="#f5f5f7" font-size="34" font-weight="bold">${esc(data.panels[i].title)}</text>${lines[i].map((l,n)=>`<text x="640" y="${445+n*39}" text-anchor="middle" fill="${i===3||i===4?'#ffcc00':'#d4d4d8'}" font-size="29">${esc(l)}</text>`).join('')}<text x="640" y="538" text-anchor="middle" fill="#c4c4cb" font-size="19">${i===5?'One free ad-plan preview/month. No card. Finished videos require a paid plan.':'DIAGRAM PLACEHOLDER / no completed footage or functioning interface shown'}</text><path d="M60 571h1160" stroke="#484438"/><text x="60" y="611" fill="#d4d4d8" font-size="20">SOUND INTENT ONLY: ${esc(cues[i])}</text><text x="60" y="655" fill="#9a9aa3" font-size="19">40s editorial hypothesis / hard cuts / timing and sound not locked / no audio track</text><rect x="60" y="684" width="1160" height="4" fill="#34343a"/><rect x="60" y="684" width="${1160*end/40}" height="4" fill="#ffcc00"/></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(out,`panel-${i+1}.png`));
  const mobileLines = lines[i].flatMap(l => wrap(l,27));
  const mobile = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><rect width="720" height="1280" fill="#09090b"/><g font-family="Arial,sans-serif"><text x="40" y="63" fill="#ffcc00" font-size="28">GRIFON / STORYBOARD / ${elapsed}-${end}s</text><text x="40" y="108" fill="#ff8563" font-size="28">SILENT / DIAGRAMS ONLY / ${i+1} OF 6</text><g transform="translate(80 140)">${drawings[i]}</g>${wrap(data.panels[i].title,27).map((l,n)=>`<text x="40" y="${455+n*49}" fill="#f5f5f7" font-size="40" font-weight="bold">${esc(l)}</text>`).join('')}${mobileLines.map((l,n)=>`<text x="40" y="${580+n*47}" fill="#ffcc00" font-size="36">${esc(l)}</text>`).join('')}<path d="M40 805h640" stroke="#484438"/><text x="40" y="852" fill="#d4d4d8" font-size="28">SOUND INTENT / no audio recorded</text>${wrap(cues[i],36).map((l,n)=>`<text x="40" y="${897+n*40}" fill="#d4d4d8" font-size="29">${esc(l)}</text>`).join('')}${wrap(i===5?'One free ad-plan preview/month. No card required. Finished videos require a paid plan.':'Planned imagery only. Real Grifon ad exports have not been generated.',37).map((l,n)=>`<text x="40" y="${1050+n*38}" fill="#d4d4d8" font-size="28">${esc(l)}</text>`).join('')}<text x="40" y="1210" fill="#9a9aa3" font-size="26">40s provisional pacing / mobile review</text><rect x="40" y="1240" width="640" height="4" fill="#34343a"/><rect x="40" y="1240" width="${640*end/40}" height="4" fill="#ffcc00"/></g></svg>`;
  await sharp(Buffer.from(mobile)).png().toFile(join(out,`mobile-panel-${i+1}.png`));
  elapsed=end;
}
for (const prefix of ['', 'mobile-']) {
  const inputs = timings.flatMap((_,i)=>['-loop','1','-framerate','24','-i',join(out,`${prefix}panel-${i+1}.png`)]);
  const trim = timings.map((s,i)=>`[${i}:v]trim=end_frame=${s*24},setpts=PTS-STARTPTS[v${i}]`).join(';');
  const filter = trim+';'+timings.map((_,i)=>`[v${i}]`).join('')+'concat=n=6:v=1:a=0[out]';
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y',...inputs,'-filter_complex',filter,'-map','[out]','-frames:v','960','-r','24','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','-an',join(out,`${prefix}rough-cut.mp4`)],{stdio:'inherit'});
}
writeFileSync(join(out,'timing.json'),JSON.stringify({durationSeconds:40,fps:24,resolution:[1280,720],audio:'none; written sound intent only',transition:'hard cuts',status:'Provisional editorial pacing hypothesis, not passed audiovisual analysis or finished film',panels:timings.map((durationSeconds,i)=>({panel:i+1,durationSeconds,title:data.panels[i].title}))},null,2)+'\n');
console.log(join(out,'rough-cut.mp4'));
