// Native-video comparison; no browser connector or denied preview access.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/ffmpeg-static/ffmpeg.exe')));
if (!deps) throw new Error('Existing local FFmpeg missing; no automatic install.');
const ffmpeg = path.join(deps, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = path.join(deps, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
if (!existsSync(ffprobe)) throw new Error('Existing local FFprobe missing; no automatic install.');
const spec = JSON.parse(readFileSync(path.join(here, 'demo.json'), 'utf8'));
const before = path.join(root, spec.baseline);
const after = path.join(here, 'grifon-full-upgrade-1080p.mp4');
const out = path.join(here, 'grifon-full-before-after-1080p.mp4');
const scratch = path.join(root, '.tmp/grifon-motion-upgrade');
mkdirSync(scratch, { recursive: true });
for (const file of [before, after]) if (!existsSync(file)) throw new Error('Both actual film exports are required.');
const font = 'workflows/assets/grifon-motion-upgrade/assets/inter-900.ttf';
const title = (text, x, y, size, color) => `drawtext=fontfile=${font}:text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
const finish = [
  '[b][a]hstack=inputs=2,pad=1920:1080:16:276:color=0x09090B',
  title('GRIFON / FULL FILM COMPARISON', 50, 72, 32, '0xFFCC00'),
  title('BEFORE / APPROVED V08', 50, 195, 35, 'white'),
  title('AFTER / FULL UPGRADE', 994, 195, 35, '0xFFCC00'),
  title('SAME STORY. SAME APPROVED SOUNDTRACK.', 50, 875, 30, '0xD4D4D8'),
  title('32.9 SECONDS / 1080P / 30 FPS', 50, 954, 24, '0x9A9AA3'),
].join(',');
const filter = `[0:v]scale=944:531,setsar=1[b];[1:v]scale=944:531,setsar=1[a];${finish}[v]`;
const result = spawnSync(ffmpeg, ['-hide_banner', '-y', '-i', before, '-i', after, '-filter_complex', filter, '-map', '[v]', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'copy', '-t', '32.9', '-movflags', '+faststart', out], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
writeFileSync(path.join(scratch, 'comparison.log'), (result.stdout || '') + (result.stderr || ''));
if (result.error || result.status !== 0) throw new Error(`Comparison failed: ${result.error || result.stderr?.slice(-2500)}`);
const probe = spawnSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', out], { cwd: root, encoding: 'utf8', windowsHide: true });
if (probe.error || probe.status !== 0) throw new Error('Comparison FFprobe failed.');
const media = JSON.parse(probe.stdout), video = media.streams.find(s => s.codec_type === 'video'), audio = media.streams.find(s => s.codec_type === 'audio');
if (video?.width !== 1920 || video?.height !== 1080 || video?.r_frame_rate !== '30/1' || Number(video?.nb_read_frames) !== 987 || video?.pix_fmt !== 'yuv420p' || audio?.codec_name !== 'aac' || Number(audio?.channels) !== 2 || Math.abs(Number(media.format.duration) - 32.9) > .04) throw new Error('Comparison media dimensions, frames, duration or audio fail.');
const payload = spawnSync(ffmpeg, ['-v', 'error', '-i', out, '-map', '0:a:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (payload.status !== 0 || payload.stdout.trim() !== `SHA256=${spec.acceptedAudioPayloadSha256}`) throw new Error('Comparison did not preserve accepted AAC.');
const decode = spawnSync(ffmpeg, ['-v', 'error', '-xerror', '-i', out, '-f', 'null', '-'], { cwd: root, encoding: 'utf8', windowsHide: true });
if (decode.status !== 0) throw new Error(`Comparison decode failed: ${decode.stderr}`);
writeFileSync(path.join(here, 'qa/comparison.json'), JSON.stringify({ status: 'PASS', output: path.basename(out), bytes: readFileSync(out).length, sha256: createHash('sha256').update(readFileSync(out)).digest('hex'), width: video.width, height: video.height, fps: video.r_frame_rate, frames: Number(video.nb_read_frames), duration: Number(media.format.duration), audioPayloadSha256: spec.acceptedAudioPayloadSha256, audioPreserved: true, fullDecode: true, framing: 'Both exact exports scaled to 944x531, without cropping or time changes; labels belong to comparison only' }, null, 2) + '\n');
console.log('Built native 32.9s before/after MP4 with exact approved audio.');
