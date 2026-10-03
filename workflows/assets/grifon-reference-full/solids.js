// Small, task-local CSS solids. Every face is editable; no model or image imports.
window.createGrifonSolid=(kind,parent)=>{
 const el=(cls,p=parent)=>{const n=document.createElement('div');n.className=cls;p.append(n);return n};
 const solid=el('f-solid');
 const face=(p,w,h,transform,paint,html='',radius=0)=>{
  const n=el('f-solid-face',p);Object.assign(n.style,{width:w+'px',height:h+'px',marginLeft:-w/2+'px',marginTop:-h/2+'px',transform,background:paint,borderRadius:radius+'px'});n.innerHTML=html;return n;
 };
 const box=(p,w,h,d,x,y,z,front,html='',radius=0)=>{
  const b=el('f-solid-part',p);b.style.transform=`translate3d(${x}px,${y}px,${z}px)`;
  face(b,w,h,`translateZ(${d/2}px)`,front,html,radius);
  face(b,w,h,`rotateY(180deg) translateZ(${d/2}px)`,'linear-gradient(120deg,#52595c,#1c2225 48%,#101719)','',radius);
  face(b,d,h,`rotateY(90deg) translateZ(${w/2}px)`,'linear-gradient(90deg,#798183,#20272a 30%,#484f53)');
  face(b,d,h,`rotateY(-90deg) translateZ(${w/2}px)`,'linear-gradient(90deg,#1b2226,#4b555a 75%,#929996)');
  face(b,w,d,`rotateX(90deg) translateZ(${h/2}px)`,'linear-gradient(0deg,#363e43,#969e9e 52%,#293238)');
  face(b,w,d,`rotateX(-90deg) translateZ(${h/2}px)`,'#101619');return b;
 };
 const disk=(p,r,z,paint,html='')=>face(p,r*2,r*2,`translateZ(${z}px)`,paint,html,r);
 const barrel=(p,r,depth,z)=>{
  const n=32,arc=2*r*Math.tan(Math.PI/n)+1;
  for(let i=0;i<n;i++){
   const a=i*360/n,rad=a*Math.PI/180;
   const light=Math.round(32+45*(.5+.5*Math.cos(rad+1.1)));
   face(p,depth,arc,`translate3d(${r*Math.cos(rad)}px,${r*Math.sin(rad)}px,${z}px) rotateZ(${a}deg) rotateY(90deg)`,`repeating-linear-gradient(90deg,rgb(${light},${light+5},${light+7}) 0 3px,#1b2227 3px 5px)`);
  }
  disk(p,r,z+depth/2,'radial-gradient(circle,#070d12 58%,#8a9391 59%,#1a2227 61%,#0a1117 73%,#646f70 74%,#111a20 78%)');
 };
 if(kind==='camera'){
  box(solid,475,235,115,0,0,0,'linear-gradient(155deg,#4b5459,#1b2228 35%,#111920)',
   '<i class="f-camera-grip"></i><i class="f-camera-light"></i>',24);
  box(solid,123,58,100,4,-139,-4,'linear-gradient(#748080,#273139)', '',9);
  box(solid,75,14,70,166,-124,0,'#6e777a','',6);
  const lens=el('f-solid-part',solid);lens.style.transform='translate3d(30px,12px,105px)';
  barrel(lens,112,98,0);barrel(lens,106,53,74);
  disk(lens,90,102,'radial-gradient(circle at 44% 44%,#030b10 0 20%,#132d39 23%,#294d51 34%,#07151c 38%,#244042 52%,#7c9690 54%,#111d23 58%,#080e14 78%,#687674 80%,#11181f 83%)');
  disk(lens,78,103,'radial-gradient(ellipse at 29% 23%,#dcf2cd77,transparent 25%),radial-gradient(ellipse at 65% 71%,#6fc9d94d,transparent 48%)');
 }else if(kind==='phone'){
  box(solid,273,559,25,0,0,0,'linear-gradient(135deg,#a1acaa,#333f47 45%,#abb1ad)','<div class="f-device-screen"><i class="f-device-island"></i><div class="f-device-art"></div><div class="f-device-card"><i></i><i></i><i></i><b></b></div></div>',33);
  box(solid,5,62,12,140,-128,0,'#aab5b5','',2);
  box(solid,5,82,12,-140,-106,0,'#aab5b5','',2);
 }else if(kind==='laptop'){
  // An open hinge: the deck occupies XZ, the display occupies XY.
  const lid=el('f-solid-part',solid);lid.style.transform='translate3d(0px,-54px,-68px) rotateX(-12deg)';
  box(lid,520,322,18,0,0,0,'linear-gradient(130deg,#a4aeac,#2a343c 30%,#4d5b63)',
   '<div class="f-laptop-screen"><i></i><div class="f-story-panels"><b></b><b></b><b></b></div><div class="f-story-lines"></div></div>',12);
  const base=el('f-solid-part',solid);base.style.transform='translate3d(0px,110px,71px) rotateX(90deg)';
  box(base,530,305,15,0,0,0,'linear-gradient(125deg,#c7ccca,#8a969d 45%,#53636d)',
   '<div class="f-keybed">'+Array.from({length:52},()=>'<i></i>').join('')+'</div><div class="f-trackpad"></div>',10);
 }
 return solid;
};
