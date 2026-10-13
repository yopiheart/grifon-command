"""Reproducible, local-only Cycles griffin master. No external assets or services.

Blender 5.2 CLI: --background --python-exit-code 1 --python <this file>
Optional arguments after --: version size samples angle (hero/front/detail).
Defaults reproduce the v05 hero. Output is saved beside this source.
The master contains editable meshes and native hair curves, without a motion rig.
"""
import bpy, bmesh, math, random, bisect, os, sys, json, time
from array import array
from mathutils import Vector

OUT=os.path.dirname(os.path.abspath(__file__))
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
VERSION=args[0] if args else 'v05'
SIZE=int(args[1]) if len(args)>1 else 1500
SAMPLES=int(args[2]) if len(args)>2 else 160
ANGLE=args[3] if len(args)>3 else 'hero'
START=time.time()
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(314159)
def xyz(p):return (p[0],-p[2],p[1])
def mat(name,color,rough=.6,spec=.3,sss=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=0
    p.inputs['Specular IOR Level'].default_value=spec;p.inputs['Subsurface Weight'].default_value=sss
    return m
coal=mat('Graphite feather base',(.052,.051,.050),.65,.28,.025)
cream=mat('Warm cream facial down',(.82,.69,.49),.65,.25,.045)
gold=mat('Warm golden beak and feather tips',(.96,.56,.006),.37,.32,.035)
goldshade=mat('Beak mouth interior',(.16,.066,.003),.58,.23)
eyeMat=mat('Obsidian eye',(.0015,.0014,.0012),.10,.5)
eyeMat.node_tree.nodes['Principled BSDF'].inputs['Coat Weight'].default_value=.27
eyeMat.node_tree.nodes['Principled BSDF'].inputs['Coat Roughness'].default_value=.10
for m in (coal,cream,gold):
    n=m.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=140;n.inputs['Detail'].default_value=2
    b=m.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.10;b.inputs['Distance'].default_value=.006
    m.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);m.node_tree.links.new(b.outputs['Normal'],m.node_tree.nodes['Principled BSDF'].inputs['Normal'])
def fiber_mat(name,color,rough=.5):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;n.clear()
    out=n.new('ShaderNodeOutputMaterial');hair=n.new('ShaderNodeBsdfHairPrincipled');hair.parametrization='COLOR'
    hair.inputs['Color'].default_value=(*color,1);hair.inputs['Roughness'].default_value=rough
    hair.inputs['Radial Roughness'].default_value=.65
    info=n.new('ShaderNodeHairInfo');ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(*[c*.70 for c in color],1)
    ramp.color_ramp.elements[1].color=(*[min(1,c*1.18) for c in color],1)
    m.node_tree.links.new(info.outputs['Random'],ramp.inputs[0]);m.node_tree.links.new(ramp.outputs['Color'],hair.inputs['Color'])
    m.node_tree.links.new(hair.outputs[0],out.inputs['Surface']);return m
coalHair=fiber_mat('Graphite short feather fibers',(.017,.019,.023),.65)
creamHair=fiber_mat('Cream micro down fibers',(.82,.67,.44),.6)
goldHair=fiber_mat('Golden crest micro fibers',(.87,.48,.006),.45)
hairAttr=coalHair.node_tree.nodes.new('ShaderNodeAttribute');hairAttr.attribute_name='crest_gold'
hairMix=coalHair.node_tree.nodes.new('ShaderNodeMixRGB');hairMix.inputs[2].default_value=(.87,.48,.006,1)
hairRamp=next(n for n in coalHair.node_tree.nodes if n.type=='VALTORGB')
hairShader=next(n for n in coalHair.node_tree.nodes if n.type=='BSDF_HAIR_PRINCIPLED')
coalHair.node_tree.links.new(hairRamp.outputs['Color'],hairMix.inputs[1]);coalHair.node_tree.links.new(hairAttr.outputs['Fac'],hairMix.inputs[0]);coalHair.node_tree.links.new(hairMix.outputs[0],hairShader.inputs['Color'])

