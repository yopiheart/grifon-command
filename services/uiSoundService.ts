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

// ===========================================================================
// Cinematic cue layer — premium .mp3 SFX, scoped to One-Shot Ad only.
//
// Separate from the global synth tick above on purpose: One-Shot wants a richer,
// "high-end" feel and is ON by default, while the global tick stays opt-in. The
// two preferences (grifon_ui_sound vs grifon_oneshot_sfx) never cross-wire.
//  - Real samples served from /public/sfx (Vite serves /sfx/*).
//  - Lazy-preloaded on first use; each cue is cloned per play so rapid taps stack.
//  - Best-effort: a blocked/failed play never throws on a click.
// ===========================================================================

const ONESHOT_KEY = 'grifon_oneshot_sfx';

/** Semantic cues → asset. Keep this small (4 clips) to avoid network/bundle bloat. */
export type SfxCue = 'tap' | 'open' | 'select' | 'confirm';
const CUE_SRC: Record<SfxCue, string> = {
  tap: '/sfx/pop.mp3',      // light press — secondary taps
  open: '/sfx/swish.mp3',   // a surface opens (settings sheet / format picker)
  select: '/sfx/snap.mp3',  // a choice locks in (format / voice)
  confirm: '/sfx/ding.mp3', // the money action (Make My Ad)
};
const CUE_GAIN: Record<SfxCue, number> = { tap: 0.35, open: 0.4, select: 0.45, confirm: 0.5 };

const readOneShotInitial = (): boolean => {
  try {
    // ON by default — only an explicit 'off' silences it.
    return window.localStorage.getItem(ONESHOT_KEY) !== 'off';
  } catch {
    return true;
  }
};

let oneShotEnabled = typeof window !== 'undefined' ? readOneShotInitial() : true;
const oneShotListeners = new Set<(value: boolean) => void>();

// Decoded sample buffers. Web Audio gives sample-accurate, near-zero-latency
// playback — HTMLAudioElement.play() lagged perceptibly behind the tap/swipe.
// Each clip is fetched + decoded ONCE; every cue then fires a throwaway
// BufferSource that starts instantly and in sync with the gesture.
const cueBuffers: Partial<Record<SfxCue, AudioBuffer>> = {};
const cueLoading: Partial<Record<SfxCue, Promise<void>>> = {};

export const isOneShotSfxEnabled = (): boolean => oneShotEnabled;

const loadCue = (cue: SfxCue): void => {
  if (cueBuffers[cue] || cueLoading[cue]) return;
  const ctx = ensureContext();
  if (!ctx || typeof fetch === 'undefined') return;
  cueLoading[cue] = fetch(CUE_SRC[cue])
    .then((r) => r.arrayBuffer())
    .then((ab) => ctx.decodeAudioData(ab))
    .then((buf) => { cueBuffers[cue] = buf; })
    .catch(() => { /* best-effort — a missing clip just stays silent */ });
};

/** Warm all cue buffers up-front so the FIRST tap is already in sync. Safe to
 * call before a gesture — decode works on a suspended context; the first cue
 * resumes it for playback. */
export const preloadCues = (): void => {
  (Object.keys(CUE_SRC) as SfxCue[]).forEach(loadCue);
};

/** Fire a cinematic cue — instant + sample-accurate. No-op when muted. Never throws. */
export const playCue = (cue: SfxCue): void => {
  if (!oneShotEnabled) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const buf = cueBuffers[cue];
  if (!buf) { loadCue(cue); return; } // not decoded yet — skip rather than fire late
  try {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.value = CUE_GAIN[cue];
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
  } catch {
    /* never throw on a click */
  }
};

export const setOneShotSfxEnabled = (value: boolean): void => {
  oneShotEnabled = value;
  try {
    window.localStorage.setItem(ONESHOT_KEY, value ? 'on' : 'off');
  } catch {
    /* ignore storage failures (private mode, etc.) */
  }
  oneShotListeners.forEach((listener) => listener(value));
  if (value) playCue('tap'); // confirmation cue the moment it's turned on
};

export const toggleOneShotSfx = (): void => setOneShotSfxEnabled(!oneShotEnabled);

/** React binding for the One-Shot mute control + cue firing. Warms the cue
 * buffers on mount so the first tap/swipe is already in sync. */
export const useOneShotSfx = (): { enabled: boolean; toggle: () => void; play: (cue: SfxCue) => void } => {
  const [value, setValue] = useState<boolean>(isOneShotSfxEnabled());
  useEffect(() => {
    oneShotListeners.add(setValue);
    preloadCues();
    return () => { oneShotListeners.delete(setValue); };
  }, []);
  return { enabled: value, toggle: toggleOneShotSfx, play: playCue };
};
