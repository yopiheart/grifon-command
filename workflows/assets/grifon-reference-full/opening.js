// Main-comp opening choreography. Seeded math makes every seek deterministic.
window.buildGrifonOpening=(tl,copy)=>{
 const q=selector=>document.querySelector(selector);
 const el=(tag,cls,parent)=>{const node=document.createElement(tag);node.className=cls;parent.append(node);return node};
 let objectId=0;
 const object=(kind,parent,cls,x,y,size,rotation=0)=>{const node=el('div',cls,parent);Object.assign(node.style,{left:x+'px',top:y+'px',width:size+'px',height:size+'px',rotate:rotation+'deg'});node.innerHTML=createGrifonObject(kind,'obj'+objectId++);return node};
 const spark=parent=>{const node=el('div','f-spark',parent);node.innerHTML='<svg viewBox="0 0 80 80"><path d="M40 3c3 25 12 34 37 37-25 3-34 12-37 37C37 52 28 43 3 40 28 37 37 28 40 3Z"/></svg>';return node};
 const layouts=[[198,691],[451,391],[1013,219],[1089,694]];
 const makeCollage=(id,words,props,start,ticket)=>{
   const shot=q(id),wordBox=el('div','f-words',shot);
   words.forEach((text,i)=>{const word=el('span','f-word',wordBox);word.textContent=text;word.style.left=layouts[i][0]+'px';word.style.top=layouts[i][1]+'px';tl.set(word,{opacity:0},0);tl.set(word,{opacity:1},start+[0,.13,.32,.53][i]);});
   const mark=spark(shot);tl.set(mark,{opacity:0},0);tl.set(mark,{opacity:1},start+.2);
   props.forEach((p,i)=>{const node=object(p[0],shot,'f-prop',...p.slice(1));tl.set(node,{opacity:0},0);tl.set(node,{opacity:1},start+.09+i*.14);});
   if(ticket){const node=el('div','f-ticket',shot);node.textContent=ticket;tl.set(node,{opacity:0},0);tl.set(node,{opacity:1},start+.07);}
 };
 q('#f-intro').textContent=copy.opening;
 tl.fromTo('#f-intro',{opacity:0},{opacity:1,duration:.2,ease:'power2.out'},0);
 makeCollage('#f-launch',copy.launch,[['bottle',1285,-70,365,0],['bag',589,714,320,-4],['camera',1402,667,285,-7],['pencil',393,639,175,3]],1.08,'New product');
 makeCollage('#f-story',copy.story,[['clapper',1360,75,320,3],['reel',670,709,300,-5],['camera',650,-80,315,9],['pencil',290,650,185,-6]],4.14,'Your story');
 makeCollage('#f-grow',copy.grow,[['laptop',662,-115,400,-7],['board',1390,688,390,-4],['keyboard',633,794,290,5],['pencil',35,777,230,-7]],6.88,'Next chapter');
 const problem=q('#f-problem'),problemPositions=[[246,476],[452,340],[1053,294],[1167,453],[1230,599]];
 const wp=el('div','f-words',problem);
 copy.problem.forEach((text,i)=>{const word=el('span','f-word',wp);word.textContent=text;word.style.left=problemPositions[i][0]+'px';word.style.top=problemPositions[i][1]+'px';tl.set(word,{opacity:0},0);tl.set(word,{opacity:1},9.7+i*.24);});
 spark(problem);
 [['camera',118,6,293,-8],['bottle',810,40,171,0],['board',1314,-50,290,-5],['bag',1680,42,247,3],['reel',127,607,274,-10],['clapper',1249,745,358,4],['keyboard',537,756,435,-3],['pencil',430,675,175,-9],['phone',1770,535,249,0]].forEach((p,i)=>{const node=object(p[0],problem,'f-prop',...p.slice(1));tl.set(node,{opacity:0},0);tl.set(node,{opacity:1},9.72+i*.12);});
 [['camera',2.78],['phone',5.53],['laptop',8.21]].forEach(([kind,start],i)=>{
   const shot=q('#f-hero-'+kind),node=el('div','f-hero-object',shot);node.innerHTML=createGrifonObject(kind,'hero'+kind);
   const tag=el('div','f-hero-tag',shot),dot=el('span','f-hero-dot',tag);tag.append(document.createTextNode(copy.heroTags[i]));
   tl.fromTo(node,{rotationY:-38,rotationZ:-5,scale:.93,x:-85},{rotationY:0,rotationZ:0,scale:1,x:0,duration:.58,ease:'power3.out'},start);
   tl.fromTo(node.querySelector('svg'),{filter:'blur(7px)'},{filter:'blur(0px)',duration:.3,ease:'power2.out'},start);
   tl.fromTo(tag,{opacity:0,x:25,filter:'blur(5px)'},{opacity:1,x:0,filter:'blur(0px)',duration:.25,ease:'power2.out'},start+.24);
 });
 q('#f-turn span').textContent=copy.turningPoint;
 tl.fromTo('#f-turn span',{opacity:0,filter:'blur(10px)'},{opacity:1,filter:'blur(0px)',duration:.3},12.78);
 tl.to('#f-turn span',{opacity:0,duration:.18},13.63);
 const dialogue=q('#f-dialogue');
 copy.conversation.forEach((message,i)=>{
   const card=el('div','f-message',dialogue),speaker=el('span','f-speaker',card);speaker.textContent=message.speaker;
   if(i!==1)el('span','f-orblet',card);
   const text=el('span','f-message-text',card);text.textContent=message.text;
   const at=[17.65,18.86,20.8][i];
   tl.fromTo(card,{opacity:0,y:35,scale:.94,filter:'blur(6px)'},{opacity:1,y:0,scale:1,filter:'blur(0px)',duration:.42,ease:'power3.out'},at);
   tl.fromTo(text,{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:[.7,1.22,1.2][i],ease:'none'},at+.11);
 });
 tl.fromTo('#f-dialogue',{scale:.96,x:-20,y:15},{scale:1.04,x:10,y:-12,duration:4.92,ease:'sine.inOut'},17.5);
 tl.to('#f-dialogue',{opacity:0,filter:'blur(8px)',duration:.3},22.48);

 const canvas=q('#f-field'),ctx=canvas.getContext('2d'),mosaic=q('#f-mosaic');
 const w=960,h=540;
 const mix=(a,b,p)=>a+(b-a)*p;
 const clamp=v=>Math.max(0,Math.min(1,v));
 const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
 const rand=(a,b=0)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v)};
 const glow=(x,y,r,stops,context=ctx)=>{const grad=context.createRadialGradient(x,y,0,x,y,r);stops.forEach(([p,color])=>grad.addColorStop(p,color));context.fillStyle=grad;context.fillRect(0,0,w,h)};
 const blue=(t,context=ctx)=>{
   context.fillStyle='#517c96';context.fillRect(0,0,w,h);
   glow(w*.16,h*.3,w*.8,[[0,'#7bb2cd'],[.6,'#4384a6'],[1,'#213d4b']],context);
   glow(w*.82,h*.86,w*.62,[[0,'#a4ac8e'],[.55,'#65909644'],[1,'#50778b00']],context);
   glow(w*.53,h*.55,w*.49,[[0,'#143d5588'],[.44,'#234f6680'],[1,'#4e7c8a00']],context);
   for(let y=-10;y<h+12;y+=8){
     context.beginPath();
     for(let x=-12;x<w+12;x+=8){
       const wave=Math.sin(x*.007+y*.003+t*.28)*47+Math.cos(x*.012-y*.009)*23;
       const py=y+wave*Math.sin(y/h*Math.PI);
       const px=x+Math.sin(y*.012+t*.2)*4;
       const radius=.65+(.5+.5*Math.sin(x*.009+y*.018+t*.5))*.8;
       context.moveTo(px+radius,py);context.arc(px,py,radius,0,Math.PI*2);
     }
     context.fillStyle='rgba(231,243,226,.40)';context.fill();
   }
 };
 const ambient=t=>{
   const k=t-17.42;ctx.fillStyle='#456447';ctx.fillRect(0,0,w,h);
   glow(w*.05+Math.sin(k*.5)*45,h*.08,w*.56,[[0,'#e9c0a0'],[.45,'#a1a373'],[1,'#617f5200']]);
   glow(w*.93+Math.sin(k*.35)*40,h*.29,w*.7,[[0,'#c5e4ec'],[.4,'#8dbcc4'],[.72,'#669cac'],[1,'#50757d00']]);
   glow(w*.58+Math.sin(k*.4)*85,h*.42,w*.43,[[0,'#17331e'],[.47,'#304e21'],[.8,'#70894699'],[1,'#516a4500']]);
   glow(w*.13+Math.cos(k*.5)*40,h*.85,w*.46,[[0,'#afd6d5'],[.42,'#96b6a5'],[1,'#728e6b00']]);
   glow(w*.29+Math.sin(k*.43)*35,h*.48,w*.31,[[0,'#a5b34166'],[.5,'#a9b73822'],[1,'#9dae3100']]);
 };
 const sphere=(t,cx,cy,r)=>{
   ctx.save();ctx.translate(cx,cy);
   const halo=ctx.createRadialGradient(0,0,r*.6,0,0,r*1.5);halo.addColorStop(0,'#f7ffdd00');halo.addColorStop(.58,'#fafbdb59');halo.addColorStop(.76,'#bde0bc14');halo.addColorStop(1,'#9dc1b900');ctx.fillStyle=halo;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);
   ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
   const base=ctx.createLinearGradient(-r,-r,r,r);base.addColorStop(0,'#fffdd9');base.addColorStop(.3,'#fff8ac');base.addColorStop(.55,'#ffc276');base.addColorStop(.72,'#eb7354');base.addColorStop(1,'#82babb');ctx.fillStyle=base;ctx.fillRect(-r,-r,r*2,r*2);
   const ember=ctx.createRadialGradient(r*.5,r*Math.sin(t*1.3)*.65,0,r*.6,0,r*1.15);ember.addColorStop(0,'#f06a59ee');ember.addColorStop(.54,'#ed7958bb');ember.addColorStop(1,'#eb905a00');ctx.fillStyle=ember;ctx.fillRect(-r,-r,r*2,r*2);
   const hot=ctx.createRadialGradient(-r*.42+Math.sin(t*1.8)*r*.35,-r*.45+Math.cos(t*1.4)*r*.35,0,-r*.2,0,r*1.35);hot.addColorStop(0,'#ffffff');hot.addColorStop(.26,'#ffffe5');hot.addColorStop(.52,'#fff78cbb');hot.addColorStop(1,'#ffc57900');ctx.fillStyle=hot;ctx.fillRect(-r,-r,r*2,r*2);
   const cool=ctx.createRadialGradient(r*1.2,r*.08,0,r*1.2,r*.1,r*.75);cool.addColorStop(0,'#acd8d6ee');cool.addColorStop(.5,'#baded5bb');cool.addColorStop(1,'#adc4c000');ctx.fillStyle=cool;ctx.fillRect(-r,-r,r*2,r*2);
   ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='#f0f1d69c';ctx.lineWidth=1;ctx.stroke();
 };
 const windows=[[2.78,4.14],[5.53,6.88],[8.21,9.7]];
 const transitions=[2.78,4.14,5.53,6.88,8.21,9.7];
 // Explicit scene visibility also governs renderers that cache canvas paint calls.
 // The cream scenes use the world background, never a previously painted canvas.
 tl.set(canvas,{visibility:'hidden'},0);
 windows.forEach(([start,end])=>{tl.set(canvas,{visibility:'visible'},start);tl.set(canvas,{visibility:'hidden'},end)});
 tl.set(canvas,{visibility:'visible'},12.72);
 tl.set(canvas,{visibility:'hidden'},22.8);
 // DOM tile keyframes remain seekable even when a capture engine replays canvases.
 const tiles=[];
 for(let y=0;y<10;y++)for(let x=0;x<18;x++){
   const tile=el('div','f-tile',mosaic);tile.style.left=x*108+'px';tile.style.top=y*108+'px';tiles.push({tile,x,y});
 }
 transitions.forEach((at,i)=>{
   const toBlue=i%2===0;
   tl.set(mosaic,{visibility:'visible'},at);
   tiles.forEach(({tile,x,y})=>{
     const order=(toBlue?(17-x)/17:x/17)*.57+rand(x,y)*.43;
     tl.set(tile,{opacity:1,backgroundColor:toBlue?'#f2f1ec':'#638da1',backgroundImage:toBlue?'none':'radial-gradient(circle,rgba(233,244,225,.4) 1.5px,transparent 2px)',backgroundSize:'16px 16px'},at);
     tl.set(tile,{opacity:0},at+.32*order);
   });
   tl.set(mosaic,{visibility:'hidden'},at+.32);
 });
 window.drawGrifonOpening=t=>{
   if(t>=22.8)return;
   ctx.clearRect(0,0,w,h);
   const isBlue=windows.some(([a,b])=>t>=a&&t<b);
   if(t<12.72){if(isBlue)blue(t);else{ctx.fillStyle='#f2f1ec';ctx.fillRect(0,0,w,h);}}
   else if(t<14.03){
     ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
     const p=smooth((t-12.72)/.21),r=mix(100,660,p);
     ctx.save();ctx.beginPath();ctx.arc(480,270,r,0,Math.PI*2);ctx.clip();
     const grad=ctx.createLinearGradient(0,0,850,500);grad.addColorStop(0,'#961831');grad.addColorStop(.43,'#ea4928');grad.addColorStop(.75,'#fa9b38');grad.addColorStop(1,'#ecba65');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
     glow(650,420,450,[[0,'#ffbd6266'],[1,'#ffbf5d00']]);
     ctx.restore();
   }else if(t<17.42){
     ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
     glow(0,490,490,[[0,'#24401c88'],[.5,'#26352144'],[1,'#00000000']]);
     glow(900,380,470,[[0,'#8a705244'],[1,'#00000000']]);
     const p=smooth((t-14.03)/.56),r=mix(660,139,p)+(t>14.59?Math.sin((t-14.59)*1.8)*7:0);
     const x=480+Math.sin((t-14)*.7)*8,y=270+Math.cos((t-14)*.8)*4;
     for(const radius of [r+20,r+135,r+310]){ctx.beginPath();ctx.ellipse(x,y,radius,radius*(.99+Math.sin(t)*.018),-.12,0,Math.PI*2);ctx.lineWidth=.65;ctx.strokeStyle='#c8d3c247';ctx.stroke();}
     sphere(t,x,y,r);
   }else{ambient(t);const p=smooth((t-17.42)/.35);if(p<1){ctx.fillStyle=`rgba(0,0,0,${1-p})`;ctx.fillRect(0,0,w,h);}if(t>22.48){ctx.fillStyle=`rgba(0,0,0,${smooth((t-22.48)/.32)})`;ctx.fillRect(0,0,w,h);}}
 };
};
