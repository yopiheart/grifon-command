"""Mutate one vertex in an isolated copy to exercise preservation verification."""
import hashlib
import json
from pathlib import Path
import sys

import bpy

source, target, report = [Path(value).resolve() for value in sys.argv[sys.argv.index('--') + 1:]]
assert source.is_file(), 'Source candidate is missing'
assert source != target and not target.exists(), 'Refusing to overwrite any asset'
target.parent.mkdir(parents=True, exist_ok=False)

def sha_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

original_sha = sha_file(source)
bpy.ops.wm.open_mainfile(filepath=str(source))
mesh = bpy.data.objects['Continuous griffin silhouette'].data
before = list(mesh.vertices[0].co)
mesh.vertices[0].co.x += 0.001
mesh.update()
after = list(mesh.vertices[0].co)
assert before != after, 'Mutation did not apply'
bpy.ops.wm.save_as_mainfile(filepath=str(target), compress=True)
assert sha_file(source) == original_sha, 'Original candidate changed'
result = {'purpose': 'One-vertex negative control; no visual quality or rendering test',
          'source': str(source), 'source_sha256': original_sha, 'source_unchanged': True,
          'copy': str(target), 'copy_sha256': sha_file(target),
          'object': 'Continuous griffin silhouette', 'vertex_index': 0,
          'before': before, 'after': after, 'delta_x': 0.001}
report.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
print(json.dumps(result), flush=True)
