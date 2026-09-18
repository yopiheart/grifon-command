// Local review only. Original media and the 40-second film are never overwritten.
// node assets/hero-film/genjutsu-sample/build-review.mjs --runtime-root <existing npm root>
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const dir = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(dir, '../../..');
const arg = process.argv.indexOf('--runtime-root');
const req = createRequire(join(arg < 0 ? root : resolve(process.argv[arg + 1]), 'package.json'));
const ffmpeg = req('ffmpeg-static');
const spec = JSON.parse(readFileSync(join(dir, 'test-spec.json'), 'utf8'));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
for (const input of spec.inputs) {
  if (sha(join(root, input.path)) !== input.sha256) throw Error(`Input changed: ${input.path}`);
}
const source = join(root, spec.inputs[0].path);
const output = join(dir, 'genjutsu-original.mp4');
const run = args => execFileSync(ffmpeg, ['-hide_banner', '-y', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const checks = [];
for (const path of [source, output]) {
  const progress = run(['-v', 'error', '-i', path, '-progress', 'pipe:1', '-f', 'null', '-']);
  const frames = [...progress.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1];
  const lastTimestamp = [...progress.matchAll(/^out_time=(.+)/gm)].at(-1)?.[1];
  checks.push({ path: path.replace(root, '').replaceAll('\\', '/'), sha256: sha(path), decodeExit: 0, decodedFrames: Number(frames), lastTimestamp });
}
// Two complete frames in matching boxes; no crop, repairs, retiming or upscaling claim.
const box = 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,setpts=PTS-STARTPTS,fps=24';
run(['-v', 'error', '-i', source, '-i', output, '-filter_complex', `[0:v]${box}[a];[1:v]${box}[b];[a][b]hstack=shortest=1[v]`, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(dir, 'before-after.mp4')]);
run(['-v', 'error', '-i', join(dir, 'before-after.mp4'), '-vf', 'fps=1,scale=960:270,tile=1x6', '-frames:v', '1', join(dir, 'comparison-sheet.jpg')]);
for (const t of [0, 1, 2, 3, 4, 5]) {
  run(['-v', 'error', '-ss', String(t), '-i', output, '-frames:v', '1', join(dir, `output-${t}s.png`)]);
}
run(['-v', 'error', '-i', output, '-vf', 'reverse', '-frames:v', '1', join(dir, 'output-last.png')]);
run(['-v', 'error', '-i', join(dir, 'before-after.mp4'), '-f', 'null', '-']);
writeFileSync(join(dir, 'media-checks.json'), JSON.stringify({ checks, comparison: 'left=original Blender, right=Genjutsu; muted; comparison ends with shortest input; output originals preserved', comparisonDecodeExit: 0, visualQuality: 'Requires human/agent inspection; not certified by this script' }, null, 2) + '\n');
console.log('Input hashes, source/output decode and comparison decode pass. Review media saved.');
