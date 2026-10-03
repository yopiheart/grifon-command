import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const workspaceDir = process.cwd();
const profileDir = path.join(workspaceDir, 'clients/oceanides/company-profile');
const buildDir = path.join(workspaceDir, '.tmp/oceanides-meeting');
const verification = JSON.parse(await fs.readFile(path.join(buildDir, 'meeting-verification.json'), 'utf8'));
const images = [];
for (let i = 1; i <= 9; i++) images.push('data:image/png;base64,' + (await fs.readFile(path.join(buildDir, `slide-${i}.png`))).toString('base64'));
const videoBytes = await fs.readFile(verification.videoPath);
if (crypto.createHash('sha256').update(videoBytes).digest('hex') !== verification.videoSha256) throw new Error('Movie changed after deck verification.');
const titles = ['Company profile', 'Services', 'Siphoning and plumbing', 'Actual siphoning work', 'Renovation and restoration', 'Pest control', 'Sewage treatment plant', 'STP film', 'Site assessment and quotation'];
const videoData = 'data:video/mp4;base64,' + videoBytes.toString('base64');
const previewPath = path.join(profileDir, 'output/html/Oceanides-Company-Profile-STP-Meeting-Review.html');
await fs.mkdir(path.dirname(previewPath), { recursive: true });
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<title>Oceanides company profile and STP film</title><style>
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;background:#0A1F45;color:#F7F7F2;font-family:Arial,sans-serif}body{display:grid;grid-template-rows:minmax(0,1fr) 64px}main{display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden}#canvas{position:relative;aspect-ratio:16/9;width:min(100vw,calc((100dvh - 64px)*16/9));max-height:100%;background:#F7F7F2}#slide,#film{display:block;width:100%;height:100%;object-fit:contain}#film[hidden],#slide[hidden]{display:none}nav{display:flex;align-items:center;justify-content:center;gap:16px;padding:8px 16px}button{font:inherit;font-size:14px;cursor:pointer;background:none;border:1px solid #517091;color:#F7F7F2;border-radius:6px;min-height:44px;padding:8px 16px}button:hover{background:#1C3C61}button:disabled{opacity:.35;cursor:default}button:focus-visible{outline:2px solid #8FB3DD;outline-offset:3px}#counter{font-size:14px;min-width:42px;text-align:center}#topic{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}@media(max-width:600px){nav{gap:10px}button{padding:8px 12px}}@media print{body{display:block;background:white}nav{display:none}}
</style></head><body><main><div id="canvas"><img id="slide" alt=""><video id="film" controls playsinline preload="metadata" hidden poster="${images[7]}" aria-label="Oceanides on-site STP film"></video><span id="topic" aria-live="polite"></span></div></main>
<nav aria-label="Presentation controls"><button id="previous" aria-label="Previous slide">Previous</button><span id="counter"></span><button id="next" aria-label="Next slide">Next</button><button id="fullscreen" aria-label="Fullscreen presentation">Fullscreen</button></nav>
<script>
const images=${JSON.stringify(images)};
const titles=${JSON.stringify(titles)};
const videoSource=${JSON.stringify(videoData)};
const slide=document.getElementById('slide'),film=document.getElementById('film'),counter=document.getElementById('counter'),topic=document.getElementById('topic');
let current=0;
function show(index){film.pause();current=Math.max(0,Math.min(8,index));const isFilm=current===7;slide.hidden=isFilm;film.hidden=!isFilm;if(isFilm){if(!film.src)film.src=videoSource;}else{slide.src=images[current];slide.alt=titles[current];}counter.textContent=(current+1)+' / 9';topic.textContent=titles[current];document.getElementById('previous').disabled=current===0;document.getElementById('next').disabled=current===8;}
document.getElementById('previous').onclick=()=>show(current-1);
document.getElementById('next').onclick=()=>show(current+1);
document.getElementById('fullscreen').onclick=async()=>{if(document.fullscreenElement){await document.exitFullscreen();}else{await document.documentElement.requestFullscreen();}};
film.addEventListener('ended',()=>show(8));
document.addEventListener('keydown',event=>{if(event.target===film)return;if(['ArrowRight','PageDown'].includes(event.key)){event.preventDefault();show(current+1);}if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();show(current-1);}if(event.key==='Home'){event.preventDefault();show(0);}if(event.key==='End'){event.preventDefault();show(8);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)film.pause();});
show(0);
</script></body></html>`;
await fs.writeFile(previewPath, html);
console.log(JSON.stringify({ previewPath, byteCount: Buffer.byteLength(html), videoSha256: verification.videoSha256, selfContained: true }));
