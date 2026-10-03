"""Local clay storyboard: Vivo X80 / MY TURN V2. No provider calls or external assets.

Blender 5.2 --background --factory-startup --python-exit-code 1
  --python tools/build_vivo_x80_previz_v2.py -- --mode stills
Modes: build saves the editable scene; stills renders ten shot and action samples;
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
OUT = ROOT / "assets/vivo-x80-previz-v2"
FRAMES = ROOT / ".tmp/vivo-x80-previz-v2-frames"
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
    (1, 24, "THE OPPORTUNITY", 30, (-.25, -1.68, 1.60), (-.18, -1.59, 1.56), (0, -.12, 1.20), (0, -.12, 1.20), "Tight two-shot push", "Owner sets their phone down; friend notices it and glances toward the owner."),
    (25, 48, "THE PICKUP", 35, (-.12, -.73, 1.53), (-.13, -.64, 1.61), (-.06, -.33, .83), (-.32, -.145, 1.215), "High-angle follow", "Friend lifts the phone into their right hand."),
    (49, 78, "CASUAL TRY", 60, (-.10, .02, 1.39), (-.12, .00, 1.375), (-.32, -.145, 1.215), (-.32, -.145, 1.215), "Screen macro push", "One casual thumb touch fails; lock and a simple failure cross remain visible."),
    (79, 120, "THE EXPERT", 50, (-.57, -1.37, 1.64), (-.51, -1.27, 1.62), (-.32, -.06, 1.43), (-.32, -.08, 1.43), "Performance close-up creep", "Friend squares shoulders, lifts chin, smirks and raises a free index finger as an overconfident solution."),
    (121, 144, "STILL NO", 55, (-.04, .015, 1.45), (-.06, .00, 1.43), (-.32, -.145, 1.215), (-.32, -.145, 1.215), "Retry hand / screen macro", "The free index finger deliberately touches the same area; the lock remains and a failure cross returns."),
    (145, 174, "SHE NOTICED", 85, (.67, -1.55, 1.59), (.60, -1.48, 1.58), (.38, .07, 1.53), (.38, .07, 1.53), "Amused side-eye close-up", "Owner turns toward the friend, raises one brow and smiles knowingly."),
    (175, 216, "GIVE IT HERE", 35, (-.12, -1.14, 1.54), (.11, -1.10, 1.54), (-.10, -.145, 1.20), (.16, -.145, 1.20), "Offer tracking insert", "Owner extends an open palm; friend offers the phone, then the edit elides the transfer."),
    (217, 264, "ONE TOUCH", 60, (.54, .02, 1.39), (.52, .00, 1.375), (.32, -.145, 1.215), (.32, -.145, 1.215), "Owner screen macro", "Owner gives one relaxed registered-thumb touch; lock changes to a check and stays unlocked."),
    (265, 312, "CAUGHT", 65, (-.55, -1.25, 1.59), (-.49, -1.16, 1.56), (-.38, .04, 1.46), (-.38, -.015, 1.41), "Reaction hold / small push", "Friend looks toward owner, then shoulders drop, head and eyes lower, and the smirk becomes a small frown."),
    (313, 360, "X80 HERO", 85, (.39, -.89, 1.30), (.43, -.78, 1.31), (.34, -.17, 1.259), (.34, -.17, 1.262), "In-hand camera-bump slide", "Readable upper-left main lens and two lower lenses in the X80 Cloud Window, held by owner."),
]

PERFORMANCE_SAMPLES = [
    ("first-thumb-contact", 63), ("first-failure-held", 76),
    ("expert-raise", 90), ("expert-confident-hold", 104), ("expert-ready", 119),
    ("second-index-contact", 132), ("second-failure-held", 144),
    ("owner-side-eye", 165), ("offer-held", 210),
    ("owner-contact", 232), ("owner-unlocked-held", 257),
    ("friend-before-collapse", 265), ("friend-collapse", 285), ("friend-deflated-held", 306),
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


def pose_segment(obj, a, b):
    a, b = Vector(a), Vector(b)
    obj.location = (a+b)/2
    obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    obj.scale.z = (b-a).length
    animate(obj)


def person(name, x, is_owner=False):
    root = empty(name)
    root.location = (x, .11, 0)
    coat = OWNER if is_owner else FRIEND
    torso = ellipsoid(name+" torso", (0, .015, 1.13), (.19, .11, .28), coat, root)
    ellipsoid(name+" pelvis", (0, .015, .865), (.19, .13, .105), coat, root)
    neck = rod(name+" neck", (0, 0, 1.35), (0, 0, 1.42), .045, CLAY, root)
    brows, pupils = {}, {}
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
        pupils[side] = ellipsoid(name+" pupil "+str(side), (.038*side, -.083, .020), (.005, .003, .005), DARK, head)
        brows[side] = rod(name+" eyebrow "+str(side), (0, 0, 0), (0, 0, 1), .0032, DARK, head)
    mouth = [rod(name+" mouth "+str(i), (0, 0, 0), (0, 0, 1), .003, DARK, head) for i in range(2)]
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
    rest = empty(name+" relaxed right hand")
    ellipsoid(name+" relaxed palm", (0, 0, 0), (.029, .018, .044), CLAY, rest)
    for i in range(4):
        xx = -.020+i*.013
        rod(name+" relaxed finger "+str(i), (xx, -.004, -.031), (xx, -.009, -.068), .005, CLAY, rest)
        ellipsoid(name+" relaxed fingertip "+str(i), (xx, -.009, -.069), (.005, .005, .005), CLAY, rest)
    rod(name+" relaxed thumb", (-.026, 0, .014), (-.040, -.013, -.011), .008, CLAY, rest)
    pointer = empty(name+" free index pose")
    ellipsoid(name+" pointing palm", (0, 0, .025), (.025, .014, .035), CLAY, pointer)
    rod(name+" extended index", (-.018, -.003, .046), (-.018, -.003, .112), .006, CLAY, pointer)
    index_tip = ellipsoid(name+" index tip", (-.018, -.003, .115), (.006, .006, .006), CLAY, pointer)
    for i, xx in enumerate((-.003, .011, .024)):
        rod(name+" curled free finger first "+str(i), (xx, -.003, .044), (xx, -.024, .053), .006, CLAY, pointer)
        rod(name+" curled free finger second "+str(i), (xx, -.024, .053), (xx, -.031, .026), .006, CLAY, pointer)
    rod(name+" pointing thumb", (.026, 0, .025), (.036, -.013, .039), .008, CLAY, pointer)
    return {"root": root, "torso": torso, "neck": neck, "head": head, "brows": brows, "mouth": mouth,
            "pupils": pupils, "arms": arms, "free": loose, "rest": rest, "pointer": pointer, "indexTip": index_tip, "x": x}


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
    thumb.location = (.047, -.006, -.025)
    rod("Thumb knuckle", (0, 0, 0), (-.028, -.009, -.023), .007, CLAY, thumb)
    rod("Thumb pad", (-.028, -.009, -.023), (-.047, -.004, -.027), .007, CLAY, thumb)
    ellipsoid("Thumb rounded tip", (-.047, -.004, -.027), (.007, .006, .008), CLAY, thumb)
    fingerprint = ring("In-display fingerprint guide ring", (0, -.00495, -.052), .009, .00065, LIGHT, phone)
    lock = empty("Locked screen guide", phone)
    ring("Locked guide shackle", (0, -.0054, .016), .008, .0012, LIGHT, lock)
    box("Locked guide body", (0, -.0055, .004), (.022, .001, .018), LIGHT, .002, lock)
    unlocked = empty("Unlocked screen guide", phone)
    rod("Unlocked guide check left", (-.008, -.0056, .007), (-.002, -.0056, .001), .0015, LIGHT, unlocked)
    rod("Unlocked guide check right", (-.002, -.0056, .001), (.011, -.0056, .016), .0015, LIGHT, unlocked)
    failure = empty("Failed touch cross guide", phone)
    rod("Failure cross left", (-.006, -.0056, -.009), (.006, -.0056, -.021), .0011, LIGHT, failure)
    rod("Failure cross right", (.006, -.0056, -.009), (-.006, -.0056, -.021), .0011, LIGHT, failure)
    return grip, phone, thumb, lock, unlocked, failure


def setup():
    global CLAY, LIGHT, DARK, FRIEND, OWNER, PHONE, SCREEN, LENS
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    CLAY = mat("Neutral adult proxy clay", .47)
    LIGHT = mat("Light gray guide details", .79)
    DARK = mat("Graphite gray clay detail", .105)
    FRIEND = mat("Friend jacket gray", .16)
    OWNER = mat("Owner jacket gray", .50)
    PHONE = mat("X80 neutral geometry clay", .44, .38)
    SCREEN = mat("Gray display placeholder", .08, .4)
    LENS = mat("Camera glass shape placeholder", .045, .28)
    floor = mat("Cafe architectural clay", .34)
    window = mat("Cafe window clay", .52)
    box("Cafe floor", (0, 0, -.04), (12, 12, .07), floor, .01)
    box("Cafe back wall", (0, 1.6, 1.5), (6, .15, 3), floor, .02)
    for x in (-1.8, -.9, 0, .9, 1.8):
        box("Window inset "+str(x), (x, 1.49, 1.88), (.79, .03, 1.40), window, .012)
        box("Window vertical frame "+str(x), (x-.42, 1.455, 1.87), (.035, .045, 1.54), DARK, .004)
    box("Cafe tabletop", (0, -.34, .725), (1.65, .86, .055), LIGHT, .025)
    for x in (-.66, .66):
        for y in (-.65, -.04):
            rod("Table leg", (x, y, .02), (x, y, .70), .030, DARK)
    for x in (-.39, .39):
        box("Seat "+str(x), (x, .17, .79), (.43, .43, .06), FRIEND, .03)
        box("Seat back "+str(x), (x, .32, 1.08), (.43, .055, .59), FRIEND, .045)
    for x, y in ((-.66, -.48), (.64, -.44)):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.039, depth=.075, location=(x, y, .789))
        finish(bpy.context.object, "Cafe cup", CLAY)
        ring("Cup lip", (x, y, .828), .036, .0025, LIGHT).rotation_euler = (0, 0, 0)
    friend, owner = person("Friend", -.38), person("Owner", .38, True)
    grip, phone, thumb, lock, unlocked, failure = create_phone()
    for name, loc, energy, size in (("Soft window key", (-2, -2.4, 4.5), 700, 4), ("Soft opposite fill", (3, -.8, 3.3), 160, 3), ("Cafe overhead", (0, .8, 4.0), 350, 3)):
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
    scene.world.color = (.14, .14, .14)
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
        if frame <= 12:
            position = blend((.24, -.20, 1.06), (-.02, -.30, .761), (frame-1)/11)
            rotation = Euler((-math.pi/2*(frame-1)/11, 0, math.pi), "XYZ")
        elif frame <= 24:
            position = Vector((-.02, -.30, .761))
            rotation = Euler((-math.pi/2, 0, math.pi), "XYZ")
        elif frame <= 48:
            position = blend((-.02, -.30, .761), (-.32, -.145, 1.215), (frame-25)/23)
            rotation = Euler((-math.pi/2*(1-(frame-25)/23), 0, math.pi), "XYZ")
        elif frame <= 174:
            position = Vector((-.32, -.145, 1.215))
            rotation = Euler((0, 0, math.pi), "XYZ")
        elif frame <= 216:
            position = blend((-.32, -.145, 1.215), (.10, -.16, 1.215), (frame-175)/20)
            rotation = Euler((0, 0, math.pi), "XYZ")
        else:
            position = Vector((.32, -.145, 1.215))
            rotation = Euler((0, 0, math.pi), "XYZ")
        grip.location, grip.rotation_euler = position, rotation
        animate(grip)
        # The product stays on the table before pickup; hide only the hand geometry.
        for obj in list(grip.children):
            if obj != phone:
                obj.scale = (0, 0, 0) if 13 <= frame <= 24 else hand_scales[obj.name]
                obj.keyframe_insert("scale")
        casual = ease((frame-49)/11)*(1-ease((frame-66)/8))
        owner_touch = ease((frame-217)/14)
        thumb.rotation_euler.z = .80*(1-casual) if frame < 217 else .80*(1-owner_touch)
        animate(thumb)
        lock.scale = (1, 1, 1) if frame < 235 else (0, 0, 0)
        unlocked.scale = (1, 1, 1) if frame >= 235 else (0, 0, 0)
        failure.scale = (1, 1, 1) if 65 <= frame <= 78 or 137 <= frame <= 144 else (0, 0, 0)
        lock.keyframe_insert("scale")
        unlocked.keyframe_insert("scale")
        failure.keyframe_insert("scale")
        wrist = position + rotation.to_matrix() @ Vector((.070, .008, -.024))
        for person_data in (friend, owner):
            x = person_data["x"]
            is_friend = person_data == friend
            confident = ease((frame-79)/12)*(1-ease((frame-268)/17)) if is_friend else 0
            deflated = ease((frame-270)/16) if is_friend else 0
            amused = ease((frame-145)/10)*(1-ease((frame-217)/12)) if not is_friend else 0
            holding = (is_friend and 25 <= frame <= 216) or (not is_friend and (frame <= 12 or frame >= 217))
            right_wrist = wrist if holding else Vector((x-.12, -.20, .82))
            shoulder_z = 1.29+.035*confident-.085*deflated
            shoulder_y = .095-.040*deflated
            right_elbow = Vector((x-.24, -.01, 1.03)) if holding else Vector((x-.23, .05, .90-.025*deflated))
            point_arm(person_data["arms"][-1], (x-.16, shoulder_y, shoulder_z), right_elbow, right_wrist)
            person_data["rest"].location = right_wrist
            person_data["rest"].rotation_euler = (.18+.18*deflated, 0, -.10)
            person_data["rest"].scale = (0, 0, 0) if holding else (1, 1, 1)
            animate(person_data["rest"])
            left_wrist = Vector((x+.12, -.20, .82))
            pointer_visible = is_friend and 79 <= frame <= 150
            pointer_rotation = Euler((0, 0, 0), "XYZ")
            if pointer_visible:
                raised = Vector((-.19, -.22, 1.35))
                left_wrist = blend((x+.12, -.20, .82), raised, (frame-79)/12)
                if frame >= 112:
                    scan = position + rotation.to_matrix() @ Vector((0, -.00495, -.052))
                    pointer_rotation = Euler((math.pi/2*ease((frame-112)/8), 0, 0), "XYZ")
                    full_rotation = Euler((math.pi/2, 0, 0), "XYZ")
                    contact_root = scan + Vector((0, .005, 0)) - full_rotation.to_matrix() @ Vector((-.018, -.003, .115))
                    left_wrist = blend(raised, contact_root+Vector((0, .030, 0)), (frame-112)/8)
                    if frame >= 121:
                        left_wrist = contact_root+Vector((0, .030*(1-ease((frame-121)/8)), 0))
                    if frame >= 139:
                        left_wrist += Vector((0, .055*ease((frame-139)/6), 0))
                    if frame >= 145:
                        left_wrist = blend(left_wrist, (x+.12, -.20, .82), (frame-145)/6)
            if not is_friend and 160 <= frame <= 216:
                left_wrist = blend((x+.12, -.20, .82), (.185, -.15, 1.18), (frame-160)/16)
            left_elbow = (x+.23, .035, 1.11) if pointer_visible else (x+.23, .04, 1.02-.025*deflated)
            point_arm(person_data["arms"][1], (x+.16, shoulder_y, shoulder_z), left_elbow, left_wrist)
            person_data["free"].location = left_wrist
            person_data["free"].rotation_euler = (.14+.15*deflated, 0, -.35 if not is_friend else .10)
            person_data["free"].scale = (0, 0, 0) if pointer_visible else (1, 1, 1)
            animate(person_data["free"])
            person_data["pointer"].location = left_wrist
            person_data["pointer"].rotation_euler = pointer_rotation
            person_data["pointer"].scale = (1, 1, 1) if pointer_visible else (0, 0, 0)
            animate(person_data["pointer"])
            person_data["torso"].location = (0, .015-.030*deflated, 1.13+.008*confident-.060*deflated)
            person_data["torso"].rotation_euler.x = -.09*confident+.16*deflated
            person_data["torso"].scale.z = .28*(1+.06*confident-.04*deflated)
            animate(person_data["torso"])
            person_data["neck"].location = (0, -.045*deflated, 1.385+.020*confident-.080*deflated)
            person_data["neck"].rotation_euler.x = .15*deflated
            animate(person_data["neck"])
            person_data["head"].location = (0, -.070*deflated, 1.52+.025*confident-.10*deflated)
            if is_friend:
                notice = .27*ease((frame-13)/5)*(1-ease((frame-22)/6))
                caught_glance = .32*ease((frame-248)/12)*(1-ease((frame-275)/12))
                down = .14*ease((frame-25)/10)*(1-ease((frame-79)/12))
                person_data["head"].rotation_euler = (down-.16*confident+.36*deflated, -.04*confident, notice+caught_glance+.10*deflated)
            else:
                placement = 1-ease((frame-17)/8)
                person_data["head"].rotation_euler = (.14*placement+.045*ease((frame-217)/8), -.03-.03*amused, -.34*amused-.12*placement)
            animate(person_data["head"])
            for side, brow in person_data["brows"].items():
                if is_friend:
                    inner_z = .041+.005*confident+.010*deflated
                    outer_z = .045+.010*confident*(1 if side == 1 else .2)-.010*deflated
                else:
                    inner_z = .041+.006*amused
                    outer_z = .045+.018*amused*(1 if side == -1 else .1)
                pose_segment(brow, (.022*side, -.080, inner_z), (.055*side, -.074, outer_z))
                person_data["pupils"][side].location = (.038*side+.003*amused, -.083, .020-.003*deflated)
                animate(person_data["pupils"][side])
            if is_friend:
                left_z, center_z, right_z = -.042-.004*confident-.008*deflated, -.046+.004*confident, -.040+.008*confident-.010*deflated
            else:
                left_z, center_z, right_z = -.040+.008*amused, -.046, -.040+.008*amused
            pose_segment(person_data["mouth"][0], (-.022, -.078, left_z), (0, -.084, center_z))
            pose_segment(person_data["mouth"][1], (0, -.084, center_z), (.022, -.078, right_z))
    # Baked curves preserve the shot choreography without a Python frame handler.
    scene.frame_set(1)
    scene.camera = cameras[0]
    scene["study"] = "MY TURN V2 / Vivo X80 / comic escalation in neutral clay"
    scene["paid_calls"] = 0
    scene["authored_duration_seconds"] = 15
    scene["handoff"] = "Offer, then cut to owner's registered-thumb shot; continuous transfer elided. Holder shifts 22cm at 216/217 cut."
    return scene, cameras, phone


def manifest(scene):
    return {
        "study": "MY TURN V2 / Vivo X80", "scope": "Local gray clay comic escalation and camera/blocking guide; no AI finish.",
        "paidCalls": 0, "width": 480, "height": 854, "fps": FPS, "frames": COUNT, "durationSeconds": 15,
        "renderer": {"engine": scene.render.engine, "samples": scene.eevee.taa_render_samples},
        "productDimensionsMm": {"width": 75.23, "depth": 8.30, "height": 164.95},
        "design": "X80 three-lens circle inside upper rectangular Cloud Window; single centered front punch hole.",
        "featureStory": "Casual wrong-thumb attempt fails; a smug expert index flourish and second wrong-finger touch also fail. Owner unlocks with a registered thumb; friend visibly deflates. Illustrated dramatization, no Face ID or spoof-resistance claim.",
        "referenceUrl": "https://www.youtube.com/watch?v=ByAi9BGHMRQ",
        "referenceTiming": "Sampled reference observations only. All shot timing below is newly authored.",
        "handoff": "Offer, then cut to owner's registered-thumb shot; continuous transfer elided. Parent-stable grip, holder shifts 22cm at 216/217 cut.",
        "performance": "Baked brows, two-segment mouth, chin, gaze, torso pitch and shoulder/neck/head heights. Free index hand is authored geometry; no slate/audio is required to identify the gesture.",
        "contactFrames": [{"frame": 63, "tip": "Thumb rounded tip", "result": "locked"},
                          {"frame": 132, "tip": "Friend index tip", "result": "locked"},
                          {"frame": 232, "tip": "Thumb rounded tip", "result": "unlock at235"}],
        "performanceSamples": [{"label": label, "frame": frame, "shot": next(i for i, shot in enumerate(SHOTS, 1) if shot[0] <= frame <= shot[1])}
                               for label, frame in PERFORMANCE_SAMPLES],
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
        if not args.start <= frame <= args.end:
            continue
        scene.frame_set(frame)
        scene.camera = cameras[i-1]
        scene.render.filepath = str(OUT / ("shot-%02d.png" % i))
        bpy.ops.render.render(write_still=True)
    for label, frame in PERFORMANCE_SAMPLES:
        if not args.start <= frame <= args.end:
            continue
        index = next(i for i, shot in enumerate(SHOTS) if shot[0] <= frame <= shot[1])
        scene.frame_set(frame)
        scene.camera = cameras[index]
        scene.render.filepath = str(OUT / ("performance-%s.png" % label))
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
            if not args.start <= frame <= args.end:
                continue
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
                           "phoneInFrameRequired": i not in (6, 9)})
    contacts = []
    for frame, tip_name, radius in ((63, "Thumb rounded tip", .007), (132, "Friend index tip", .006), (232, "Thumb rounded tip", .007)):
        scene.frame_set(frame)
        target = phone.matrix_world @ Vector((0, -.00495, -.052))
        tip = bpy.data.objects[tip_name].matrix_world.translation
        distance = (tip-target).length
        contacts.append({"frame": frame, "tip": tip_name, "tipWorld": list(tip), "scanWorld": list(target),
                         "centerDistanceMeters": distance, "tipRadiusMeters": radius, "withinTipRadius": distance <= radius+.0001})
    poses = []
    for frame in (104, 265, 285, 306):
        scene.frame_set(frame)
        head = bpy.data.objects["Friend expressive head"]
        torso = bpy.data.objects["Friend torso"]
        poses.append({"frame": frame, "headWorld": list(head.matrix_world.translation), "headEuler": list(head.rotation_euler),
                      "torsoWorld": list(torso.matrix_world.translation), "torsoEuler": list(torso.rotation_euler),
                      "rightShoulderZ": (bpy.data.objects["Friend upper arm -1"].matrix_world @ Vector((0, 0, -.5))).z})
    result = {"frameRange": [1, COUNT], "durationSeconds": 15, "cameraCount": len(cameras), "markers": len(scene.timeline_markers),
              "renderer": {"engine": scene.render.engine, "samples": scene.eevee.taa_render_samples},
              "savedRenderPath": scene.render.filepath,
              "geometry": "baked per-frame object transforms; no runtime handler", "projectionSamples": checks,
              "projectionScope": "Center projection only; visibility and limb occlusion require actual rendered-frame inspection.",
              "contacts": contacts, "contactScope": "Authored fingertip center-to-scan point distance only, not complete collision or continuous hand simulation.",
              "performancePoseSamples": poses}
    (OUT / "geometry-verification.json").write_text(json.dumps(result, indent=2)+"\n", encoding="utf8")
print(json.dumps({"mode": args.mode, "output": str(OUT), "frames": COUNT, "cameras": len(cameras), "paidCalls": 0}))
