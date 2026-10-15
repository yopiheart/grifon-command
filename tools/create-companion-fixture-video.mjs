// Rebuild the generic, silent playback fixture. No user inputs or provider calls.
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const output = 'api/_lib/assets/fixtures/companion-video-v1.mp4';
mkdirSync('api/_lib/assets/fixtures', { recursive: true });
const font = 'fontfile=api/_lib/assets/fonts/Inter-Black.ttf';
const filters = [
  'drawbox=x=24:y=120:w=312:h=400:color=0x18181B:t=fill',
  `drawtext=${font}:text=GRIFON:fontcolor=0xFFCC00:fontsize=28:x=(w-tw)/2:y=156`,
  `drawtext=${font}:text='Fixture sample':fontcolor=white:fontsize=29:x=(w-tw)/2:y=228`,
  `drawtext=${font}:text='Video playback check':fontcolor=0xD4D4D8:fontsize=17:x=(w-tw)/2:y=282`,
  'drawbox=x=42:y=370:w=276:h=3:color=0x82828B:t=fill',
  `drawtext=${font}:text='>':fontcolor=0xFFCC00:fontsize=38:x=42+250*t/8:y=320`,
  `drawtext=${font}:text='No generated ad':fontcolor=0xD4D4D8:fontsize=18:x=(w-tw)/2:y=448`,
  `drawtext=${font}:text='Silent fixture - no voice or music':fontcolor=0xA1A1AA:fontsize=12:x=(w-tw)/2:y=480`,
];
const result = spawnSync(ffmpeg, [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'color=c=0x09090B:s=360x640:r=24:d=8',
  '-vf', filters.join(','), '-an', '-c:v', 'libx264', '-preset', 'medium',
  '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', output,
], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
