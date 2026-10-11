"""Add an editable controller rig to the accepted v05 without modifying it.
Run in background Blender: --python-exit-code 1 --python this.py -- source.blend outdir
Native node modifiers and simple drivers; no autorun handler required.
"""
import bpy, math, os, sys, json, random
import numpy as np
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source,out=args[:2]
if os.path.exists(os.path.join(out,'griffin-rig-v01.blend')):
    raise FileExistsError('Use a fresh output directory; existing rig is preserved.')
os.makedirs(out,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=source)
scene=bpy.context.scene
def empty(name,pos=(0,0,0)):
    ob=bpy.data.objects.new(name,None);scene.collection.objects.link(ob)
    ob.empty_display_type='CIRCLE';ob.empty_display_size=.25;ob.location=pos;return ob
control=empty('COMPANION CONTROLS',(0,0,0))
for key,default,lo,hi in [('head_yaw',0,-.28,.28),('head_pitch',0,-.16,.16),('gaze_x',0,-1,1),('gaze_y',0,-1,1),('blink',0,0,1),('breath',0,-1,1)]:
    control[key]=float(default);control.id_properties_ui(key).update(min=lo,max=hi)
def driver(target,path,index,prop,expr='v'):
    fc=target.driver_add(path,index) if index is not None else target.driver_add(path)
    d=fc.driver;d.type='SCRIPTED';v=d.variables.new();v.name='v';v.type='SINGLE_PROP';v.targets[0].id=control;v.targets[0].data_path='["'+prop+'"]';d.expression=expr
head=empty('Head pivot',(0,0,1.32))
driver(head,'rotation_euler',2,'head_yaw');driver(head,'rotation_euler',0,'head_pitch')

# A shared deformation field moves surface and native fibers together.
# Each hair strand receives its root weight for all five points, avoiding stretch.
ng=bpy.data.node_groups.new('Companion head and breathing deformation','GeometryNodeTree')
ng.interface.new_socket(name='Geometry',in_out='INPUT',socket_type='NodeSocketGeometry')
ng.interface.new_socket(name='Geometry',in_out='OUTPUT',socket_type='NodeSocketGeometry')
n=ng.nodes;l=ng.links
inp=n.new('NodeGroupInput');outp=n.new('NodeGroupOutput');position=n.new('GeometryNodeInputPosition')
attr=n.new('GeometryNodeInputNamedAttribute');attr.data_type='FLOAT';attr.inputs['Name'].default_value='head_weight'
rot=n.new('ShaderNodeCombineXYZ')
for channel,prop in [('X','head_pitch'),('Z','head_yaw')]:
    value=n.new('ShaderNodeValue');driver(value.outputs[0],'default_value',None,prop)
    mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';l.new(value.outputs[0],mul.inputs[0]);l.new(attr.outputs['Attribute'],mul.inputs[1]);l.new(mul.outputs[0],rot.inputs[channel])
rotate=n.new('ShaderNodeVectorRotate');rotate.rotation_type='EULER_XYZ';rotate.inputs['Center'].default_value=(0,0,1.32)
l.new(position.outputs[0],rotate.inputs['Vector']);l.new(rot.outputs[0],rotate.inputs['Rotation'])
breathWeight=n.new('GeometryNodeInputNamedAttribute');breathWeight.data_type='FLOAT';breathWeight.inputs['Name'].default_value='breath_weight'
bv=n.new('ShaderNodeValue');driver(bv.outputs[0],'default_value',None,'breath')
bm=n.new('ShaderNodeMath');bm.operation='MULTIPLY';l.new(bv.outputs[0],bm.inputs[0]);l.new(breathWeight.outputs['Attribute'],bm.inputs[1])
sep=n.new('ShaderNodeSeparateXYZ');l.new(position.outputs[0],sep.inputs[0]);offset=n.new('ShaderNodeCombineXYZ')
for axis,scale in [('X',.012),('Y',.022),('Z',.004)]:
    mul=n.new('ShaderNodeMath');mul.operation='MULTIPLY';l.new(bm.outputs[0],mul.inputs[0]);mul.inputs[1].default_value=scale
    if axis!='Z':
        coord=n.new('ShaderNodeMath');coord.operation='MULTIPLY';l.new(mul.outputs[0],coord.inputs[0]);l.new(sep.outputs[axis],coord.inputs[1]);l.new(coord.outputs[0],offset.inputs[axis])
    else:l.new(mul.outputs[0],offset.inputs[axis])
