(function(){
 var base=new File($.fileName).parent;
 if(!app.project.file || app.project.file.name!=='Grifon-Direction-Camera.aep')throw new Error('Expected camera project');
 var film;
 for(var i=1;i<=app.project.numItems;i++){
  var c=app.project.item(i);
  if(c instanceof CompItem && c.name==='GRIFON | Direction | CAMERA MASTER')film=c;
  if(c instanceof CompItem && c.name==='05 | Words into a script')c.layer('Script sheet').enabled=true;
 }
 var l=film.layer('Editable phone headline'),p=l.property('ADBE Text Properties').property('ADBE Text Document'),d=p.value;d.fontSize=42;p.setValue(d);
 var r=l.sourceRectAtTime(23,false);l.transform.anchorPoint.setValue([r.left+r.width/2,r.top+r.height/2]);l.transform.position.setValue([16415,540,-260]);
 app.project.save();
 film.saveFrameToPng(14.2,new File(base.fsName+'/film/camera-frame-5.png'));
 film.saveFrameToPng(23,new File(base.fsName+'/film/camera-frame-7.png'));
})();
