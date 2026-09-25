(function(){
 var base=new File($.fileName).parent,out=new Folder(base.fsName+'/launch'),pkg=new Folder(out.fsName+'/package');
 var dest=new File(pkg.fsName+'/Grifon-Your-Next-Ad.aep');
 function report(s){var f=new File(out.fsName+'/package-status.txt');if(f.open('w')){f.write(s);f.close();}}
 try{
  if(!app.project.file||app.project.file.name!=='Grifon-Your-Next-Ad-v3.aep')throw Error('Open launch v3 before packaging.');
  if(dest.exists)throw Error('Package already exists; preserve it first.');
  app.project.save();if(!pkg.exists)pkg.create();var assets=new Folder(pkg.fsName+'/Footage');if(!assets.exists)assets.create();var count=0;
  for(var i=1;i<=app.project.numItems;i++){var it=app.project.item(i);if(it instanceof FootageItem&&it.file){var dst=new File(assets.fsName+'/'+it.file.name);if(dst.exists)throw Error('Duplicate footage filename '+dst.name);if(!it.file.copy(dst.fsName))throw Error('Copy failed '+dst.name);it.replace(dst);count++;}}
  var fonts=new Folder(base.fsName+'/source/fonts'),fontOut=new Folder(pkg.fsName+'/Fonts');fontOut.create();var ff=fonts.getFiles();for(var j=0;j<ff.length;j++)if(ff[j] instanceof File&&!ff[j].copy(fontOut.fsName+'/'+ff[j].name))throw Error('Font copy failed');
  app.project.save(dest);report('PACKAGE PASS / '+count+' footage items relinked / fonts and license copied');
 }catch(e){report('PACKAGE FAILED '+e.toString());}
})();
