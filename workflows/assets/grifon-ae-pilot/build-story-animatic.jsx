/* Native AE animatic: one product, one selected line, one connected story.
   Uses existing repository demo assets. No external provider or paid operation. */
(function () {
  var base = new File($.fileName).parent;
  var out = new Folder(base.fsName + '/animatic'); if (!out.exists) out.create();
  var target = new File(out.fsName + '/Grifon-Worth-Seeing-Animatic.aep');
  function report(s) { var f = new File(out.fsName + '/build-status.txt'); if(f.open('w')) { f.write(s); f.close(); } }
  try {
    if (target.exists) throw new Error('Preserve the existing animatic before rebuilding.');
    if (app.project.numItems) app.project.save(new File(out.fsName + '/Previous-Session-' + new Date().getTime() + '.aep'));
    app.newProject(); app.beginUndoGroup('Grifon connected story animatic');
    var W=1920,H=1080,D=30, dark=[9/255,9/255,11/255],white=[1,1,1],grey=[.64,.64,.67],gold=[1,.8,0];
    var main=app.project.items.addComp('GRIFON | Worth seeing | ANIMATIC',W,H,1,D,30);
    main.bgColor=dark;main.motionBlur=true;main.shutterAngle=120;
    main.layers.addSolid(dark,'Charcoal canvas',W,H,1,D);
    function ease(p){var dims=p.keyInTemporalEase(1).length;var es=[];for(var j=0;j<dims;j++)es.push(new KeyframeEase(0,68));for(var i=1;i<=p.numKeys;i++)p.setTemporalEaseAtKey(i,es,es);}
    function keys(p,t,v){for(var i=0;i<t.length;i++)p.setValueAtTime(t[i],v[i]);ease(p);}
    function pos(l,t,v){keys(l.transform.position,t,v);}
    function opacity(l,t,v){keys(l.transform.opacity,t,v);}
    function scale(l,t,v){var vs=[];for(var i=0;i<v.length;i++)vs.push([v[i],v[i],v[i]]);keys(l.transform.scale,t,vs);}
    function nativeText(str,size,p,bold,color){var l=main.layers.addText(str);l.name=str;var doc=l.property('ADBE Text Properties').property('ADBE Text Document'),d=doc.value;d.font=bold?'Inter-Bold':'Inter-Regular';d.fontSize=size;d.fillColor=color||white;d.tracking=-35;d.justification=ParagraphJustification.LEFT_JUSTIFY;doc.setValue(d);var r=l.sourceRectAtTime(0,false);l.transform.anchorPoint.setValue([r.left,r.top+r.height/2]);l.threeDLayer=true;l.transform.position.setValue(p);l.motionBlur=true;return l;}
    function headline(str,size,p,start,end,bold,color){var l=nativeText(str,size,p,bold,color);opacity(l,[Math.max(0,start),start+.25,end-.2,end],[0,100,100,0]);pos(l,[start,start+.45,end-.3,end],[[p[0],p[1]+45,p[2]],p,p,[p[0],p[1]-45,p[2]]]);return l;}
    function box(name,p,size,fill,stroke,radius){var l=main.layers.addShape();l.name=name;l.threeDLayer=true;l.motionBlur=true;l.transform.position.setValue(p);var g=l.property('ADBE Root Vectors Group');var r=g.addProperty('ADBE Vector Shape - Rect');r.property('ADBE Vector Rect Size').setValue(size);r.property('ADBE Vector Rect Roundness').setValue(radius||0);if(fill)g.addProperty('ADBE Vector Graphic - Fill').property('ADBE Vector Fill Color').setValue(fill);if(stroke){var s=g.addProperty('ADBE Vector Graphic - Stroke');s.property('ADBE Vector Stroke Color').setValue(stroke);s.property('ADBE Vector Stroke Width').setValue(3);}r=g.property(1);return {layer:l,size:r.property('ADBE Vector Rect Size'),radius:r.property('ADBE Vector Rect Roundness')};}
    function importFile(f){if(!f.exists)throw new Error('Missing asset '+f.fsName);return app.project.importFile(new ImportOptions(f));}
    var root=base.parent.parent.parent;
    var pack=importFile(new File(root.fsName+'/public/examples/ex-product-packaging.png'));
    var use=importFile(new File(root.fsName+'/public/examples/ex-product-inuse.png'));
    function photo(item,name,cw,ch){var c=app.project.items.addComp(name,cw,ch,1,D,30);var l=c.layers.add(item),s=Math.max(cw/item.width,ch/item.height)*100;l.transform.scale.setValue([s,s]);l.transform.position.setValue([cw/2,ch/2]);return c;}
    var packC=photo(pack,'DEMO | Product pack',520,660),useC=photo(use,'DEMO | Product in use',520,660);
    var hero=main.layers.add(packC);hero.name='Persistent product photograph';hero.threeDLayer=true;hero.motionBlur=true;
    pos(hero,[0,.8,2.8,3.55,6.8,7.5,10.9,12.4,16.3,17.5,21.8,23,25.5,26.2],[[1430,540,0],[1370,540,0],[1370,540,0],[1470,530,30],[1470,530,30],[1540,500,90],[1540,500,90],[420,610,0],[420,610,0],[180,720,160],[180,720,160],[960,565,0],[960,565,0],[960,510,0]]);
    scale(hero,[0,1,2.8,3.55,6.8,7.5,10.9,12.4,16.3,17.5,21.8,23,25.5,26.2],[148,95,95,75,75,48,48,72,72,42,42,90,90,70]);
    opacity(hero,[0,.2,25.5,26.2],[100,100,100,0]);
    var focus=box('Selection frame becomes the story frame',[1370,540,-10],[560,700],null,gold,20);
    opacity(focus.layer,[0,.5,25.6,26.2],[0,100,100,0]);
    pos(focus.layer,[0,2.8,3.55,6.8,7.5,10.9,12.4,16.3,17.4,21.8,23,25.6],[[1370,540,-10],[1370,540,-10],[590,510,-10],[590,510,-10],[790,440,-10],[790,440,-10],[420,610,-10],[420,610,-10],[960,560,-30],[960,560,-30],[960,565,-10],[960,565,-10]]);
    keys(focus.size,[0,2.8,3.55,6.8,7.5,10.9,12.4,16.3,17.4,21.8,23],[[560,700],[560,700],[840,110],[840,110],[980,470],[980,470],[400,500],[400,500],[650,750],[650,750],[495,625]]);
    headline('Your business.',112,[190,398,-20],0,3.2,false,grey);
    headline('Worth seeing.',142,[190,553,-20],.35,3.2,true,white);
    headline('Find your angle.',98,[175,245,-20],3.2,7.0,true,white);
    var rejectedA=headline('A product you believe in.',47,[185,380,0],3.5,6.5,false,grey);
    var selected=nativeText('A simple daily ritual.',60,[190,510,-22],true,white);
    opacity(selected,[3.5,3.85,11.1,11.85],[0,100,100,0]);
    pos(selected,[3.5,3.9,6.8,7.5,11.1,11.85],[[190,550,-22],[190,510,-22],[190,510,-22],[335,322,-22],[335,322,-22],[335,280,-22]]);
    headline('A story worth telling.',47,[185,642,0],3.75,6.5,false,grey);
    headline('Make it a story.',89,[310,145,-20],7.15,11.6,true,white);
    headline('One moment for yourself.',47,[335,448,-22],8.0,11.6,false,white);
    headline('Make it part of your day.',47,[335,557,-22],8.55,11.6,false,grey);
    headline('See every scene.',99,[520,178,-20],11.5,17.0,true,white);
    var shotB=main.layers.add(useC);shotB.name='Scene two | detail';shotB.threeDLayer=true;shotB.motionBlur=true;
    var shotC=main.layers.add(packC);shotC.name='Scene three | return';shotC.threeDLayer=true;shotC.motionBlur=true;
    pos(shotB,[11.5,12.45,16.3,17.4,21.8,23,25.5,26.2],[[570,610,60],[960,610,60],[960,610,60],[960,560,0],[960,560,0],[1540,650,130],[1540,650,130],[1540,580,130]]);
    scale(shotB,[11.5,12.45,16.3,17.4,21.8,23],[15,72,72,108,108,42]);
    opacity(shotB,[11.5,12.15,25.5,26.2],[0,100,100,0]);
    pos(shotC,[11.7,12.65,16.3,17.4,21.8,23,25.5,26.2],[[680,610,100],[1500,610,0],[1500,610,0],[1740,720,160],[1740,720,160],[380,650,130],[380,650,130],[380,580,130]]);
    scale(shotC,[11.7,12.65,16.3,17.4,21.8,23],[15,72,72,42,42,42]);
    opacity(shotC,[11.7,12.3,25.5,26.2],[0,100,100,0]);
    headline('THE PRODUCT',27,[235,920,-20],12.4,16.8,true,grey);
    headline('THE MOMENT',27,[775,920,-20],12.55,16.8,true,grey);
    headline('THE RETURN',27,[1310,920,-20],12.7,16.8,true,grey);
    headline('Shape',100,[140,385,-20],17.15,22.0,true,white);
    headline('the moment.',80,[140,505,-20],17.3,22.0,false,white);
    headline('Your product.',88,[165,215,-20],22.4,26.2,true,white);
    headline('A story to share.',58,[165,319,-20],22.7,26.2,false,grey);
    // Short, motivated focus moves; the brand close is fixed and legible.
    var cam=main.layers.addCamera('Camera | product to chosen words to scene',[960,540]);
    cam.property('ADBE Camera Options Group').property('ADBE Camera Zoom').setValue(2000);
    var ct=[0,.9,5.8,6.5,6.8,7.5,10.9,12.4,16.3,17.4,21.8,23,26.2,30];
    var aim=[[960,540,0],[960,540,0],[960,540,0],[700,510,0],[700,510,0],[960,540,0],[960,540,0],[960,540,0],[960,540,0],[1040,550,0],[1040,550,0],[960,540,0],[960,540,0],[960,540,0]];
    var zz=[-2150,-2000,-2000,-1730,-1730,-2100,-2100,-2250,-2250,-1930,-1930,-2150,-2000,-2000],cv=[];
    for(var i=0;i<aim.length;i++)cv.push([aim[i][0],aim[i][1],zz[i]]);
    keys(cam.transform.position,ct,cv);keys(cam.transform.pointOfInterest,ct,aim);
    var logo=importFile(new File(base.fsName+'/source/logo.png'));var mark=main.layers.add(logo);mark.name='Canonical Grifon mark';mark.transform.position.setValue([590,495]);var ms=150/logo.height*100;mark.transform.scale.setValue([ms,ms]);opacity(mark,[26.1,26.6,30],[0,100,100]);
    var brand=nativeText('GRIFON AI',130,[760,495,0],true,white);brand.threeDLayer=false;brand.transform.position.setValue([760,495]);var bp=brand.property('ADBE Text Properties').property('ADBE Text Document'),bd=bp.value;bd.font='Inter-BlackItalic';bp.setValue(bd);opacity(brand,[26.15,26.7,30],[0,100,100]);
    var close=nativeText('Your next ad starts here.',49,[660,665,0],false,grey);close.threeDLayer=false;close.transform.position.setValue([660,665]);opacity(close,[26.8,27.3,30],[0,100,100]);
    var label=nativeText('ANIMATIC / ILLUSTRATIVE DEMO ASSETS / AUDIO PENDING',19,[48,1032,0],false,grey);label.threeDLayer=false;label.transform.position.setValue([48,1032]);
    var beats=[0,3.2,7,11.5,17,22.5,26.2],names=['Product','Angle','Script','Storyboard','Focus','Result','Brand'];for(var i=0;i<beats.length;i++)main.markerProperty.setValueAtTime(beats[i],new MarkerValue(names[i]));
    main.comment='Timing study, not final. Demo photos from public/examples. Native editable text and shapes. No live product output claim. Narration/music pending.';
    main.time=14;main.openInViewer();app.project.save(target);
    var frames=[1.8,4.7,9.5,14,19.3,24.1,28.2];for(var i=0;i<frames.length;i++)main.saveFrameToPng(frames[i],new File(out.fsName+'/frame-'+(i+1)+'.png'));
    var rq=app.project.renderQueue.items.add(main);rq.applyTemplate('Best Settings');var om=rq.outputModule(1),choice='';for(var j=0;j<om.templates.length;j++){if(om.templates[j].indexOf('H.264')>=0){choice=om.templates[j];break;}}if(!choice)throw new Error('Native H264 template unavailable');om.applyTemplate(choice);om.file=new File(out.fsName+'/Grifon-Worth-Seeing-Animatic.mp4');
    app.project.save(target);app.endUndoGroup();report('BUILD PASS\n30s / 1920x1080 / 30fps\nNative editable AE layers, continuous product and selection frame.\nCamera '+cam.transform.position.numKeys+' position keys.\nAudio intentionally pending; animatic is not a final film.');
  }catch(e){try{app.endUndoGroup();}catch(ignore){}report('BUILD FAILED '+e.toString()+' line '+e.line);}
})();
