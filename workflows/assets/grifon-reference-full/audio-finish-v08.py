"""Finish the full 32.9s B-direction soundtrack; never change the approved picture.

Sources and intermediate stems stay local under assets/audio-v07/sources and assets/audio-v08/work.
Mixkit music is delivered only inside videos, not as a music-only remix.
Run with the existing Codex Python runtime (NumPy required).
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[2]
FF = REPO / 'node_modules/ffmpeg-static/ffmpeg.exe'
PROBE = REPO / '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe'
SRC = ROOT / 'assets/audio-v07/sources'
WORK = ROOT / 'assets/audio-v08/work'
QA = ROOT / 'qa/sound-v08'
OUT = ROOT / 'exports'
SR, DURATION = 48000, 32.9
N = int(SR * DURATION)
PICTURE = ROOT / 'exports/grifon-picture-v04.mp4'
for folder in [WORK, QA, OUT]:
    folder.mkdir(parents=True, exist_ok=True)


def run(args):
    result = subprocess.run([str(FF), '-hide_banner', '-y', *map(str, args)],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace')[-6000:])
    return result


def decode(file, start=0, duration=None, filters=None):
    args = ['-v', 'error', '-ss', str(start), '-i', file, '-vn']
    if duration is not None:
        args += ['-t', str(duration)]
    if filters:
        args += ['-af', filters]
    data = run(args + ['-ar', SR, '-ac', 2, '-f', 'f32le', 'pipe:1']).stdout
    return np.frombuffer(data, dtype='<f4').reshape(-1, 2).copy()


def write_wav(file, samples):
    if not np.isfinite(samples).all() or np.max(np.abs(samples)) >= 1:
        raise ValueError('Premaster is non-finite or would clip')
    with wave.open(str(file), 'wb') as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SR)
        out.writeframes((samples * 32767).astype('<i2').tobytes())


def measure(file, target=-16, peak=-1.7):
    result = run(['-i', file, '-vn', '-af',
                  f'loudnorm=I={target}:TP={peak}:LRA=9:print_format=json',
                  '-f', 'null', '-'])
    return json.loads(re.findall(r'\{\s*"input_i"[\s\S]*?\}',
                                result.stderr.decode())[-1])


def master(file, target_file):
    data = measure(file)
    filt = ('loudnorm=I=-16:TP=-1.7:LRA=9:linear=true:'
            f'measured_I={data["input_i"]}:measured_TP={data["input_tp"]}:'
            f'measured_LRA={data["input_lra"]}:measured_thresh={data["input_thresh"]}:'
            f'offset={data["target_offset"]}')
    run(['-v', 'error', '-i', file, '-af', filt, '-ar', SR, '-c:a', 'pcm_s24le', target_file])


samples = {}
sample_info = {}
for name in ['sweep', 'air-zoom', 'shutter', 'lens', 'tech-select', 'key', 'bubble', 'gear']:
    source = SRC / f'{name}.wav'
    audio = decode(source, filters='highpass=f=90,lowpass=f=10500')
    peak = float(np.max(np.abs(audio)))
    active = np.flatnonzero(np.max(np.abs(audio), axis=1) > peak * .009)
    start = max(0, int(active[0]) - 96)
    end = min(len(audio), int(active[-1]) + 480)
    samples[name] = audio[start:end] / peak
    sample_info[name] = {'trim_start': start / SR, 'trim_end': end / SR,
                         'sha256': hashlib.sha256(source.read_bytes()).hexdigest()}

sfx = np.zeros((N, 2), dtype=np.float64)
cues = []


def place(name, time, db, duration=None, rate=1, pan_from=0, pan_to=None, event=''):
    clip = samples[name]
    if rate != 1:
        pos = np.arange(0, len(clip), rate)
        clip = np.column_stack([np.interp(pos, np.arange(len(clip)), clip[:, c]) for c in [0, 1]])
    if duration is not None:
        clip = clip[:int(duration * SR)]
    clip = clip.copy()
    fade_in = min(int((.025 if name == 'suction' else .002) * SR), len(clip) // 3)
    fade_out = min(int(.025 * SR), len(clip) // 3)
    clip[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    clip[-fade_out:] *= np.linspace(1, 0, fade_out)[:, None]
    pan_to = pan_from if pan_to is None else pan_to
    pan = np.linspace(pan_from, pan_to, len(clip))
    # Recorded effect is collapsed to mono, then equal-power panned for a controlled move.
    mono = clip.mean(axis=1)
    clip = np.column_stack([mono * np.cos((pan + 1) * np.pi / 4),
                            mono * np.sin((pan + 1) * np.pi / 4)])
    start = round(time * SR)
    count = min(len(clip), N - start)
    if count <= 0:
        raise ValueError('Cue outside preview')
    sfx[start:start + count] += clip[:count] * 10 ** (db / 20)
    cues.append({'source': name, 'start': time, 'duration': count / SR,
                 'gain_db': db, 'rate': rate, 'pan_from': pan_from,
                 'pan_to': pan_to, 'event': event})


# Exactly the current composition's character schedule, with spaces silent.
opening = re.search(r"opening:'([^']+)'", (ROOT / 'copy.js').read_text(encoding='utf-8')).group(1)
for i, ch in enumerate(opening):
    if ch.isspace():
        continue
    place('key', .08 + .82 * i / (len(opening) - 1), -15.5 - (i % 3) * .7,
          duration=.060, rate=1.1 + .07 * (i % 3), event=f'Opening character {i}: {ch}')

for start, label in [(1.13, 'Launch'), (4.24, 'Story'), (7.23, 'Grow')]:
    for i, offset in enumerate([0, .12, .26, .45]):
        place('bubble', start + offset, -22 - i * .4, duration=.11,
              rate=1.15 + i * .08, pan_from=-.25 + i / 6,
              event=f'{label} collage word {i + 1}')

for start in [2.16, 5.03, 8.08]:
    place('sweep', start, -13.5, duration=.42, rate=1.55,
          pan_from=.65, pan_to=-.65, event='Collage swipe left')

for start, finish, hero in [(2.63, 3.82, 'Camera'), (5.65, 6.84, 'Phone'), (8.61, 9.8, 'Laptop')]:
    place('air-zoom', start, -16, duration=1.12, rate=1.2,
          pan_from=-.5, pan_to=.5, event=f'{hero} rotation')
    if hero == 'Camera':
        place('lens', finish - .30, -21, duration=.3, event='Lens settles into camera reveal')
        place('shutter', finish, -12, duration=.38, event='Camera turn ends')
    elif hero == 'Phone':
        place('tech-select', finish, -17, duration=.40, rate=1.15, event='Phone turn ends / screen detail')
    else:
        place('gear', finish, -16, duration=.16, rate=1.2, event='Laptop turn ends / hinge detail')

# The problem line gets a decreasing pulse, then a short intake of air before
# the warm reveal. No constant ticking during the readable holds.
for i in range(5):
    place('key', 10.2 + i * .21, -18.5 - i * 1.2, duration=.07,
          rate=1.05 - i * .055, event=f'Problem phrase {i + 1}')
samples['suction'] = samples['air-zoom'][:int(.65 * SR)][::-1].copy()
sample_info['suction'] = {'derived_from': 'air-zoom', 'operation': 'reverse first 0.65s'}
place('suction', 12.62, -18, duration=.41, rate=1.3,
      pan_from=-.25, pan_to=0, event='Intake into warm reveal')
place('bubble', 13.03, -14, duration=.18, rate=.7, event='Warm reveal contact')
turning = re.search(r"turningPoint:'([^']+)'", (ROOT / 'copy.js').read_text(encoding='utf-8')).group(1)
for i, ch in enumerate(turning):
    if not ch.isspace():
        place('key', 13.2 + .52 * i / (len(turning) - 1), -21.5 - (i % 3),
              duration=.055, rate=1.25 + .04 * (i % 3), event=f'Until now character {i}: {ch}')

place('suction', 13.82, -20, duration=.43, rate=1.35, event='Sphere anticipation')
place('air-zoom', 14.27, -14.5, duration=1.18, rate=.83,
      pan_from=-.2, pan_to=.25, event='Sphere expands')
place('gear', 14.29, -23, duration=.18, rate=.62, event='Soft body under sphere reveal')

# Message arrivals have discrete UI sounds; sparse key clusters follow the
# existing visual typewriter schedule without filling every gap with noise.
for at, span, message, side in [
        (17.65, .7, 'What are we creating?', -.22),
        (18.86, 1.22, 'An ad for my next product launch.', .22),
        (20.8, 1.2, 'Let\u2019s find the angle. Then build the story.', -.22)]:
    place('bubble', at, -16.5, duration=.16, rate=1.05 if side < 0 else .90,
          pan_from=side, event='Message card arrives')
    for i, ch in enumerate(message):
        if ch.isspace() or i % 3 != 0:
            continue
        place('key', at + .11 + span * i / (len(message) - 1), -27.5 - (i % 4),
              duration=.036, rate=1.25 + .05 * (i % 3), pan_from=side,
              event=f'Message character {i}')

place('sweep', 22.48, -21, duration=.30, rate=1.9,
      pan_from=.35, pan_to=-.35, event='Dialogue exits')
for i, at in enumerate([22.8, 23.03, 23.33, 23.74, 24.08]):
    place('bubble', at, -18 - i * .4, duration=.12, rate=.9 + i * .1,
          pan_from=-.2 + i * .1, event=f'Closing phrase {i + 1}')
place('air-zoom', 25.3, -23, duration=.86, rate=1.25,
      pan_from=-.35, pan_to=.35, event='Outline traces')
place('gear', 26.17, -25, duration=.12, rate=1.45, event='First outline edge completes')
for i, at in enumerate([26.82, 27.05, 27.1]):
    # One shared sweep for the closely spaced fan-out, distinct light contacts.
    if i == 0:
        place('sweep', at - .06, -19, duration=.37, rate=1.4,
              pan_from=-.4, pan_to=.4, event='Workflow cards fan out')
    place('bubble', at + .20, -20.5 - i, duration=.13, rate=.9 + i * .13,
          pan_from=-.4 + i * .4, event=f'Workflow card {i + 1} arrives')
place('suction', 28.87, -16.5, duration=.40, rate=1.55,
      pan_from=.25, pan_to=0, event='Workflow strip compresses to logo')
place('gear', 29.28, -18, duration=.22, rate=.8, event='Logo lands')
place('tech-select', 29.31, -20, duration=.9, rate=.88, event='Logo confirmation tail')

write_wav(WORK / 'sfx-premaster.wav', sfx)
(QA / 'cue-sheet.json').write_text(json.dumps({'duration': DURATION, 'cues': cues,
    'sample_preparation': sample_info}, indent=2), encoding='utf-8')


def envelope(points):
    """Cosine interpolation keeps authored gain changes free of sharp corners."""
    time = np.arange(N) / SR
    result = np.full(N, points[0][1], dtype=np.float64)
    for (begin, a), (end, b) in zip(points, points[1:]):
        use = (time >= begin) & (time < end)
        progress = (time[use] - begin) / (end - begin)
        result[use] = a + (b - a) * (.5 - .5 * np.cos(np.pi * progress))
    result[time >= points[-1][0]] = points[-1][1]
    return result


# Keep a continuous musical phrase (source 8-40.9s), so the beat never jumps
# between arbitrary stock sections. Arrange space through filtering and gain.
music_path = WORK / 'music-continuous.wav'
run(['-v', 'error', '-ss', '8', '-i', SRC / 'digital-clouds.mp3', '-t', DURATION,
     '-af', 'loudnorm=I=-20:TP=-3:LRA=9', '-ar', SR, '-ac', 2, music_path])
music = decode(music_path)[:N]
muted_music = decode(music_path, filters='lowpass=f=900')[:N]
clear_music = decode(music_path, filters='bass=g=-3:f=180:w=0.7')[:N]
if len(music) != N or len(muted_music) != N:
    raise ValueError('Music does not cover the full picture')
time = np.arange(N) / SR
gain_points = [(0, -1.3), (.10, -1.3), (9.9, -1.3), (10.5, -4),
               (12.4, -6), (12.84, -17), (13.08, -17), (13.38, -.5),
               (14.12, -.5), (14.42, 1.4), (16.9, 1.4), (17.55, -2.3),
               (22.2, -2.3), (22.8, -.3), (25.1, -.3), (26.8, .7),
               (28.75, .7), (29.28, -1.8), (30.65, -1.8), (32.55, -60)]
filter_points = [(0, 0), (10.15, 0), (10.8, .76), (12.8, .9), (13.35, 0), (32.9, 0)]
filtered = envelope(filter_points)
music = music * (1 - filtered[:, None]) + muted_music * filtered[:, None]
chat_clear = envelope([(0, 0), (17.2, 0), (17.6, 1), (22.2, 1), (22.8, 0), (32.9, 0)])
music = music * (1 - chat_clear[:, None]) + clear_music * chat_clear[:, None]
music *= (10 ** (envelope(gain_points) / 20))[:, None]
music[:int(.03 * SR)] *= np.linspace(0, 1, int(.03 * SR))[:, None]

# Make room for the actual animation contacts, not for unrelated music beats.
duck = np.ones(N)
for anchor in [2.63, 3.82, 5.65, 6.84, 8.61, 9.8, 14.27]:
    duck *= 1 - .2 * np.exp(-((time - anchor) / .10) ** 2)
for anchor in [2.16, 5.03, 8.08]:
    duck *= 1 - .38 * np.exp(-((time - anchor - .07) / .16) ** 2)
for anchor in [6.88, 26.95, 29.31]:
    duck *= 1 - .24 * np.exp(-((time - anchor) / .15) ** 2)
for anchor in [17.65, 18.86, 20.8]:
    duck *= 1 - .42 * np.exp(-((time - anchor - .025) / .19) ** 2)
music *= duck[:, None]
mix = music + sfx
mix *= envelope([(0, 1), (31.96, 1), (32.61, 0), (32.9, 0)])[:, None]
premaster = WORK / 'mix-v08.wav'
write_wav(premaster, mix)
mastered = WORK / 'master-v08.wav'
master(premaster, mastered)
output = OUT / 'grifon-your-next-ad-v08-1080p.mp4'
run(['-v', 'error', '-i', PICTURE, '-i', mastered, '-map', '0:v:0', '-map', '1:a:0',
     '-t', DURATION, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', SR,
     '-movflags', '+faststart', output])
loudness = measure(output)
metadata = json.loads(subprocess.check_output([str(PROBE), '-v', 'error',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,duration,nb_frames,sample_rate,channels',
    '-of', 'json', str(output)]))
run(['-v', 'error', '-i', output, '-f', 'null', '-'])
if abs(float(loudness['input_i']) + 16) > .5 or float(loudness['input_tp']) > -1:
    raise ValueError(f'Audio gate failed: {loudness}')
if abs(float(metadata['format']['duration']) - DURATION) > .03:
    raise ValueError('Incorrect export length')
hashes = []
for file in [PICTURE, output]:
    hashes.append(run(['-v', 'error', '-i', file, '-map', '0:v', '-c', 'copy',
                      '-f', 'hash', '-hash', 'sha256', '-']).stdout.decode().strip())
if hashes[0] != hashes[1]:
    raise ValueError('Approved picture was changed')
approved_index = '1cb32367d0aeff59cc4d6aacefa9fbabda12a070a669cb1be833414d244a2bd2'
index_hash = hashlib.sha256((ROOT / 'index.html').read_bytes()).hexdigest()
if index_hash != approved_index:
    raise ValueError('Approved editable composition was changed')
encoded = decode(output)
if np.max(np.abs(encoded[int(32.7 * SR):])) > .0001:
    raise ValueError('Final black tail is not silent')
regions = {}
for label, begin, end in [('opening', 0, 10), ('problem', 10.5, 12.5),
                          ('reveal', 13.4, 17), ('conversation', 17.65, 22.2),
                          ('closing', 22.8, 29.28)]:
    segment = encoded[int(begin * SR):int(end * SR)]
    regions[label] = round(float(20 * np.log10(np.sqrt(np.mean(segment ** 2)) + 1e-12)), 2)
report = {'file': output.name, 'duration': DURATION, 'music': 'Digital Clouds',
    'composer': 'Alejandro Magana (A. M.)', 'source_section': [8, 40.9],
    'selection': 'Assistant selected B after Neil delegated creative choice',
    'bytes': output.stat().st_size, 'loudness': loudness, 'metadata': metadata,
    'video_stream_hash': hashes[1], 'index_sha256': index_hash,
    'cue_count': len(cues), 'region_rms_dbfs': regions,
    'music_gain_envelope_db': gain_points, 'music_lowpass_blend': filter_points,
    'checks': {'full_decode': True, 'picture_unchanged': True,
               'editable_source_unchanged': True, 'silent_black_tail': True},
    'listening': 'Technical metrics are not a taste or reference-fidelity verdict'}
(QA / 'export-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps({'file': output.name, 'bytes': output.stat().st_size,
    'lufs': loudness['input_i'], 'true_peak': loudness['input_tp'],
    'cues': len(cues), 'region_rms_dbfs': regions}), flush=True)
