import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadLiveTestEnv } from '../support/liveTestEnv.js';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));

const flagNames = ['RUN_REGRESSION', 'RUN_EDL_FULL_CAP', 'RUN_AB', 'RUN_IMAGE_GATE_SMOKE'] as const;

beforeEach(() => {
  vi.mocked(readFileSync).mockReset();
  vi.mocked(readFileSync).mockReturnValue('GEMINI_API_KEY=fixture-file-key\nRUN_REGRESSION=1');
});

describe('live test environment startup', () => {
  for (const flag of flagNames) {
    it.each([undefined, '', '0', 'false'])('keeps %s disabled without reading .env: ' + flag, (value) => {
      const env: NodeJS.ProcessEnv = value === undefined ? {} : { [flag]: value };
      const originalEnv = { ...env };

      expect(loadLiveTestEnv([flag], env)).toEqual({ [flag]: false });
      expect(readFileSync).not.toHaveBeenCalled();
      expect(env).toEqual(originalEnv);
    });

    it('only enables an explicit process flag of 1: ' + flag, () => {
      vi.mocked(readFileSync).mockReturnValue([
        'GEMINI_API_KEY=fixture-file-key',
        'RUN_REGRESSION=1',
        'RUN_EDL_FULL_CAP=1',
        'RUN_AB=1',
        'RUN_IMAGE_GATE_SMOKE=1',
        'RUN_OTHER_LIVE=1',
      ].join('\n'));
      const env: NodeJS.ProcessEnv = { [flag]: '1' };

      const flags = loadLiveTestEnv(flagNames, env);

      expect(flags[flag]).toBe(true);
      for (const other of flagNames.filter((name) => name !== flag)) {
        expect(flags[other]).toBe(false);
        expect(env[other]).toBeUndefined();
      }
      expect(env.RUN_OTHER_LIVE).toBeUndefined();
      expect(env.GEMINI_API_KEY).toBe('fixture-file-key');
      expect(readFileSync).toHaveBeenCalledExactlyOnceWith(resolve(process.cwd(), '.env'), 'utf8');
    });
  }

  it.each([
    [{ RUN_REGRESSION: '1', RUN_EDL_FULL_CAP: '0' }, { RUN_REGRESSION: true, RUN_EDL_FULL_CAP: false }],
    [{ RUN_REGRESSION: 'false', RUN_EDL_FULL_CAP: '1' }, { RUN_REGRESSION: false, RUN_EDL_FULL_CAP: true }],
  ])('keeps the EDL canary and full-cap flags independent: %j', (env, expected) => {
    vi.mocked(readFileSync).mockReturnValue('RUN_REGRESSION=1\nRUN_EDL_FULL_CAP=1');

    expect(loadLiveTestEnv(['RUN_REGRESSION', 'RUN_EDL_FULL_CAP'], env)).toEqual(expected);
  });

  it('preserves process credentials and parses local quoted values for an enabled suite', () => {
    vi.mocked(readFileSync).mockReturnValue([
      '# local fixture values only',
      'GEMINI_API_KEY=fixture-file-key',
      '  DOUBLE_QUOTED = "fixture with spaces=inside"  ',
      "SINGLE_QUOTED='fixture-single'",
      'UNQUOTED = fixture-plain',
      '',
      'ignored line without equals',
    ].join('\r\n'));
    const env = { RUN_AB: '1', GEMINI_API_KEY: 'fixture-process-key' };

    expect(loadLiveTestEnv(['RUN_AB'], env)).toEqual({ RUN_AB: true });
    expect(env).toEqual({
      RUN_AB: '1',
      GEMINI_API_KEY: 'fixture-process-key',
      DOUBLE_QUOTED: 'fixture with spaces=inside',
      SINGLE_QUOTED: 'fixture-single',
      UNQUOTED: 'fixture-plain',
    });
  });

  it('keeps an explicit flag enabled when the optional local file is unavailable', () => {
    vi.mocked(readFileSync).mockImplementation(() => { throw new Error('fixture file unavailable'); });
    const env = { RUN_AB: '1', GEMINI_API_KEY: 'fixture-process-key' };

    expect(loadLiveTestEnv(['RUN_AB'], env)).toEqual({ RUN_AB: true });
    expect(env).toEqual({ RUN_AB: '1', GEMINI_API_KEY: 'fixture-process-key' });
  });
});
