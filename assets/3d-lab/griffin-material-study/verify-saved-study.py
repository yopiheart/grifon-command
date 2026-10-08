"""Read-only verification of the final saved Blender look copies.

Checks the on-disk container after save, not only the builder's in-memory scene.
No rendering, saving, rig edits, or app changes. Run in isolated background
Blender with --python-exit-code 1. Arguments: accepted master, saved baseline,
saved candidate, report JSON.
"""
from array import array
import hashlib
import json
from pathlib import Path
import sys

import bpy

args = sys.argv[sys.argv.index('--') + 1:]
master, baseline, candidate, report = [Path(value).resolve() for value in args]
expected_master = '1f5469d46972ec14490f78a33d17a8b611e8b86810d7aec35820cd1cfacd34e7'

def sha_file(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def buffer_digest(collection, field, count, typecode='f'):
    values = array(typecode, [0]) * count
    collection.foreach_get(field, values)
    return hashlib.sha256(values.tobytes()).hexdigest()

def attributes(data):
    result = {}
    fields = {'FLOAT': ('value', 1, 'f'), 'FLOAT_VECTOR': ('vector', 3, 'f'),
              'FLOAT2': ('vector', 2, 'f'), 'FLOAT_COLOR': ('color', 4, 'f'),
              'BYTE_COLOR': ('color', 4, 'f'), 'INT': ('value', 1, 'i'),
              'BOOLEAN': ('value', 1, 'b'), 'INT32_2D': ('value', 2, 'i')}
    for attr in data.attributes:
        if attr.data_type in fields:
            field, channels, typecode = fields[attr.data_type]
            result[attr.name] = {
                'type': attr.data_type, 'domain': attr.domain, 'elements': len(attr.data),
                'sha256': buffer_digest(attr.data, field, len(attr.data) * channels, typecode),
            }
        else:
            raise ValueError(f'Unhandled geometry attribute {attr.name}: {attr.data_type}')
    return result

def snapshot(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    result = {}
    for ob in bpy.context.scene.objects:
        if ob.type not in ('MESH', 'CURVES'):
            continue
        result[ob.name] = {
            'type': ob.type,
            'transform': [value for row in ob.matrix_world for value in row],
            'attributes': attributes(ob.data),
            'material_slots': [slot.name if slot else None for slot in ob.data.materials],
        }
        if ob.type == 'MESH':
            result[ob.name].update({
                'vertices': len(ob.data.vertices), 'edges': len(ob.data.edges),
                'polygons': len(ob.data.polygons), 'loops': len(ob.data.loops),
                'positions': buffer_digest(ob.data.vertices, 'co', len(ob.data.vertices) * 3),
                'edges_sha256': buffer_digest(ob.data.edges, 'vertices', len(ob.data.edges) * 2, 'i'),
                'loop_indices': buffer_digest(ob.data.loops, 'vertex_index', len(ob.data.loops), 'i'),
                'face_starts': buffer_digest(ob.data.polygons, 'loop_start', len(ob.data.polygons), 'i'),
                'face_counts': buffer_digest(ob.data.polygons, 'loop_total', len(ob.data.polygons), 'i'),
            })
        else:
            result[ob.name].update({'curves': len(ob.data.curves), 'points': len(ob.data.points)})
    palette = {}
    for name in ('Graphite feather base', 'Warm cream facial down',
                 'Warm golden beak and feather tips', 'Obsidian eye'):
        material = bpy.data.materials[name]
        shader = material.node_tree.nodes['Principled BSDF']
        palette[name] = {'base_color': list(shader.inputs['Base Color'].default_value),
                         'metallic': shader.inputs['Metallic'].default_value}
    camera = bpy.context.scene.camera
    return {'geometry': result, 'palette': palette, 'object_count': len(bpy.context.scene.objects),
            'hero_camera': {'position': list(camera.location),
                            'rotation': list(camera.rotation_euler), 'scale': camera.data.ortho_scale}}

input_hashes = {str(path): sha_file(path) for path in (master, baseline, candidate)}
assert input_hashes[str(master)] == expected_master, 'Master identity failed'
original = snapshot(master)
baseline_saved = snapshot(baseline)
candidate_saved = snapshot(candidate)
assert original['geometry'] == baseline_saved['geometry'] == candidate_saved['geometry'], 'Saved geometry differs'
assert original['palette'] == baseline_saved['palette'] == candidate_saved['palette'], 'Palette or metallic identity differs'
assert original['object_count'] == baseline_saved['object_count'] == candidate_saved['object_count'], 'Object identity differs'
assert baseline_saved['hero_camera'] == candidate_saved['hero_camera'], 'Final hero camera differs'
curves = sum(item.get('curves', 0) for item in original['geometry'].values())
assert curves == 404000, 'Native curve count differs'
assert all(material['metallic'] == 0 for material in candidate_saved['palette'].values()), 'Nonmetallic identity differs'
for path in (master, baseline, candidate):
    assert sha_file(path) == input_hashes[str(path)], 'Read-only verification modified a file'
result = {'schema': 1, 'stage': 'saved still-master verification; no rig or runtime validation',
          'pass': True, 'device': 'CPU', 'blender': bpy.app.version_string,
          'verifier_source_sha256': sha_file(Path(__file__)),
          'input_hashes': input_hashes, 'native_curves': curves,
          'mesh_topology_positions_attributes_transforms_exact': True,
          'curve_positions_radii_attributes_transforms_exact': True,
          'principal_surface_base_colors_nonmetallic_identity_exact': True,
          'material_bindings_exact': True,
          'matched_final_hero_camera': True, 'read_only_source_integrity': True,
          'geometry': original['geometry'], 'palette': original['palette'],
          'hero_camera': candidate_saved['hero_camera']}
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'pass': True, 'native_curves': curves, 'report': str(report)}), flush=True)
