import { clamp, actionMap, actionProgress, cueManifest } from '../grifon-motion-action-pilot/action-spec.mjs';
import { validateLaunchSpec } from './launch-contract.mjs';
const root = document.getElementById('root');
const ids = ['shader-background','material-wash','contour-field','opening-scene','opening-copy','fragment-field','fragment-grid','opening-rule','opening-signal','intent-scene','cream-field','orb-world','orb-ring','orb-glint','orb-shadow','intent-copy','intent-rule','workflow-scene','workflow-copy','workflow-title','workflow-detail','workflow-panel','workflow-track','workflow-signal','panel-sheen','screen-scene','screen-copy','screen-disclosure','screen-panel','direction-scene','direction-copy','direction-field','finish-scene','finish-light','brand','brand-word','brand-url'];
const elements = Object.fromEntries(ids.map(id => [id,document.getElementById(id)]));
const tracks = [...document.querySelectorAll('.track-step')];
const captures = [...document.querySelectorAll('.product-capture')];
const format = new URLSearchParams(location.search).get('format') || 'landscape';
const portrait = format === 'portrait';
const mix = (a,b,p) => a+(b-a)*p;
const style = (id,values) => Object.assign(elements[id].style,values);
const lines = (id,text,parts) => { const el=elements[id]; el.replaceChildren(); for(const part of parts){ const span=document.createElement('span');span.className='line';span.textContent=part;el.append(span); } el.setAttribute('aria-label',text); };
let spec,actions,materials,ready;
let seekQueue=Promise.resolve();
window.__motionReady=false;window.__motionError=null;

function applySpec(next) {
  spec=validateLaunchSpec(next); actions=actionMap(spec);
  window.__launch=spec;window.__cueManifest=cueManifest(spec);
  const dimensions=spec.formats[format];
  if(!dimensions) throw Error(`Unknown composition format ${format}`);
  root.classList.toggle('portrait',portrait);root.style.width=`${dimensions.width}px`;root.style.height=`${dimensions.height}px`;
  lines('opening-copy',spec.copy.opening,portrait ? splitAt(spec.copy.opening,' ad.') : [spec.copy.opening]);
  elements['fragment-field'].replaceChildren();
  for(let i=0;i<6;i++){ const slice=document.createElement('div');slice.className=`fragment-slice${i===2?' gold':''}`;slice.style.clipPath=`inset(${i*16.666666}% 0 ${100-(i+1)*16.666666}% 0)`;for(const line of elements['opening-copy'].children){slice.append(line.cloneNode(true));}elements['fragment-field'].append(slice); }
  tracks.forEach((track,i)=>track.querySelector('.track-label').textContent=spec.copy.steps[i]);
  elements['screen-disclosure'].textContent=spec.copy.disclosure;
  elements['brand-word'].textContent=spec.copy.brand;elements['brand-url'].textContent=spec.copy.website;
  lines('direction-copy',spec.copy.direction,portrait ? splitAtWords(spec.copy.direction,[2,4,6]) : splitAt(spec.copy.direction,' a clear direction.'));
  captures.forEach((capture,i)=>capture.src=(portrait && spec.assets.portraitCaptures ? spec.assets.portraitCaptures : spec.assets.captures)[i]);
  document.getElementById('brand-mark').src=spec.assets.logo;
}

function splitAt(text,token) { const index=text.indexOf(token);return index<0?[text]:[text.slice(0,index),text.slice(index).trim()]; }
function splitAtWords(text,cuts) { const words=text.split(' '),result=[];let start=0;for(const cut of cuts){if(cut<words.length){result.push(words.slice(start,cut).join(' '));start=cut;}}if(start<words.length)result.push(words.slice(start).join(' '));return result; }

function makeGeometry() {
  const {width,height}=spec.formats[format];
  const old=elements['contour-field'],canvas=document.createElement('canvas');canvas.id='contour-field';canvas.width=width;canvas.height=height;canvas.setAttribute('aria-hidden','true');old.replaceWith(canvas);elements['contour-field']=canvas;
  const oldGeometry=document.getElementById('workflow-geometry'),geometry=document.createElement('canvas');geometry.id='workflow-geometry';geometry.width=portrait?900:820;geometry.height=portrait?705:530;geometry.setAttribute('aria-hidden','true');oldGeometry.replaceWith(geometry);
  const picture=document.createElement('canvas');picture.id='screen-picture';picture.width=portrait?900:1610;picture.height=portrait?1330:688;picture.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:3';picture.setAttribute('aria-hidden','true');elements['screen-panel'].append(picture);
  captures.forEach(capture=>capture.style.visibility='hidden');
  for(let i=0;i<26;i++){const chip=document.createElement('i');chip.className='fragment-chip';chip.style.left=`${(i*197+110)%width}px`;chip.style.top=`${(i*103+225)%height}px`;chip.style.width=`${32+(i*47)%170}px`;elements['fragment-grid'].append(chip);}
}

