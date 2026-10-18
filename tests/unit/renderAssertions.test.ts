import { describe, expect, it, vi } from 'vitest';
import { framesIdentical } from '../support/renderAssertions.js';

const result = (stderr: string, status: number | null = 0) => ({
  status,
  signal: null,
  stderr: Buffer.from(stderr),
});

describe('framesIdentical', () => {
  it('identifies equal frames from a successful infinite PSNR', () => {
    const ff = vi.fn(() => result('[Parsed_psnr_0] PSNR y:inf u:inf v:inf average:inf min:inf max:inf'));
    expect(framesIdentical('on.png', 'off.png', ff)).toBe(true);
    expect(ff).toHaveBeenCalledExactlyOnceWith([
      '-i', 'on.png', '-i', 'off.png', '-lavfi', 'psnr', '-f', 'null', '-',
    ]);
  });

  it.each(['42.500000', '0.000000', '-1.25', '1.2e+2'])(
    'identifies different frames from finite PSNR %s', (average) => {
      expect(framesIdentical('on.png', 'off.png', () => result(`PSNR average:${average} min:0 max:43`))).toBe(false);
    }
  );

  it.each(['missing input', 'PSNR average:inf min:inf max:inf'])(
    'rejects a failed comparison even when stderr contains %s', (stderr) => {
      expect(() => framesIdentical('on.png', 'off.png', () => result(stderr, 1))).toThrow();
    }
  );

  it('rejects a command terminated by a signal', () => {
    expect(() => framesIdentical('on.png', 'off.png', () => ({
      ...result('PSNR average:inf', null), signal: 'SIGTERM',
    }))).toThrow();
  });

  it('rejects a command that could not spawn', () => {
    expect(() => framesIdentical('on.png', 'off.png', () => ({
      ...result('', null), error: new Error('ffmpeg unavailable'),
    }))).toThrow();
  });

  it('rejects absent stderr', () => {
    expect(() => framesIdentical('on.png', 'off.png', () => ({
      ...result(''), stderr: null,
    }))).toThrow();
  });

  it.each(['', 'render complete', 'average:', 'average:NaN', 'average:-inf',
    'average:Infinity', 'average:1.2.3', 'average:42junk', 'average:infjunk', 'average:1e999'])(
    'rejects missing or invalid PSNR evidence %j', (stderr) => {
      expect(() => framesIdentical('on.png', 'off.png', () => result(stderr))).toThrow();
    }
  );
});
