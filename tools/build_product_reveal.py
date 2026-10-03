"""Build and render the local NOIR / 01 fictional product-reveal proof.

Blender 5.2: blender --background --factory-startup --python-exit-code 1
  --python tools/build_product_reveal.py -- --mode stills
Use --mode previs for the neutral camera/geometry reference and --mode final
for shaded PNG frames. The original studio-pilot scene is never opened/modified.
"""

import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/blender-reveal"
SHADED = ROOT / ".tmp/blender-reveal-frames"
PREVIS = ROOT / ".tmp/blender-reveal-preview"
SCENE_PATH = OUT / "scene.blend"
HERO_START = 109
PRODUCT_NAMES = []

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--mode", choices=("build", "stills", "previs", "final", "verify"), default="stills")
parser.add_argument("--frame", type=int)
parser.add_argument("--start", type=int, default=1)
parser.add_argument("--end", type=int, default=144)
parser.add_argument("--samples", type=int, default=32)
parser.add_argument("--engine", choices=("EEVEE", "CYCLES"), default="CYCLES")
parser.add_argument("--width", type=int, default=1280)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
if args.frame is not None and not 1 <= args.frame <= 144:
    parser.error("--frame must be in the authored 1..144 range")
if not 1 <= args.start <= args.end <= 144:
    parser.error("--start/--end must remain in the authored 1..144 range")
if args.samples < 1 or args.width < 320:
    parser.error("--samples must be positive and --width must be at least 320")


def material(name, color, roughness=0.4, metallic=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Transmission Weight"].default_value = transmission
    bsdf.inputs["IOR"].default_value = 1.46
    return mat


def finish(obj, name, mat, bevel=0.0, product=False):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Manufactured edge radii", "BEVEL")
        mod.width = bevel
        mod.segments = 4
        obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    if product:
        obj.parent = bpy.data.objects["NOIR_01_Product"]
        obj["product_geometry"] = True
        PRODUCT_NAMES.append(name)
    return obj


def box(name, loc, dimensions, mat, bevel=0.02, product=False):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel, product)


def cylinder(name, z, radius, depth, mat, bevel=0.01, product=True):
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=radius, depth=depth, location=(0, 0, z))
    obj = finish(bpy.context.object, name, mat, bevel, product)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def profile_mesh(name, rings, mat, product=True, segments=96):
    """Rounded rectangular flask profile; not a stack of cylinder proxies."""
    vertices = []
    faces = []
    for z, width, depth, exponent in rings:
        for index in range(segments):
            angle = math.tau * index / segments
            c, s = math.cos(angle), math.sin(angle)
            vertices.append((width * math.copysign(abs(c) ** (2 / exponent), c),
                             depth * math.copysign(abs(s) ** (2 / exponent), s), z))
    for ring in range(len(rings) - 1):
        for index in range(segments):
            other = (index + 1) % segments
            faces.append((ring * segments + index, ring * segments + other,
                          (ring + 1) * segments + other, (ring + 1) * segments + index))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(rings) - 1) * segments + index for index in range(segments)))
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    finish(obj, name, mat, product=product)
    for poly in data.polygons:
        poly.use_smooth = len(poly.vertices) == 4
    return obj


def text(name, body, loc, size, mat, font=None, spacing=1.0):
    data = bpy.data.curves.new(name, "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    data.space_character = spacing
    data.extrude = 0.0003
    data.resolution_u = 10
    if font:
        data.font = font
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (math.pi / 2, 0, 0)
    finish(obj, name, mat, product=True)
    # Bake font outlines into the scene; no licensed-font or filesystem dependency.
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)
    return bpy.context.object


def label_surface(mat):
    vertices, faces = [], []
    columns = 40
    for z in (0.84, 1.99):
        for i in range(columns + 1):
            x = -0.46 + 0.92 * i / columns
            y = -0.405 * (1 - (x / 0.535) ** 4) ** 0.25 - 0.012
            vertices.append((x, y, z))
    for i in range(columns):
        faces.append((i, i + 1, columns + 2 + i, columns + 1 + i))
    data = bpy.data.meshes.new("Cream paper label")
    data.from_pydata(vertices, [], faces)
    data.update()
    obj = bpy.data.objects.new("Cream paper label", data)
    bpy.context.collection.objects.link(obj)
    finish(obj, obj.name, mat, product=True)
    solid = obj.modifiers.new("Paper thickness", "SOLIDIFY")
    solid.thickness = 0.0015
    return obj


def aim(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def area(name, loc, target, energy, width, height, color):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "RECTANGLE"
    data.size, data.size_y = width, height
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj, target)
    return obj


