// Client feedback for the Data-Driven Growth Loop (Phase 1). Mirrors
// analyticsService.ts: browser-safe, best-effort, never throws into the UI.
// POSTs an NPS score + optional free text to the service-role /api/feedback sink,
// and owns the "show at most once per session, then cool down" frequency gate.

import { getSupabase } from './supabaseClient';
import { getSessionId } from './analyticsService';

const STATE_KEY = 'grifon_feedback_v1';
const SESSION_KEY = 'grifon_feedback_session';

// After a submit OR dismiss, don't re-prompt for this long.
const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // ~30 days

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

type FeedbackState = { action: 'submitted' | 'dismissed'; ts: number };

const readState = (): FeedbackState | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.action === 'submitted' || parsed.action === 'dismissed') && typeof parsed.ts === 'number') {
      return parsed as FeedbackState;
    }
    return null;
  } catch {
    return null;
  }
};

const seenThisSession = (): boolean => {
  if (!isBrowser()) return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Whether the feedback prompt may show now: not already shown this session AND no
 * submit/dismiss within the cooldown window. Best-effort; defaults to "don't show"
 * if storage is unavailable, so we never nag in a degraded environment.
 */
export const shouldShowFeedback = (now: number = Date.now()): boolean => {
  if (!isBrowser()) return false;
  if (seenThisSession()) return false;
  const state = readState();
  if (state && now - state.ts < COOLDOWN_MS) return false;
  return true;
};

/**
 * Record that the prompt was acted on. Marks the session as seen (so it won't
 * re-show this session) and starts the cooldown.
 */
export const markFeedbackSeen = (action: 'submitted' | 'dismissed'): void => {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // ignore
  }
  try {
    const value: FeedbackState = { action, ts: Date.now() };
    window.localStorage.setItem(STATE_KEY, JSON.stringify(value));
  } catch {
    // Storage disabled — gate is best-effort.
  }
};

const getAccessToken = async (): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

export type FeedbackPayload = {
  npsScore: number;
  freeText?: string;
  module?: string;
  context?: Record<string, unknown>;
};

/**
 * Submit feedback to /api/feedback. Returns true on success so the widget can show
 * a thank-you; returns false (never throws) on any failure.
 */
export const submitFeedback = async (payload: FeedbackPayload): Promise<boolean> => {
  if (!isBrowser()) return false;
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        nps_score: payload.npsScore,
        session_id: getSessionId(),
        ...(payload.freeText ? { free_text: payload.freeText } : {}),
        ...(payload.module ? { module: payload.module } : {}),
        ...(payload.context ? { context: payload.context } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};
