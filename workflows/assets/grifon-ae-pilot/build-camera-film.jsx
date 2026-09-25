/* Camera-led revision. Builds a connected 2.5D stage from editable scene comps. */
(function(){
 var base=new File($.fileName).parent,out=new Folder(base.fsName+'/film');
 var dest=new File(out.fsName+'/Grifon-Direction-Camera.aep');
 function note(v){var f=new File(out.fsName+'/camera-status.txt');if(f.open('w')){f.write(v);f.close();}}
 try{
 if(dest.exists)throw new Error('Camera project exists; preserve before rebuilding.');
 if(!app.project.file || app.project.file.name!=='Grifon-Direction-30s-v3.aep')throw new Error('Open the v3 pilot before this revision.');
 app.project.save();app.beginUndoGroup('Camera-led Grifon film');
 var scenes=[],oldMaster=null,root=null;
 for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof CompItem){if(/^0[1-8] \|/.test(it.name))scenes.push(it);if(it.name==='GRIFON | Direction | 30 seconds')oldMaster=it;}}
 scenes.sort(function(a,b){return a.name<b.name?-1:1;});if(scenes.length!==8)throw new Error('Expected eight scenes');
 function ease(p){var d=p.propertyValueType===PropertyValueType.ThreeD?3:p.propertyValueType===PropertyValueType.TwoD?2:1;var e=[];for(var j=0;j<d;j++)e.push(new KeyframeEase(0,62));for(var k=1;k<=p.numKeys;k++)p.setTemporalEaseAtKey(k,e,e);}
 function keys(p,ts,vs){for(var k=0;k<ts.length;k++)p.setValueAtTime(ts[k],vs[k]);ease(p);}
 function importAsset(name){var f=new File(base.fsName+'/source/'+name);if(!f.exists)throw new Error('Asset missing '+name);return app.project.importFile(new ImportOptions(f));}
 function text(c,str,size,pos,font){var l=c.layers.addText(str),p=l.property('ADBE Text Properties').property('ADBE Text Document'),d=p.value;d.font=font||'Inter-Bold';d.fontSize=size;d.fillColor=[1,1,1];d.justification=ParagraphJustification.CENTER_JUSTIFY;d.tracking=-35;p.setValue(d);var r=l.sourceRectAtTime(0,false);l.transform.anchorPoint.setValue([r.left+r.width/2,r.top+r.height/2]);l.transform.position.setValue(pos);return l;}
 var film=app.project.items.addComp('GRIFON | Direction | CAMERA MASTER',1920,1080,1,30,30);
 film.bgColor=[9/255,9/255,11/255];film.motionBlur=true;film.shutterAngle=180;
 film.layers.addSolid(film.bgColor,'World background',1920,1080,1,30);
 var camera=film.layers.addCamera('CAMERA | Follow the idea',[960,540]);
 camera.property('ADBE Camera Options Group').property('ADBE Camera Zoom').setValue(2200);
 var starts=[0,2.6,5,8.4,12.4,16.4,21.4,25.4];
 var centers=[[960,540,0],[3460,450,100],[5960,700,-120],[8460,700,80],[10960,450,0],[13460,750,150],[15960,540,-80],[18460,540,0]];
 var pt=[],pv=[],at=[],av=[],zt=[],zv=[];
 for(var s=0;s<8;s++){
  var sc=scenes[s];
  for(var j=1;j<=sc.numLayers;j++){if(sc.layer(j).name==='Canvas')sc.layer(j).enabled=false;}
  var layer=film.layers.add(sc);layer.name='WORLD '+sc.name;layer.threeDLayer=true;layer.motionBlur=true;
  layer.transform.position.setValue(centers[s]);layer.timeRemapEnabled=true;
  layer.property('ADBE Time Remapping').expression='Math.max(0,Math.min('+String(sc.duration-1/30)+',time-'+String(Math.max(0,starts[s]-.4))+'))';
  layer.inPoint=0;layer.outPoint=30;
  var end=s===7?30:starts[s+1];var cx=centers[s][0],cy=centers[s][1],cz=centers[s][2];
  var arrival=starts[s]+(s===0?0:.24),departure=end-(s===7?0:.68);
  pt.push(arrival);pv.push([cx,cy,cz-2300]);at.push(arrival);av.push([cx,cy,cz]);zt.push(arrival);zv.push(0);
  pt.push(departure);pv.push([cx+28,cy-10,cz-2130]);at.push(departure);av.push([cx+28,cy-10,cz]);zt.push(departure);zv.push(0);
  film.markerProperty.setValueAtTime(starts[s],new MarkerValue(sc.name));
 }
 keys(camera.transform.position,pt,pv);keys(camera.transform.pointOfInterest,at,av);keys(camera.transform.zRotation,zt,zv);
 // Independent foreground objects establish depth and parallax, not baked footage.
 var phone=importAsset('phone.png'),paper=importAsset('paper.png');
 var ph=film.layers.add(phone);ph.name='Phone | generated illustrative prop';ph.threeDLayer=true;ph.motionBlur=true;ph.transform.position.setValue([centers[6][0]+475,centers[6][1],-240]);ph.transform.scale.setValue([54,54,54]);ph.transform.yRotation.setValue(-8);
 keys(ph.transform.zRotation,[20.8,23.2,25.3],[8,0,-4]);
 // Move payoff copy left to make room for the phone and reduce its scale.
 var payoff=scenes[6];
 for(var i=1;i<=payoff.numLayers;i++){var l=payoff.layer(i);if(l instanceof TextLayer){var prop=l.property('ADBE Text Properties').property('ADBE Text Document'),d=prop.value;d.fontSize=d.text.indexOf('From')===0?79:104;prop.setValue(d);var rr=l.sourceRectAtTime(2,false);l.transform.anchorPoint.setValue([rr.left+rr.width/2,rr.top+rr.height/2]);var pos=l.transform.position;for(var k=1;k<=pos.numKeys;k++){var p=pos.keyValue(k);pos.setValueAtKey(k,[470,p[1]]);}}}
 var onphone=text(film,'Your idea.\rIn motion.',42,[centers[6][0]+455,centers[6][1]],'Inter-Bold');onphone.name='Editable phone headline';onphone.threeDLayer=true;onphone.transform.position.setValue([centers[6][0]+455,centers[6][1],-260]);onphone.transform.yRotation.setValue(-8);onphone.transform.zRotation.expression='thisComp.layer("Phone | generated illustrative prop").transform.zRotation';
 var pp=film.layers.add(paper);pp.name='Paper | generated illustrative prop';pp.threeDLayer=true;pp.transform.position.setValue([centers[4][0]+480,centers[4][1]+50,230]);pp.transform.scale.setValue([63,63,63]);pp.transform.yRotation.setValue(-14);pp.transform.zRotation.setValue(7);
 // Paper asset carries the physical metaphor; native script lines remain editable above it.
 var script=scenes[4];for(var j=1;j<=script.numLayers;j++){if(script.layer(j).name==='Script sheet')script.layer(j).enabled=true;}
 // Foreground wayfinding bars drift at a different depth during camera travel.
 for(var n=0;n<7;n++){var bar=film.layers.addShape();bar.name='Depth marker '+(n+1);var v=bar.property('ADBE Root Vectors Group');var r=v.addProperty('ADBE Vector Shape - Rect');r.property('ADBE Vector Rect Size').setValue([6,165]);r.property('ADBE Vector Rect Roundness').setValue(3);v.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue([.22,.22,.25]);bar.threeDLayer=true;bar.transform.position.setValue([centers[n][0]+1200,540,-460]);}
 // Keep music and SFX as independent editable audio layers.
 for(var i=1;i<=oldMaster.numLayers;i++){var l=oldMaster.layer(i);if(l.hasAudio && l.source instanceof FootageItem){var a=film.layers.add(l.source);a.name=l.name;a.outPoint=30;}}
 // Exclude earlier masters from the queued render; all remain editable.
 for(var i=1;i<=app.project.renderQueue.numItems;i++)app.project.renderQueue.item(i).render=false;
 var rq=app.project.renderQueue.items.add(film);rq.applyTemplate('Best Settings');var om=rq.outputModule(1),names=om.templates,chosen='';for(var i=0;i<names.length;i++)if(names[i].indexOf('H.264')>=0){chosen=names[i];break;}
 if(!chosen)throw new Error('Native H264 template missing');om.applyTemplate(chosen);om.file=new File(out.fsName+'/Grifon-Direction-Camera.mp4');
 film.time=22.7;film.openInViewer();app.project.save(dest);
 var shots=[1.4,3.7,6.5,10.1,14.2,19.8,23,27.5];for(var i=0;i<shots.length;i++)film.saveFrameToPng(shots[i],new File(out.fsName+'/camera-frame-'+(i+1)+'.png'));
 app.endUndoGroup();note('PASS: actual AE camera; '+camera.transform.position.numKeys+' position keys; '+camera.transform.pointOfInterest.numKeys+' point-of-interest keys; 8 world planes; phone/paper/depth markers independent 3D layers.\nMusic remains a procedural sketch. Narration absent. Generated objects are illustrations, not product proof.');
 }catch(e){try{app.endUndoGroup();}catch(ignore){}note('ERROR '+e.toString()+' line '+e.line);}
})();
