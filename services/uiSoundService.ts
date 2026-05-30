/**
 * uiSoundService — subtle, custom UI "tick" for premium tactile feedback.
 *
 * Design choices:
 *  - Off by default. Persisted to localStorage; users opt in via a toggle.
 *  - Pure Web Audio synthesis — no asset files to ship or fetch.
 *  - AudioContext is created lazily on the first gesture, which automatically
 *    satisfies the browser autoplay policy (the tick only ever fires on click).
 *  - Self-gating: callers can fire playTick() unconditionally; it no-ops when
 *    sound is disabled.
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'grifon_ui_sound';

const readInitial = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
};

let enabled = typeof window !== 'undefined' ? readInitial() : false;
let audioCtx: AudioContext | null = null;
const listeners = new Set<(value: boolean) => void>();

export const isSoundEnabled = (): boolean => enabled;

const ensureContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
};

/** Soft, short, slightly upward-pitched click. No-op when sound is disabled. */
export const playTick = (): void => {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.03);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    /* audio is best-effort; never throw on a click */
  }
};

export const setSoundEnabled = (value: boolean): void => {
  enabled = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off');
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
  listeners.forEach((listener) => listener(value));
  if (value) playTick(); // confirmation tick the moment it's turned on
};

export const toggleSound = (): void => setSoundEnabled(!enabled);

const subscribe = (listener: (value: boolean) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** React binding so any toggle stays in sync with the rest of the app. */
export const useUiSound = (): { enabled: boolean; toggle: () => void } => {
  const [value, setValue] = useState<boolean>(isSoundEnabled());
  useEffect(() => subscribe(setValue), []);
  return { enabled: value, toggle: toggleSound };
};
