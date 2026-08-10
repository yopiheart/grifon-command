import {
  normalizeInviteCode,
  WAITLIST_CONSENT_TEXT,
} from '../config/launchGate';

// ===========================================================================
// LAUNCH GATE — browser half of the pre-launch curtain.
//
// Owns three things: the build-time flag, the redeemed-pass record in
// localStorage, and the two calls to /api/gate. The screen itself is
// components/LaunchLock.tsx; the shared constants are config/launchGate.ts.
//
// ⚠ VITE_LAUNCH_LOCK is BUILD-TIME — Vite inlines it into the bundle. Flipping
// it in the Vercel dashboard does NOTHING until you redeploy. Same trap as
// VITE_IMAGE_GATE_ENABLED (see CLAUDE.md); it is called out here so the next
// person doesn't lose an hour to it.
//
// The pass is client-persisted, so this is a curtain and not an auth boundary.
// Codes are matched SERVER-side (api/gate.ts) against LAUNCH_INVITE_CODES, so
// they never ship in the bundle — that part is real. What the visitor keeps is
// only the memory of having been let in.
// ===========================================================================

// Repo convention (services/supabaseClient.ts, services/metaPixel.ts) —
// `import.meta.env` is not globally typed, so cast through `any`.
export const LAUNCH_LOCK_ENABLED =
  ((import.meta as any).env?.VITE_LAUNCH_LOCK as string | undefined) === 'true';

export { WAITLIST_CONSENT_TEXT };

const PASS_KEY = 'grifon_launch_pass_v1';
const INVITE_PARAM = 'invite';
/** Pretty invite links: grifon.ai/i/FOUNDER-01 (vercel.json rewrites it to index.html). */
const INVITE_PATH_RE = /^\/i\/([A-Za-z0-9-]{1,64})\/?$/;

/** Six months — long enough that a founding member never re-enters their code. */
const PASS_TTL_MS = 1000 * 60 * 60 * 24 * 180;

export interface LaunchPass {
  code: string;
  /** epoch ms — when the code was redeemed */
  at: number;
}

/** localStorage throws in private mode / blocked-cookie contexts. Never let that crash the gate. */
const safeStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    s.getItem(PASS_KEY);
    return s;
  } catch {
    return null;
  }
};

export const readPass = (): LaunchPass | null => {
  const store = safeStorage();
  if (!store) return null;
  try {
    const raw = store.getItem(PASS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LaunchPass>;
    if (typeof parsed?.code !== 'string' || typeof parsed?.at !== 'number') return null;
    // A clock that moved backwards (or a forged future timestamp) must not mint
    // an immortal pass — anything outside the window is discarded.
    const age = Date.now() - parsed.at;
    if (age < 0 || age > PASS_TTL_MS) return null;
    return { code: parsed.code, at: parsed.at };
  } catch {
    return null;
  }
};

export const savePass = (code: string): void => {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(PASS_KEY, JSON.stringify({ code, at: Date.now() } satisfies LaunchPass));
  } catch {
    /* quota / private mode — the visitor just re-enters the code next visit */
  }
};

export const clearPass = (): void => {
  try {
    safeStorage()?.removeItem(PASS_KEY);
  } catch {
    /* no-op */
  }
};

export const hasValidPass = (): boolean => readPass() !== null;

/**
 * Pull an invite code off the URL — `?invite=CODE` or `/i/CODE` — and scrub it
 * from the address bar so the code doesn't survive in history, a screenshot, or
 * a shared link. Same replaceState pattern as the `?admin=` handler in App.tsx.
 * Returns the code for the caller to redeem, or null when there isn't one.
 */
export const takeInviteFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get(INVITE_PARAM);
  const fromPath = window.location.pathname.match(INVITE_PATH_RE)?.[1] ?? null;
  const raw = fromQuery ?? fromPath;
  if (!raw) return null;

  const code = normalizeInviteCode(raw);
  if (!code) return null;

  try {
    params.delete(INVITE_PARAM);
    const query = params.toString();
    // A pretty /i/CODE link has no page of its own — its destination is the
    // door, so the address bar settles on /login and matches what's rendered
    // (App.tsx routes /i/* there). A ?invite= on a real page stays on it.
    const path = fromPath ? '/login' : window.location.pathname;
    window.history.replaceState({}, '', path + (query ? `?${query}` : '') + window.location.hash);
  } catch {
    /* replaceState is unavailable in a few embedded webviews — cosmetic only */
  }
  return code;
};

type GateError = 'invalid_code' | 'rate_limited' | 'gate_not_configured' | 'network' | 'unknown';

export type RedeemResult =
  | { ok: true; code: string }
  | { ok: false; error: GateError };

export type WaitlistResult =
  | { ok: true; position: number | null }
  | { ok: false; error: 'rate_limited' | 'waitlist_unavailable' | 'invalid_email' | 'network' | 'unknown' };

const postGate = async (body: unknown): Promise<{ status: number; json: Record<string, unknown> }> => {
  const res = await fetch('/api/gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    /* non-JSON error page (proxy timeout, 502 HTML) — status still tells the story */
  }
  return { status: res.status, json };
};

/** Redeem an invite code. On success the pass is persisted before returning. */
export const redeemInvite = async (rawCode: string): Promise<RedeemResult> => {
  const code = normalizeInviteCode(rawCode);
  if (!code) return { ok: false, error: 'invalid_code' };

  try {
    const { status, json } = await postGate({ action: 'redeem', code });
    if (status === 200 && json.ok === true) {
      savePass(code);
      return { ok: true, code };
    }
    if (status === 403) return { ok: false, error: 'invalid_code' };
    if (status === 429) return { ok: false, error: 'rate_limited' };
    if (status === 503) return { ok: false, error: 'gate_not_configured' };
    return { ok: false, error: 'unknown' };
  } catch {
    return { ok: false, error: 'network' };
  }
};

/** Capture UTM params so a waitlist lead carries the campaign that produced it. */
const utmFromLocation = (): Record<string, string> | undefined => {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = params.get(key);
    if (value) utm[key.replace('utm_', '')] = value.slice(0, 200);
  }
  return Object.keys(utm).length ? utm : undefined;
};

/** Join the launch waitlist. Returns the visitor's position in line when known. */
export const requestInvite = async (rawEmail: string, name?: string): Promise<WaitlistResult> => {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'invalid_email' };

  try {
    const { status, json } = await postGate({
      action: 'request',
      email,
      name: name?.trim() || undefined,
      utm: utmFromLocation(),
      referrer: typeof document !== 'undefined' ? document.referrer.slice(0, 500) || undefined : undefined,
      page_url: typeof window !== 'undefined' ? window.location.href.slice(0, 500) : undefined,
    });
    if (status === 200 && json.ok === true) {
      const position = typeof json.position === 'number' ? json.position : null;
      return { ok: true, position };
    }
    if (status === 400) return { ok: false, error: 'invalid_email' };
    if (status === 429) return { ok: false, error: 'rate_limited' };
    if (status === 502 || status === 503) return { ok: false, error: 'waitlist_unavailable' };
    return { ok: false, error: 'unknown' };
  } catch {
    return { ok: false, error: 'network' };
  }
};