function paintContours(time,opacity,angle) {
  const canvas=elements['contour-field'],ctx=canvas.getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();
  ctx.translate(Math.sin(time*.31)*16,Math.cos(time*.23)*12);ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(angle*Math.PI/180);ctx.translate(-canvas.width/2,-canvas.height/2);ctx.lineWidth=1.2;ctx.strokeStyle='#FFCC00';
  for(let i=0;i<38;i++){const o=i*(portrait?30:22);ctx.globalAlpha=opacity*(.08+i/38*.22);ctx.beginPath();if(portrait){ctx.moveTo(1080+o,-180);ctx.bezierCurveTo(400+o,370,300+o,810,1000+o,1080);ctx.bezierCurveTo(1700+o,1350,300+o,1930,-230+o,2100);}else{ctx.moveTo(2100+o,-220);ctx.bezierCurveTo(750+o,50,810+o,350,1760+o,590);ctx.bezierCurveTo(2710+o,830,920+o,1130,160+o,1280);}ctx.stroke();}ctx.restore();
}

function paintWorkflow(index,opacity,arrival) {
  const canvas=document.getElementById('workflow-geometry'),ctx=canvas.getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/820,canvas.height/530);ctx.globalAlpha=opacity;ctx.translate(0,mix(25,0,arrival));
  const path=(data,color='rgba(255,255,255,.28)',width=1.5)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke(new Path2D(data));};
  const circle=(x,y,r,fill=false)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle=fill?'rgba(255,204,0,.7)':'#FFCC00';ctx.lineWidth=fill?1.4:2;if(fill){ctx.fillStyle='rgba(255,204,0,.09)';ctx.fill();}ctx.stroke();};
  const rect=(x,y,w,h,r,fill=false)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.strokeStyle=fill?'rgba(255,204,0,.7)':'rgba(255,255,255,.28)';ctx.lineWidth=1.5;if(fill){ctx.fillStyle='rgba(255,204,0,.09)';ctx.fill();}ctx.stroke();};
  if(index===0){path('M194 195L356 110 578 192 630 335 396 390 194 195 280 346 578 192 356 110 396 390');for(const [x,y,r]of [[356,110,35],[194,195,28],[578,192,31],[630,335,23],[280,346,22],[396,390,37]])circle(x,y,r,true);circle(415,248,67);path('M504 248A89 89 0 1 1 326 248A89 89 0 1 1 504 248');ctx.beginPath();ctx.arc(415,248,12,0,Math.PI*2);ctx.fillStyle='#FFCC00';ctx.fill();}
  if(index===1){rect(223,59,373,410,22);path('M276 140H483M276 201H547M276 262H488M276 323H538','#FFCC00',2);path('M276 381H450');ctx.beginPath();ctx.arc(523,140,7,0,Math.PI*2);ctx.fillStyle='#FFCC00';ctx.fill();path('M533 372L546 359 583 396 570 409Z','#FFCC00',1.4);}
  if(index===2){for(const x of [71,306,541])rect(x,136,210,255,15,true);path('M229 238A53 53 0 1 1 123 238A53 53 0 1 1 229 238');path('M117 333H235M351 207H472M351 245H445M351 283H468M351 333H473M587 333H707','#FFCC00',2);path('M587 222L646 191 707 245 646 314Z');}
  ctx.restore();
}

function paintCapture(index) {
  const canvas=document.getElementById('screen-picture'),ctx=canvas.getContext('2d'),image=captures[index],radius=portrait?34:29;ctx.resetTransform();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.beginPath();ctx.roundRect(.5,.5,canvas.width-1,canvas.height-1,radius);ctx.clip();ctx.fillStyle='#09090B';ctx.fillRect(0,0,canvas.width,canvas.height);
  if(portrait){const scale=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale;ctx.drawImage(image,(canvas.width-width)/2,0,width,height);}else{const crop=spec.assets.landscapeFraming[index];ctx.drawImage(image,crop.left,crop.top,crop.width,crop.height,0,0,canvas.width,canvas.height);}
  ctx.restore();ctx.strokeStyle='rgba(255,255,255,.19)';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(.5,.5,canvas.width-1,canvas.height-1,radius);ctx.stroke();
}

