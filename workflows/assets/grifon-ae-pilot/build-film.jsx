/* Original Grifon film: native editable AE text, geometry and sound stems. */
(function(){
 var base=new File($.fileName).parent, out=new Folder(base.fsName+'/film');if(!out.exists)out.create();
 var target=new File(out.fsName+'/Grifon-Direction-30s-v3.aep');
 function log(s){var f=new File(out.fsName+'/build-status.txt');if(f.open('w')){f.write(s);f.close();}}
 try{
 if(target.exists)throw new Error('Output exists. Preserve it before an intentional rebuild.');
 // Save a copy of the current session before starting a separate project.
 if(app.project.numItems){var backup=new File(out.fsName+'/Previous-Session-'+new Date().getTime()+'.aep');app.project.save(backup);}
 app.newProject(); app.beginUndoGroup('Grifon - Direction');
 var W=1920,H=1080, white=[1,1,1], muted=[.64,.64,.67], gold=[1,.8,0], dark=[9/255,9/255,11/255];
 var group=app.project.items.addFolder('GRIFON | Direction'), report=[];
 function comp(name,d){var c=app.project.items.addComp(name,W,H,1,d,30);c.parentFolder=group;c.bgColor=dark;c.motionBlur=true;c.shutterAngle=180;c.layers.addSolid(dark,'Canvas',W,H,1,d);return c;}
 function smooth(p){var dims=(p.propertyValueType===PropertyValueType.ThreeD)?3:(p.propertyValueType===PropertyValueType.TwoD?2:1);var e=[];for(var j=0;j<dims;j++)e.push(new KeyframeEase(0,72));for(var i=1;i<=p.numKeys;i++)p.setTemporalEaseAtKey(i,e,e);}
 function keys(p,t,v){for(var i=0;i<t.length;i++)p.setValueAtTime(t[i],v[i]);smooth(p);}
 function txt(c,str,size,x,y,color,bold,align){var l=c.layers.addText(str);l.name=str;var p=l.property('ADBE Text Properties').property('ADBE Text Document'),d=p.value;d.font=bold?'Inter-Bold':'Inter-Regular';d.fontSize=size;d.fillColor=color||white;d.applyFill=true;d.applyStroke=false;d.tracking=-40;d.justification=align===0?ParagraphJustification.LEFT_JUSTIFY:ParagraphJustification.CENTER_JUSTIFY;p.setValue(d);var r=l.sourceRectAtTime(0,false);l.transform.anchorPoint.setValue([align===0?r.left:r.left+r.width/2,r.top+r.height/2]);l.transform.position.setValue([x,y]);l.motionBlur=true;report.push(str+' | '+p.value.font+' | '+Math.round(r.width));return l;}
 function enter(l,t,dx,dy){var v=l.transform.position.value;keys(l.transform.position,[t,t+.55],[[v[0]+(dx||0),v[1]+(dy===undefined?55:dy)],v]);keys(l.transform.opacity,[t,t+.24],[0,100]);}
 function exit(l,t,dx,dy){var v=l.transform.position.valueAtTime(t,false);keys(l.transform.position,[t,t+.4],[v,[v[0]+(dx||0),v[1]+(dy===undefined?-55:dy)]]);keys(l.transform.opacity,[t,t+.3],[100,0]);}
 function shape(c,name,x,y,w,h,fill,stroke,radius){var l=c.layers.addShape();l.name=name;var g=l.property('ADBE Root Vectors Group');var r=g.addProperty('ADBE Vector Shape - Rect');r.property('ADBE Vector Rect Size').setValue([w,h]);r.property('ADBE Vector Rect Roundness').setValue(radius||0);if(fill){var f=g.addProperty('ADBE Vector Graphic - Fill');f.property('ADBE Vector Fill Color').setValue(fill);}if(stroke){var s=g.addProperty('ADBE Vector Graphic - Stroke');s.property('ADBE Vector Stroke Color').setValue(stroke);s.property('ADBE Vector Stroke Width').setValue(2);}l.transform.position.setValue([x,y]);l.motionBlur=true;return l;}
 function scale(l,t0,t1,a,b){keys(l.transform.scale,[t0,t1],[[a,a,100],[b,b,100]]);}
 function circle(c,name,x,y,size,color){var l=c.layers.addShape();l.name=name;var g=l.property('ADBE Root Vectors Group');g.addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size').setValue([size,size]);g.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(color);l.transform.position.setValue([x,y]);return l;}
 function label(c,s,x,y){return txt(c,s,29,x,y,muted,false);}
 var scenes=[];
 var a=comp('01 | A beginning',2.6);scenes.push(a);
 var l=txt(a,'It starts',126,275,434,muted,false,0);enter(l,.1,0,36);
 l=txt(a,'with an idea.',166,275,606,white,true,0);enter(l,.48,0,70);
 var cursorX=275+l.sourceRectAtTime(0,false).width+32;
 var cursor=shape(a,'Idea cursor',cursorX,606,5,147,gold);keys(cursor.transform.opacity,[0,.45,.7,1,2.3,2.75],[0,0,100,100,100,0]);
 var b=comp('02 | Find the signal',2.4);scenes.push(b);
 var words=['An audience.','A message.','A story.'];
 for(var i=0;i<3;i++){l=txt(b,words[i],110,960,335+i*190,i===1?white:muted,i===1);enter(l,.02+i*.1,(i-1)*170,35);exit(l,1.85+i*.05,0,-30);}
 var c=comp('03 | Direction',3.4);scenes.push(c);
 l=txt(c,'Give it',100,960,400,muted,false);enter(l,.08,0,40);
 l=txt(c,'direction.',188,960,572,white,true);enter(l,.25,0,80);
 var underline=shape(c,'Focus',960,712,790,4,gold);keys(underline.transform.scale,[.45,1.1,2.9,3.35],[[0,100,100],[100,100,100],[100,100,100],[245,100,100]]);
 var d=comp('04 | Audience',4);scenes.push(d);
 l=txt(d,'Know who',104,245,405,muted,false,0);enter(l,.1,0,42);
 l=txt(d,"you're talking to.",112,245,550,white,true,0);enter(l,.28,0,55);
 for(var i=0;i<5;i++)for(var j=0;j<5;j++){var x=1380+i*76,y=345+j*78;var dot=circle(d,'Audience '+i+' '+j,x,y,(i===2&&j===2)?26:12,(i===2&&j===2)?gold:[.28,.28,.30]);keys(dot.transform.position,[.15+(i+j)*.05,1.4+(i+j)*.04],[[1560+(i-2)*175,501+(j-2)*150],[x,y]]);keys(dot.transform.opacity,[.1+(i+j)*.04,1.1+(i+j)*.04],[0,100]);}
 var e=comp('05 | Words into a script',4);scenes.push(e);
 l=txt(e,'Find the',88,245,410,muted,false,0);enter(l,.1,-60,0);
 l=txt(e,'right words.',112,245,556,white,true,0);enter(l,.28,-60,0);
 var paper=shape(e,'Script sheet',1340,530,530,670,[.095,.095,.108],[.22,.22,.24],28);enter(paper,.18,0,80);
 var scriptTitle=txt(e,'Your next story.',48,1340,312,white,true);enter(scriptTitle,.52,0,20);
 for(var i=0;i<7;i++){var rw=i===2?330:i===6?230:400;l=shape(e,'Editable script line '+i,1340-(400-rw)/2,410+i*54,rw,7,i===0?[.73,.73,.76]:[.28,.28,.31],null,4);keys(l.transform.scale,[.65+i*.12,1.15+i*.12],[[0,100,100],[100,100,100]]);}
 var f=comp('06 | A storyboard takes shape',5);scenes.push(f);
 l=txt(f,'Watch it take shape.',96,960,240,white,true);enter(l,.1,0,45);
 var sheet=shape(f,'Idea expands into script then storyboard',960,610,60,60,[.075,.075,.085],gold,30);
 var rect=sheet.property('ADBE Root Vectors Group').property(1);
 keys(rect.property('ADBE Vector Rect Size'),[.1,.9,1.8,2.65],[[60,60],[760,400],[760,400],[470,350]]);
 keys(rect.property('ADBE Vector Rect Roundness'),[.1,.9],[30,22]);
 keys(sheet.transform.position,[1.8,2.65],[[960,610],[420,610]]);
 var heading=txt(f,'Your story.',55,960,510,white,true);enter(heading,.75,0,20);keys(heading.transform.position,[1.8,2.65],[[960,510],[420,510]]);
 for(var i=0;i<4;i++){
   var row=shape(f,'Script develops '+i,960,595+i*42,570-i*40,6,[.42,.42,.46],null,3);
   keys(row.transform.scale,[.9+i*.09,1.25+i*.09,1.8,2.65],[[0,100,100],[100,100,100],[100,100,100],[55,100,100]]);
   keys(row.transform.position,[1.8,2.65],[[960,595+i*42],[420,595+i*42]]);
 }
 for(var i=1;i<3;i++){
   var x=420+i*540;var card=shape(f,'Story develops - panel '+(i+1),x,610,470,350,[.075,.075,.085],[.23,.23,.26],22);
   enter(card,1.95+i*.13,-540*i,0);
   var title=txt(f,i===1?'The moment.':'The reveal.',51,x,510,white,true);enter(title,2.3+i*.12,0,25);
   if(i===1){for(var j=0;j<5;j++){var bar=shape(f,'Visual rhythm '+j,x+(j-2)*50,650,13,50+Math.sin(j+1)*80+60,[.6,.6,.64],null,6);enter(bar,2.35+j*.07,0,30);}}
   else {var dot=circle(f,'The focal point',x,655,65,gold);enter(dot,2.65,0,20);scale(dot,2.65,3.25,10,100);}
 }
 var g=comp('07 | The payoff',4);scenes.push(g);
 l=txt(g,'From first thought.',103,960,410,muted,false);enter(l,.08,0,42);exit(l,2.9,0,-42);
 l=txt(g,'To your next ad.',147,960,579,white,true);enter(l,.55,0,65);exit(l,3.05,0,-60);
 var h=comp('08 | Grifon',4.6);scenes.push(h);
 var logoFile=new File(base.fsName+'/source/logo.png');var logo=app.project.importFile(new ImportOptions(logoFile));logo.parentFolder=group;var mark=h.layers.add(logo);var ms=122/logo.height*100;mark.transform.scale.setValue([ms,ms]);mark.transform.position.setValue([630,490]);enter(mark,.12,0,24);
 var ring=h.layers.addShape();ring.name='Canonical gold hairline';var rc=ring.property('ADBE Root Vectors Group');rc.addProperty('ADBE Vector Shape - Ellipse').property('ADBE Vector Ellipse Size').setValue([166,166]);var rs=rc.addProperty('ADBE Vector Graphic - Stroke');rs.property('ADBE Vector Stroke Color').setValue(gold);rs.property('ADBE Vector Stroke Width').setValue(2);ring.transform.position.setValue([630,490]);enter(ring,.12,0,24);
 l=txt(h,'GRIFON',147,1040,490,white,true);var td=l.property('ADBE Text Properties').property('ADBE Text Document');var dv=td.value;dv.font='Inter-BlackItalic';td.setValue(dv);enter(l,.28,0,24);
 l=txt(h,'Give your ideas direction.',43,960,660,muted,false);enter(l,.8,0,20);
 var main=comp('GRIFON | Direction | 30 seconds',30), start=0;
 for(var i=0;i<scenes.length;i++){var sl=main.layers.add(scenes[i]);sl.startTime=start;sl.inPoint=start;sl.outPoint=Math.min(30,start+scenes[i].duration);main.markerProperty.setValueAtTime(start,new MarkerValue(scenes[i].name));start+=scenes[i].duration;}
 if(Math.abs(start-30)>.001)throw new Error('Duration mismatch '+start);
 function audio(filename,name,db){var af=new File(base.fsName+'/source/'+filename);if(!af.exists)throw new Error('Missing audio '+filename);var item=app.project.importFile(new ImportOptions(af));item.parentFolder=group;var layer=main.layers.add(item);layer.name=name;layer.outPoint=30;layer.property('ADBE Audio Group').property('ADBE Audio Levels').setValue([db,db]);return layer;}
 audio('direction-score.wav','MUSIC | original procedural composition',0);
 audio('direction-transitions.wav','SFX | quiet transition cues',0);
 main.comment='Original Grifon pilot. Native text and shapes. Abstract storyboard illustration, not a product screenshot. Narration pending voice/cost approval. Music is original procedural composition; audition required.';
 main.time=15.8;main.openInViewer();app.project.save(target);
 var rf=new File(out.fsName+'/verification.txt');if(rf.open('w')){rf.write('AE '+app.version+'\nDuration '+start+'\n1920x1080 30fps\n'+report.join('\n'));rf.close();}
 var times=[1.6,3.9,6.8,10.5,14.5,19.8,23.1,28];for(var i=0;i<times.length;i++)main.saveFrameToPng(times[i],new File(out.fsName+'/frame-'+(i+1)+'.png'));
 var rq=app.project.renderQueue.items.add(main);rq.applyTemplate('Best Settings');var om=rq.outputModule(1);var names=om.templates;var chosen='';for(var i=0;i<names.length;i++){if(names[i].indexOf('H.264')>=0){chosen=names[i];break;}}
 if(chosen){om.applyTemplate(chosen);om.file=new File(out.fsName+'/Grifon-Direction-30s-v3.mp4');}else{om.applyTemplate('Lossless');om.file=new File(out.fsName+'/Grifon-Direction-30s-v3.avi');}
 app.project.save(target);log('BUILD PASS\nRender template '+(chosen||'Lossless')+'\n'+report.join('\n'));app.endUndoGroup();
 }catch(err){log('BUILD FAILED: '+err.toString()+' at '+err.line);try{app.endUndoGroup();}catch(ignore){}}
})();
