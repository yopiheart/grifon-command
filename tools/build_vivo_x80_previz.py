"""Local clay storyboard: Vivo X80 / MY TURN. No provider calls or external assets.

Blender 5.2 --background --factory-startup --python-exit-code 1
  --python tools/build_vivo_x80_previz.py -- --mode stills
Modes: build saves the editable scene; stills renders nine shot samples;
render renders the authored 360-frame, 15-second camera guide; verify checks it.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, Euler

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets/vivo-x80-previz"
FRAMES = ROOT / ".tmp/vivo-x80-previz-frames"
FPS = 24
COUNT = 360
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--mode", choices=("build", "stills", "boundaries", "render", "verify"), default="stills")
parser.add_argument("--start", type=int, default=1)
parser.add_argument("--end", type=int, default=COUNT)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
if not 1 <= args.start <= args.end <= COUNT:
    parser.error("Frame range must stay within 1..360")

SHOTS = [
    (1, 42, "THE OPPORTUNITY", 28, (-.40, -1.90, 1.61), (-.31, -1.80, 1.56), (0, -.12, 1.20), (0, -.12, 1.20), "Lateral push", "Owner sets their phone down; friend notices it at the cafe table."),
    (43, 78, "THE PICKUP", 35, (-.17, -.73, 1.53), (-.26, -.64, 1.61), (-.14, -.33, .83), (-.45, -.145, 1.215), "High-angle tilt / push", "Friend lifts the phone into their right hand."),
    (79, 114, "NICE TRY", 50, (-.87, -1.57, 1.66), (-.72, -1.43, 1.64), (-.51, .015, 1.47), (-.49, -.025, 1.45), "Close-up creep", "Friend glances at the owner, then looks down at the phone."),
    (115, 144, "STILL LOCKED", 60, (-.23, .02, 1.39), (-.25, .00, 1.375), (-.45, -.145, 1.215), (-.45, -.145, 1.215), "Screen macro push", "Unregistered thumb touches the in-display fingerprint area; a locked icon remains."),
    (145, 180, "MY TURN", 85, (.88, -1.65, 1.58), (.75, -1.55, 1.58), (.51, .08, 1.53), (.51, .07, 1.53), "Reaction close-up", "Owner tilts their head and looks toward their friend."),
    (181, 228, "THE HANDOFF", 35, (-.15, -1.18, 1.54), (.15, -1.12, 1.54), (-.17, -.145, 1.20), (.20, -.145, 1.20), "Handoff tracking insert", "Friend offers the phone; owner reaches toward its free edge. Holder switches on the following cut."),
    (229, 270, "ONE TOUCH", 60, (.67, .02, 1.39), (.65, .00, 1.375), (.45, -.145, 1.215), (.45, -.145, 1.215), "Matched screen macro", "Owner's registered thumb touches the same area; the simple guide changes to an unlocked icon."),
    (271, 318, "BACK IN MY HAND", 45, (.75, -1.05, 1.50), (.68, -.96, 1.48), (.49, -.15, 1.39), (.49, -.15, 1.39), "Creator / product push", "Owner presents the phone back toward camera; distinct X80 three-lens Cloud Window shape."),
    (319, 360, "X80 HERO", 85, (.52, -.89, 1.30), (.56, -.78, 1.31), (.47, -.17, 1.259), (.47, -.17, 1.262), "In-hand camera-bump slide", "Short lateral finish on the phone's upper back; owner and cafe fall behind it."),
]


def mat(name, value, roughness=.65):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (value, value, value, 1)
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (value, value, value, 1)
    node.inputs["Roughness"].default_value = roughness
    return material


def finish(obj, name, material, parent=None):
    obj.name = name
    if material:
        obj.data.materials.append(material)
    if parent:
        obj.parent = parent
    return obj


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = .06
    obj.parent = parent
    return obj


def box(name, loc, scale, material, bevel=.01, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.location = loc
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Rounded proxy edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 4
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return finish(obj, name, material, parent)


def ellipsoid(name, loc, scale, material, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16)
    obj = bpy.context.object
    obj.location = loc
    obj.scale = scale
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish(obj, name, material, parent)


def rod(name, a, b, radius, material, parent=None):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=(b-a).length)
    obj = bpy.context.object
    obj.location = (a+b)/2
    obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return finish(obj, name, material, parent)


def ring(name, loc, major, minor, material, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor,
                                  major_segments=48, minor_segments=10)
    obj = bpy.context.object
    obj.location = loc
    obj.rotation_euler = (math.pi/2, 0, 0)
    return finish(obj, name, material, parent)


def label(name, body, loc, size, material, parent=None, front=True):
    data = bpy.data.curves.new(name, "FONT")
    data.body = body
    data.align_x = "CENTER"
    data.align_y = "CENTER"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (math.pi/2 if front else math.pi/2, 0, 0 if front else math.pi)
    finish(obj, name, material, parent)
    return obj


def animate(obj):
    obj.keyframe_insert("location")
    obj.keyframe_insert("rotation_euler")
    obj.keyframe_insert("scale")


def blend(a, b, t):
    t = max(0., min(1., t))
    t = t*t*(3-2*t)
    return Vector(a).lerp(Vector(b), t)


def ease(t):
    t = max(0., min(1., t))
    return t*t*(3-2*t)


def point_arm(parts, shoulder, elbow, wrist):
    for obj, a, b in ((parts[0], shoulder, elbow), (parts[1], elbow, wrist)):
        a, b = Vector(a), Vector(b)
        obj.location = (a+b)/2
        obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
        obj.scale.z = (b-a).length
        animate(obj)
    parts[2].location = elbow
    animate(parts[2])


def person(name, x, is_owner=False):
    root = empty(name)
    root.location = (x, .11, 0)
    coat = OWNER if is_owner else FRIEND
    ellipsoid(name+" torso", (0, .015, 1.13), (.19, .11, .28), coat, root)
    ellipsoid(name+" pelvis", (0, .015, .865), (.19, .13, .105), coat, root)
    rod(name+" neck", (0, 0, 1.35), (0, 0, 1.42), .045, CLAY, root)
    for side in (-1, 1):
        rod(name+" seated thigh "+str(side), (.10*side, .015, .83), (.105*side, -.20, .68), .085, coat, root)
        rod(name+" shin "+str(side), (.105*side, -.20, .68), (.105*side, -.23, .12), .055, coat, root)
        ellipsoid(name+" shoe "+str(side), (.105*side, -.29, .08), (.07, .12, .055), DARK, root)
    head = empty(name+" expressive head", root)
    head.location = (0, 0, 1.52)
    ellipsoid(name+" face", (0, 0, 0), (.092, .082, .117), CLAY, head)
    ellipsoid(name+" nose", (0, -.081, -.008), (.018, .019, .025), CLAY, head)
    for side in (-1, 1):
        ellipsoid(name+" ear "+str(side), (.091*side, 0, -.001), (.017, .014, .029), CLAY, head)
        ellipsoid(name+" eye white "+str(side), (.038*side, -.073, .019), (.019, .011, .010), LIGHT, head)
        ellipsoid(name+" pupil "+str(side), (.038*side, -.083, .020), (.005, .003, .005), DARK, head)
        brow = rod(name+" eyebrow "+str(side), (.022*side, -.080, .040), (.055*side, -.074, .044), .003, DARK, head)
        brow["brow_side"] = side
    rod(name+" smile", (-.018, -.078, -.042), (.018, -.078, -.039), .0028, DARK, head)
    ellipsoid(name+" hair cap", (0, .011, .069), (.096, .082, .062), DARK, head)
    if is_owner:
        for side in (-1, 1):
            ellipsoid(name+" bob silhouette "+str(side), (.077*side, .024, -.029), (.030, .065, .11), DARK, head)
    arms = {}
    for side in (-1, 1):
        upper = rod(name+" upper arm "+str(side), (0, 0, 0), (0, 0, 1), .040, coat)
        forearm = rod(name+" forearm "+str(side), (0, 0, 0), (0, 0, 1), .030, CLAY)
        elbow = ellipsoid(name+" elbow "+str(side), (0, 0, 0), (.040, .040, .040), coat)
        arms[side] = (upper, forearm, elbow)
    loose = empty(name+" free hand")
    ellipsoid(name+" free palm", (0, 0, 0), (.029, .018, .044), CLAY, loose)
    for i in range(4):
        xx = -.020+i*.013
        rod(name+" free finger "+str(i), (xx, -.004, -.031), (xx, -.009, -.068), .005, CLAY, loose)
        ellipsoid(name+" finger tip "+str(i), (xx, -.009, -.069), (.005, .005, .005), CLAY, loose)
    rod(name+" free thumb", (.026, 0, .014), (.040, -.013, -.011), .008, CLAY, loose)
    return {"root": root, "head": head, "arms": arms, "free": loose, "x": x}


def create_phone():
    grip = empty("Phone hand contact controller")
    grip["purpose"] = "Shared rigid phone/hand contact; offer, then cut to owner. Continuous transfer is elided."
    phone = empty("Vivo X80 physical-scale proxy", grip)
    phone["dimensions_mm"] = [75.23, 8.30, 164.95]
    phone["appearance_role"] = "Geometry and blocking only; not final product material or creator identity."
    box("X80 glass chassis", (0, 0, 0), (.07523, .00830, .16495), PHONE, .003, phone)
    box("X80 front glass", (0, -.00425, 0), (.0699, .001, .1588), SCREEN, .0032, phone)
    ellipsoid("X80 centered front punch hole", (0, -.00491, .0737), (.00165, .00035, .00165), DARK, phone)
    box("X80 Cloud Window rectangle", (.0005, .0057, .0476), (.0616, .0033, .0528), DARK, .0024, phone)
    ring("X80 circular camera housing", (.0064, .008, .0517), .0228, .0007, PHONE, phone)
    for name, x, z, radius in (("50MP main", .0157, .0613, .0076), ("12MP portrait", .016, .0408, .0059), ("12MP wide", -.0050, .0408, .0054)):
        lens = ellipsoid("X80 "+name+" lens", (x, .0085, z), (radius, .0015, radius), LENS, phone)
        ring("X80 "+name+" lens rim", (x, .0090, z), radius, .00065, PHONE, phone)
    box("X80 small flash outside circle", (-.026, .0082, .0514), (.0045, .0015, .003), LIGHT, .001, phone)
    label("X80 back vivo wordmark proxy", "vivo", (0, .0044, -.053), .010, DARK, phone, front=False)
    box("X80 side power button", (.0377, 0, .009), (.0015, .003, .014), DARK, .0007, phone)
    palm = ellipsoid("Gripping palm outside phone edge", (.057, .002, -.024), (.019, .013, .039), CLAY, grip)
    for i in range(4):
        z = -.044+i*.016
        points = [(.052, .012, z), (.039, .018, z), (.020, .018, z), (.009, .011, z)]
        for j in range(3):
            rod("Curl finger "+str(i)+" segment "+str(j), points[j], points[j+1], .0038, CLAY, grip)
        ellipsoid("Curl fingertip "+str(i), points[-1], (.0039, .0039, .0039), CLAY, grip)
    thumb = empty("Fingerprint contact thumb", grip)
    rod("Thumb knuckle", (.047, -.006, -.025), (.025, -.014, -.048), .007, CLAY, thumb)
    rod("Thumb pad", (.025, -.014, -.048), (.006, -.0107, -.052), .007, CLAY, thumb)
    ellipsoid("Thumb rounded tip", (.006, -.0107, -.052), (.007, .006, .008), CLAY, thumb)
    fingerprint = ring("In-display fingerprint guide ring", (0, -.00495, -.052), .009, .00065, LIGHT, phone)
    lock = empty("Locked screen guide", phone)
    ring("Locked guide shackle", (0, -.0054, .016), .008, .0012, LIGHT, lock)
    box("Locked guide body", (0, -.0055, .004), (.022, .001, .018), LIGHT, .002, lock)
    unlocked = empty("Unlocked screen guide", phone)
    rod("Unlocked guide check left", (-.008, -.0056, .007), (-.002, -.0056, .001), .0015, LIGHT, unlocked)
    rod("Unlocked guide check right", (-.002, -.0056, .001), (.011, -.0056, .016), .0015, LIGHT, unlocked)
    return grip, phone, thumb, lock, unlocked


def setup():
    global CLAY, LIGHT, DARK, FRIEND, OWNER, PHONE, SCREEN, LENS
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    CLAY = mat("Neutral adult proxy clay", .47)
    LIGHT = mat("Light gray guide details", .79)
    DARK = mat("Graphite gray clay detail", .105)
    FRIEND = mat("Friend jacket gray", .25)
    OWNER = mat("Owner jacket gray", .58)
    PHONE = mat("X80 neutral geometry clay", .44, .38)
    SCREEN = mat("Gray display placeholder", .08, .4)
    LENS = mat("Camera glass shape placeholder", .045, .28)
    floor = mat("Cafe architectural clay", .55)
    box("Cafe floor", (0, 0, -.04), (12, 12, .07), floor, .01)
    box("Cafe back wall", (0, 1.6, 1.5), (6, .15, 3), floor, .02)
    for x in (-1.8, -.9, 0, .9, 1.8):
        box("Window inset "+str(x), (x, 1.49, 1.88), (.79, .03, 1.40), LIGHT, .012)
        box("Window vertical frame "+str(x), (x-.42, 1.455, 1.87), (.035, .045, 1.54), DARK, .004)
    box("Cafe tabletop", (0, -.34, .725), (1.90, .86, .055), LIGHT, .025)
    for x in (-.79, .79):
        for y in (-.65, -.04):
            rod("Table leg", (x, y, .02), (x, y, .70), .030, DARK)
    for x in (-.53, .53):
        box("Seat "+str(x), (x, .17, .79), (.43, .43, .06), FRIEND, .03)
        box("Seat back "+str(x), (x, .32, 1.08), (.43, .055, .59), FRIEND, .045)
    for x, y in ((-.77, -.48), (.75, -.44)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.039, depth=.075, location=(x, y, .789))
        finish(bpy.context.object, "Cafe cup", CLAY)
        ring("Cup lip", (x, y, .828), .036, .0025, LIGHT).rotation_euler = (0, 0, 0)
    friend, owner = person("Friend", -.52), person("Owner", .52, True)
    grip, phone, thumb, lock, unlocked = create_phone()
    for name, loc, energy, size in (("Soft window key", (-2, -2.4, 4.5), 650, 4), ("Soft opposite fill", (3, -.8, 3.3), 400, 3), ("Cafe overhead", (0, .8, 4.0), 450, 3)):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.size = energy, size
        obj = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(obj)
        obj.location = loc
        obj.rotation_euler = (Vector((0, 0, 1))-obj.location).to_track_quat("-Z", "Y").to_euler()
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    scene.render.resolution_x, scene.render.resolution_y = 480, 854
    scene.render.resolution_percentage = 100
    scene.render.fps = FPS
    scene.frame_start, scene.frame_end = 1, COUNT
    scene.world.color = (.30, .30, .30)
    scene.view_settings.view_transform = "AgX"
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    cameras = []
    for number, shot in enumerate(SHOTS, 1):
        start, end, title, lens, c0, c1, target0, target1, motion, action = shot
        data = bpy.data.cameras.new("Shot %02d / %s" % (number, title))
        data.lens = lens
        data.sensor_fit = "VERTICAL"
        data.sensor_height = 36
        data.sensor_width = 36
        data.clip_start = .01
        obj = bpy.data.objects.new(data.name, data)
        bpy.context.collection.objects.link(obj)
        obj["shot_action"] = action
        marker = scene.timeline_markers.new("%02d %s" % (number, title), frame=start)
        marker.camera = obj
        cameras.append(obj)
        for frame in range(start, end+1):
            scene.frame_set(frame)
            t = (frame-start)/max(1, end-start)
            obj.location = blend(c0, c1, t)
            target = blend(target0, target1, t)
            obj.rotation_euler = (target-obj.location).to_track_quat("-Z", "Y").to_euler()
            animate(obj)
    hand_scales = {obj.name: obj.scale.copy() for obj in grip.children if obj != phone}
    for frame in range(1, COUNT+1):
        scene.frame_set(frame)
        if frame <= 20:
            position = blend((.31, -.20, 1.06), (-.04, -.36, .761), (frame-1)/19)
            rotation = Euler((-math.pi/2*(frame-1)/19, 0, math.pi), "XYZ")
        elif frame <= 42:
            position = Vector((-.04, -.36, .761))
            rotation = Euler((-math.pi/2, 0, math.pi), "XYZ")
        elif frame <= 78:
            position = blend((-.04, -.36, .761), (-.45, -.145, 1.215), (frame-43)/35)
            rotation = Euler((-math.pi/2*(1-(frame-43)/35), 0, math.pi), "XYZ")
        elif frame <= 180:
            position = Vector((-.45, -.145, 1.215))
            rotation = Euler((0, 0, math.pi), "XYZ")
        elif frame <= 228:
            position = blend((-.45, -.145, 1.215), (.12, -.16, 1.215), (frame-181)/20)
            rotation = Euler((0, 0, math.pi), "XYZ")
        else:
            position = Vector((.45, -.145, 1.215))
            rotation = Euler((0, 0, math.pi), "XYZ")
        grip.location, grip.rotation_euler = position, rotation
        animate(grip)
        # The product stays on the table before pickup; hide only the hand geometry.
        for obj in list(grip.children):
            if obj != phone:
                obj.scale = (0, 0, 0) if 21 <= frame <= 42 else hand_scales[obj.name]
                obj.keyframe_insert("scale")
        thumb.location.y = -.011*math.sin(math.pi*max(0, min(1, (frame-114)/19))) if 115 <= frame <= 133 else 0
        if 229 <= frame <= 249:
            thumb.location.y = -.011*math.sin(math.pi*(frame-229)/20)
        thumb.keyframe_insert("location")
        lock.scale = (1, 1, 1) if frame < 249 else (0, 0, 0)
        unlocked.scale = (1, 1, 1) if frame >= 249 else (0, 0, 0)
        lock.keyframe_insert("scale")
        unlocked.keyframe_insert("scale")
        wrist = position + rotation.to_matrix() @ Vector((.070, .008, -.024))
        for person_data in (friend, owner):
            x = person_data["x"]
            holding = (person_data == friend and 43 <= frame <= 228) or (person_data == owner and (frame <= 20 or frame >= 229))
            right_wrist = wrist if holding else Vector((x-.12, -.20, .82))
            right_elbow = Vector((x-.24, -.01, 1.03)) if holding else Vector((x-.23, .05, .90))
            point_arm(person_data["arms"][-1], (x-.16, .095, 1.29), right_elbow, right_wrist)
            left_wrist = Vector((x+.12, -.20, .82))
            if person_data == owner and 181 <= frame <= 228:
                left_wrist = blend((x+.12, -.20, .82), (.205, -.15, 1.18), (frame-181)/14)
            point_arm(person_data["arms"][1], (x+.16, .095, 1.29), (x+.23, .04, 1.02), left_wrist)
            person_data["free"].location = left_wrist
            person_data["free"].rotation_euler = (.14, 0, -.35 if person_data == owner else .10)
            animate(person_data["free"])
            if person_data == friend:
                glance = .30*ease((frame-82)/10)*(1-ease((frame-100)/12))
                notice = .18*ease((frame-24)/7)*(1-ease((frame-37)/8))
                down = .14*ease((frame-24)/12)*(1-ease((frame-144)/12))
                person_data["head"].rotation_euler = (down, 0, glance+notice)
            else:
                reaction = ease((frame-145)/12)*(1-ease((frame-220)/9))
                placement = 1-ease((frame-36)/8)
                person_data["head"].rotation_euler = (.14*placement+.045*ease((frame-229)/8), -.03-.03*reaction, -.30*reaction-.12*placement)
            animate(person_data["head"])
    # Baked curves preserve the shot choreography without a Python frame handler.
    scene.frame_set(1)
    scene.camera = cameras[0]
    scene["study"] = "MY TURN / Vivo X80 / neutral 3D blocking"
    scene["paid_calls"] = 0
    scene["authored_duration_seconds"] = 15
    scene["handoff"] = "Offer, then cut to owner's registered-thumb shot; continuous transfer elided. Holder pose shifts 33cm at 228/229 cut."
    return scene, cameras, phone


def manifest(scene):
    return {
        "study": "MY TURN / Vivo X80", "scope": "Local gray clay storyboard and camera/blocking guide; no AI finish.",
        "paidCalls": 0, "width": 480, "height": 854, "fps": FPS, "frames": COUNT, "durationSeconds": 15,
        "renderer": {"engine": scene.render.engine, "samples": scene.eevee.taa_render_samples},
        "productDimensionsMm": {"width": 75.23, "depth": 8.30, "height": 164.95},
        "design": "X80 three-lens circle inside upper rectangular Cloud Window; single centered front punch hole.",
        "featureStory": "An unregistered thumb stays locked; the owner uses their registered thumb. Authored dramatization, no Face ID claim.",
        "referenceUrl": "https://www.youtube.com/watch?v=ByAi9BGHMRQ",
        "referenceTiming": "Sampled reference observations only. All shot timing below is newly authored.",
        "handoff": "Offer, then cut to owner's registered-thumb shot; continuous transfer elided. Parent-stable grip, holder pose shifts 33cm at 228/229 cut.",
        "geometry": {"objects": len(scene.objects), "phoneParent": "Phone hand contact controller", "externalTextures": 0, "externalCreatorImages": 0},
        "shots": [{"number": i, "title": s[2], "firstFrame": s[0], "lastFrame": s[1], "startSeconds": (s[0]-1)/FPS,
                   "endSeconds": s[1]/FPS, "sampleFrame": (s[0]+s[1])//2, "lensMm": s[3],
                   "cameraStart": s[4], "cameraEnd": s[5], "targetStart": s[6], "targetEnd": s[7],
                   "movement": s[8], "action": s[9]} for i, s in enumerate(SHOTS, 1)]
    }


OUT.mkdir(parents=True, exist_ok=True)
FRAMES.mkdir(parents=True, exist_ok=True)
if args.mode == "verify":
    bpy.ops.wm.open_mainfile(filepath=str(OUT / "scene.blend"))
    scene = bpy.context.scene
    cameras = [bpy.data.objects["Shot %02d / %s" % (i, shot[2])] for i, shot in enumerate(SHOTS, 1)]
    phone = bpy.data.objects["Vivo X80 physical-scale proxy"]
else:
    scene, cameras, phone = setup()
    scene.render.filepath = "//frames/frame-"
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT / "scene.blend"))
    (OUT / "shot-manifest.json").write_text(json.dumps(manifest(scene), indent=2)+"\n", encoding="utf8")
if args.mode == "stills":
    for i, shot in enumerate(SHOTS, 1):
        frame = (shot[0]+shot[1])//2
        scene.frame_set(frame)
        scene.camera = cameras[i-1]
        scene.render.filepath = str(OUT / ("shot-%02d.png" % i))
        bpy.ops.render.render(write_still=True)
elif args.mode == "render":
    scene.frame_start, scene.frame_end = args.start, args.end
    scene.render.filepath = str(FRAMES / "frame-")
    bpy.ops.render.render(animation=True)
elif args.mode == "boundaries":
    qa = OUT / "qa"
    qa.mkdir(exist_ok=True)
    for i, shot in enumerate(SHOTS, 1):
        for frame in (shot[0], shot[1]):
            scene.frame_set(frame)
            scene.camera = cameras[i-1]
            scene.render.filepath = str(qa / ("shot-%02d-frame-%04d.png" % (i, frame)))
            bpy.ops.render.render(write_still=True)
elif args.mode == "verify":
    checks = []
    for i, shot in enumerate(SHOTS, 1):
        for frame in (shot[0], (shot[0]+shot[1])//2, shot[1]):
            scene.frame_set(frame)
            camera = cameras[i-1]
            pos = world_to_camera_view(scene, camera, phone.matrix_world.translation)
            checks.append({"shot": i, "frame": frame, "phoneCenterNormalized": list(pos),
                           "phoneCenterInFrame": 0 <= pos.x <= 1 and 0 <= pos.y <= 1 and pos.z > 0,
                           "phoneInFrameRequired": i != 5})
    result = {"frameRange": [1, COUNT], "durationSeconds": 15, "cameraCount": len(cameras), "markers": len(scene.timeline_markers),
              "renderer": {"engine": scene.render.engine, "samples": scene.eevee.taa_render_samples},
              "savedRenderPath": scene.render.filepath,
              "geometry": "baked per-frame object transforms; no runtime handler", "projectionSamples": checks,
              "projectionScope": "Center projection only; visibility and limb occlusion require actual rendered-frame inspection."}
    (OUT / "geometry-verification.json").write_text(json.dumps(result, indent=2)+"\n", encoding="utf8")
print(json.dumps({"mode": args.mode, "output": str(OUT), "frames": COUNT, "cameras": len(cameras), "paidCalls": 0}))