function motionAt(seconds) {
  const t=clamp(Number(seconds)||0,0,spec.duration);
  const scene=spec.scenes.find(s=>t>=s.start && t<s.end) || spec.scenes.at(-1);
  const values=Object.fromEntries(spec.actions.map(action=>[action.id,actionProgress(action,t)]));const p=id=>values[id];
  const reveal=p(scene.revealActionId),exit=scene.exit.kind==='cut'?0:p(scene.exit.actionId);
  const opening=scene.id==='opening',intent=['product','story','business'].includes(scene.id),workflow=['research','script','storyboard'].includes(scene.id),screen=scene.id.endsWith('-screen'),direction=scene.id==='direction',finish=scene.id==='finish';
  const i=scene.copyIndex??0;
  for(const [id,visible] of Object.entries({'opening-scene':opening,'intent-scene':intent,'workflow-scene':workflow,'screen-scene':screen,'direction-scene':direction,'finish-scene':finish}))style(id,{visibility:visible?'visible':'hidden'});
  const materialTime=finish?Math.min(t,actions[spec.materialHoldActionId].contact):t;
  style('shader-background',{opacity:String(scene.id==='story'?0:finish?.055:.18)});
  style('material-wash',{opacity:String(scene.id==='story'?0:1)});
  paintContours(finish?0:materialTime,intent||screen?0:finish?.09:direction?.7:.72,direction?mix(-8,4,p('direction-flow')):0);
  const openReveal=p('opening-reveal'),fragment=p('fragment-resolve');
  style('opening-copy',{opacity:String(openReveal*(1-exit)),transform:`translateY(${mix(35,0,openReveal)-exit*55}px)`,filter:`blur(${mix(7,0,openReveal)}px)`});
  style('fragment-field',{opacity:String((1-fragment)*(1-exit))});
  [...elements['fragment-field'].children].forEach((slice,j)=>slice.style.transform=`translateX(${mix((j%2?-1:1)*(70+j*31),0,fragment)}px)`);
  [...elements['fragment-grid'].children].forEach((chip,j)=>{chip.style.opacity=String((1-fragment)*.4);chip.style.transform=`translateX(${mix((j%2?-1:1)*240,0,fragment)}px) scaleX(${mix(2,1,fragment)})`;});
  style('opening-rule',{opacity:String(openReveal*(1-exit)),transform:`scaleX(${openReveal*(1-exit)})`});
  style('opening-signal',{opacity:String(openReveal),transform:`translate(${mix(-130,0,p('opening-signal'))}px,${mix(75,0,p('opening-signal'))}px) scale(${mix(.2,1,p('opening-signal'))})`});
  if(intent){
    const parts=splitAt(spec.copy.intents[i],i===0?' a product.':i===1?' your story.':' your business.');
    if(elements['intent-copy'].getAttribute('aria-label')!==spec.copy.intents[i])lines('intent-copy',spec.copy.intents[i],parts);
    const cream=scene.id==='story';style('cream-field',{opacity:cream?'1':'0'});
    style('intent-copy',{opacity:String(reveal*(1-exit)),color:cream?'#18181B':'#FFFFFF',transform:`translateY(${mix(55,0,reveal)-exit*48}px)`,filter:`blur(${mix(7,0,reveal)}px)`});
    elements['intent-copy'].lastElementChild.style.color=cream?'#18181B':'#FFCC00';
    style('intent-rule',{opacity:String(reveal*(1-exit)),background:cream?'#18181B':'#FFCC00',transform:`scaleX(${reveal})`});
    const orbScale=scene.id==='business'?1.17:scene.id==='story'?.90:1;
    style('orb-world',{opacity:String(p('orb-reveal')),transform:`translate(${mix(portrait?0:145,0,p('orb-reveal'))+(portrait?0:scene.id==='business'?115:0)}px,${mix(50,0,p('orb-reveal'))}px) scale(${mix(.79,orbScale,p('orb-reveal'))})`});
    style('orb-ring',{opacity:cream?'.5':'.85',borderColor:cream?'rgba(24,24,27,.38)':'rgba(255,204,0,.48)',transform:`rotate(${mix(-28,17,p('orb-orbit'))}deg) scaleY(${mix(1,.65,p('orb-orbit'))})`});
    style('orb-glint',{opacity:String(.3+.35*Math.sin(p('orb-orbit')*Math.PI)),transform:`translateX(${mix(-90,90,p('orb-orbit'))}px) rotate(-32deg)`});style('orb-shadow',{opacity:cream?'1':'0'});
  }
  if(workflow){
    elements['workflow-title'].textContent=spec.copy.steps[i];elements['workflow-detail'].textContent=spec.copy.details[i];
    style('workflow-copy',{opacity:String(reveal*(1-exit)),transform:`translateY(${mix(45,0,reveal)-exit*28}px)`,filter:`blur(${mix(5,0,reveal)}px)`});
    const panel=p(`${scene.id}-panel`),signal=p(`${scene.id}-signal`);
    style('workflow-panel',{opacity:String(panel),transform:panel===1?'none':`perspective(1800px) translateY(${mix(95,0,panel)}px) rotateY(${mix(portrait?0:-17,0,panel)}deg) rotateX(${mix(11,0,panel)}deg) scale(${mix(.92,1,panel)})`});
    style('workflow-track',{opacity:String(p('research-panel'))});
    tracks.forEach((track,j)=>{track.classList.toggle('active',j<=i);track.style.opacity=j<=i?'1':'.65';});
    const trackWidth=portrait?870:1560;const dotPositions=[13.5,trackWidth/2,trackWidth-13.5];
    style('workflow-signal',{transform:`translateX(${mix(i===0?-75:dotPositions[i-1]-10,dotPositions[i]-10,signal)}px)`,opacity:String(i===0?signal:1)});
    paintWorkflow(i,panel*(1-exit),panel);
    style('panel-sheen',{opacity:String(.45*Math.sin(signal*Math.PI)),transform:`translateX(${mix(0,1750,signal)}px) rotate(26deg)`});
  }
  if(screen){
    elements['screen-copy'].textContent=spec.copy.steps[i];captures.forEach((capture,j)=>capture.style.opacity=j===i?'1':'0');
    paintCapture(i);
    style('screen-copy',{opacity:String(reveal*(1-exit)),transform:`translateY(${mix(26,0,reveal)}px)`});style('screen-disclosure',{opacity:String(reveal*(1-exit))});
    style('screen-panel',{opacity:String(reveal*(1-exit)),transform:reveal===1&&exit===0?'none':`perspective(2100px) translateY(${mix(58,0,reveal)+exit*35}px) rotateX(${mix(8,0,reveal)}deg) rotateY(${mix(portrait?0:-4,0,reveal)}deg) scale(${mix(.97,1,reveal)})`});
  }
  style('direction-copy',{opacity:String(p('direction-reveal')*(1-exit)),transform:`translateY(${mix(65,0,p('direction-reveal'))-exit*75}px)`,filter:`blur(${mix(8,0,p('direction-reveal'))}px)`});
  style('direction-field',{opacity:String(p('direction-reveal')*(1-exit)),transform:`translateX(${mix(-90,90,p('direction-flow'))}px) rotate(${portrait?-25:-18}deg) scale(${mix(.7,1,p('direction-reveal'))})`});
  const brand=p('brand-reveal'),url=p('brand-url-reveal');
  style('brand',{opacity:String(brand),transform:`translateY(${mix(55,0,brand)}px) scale(${mix(.93,1,brand)})`});style('brand-url',{opacity:String(url),transform:`translateY(${mix(20,0,url)}px)`});
  style('finish-light',{opacity:String(.48*Math.sin(p('finish-light')*Math.PI)),transform:`translateY(${mix(-45,100,p('finish-light'))}px) scaleX(${mix(.18,1,p('finish-light'))})`});
  return {time:t,scene:scene.id,format,actions:values,materialTime,orbReveal:intent?p('orb-reveal'):0,cardReveal:workflow?reveal:0,sweep:workflow?p(`${scene.id}-signal`):.5,readable:t>=scene.readable[0]&&t<=scene.readable[1],reveal,exit};
}

