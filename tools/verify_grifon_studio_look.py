"""Run after opening studio-look.blend with Blender --python-exit-code 1.

Tests the product-support contact and printed-label geometry, not aesthetic quality.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

scene = bpy.context.scene
bpy.context.view_layer.update()
plinth = bpy.data.objects["Product plinth gold edge"]
bottle = bpy.data.objects["Look bottle / closed glass shell"]
top = max((plinth.matrix_world @ Vector(v)).z for v in plinth.bound_box)
bottom = min((bottle.matrix_world @ Vector(v)).z for v in bottle.bound_box)
gap = bottom-top
assert abs(gap) < 0.00001, f"Bottle contact gap {gap:.6f}m exceeds 0.01mm tolerance"
label_offsets = []
for name in ("Demo label D E M O", "Demo label 01"):
    obj = bpy.data.objects[name]
    assert obj.type == "MESH", "Label has not been conformed to paper"
    for v in obj.data.vertices:
        world = obj.matrix_world @ v.co
        offset = math.hypot(world.x, world.y)-.1475
        assert .0001 <= offset <= .0002, (name, offset)
        label_offsets.append(offset)
external = [im.name for im in bpy.data.images if im.source == "FILE" and not im.packed_file]
assert not external, external
assert scene.render.engine == "CYCLES"
assert (scene.render.resolution_x, scene.render.resolution_y) == (1920,1080)
assert scene.render.resolution_percentage == 100
assert scene.camera.data.dof.use_dof
report = {"blender": bpy.app.version_string, "objects": len(scene.objects),
          "render_engine": scene.render.engine, "samples": scene.cycles.samples,
          "resolution": [1920,1080], "bottle_support_gap_m": gap,
          "label_radial_offset_m": [min(label_offsets),max(label_offsets)],
          "external_images": external, "scope": "Contact and label-vertex checks only. Does not certify all surface points, optical realism, motion or film quality."}
out = Path(__file__).resolve().parents[1] / "assets/hero-film/studio-look/verification.json"
out.write_text(json.dumps(report,indent=2)+"\n", encoding="utf-8")
print(json.dumps(report))
