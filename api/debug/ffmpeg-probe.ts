import type { VercelRequest, VercelResponse } from '@vercel/node';
import { spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

// TEMPORARY diagnostic (finding #24, 2026-07-16): report the deployed ffmpeg-static
// binary's version banner + whether the filters our render graphs use actually exist
// in THIS deployment's binary. Read-only, token-guarded, no inputs touched.
// DELETE THIS FILE once #24 is closed — it must not ride the merge train.
const PROBE_TOKEN = 'grifon-24-probe-x7k2m9';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.t !== PROBE_TOKEN) return res.status(404).json({ error: 'not_found' });
  if (!ffmpegPath) return res.status(500).json({ error: 'ffmpeg_static_null' });

  const run = (args: string[]) => {
    const r = spawnSync(ffmpegPath as string, ['-hide_banner', ...args], {
      maxBuffer: 1 << 24,
      timeout: 10000,
    });
    return {
      status: r.status,
      err: r.error?.message ?? null,
      out: (r.stdout ?? Buffer.alloc(0)).toString('utf8'),
      stderr: (r.stderr ?? Buffer.alloc(0)).toString('utf8'),
    };
  };

  const version = run(['-version']);
  const filters = run(['-filters']);
  const wanted = ['drawtext', 'gblur', 'boxblur', 'zoompan', 'amix', 'adelay', 'anull', 'fade', 'eq', 'volume', 'crop', 'scale', 'setsar', 'fps', 'psnr', 'silencedetect', 'drawbox'];
  const have: Record<string, boolean> = {};
  for (const f of wanted) have[f] = new RegExp(`\\s${f}\\s`).test(filters.out);

  return res.status(200).json({
    ffmpegPath,
    versionBanner: version.out.split('\n').slice(0, 3),
    versionStatus: version.status,
    versionErr: version.err,
    filtersStatus: filters.status,
    filtersErr: filters.err,
    filtersStderrHead: filters.stderr.slice(0, 300),
    have,
  });
}