async function renderAt(seconds) {const state=motionAt(seconds);if(materials)await materials.seek(state.materialTime,state.scene,state);window.__motionState=state;root.dataset.scene=state.scene;root.dataset.time=state.time.toFixed(6);return state;}
window.seekComposition=seconds=>{const result=seekQueue.then(async()=>{await ready;return renderAt(seconds);});seekQueue=result.catch(()=>{});return result;};
window.setCompositionSpec=next=>{const result=seekQueue.then(async()=>{await ready;applySpec(next);return renderAt(window.__motionState.time);});seekQueue=result.catch(()=>{});return result;};
ready=(async()=>{
  const response=await fetch('./launch.json');if(!response.ok)throw Error(`Launch spec load failed (${response.status})`);applySpec(await response.json());makeGeometry();
  const bg=document.getElementById('shader-background'),glass=document.getElementById('shader-glass');bg.width=spec.formats[format].width;bg.height=spec.formats[format].height;glass.width=portrait?900:820;glass.height=portrait?705:530;
  await Promise.all([document.fonts.load('900 178px InterBlack'),document.fonts.load('600 100px Inter'),document.getElementById('brand-mark').decode(),...captures.map(capture=>capture.decode())]);
  await import('./shader-materials.js');materials=window.shaderMaterials;if(!materials?.init||!materials?.seek)throw Error('WebGPU material adapter unavailable');
  await materials.init({mode:'after',backgroundCanvas:'shader-background',orbCanvas:'shader-orb',glassCanvas:'shader-glass'});await renderAt(0);window.__motionReady=true;
})().catch(error=>{window.__motionError=error.message;console.error(error);throw error;});
