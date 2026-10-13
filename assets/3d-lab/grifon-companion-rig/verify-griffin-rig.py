"""Read-only checks. Blender --background --python-exit-code 1 --python SCRIPT
-- MASTER_BLEND RIG_BLEND REPORT_JSON [REJECTED_OLD_RIG]
The optional fourth path must reproduce the earlier controller-continuity defect.
"""
import bpy, sys, json, os, time, hashlib
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) not in (3, 4):
    raise ValueError('Expected: -- MASTER_BLEND RIG_BLEND REPORT_JSON [REJECTED_OLD_RIG]')
MASTER, RIG, output = [os.path.abspath(path) for path in args[:3]]
RIGS = {'candidate': RIG}
if len(args) == 4:
    RIGS['rejected_baseline'] = os.path.abspath(args[3])
if os.path.realpath(output) in {os.path.realpath(path) for path in (MASTER, *RIGS.values())}:
    raise ValueError('REPORT_JSON must not overwrite a source blend')
BODY = 'Continuous griffin silhouette'
COAT = 'Graphite short feather coat'
PROPS = ('head_yaw', 'head_pitch', 'gaze_x', 'gaze_y', 'blink', 'breath')
started = time.perf_counter()

def digest(path):
    with open(path, 'rb') as handle:
        return hashlib.file_digest(handle, 'sha256').hexdigest()

def coords(obj):
    data = obj.data
    source = data.vertices if obj.type == 'MESH' else data.attributes['position'].data
    result = np.empty(len(source) * 3, dtype=np.float32)
    source.foreach_get('co' if obj.type == 'MESH' else 'vector', result)
    return result.reshape((-1, 3))

def evaluated(name):
    return bpy.data.objects[name].evaluated_get(bpy.context.evaluated_depsgraph_get())

def frame(number):
    bpy.context.scene.frame_set(number)
    bpy.context.view_layer.update()

def invalid_drivers():
    bad, total = [], 0
    blocks = list(bpy.data.objects) + list(bpy.data.node_groups) + list(bpy.data.shape_keys)
    blocks += [m.node_tree for m in bpy.data.materials if m.node_tree]
    blocks += [w.node_tree for w in bpy.data.worlds if w.node_tree]
    for block in blocks:
        animation = block.animation_data
        if animation:
            for curve in animation.drivers:
                total += 1
                if not curve.driver.is_valid:
                    bad.append({'block': block.name, 'path': curve.data_path, 'index': curve.array_index})
    return {'total': total, 'invalid': bad}

before = {p: digest(p) for p in [MASTER, *RIGS.values()]}
bpy.ops.wm.open_mainfile(filepath=MASTER)
frame(1)
master_base = coords(bpy.data.objects[BODY])
master_eval = coords(evaluated(BODY))
master_matrix = np.array(evaluated(BODY).matrix_world)
master_curves = {o.name: len(o.data.curves) for o in bpy.context.scene.objects if o.type == 'CURVES'}

