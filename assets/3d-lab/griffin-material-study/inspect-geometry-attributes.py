"""Read-only RNA field inventory used to validate the saved-asset verifier."""
import bpy
import json
import sys

source = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.open_mainfile(filepath=source)
types = {}
for ob in bpy.context.scene.objects:
    if ob.type in ('MESH', 'CURVES'):
        for attr in ob.data.attributes:
            types[attr.data_type] = {
                'example': attr.name,
                'fields': [prop.identifier for prop in attr.data[0].bl_rna.properties]
                if len(attr.data) else [],
            }
print('ATTRIBUTE_TYPES ' + json.dumps(types, sort_keys=True), flush=True)
