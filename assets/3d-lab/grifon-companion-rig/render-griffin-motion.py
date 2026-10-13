import bpy, os, sys, json, time
args=sys.argv[sys.argv.index('--')+1:]
source,out,size,samples,selection=args
os.makedirs(out,exist_ok=True);bpy.ops.wm.open_mainfile(filepath=source)
s=bpy.context.scene;s.render.resolution_x=int(size);s.render.resolution_y=int(size);s.cycles.samples=int(samples)
s.render.use_persistent_data=True
s.cycles.adaptive_threshold=.05;s.render.image_settings.color_mode='RGB'
frames=range(s.frame_start,s.frame_end+1) if selection=='all' else [int(f) for f in selection.split(',')]
start=time.time();proof=[]
for f in frames:
    s.frame_set(f);bpy.context.view_layer.update()
    s.render.filepath=os.path.join(out,f'{f:04}.png');bpy.ops.render.render(write_still=True)
    proof.append({'frame':f,'head':list(bpy.data.objects['Head pivot'].rotation_euler),'gaze':list(bpy.data.objects['Left glossy eye'].location),'blink':bpy.data.objects['COMPANION CONTROLS']['blink']})
    print(json.dumps({'frame':f,'elapsed':round(time.time()-start,2)}),flush=True)
with open(os.path.join(out,'motion-evidence.json'),'w') as handle:json.dump(proof,handle,indent=2)
