"""Editable original product recreation, observed supplier video used only as reference.
Relative equipment proportions; no measured engineering dimensions or fabrication claim.
Run in a dedicated background Blender, never in the user's open scene.
"""
import bpy, math, json, random, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}
def mat(name,color,metal=0,rough=.3,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;p.inputs['Alpha'].default_value=alpha
    M[name]=m
mat('Vessel gray',(.68,.72,.74),.1,.3);mat('PVC ivory',(.89,.90,.88),.05,.28)
mat('Pressure blue',(.008,.21,.70),.18,.24);mat('Black polymer',(.012,.016,.021),0,.32)
mat('Brushed metal',(.43,.49,.53),.78,.27);mat('Cabinet enamel',(.89,.91,.93),.15,.27)
mat('Terminal green',(.55,.67,.22),.1,.34);mat('Clear pipe',(.73,.63,.32),.05,.24,.55)
mat('UV quartz',(.45,.74,.9),.1,.15,.24);mat('UV source',(.38,.22,.95),.1,.23)
mat('Filter media',(.62,.43,.13),.05,.78);mat('Filter upper',(.74,.58,.24),0,.8)
mat('Water',(.08,.45,.65),0,.18,.35);mat('Concrete',(.57,.60,.62),0,.82)
mat('Sludge',(.25,.17,.08),0,.86);mat('Backdrop',(.90,.92,.95),0,.75)
def finish(o,name,material,stage,bevel=0,variant='normal',cut=''):
    o.name=name;o.data.materials.append(M[material]);o['stage']=stage;o['variant']=variant;o['cutFor']=cut
    if bevel:
        b=o.modifiers.new('Edge highlight','BEVEL');b.width=bevel;b.segments=2
        n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
    return o
def box(name,loc,dim,material,stage='all',bevel=.018,**kwargs):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,name,material,stage,bevel,**kwargs)
def cyl(name,loc,r,h,material,stage='all',vertices=48,**kwargs):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h,location=loc)
    o=finish(bpy.context.object,name,material,stage,.009,**kwargs)
    for f in o.data.polygons:f.use_smooth=True
    return o
def cone(name,loc,r1,r2,h,material,stage='all'):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r1,radius2=r2,depth=h,location=loc)
    o=finish(bpy.context.object,name,material,stage,.008)
    for f in o.data.polygons:f.use_smooth=True
    return o
def ball(name,loc,scale,material,stage='all',**kwargs):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o=finish(o,name,material,stage,**kwargs)
    for f in o.data.polygons:f.use_smooth=True
    return o
def rounded_points(points,r=.13):
    ps=[Vector(p) for p in points];out=[ps[0]]
    for i in range(1,len(ps)-1):
        a,b,c=ps[i-1:i+2];d=min(r,(b-a).length*.35,(c-b).length*.35);p=b+(a-b).normalized()*d;q=b+(c-b).normalized()*d
        out.append(p)
        for j in range(1,7):
            t=j/6;out.append((1-t)**2*p+2*(1-t)*t*b+t*t*q)
    out.append(ps[-1]);return out
def pipe(name,points,stage='all',material='PVC ivory',radius=.045):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=radius;cv.bevel_resolution=3
    pts=rounded_points(points);s=cv.splines.new('POLY');s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts):p.co=(*co,1)
    o=bpy.data.objects.new(name,cv);bpy.context.collection.objects.link(o);o.data.materials.append(M[material]);o['stage']=stage;o['variant']='normal';return o
def rib_collar(name,x,y,z,r,h,stage):
    cyl(name+' core',(x,y,z),r,h,'Black polymer',stage)
    ribs=[]
    for j in range(36):
        a=j*math.tau/36;o=box(name+' grip',(x+(r+.005)*math.cos(a),y+(r+.005)*math.sin(a),z),(.025,.045,h),'Black polymer',stage,.003);o.rotation_euler[2]=a;ribs.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for o in ribs:o.select_set(True)
    bpy.context.view_layer.objects.active=ribs[0];bpy.ops.object.join();ribs[0].name=name+' machined grips'
def sector(name,x,y,z,r,h,material,stage):
    # Open front sector, an explanatory cutaway, not a different physical vessel.
    verts=[];faces=[];n=60
    for i in range(n+1):
        a=math.radians(-25)+math.radians(230)*i/n
        for zz in (-h/2,h/2):verts.append((x+r*math.cos(a),y+r*math.sin(a),z+zz))
    for i in range(n):faces.append((2*i,2*i+2,2*i+3,2*i+1))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    finish(o,name,material,stage,variant='cutShell',cut=stage)
    for f in mesh.polygons:f.use_smooth=True
    o.hide_render=True
