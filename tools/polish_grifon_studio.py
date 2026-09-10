"""One local look-development still, derived from the committed studio pilot.

blender --background --factory-startup --python-exit-code 1
        --python tools/polish_grifon_studio.py
Outputs are separate from the accepted blockout. No network or paid services.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/hero-film/studio-look"
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / "assets/hero-film/studio-pilot/studio.blend"))
scene = bpy.context.scene


def mat(name, color, rough=.4, metal=0, transmission=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*color, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Transmission Weight"].default_value = transmission
    p.inputs["IOR"].default_value = 1.46
    return m


def texture(m, scale, strength, distance, stretch=None):
    nodes, links = m.node_tree.nodes, m.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 3
    coords = nodes.new("ShaderNodeTexCoord")
    if stretch:
        mapping = nodes.new("ShaderNodeVectorMath")
        mapping.operation = "MULTIPLY"
        mapping.inputs[1].default_value = stretch
        links.new(coords.outputs["Generated"], mapping.inputs[0])
        links.new(mapping.outputs[0], noise.inputs["Vector"])
    else:
        links.new(coords.outputs["Generated"], noise.inputs["Vector"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = distance
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs[0], nodes.get("Principled BSDF").inputs["Normal"])


def assign(obj, material):
    obj.data.materials.clear()
    obj.data.materials.append(material)


def lathe(name, profile, material, segments=160):
    verts = [(r*math.cos(2*math.pi*j/segments), r*math.sin(2*math.pi*j/segments), z)
             for r, z in profile for j in range(segments)]
    faces = []
    for i in range(len(profile)):
        ni = (i + 1) % len(profile)
        for j in range(segments):
            nj = (j + 1) % segments
            faces.append((i*segments+j, i*segments+nj, ni*segments+nj, ni*segments+j))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    assign(obj, material)
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, loc, target, power, size, color, size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = power, "RECTANGLE", size, color
    data.size_y = size_y if size_y else size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    return obj


charcoal = mat("Look / charcoal plaster", (.011, .012, .015), .83)
texture(charcoal, 110, .22, .012)
floor = mat("Look / honed charcoal floor", (.023, .025, .028), .3)
texture(floor, 160, .2, .004)
wood = mat("Look / smoked oak", (.052, .03, .017), .38)
texture(wood, 6, .38, .009, (2, 2, 90))
stone = mat("Look / pale travertine", (.31, .28, .22), .55)
texture(stone, 130, .3, .003)
gold = mat("Look / brushed gold", (.7, .43, .055), .3, .82)
texture(gold, 190, .13, .0006)
rubber = mat("Look / matte graphite", (.012, .013, .015), .58)
paper = mat("Look / warm cotton label", (.62, .58, .46), .73)
texture(paper, 230, .28, .0004)
glass = mat("Look / clear glass", (.97, .985, 1), .105, transmission=1)
coffee = mat("Look / coffee liquid", (.24, .085, .025), .12, transmission=1)
coffee.node_tree.nodes.get("Principled BSDF").inputs["IOR"].default_value = 1.333
absorption = coffee.node_tree.nodes.new("ShaderNodeVolumeAbsorption")
absorption.inputs["Color"].default_value = (.16, .05, .01, 1)
absorption.inputs["Density"].default_value = 30
coffee.node_tree.links.new(absorption.outputs["Volume"], coffee.node_tree.nodes.get("Material Output").inputs["Volume"])

for obj in list(scene.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    if obj.type not in ("MESH", "CURVE", "FONT"):
        continue
    n = obj.name
    if n in ("Stage floor",): assign(obj, floor)
    elif n == "Back wall" or n.startswith("Acoustic vertical"): assign(obj, charcoal)
    elif n.startswith("Wood slat") or n in ("Owner desk top", "Proof console"): assign(obj, wood)
    elif n in ("Product plinth", "Warm inset wall"): assign(obj, stone)
    elif n in ("Product plinth gold edge", "Floor gold guide") or "mount" in n: assign(obj, gold)
    elif n.startswith("Chair") or "frame" in n or "housing" in n: assign(obj, rubber)
    if n.startswith("Proof placeholder") or n == "Workplace placeholder":
        obj.hide_render = True

# Replace only in this derived scene; the committed pilot remains unchanged.
for name in ("Bottle body proxy", "Bottle shoulder proxy", "Bottle neck proxy", "Bottle cap proxy", "Plain blank label"):
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)

outer = [(.008,1.077),(.112,1.077),(.133,1.082),(.144,1.096),(.146,1.125),
         (.146,1.47),(.143,1.5),(.133,1.524),(.107,1.55),(.078,1.575),
         (.067,1.598),(.067,1.665),(.06,1.67)]
inner = [(.058,1.66),(.058,1.602),(.07,1.582),(.1,1.558),(.125,1.53),
         (.134,1.505),(.137,1.47),(.137,1.122),(.127,1.10),(.008,1.10)]
lathe("Look bottle / closed glass shell", outer+inner, glass)
lathe("Look bottle / fill", [(.008,1.105),(.125,1.105),(.134,1.125),(.134,1.465),(.132,1.493),(.008,1.493)], coffee)
lathe("Look bottle / paper sleeve", [(.147,1.225),(.147,1.442),(.1475,1.442),(.1475,1.225)], paper)
lathe("Look bottle / cap", [(.001,1.668),(.076,1.668),(.081,1.674),(.081,1.722),(.074,1.728),(.001,1.728)], rubber)
lathe("Look bottle / cap seam", [(.079,1.668),(.081,1.67),(.081,1.676),(.079,1.674)], gold)
for i in range(80):
    theta = 2*math.pi*i/80
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=6, location=(.081*math.cos(theta), .081*math.sin(theta), 1.7))
    grip = bpy.context.object
    grip.name = "Cap micro grip %02d" % i
    grip.scale = (.0018, .0018, .02)
    assign(grip, rubber)
    for poly in grip.data.polygons: poly.use_smooth = True

# Physical demo-only typography; no unapproved coffee brand or product claims.
ink = mat("Look / label ink", (.026, .023, .017), .8)
def label(body, z, size):
    theta = math.radians(26)
    data = bpy.data.curves.new("Demo label " + body, "FONT")
    data.body, data.align_x, data.size, data.extrude = body, "CENTER", size, 0
    obj = bpy.data.objects.new("Demo label " + body, data)
    scene.collection.objects.link(obj)
    obj.location = (.148*math.sin(theta), -.148*math.cos(theta), z)
    obj.rotation_euler = (math.pi/2, 0, theta)
    assign(obj, ink)
    # Conform the printed glyph geometry to the paper, rather than a tangent plane.
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target="MESH")
    for vertex in obj.data.vertices:
        x, y = vertex.co.x, vertex.co.y
        angle = theta + x / .1475
        vertex.co = (.14765*math.sin(angle), -.14765*math.cos(angle), z+y)
    obj.location = (0, 0, 0)
    obj.rotation_euler = (0, 0, 0)
label("D E M O", 1.377, .022)
label("01", 1.28, .081)

bpy.context.view_layer.update()
plinth = bpy.data.objects["Product plinth gold edge"]
bottle = bpy.data.objects["Look bottle / closed glass shell"]
top = max((plinth.matrix_world @ Vector(v)).z for v in plinth.bound_box)
bottom = min((bottle.matrix_world @ Vector(v)).z for v in bottle.bound_box)
for obj in scene.objects:
    if obj.name.startswith(("Look bottle /", "Cap micro grip", "Demo label ")):
        obj.location.z += top-bottom

# Tall reflections define glass edges; background exposure stays subordinate.
area("Look / broad key", (-1.2,-2.2,3.5), (0,0,1.4), 230, 2.1, (1,.91,.75), 3)
area("Look / glass strip left", (-.65,-.25,1.9), (0,0,1.4), 45, .12, (1,.94,.82), 1.4)
area("Look / glass strip right", (.65,.3,1.9), (0,0,1.4), 95, .15, (1,.75,.36), 1.6)
area("Look / gentle front fill", (1,-3,2.2), (0,0,1.4), 28, 1.8, (.86,.91,1), 1.8)
area("Look / warm work area", (-3,1.5,3.4), (-3,.4,.8), 120, 2.2, (1,.75,.41), 2)
area("Look / back wall wash", (3,1,4), (2,3.7,2.3), 65, 2.5, (.8,.86,1), 2.5)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .06
scene.camera = bpy.data.objects["03_Product"]
scene.camera.location = (1.8,-3.8,1.93)
aim(scene.camera, (-.16,0,1.42))
scene.camera.data.lens = 66
scene.camera.data.dof.use_dof = True
bpy.ops.object.empty_add(location=(0,0,1.40))
focus = bpy.context.object
focus.name = "Hero focus / label"
scene.camera.data.dof.focus_object = focus
scene.camera.data.dof.aperture_fstop = 5.6
scene.render.engine = "CYCLES"
scene.cycles.samples = 128
scene.cycles.use_denoising = True
scene.cycles.device = "CPU"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "CUDA"
    prefs.get_devices()
    gpu = [d for d in prefs.devices if d.type == "CUDA"]
    for d in prefs.devices: d.use = d in gpu
    if gpu: scene.cycles.device = "GPU"
except (TypeError, RuntimeError):
    pass
scene.view_settings.view_transform = "AgX"
scene.view_settings.exposure = -0.7
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = str(OUT / "hero-frame.png")
scene["look_scope"] = "Local look development only. Demo identity; not Grifon product output or finished film."
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "studio-look.blend"), compress=True)
print(json.dumps({"engine": scene.render.engine, "device": scene.cycles.device, "samples": scene.cycles.samples, "objects": len(scene.objects)}))
bpy.ops.render.render(write_still=True)