def crest_weight(x,y):
    main=max(0,min(1,(y-(2.78+.24*(x+.8)))/.22))
    small=max(0,min(1,(y-2.40)/.20))*max(0,min(1,(-x-.78)/.08))
    t=max(main,small);return t*t*(3-2*t)

def mesh(name,vs,fs,material):
    me=bpy.data.meshes.new(name);me.from_pydata([xyz(v) for v in vs],[],fs);me.update()
    ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);me.materials.append(material)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    for f in me.polygons:f.use_smooth=True
    return ob
def smooth(ob,levels=1):
    bpy.context.view_layer.objects.active=ob
    mod=ob.modifiers.new('Sculpt surface smoothing','SUBSURF');mod.levels=levels
    bpy.ops.object.modifier_apply(modifier=mod.name)
def orb(name,pos,scale,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=xyz(pos))
    ob=bpy.context.object;ob.name=name;ob.scale=(scale[0],scale[2],scale[1]);ob.data.materials.append(material)
    for f in ob.data.polygons:f.use_smooth=True
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return ob
def rings_mesh(name,rows,material,segs=64):
    # Each row: height, horizontal center, width, depth, front/back center.
    vs=[];fs=[]
    for y,x,w,d,z in rows:
        for i in range(segs):
            t=math.tau*i/segs;vs.append((x+w*math.cos(t),y,z+d*math.sin(t)))
    for j in range(len(rows)-1):
        for i in range(segs):
            a=j*segs+i;b=j*segs+(i+1)%segs;fs.append((a,b,b+segs,a+segs))
    fs.append(tuple(reversed(range(segs))));fs.append(tuple((len(rows)-1)*segs+i for i in range(segs)))
    return mesh(name,vs,fs,material)

def body_z(x,y):
    h=(y-1.27)/1.13;r=math.sqrt(max(.001,1-h*h));taper=.98-.025*h
    return .68*r*taper*math.sqrt(max(.001,1-(x/(.94*r*taper))**2))
def face_z(x,y):
    yy=y-1.68
    if yy>0:yy+=.10*math.exp(-(x/.28)**2)
    rr=(x/.777)**2+(yy/.535)**2
    edge=max(0,min(1,(1-rr)/.22));edge=edge*edge*(3-2*edge)
    cheek=.033*math.exp(-((abs(x)-.35)/.30)**2-((y-1.53)/.36)**2)
    return body_z(x,y)+.005+edge*(.023+cheek)
rows=[]
for j in range(65):
    a=math.pi*j/64;h=math.cos(a);r=math.sin(a);taper=.98-.025*h
    rows.append((1.27+1.13*h,0,max(.001,.94*r*taper),max(.001,.68*r*taper),0))
body=rings_mesh('Continuous griffin silhouette',rows,coal,96)
# Swept forehead plume: a broad curved sculpt, not separate conical horns.
crest=rings_mesh('Main swept crest',[
    (2.06,.05,.59,.38,-.01),(2.20,.04,.60,.35,-.015),
    (2.34,-.01,.58,.29,-.015),(2.47,-.10,.54,.235,-.02),
    (2.59,-.26,.48,.19,-.025),(2.70,-.43,.37,.15,-.03),
    (2.81,-.61,.245,.108,-.035),(2.91,-.74,.13,.065,-.04),
    (3.00,-.79,.052,.031,-.04),(3.075,-.79,.002,.002,-.04)],coal,64)
crestSmall=rings_mesh('Secondary swept crest',[
    (2.14,-.40,.23,.24,-.12),(2.26,-.50,.245,.22,-.12),
    (2.36,-.66,.20,.17,-.12),(2.46,-.81,.13,.11,-.12),
    (2.55,-.89,.055,.055,-.12),(2.64,-.90,.002,.002,-.12)],coal,48)
