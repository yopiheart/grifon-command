"""Render review views from a saved master; no geometry regeneration."""
import bpy, sys, os, json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source,version=args[:2]
size=int(args[2]) if len(args)>2 else 1500
samples=int(args[3]) if len(args)>3 else 192
views=args[4:] or ['hero','front','detail','transparent']
bpy.ops.wm.open_mainfile(filepath=source)
scene=bpy.context.scene
scene.render.resolution_x=size;scene.render.resolution_y=size
scene.cycles.samples=samples;scene.cycles.adaptive_threshold=.008
out=os.path.dirname(source)
def xyz(p):return (p[0],-p[2],p[1])
for view in views:
    target=(0,1.53,0);scale=3.75
    pos=(2.7,2.55,8)
    if view=='front':pos=(0,2.05,8)
    if view=='detail':pos=(1.5,2.2,7);target=(0,1.89,.15);scale=2.15
    if view=='profile':pos=(6,2.5,6)
    scene.camera.location=xyz(pos)
    scene.camera.rotation_euler=(Vector(xyz(target))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.camera.data.ortho_scale=scale
    transparent=view=='transparent'
    bpy.data.objects['Studio floor'].hide_render=transparent
    scene.render.film_transparent=transparent
    scene.render.image_settings.color_mode='RGBA'
    scene.render.filepath=os.path.join(out,f'griffin-master-{version}-{view}.png')
    bpy.ops.render.render(write_still=True)
    print(json.dumps({'view':view,'path':scene.render.filepath,'size':size,'samples':samples}),flush=True)
