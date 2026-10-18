import type { SpawnSyncReturns } from 'node:child_process';

type FfmpegRunner = (args: string[]) => Pick<SpawnSyncReturns<Buffer>, 'status' | 'signal' | 'error' | 'stderr'>;

/** Are two PNG frames pixel-identical? psnr "inf" implies identical. */
export function framesIdentical(a: string, b: string, ff: FfmpegRunner): boolean {
  const result = ff(['-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  if (result.error || result.signal || result.status !== 0) {
    throw new Error(`Frame comparison failed: ${result.error?.message ?? result.signal ?? `exit ${result.status}`}`);
  }
  const err = (result.stderr ?? Buffer.alloc(0)).toString('utf8');
  const average = /(?:^|\s)average:([^\s]+)/.exec(err)?.[1];
  if (average === 'inf') return true;
  if (!average || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(average) || !Number.isFinite(Number(average))) {
    throw new Error('Frame comparison produced no valid PSNR average');
  }
  return false;
}