setp=n.new('GeometryNodeSetPosition');l.new(inp.outputs['Geometry'],setp.inputs['Geometry']);l.new(rotate.outputs[0],setp.inputs['Position']);l.new(offset.outputs[0],setp.inputs['Offset']);l.new(setp.outputs[0],outp.inputs['Geometry'])
faceNames={'Integrated cream facial disc','Cream fine facial down'}
deformNames={'Continuous griffin silhouette','Graphite short feather coat',*faceNames}
for ob in list(scene.objects):
    if ob.name not in deformNames:continue
    data=ob.data;count=len(data.vertices) if ob.type=='MESH' else len(data.attributes['position'].data)
    coords=np.empty(count*3,dtype=np.float32)
    if ob.type=='MESH':data.vertices.foreach_get('co',coords)
    else:data.attributes['position'].data.foreach_get('vector',coords)
    coords=coords.reshape((-1,3));z=coords[:,2].copy()
    if ob.type=='CURVES':z=np.repeat(z[::5],5)
    t=np.clip((z-.60)/.53,0,1);hw=t*t*(3-2*t)
    if ob.name in faceNames:hw[:]=1
    bw=np.exp(-((z-.79)/.36)**2)
    if ob.name in faceNames:bw[:]=0
    for name,values in [('head_weight',hw),('breath_weight',bw)]:
        data.attributes.new(name,'FLOAT','POINT').data.foreach_set('value',values)
    mod=ob.modifiers.new('Follow head and chest','NODES');mod.node_group=ng

def parent_keep(ob,p):
    bpy.context.view_layer.update()
    world=ob.matrix_world.copy();ob.parent=p
    ob.matrix_parent_inverse=p.matrix_world.inverted();ob.matrix_basis=world
for ob in list(scene.objects):
    if any(token in ob.name for token in ['beak','Mouth shadow']):parent_keep(ob,head)