def bevel_noise(mat, scale, strength, roughness):
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    noise = nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 2
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = strength
    bump.inputs["Distance"].default_value = roughness
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])


def smooth(t):
    return t * t * (3 - 2 * t)


def configure_shaded(scene):
    scene.render.engine = "CYCLES" if args.engine == "CYCLES" else "BLENDER_EEVEE"
    if args.engine == "CYCLES":
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.cycles.device = "CPU"
    scene.eevee.taa_render_samples = args.samples
    scene.eevee.use_raytracing = True
    scene.eevee.ray_tracing_method = "SCREEN"
    scene.eevee.use_fast_gi = True
    scene.render.resolution_x = args.width
    scene.render.resolution_y = round(args.width * 9 / 16)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.0
    scene.render.fps = 24
    scene.frame_start, scene.frame_end = 1, 144
    scene.render.use_file_extension = True
    scene.render.use_motion_blur = True
    scene.render.motion_blur_shutter = 0.22


def build():
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.preferences.filepaths.file_preview_type = "NONE"
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    graphite = material("Graphite / fine honed stone", (0.036, 0.037, 0.039), 0.37)
    charcoal = material("Charcoal / architectural planes", (0.020, 0.0205, 0.023), 0.52)
    basalt = material("Basalt / product podium", (0.075, 0.079, 0.084), 0.30)
    brass = material("Champagne brass / restrained trim", (0.65, 0.43, 0.12), 0.26, 0.82)
    cream = material("Natural cream paper", (0.82, 0.78, 0.665), 0.78)
    ink = material("Letterpress warm graphite", (0.017, 0.019, 0.019), 0.65)
    cap_mat = material("Charcoal anodized cap", (0.026, 0.028, 0.031), 0.26, 0.66)
    glass = material("Amber bottle glass", (0.245, 0.077, 0.022), 0.095, transmission=0.84)
    glass.node_tree.nodes.get("Principled BSDF").inputs["Coat Weight"].default_value = 0.22
    glass.node_tree.nodes.get("Principled BSDF").inputs["Coat Roughness"].default_value = 0.06
    liquid = material("Cold brew / dark amber liquid", (0.065, 0.016, 0.0035), 0.10, transmission=0.55)
    bevel_noise(graphite, 42, 0.12, 0.025)
    bevel_noise(basalt, 55, 0.16, 0.021)
    bevel_noise(cream, 170, 0.065, 0.006)

    root = bpy.data.objects.new("NOIR_01_Product", None)
    bpy.context.collection.objects.link(root)
    # Every piece is stationary. Only the camera moves.
    root["concept"] = "Fictional NOIR / 01 cold brew package; original local demonstration."
    outer = [(0.21, 0.43, 0.325, 3.7), (0.23, 0.485, 0.371, 3.7),
             (0.28, 0.525, 0.398, 3.9), (0.34, 0.535, 0.405, 4.0),
             (1.98, 0.535, 0.405, 4.0), (2.08, 0.528, 0.399, 3.9),
             (2.17, 0.493, 0.373, 3.7), (2.30, 0.377, 0.294, 3.0),
             (2.40, 0.226, 0.218, 2.1), (2.43, 0.188, 0.188, 2.0),
             (2.66, 0.188, 0.188, 2.0), (2.68, 0.180, 0.180, 2.0)]
    flask = profile_mesh("Amber glass flask / shaped shoulder", outer, glass)
    wall = flask.modifiers.new("Real 16mm glass wall", "SOLIDIFY")
    wall.thickness = 0.016
    wall.offset = -1
    wall.use_even_offset = True
    profile_mesh("Coffee fill / level meniscus", [(0.29, 0.484, 0.359, 3.9),
                 (0.33, 0.511, 0.381, 4.0), (1.98, 0.511, 0.381, 4.0),
                 (2.065, 0.501, 0.378, 3.9), (2.095, 0.489, 0.367, 3.8)], liquid)
    cylinder("Cap body", 2.72, 0.227, 0.185, cap_mat, 0.014)
    cylinder("Cap machined crown", 2.818, 0.216, 0.014, cap_mat, 0.007)
    cylinder("Brass tamper ring", 2.615, 0.203, 0.028, brass, 0.004)
    # Fine shallow grip flutes around the cap are real geometry.
    for i in range(64):
        a = math.tau * i / 64
        obj = box("Cap flute %02d" % i, (0.227 * math.cos(a), 0.227 * math.sin(a), 2.72),
                  (0.009, 0.008, 0.133), cap_mat, 0.002, True)
        obj.rotation_euler.z = a
    label_surface(cream)
    serif = bpy.data.fonts.load("C:/Windows/Fonts/times.ttf")
    sans = bpy.data.fonts.load("C:/Windows/Fonts/bahnschrift.ttf")
    text("Label / NOIR", "NOIR", (0, -0.425, 1.825), 0.165, ink, sans, 1.13)
    text("Label / 01", "01", (0, -0.428, 1.42), 0.65, ink, serif)
    text("Label / COLD BREW", "COLD BREW", (0, -0.425, 1.058), 0.075, ink, sans, 1.2)
    text("Label / 250 ML", "250 ML", (0, -0.425, 0.94), 0.045, ink, sans, 1.15)
    box("Label / gold rule", (0, -0.424, 1.154), (0.62, 0.003, 0.005), brass, 0.001, True)

    # Tight architectural stage, with light grazing chamfers and a foreground edge.
    box("Architectural floor", (0, 0, -0.07), (16, 18, 0.14), graphite, 0.025)
    box("Low basalt dais", (0, 0, 0.065), (2.32, 1.86, 0.13), basalt, 0.045)
    box("Brass dais reveal", (0, 0, 0.134), (2.20, 1.75, 0.012), brass, 0.005)
    box("Basalt top slab", (0, 0, 0.17), (2.25, 1.79, 0.06), basalt, 0.025)
    edge = box("Foreground architectural blade", (-1.43, -2.40, 1.75), (0.46, 0.36, 3.5), charcoal, 0.032)
    edge.rotation_euler.z = math.radians(-9)
    accent = box("Foreground brass edge inlay", (-1.207, -2.365, 1.75), (0.009, 0.014, 3.34), brass, 0.003)
    accent.rotation_euler.z = math.radians(-9)
    box("Backdrop / dark sweep", (0, 3.0, 2.8), (14, 0.28, 5.6), charcoal, 0.10)
    wing = box("Right architectural wing", (2.2, 1.22, 1.8), (1.17, 0.52, 3.6), graphite, 0.065)
    wing.rotation_euler.z = math.radians(-24)
    box("Rear graphite riser", (-2.3, 1.42, 0.57), (1.35, 1.2, 1.14), charcoal, 0.035)

    area("Warm key / tall strip", (-2.1, -2.9, 3.55), (0, 0, 1.45), 450, 1.5, 3.7, (1.0, 0.86, 0.67))
    area("Right edge / narrow champagne strip", (2.3, 0.4, 3.0), (0, 0, 1.65), 620, 0.4, 3.7, (1.0, 0.69, 0.36))
    area("Left glass contour", (-1.3, 1.1, 2.2), (0, 0, 1.5), 470, 0.35, 3.1, (1.0, 0.82, 0.57))
    area("Label readability / soft frontal bounce", (0.2, -3.7, 2.5), (0, 0, 1.4), 105, 2.8, 2.1, (1.0, 0.94, 0.84))
    area("Ceiling cap separation", (0, 0.5, 4.3), (0, 0, 2.3), 350, 1.8, 0.65, (0.91, 0.94, 1.0))
    area("Foreground grazing strip", (-2.8, -1.6, 2.2), (-1.4, -2.4, 1.4), 80, 0.4, 3.0, (1.0, 0.84, 0.58))
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.035, 0.040, 0.050, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.15
    scene.world.color = (0.025, 0.027, 0.030)

    camera_data = bpy.data.cameras.new("NOIR / one continuous reveal")
    camera_data.lens = 34
    camera_data.clip_start, camera_data.clip_end = 0.035, 60
    camera_data.dof.use_dof = True
    focus = bpy.data.objects.new("Focus / label plane", None)
    bpy.context.collection.objects.link(focus)
    focus.location = (0, -0.40, 1.47)
    camera_data.dof.focus_object = focus
    camera_data.dof.aperture_fstop = 4.5
    camera_data.dof.aperture_blades = 9
    cam = bpy.data.objects.new("NOIR_Reveal_Camera", camera_data)
    bpy.context.collection.objects.link(cam)
    scene.camera = cam
    for frame in range(1, 145):
        t = (frame - 1) / 143
        reveal = smooth(min(t / 0.76, 1))
        settle = smooth(max((t - 0.76) / 0.24, 0))
        cam.location = Vector((-2.58, -5.33, 2.10)).lerp(Vector((0.72, -5.34, 1.92)), reveal)
        cam.location += Vector((0.05, -0.09, 0.018)) * settle
        aim(cam, (0.055, -0.02, 1.52))
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.keyframe_insert(data_path="rotation_euler", frame=frame)
    configure_shaded(scene)
    scene["proof_scope"] = "Original fictional product concept. Local procedural Blender render; no AI or product-provider calls."
    scene["source_recipe"] = "tools/build_product_reveal.py"
    scene["camera_contract"] = "One continuous camera move; same stationary geometry and camera in Workbench and shaded PNG sequences."
    scene.frame_set(144)
    # Unused font datablocks are removed; all visible text is mesh geometry.
    for curve in list(bpy.data.curves):
        if curve.users == 0:
            bpy.data.curves.remove(curve)
    for font in list(bpy.data.fonts):
        if font.users == 0 and font.name != "Bfont":
            bpy.data.fonts.remove(font)
    bpy.ops.file.pack_all()
    # Manual Render Animation follows the .blend when it is moved. CLI renders
    # below override this with the workspace's disposable intermediate directory.
    scene.render.filepath = "//frames/frame-"
    bpy.ops.wm.save_as_mainfile(filepath=str(SCENE_PATH), compress=True)


