"""Original illustrative EC/filtration/AOP asset. Not an engineered installation."""
import bpy, bmesh, math, json
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={}
def material(name,color,metal=0,rough=.34,alpha=1):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    M[name]=m;return m
material('Porcelain',(0.82,.87,.91),.12,.27)
material('Navy',(0.018,.055,.14),.25,.28)
material('Ocean blue',(.025,.23,.59),.26,.25)
material('Steel',(.38,.48,.59),.8,.23)
material('Dark steel',(.07,.12,.18),.7,.3)
material('Water - untreated',(.38,.28,.15),0,.2,.58)
material('Water - process',(.06,.38,.58),0,.2,.52)
material('Water - illustrative outlet',(.16,.58,.72),0,.2,.55)
material('Amber',(.95,.52,.07),.15,.27)
material('Glass',(.65,.84,.91),0,.1,.22)
material('White',(.95,.97,1),0,.35)
material('Sludge',(.23,.16,.09),0,.75)
material('Status green',(.1,.69,.35),0,.4)

def finish(o,name,mat,stage,bevel=0):
    o.name=name;o.data.materials.append(M[mat]);o['stage']=stage
    if bevel:
        b=o.modifiers.new('Machined edge radii','BEVEL');b.width=bevel;b.segments=3
        n=o.modifiers.new('Face-weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
    return o
def cube(name,loc,dim,mat,stage,bev=.045):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,mat,stage,bev)
def cyl(name,loc,r,h,mat,stage,vertices=40):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=loc)
    o=finish(bpy.context.object,name,mat,stage,.025)
    for p in o.data.polygons:p.use_smooth=True
    return o
def pipe(name,pts,mat='Steel',stage='all',radius=.065):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=3
    s=curve.splines.new('POLY');s.points.add(len(pts)-1)
    for p,xyz in zip(s.points,pts):p.co=(*xyz,1)
    o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o);o.data.materials.append(M[mat]);o['stage']=stage
    return o
def sphere(name,loc,r,mat,stage):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=r,location=loc)
    return finish(bpy.context.object,name,mat,stage)

# Geometry matched to observed BioGreen video frames 0:00, 0:27, 2:18, 3:41.
# Cylindrical reactor banks, two tall blue vessels, two horizontal housings.
# Relative proportions only; this is not a dimensioned fabrication drawing.
cube('Equipment floor slab',(0,0,.05),(14,5,.12),'Porcelain','all',.02)
def reactor(name,x,y,h,stage,cut=False):
    cyl(name+' body',(x,y,h/2+.25),.31,h,'Glass' if cut else 'Porcelain',stage)
    for z in (.25,.25+h):
        cyl(name+' dark end flange',(x,y,z),.35,.15,'Dark steel',stage)
        cyl(name+' flange face',(x,y,z+.10),.31,.10,'Steel',stage)
    cyl(name+' mid band',(x,y,h*.43),.32,.065,'Dark steel',stage)
    for a in range(6):
        angle=a*math.tau/6
        cyl(name+' bolt',(x+.26*math.cos(angle),y+.26*math.sin(angle),h+.41),.035,.09,'Steel',stage,12)
    pipe(name+' base inlet',[(x,y,.15),(x,y-.48,.15)],stage=stage,radius=.055)
    if cut:cyl(name+' internal electrode',(x,y,h/2+.25),.075,h*.85,'Steel',stage)
# EC cylinders occupy the front-left bank as in supplier assembly.
for row in range(2):
    for i in range(3):reactor('EC reactor %d %d'%(row,i),-4.9+i*.82,-.8+row*.85,2.4,'ec',row==0 and i==1)
pipe('EC inlet manifold',[(-5.4,-1.35,.28),(-3.0,-1.35,.28)],stage='ec',radius=.08)
pipe('EC transfer',[(-3.0,0,.3),(-2.25,0,.3),(-2.25,0,3.8)],stage='filtration',radius=.07)
# Tall blue pressure/media vessels retain source silhouette.
for i in range(2):
    x=-2.1+i*1.23
    cyl('Blue filtration vessel %d'%i,(x,.8,2.1),.53,3.8,'Ocean blue','filtration')
    for z in (.22,4.0):cyl('Blue vessel collar',(x,.8,z),.55,.12,'Dark steel','filtration')
    cyl('Valve head',(x,.8,4.2),.20,.27,'Dark steel','filtration')
pipe('Blue vessel upper pipe',[(-2.1,.8,3.8),(-.87,.8,3.8),(.2,.8,3.8)],stage='filtration',radius=.075)
# Two white horizontal fractionation housings on a support frame.
for i,z in enumerate((2.1,3.05)):
    o=cyl('Horizontal fractionation housing %d'%i,(.7,-.45,z),.23,2.1,'Porcelain','filtration');o.rotation_euler[1]=math.pi/2
    for x in (-.39,1.79):
        o=cyl('Horizontal housing end flange',(x,-.45,z),.27,.10,'Steel','filtration');o.rotation_euler[1]=math.pi/2