# Voxel union removes the hard joins while keeping one continuous silhouette.
bpy.ops.object.select_all(action='DESELECT')
for o in (body,crest,crestSmall):o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
rem=body.modifiers.new('Organic union','REMESH');rem.mode='VOXEL';rem.voxel_size=.015;rem.use_smooth_shade=True
bpy.ops.object.modifier_apply(modifier=rem.name)
mod=body.modifiers.new('Relax union','SMOOTH');mod.factor=.45;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
smooth(body,1)
# A softly graded keratin tip follows the swept contour instead of a cap seam.
crestMask=body.data.attributes.new('crest_gold','FLOAT','POINT')
for vertex,item in zip(body.data.vertices,crestMask.data):
    x,_,y=vertex.co
    item.value=crest_weight(x,y)
attr=coal.node_tree.nodes.new('ShaderNodeAttribute');attr.attribute_name='crest_gold'
mix=coal.node_tree.nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.052,.051,.05,1);mix.inputs[2].default_value=(.96,.56,.006,1)
coal.node_tree.links.new(attr.outputs['Fac'],mix.inputs[0]);coal.node_tree.links.new(mix.outputs[0],coal.node_tree.nodes['Principled BSDF'].inputs['Base Color'])

# Cream facial disc follows the underlying rounded volume.
vs=[(0,1.68,face_z(0,1.68))];fs=[];nr=25;ns=128
for j in range(1,nr+1):
    rr=j/nr
    for i in range(ns):
        a=math.tau*i/ns;x=.777*math.cos(a)*rr;y=1.68+.535*math.sin(a)*rr
        if math.sin(a)>0:y-=.10*math.exp(-(x/.28)**2)*rr*rr
        vs.append((x,y,face_z(x,y)))
for i in range(ns):fs.append((0,1+i,1+(i+1)%ns))
for j in range(nr-1):
    for i in range(ns):
        a=1+j*ns+i;b=1+j*ns+(i+1)%ns;fs.append((a,a+ns,b+ns,b))
face=mesh('Integrated cream facial disc',vs,fs,cream)

for side,x in [('Left',-.325),('Right',.325)]:
    ob=orb(side+' glossy eye',(x,1.74,face_z(x,1.74)+.010),(.113,.161,.071),eyeMat)
    ob.rotation_euler.z=math.radians(-side.count('Left')*0)
    # Eye surface follows the curvature of the face, with a subtle friendly lean.
    ob.rotation_euler[2]=math.radians(13 if x<0 else -13)

def beak_sections(name,sections,material):
    vs=[];fs=[];ns=48
    for z,y,w,h in sections:
        for i in range(ns):
            a=math.tau*i/ns;vs.append((w*math.cos(a),y+h*math.sin(a),z))
    for j in range(len(sections)-1):
        for i in range(ns):
            a=j*ns+i;b=j*ns+(i+1)%ns;fs.append((a,b,b+ns,a+ns))
    fs.append(tuple(reversed(range(ns))));fs.append(tuple((len(sections)-1)*ns+i for i in range(ns)))
    ob=mesh(name,vs,fs,material);smooth(ob,2);return ob
beak=beak_sections('Compact hooked upper beak',[
    (.608,1.602,.070,.055),(.655,1.622,.117,.077),
    (.717,1.623,.132,.098),(.779,1.602,.119,.101),
    (.837,1.568,.087,.096),(.875,1.508,.043,.066),
    (.858,1.442,.002,.002)],gold)
beak_sections('Integrated lower beak',[
    (.596,1.511,.058,.012),(.639,1.510,.074,.015),
    (.688,1.512,.069,.014),(.735,1.513,.002,.002)],gold)
orb('Mouth shadow',(0,1.528,.650),(.069,.005,.045),goldshade)
for x in [-.057,.057]:orb('Subtle beak nostril',(x,1.676,.779),(.006,.006,.003),goldshade)

wings=[]
for sign,side in [(-1,'Left'),(1,'Right')]:
    shell=rings_mesh(side+' folded wing',[
        (1.19,sign*.84,.060,.095,.04),(1.10,sign*.93,.106,.12,.08),
        (.94,sign*.99,.129,.125,.14),(.75,sign*.99,.12,.105,.21),
        (.58,sign*.95,.081,.069,.27),(.43,sign*.89,.004,.006,.29)],coal,40)
    smooth(shell,2);wings.append(shell)
    inner=rings_mesh(side+' gold inner wing',[
        (1.10,sign*.90,.013,.014,.187),(.96,sign*.944,.049,.025,.247),
        (.79,sign*.957,.061,.028,.299),(.61,sign*.93,.048,.023,.334),
        (.45,sign*.891,.004,.005,.31)],gold,40)
    smooth(inner,2)