def media_wedge(name,x,y,z,r,h,material):
    # A sectioned media bed exposes the white central riser in the explanation.
    # This is a visualization cutaway, not an opening in the physical filter.
    verts=[(x,y,z-h/2),(x,y,z+h/2)];faces=[];steps=72
    for i in range(steps+1):
        a=math.radians(-55+290*i/steps)
        verts.extend([(x+r*math.cos(a),y+r*math.sin(a),z-h/2),(x+r*math.cos(a),y+r*math.sin(a),z+h/2)])
    for i in range(steps):
        j=2+2*i;faces.extend([(j,j+2,j+3,j+1),(0,j+2,j),(1,j+1,j+3)])
    faces.extend([(0,2,3,1),(0,1,3+2*steps,2+2*steps)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    finish(o,name,material,'filtration',variant='inside',cut='filtration')
def reactor(name,x,y,h,stage,cut=False):
    r=.30;lo=.19;top=lo+h
    body=cyl(name+' solid shell',(x,y,lo+h*.47),r,h*.89,'Vessel gray',stage,variant='solidShell' if cut else 'normal',cut=stage if cut else '')
    cyl(name+' lower base',(x,y,.15),r+.025,.14,'Vessel gray',stage)
    cyl(name+' lower dark band',(x,y,.15+h*.21),r+.007,.12,'Black polymer',stage)
    for zz in (lo+h*.48,lo+h*.73):cyl(name+' body seam',(x,y,zz),r+.002,.008,'Brushed metal',stage)
    cone(name+' shoulder',(x,y,top-.10),r,.23,.22,'Vessel gray',stage)
    rib_collar(name+' top union',x,y,top-.19,r+.035,.19,stage)
    if stage=='aop':
        for dx in (-.095,.095):
            cyl(name+' terminal seat',(x+dx,y,top+.047),.055,.045,'PVC ivory',stage,24)
            cyl(name+' green terminal',(x+dx,y,top+.13),.039,.13,'Terminal green',stage,24)
    else:cyl(name+' cap inlet',(x,y,top+.04),.065,.065,'PVC ivory',stage,24)
    # Fine gray foot flanges and lower service port, as seen in the supplier views.
    port=cyl(name+' front service port',(x,y-.303,.30),.065,.045,'Black polymer',stage,24);port.rotation_euler[0]=math.pi/2
    for dx in (-.22,.22):box(name+' base foot',(x+dx,y,.065),(.12,.43,.08),'Vessel gray',stage,.009)
    if cut:
        sector(name+' open cutaway',x,y,lo+h*.48,r,h*.60,'Vessel gray',stage)
        for zz,hh in ((lo+h*.09,h*.18),(lo+h*.84,h*.20)):
            cyl(name+' cutaway end shell',(x,y,zz),r,hh,'Vessel gray',stage,variant='cutShell',cut=stage).hide_render=True
        if stage=='ec':
            for dx in (-.09,.09):
                for dy in (-.09,.09):cyl(name+' electrode',(x+dx,y+dy,lo+h*.48),.026,h*.72,'Brushed metal',stage,24,variant='inside',cut=stage)
        else:
            cyl(name+' UV quartz sleeve',(x,y,lo+h*.48),.065,h*.72,'UV quartz',stage,32,variant='inside',cut=stage)
            cyl(name+' UV lamp',(x,y,lo+h*.48),.026,h*.69,'UV source',stage,24,variant='inside',cut=stage)

# Relative assembly positions reconstructed from the rotating supplier video.
EC=[];AOP=[]
for row in range(2):
    for i in range(3):
        x=-2.65+i*.72;y=-.95+row*.70;reactor('EC %d %d'%(row,i),x,y,2.25,'ec',row==0 and i==1);EC.append((x,y))
        x=.05+i*.72;y=.05+row*.70;reactor('AOP %d %d'%(row,i),x,y,2.88,'aop',row==0 and i==1);AOP.append((x,y))
# Rounded blue pressure vessels with source-style rectangular black valve heads.
for i in range(2):
    x=-1.75+i*1.08;y=.94;cut=i==1
    cyl('Blue vessel %d solid shell'%i,(x,y,2.50),.46,4.28,'Pressure blue','filtration',variant='solidShell' if cut else 'normal',cut='filtration' if cut else '')
    ball('Blue vessel %d shoulder'%i,(x,y,4.64),(.46,.46,.28),'Pressure blue','filtration')
    ball('Blue vessel %d heel'%i,(x,y,.36),(.46,.46,.20),'Pressure blue','filtration')
    cyl('Blue vessel %d foot'%i,(x,y,.17),.47,.23,'Black polymer','filtration')
    cyl('Valve neck %d'%i,(x,y,4.94),.14,.20,'Black polymer','filtration')
    box('Rectangular valve control %d'%i,(x,y-.035,5.08),(.51,.36,.28),'Black polymer','filtration',.035)
    if cut:
        sector('Media vessel open cutaway',x,y,2.50,.46,3.90,'Pressure blue','filtration')
        media_wedge('Media lower bed',x,y,1.14,.43,1.40,'Filter media')
        media_wedge('Media upper bed',x,y,2.75,.43,1.75,'Filter upper')
        cyl('Media central riser',(x,y,2.5),.04,4.12,'PVC ivory','filtration',variant='inside',cut='filtration')
        rng=random.Random(21)
        for k in range(125):
            a=rng.uniform(-math.pi,0);rr=rng.uniform(.43,.46);z=rng.uniform(.55,3.5)
            if math.radians(-125)<a<math.radians(-55):continue
            ball('Media grain %03d'%k,(x+rr*math.cos(a),y+rr*math.sin(a),z),(.025,.025,.022),'Filter upper','filtration',variant='inside',cut='filtration')
# Source top distribution piping with elbows and union collars.
pipe('Blue upper distribution',[(-1.75,.92,4.93),(-.67,.92,4.93),(.2,.92,4.93),(.2,-.82,4.93),(.2,-.82,2.68)],'filtration',radius=.046)
pipe('Blue parallel return',[(-1.75,.77,4.77),(-1.75,.35,4.77),(.06,.35,4.77),(2.07,.35,4.77),(2.07,-.90,4.77),(2.07,-.9,2.68)],'filtration',radius=.038)
for x in (-1.75,-.67):
    for z in (4.77,4.93):cyl('Blue pipe union',(x,.94,z),.071,.12,'PVC ivory','filtration',24)
# Horizontal fractionation housings, upper large and lower distinctly slender.
for idx,(z,r) in enumerate(((2.68,.255),(1.30,.105))):
    o=cyl('Fractionation housing %d solid shell'%idx,(.82,-.91,z),r,2.50,'PVC ivory','filtration',variant='solidShell' if idx==0 else 'normal',cut='fractionation' if idx==0 else '');o.rotation_euler[1]=math.pi/2
    for x in (-.46,2.10):
        o=cyl('Fractionation flange',(x,-.91,z),r+.045,.07,'Brushed metal','filtration');o.rotation_euler[1]=math.pi/2
        o=cyl('Fractionation union',(x+.025,-.91,z),r+.02,.11,'PVC ivory','filtration');o.rotation_euler[1]=math.pi/2
    if idx==0:
        o=cyl('Fractionation filter core',(.82,-.91,z),r*.57,2.28,'Brushed metal','filtration',32,variant='inside',cut='fractionation');o.rotation_euler[1]=math.pi/2
pipe('Fractionation bottom return',[(-.46,-.91,2.68),(-.65,-.91,2.68),(-.65,-.91,1.30),(-.46,-.91,1.30)],'filtration',radius=.045)
end=cyl('Upper filter central outlet',(2.22,-.91,2.68),.068,.22,'PVC ivory','filtration');end.rotation_euler[1]=math.pi/2
end=cyl('Upper filter outlet union',(2.16,-.91,2.68),.10,.065,'Brushed metal','filtration');end.rotation_euler[1]=math.pi/2
pipe('Upper filter end connection',[(2.32,-.91,2.68),(2.44,-.91,2.68),(2.44,.05,2.68),(1.79,.05,2.68)],'filtration',radius=.041)
pipe('Filter downstream manifold',[(2.10,-.91,1.30),(2.28,-.91,1.30),(2.28,-.91,.24),(1.49,.05,.24)],'aop',radius=.045)
# Light steel frame, blank two-part source control cabinet, pump and ring blower.
for x in (-.38,2.16):
    box('Frame upright',(x,-.72,1.80),(.044,.044,3.44),'Brushed metal')
    box('Frame floor runner',(x,-.34,.04),(.065,1.45,.065),'Brushed metal')
for z in (.12,1.22,2.60,3.50):box('Frame cross member',(.89,-.72,z),(2.60,.045,.045),'Brushed metal')
for z,h in ((3.05,1.95),(1.10,1.13)):
    box('Control cabinet shell',(2.20,.65,z),(.55,.24,h),'Cabinet enamel',bevel=.015)
    box('Control cabinet door',(2.20,.511,z),(.52,.028,h-.04),'Cabinet enamel',bevel=.009)
    box('Cabinet hinge',(1.93,.50,z+.35),(.025,.035,.12),'Brushed metal')
# Blue booster pump, horizontal finned electric motor and metal volute.
o=cyl('Booster blue motor',(.14,-1.20,.35),.205,.53,'Pressure blue');o.rotation_euler[1]=math.pi/2
for x in (-.04,.02,.08,.14,.20,.26,.32):
    o=cyl('Booster cooling fin',(x,-1.20,.35),.219,.015,'Pressure blue',vertices=32);o.rotation_euler[1]=math.pi/2
o=cyl('Booster rear fan',(.43,-1.20,.35),.209,.06,'Black polymer');o.rotation_euler[1]=math.pi/2
o=cyl('Booster pump volute',(-.21,-1.20,.35),.24,.14,'Brushed metal');o.rotation_euler[1]=math.pi/2
for x in (-.08,.31):box('Booster foot',(x,-1.20,.105),(.16,.40,.10),'Pressure blue')
pipe('Booster suction',[(-.30,-1.20,.35),(-.58,-1.20,.35),(-.58,-.95,.24),(-1.21,-.95,.24)],'ec',radius=.055)
pipe('Booster discharge',[(-.21,-1.20,.57),(-.21,-1.20,.76),(-.64,-1.20,.76),(-.64,-.91,2.68)],'filtration',radius=.05)
o=cyl('Ring blower housing',(1.48,-.72,.40),.30,.17,'Brushed metal');o.rotation_euler[0]=math.pi/2
o=cyl('Ring blower center',(1.48,-.83,.40),.15,.10,'Brushed metal');o.rotation_euler[0]=math.pi/2
for j in range(18):
    a=j*math.tau/18;o=box('Ring blower radial fin',(1.48+.23*math.cos(a),-.83,.40+.23*math.sin(a)),(.07,.065,.019),'Brushed metal',bevel=.003);o.rotation_euler[1]=-a
box('Ring blower feet',(1.48,-.72,.08),(.46,.44,.10),'Brushed metal')
# Short reactor links: source-like parallel manifolds, no invented large plinth.
for row in range(2):
    pts=EC[row*3:row*3+3];yy=pts[0][1]-.34
    pipe('EC upper yellow header',[(pts[0][0]-.38,yy,1.94),(pts[-1][0]+.35,yy,1.94)],'ec','Clear pipe',.039)
    pipe('EC yellow feed downleg',[(pts[0][0]-.38,yy,.17),(pts[0][0]-.38,yy,1.94),(pts[0][0],yy,1.94)],'ec','Clear pipe',.039)
    for i,(x,y) in enumerate(pts):
        pipe('EC upper branch',[(x,yy,1.94),(x,y-.27,1.94)],'ec','Clear pipe',.036)
        for dx in (-.12,.12):
            u=cyl('EC header union',(x+dx,yy,1.94),.051,.065,'Clear pipe','ec',24);u.rotation_euler[1]=math.pi/2
        if i<2:
            nx,ny=pts[i+1];pipe('EC short lower link',[(x+.30,y-.12,.24),(nx-.30,ny-.12,.24)],'ec','PVC ivory',.035)
for stage,coords,h,material in (('aop',AOP,2.88,'Water'),):
    for row in range(2):
        pts=coords[row*3:row*3+3]
        for i,(x,y) in enumerate(pts):
            if i<2:
                nx,ny=pts[i+1];pipe(stage+' lower U link',[(x,y,.29),(x,y-.40,.29),(nx,ny-.40,.29),(nx,ny,.29)],stage,material,radius=.037)
            pipe(stage+' side return',[(x,y-.22,.34),(x-.38,y-.22,.34),(x-.38,y-.22,h-.25),(x,y-.22,h-.25)],stage,material,radius=.031)
pipe('Outlet discharge',[(1.49,.75,.22),(2.57,.75,.22)],'verify','Water',.048)
# Source tank context, separate below-ground illustration. Hidden for product shots.
box('Belowground floor',(-.35,.35,-1.65),(5.0,2.25,.12),'Concrete','settling')
box('Belowground back',(-.35,1.47,-.85),(5.0,.10,1.60),'Concrete','settling')
for x in (-2.80,-1.15,.50,2.10):box('Tank partition',(x,.35,-.85),(.10,2.25,1.60),'Concrete','settling')
box('Tank sludge',(-.35,.35,-1.47),(4.83,2.05,.18),'Sludge','settling')
cyl('Tank feed submersible',(-2.10,.20,-1.05),.15,.58,'Brushed metal','settling')
pipe('Tank feed line',[(-2.10,.20,-.82),(-2.10,.20,.10),(-2.65,-.95,.10)],'settling',radius=.047)

# Editable lighting and native multi-angle renders from this same master.
box('Studio floor',(0,0,-.11),(200,200,.08),'Backdrop','studio',0)
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.70,.76,.85,1);world.node_tree.nodes['Background'].inputs[1].default_value=.4;bpy.context.scene.world=world
def area(name,loc,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((-.2,0,2))-o.location).to_track_quat('-Z','Y').to_euler()
area('Key softbox',(-4,-6,9),1300,7);area('Rim softbox',(4,3,7),1700,5);area('Front card',(4,-7,4),600,4)
bpy.ops.object.camera_add(location=(8,-14,7));cam=bpy.context.object;cam.name='Product hero';cam.data.type='ORTHO';cam.data.ortho_scale=12.3
cam.rotation_euler=(Vector((-.25,0,2.55))-cam.location).to_track_quat('-Z','Y').to_euler()
sc=bpy.context.scene;sc.camera=cam;sc.render.engine='CYCLES';sc.cycles.samples=32;sc.cycles.use_denoising=True;sc.view_settings.view_transform='AgX'
sc.render.resolution_x=1920;sc.render.resolution_y=1080;sc.render.resolution_percentage=65;sc.render.image_settings.file_format='PNG'
for o in sc.objects:
    if o.get('stage')=='settling' or o.get('variant') in ('cutShell','inside'):o.hide_render=True
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Oceanides-STP-Recreated.blend'))
objects=[o for o in sc.objects if o.type in {'MESH','CURVE'} and o.get('stage')!='studio']
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'Oceanides-STP-Recreated.glb'),use_selection=True,export_format='GLB',export_apply=True)
deps=bpy.context.evaluated_depsgraph_get();items=[]
for o in objects:
    eo=o.evaluated_get(deps);mesh=eo.to_mesh();mesh.calc_loop_triangles();pos=[];nor=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
    for tri in mesh.loop_triangles:
        for idx in tri.loops:
            li=mesh.loops[idx];v=o.matrix_world@mesh.vertices[li.vertex_index].co;n=normal_matrix@mesh.corner_normals[idx].vector
            pos.extend(round(k,5) for k in (v.x,v.z,-v.y));nor.extend(round(k,5) for k in (n.x,n.z,-n.y))
    ma=o.data.materials[0];p=ma.node_tree.nodes.get('Principled BSDF')
    items.append({'name':o.name,'stage':o.get('stage','all'),'variant':o.get('variant','normal'),'cutFor':o.get('cutFor',''),'positions':pos,'normals':nor,'material':{'name':ma.name,'color':list(ma.diffuse_color)[:3],'alpha':ma.diffuse_color[3],'metalness':p.inputs['Metallic'].default_value,'roughness':p.inputs['Roughness'].default_value}});eo.to_mesh_clear()
(OUT/'mesh.next.json').write_text(json.dumps({'engineeringDimensions':False,'geometry':'Original authored 3D recreation from visible supplier reference','objects':items},separators=(',',':')),encoding='utf-8');(OUT/'mesh.next.json').replace(OUT/'mesh.json')
for name,loc,target,scale in ([] if '--mesh-only' in sys.argv else [('hero',(8,-14,7),(-.25,0,2.55),12.3),('front',(0,-16,4.4),(-.2,0,2.55),11.4),('rear',(-8,14,6),(-.2,0,2.55),12.0)]):
    cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;sc.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
(OUT/'manifest.json').write_text(json.dumps({'version':'recreation-v4','blender':bpy.app.version_string,'objects':len(items),'native':'Oceanides-STP-Recreated.blend','sourceUse':'Reference viewing only. No source video frames, watermark textures, downloaded video or supplier pixels in render.','dimensions':'Relative observed proportions; hidden connections unverified.','bodyCounts':{'ec':6,'blue':2,'aop':6,'horizontal':2},'renderResolution':[1248,702]},indent=2)+'\n',encoding='utf-8')
print('RECREATION_MASTER_COMPLETE',len(items),flush=True)
