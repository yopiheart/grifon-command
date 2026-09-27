"""Build two 10s licensed-stock sound auditions; never change the approved picture.

Sources and intermediate stems stay local under assets/audio-v07/{sources,work}.
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
WORK = ROOT / 'assets/audio-v07/work'
QA = ROOT / 'qa/sound-v07'
OUT = ROOT / 'exports'
SR, DURATION = 48000, 10.0
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
    fade_in = min(int(.002 * SR), len(clip) // 3)
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

write_wav(WORK / 'sfx-premaster.wav', sfx)
(QA / 'cue-sheet.json').write_text(json.dumps({'duration': DURATION, 'cues': cues,
    'sample_preparation': sample_info}, indent=2), encoding='utf-8')

# Selected candidates are configured after the listening shortlist.
choices = [('A', 'close-up', 'Close Up', 'Michael Ramir C.'),
           ('B', 'digital-clouds', 'Digital Clouds', 'Alejandro Magana (A. M.)')]
results = []
for label, slug, title, composer in choices:
    music_file = WORK / f'music-{label}.wav'
    run(['-v', 'error', '-ss', '8', '-i', SRC / f'{slug}.mp3', '-t', DURATION,
         '-af', 'afade=t=in:d=0.03,afade=t=out:st=9.45:d=0.55,loudnorm=I=-20:TP=-3:LRA=9',
         '-ar', SR, '-ac', 2, music_file])
    music = decode(music_file)[:N]
    if len(music) != N:
        raise ValueError('Incorrect music length')
    t = np.arange(N) / SR
    duck = np.ones(N)
    for anchor in [2.63, 3.82, 5.65, 6.84, 8.61, 9.8]:
        duck *= 1 - .2 * np.exp(-((t - anchor) / .10) ** 2)
    # Listening review flagged music masking the swipes, especially B's drums.
    for anchor in [2.16, 5.03, 8.08]:
        duck *= 1 - (.38 if label == 'B' else .24) * np.exp(-((t - anchor - .07) / .16) ** 2)
    if label == 'B':
        duck *= 1 - .24 * np.exp(-((t - 6.88) / .15) ** 2)
    mix = music * duck[:, None] + sfx
    # A short exit fade avoids slicing off a sample at the preview boundary.
    mix[-int(.08 * SR):] *= np.linspace(1, 0, int(.08 * SR))[:, None]
    premaster = WORK / f'mix-{label}.wav'
    write_wav(premaster, mix)
    mastered = WORK / f'master-{label}.wav'
    master(premaster, mastered)
    output = OUT / f'grifon-sound-option-{label.lower()}-10s.mp4'
    run(['-v', 'error', '-i', PICTURE, '-i', mastered, '-map', '0:v:0', '-map', '1:a:0',
         '-t', DURATION, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', SR,
         '-movflags', '+faststart', output])
    loudness = measure(output)
    metadata = json.loads(subprocess.check_output([str(PROBE), '-v', 'error',
        '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,duration,nb_frames,sample_rate,channels',
        '-of', 'json', str(output)]))
    run(['-v', 'error', '-i', output, '-f', 'null', '-'])
    if abs(float(loudness['input_i']) + 16) > .5 or float(loudness['input_tp']) > -1:
        raise ValueError(f'Audio gate failed: {label}, {loudness}')
    if abs(float(metadata['format']['duration']) - DURATION) > .03:
        raise ValueError('Incorrect export length')
    digest = run(['-v', 'error', '-i', output, '-map', '0:v', '-c', 'copy',
                  '-f', 'hash', '-hash', 'sha256', '-']).stdout.decode().strip()
    results.append({'option': label, 'music': title, 'composer': composer,
                    'source_section': [8, 18], 'file': output.name,
                    'bytes': output.stat().st_size, 'loudness': loudness,
                    'metadata': metadata, 'video_stream_hash': digest})
    print(f'{label}: {title}, {loudness["input_i"]} LUFS, {loudness["input_tp"]} dBTP', flush=True)

if results[0]['video_stream_hash'] != results[1]['video_stream_hash']:
    raise ValueError('A/B pictures differ')
picture_hash = run(['-v', 'error', '-i', PICTURE, '-t', DURATION, '-map', '0:v',
                    '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.decode().strip()
if results[0]['video_stream_hash'] != picture_hash:
    raise ValueError('Audition picture differs from the approved first 10 seconds')
if abs(float(results[0]['loudness']['input_i']) - float(results[1]['loudness']['input_i'])) > .3:
    raise ValueError('A/B loudness is not matched closely enough')
(QA / 'export-report.json').write_text(json.dumps({'duration': DURATION, 'sample_rate': SR,
    'results': results, 'approval': 'Pending Neil listening',
    'scope': '10-second listening experiments; not a completed soundtrack'}, indent=2), encoding='utf-8')

# One phone-friendly A-then-B video. Labels are separate silent cards, so both
# audition clips remain unmodified and the user can compare the same picture.
card_paths = []
for label, slug, title, composer in choices:
    card = WORK / f'card-{label}.mp4'
    text_file = WORK / f'title-{label}.txt'
    text_file.write_text(title.upper(), encoding='utf-8')
    font = 'assets/inter.ttf'
    title_path = f'assets/audio-v07/work/title-{label}.txt'
    filters = (f"drawtext=fontfile={font}:text='OPTION {label}':fontsize=92:"
               "fontcolor=0xffd700:x=(w-tw)/2:y=375,"
               f"drawtext=fontfile={font}:textfile={title_path}:fontsize=42:"
               'fontcolor=white:x=(w-tw)/2:y=510')
    result = subprocess.run([str(FF), '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'color=c=0x0c0c0c:s=1920x1080:r=30:d=1.2',
        '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', '1.2',
        '-vf', filters, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
        '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k',
        str(card)], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors='replace'))
    card_paths.append(card)

reel = OUT / 'grifon-sound-ab-audition-v07.mp4'
run(['-v', 'error', '-i', card_paths[0], '-i', OUT / results[0]['file'],
     '-i', card_paths[1], '-i', OUT / results[1]['file'], '-filter_complex',
     '[0:v]setsar=1,setpts=PTS-STARTPTS[v0];[1:v]setsar=1,setpts=PTS-STARTPTS[v1];'
     '[2:v]setsar=1,setpts=PTS-STARTPTS[v2];[3:v]setsar=1,setpts=PTS-STARTPTS[v3];'
     '[0:a]atrim=end_sample=57600,asetpts=PTS-STARTPTS[a0];'
     '[1:a]atrim=end_sample=480000,asetpts=PTS-STARTPTS[a1];'
     '[2:a]atrim=end_sample=57600,asetpts=PTS-STARTPTS[a2];'
     '[3:a]atrim=end_sample=480000,asetpts=PTS-STARTPTS[a3];'
     '[v0][a0][v1][a1][v2][a2][v3][a3]concat=n=4:v=1:a=1[v][a]',
     '-map', '[v]', '-map', '[a]', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast',
     '-crf', '18', '-threads', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '256k',
     '-ar', SR, '-movflags', '+faststart', reel])
run(['-v', 'error', '-i', reel, '-f', 'null', '-'])
reel_metadata = json.loads(subprocess.check_output([str(PROBE), '-v', 'error',
    '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,duration,nb_frames,sample_rate,channels',
    '-of', 'json', str(reel)]))
reel_audio = measure(reel)
if abs(float(reel_metadata['format']['duration']) - 22.4) > .03:
    raise ValueError('A/B reel timing drift')
if float(reel_audio['input_tp']) > -1:
    raise ValueError('A/B reel AAC peak exceeds headroom')
(QA / 'reel-report.json').write_text(json.dumps({'metadata': reel_metadata,
    'loudness': reel_audio, 'chapters': {'A': [1.2, 11.2], 'B': [12.4, 22.4]}}, indent=2), encoding='utf-8')
print(f'A/B reel: {reel.name}, {reel.stat().st_size} bytes', flush=True)