def check_rig(path):
    bpy.ops.wm.open_mainfile(filepath=path)
    frame(1)
    control = bpy.data.objects['COMPANION CONTROLS']
    result = {'checks': {}, 'evidence': {}}
    checks, evidence = result['checks'], result['evidence']
    evidence['property_types'] = {p: type(control[p]).__name__ for p in PROPS}
    checks['animated_properties_are_float'] = all(isinstance(control[p], float) for p in PROPS)
    neutral = coords(evaluated(BODY))
    base = coords(bpy.data.objects[BODY])
    same_shape = neutral.shape == master_eval.shape and base.shape == master_base.shape
    error = float(np.max(np.abs(neutral - master_eval))) if same_shape else None
    base_error = float(np.max(np.abs(base - master_base))) if same_shape else None
    evidence['neutral_body'] = {'base_max_error': base_error, 'evaluated_max_error': error,
                                'vertices': len(neutral), 'matrix_max_error': float(np.max(np.abs(np.array(evaluated(BODY).matrix_world) - master_matrix)))}
    checks['neutral_geometry_matches_master'] = same_shape and error < 1e-6 and base_error < 1e-6 and evidence['neutral_body']['matrix_max_error'] < 1e-6
    evidence['curve_objects'] = {o.name: len(o.data.curves) for o in bpy.context.scene.objects if o.type == 'CURVES'}
    evidence['master_curve_objects'] = master_curves
    evidence['curve_count'] = sum(evidence['curve_objects'].values())
    checks['approved_404000_curves_and_objects_preserved'] = evidence['curve_objects'] == master_curves and evidence['curve_count'] == 404000
    checks['protruding_lid_objects_removed'] = not any('eyelid' in o.name.lower() for o in bpy.context.scene.objects)
    baseline_eyes = {name: np.array(evaluated(name).matrix_world) for name in ('Left glossy eye', 'Right glossy eye')}
    coat_neutral = coords(evaluated(COAT))[::5].copy()
    body_neutral = neutral.copy()
    frame(13)
    breath = float(control['breath'])
    evidence['breathing'] = {'frame': 13, 'control': breath}
    breath_pass = abs(breath) > .1
    for name, initial, stride in ((BODY, body_neutral, 1), (COAT, coat_neutral, 5)):
        ob = evaluated(name)
        current = coords(ob)[::stride]
        attr = ob.data.attributes['breath_weight'].data
        weights = np.empty(len(attr), dtype=np.float32)
        attr.foreach_get('value', weights)
        weights = weights[::stride]
        expected_delta = initial * np.array([.012, .022, 0], dtype=np.float32)
        expected_delta[:, 2] = .004
        expected_delta *= (breath * weights)[:, None]
        actual_delta = current - initial
        residual = float(np.max(np.abs(actual_delta - expected_delta)))
        displacement = float(np.max(np.linalg.norm(actual_delta, axis=1)))
        evidence['breathing'][name] = {'points_tested': len(initial), 'max_displacement': displacement,
                                      'shared_field_max_error': residual}
        breath_pass &= displacement > 1e-4 and residual < 2e-6
    checks['breathing_deforms_body_and_roots_coherently'] = bool(breath_pass)
    blink = {}
    drivers = []
    for f in range(13, 19):
        frame(f)
        blink[str(f)] = {'control': float(control['blink']), 'eyes': {}}
        for name in baseline_eyes:
            eye = evaluated(name)
            crease = evaluated(name + ' blink crease')
            blink[str(f)]['eyes'][name] = {'scale': list(eye.scale), 'depth': float(eye.location.y),
                                         'hide_render': bool(eye.hide_render), 'crease_scale': list(crease.scale)}
        drivers.append(invalid_drivers())
    evidence['blink'] = blink
    checks['blink_interpolates_fractionally'] = any(0 < row['control'] < 1 and all(.03 < eye['scale'][2] < 1 and .1 < eye['scale'][1] < 1 and not eye['hide_render'] for eye in row['eyes'].values()) for row in blink.values())
    closed, opened = blink['16'], blink['18']
    checks['blink_closed16_open18'] = abs(closed['control'] - 1) < 1e-6 and abs(opened['control']) < 1e-6 and all(eye['scale'][2] < .031 and eye['scale'][1] < .101 and eye['depth'] > .039 and eye['hide_render'] and min(eye['crease_scale']) > .999 for eye in closed['eyes'].values()) and all(max(abs(s-1) for s in eye['scale']) < 1e-6 and abs(eye['depth']) < 1e-6 and not eye['hide_render'] and max(eye['crease_scale']) < 1e-6 for eye in opened['eyes'].values())
    frame(25)
    head = evaluated('Head pivot')
    eye_deltas = {name: float(np.max(np.abs(np.array(evaluated(name).matrix_world) - original))) for name, original in baseline_eyes.items()}
    evidence['frame25'] = {'head_rotation': list(head.rotation_euler), 'eye_matrix_changes': eye_deltas,
                           'control': {p: float(control[p]) for p in PROPS}}
    checks['eyes_lead_neutral_head_at25'] = max(abs(v) for v in head.rotation_euler) < 1e-6 and all(v > 1e-4 for v in eye_deltas.values())
    drivers.append(invalid_drivers())
    frame(72)
    head = evaluated('Head pivot')
    evidence['frame72'] = {'head_rotation': list(head.rotation_euler), 'control': {p: float(control[p]) for p in PROPS}}
    checks['head_yaw_pitch_nonzero_at72'] = abs(head.rotation_euler.z) > .01 and abs(head.rotation_euler.x) > .01
    drivers.append(invalid_drivers())
    evidence['driver_checks'] = drivers
    checks['drivers_valid_after_reopen_and_evaluation'] = all(d['total'] > 0 and not d['invalid'] for d in drivers)
    result['pass'] = all(checks.values())
    return result

report = {'blender_version': bpy.app.version_string, 'inputs': {'master': MASTER, **RIGS},
          'results': {v: check_rig(p) for v, p in RIGS.items()}}
report['source_hashes_unchanged'] = all(digest(p) == h for p, h in before.items())
report['source_sha256'] = before
report['regression_rejection_run'] = 'rejected_baseline' in RIGS
report['old_defect_rejected'] = None
if report['regression_rejection_run']:
    old = report['results']['rejected_baseline']
    report['old_defect_rejected'] = not old['checks']['blink_interpolates_fractionally'] and not old['checks']['head_yaw_pitch_nonzero_at72']
report['pass'] = report['results']['candidate']['pass'] and report['source_hashes_unchanged'] and (not report['regression_rejection_run'] or report['old_defect_rejected'])
report['runtime_seconds'] = round(time.perf_counter() - started, 3)
with open(output, 'w', encoding='utf-8') as handle:
    json.dump(report, handle, indent=2)
print(json.dumps({'pass': report['pass'], 'checks': {v: r['checks'] for v, r in report['results'].items()}, 'report': output, 'runtime_seconds': report['runtime_seconds']}), flush=True)
if not report['pass']:
    raise RuntimeError('Rig verification failed; inspect JSON report')
