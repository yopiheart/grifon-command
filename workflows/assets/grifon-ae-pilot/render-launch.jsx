(function(){
 var out=new Folder(new File($.fileName).parent.fsName+'/launch');
 function report(s){var f=new File(out.fsName+'/render-status.txt');if(f.open('w')){f.write(s);f.close();}}
 try{
  if(!app.project.file||app.project.file.name!=='Grifon-Your-Next-Ad-v3.aep')throw Error('Open the saved Grifon launch v3 project first.');
  var q=app.project.renderQueue;if(q.numItems!==1)throw Error('Expected exactly one launch render item.');
  var item=q.item(1);if(item.comp.name!=='GRIFON | Your next ad | 30s')throw Error('Wrong master composition.');
  if(item.status===RQItemStatus.DONE&&item.outputModule(1).file.exists){report('RENDER PASS / already completed; verify file decode separately');return;}
  if(item.outputModule(1).file.exists)throw Error('Preserve existing unfinished render before retrying.');
  report('RENDERING');q.render();
  report(item.status===RQItemStatus.DONE?'RENDER PASS / 900 frames / native AE':'RENDER NOT COMPLETE / status '+item.status);
  app.project.save();
 }catch(e){report('RENDER FAILED '+e.toString());}
})();
