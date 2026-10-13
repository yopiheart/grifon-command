"""Export approved rig geometry plus a feature-free Cycles lighting plate.
Local Blender 5.2: --python-exit-code 1 --python export-browser.py -- RIG_BLEND OUTDIR
Leaves source blend untouched. Browser uses fixed-camera baked appearance, not relighting.
"""
import bpy, sys, json, math, hashlib
from pathlib import Path
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

source, destination = sys.argv[sys.argv.index('--') + 1:]
out = Path(destination); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'scene.bin').exists(), 'Fresh geometry output required'
bpy.ops.wm.open_mainfile(filepath=source)
s = bpy.context.scene; s.frame_set(1); bpy.context.view_layer.update()
cam = s.camera
chunks = []; cursor = 0; objects = []
def buffer(values, size=1, dtype='<f4'):
    global cursor
    a = np.asarray(values, dtype=dtype).reshape(-1)
    record = {'offset': cursor, 'count': int(a.size), 'itemSize': size}
    raw = a.tobytes(); chunks.append(raw); cursor += len(raw)
    return record

def world_coords(ob, local):
    m = np.asarray(ob.matrix_world, dtype=np.float32)
    return local @ m[:3, :3].T + m[:3, 3]

def uv(points):
    # Project with the original camera. Fixed at rest, then carried by live geometry.
    view = np.asarray(cam.matrix_world.inverted(), dtype=np.float64)
    local = points @ view[:3, :3].T + view[:3, 3]
    aspect = s.render.resolution_x / s.render.resolution_y
    return np.stack([local[:,0] / (cam.data.ortho_scale * aspect) + .5,
                     local[:,1] / cam.data.ortho_scale + .5], axis=1)

def weights(points, deform, root_z=None):
    z = points[:,2] if root_z is None else root_z
    head = np.zeros(len(points)); breath = np.zeros(len(points))
    if deform == 'body':
        t = np.clip((z-.60)/.53, 0, 1); head = t*t*(3-2*t)
        breath = np.exp(-((z-.79)/.36)**2)
    elif deform in ('head','eye','crease'): head[:] = 1
    return np.stack([head,breath],axis=1)

for ob in list(s.objects):
    if ob.type not in ('MESH','CURVES','CURVE') or ob.name == 'Studio floor': continue
    is_crease = 'blink crease' in ob.name
    is_eye = ob.name in ('Left glossy eye','Right glossy eye')
    deform = 'none'
    if ob.name in ('Continuous griffin silhouette','Graphite short feather coat'): deform='body'
    elif ob.name in ('Integrated cream facial disc','Cream fine facial down') or 'beak' in ob.name.lower() or 'Mouth shadow' in ob.name: deform='head'
    elif is_eye: deform='eye'
    elif is_crease: deform='crease'
    data = {'name':ob.name,'kind':'hair' if ob.type=='CURVES' else 'mesh','deform':deform,
            'texture':'hero' if deform in ('eye','crease') or 'beak' in ob.name.lower() or 'Mouth shadow' in ob.name else 'skin'}
    if deform in ('eye','crease'):
        gaze = ob.parent
        data['eyeCenter'] = list(gaze.matrix_world.translation)
        data['eyeBaseZ'] = float(ob.rotation_euler.z)
    if ob.type == 'CURVES':
        curve = ob.data; total = len(curve.attributes['position'].data)
        allp = np.empty(total*3,dtype=np.float32)
        curve.attributes['position'].data.foreach_get('vector',allp)
        # Deterministic eighth-strand sampling; retain each native 5-point shape.
        native = allp.reshape((-1,5,3))[::8]
        points = world_coords(ob,native.reshape((-1,3)))
        root_z = np.repeat(points.reshape((-1,5,3))[:,0,2],5)
        ids = np.arange(len(points),dtype=np.uint32).reshape((-1,5))
        indices = np.stack([ids[:,:-1],ids[:,1:]],axis=-1).reshape(-1)
        data['sourceStrands'] = len(curve.curves); data['strands'] = len(native)
    else:
        if is_crease:
            s.frame_set(16); bpy.context.view_layer.update()
        if ob.type == 'MESH' and len(ob.data.polygons) > 18000:
            decimate=ob.modifiers.new('Browser-only reduction','DECIMATE')
            decimate.ratio=max(.08,18000/len(ob.data.polygons))
        evaluated = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        mesh = evaluated.to_mesh(); mesh.calc_loop_triangles()
        local = np.empty(len(mesh.vertices)*3,dtype=np.float32)
        mesh.vertices.foreach_get('co',local)
        points = world_coords(ob,local.reshape((-1,3)))
        indices=np.empty(len(mesh.loop_triangles)*3,dtype=np.uint32)
        mesh.loop_triangles.foreach_get('vertices',indices)
        evaluated.to_mesh_clear(); root_z=None
    data['attributes']={'position':buffer(points,3),'uv':buffer(uv(points),2),
                        'weight':buffer(weights(points,deform,root_z),2)}
    data['index']=buffer(indices,1,'<u4'); objects.append(data)
    if is_crease: s.frame_set(1); bpy.context.view_layer.update()
    print(json.dumps({'object':ob.name,'vertices':len(points),'indices':len(indices)}),flush=True)

(out/'scene.bin').write_bytes(b''.join(chunks))
manifest={'camera':{'position':list(cam.location),'target':[0,0,1.53],'up':[0,0,1],'ortho':cam.data.ortho_scale},
          'objects':objects,'binaryBytes':cursor,'hairStrands':sum(x.get('strands',0) for x in objects),
          'sourceSha256':hashlib.sha256(Path(source).read_bytes()).hexdigest(),
          'appearance':'Camera-projected baked Cycles lighting on real 3D geometry. Fixed camera and limited head motion; not free-view or relighting.'}
(out/'scene.json').write_text(json.dumps(manifest,indent=2))

# Hide independently animated eyes/beak/creases to avoid painting ghost features on skin.
for ob in s.objects:
    if any(token in ob.name.lower() for token in ['eye','beak','mouth shadow']):
        if ob.animation_data:
            try: ob.driver_remove('hide_render')
            except TypeError: pass
        ob.hide_render=True
    # Export-only simplifiers must not affect the reference appearance bake.
    for mod in ob.modifiers:
        if mod.name == 'Browser-only reduction': mod.show_render=False
s.frame_set(1); bpy.context.view_layer.update()
for ob in s.objects:
    if ob.type in ('MESH','CURVE') and ('eye' in ob.name.lower()):
        ob.hide_render=True
s.render.resolution_x=1024;s.render.resolution_y=1024;s.cycles.samples=48
s.render.filepath=str(out/'baked-skin.png');s.render.image_settings.color_mode='RGB'
bpy.ops.render.render(write_still=True)
print(json.dumps({'export':str(out),'bytes':cursor,'objects':len(objects),'strands':manifest['hairStrands']}),flush=True)
