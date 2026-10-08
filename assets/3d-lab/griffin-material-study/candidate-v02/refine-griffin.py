"""Local-only look development from the accepted saved master.

This script changes only material inputs and area-light/world settings. It
hashes every mesh and native curve geometry buffer before and after the look
change, and fails if their identity differs. No rig or runtime files are used.
Run in an isolated Blender background process with --python-exit-code 1.
"""
import argparse
from array import array
import hashlib
import json
import os
from pathlib import Path
import platform
import sys
import time

import bpy
from mathutils import Vector

EXPECTED_BASELINE = '1f5469d46972ec14490f78a33d17a8b611e8b86810d7aec35820cd1cfacd34e7'
parser = argparse.ArgumentParser()
parser.add_argument('--input', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--version', required=True)
parser.add_argument('--look', choices=['baseline', 'v01', 'v02'], required=True)
parser.add_argument('--size', type=int, default=1000)
parser.add_argument('--samples', type=int, default=96)
parser.add_argument('--views', nargs='+', default=['hero'])
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(args.input).resolve()
out = Path(args.output).resolve()
out.mkdir(parents=True, exist_ok=False)
started = time.monotonic()

def sha_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

assert source.is_file(), 'Saved master is missing'
assert sha_file(source) == EXPECTED_BASELINE, 'Input is not the frozen approved v05 master'
bpy.ops.wm.open_mainfile(filepath=str(source))
scene = bpy.context.scene

def buffer_digest(collection, field, count, typecode='f'):
    data = array(typecode, [0]) * count
    collection.foreach_get(field, data)
    return hashlib.sha256(data.tobytes()).hexdigest()

def geometry_snapshot():
    result = {}
    for ob in scene.objects:
        if ob.type == 'MESH':
            result[ob.name] = {
                'type': ob.type,
                'vertices': len(ob.data.vertices),
                'polygons': len(ob.data.polygons),
                'coordinates': buffer_digest(ob.data.vertices, 'co', len(ob.data.vertices) * 3),
                'topology': buffer_digest(ob.data.loops, 'vertex_index', len(ob.data.loops), 'i'),
                'transform': list(sum((list(row) for row in ob.matrix_world), [])),
            }
        elif ob.type == 'CURVES':
            attributes = {}
            for attr in ob.data.attributes:
                if attr.data_type == 'FLOAT_VECTOR':
                    attributes[attr.name] = buffer_digest(attr.data, 'vector', len(attr.data) * 3)
                elif attr.data_type == 'FLOAT':
                    attributes[attr.name] = buffer_digest(attr.data, 'value', len(attr.data))
                elif attr.data_type == 'INT':
                    attributes[attr.name] = buffer_digest(attr.data, 'value', len(attr.data), 'i')
            result[ob.name] = {
                'type': ob.type,
                'curves': len(ob.data.curves),
                'points': len(ob.data.points),
                'attributes': attributes,
                'transform': list(sum((list(row) for row in ob.matrix_world), [])),
            }
    return result

def socket_value(socket):
    if not hasattr(socket, 'default_value'):
        return None
    value = socket.default_value
    if isinstance(value, (str, bool, int, float)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)

def look_snapshot():
    materials = {}
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        materials[mat.name] = {
            'nodes': {
                node.name: {
                    'type': node.bl_idname,
                    'inputs': {socket.name: socket_value(socket) for socket in node.inputs},
                    'ramp': [[e.position, list(e.color)] for e in node.color_ramp.elements]
                    if hasattr(node, 'color_ramp') else None,
                } for node in mat.node_tree.nodes
            },
            'links': [[link.from_node.name, link.from_socket.name,
                       link.to_node.name, link.to_socket.name] for link in mat.node_tree.links],
        }
    return {
        'materials': materials,
        'lights': {ob.name: {'energy': ob.data.energy, 'size': ob.data.size,
                            'color': list(ob.data.color), 'position': list(ob.location)}
                   for ob in scene.objects if ob.type == 'LIGHT'},
        'world': {socket.name: socket_value(socket)
                  for socket in scene.world.node_tree.nodes['Background'].inputs},
    }

before_geometry = geometry_snapshot()
before_look = look_snapshot()
curves = sum(item.get('curves', 0) for item in before_geometry.values())
assert curves == 404000, f'Unexpected native curve count {curves}'

if args.look in ('v01', 'v02'):
    # Main axis: tactile material separation and more shaped, neutral light.
    # Groom roots, tips, radii, landmarks and all geometry are untouched.
    graphite = bpy.data.materials['Graphite short feather fibers']
    hair = next(node for node in graphite.node_tree.nodes if node.type == 'BSDF_HAIR_PRINCIPLED')
    ramp = next(node for node in graphite.node_tree.nodes if node.type == 'VALTORGB')
    base = (0.017, 0.019, 0.023)
    hair.inputs['Roughness'].default_value = 0.47
    hair.inputs['Radial Roughness'].default_value = 0.62
    ramp.color_ramp.elements[0].color = (*[c * 0.62 for c in base], 1)
    ramp.color_ramp.elements[1].color = (*[c * 1.36 for c in base], 1)
    cream = bpy.data.materials['Cream micro down fibers']
    cream_shader = next(node for node in cream.node_tree.nodes if node.type == 'BSDF_HAIR_PRINCIPLED')
    cream_shader.inputs['Roughness'].default_value = 0.68
    cream_shader.inputs['Radial Roughness'].default_value = 0.70
    eye = bpy.data.materials['Obsidian eye'].node_tree.nodes['Principled BSDF']
    eye.inputs['Roughness'].default_value = 0.075
    eye.inputs['Coat Weight'].default_value = 0.36
    eye.inputs['Coat Roughness'].default_value = 0.08
    gold = bpy.data.materials['Warm golden beak and feather tips'].node_tree.nodes['Principled BSDF']
    gold.inputs['Roughness'].default_value = 0.32
    gold.inputs['Coat Weight'].default_value = 0.12
    gold.inputs['Coat Roughness'].default_value = 0.28
    key = bpy.data.objects['Large window key'].data
    key.energy = 520
    key.size = 3.4
    key.color = (1.0, 0.975, 0.94)
    fill = bpy.data.objects['Gentle camera fill'].data
    fill.energy = 60
    fill.size = 3.0
    fill.color = (0.94, 0.97, 1.0)
    rim = bpy.data.objects['Soft feather rim'].data
    rim.energy = 380
    rim.size = 2.7
    rim.color = (1.0, 0.96, 0.89)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.19

if args.look == 'v02':
    # Remaining axis: reduce synthetic mottling and uniform bright flyaways.
    # Material response only: all physical strand geometry remains identical.
    nodes = graphite.node_tree.nodes
    links = graphite.node_tree.links
    info = next(node for node in nodes if node.type == 'HAIR_INFO')
    base = (0.017, 0.019, 0.023)
    ramp.color_ramp.elements[0].color = (*[c * 0.85 for c in base], 1)
    ramp.color_ramp.elements[1].color = (*[c * 1.12 for c in base], 1)
    tip_tone = nodes.new('ShaderNodeMapRange')
    tip_tone.name = 'Graphite soft root to tip tone'
    tip_tone.inputs['From Min'].default_value = 0.0
    tip_tone.inputs['From Max'].default_value = 1.0
    tip_tone.inputs['To Min'].default_value = 0.94
    tip_tone.inputs['To Max'].default_value = 0.74
    links.new(info.outputs['Intercept'], tip_tone.inputs['Value'])
    tone = nodes.new('ShaderNodeMixRGB')
    tone.name = 'Graphite restrained tip contrast'
    tone.blend_type = 'MULTIPLY'
    tone.inputs[0].default_value = 1.0
    links.new(ramp.outputs['Color'], tone.inputs[1])
    links.new(tip_tone.outputs['Result'], tone.inputs[2])
    gold_mix = next(node for node in nodes if node.type == 'MIX_RGB' and node != tone)
    links.new(tone.outputs['Color'], gold_mix.inputs[1])
    tip_roughness = nodes.new('ShaderNodeMapRange')
    tip_roughness.name = 'Soft fiber root to tip roughness'
    tip_roughness.inputs['From Min'].default_value = 0.0
    tip_roughness.inputs['From Max'].default_value = 1.0
    tip_roughness.inputs['To Min'].default_value = 0.45
    tip_roughness.inputs['To Max'].default_value = 0.57
    links.new(info.outputs['Intercept'], tip_roughness.inputs['Value'])
    position = nodes.new('ShaderNodeNewGeometry')
    position.name = 'Physical feather region position'
    separate = nodes.new('ShaderNodeSeparateXYZ')
    separate.name = 'Crest region height'
    links.new(position.outputs['Position'], separate.inputs['Vector'])
    crest_roughness = nodes.new('ShaderNodeMapRange')
    crest_roughness.name = 'Crest softer edge response'
    crest_roughness.inputs['From Min'].default_value = 2.15
    crest_roughness.inputs['From Max'].default_value = 2.80
    crest_roughness.inputs['To Min'].default_value = 0.0
    crest_roughness.inputs['To Max'].default_value = 0.10
    links.new(separate.outputs['Z'], crest_roughness.inputs['Value'])
    combined = nodes.new('ShaderNodeMath')
    combined.name = 'Anatomical fiber roughness'
    combined.operation = 'ADD'
    links.new(tip_roughness.outputs['Result'], combined.inputs[0])
    links.new(crest_roughness.outputs['Result'], combined.inputs[1])
    links.new(combined.outputs['Value'], hair.inputs['Roughness'])

after_geometry = geometry_snapshot()
assert before_geometry == after_geometry, 'Look development altered geometry'
after_look = look_snapshot()
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.cycles.adaptive_threshold = 0.008
scene.cycles.seed = 0
scene.render.resolution_x = args.size
scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False

def xyz(p):
    return (p[0], -p[2], p[1])

def set_view(view):
    position = (2.7, 2.55, 8)
    target = (0, 1.53, 0)
    scale = 3.75
    if view == 'front':
        position = (0, 2.05, 8)
    elif view == 'detail':
        position = (1.5, 2.2, 7)
        target = (0, 1.89, 0.15)
        scale = 2.15
    elif view == 'profile':
        position = (6, 2.5, 6)
    elif view not in ('hero', 'transparent'):
        raise ValueError(f'Unsupported view: {view}')
    scene.render.film_transparent = view == 'transparent'
    bpy.data.objects['Studio floor'].hide_render = view == 'transparent'
    scene.camera.location = xyz(position)
    scene.camera.rotation_euler = (Vector(xyz(target)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera.data.ortho_scale = scale

set_view('hero')
blend = out / f'griffin-{args.version}.blend'
scene.render.filepath = str(out / f'griffin-{args.version}-hero.png')
bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
evidence = {
    'stage': 'Blender look-development still; rig and app integration unchanged',
    'version': args.version, 'look': args.look,
    'baseline': {'path': str(source), 'sha256': EXPECTED_BASELINE},
    'runtime': {'blender': bpy.app.version_string, 'build_hash': bpy.app.build_hash.decode(),
                'platform': platform.platform(), 'device': scene.cycles.device},
    'render': {'resolution': args.size, 'samples': args.samples,
               'adaptive_threshold': scene.cycles.adaptive_threshold,
               'denoising': scene.cycles.use_denoising,
               'view_transform': scene.view_settings.view_transform,
               'look': scene.view_settings.look,
               'exposure': scene.view_settings.exposure},
    'invariants': {'native_curves': curves, 'all_geometry_buffers_unchanged': True,
                   'before': before_geometry, 'after': after_geometry},
    'look_before': before_look, 'look_after': after_look,
    'files': [{'path': blend.name, 'bytes': blend.stat().st_size, 'sha256': sha_file(blend)}],
    'views': [],
}
for view in args.views:
    set_view(view)
    image = out / f'griffin-{args.version}-{view}.png'
    scene.render.filepath = str(image)
    render_start = time.monotonic()
    print(f'STUDY_RENDER_START {args.version} {view}', flush=True)
    bpy.ops.render.render(write_still=True)
    assert image.is_file() and image.stat().st_size > 0, 'Render output is missing'
    evidence['views'].append({'name': view, 'seconds': round(time.monotonic() - render_start, 3),
                              'camera': list(scene.camera.location), 'scale': scene.camera.data.ortho_scale,
                              'transparent': scene.render.film_transparent})
    evidence['files'].append({'path': image.name, 'bytes': image.stat().st_size, 'sha256': sha_file(image)})
    print(f'STUDY_RENDER_COMPLETE {args.version} {view} {image}', flush=True)
assert sha_file(source) == EXPECTED_BASELINE, 'Approved input changed during rendering'
source_snapshot = out / 'refine-griffin.py'
source_snapshot.write_bytes(Path(__file__).read_bytes())
evidence['files'].append({'path': source_snapshot.name, 'bytes': source_snapshot.stat().st_size,
                          'sha256': sha_file(source_snapshot)})
evidence['elapsed_seconds'] = round(time.monotonic() - started, 3)
with open(out / 'manifest.json', 'w', encoding='utf-8', newline='\n') as stream:
    json.dump(evidence, stream, indent=2)
    stream.write('\n')
print(json.dumps({'version': args.version, 'geometry_identical': True, 'curves': curves,
                  'output': str(out), 'seconds': evidence['elapsed_seconds']}), flush=True)