def tube(name,points,radii,material):
    vs=[];fs=[];ns=16
    for j,p in enumerate(points):
        p=Vector(p);t=(Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)])).normalized()
        u=t.cross(Vector((0,0,1))).normalized();v=t.cross(u).normalized()
        for i in range(ns):
            a=math.tau*i/ns;vs.append(p+radii[j]*(u*math.cos(a)+v*math.sin(a)))
    for j in range(len(points)-1):
        for i in range(ns):
            a=j*ns+i;b=j*ns+(i+1)%ns;fs.append((a,b,b+ns,a+ns))
    fs.append(tuple(reversed(range(ns))));fs.append(tuple((len(points)-1)*ns+i for i in range(ns)))
    return mesh(name,vs,fs,material)
pts=[(.53,.47,-.10),(.64,.40,-.09)];radii=[.077,.077]
for j in range(80):
    t=j/79;a=-2.65+t*6.40;r=.31*(1-.80*t)
    pts.append((1.03+r*math.cos(a),.54+r*math.sin(a),-.08));radii.append(.075*(1-.40*t))
tail=tube('Curled lion tail',pts,radii,coal)
smooth(tail,1)
tailMask=tail.data.attributes.new('crest_gold','FLOAT','POINT')
tailCenters=[Vector(xyz(p)) for p in pts]
for vertex,item in zip(tail.data.vertices,tailMask.data):
    index=min(range(len(tailCenters)),key=lambda j:(vertex.co-tailCenters[j]).length_squared)
    t=max(0,min(1,(index-32)/18));item.value=t*t*(3-2*t)
orb('Rounded gold tail tip',pts[-1],(.046,.046,.046),gold)

def face_region(p):
    # Mesh coordinates are Blender X, -depth, height.
    x,z,y=p;front=z<-.07
    yy=y-1.68
    if yy>0:yy+=.10*math.exp(-(x/.28)**2)
    return front and (x/.777)**2+(yy/.535)**2<1.00

def add_fur(name,ob,count,length,thickness,material,skip=None,seed=1):
    rng=random.Random(seed);me=ob.data;me.calc_loop_triangles();triangles=list(me.loop_triangles)
    # Weighted triangle sampling makes the nap uniform over the sculpt.
    chosen=[];cum=[];total=0
    for tr in triangles:
        center=sum((me.vertices[i].co for i in tr.vertices),Vector())/3
        if skip and skip(center):continue
        total+=tr.area;chosen.append(tr);cum.append(total)
    positions=array('f');rads=array('f');goldWeights=array('f');npts=5
    for k in range(count):
        tr=chosen[bisect.bisect_left(cum,rng.random()*total)]
        u=math.sqrt(rng.random());v=rng.random();weights=(1-u,u*(1-v),u*v)
        ids=tr.vertices
        pos=sum((me.vertices[i].co*w for i,w in zip(ids,weights)),Vector())
        normal=sum((me.vertices[i].normal*w for i,w in zip(ids,weights)),Vector()).normalized()
        down=Vector((0,0,-1));tangent=down-normal*down.dot(normal)
        if tangent.length<.1:tangent=Vector((1,0,0))-normal*normal.x
        tangent.normalize();side=normal.cross(tangent).normalized()
        patch=math.sin(pos.x*58+math.sin(pos.z*31))*math.sin(pos.z*47+pos.y*39)
        strandLength=length*min(2.15,max(.4,rng.lognormvariate(-.08,.34)))*(1+.18*patch)
        if ob==face:
            eyeDistance=min(math.sqrt(((pos.x-eyeX)/.135)**2+((pos.z-1.74)/.185)**2) for eyeX in (-.325,.325))
            strandLength*=max(.08,min(1,(eyeDistance-.82)/.40))
        lean=rng.uniform(.20,.85);curl=rng.uniform(-.40,.40);phase=rng.random()*math.tau
        sweep=math.sin(pos.x*43+pos.z*34+math.sin(pos.y*29))*.38
        tangent=(tangent+side*sweep).normalized()
        goldWeight=crest_weight(pos.x,pos.z) if ob==body else 0
        if ob==tail:
            goldWeight=sum(tailMask.data[i].value*w for i,w in zip(ids,weights))
            strandLength*=1-.65*goldWeight
        for j in range(npts):
            t=j/(npts-1)
            p=pos+normal*(strandLength*t*(1-.28*t))+tangent*(strandLength*lean*t*t)+side*(strandLength*curl*math.sin(t*2.5+phase)*t)
            positions.extend(p);rads.append(thickness*(1-t)**.8+.000025);goldWeights.append(goldWeight)
    curves=bpy.data.hair_curves.new(name);curves.add_curves([npts]*count)
    curves.attributes['position'].data.foreach_set('vector',positions)
    radius=curves.attributes.new('radius','FLOAT','POINT');radius.data.foreach_set('value',rads)
    tint=curves.attributes.new('crest_gold','FLOAT','POINT');tint.data.foreach_set('value',goldWeights)
    hair=bpy.data.objects.new(name,curves);bpy.context.collection.objects.link(hair);curves.materials.append(material)
    print('FUR',name,count,flush=True);return hair