cream=bpy.data.materials['Warm cream facial down']
creaseMat=bpy.data.materials.new('Soft eyelid crease');creaseMat.diffuse_color=(.035,.025,.015,1);creaseMat.use_nodes=True
creaseMat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.035,.025,.015,1)
creaseMat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.75
eyes=[bpy.data.objects[name] for name in ['Left glossy eye','Right glossy eye']]
for eye in eyes:
    eyeCenter=eye.location.copy()
    gaze=empty(eye.name+' gaze',eye.location.copy());parent_keep(gaze,head)
    base=eye.rotation_euler.copy();eye.parent=gaze;eye.location=(0,0,0);eye.rotation_euler=base
    # Translation is intentionally small for the approved all-black eye design.
    driver(eye,'location',0,'gaze_x','v*0.010')
    driver(eye,'location',2,'gaze_y','v*0.008')
    driver(eye,'rotation_euler',2,'gaze_x',str(base.z)+'+v*0.12')
    driver(eye,'rotation_euler',0,'gaze_y','v*0.09')
    driver(eye,'scale',1,'blink','1-0.90*v*v')
    driver(eye,'scale',2,'blink','max(0.03,1-0.97*v)')
    driver(eye,'location',1,'blink','0.040*v*v*v*v')
    driver(eye,'hide_render',None,'blink','v>0.995')
    def conform(points,blink,offset=.004):
        a=np.asarray(points,dtype=np.float64).copy();x=a[:,0];z=a[:,2];y=a[:,1].copy();c=math.cos(base.z);sn=math.sin(base.z)
        for _ in range(4):
            wx=eyeCenter.x+c*x-sn*y;wz=eyeCenter.z+z
            h=(wz-1.27)/1.13;r=np.sqrt(np.maximum(.001,1-h*h));taper=.98-.025*h
            bz=.68*r*taper*np.sqrt(np.maximum(.001,1-(wx/(.94*r*taper))**2))
            yy=wz-1.68;yy=yy+np.where(yy>0,.10*np.exp(-(wx/.28)**2),0)
            rr=(wx/.777)**2+(yy/.535)**2;edge=np.clip((1-rr)/.22,0,1);edge=edge*edge*(3-2*edge)
            cheek=.033*np.exp(-((np.abs(wx)-.35)/.30)**2-((wz-1.53)/.36)**2)
            face=bz+.005+edge*(.023+cheek)
            y=(-face-offset-eyeCenter.y-sn*x)/c
        a[:,1]+=blink**4*(y-a[:,1]);return a
    seam=bpy.data.curves.new(eye.name+' blink crease','CURVE');seam.dimensions='3D';seam.bevel_depth=.0025;seam.bevel_resolution=2
    spline=seam.splines.new('POLY');spline.points.add(32)
    for j,p in enumerate(spline.points):
        x=-.102+.204*j/32;z=-.017+.028*(1-(x/.102)**2)
        y=-.028*math.sqrt(max(.001,1-(x/.12)**2-(z/.17)**2))-.001
        fitted=conform([(x,y,z)],1,.023)[0];p.co=(*fitted,1)
    seam.materials.append(creaseMat);crease=bpy.data.objects.new(eye.name+' blink crease',seam);scene.collection.objects.link(crease);crease.parent=gaze;crease.rotation_euler=base
    for axis in range(3):driver(crease,'scale',axis,'blink','max(0,min(1,(v-0.65)/0.35))')
    driver(crease,'location',0,'gaze_x','v*0.010');driver(crease,'location',2,'gaze_y','v*0.008')
    driver(crease,'rotation_euler',2,'gaze_x',str(base.z)+'+v*0.12');driver(crease,'rotation_euler',0,'gaze_y','v*0.09')
    # Stylized blink uses corrective eye deformation and a surface-conforming crease.

# Six-second demonstrator: eyes lead the head; two blinks; one breathing cycle.
fps=24;scene.render.fps=fps;scene.frame_start=1;scene.frame_end=144
def keys(prop,values):
    for frame,value in values:control[prop]=float(value);control.keyframe_insert(data_path='["'+prop+'"]',frame=frame)
keys('gaze_x',[(1,0),(20,0),(25,-.85),(51,-.85),(58,.85),(85,.85),(95,0),(144,0)])
keys('gaze_y',[(1,0),(53,0),(59,.25),(84,.25),(94,0),(144,0)])
keys('head_yaw',[(1,0),(26,0),(39,-.13),(56,-.13),(72,.13),(93,.13),(108,0),(144,0)])
keys('head_pitch',[(1,0),(56,0),(73,-.045),(93,-.045),(108,0),(144,0)])
keys('blink',[(1,0),(13,0),(16,1),(18,0),(108,0),(111,1),(114,0),(144,0)])
for f in range(1,145):control['breath']=math.sin(math.tau*(f-1)/144);control.keyframe_insert(data_path='["breath"]',frame=f)
scene.frame_set(1)
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.cycles.samples=32;scene.cycles.adaptive_threshold=.04
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.filepath=os.path.join(out,'frames','griffin-')
os.makedirs(os.path.join(out,'frames'),exist_ok=True)
scene['rig_notes']='COMPANION CONTROLS: head_yaw/pitch radians, gaze_x/y normalized, blink 0-1, breath -1..1. Native drivers; no Python autorun. Timeline is a demonstrator, not cursor input.'
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out,'griffin-rig-v01.blend'),compress=True)
print(json.dumps({'rig':os.path.join(out,'griffin-rig-v01.blend'),'frames':144,'fps':24,'curves':sum(len(o.data.curves) for o in scene.objects if o.type=='CURVES')}),flush=True)
