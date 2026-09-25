/* Grifon native AE typography study. No generated footage or external plug-ins. */
(function () {
    var base = new File($.fileName).parent;
    var output = new Folder(base.fsName + '/output');
    if (!output.exists) output.create();
    if (app.project.numItems !== 0) {
        alert('Grifon pilot requires an empty project. Save your current work and open an empty project first.');
        return;
    }
    var projectFile = new File(output.fsName + '/Grifon-Type-Study.aep');
    if (projectFile.exists) {
        alert('Existing pilot preserved. Rename or move it before rebuilding.');
        return;
    }
    app.beginUndoGroup('Build Grifon typography study');
    var W = 1920, H = 1080, FPS = 30;
    var white = [1,1,1], grey = [0.64,0.64,0.67], gold = [1,0.8,0];
    var font = 'ArialMT', bold = 'Arial-BoldMT';
    var folder = app.project.items.addFolder('GRIFON - editable typography study');
    function comp(name, duration) {
        var c = app.project.items.addComp(name, W, H, 1, duration, FPS);
        c.parentFolder = folder;
        c.bgColor = [9/255,9/255,11/255];
        c.layers.addSolid(c.bgColor, 'Canvas - zinc 950', W, H, 1, duration);
        c.motionBlur = true;
        c.shutterAngle = 180;
        return c;
    }
    function ease(p) {
        for(var k=1;k<=p.numKeys;k++) {
            p.setTemporalEaseAtKey(k,[new KeyframeEase(0,70)],[new KeyframeEase(0,70)]);
        }
    }
    function text(c, name, value, size, position, color, heavy) {
        var l=c.layers.addText(value); l.name=name;
        var p=l.property('ADBE Text Properties').property('ADBE Text Document');
        var d=p.value; d.font=heavy?bold:font; d.fontSize=size;
        d.fillColor=color; d.applyFill=true; d.applyStroke=false;
        d.tracking=-35; d.justification=ParagraphJustification.CENTER_JUSTIFY;
        p.setValue(d);
        var r=l.sourceRectAtTime(0,false);
        l.transform.anchorPoint.setValue([r.left+r.width/2,r.top+r.height/2]);
        l.transform.position.setValue(position); l.motionBlur=true;
        return l;
    }
    function reveal(l,t,position,offset) {
        var p=l.transform.position;
        p.setValueAtTime(t,[position[0],position[1]+offset]);
        p.setValueAtTime(t+0.8,position); ease(p);
        var o=l.transform.opacity;
        o.setValueAtTime(t,0);o.setValueAtTime(t+0.45,100);ease(o);
    }
    function rule(c,name,position,size,color) {
        var l=c.layers.addShape();l.name=name;
        var g=l.property('ADBE Root Vectors Group');
        var rect=g.addProperty('ADBE Vector Shape - Rect');
        rect.property('ADBE Vector Rect Size').setValue(size);
        rect.property('ADBE Vector Rect Roundness').setValue(size[1]/2);
        var fill=g.addProperty('ADBE Vector Graphic - Fill');
        fill.property('ADBE Vector Fill Color').setValue(color);
        l.transform.position.setValue(position);return l;
    }
    var a=comp('01 - Your next big idea',4);
    reveal(text(a,'Your next','Your next',100,[960,405],grey,false),0.15,[960,405],54);
    reveal(text(a,'big idea.','big idea.',196,[960,575],white,true),0.48,[960,575],82);
    var b=comp('02 - Give it direction',4);
    reveal(text(b,'Give it','Give it',96,[960,399],grey,false),0.1,[960,399],50);
    reveal(text(b,'direction.','direction.',186,[960,566],white,true),0.32,[960,566],80);
    var line=rule(b,'Focus underline',[960,695],[750,5],gold);
    line.transform.scale.setValueAtTime(0.7,[0,100]);
    line.transform.scale.setValueAtTime(1.5,[100,100]);
    // AE scale exposes three dimensions even on a 2D layer.
    for(var ki=1;ki<=2;ki++) line.transform.scale.setTemporalEaseAtKey(ki,[new KeyframeEase(0,70),new KeyframeEase(0,70),new KeyframeEase(0,70)],[new KeyframeEase(0,70),new KeyframeEase(0,70),new KeyframeEase(0,70)]);
    var c=comp('03 - Thought to ad',4);
    reveal(text(c,'From a thought.','From a thought.',107,[960,416],grey,false),0.12,[960,416],50);
    reveal(text(c,'To your next ad.','To your next ad.',142,[960,595],white,true),0.85,[960,595],64);
    var d=comp('04 - Grifon signature',4);
    var word=text(d,'GRIFON - draft font','GRIFON',130,[1044,511],white,true);
    var wd=word.property('ADBE Text Properties').property('ADBE Text Document').value;
    wd.font='Arial-BoldItalicMT';
    word.property('ADBE Text Properties').property('ADBE Text Document').setValue(wd);
    reveal(word,0.4,[1044,511],30);
    var logoFile=new File(base.fsName+'/source/logo.png');
    if (!logoFile.exists) throw new Error('Canonical logo missing');
    var logo=app.project.importFile(new ImportOptions(logoFile));logo.parentFolder=folder;
    var mark=d.layers.add(logo);mark.name='Canonical griffin - unchanged pixels';
    var s=110/logo.height*100;mark.transform.scale.setValue([s,s]);
    mark.transform.position.setValue([655,511]);
    reveal(mark,0.2,[655,511],26);
    var ring=d.layers.addShape();ring.name='Canonical thin gold ring';
    var contents=ring.property('ADBE Root Vectors Group');
    var ellipse=contents.addProperty('ADBE Vector Shape - Ellipse');
    ellipse.property('ADBE Vector Ellipse Size').setValue([150,150]);
    var stroke=contents.addProperty('ADBE Vector Graphic - Stroke');
    stroke.property('ADBE Vector Stroke Color').setValue(gold);
    stroke.property('ADBE Vector Stroke Width').setValue(2);
    ring.transform.position.setValue([655,511]);reveal(ring,0.2,[655,511],26);
    reveal(text(d,'Closing line','Give your ideas direction.',44,[960,668],grey,false),1.1,[960,668],20);
    var master=comp('GRIFON - TYPE STUDY - 16s',16);
    var scenes=[a,b,c,d];
    for(var i=0;i<scenes.length;i++) {
        var layer=master.layers.add(scenes[i]);layer.startTime=i*4;
        layer.inPoint=i*4;layer.outPoint=(i+1)*4;
        var marker=new MarkerValue(scenes[i].name);master.markerProperty.setValueAtTime(i*4,marker);
    }
    master.comment='Draft timing study. Arial substituted: install approved Inter before brand-final. Native AE text and shapes; no video generation, soundtrack or final video export.';
    master.time=5.8;master.openInViewer();
    app.project.save(projectFile);
    var report='AE '+app.version+'\nMaster: '+master.name+'\n1920x1080, 30fps, 16s\n';
    for(var si=0;si<scenes.length;si++) {
        report+=scenes[si].name+': '+scenes[si].numLayers+' layers\n';
        for(var li=1;li<=scenes[si].numLayers;li++) {
            var tl=scenes[si].layer(li);
            if(tl instanceof TextLayer) {
                var td=tl.property('ADBE Text Properties').property('ADBE Text Document').value;
                var bounds=tl.sourceRectAtTime(2,false);
                report+='  Text: '+td.text+' | '+td.font+' | width '+Math.round(bounds.width)+'\n';
                if(bounds.width>1680) throw new Error('Text exceeds title safe: '+td.text);
            }
        }
    }
    var rf=new File(output.fsName+'/verification.txt');
    if(rf.open('w')) {rf.write(report);rf.close();}
    a.saveFrameToPng(2,new File(output.fsName+'/01-opening.png'));
    b.saveFrameToPng(2,new File(output.fsName+'/02-direction.png'));
    d.saveFrameToPng(2,new File(output.fsName+'/03-signature.png'));
    app.endUndoGroup();
})();
