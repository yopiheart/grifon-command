"""Rebuild the local, asset-free Blender studio pilot (not Grifon product output).

Blender 5.2: blender --background --factory-startup --python-exit-code 1
             --python tools/build_grifon_studio.py -- --mode stills
Then: blender --background assets/hero-film/studio-pilot/studio.blend
             --python-exit-code 1 --python tools/build_grifon_studio.py -- --mode preview
Preview PNG intermediates go to .tmp; FFmpeg encoding is documented in README.md.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/hero-film/studio-pilot"
FRAMES = ROOT / ".tmp/studio-pilot-frames"
parser = argparse.ArgumentParser()
parser.add_argument("--mode", choices=["stills", "preview", "verify"], default="stills")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
OUT.mkdir(parents=True, exist_ok=True)


def material(name, color, metallic=0, roughness=0.5, emission=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return mat


def finish(obj, name, mat, bevel=0):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft manufactured edges", "BEVEL")
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def box(name, loc, scale, mat, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, loc, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=loc)
    obj = finish(bpy.context.object, name, mat, 0.018)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def curve(name, points, radius, mat):
    data = bpy.data.curves.new(name, "CURVE")
    data.dimensions, data.bevel_depth, data.bevel_resolution = "3D", radius, 4
    spline = data.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, xyz in zip(spline.bezier_points, points):
        point.co = xyz
        point.handle_left_type = point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def light(name, loc, target, power, size, color=(1, 0.91, 0.79)):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.shape, data.size, data.color = power, "DISK", size, color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)


def text(name, body, loc, size, mat):
    data = bpy.data.curves.new(name, "FONT")
    data.body, data.size, data.align_x, data.extrude = body, size, "CENTER", 0.001
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location, obj.rotation_euler = loc, (math.pi / 2, 0, 0)
    data.materials.append(mat)
    return obj


def camera(name, loc, target, lens):
    data = bpy.data.cameras.new(name)
    data.lens, data.clip_start, data.clip_end = lens, 0.08, 100
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    return obj


def build():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    charcoal = material("Charcoal / architectural", (0.026, 0.027, 0.032), roughness=0.68)
    graphite = material("Graphite / furniture", (0.07, 0.074, 0.082), roughness=0.46)
    gold = material("Gold / restrained hardware", (0.92, 0.60, 0.045), 0.7, 0.27)
    cream = material("Warm stone", (0.60, 0.57, 0.49), roughness=0.66)
    white = material("Softbox diffusion", (0.8, 0.82, 0.83), emission=0.5)
    paper = material("Unapproved plain label", (0.72, 0.68, 0.55), roughness=0.7)
    coffee = material("Coffee proxy / opaque", (0.075, 0.030, 0.015), roughness=0.28)
    green = material("Leaf", (0.05, 0.095, 0.06), roughness=0.7)
    screen = material("Empty proof placeholder", (0.09, 0.11, 0.12), emission=0.15)
    glow = material("Warm practical light", (1, 0.65, 0.15), emission=2)

    box("Stage floor", (0, 0, -0.13), (30, 30, 0.25), charcoal)
    box("Back wall", (0, 3.8, 2.65), (13, 0.18, 5.3), charcoal)
    for i in range(13):
        box("Acoustic vertical %02d" % i, (-5.8 + i * 0.95, 3.65, 2.7), (0.018, 0.09, 4.6), graphite, 0.003)
    box("Warm inset wall", (-3.5, 3.48, 2.1), (3.1, 0.13, 3.5), cream)
    for i in range(17):
        box("Wood slat %02d" % i, (-5 + i * 0.185, 3.38, 2.1), (0.045, 0.11, 3.5), graphite, 0.005)
    text("Studio sign", "G R I F O N   /   S T U D I O", (0, 3.64, 4.1), 0.23, paper)

    # Actual demonstration content must replace these obvious empty display planes later.
    box("Proof display frame", (3.1, 3.25, 2.22), (3.3, 0.13, 1.94), graphite)
    box("Proof display placeholder", (3.1, 3.16, 2.22), (3.12, 0.025, 1.76), screen, 0.02)
    text("Proof placeholder heading", "ACTUAL AD GOES HERE", (3.1, 3.13, 2.35), 0.18, paper)
    text("Proof placeholder disclosure", "EMPTY DISPLAY / STUDIO PILOT", (3.1, 3.13, 2.02), 0.09, paper)
    box("Proof console", (3.1, 2.95, 0.62), (3.55, 0.72, 0.7), graphite)
    for x in (1.8, 4.4):
        box("Console foot", (x, 2.95, 0.2), (0.06, 0.55, 0.4), gold)

    box("Owner desk top", (-3.25, 0.9, 0.92), (2.45, 1.2, 0.1), cream)
    for x in (-4.22, -2.28):
        box("Desk leg", (x, 0.9, 0.45), (0.09, 0.88, 0.9), graphite)
    box("Owner monitor", (-3.25, 1.25, 1.48), (1.15, 0.07, 0.7), graphite)
    box("Owner display blank", (-3.25, 1.20, 1.48), (1.06, 0.015, 0.61), screen, 0.01)
    text("Workplace placeholder", "WORKSPACE", (-3.25, 1.185, 1.46), 0.09, paper)
    box("Monitor stand", (-3.25, 1.26, 1.07), (0.06, 0.05, 0.22), gold)
    box("Keyboard proxy", (-3.25, 0.64, 0.99), (0.73, 0.22, 0.025), graphite, 0.01)
    box("Notebook", (-4.03, 0.56, 1.0), (0.35, 0.44, 0.04), paper, 0.01)
    box("Chair seat", (-3.25, -0.4, 0.49), (0.62, 0.57, 0.13), graphite)
    box("Chair back", (-3.25, -0.66, 0.86), (0.62, 0.12, 0.74), graphite, 0.09)
    cylinder("Chair stem", (-3.25, -0.4, 0.25), 0.04, 0.43, gold)
    cylinder("Chair base", (-3.25, -0.4, 0.04), 0.32, 0.05, graphite)

    cylinder("Product stage base", (0, 0, 0.07), 1.1, 0.14, graphite)
    cylinder("Product plinth", (0, 0, 0.57), 0.63, 0.97, cream)
    cylinder("Product plinth gold edge", (0, 0, 1.05), 0.64, 0.035, gold)
    cylinder("Bottle body proxy", (0, 0, 1.30), 0.14, 0.44, coffee)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(0, 0, 1.515))
    shoulder = finish(bpy.context.object, "Bottle shoulder proxy", coffee)
    shoulder.scale = (0.14, 0.14, 0.095)
    cylinder("Bottle neck proxy", (0, 0, 1.60), 0.067, 0.13, coffee)
    cylinder("Bottle cap proxy", (0, 0, 1.675), 0.08, 0.07, graphite)
    cylinder("Plain blank label", (0, 0, 1.31), 0.142, 0.24, paper)

    # Practical production equipment makes the room read as a working set.
    cylinder("Softbox stand", (1.6, 1.5, 1.2), 0.025, 2.4, graphite)
    for angle in (0, 2.094, 4.189):
        curve("Softbox tripod foot", [(1.6, 1.5, 0.3), (1.6 + 0.43*math.cos(angle), 1.5 + 0.43*math.sin(angle), 0.045)], 0.018, graphite)
    box("Softbox housing", (1.6, 1.5, 2.75), (0.82, 0.20, 1.05), graphite)
    box("Softbox panel", (1.6, 1.38, 2.75), (0.72, 0.025, 0.94), white, 0.025)
    curve("Gold light rail", [(-5, 2.5, 3.45), (-2.8, 2.3, 3.45), (-0.4, 2.45, 3.7), (1, 2.6, 3.72)], 0.018, glow)
    for x, y, z in ((-5, 2.5, 3.45), (-2.8, 2.3, 3.45), (1, 2.6, 3.72)):
        curve("Light rail wall bracket", [(x, 3.65, z), (x, y, z)], 0.024, graphite)
        box("Light rail mount", (x, 3.64, z), (0.13, 0.035, 0.13), gold, 0.01)
    curve("Floor gold guide", [(-4.7, -1.8, 0.012), (-2.2, -1.6, 0.012), (0, -1.4, 0.012), (2, -0.9, 0.012), (4.8, 0.8, 0.012)], 0.012, gold)

    cylinder("Plant pot", (-5.4, 2.45, 0.3), 0.3, 0.6, graphite)
    for i in range(9):
        a = i * 2.399
        z = 1.0 + (i % 4) * 0.23
        tip = (-5.4 + 0.55 * math.cos(a), 2.45 + 0.4 * math.sin(a), z)
        curve("Plant stem", [(-5.4, 2.45, 0.4), (-5.4, 2.45, z - 0.3), tip], 0.012, green)
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=tip)
        leaf = finish(bpy.context.object, "Plant leaf", green)
        leaf.scale, leaf.rotation_euler = (0.27, 0.085, 0.09), (0, 0.4, a)

    light("Key soft daylight", (-3, -4, 6), (0, 0, 1), 1900, 5, (0.88, 0.93, 1))
    light("Product soft key", (1, -1.5, 4), (0, 0, 1.4), 500, 2)
    light("Warm studio rim", (-3, 2.8, 4.2), (-1, 0, 0.8), 1400, 3)
    light("Proof wall wash", (4, 0, 4), (3, 3.2, 2), 700, 3, (0.8, 0.87, 1))
    scene = bpy.context.scene
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.10, 0.12, 0.15, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.3
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    # CPU is the portable fallback; select an installed CUDA device when available.
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "CUDA"
        prefs.get_devices()
        gpu = [d for d in prefs.devices if d.type == "CUDA"]
        for device in prefs.devices:
            device.use = device in gpu
        if gpu:
            scene.cycles.device = "GPU"
    except (TypeError, RuntimeError):
        scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 1280, 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "AgX"
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 1, 144
    camera("01_Establish", (8, -12, 6), (0, 1, 1.6), 43)
    camera("02_Owner_workspace", (-6, -4.6, 2.9), (-2.5, 0.85, 1.25), 43)
    camera("03_Product", (2.3, -3.8, 2.2), (0, 0, 1.39), 65)
    move = camera("04_Preview_dolly", (6.5, -10, 4.8), (0, 0.5, 1.45), 43)
    # One continuous, slow move. No film timing or edit treatment is implied.
    for frame in range(1, 145):
        t = (frame - 1) / 143
        smooth = t*t*(3 - 2*t)
        move.location = Vector((6.5, -10, 4.8)).lerp(Vector((3.5, -6.2, 3.0)), smooth)
        aim(move, (0, 0.5, 1.45))
        move.keyframe_insert(data_path="location", frame=frame)
        move.keyframe_insert(data_path="rotation_euler", frame=frame)
    scene.camera = bpy.data.objects["01_Establish"]
    scene.frame_set(1)
    scene["pilot_scope"] = "Local studio wrapper feasibility. Proxy bottle and empty screens; not Grifon output."
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "studio.blend"), compress=True)


def verify():
    scene = bpy.context.scene
    cams = sorted(o.name for o in scene.objects if o.type == "CAMERA")
    assert len(cams) == 4, cams
    external_images = [img.name for img in bpy.data.images if img.source == "FILE" and not img.packed_file]
    assert not external_images, f"Unexpected external image dependency: {external_images}"
    camera_obj = bpy.data.objects["04_Preview_dolly"]
    from bpy_extras.object_utils import world_to_camera_view
    checks = []
    for frame in range(1, 145):
        scene.frame_set(frame)
        deps = bpy.context.evaluated_depsgraph_get()
        # Six axis probes are a limited obstruction sample, not a clearance sphere.
        clearance = []
        for direction in ((1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)):
            hit, loc, *_ = scene.ray_cast(deps, camera_obj.location, Vector(direction), distance=0.2)
            clearance.append(not hit)
        assert all(clearance), f"Camera axis probe hits geometry within 0.2m at frame {frame}"
        bottle = Vector((0, 0, 1.39))
        uv = world_to_camera_view(scene, camera_obj, bottle)
        assert 0.05 < uv.x < 0.95 and 0.05 < uv.y < 0.95 and uv.z > 0
        hit, _, _, _, obj, _ = scene.ray_cast(deps, camera_obj.location, (bottle-camera_obj.location).normalized())
        assert hit and obj.name in ("Bottle body proxy", "Plain blank label"), (frame, obj.name if obj else None)
        checks.append(frame)
    scene.frame_set(1)
    report = {"blender": bpy.app.version_string, "cameras": cams, "objects": len(scene.objects),
              "checked_frames": len(checks), "six_axis_probe_distance_m": 0.2, "bottle_center_visible_all_frames": True,
              "external_images": 0, "scope": "Integer-frame bottle-center visibility and six axis obstruction probes only. Does not establish full camera-volume clearance, whole-bottle silhouette, subframe motion, or film quality."}
    (OUT / "scene-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report))


if args.mode == "stills":
    build()
    verify()
    for name in ("01_Establish", "02_Owner_workspace", "03_Product"):
        bpy.context.scene.camera = bpy.data.objects[name]
        bpy.context.scene.render.filepath = str(OUT / (name + ".png"))
        bpy.ops.render.render(write_still=True)
elif args.mode == "verify":
    verify()
else:
    verify()
    scene = bpy.context.scene
    scene.camera = bpy.data.objects["04_Preview_dolly"]
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.display.shading.background_type = "WORLD"
    scene.world.color = (0.025, 0.025, 0.028)
    scene.render.resolution_x, scene.render.resolution_y = 960, 540
    FRAMES.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(FRAMES / "frame-")
    bpy.ops.render.render(animation=True)
