// Pre-launch curtain — the two halves that decide who gets through.
//
// The suite runs in the `node` environment (no jsdom), so each DOM-touching test
// installs a minimal global `window` carrying just the surface launchGate reads:
// location, history.replaceState, and localStorage.
//
// What these encode is the FEATURE'S INTENT, not its implementation:
//   · an unconfigured gate must never open,
//   · a pass must never become immortal,
//   · scrubbing the invite code must not take the visitor's attribution with it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  matchesInviteCode,
  normalizeInviteCode,
  parseInviteCodes,
} from '../../config/launchGate.js';

// --- fake browser ---------------------------------------------------------

interface FakeWindow {
  location: { pathname: string; search: string; hash: string };
  history: { replaceState: (state: unknown, title: string, url: string) => void };
  localStorage: Storage;
}

const makeStore = (seed: Record<string, string> = {}): Storage => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
};

/** Installs a fake window and returns it, plus the URL replaceState last wrote. */
const installWindow = (
  { pathname = '/', search = '', hash = '' } = {},
  storage: Storage = makeStore()
): { win: FakeWindow; urls: string[] } => {
  const urls: string[] = [];
  const win: FakeWindow = {
    location: { pathname, search, hash },
    history: {
      replaceState: (_s, _t, url) => {
        urls.push(url);
      },
    },
    localStorage: storage,
  };
  vi.stubGlobal('window', win);
  return { win, urls };
};

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// --- shared code helpers (browser + api/gate.ts both import these) ---------

describe('invite code matching', () => {
  it('normalizes to uppercase and drops everything outside A-Z 0-9 dash', () => {
    expect(normalizeInviteCode('  founder-01  ')).toBe('FOUNDER-01');
    expect(normalizeInviteCode('grifon_beta!')).toBe('GRIFONBETA');
  });

  it('parses commas, spaces and newlines into the same set', () => {
    const expected = ['FOUNDER-01', 'FOUNDER-02', 'NEIL'];
    expect(parseInviteCodes('FOUNDER-01,FOUNDER-02,NEIL')).toEqual(expected);
    expect(parseInviteCodes('FOUNDER-01 FOUNDER-02 NEIL')).toEqual(expected);
    expect(parseInviteCodes('FOUNDER-01\nFOUNDER-02\nNEIL')).toEqual(expected);
    // Pasting a spreadsheet column leaves trailing separators — they must not
    // become an empty code (see the "never opens" case below).
    expect(parseInviteCodes('FOUNDER-01, FOUNDER-02,\n NEIL,\n')).toEqual(expected);
  });

  it('dedupes codes that differ only in case or spacing', () => {
    expect(parseInviteCodes('founder-01, FOUNDER-01,  Founder-01 ')).toEqual(['FOUNDER-01']);
  });

  it('accepts a code the visitor typed in any case, with stray spaces', () => {
    const codes = parseInviteCodes('FOUNDER-01,NEIL');
    expect(matchesInviteCode('  founder-01 ', codes)).toBe(true);
    expect(matchesInviteCode('Neil', codes)).toBe(true);
  });

  it('never opens when no codes are configured', () => {
    // The load-bearing invariant: a curtain with no keys is a closed curtain,
    // not an open one. Empty input must not degrade into "everything matches".
    for (const raw of ['', '   ', ',,,', null, undefined]) {
      const codes = parseInviteCodes(raw);
      expect(codes).toEqual([]);
      expect(matchesInviteCode('FOUNDER-01', codes)).toBe(false);
      expect(matchesInviteCode('', codes)).toBe(false);
    }
  });

  it('rejects input that normalizes to nothing, even against a real list', () => {
    // '!!!' and '   ' both normalize to '' — the second guard (length > 0) is
    // what stops an empty string from ever matching an empty list entry.
    const codes = parseInviteCodes('FOUNDER-01');
    expect(matchesInviteCode('!!!', codes)).toBe(false);
    expect(matchesInviteCode('   ', codes)).toBe(false);
    expect(matchesInviteCode('FOUNDER-02', codes)).toBe(false);
  });
});

// --- redeemed pass --------------------------------------------------------

