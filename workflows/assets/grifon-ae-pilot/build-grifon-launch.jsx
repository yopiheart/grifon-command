/* Grifon native AE launch film. Editorial typography, not a simulated generation run. */
(function(){
 var base=new File($.fileName).parent,out=new Folder(base.fsName+'/launch');if(!out.exists)out.create();
 var dest=new File(out.fsName+'/Grifon-Your-Next-Ad-v3.aep'),D=30,W=1920,H=1080;
 function log(s){var f=new File(out.fsName+'/build-status.txt');if(f.open('w')){f.write(s);f.close();}}
 try{
  if(dest.exists)throw Error('Output exists. Preserve it before rebuilding.');
  if(app.project.numItems)app.project.save(new File(out.fsName+'/Previous-Session-'+new Date().getTime()+'.aep'));
  app.newProject();app.beginUndoGroup('Grifon launch');
  var ink=[9/255,9/255,11/255],white=[1,1,1],dim=[.63,.63,.67],gold=[1,.8,0],surface=[24/255,24/255,27/255];
  var c=app.project.items.addComp('GRIFON | Your next ad | 30s',W,H,1,D,30);c.bgColor=ink;c.motionBlur=true;c.shutterAngle=150;
  c.layers.addSolid(ink,'Canvas',W,H,1,D);
  function keys(p,ts,vs){for(var i=0;i<ts.length;i++)p.setValueAtTime(ts[i],vs[i]);var n=p.keyInTemporalEase(1).length,e=[];for(var j=0;j<n;j++)e.push(new KeyframeEase(0,72));for(var k=1;k<=p.numKeys;k++){p.setTemporalEaseAtKey(k,e,e);if(p.isSpatial)p.setSpatialAutoBezierAtKey(k,false);}}
  function P(l,t,v){keys(l.transform.position,t,v);}function O(l,t,v){keys(l.transform.opacity,t,v);}
  function S(l,t,v){var a=[];for(var i=0;i<v.length;i++)a.push([v[i],v[i],v[i]]);keys(l.transform.scale,t,a);}
  function text(comp,str,size,x,y,color,bold){var l=comp.layers.addText(str),p=l.property('ADBE Text Properties').property('ADBE Text Document'),d=p.value;d.font=bold===false?'Inter-Regular':'Inter-Bold';d.fontSize=size;d.fillColor=color||white;d.tracking=-45;d.justification=ParagraphJustification.CENTER_JUSTIFY;p.setValue(d);var r=l.sourceRectAtTime(0,false);l.transform.anchorPoint.setValue([r.left+r.width/2,r.top+r.height/2]);l.transform.position.setValue([x,y]);l.motionBlur=true;return l;}
  function T(str,size,x,y,z,a,b,color){var l=text(c,str,size,x,y,color);l.threeDLayer=true;l.transform.position.setValue([x,y,z]);l.inPoint=Math.max(0,a);l.outPoint=b;O(l,[a,a+.16,b-.16,b],[0,100,100,0]);P(l,[a,a+.42,b-.3,b],[[x,y+75,z],[x,y,z],[x,y,z],[x,y-80,z]]);return l;}
  function rect(comp,name,x,y,w,h,fill,stroke,radius){var l=comp.layers.addShape();l.name=name;var g=l.property('ADBE Root Vectors Group'),r=g.addProperty('ADBE Vector Shape - Rect');r.property('ADBE Vector Rect Size').setValue([w,h]);r.property('ADBE Vector Rect Roundness').setValue(radius||0);if(fill)g.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(fill);if(stroke){var s=g.addProperty('ADBE Vector Graphic - Stroke');s.property('ADBE Vector Stroke Color').setValue(stroke);s.property('ADBE Vector Stroke Width').setValue(3);}l.transform.position.setValue([x,y]);l.motionBlur=true;return {l:l,size:g.property(1).property('ADBE Vector Rect Size')};}
  function asset(name){var f=new File(base.fsName+'/source/'+name);if(!f.exists)throw Error('Missing '+name);return app.project.importFile(new ImportOptions(f));}
  var logo=asset('logo.png'),screenFull=asset('grifon-composer-full.jpg');
  var screen=app.project.items.addComp('Actual composer | complete panel crop',896,682,1,D,30);
  var sc=screen.layers.add(screenFull);sc.transform.position.setValue([screenFull.width/2-184.5,screenFull.height/2-268]);
  // One typographic object becomes a frame, a selection, a timeline, and a ring.
  var line=rect(c,'Gold focus | continuous motif',960,770,8,110,gold,null,4);
  P(line.l,[0,.35,1.1,1.4,2.2,2.65,3.25,3.8,6.25,6.8,8.85,9.25,11.8,12.3,15.8,16.3,18.8,19.2,21.8,22.3,25.4,26],[[960,630],[960,630],[1380,650],[1380,650],[1380,650],[960,690],[960,690],[960,890],[960,890],[520,745],[520,745],[960,810],[960,810],[960,890],[960,890],[960,890],[960,890],[960,780],[960,780],[960,920],[960,920],[960,920]]);
  keys(line.size,[0,.35,1.1,2.2,2.65,3.25,3.8,6.25,6.8,8.85,9.25,11.8,12.3,15.8,16.3,18.8,19.2,21.8,22.3,25.4,26],[[8,100],[8,100],[12,220],[12,220],[900,5],[900,5],[1250,3],[1250,3],[440,4],[440,4],[900,4],[900,4],[1200,4],[1200,4],[470,4],[470,4],[800,5],[800,5],[1250,3],[1250,3],[0,3]]);
  O(line.l,[0,.12,25.5,26],[0,100,100,0]);
  var a=T('Your next',170,960,430,0,0,1.28,white);S(a,[0,.45,1,1.28],[92,100,100,145]);
  var ad=T('ad.',340,960,580,-10,.85,2.55,white);S(ad,[.85,1.2,2.2,2.55],[72,100,100,118]);
  T('Starts here.',146,960,495,0,2.45,3.8,white);
  // Real shipped component, captured with empty inputs and inert launch callback.
  var ui=c.layers.add(screen);ui.name='Actual Grifon One-Shot component capture';ui.threeDLayer=true;ui.motionBlur=true;ui.inPoint=3.45;ui.outPoint=6.9;
  P(ui,[3.45,4.0,6.25,6.9],[[1120,680,180],[960,600,0],[960,600,0],[650,510,500]]);S(ui,[3.45,4,6.25,6.9],[45,86,86,62]);O(ui,[3.45,3.85,6.3,6.9],[0,100,100,0]);keys(ui.transform.yRotation,[3.45,4.1,6.25,6.9],[-12,0,0,15]);
  T('One clear brief.',92,960,190,-20,3.5,6.65,white);
  T('Find the angle.',132,960,310,0,6.8,9.1,white);
  var angleWords=['Your market','Your audience','Your offer'];for(var i=0;i<3;i++){var q=T(angleWords[i],57,450+i*510,565,0,6.9+i*.14,9.25,i===0?white:dim);}
  var sel=rect(c,'Angle selection',450,565,420,135,null,gold,68);sel.l.inPoint=7;sel.l.outPoint=9.3;O(sel.l,[7,7.2,9.1,9.3],[0,100,100,0]);P(sel.l,[7,7.6,8,8.5,9.1],[[450,565],[450,565],[960,565],[1470,565],[1470,565]]);
  T('Make it a story.',112,960,230,0,9.2,12.05,white);
  T('Hook.',160,410,550,-20,9.3,12.3,white);T('Build.',160,960,550,30,9.65,12.3,white);T('Close.',160,1510,550,70,10.0,12.3,white);
  // Storyboard panels contain THIS film's editable graphics, never old demo photographs.
  var panels=[];
  for(var j=0;j<3;j++){
   var pc=app.project.items.addComp('Editable film frame '+(j+1),500,600,1,D,30);pc.layers.addSolid(surface,'Frame canvas',500,600,1,D);
   text(pc,'0'+(j+1),23,70,55,dim,false);
   if(j===0){text(pc,'Your',75,250,225);text(pc,'next ad.',94,250,330);rect(pc,'Editorial underline',250,420,245,4,gold,null,1);}
   if(j===1){var oldWords=['One','clear','brief.'],newWords=['Every','frame','counts.'];for(var wi=0;wi<3;wi++){var wl=text(pc,oldWords[wi],92,250,200+wi*100),wp=wl.property('ADBE Text Properties').property('ADBE Text Document'),wd=wp.value;wp.setValueAtTime(0,wd);wd.text=newWords[wi];wp.setValueAtTime(16.3+wi*.22,wd);S(wl,[16.25+wi*.22,16.42+wi*.22,16.62+wi*.22],[100,108,100]);}}
   if(j===2){var lm=pc.layers.add(logo);lm.transform.position.setValue([250,265]);var ls=148/logo.height*100;lm.transform.scale.setValue([ls,ls]);var pr=pc.layers.addShape(),pg=pr.property('ADBE Root Vectors Group');pg.addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size').setValue([200,200]);var pst=pg.addProperty('ADBE Vector Graphic - Stroke');pst.property('ADBE Vector Stroke Color').setValue(gold);pst.property('ADBE Vector Stroke Width').setValue(2);pr.transform.position.setValue([250,265]);var pw=text(pc,'GRIFON',55,250,435,white),pd=pw.property('ADBE Text Properties').property('ADBE Text Document'),pv=pd.value;pv.font='Inter-BlackItalic';pd.setValue(pv);}
   var pl=c.layers.add(pc);pl.name='Storyboard frame '+(j+1);pl.threeDLayer=true;pl.motionBlur=true;pl.inPoint=11.9;pl.outPoint=19.25;
   P(pl,[11.9+j*.09,12.6+j*.09,15.85,16.45,18.8,19.25],[[960,660,350],[410+j*550,585,j*35],[410+j*550,585,j*35],[j===1?960:(j===0?-280:2200),560,j===1?-280:450],[j===1?960:(j===0?-280:2200),560,j===1?-280:450],[960,470,650]]);
   S(pl,[11.9+j*.09,12.6+j*.09,15.85,16.45,18.8,19.25],[20,80,80,j===1?119:60,j===1?119:60,45]);
   if(j===1)O(pl,[11.9+j*.09,12.5+j*.09,18.8,19.25],[0,100,100,0]);else O(pl,[11.9+j*.09,12.5+j*.09,15.85,16.35],[0,100,100,0]);keys(pl.transform.yRotation,[11.9,12.8,15.85,16.45,18.8,19.25],[j===0?18:-18,0,0,j===1?0:30,0,-18]);panels.push(pl);
  }
  T('See the sequence.',105,960,185,-20,12.25,16.05,white);
  // Selected panel moves close; its changing words carry the message alone.
  T('Shape it.',164,960,500,-10,19.05,20.1,white);
  T('Time it.',164,960,500,-10,20.0,21.05,white);
  T('Make it yours.',144,960,500,-10,20.95,22.35,white);
  // Final statement with a fast expanding focus frame, then held brand signature.
  T('From brief',125,960,420,0,22.35,25.95,dim);T('to your next ad.',145,960,605,-20,22.6,25.95,white);
  var frame=rect(c,'Closing focus frame',960,530,1550,550,null,gold,35);frame.l.inPoint=22.25;frame.l.outPoint=26.2;O(frame.l,[22.25,22.7,25.55,26.2],[0,100,100,0]);keys(frame.size,[22.25,22.85,25.55,26.2],[[620,440],[1580,560],[1580,560],[2050,1200]]);
  // Actual native AE camera: push to interface, pull to choices, track storyboard depth.
  var cam=c.layers.addCamera('Camera | motivated focus',[960,540]);cam.property('ADBE Camera Options Group').property('ADBE Camera Zoom').setValue(2000);
  var ts=[0,1.1,2.4,3.45,4.05,5.9,6.6,7.1,9.1,9.55,11.8,12.65,15.85,16.5,18.8,19.25,22.25,22.85,25.8,26.4,30];
  var zs=[-2150,-2000,-2000,-2220,-2100,-2050,-2200,-2150,-2250,-2200,-2200,-2200,-2200,-2320,-2320,-2050,-2050,-2200,-2200,-2000,-2000],ps=[],ats=[];
  for(var k=0;k<ts.length;k++){ps.push([960,540,zs[k]]);ats.push([960,540,0]);}P(cam,ts,ps);keys(cam.transform.pointOfInterest,ts,ats);
  var mark=c.layers.add(logo);mark.name='Canonical griffin';mark.transform.position.setValue([640,495]);var ss=154/logo.height*100;mark.transform.scale.setValue([ss,ss]);mark.inPoint=26;O(mark,[26,26.5,30],[0,100,100]);
  var ring=c.layers.addShape();ring.name='Canonical hairline ring';var gg=ring.property('ADBE Root Vectors Group');gg.addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size').setValue([206,206]);var st=gg.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(gold);st.property('ADBE Vector Stroke Width').setValue(2);ring.transform.position.setValue([640,495]);ring.inPoint=26;O(ring,[26,26.5,30],[0,100,100]);
  var brand=text(c,'GRIFON',148,1100,495,white);var bd=brand.property('ADBE Text Properties').property('ADBE Text Document'),bv=bd.value;bv.font='Inter-BlackItalic';bd.setValue(bv);brand.inPoint=26.1;O(brand,[26.1,26.65,30],[0,100,100]);
  var end=text(c,'Your next ad starts here.',46,960,705,dim,false);end.inPoint=26.55;O(end,[26.55,27.0,30],[0,100,100]);
  var beatTimes=[0,1.1,2.45,3.5,6.65,9.1,12.05,16.35,19.05,20,20.95,22.35,26];var beatNames=['Your next','Ad','Starts here','Brief','Angle','Story','Sequence','Focus','Shape','Time','Yours','Outcome','Grifon'];for(var b=0;b<beatTimes.length;b++)c.markerProperty.setValueAtTime(beatTimes[b],new MarkerValue(beatNames[b]));
  var audioNames=['launch-score.wav','launch-sfx.wav'];for(var au=0;au<audioNames.length;au++){var f=new File(base.fsName+'/source/'+audioNames[au]);if(f.exists){var al=c.layers.add(asset(audioNames[au]));al.name=au?'Sound design | separate stem':'Original score | separate stem';al.audio.audioLevels.setValue(au?[3,3]:[4,4]);}}
  c.comment='Original Grifon editorial film. UI is a capture of the actual LaunchScreen component, empty state; no generation run or client outcome implied. No skincare demo assets. Native editable text/shapes/camera. Narration pending approval.';
  var rq=app.project.renderQueue.items.add(c);rq.applyTemplate('Best Settings');var om=rq.outputModule(1),h='';for(var ti=0;ti<om.templates.length;ti++)if(om.templates[ti].indexOf('H.264')>=0){h=om.templates[ti];break;}if(!h)throw Error('H264 template absent');om.applyTemplate(h);om.file=new File(out.fsName+'/Grifon-Your-Next-Ad-v3.mp4');
  app.endUndoGroup();app.project.save(dest);c.time=13.3;c.openInViewer();
  // No saveFrameToPng inside the undo group; preview extraction happens after native rendering.
  log('BUILD PASS\n30s / 1920x1080 / 30fps\n'+c.numLayers+' master layers / '+cam.transform.position.numKeys+' camera position keys\n13 editorial beats. No legacy product photos. Narration pending.');
 }catch(e){try{app.endUndoGroup();}catch(ignore){}log('BUILD FAILED '+e.toString()+' line '+e.line);}
})();