def verify():
    scene = bpy.context.scene
    cam = scene.camera
    product = [obj for obj in scene.objects if obj.get("product_geometry")]
    assert product and len([o for o in scene.objects if o.type == "CAMERA"]) == 1
    assert scene.frame_end == 144 and scene.render.fps == 24
    assert not any(o.animation_data for o in product), "Product must be stationary"
    assert not bpy.data.objects["NOIR_01_Product"].animation_data, "Product parent must be stationary"
    external_images = [img.filepath for img in bpy.data.images if img.source == "FILE" and not img.packed_file]
    external_fonts = [font.filepath for font in bpy.data.fonts if font.users and font.name != "Bfont" and not font.packed_file]
    assert not external_images and not external_fonts, (external_images, external_fonts)
    deps = bpy.context.evaluated_depsgraph_get()
    # Nearest-surface distance against all evaluated stage triangles is stronger
    # than axis rays, but does not establish swept/subframe camera clearance.
    stage_vertices, stage_faces = [], []
    for obj in scene.objects:
        if obj.type != "MESH" or obj.get("product_geometry"):
            continue
        evaluated = obj.evaluated_get(deps)
        mesh = evaluated.to_mesh()
        offset = len(stage_vertices)
        stage_vertices.extend(evaluated.matrix_world @ v.co for v in mesh.vertices)
        stage_faces.extend(tuple(offset + i for i in poly.vertices) for poly in mesh.polygons)
        evaluated.to_mesh_clear()
    stage_bvh = BVHTree.FromPolygons(stage_vertices, stage_faces)
    checks = []
    for frame in range(1, 145):
        scene.frame_set(frame)
        deps = bpy.context.evaluated_depsgraph_get()
        points = []
        for obj in product:
            evaluated = obj.evaluated_get(deps)
            points.extend(world_to_camera_view(scene, cam, evaluated.matrix_world @ Vector(v)) for v in evaluated.bound_box)
        projection = {"xmin": min(p.x for p in points), "xmax": max(p.x for p in points),
                      "ymin": min(p.y for p in points), "ymax": max(p.y for p in points),
                      "depth_min": min(p.z for p in points)}
        nearest = stage_bvh.find_nearest(cam.location)
        clearance = nearest[3]
        assert clearance > 0.20, (frame, clearance)
        assert projection["depth_min"] > cam.data.clip_start
        # Nine product-directed rays sample stage occlusion. A first product hit
        # does not establish visibility of the exact target surface or its shading.
        probes = [(-0.37, -0.431, 1.45), (0, -0.432, 1.45), (0.37, -0.431, 1.45),
                  (0, -0.435, 1.83), (0, -0.435, 1.05), (-0.42, -0.28, 2.13),
                  (0.42, -0.28, 2.13), (0, -0.23, 2.74), (0, -0.29, 0.30)]
        first_hits_product = []
        for target in probes:
            hit, _, _, _, obj, _ = scene.ray_cast(deps, cam.location, (Vector(target) - cam.location).normalized(), distance=15)
            first_hits_product.append(bool(hit and obj and obj.get("product_geometry")))
        in_frame = (projection["xmin"] > 0.035 and projection["xmax"] < 0.965 and
                    projection["ymin"] > 0.035 and projection["ymax"] < 0.965)
        if frame >= HERO_START:
            assert in_frame, (frame, projection)
            assert all(first_hits_product), (frame, first_hits_product)
        checks.append({"frame": frame, "projection": projection,
                       "product_directed_rays_first_hit_product": sum(first_hits_product),
                       "product_directed_ray_count": len(probes), "camera_to_stage_surface_m": clearance,
                       "full_bbox_in_frame_with_3_5_percent_margin": in_frame})
    report = {"blender": bpy.app.version_string, "duration_seconds": 6.0, "fps": 24,
              "integer_frames_checked": 144, "single_camera": cam.name, "product_stationary": True,
              "product_mesh_count": len(product), "external_unpacked_dependency_count": 0,
              "saved_scene_render": {"engine": scene.render.engine,
                  "samples": scene.cycles.samples if scene.render.engine == "CYCLES" else scene.eevee.taa_render_samples,
                  "cycles_device": scene.cycles.device, "denoising": scene.cycles.use_denoising,
                  "resolution": [scene.render.resolution_x, scene.render.resolution_y],
                  "animation_output_path": scene.render.filepath},
              "hero_interval_frames": [HERO_START, 144],
              "hero_product_directed_rays_first_hit_product": True,
              "minimum_camera_to_stage_surface_m": min(c["camera_to_stage_surface_m"] for c in checks),
              "selected_frames": [c for c in checks if c["frame"] in (1, 48, 72, 109, 120, 144)],
              "all_frames": checks,
              "scope": "Every integer-frame camera-to-stage nearest-surface distance, evaluated product bounding-box projection and nine product-directed first-hit rays. Each ray count means its first hit is product geometry; it does not prove visibility of the exact target surface or account for transparency. Opening architectural occlusion is intentional. Establishes sampled geometry only; does not prove subframe swept clearance, all-surface visibility, motion aesthetics, shading or text readability."}
    (OUT / "scene-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    scene.frame_set(144)
    print("GEOMETRY_VERIFIED", json.dumps({k: v for k, v in report.items() if k != "all_frames"}))


def render_one(frame, path):
    scene = bpy.context.scene
    scene.frame_set(frame)
    scene.render.filepath = str(path)
    start = time.perf_counter()
    bpy.ops.render.render(write_still=True)
    seconds = time.perf_counter() - start
    print("FRAME_BENCHMARK", json.dumps({"frame": frame, "seconds": round(seconds, 3),
          "engine": scene.render.engine, "samples": args.samples,
          "resolution": [scene.render.resolution_x, scene.render.resolution_y], "path": str(path)}), flush=True)


OUT.mkdir(parents=True, exist_ok=True)
if args.mode in ("build", "stills"):
    build()
else:
    # Load the saved scene when invoked from factory startup; deterministic entrypoint.
    if Path(bpy.data.filepath) != SCENE_PATH:
        bpy.ops.wm.open_mainfile(filepath=str(SCENE_PATH))

verify()
if args.mode == "stills":
    configure_shaded(bpy.context.scene)
    for frame in ([args.frame] if args.frame else [144, 72, 1]):
        name = {1: "start", 72: "mid", 144: "hero"}.get(frame, "styleframe-%03d" % frame)
        render_one(frame, OUT / (name + ".png"))
elif args.mode in ("previs", "final"):
    scene = bpy.context.scene
    if args.mode == "previs":
        PREVIS.mkdir(parents=True, exist_ok=True)
        scene.render.engine = "BLENDER_WORKBENCH"
        scene.render.use_motion_blur = False
        scene.camera.data.dof.use_dof = False
        scene.display.shading.light = "STUDIO"
        scene.display.shading.color_type = "SINGLE"
        scene.display.shading.single_color = (0.64, 0.64, 0.64)
        scene.display.shading.show_shadows = True
        scene.display.shading.show_cavity = True
        scene.display.shading.cavity_type = "BOTH"
        scene.display.shading.background_type = "WORLD"
        scene.world.color = (0.07, 0.07, 0.07)
        scene.render.resolution_x, scene.render.resolution_y = args.width, round(args.width * 9 / 16)
        destination = PREVIS
    else:
        SHADED.mkdir(parents=True, exist_ok=True)
        configure_shaded(scene)
        destination = SHADED
    if args.frame:
        render_one(args.frame, destination / ("frame-%04d.png" % args.frame))
    else:
        scene.frame_start, scene.frame_end = args.start, args.end
        scene.render.filepath = str(destination / "frame-")
        start = time.perf_counter()
        bpy.ops.render.render(animation=True)
        print("SEQUENCE_BENCHMARK", json.dumps({"engine": scene.render.engine,
              "frames": args.end - args.start + 1, "seconds": round(time.perf_counter() - start, 3),
              "directory": str(destination)}), flush=True)