describe('launch pass', () => {
  const KEY = 'grifon_launch_pass_v1';
  const DAY_MS = 24 * 60 * 60 * 1000;

  it('round-trips a redeemed code', async () => {
    const store = makeStore();
    installWindow({}, store);
    const { savePass, readPass, hasValidPass } = await import('../../services/launchGate.js');
    savePass('FOUNDER-01');
    expect(readPass()?.code).toBe('FOUNDER-01');
    expect(hasValidPass()).toBe(true);
  });

  it('expires a pass older than 180 days', async () => {
    // 181 days chosen against the documented TTL, not read back from the module.
    const store = makeStore({
      [KEY]: JSON.stringify({ code: 'FOUNDER-01', at: Date.now() - 181 * DAY_MS }),
    });
    installWindow({}, store);
    const { hasValidPass } = await import('../../services/launchGate.js');
    expect(hasValidPass()).toBe(false);
  });

  it('still honours a pass inside the window', async () => {
    const store = makeStore({
      [KEY]: JSON.stringify({ code: 'FOUNDER-01', at: Date.now() - 179 * DAY_MS }),
    });
    installWindow({}, store);
    const { hasValidPass } = await import('../../services/launchGate.js');
    expect(hasValidPass()).toBe(true);
  });

  it('discards a future-dated pass instead of minting an immortal one', async () => {
    // A forged (or clock-skewed) `at` in the future would otherwise never age
    // out — negative age must fail closed, same as an expired one.
    const store = makeStore({
      [KEY]: JSON.stringify({ code: 'FOUNDER-01', at: Date.now() + 365 * DAY_MS }),
    });
    installWindow({}, store);
    const { hasValidPass } = await import('../../services/launchGate.js');
    expect(hasValidPass()).toBe(false);
  });

  it('treats corrupt or wrong-shaped storage as no pass, without throwing', async () => {
    for (const junk of ['not json', '{}', '[]', JSON.stringify({ code: 'X' }), 'null']) {
      vi.resetModules();
      installWindow({}, makeStore({ [KEY]: junk }));
      const { readPass } = await import('../../services/launchGate.js');
      expect(readPass()).toBeNull();
    }
  });

  it('survives storage being unavailable (private mode / blocked cookies)', async () => {
    const hostile = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    installWindow({}, hostile);
    const { readPass, savePass, clearPass } = await import('../../services/launchGate.js');
    expect(readPass()).toBeNull();
    expect(() => savePass('FOUNDER-01')).not.toThrow();
    expect(() => clearPass()).not.toThrow();
  });

  it('clearPass revokes an otherwise-valid pass', async () => {
    const store = makeStore();
    installWindow({}, store);
    const { savePass, clearPass, hasValidPass } = await import('../../services/launchGate.js');
    savePass('FOUNDER-01');
    clearPass();
    expect(hasValidPass()).toBe(false);
  });
});

// --- invite links ---------------------------------------------------------

describe('takeInviteFromUrl', () => {
  it('reads ?invite= and scrubs only that param from the address bar', async () => {
    const { urls } = installWindow({ pathname: '/', search: '?invite=founder-01' });
    const { takeInviteFromUrl } = await import('../../services/launchGate.js');
    expect(takeInviteFromUrl()).toBe('FOUNDER-01');
    expect(urls.at(-1)).toBe('/');
  });

  it('keeps the visitor’s attribution when it scrubs the code', async () => {
    // Losing utm_* here would silently break waitlist attribution — the code is
    // ours to remove, the campaign params are not.
    const { urls } = installWindow({
      pathname: '/',
      search: '?utm_source=fb&invite=FOUNDER-01&utm_campaign=founding',
    });
    const { takeInviteFromUrl } = await import('../../services/launchGate.js');
    expect(takeInviteFromUrl()).toBe('FOUNDER-01');
    const rewritten = urls.at(-1)!;
    expect(rewritten).toContain('utm_source=fb');
    expect(rewritten).toContain('utm_campaign=founding');
    expect(rewritten).not.toContain('invite');
  });

  it('reads the pretty /i/CODE link and settles the address bar on the door', async () => {
    // /i/CODE has no page of its own — App.tsx routes it to 'login', so the URL
    // must end up matching what is actually rendered.
    const { urls } = installWindow({ pathname: '/i/FOUNDER-01' });
    const { takeInviteFromUrl } = await import('../../services/launchGate.js');
    expect(takeInviteFromUrl()).toBe('FOUNDER-01');
    expect(urls.at(-1)).toBe('/login');
  });

  it('returns null and leaves the URL alone when there is no invite', async () => {
    const { urls } = installWindow({ pathname: '/pricing', search: '?utm_source=fb' });
    const { takeInviteFromUrl } = await import('../../services/launchGate.js');
    expect(takeInviteFromUrl()).toBeNull();
    expect(urls).toEqual([]);
  });

  it('ignores a path that only looks like an invite link', async () => {
    installWindow({ pathname: '/i/' });
    const { takeInviteFromUrl } = await import('../../services/launchGate.js');
    expect(takeInviteFromUrl()).toBeNull();
  });
});