add_fur('Graphite short feather coat',body,240000,.046,.00040,coalHair,skip=face_region,seed=3)
add_fur('Cream fine facial down',face,110000,.023,.00034,creamHair,seed=4)
for i,w in enumerate(wings):add_fur('Folded wing fine feathers '+str(i),w,13000,.019,.00045,coalHair,seed=20+i)
add_fur('Tail short fine coat',tail,28000,.018,.00030,coalHair,seed=30)

# Render studio. Area lights provide actual broad eye catchlights and soft shadows.
world=bpy.data.worlds.new('Warm neutral studio');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.105,.10,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.30;bpy.context.scene.world=world
def light(name,pos,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=xyz(pos)
    ob.rotation_euler=(Vector(xyz((0,1.50,0)))-ob.location).to_track_quat('-Z','Y').to_euler()
light('Large window key',(-3.5,5,4),430,4,(1,.95,.87))
light('Gentle camera fill',(3,2.6,4),110,3,(.89,.94,1))
light('Soft feather rim',(1.5,4,-3),430,3,(1,.91,.73))
floorMat=mat('Graphite studio floor',(.009,.010,.013),.88,.20)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.04));floor=bpy.context.object;floor.name='Studio floor';floor.data.materials.append(floorMat)
campos=(2.7,2.55,8) if ANGLE=='hero' else (0,2.05,8)
target=(0,1.53,0);ortho=3.75
if ANGLE=='detail':campos=(1.5,2.2,7);target=(0,1.92,.15);ortho=2.18
bpy.ops.object.camera_add(location=xyz(campos));cam=bpy.context.object;cam.name='Portrait camera'
cam.rotation_euler=(Vector(xyz(target))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=ortho
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.samples=SAMPLES;scene.cycles.use_denoising=True
scene.cycles.adaptive_threshold=.015;scene.cycles.max_bounces=8;scene.cycles.diffuse_bounces=4;scene.cycles.glossy_bounces=4
scene.render.resolution_x=SIZE;scene.render.resolution_y=SIZE;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.25
scene.render.filepath=os.path.join(OUT,f'griffin-master-{VERSION}-{ANGLE}.png')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,f'griffin-master-{VERSION}.blend'),compress=True)
print('RENDER_START',time.time()-START,flush=True)
bpy.ops.render.render(write_still=True)
print(json.dumps({'version':VERSION,'image':scene.render.filepath,'elapsed_seconds':round(time.time()-START,1),'curves':sum(len(o.data.curves) for o in scene.objects if o.type=='CURVES'),'samples':SAMPLES,'resolution':SIZE}),flush=True)
