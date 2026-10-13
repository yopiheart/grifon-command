"""Bake unobstructed body lighting for raised-wing reactions; never save the rig.
Blender: --python-exit-code 1 --python bake-reaction-body.py -- RIG_BLEND OUTPUT_PNG
"""
import bpy, sys, hashlib
from pathlib import Path

source, output = map(Path, sys.argv[sys.argv.index('--') + 1:])
if output.exists():
    raise FileExistsError('Preserve the existing bake; choose a fresh output path.')
before = hashlib.sha256(source.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(source))
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
for ob in scene.objects:
    if any(token in ob.name.lower() for token in ('eye', 'beak', 'mouth shadow', 'wing')):
        if ob.animation_data:
            try:
                ob.driver_remove('hide_render')
            except TypeError:
                pass
        ob.hide_render = True
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.cycles.samples = 48
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = str(output)
bpy.ops.render.render(write_still=True)
assert output.is_file()
assert hashlib.sha256(source.read_bytes()).hexdigest() == before, 'Source changed'
print('PASS: clean body plate saved; accepted rig unchanged', flush=True)