for x in (-.5,1.9):pipe('Fractionation stand',[(x,-.45,.2),(x,-.45,3.4)],stage='filtration',radius=.055)
pipe('Fractionation pipe',[(.2,.8,3.8),(.2,-.45,3.8),(.2,-.45,3.05)],stage='filtration',radius=.07)
# AOP vertical bank, source-style flanges and transparent UV cutaway.
for row in range(2):
    for i in range(3):
        x=2.7+i*.82;y=-.3+row*.85
        reactor('AOP vessel %d %d'%(row,i),x,y,3.8,'aop',row==0 and i==1)
        if row==0 and i==1:cyl('UV source visible',(x,y,2.0),.043,3.3,'Water - illustrative outlet','aop')
pipe('AOP inlet manifold',[(1.8,-.45,2.1),(2.3,-.45,2.1),(2.3,-.3,.18),(4.4,-.3,.18)],stage='aop',radius=.065)
pipe('Final outlet',[(4.4,.55,.22),(5.5,.55,.22)],mat='Ocean blue',stage='verify',radius=.08)
# Source 0:27 shows a partitioned underground concrete collection tank.
# Show this only as a cutaway, never as an added circular surface clarifier.
cube('Underground tank floor',(-.3,1.4,-1.65),(5.6,2.1,.14),'Steel','settling')
cube('Underground tank back',(-.3,2.4,-.8),(5.6,.12,1.7),'Porcelain','settling')
for x in (-3.05,-1.2,.65,2.45):cube('Underground chamber partition',(x,1.4,-.8),(.12,2.1,1.7),'Porcelain','settling')
cube('Underground residual solids',(-.3,1.4,-1.48),(5.3,1.85,.18),'Sludge','settling')
pipe('Residuals handling line',[(-2,1.4,-1.3),(-2,2.8,-1.3),(-2,2.8,.3)],mat='Steel',stage='care',radius=.055)

# Neutral studio floor, lighting and editable camera for native still inspection.
cube('Studio floor',(0,0,-.52),(200,200,.10),'White','studio',0)
world=bpy.data.worlds.new('Oceanides studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.64,.72,.85,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;bpy.context.scene.world=world
def light(name,loc,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
light('Large key reflection',(-4,-7,10),1800,8);light('Long rim reflection',(3,4,7),1600,6);light('Front fill',(8,-6,5),1100,5)
bpy.ops.object.camera_add(location=(13,-20,12));cam=bpy.context.object;cam.name='Hero camera';cam.rotation_euler=(Vector((0,0,1.1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=17.8;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Oceanides-EC-AOP-Master.blend'))

# Export GLB plus mesh JSON from the evaluated master, without external loader dependencies.
objects=[o for o in scene.objects if o.type in {'MESH','CURVE'} and o.get('stage')!='studio']
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'Oceanides-EC-AOP-Master.glb'),use_selection=True,export_format='GLB',export_apply=True)
deps=bpy.context.evaluated_depsgraph_get();items=[]
for o in objects:
    eo=o.evaluated_get(deps);mesh=eo.to_mesh();mesh.calc_loop_triangles();pos=[];nor=[]
    normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
    for tri in mesh.loop_triangles:
        for loop_idx in tri.loops:
            li=mesh.loops[loop_idx];v=o.matrix_world@mesh.vertices[li.vertex_index].co;n=normal_matrix@mesh.corner_normals[loop_idx].vector
            pos.extend(round(vv,5) for vv in (v.x,v.z,-v.y));nor.extend(round(vv,5) for vv in (n.x,n.z,-n.y))
    ma=o.data.materials[0];p=ma.node_tree.nodes.get('Principled BSDF')
    items.append({'name':o.name,'stage':o.get('stage','all'),'positions':pos,'normals':nor,'material':{'name':ma.name,'color':list(ma.diffuse_color)[:3],'alpha':ma.diffuse_color[3],'metalness':p.inputs['Metallic'].default_value,'roughness':p.inputs['Roughness'].default_value}})
    eo.to_mesh_clear()
mesh_temp=OUT/'master-mesh.next.json'
mesh_temp.write_text(json.dumps({'illustrative':True,'engineeringDimensions':False,'coordinateSystem':'Three.js Y-up','objects':items},separators=(',',':')),encoding='utf-8')
mesh_temp.replace(OUT/'master-mesh.json')
scene.render.resolution_percentage=58;scene.render.filepath=str(OUT/'Blender-Hero-Review.png');bpy.ops.render.render(write_still=True)
(OUT/'master-manifest.json').write_text(json.dumps({'blenderVersion':bpy.app.version_string,'geometry':'Original authored schematic; no measured dimensions or installed-project claim','renderEngine':scene.render.engine,'reviewResolution':[1114,626],'samples':24,'meshObjects':len(items),'glb':'Oceanides-EC-AOP-Master.glb','native':'Oceanides-EC-AOP-Master.blend','mesh':'master-mesh.json'},indent=2),encoding='utf-8')
print('MASTER_EXPORTED',len(items),flush=True)
