// Honest render-complete pull-back (engagement Phase 1).
//
// Video renders were fire-and-forget: the sonner toasts in GenerateVideo only
// fire on a *focused* tab, so a user who submits a render and switches away gets
// nothing pulling them back — the single biggest retention hole in the app. This
// wraps the Web Notification API so a backgrounded tab still gets a system
// notification when the render finishes.
//
// Honest-by-design guardrails (high-trust tone, no dark patterns):
//   - Permission is requested ONLY at a contextual moment (first render submit),
//     never on cold start. ensureNotificationPermission() is the single entry
//     point and never re-prompts a user who already chose 'denied'.
//   - notify() is a no-op while the tab is visible — the existing sonner toast
//     already covers a watching user, so we never double-notify or nag.
//   - Everything is best-effort and SSR/permission-safe; failures are swallowed.

const isSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

/** Current permission state without prompting. */
export const notificationPermission = (): NotificationPermission =>
  isSupported() ? Notification.permission : 'denied';

/**
 * Ask for notification permission once, at a contextual moment (first render
 * submit). Safe to call repeatedly: the browser only surfaces the prompt while
 * state is 'default', and we never re-prompt a user who chose 'granted' or
 * 'denied'. Resolves to the final permission state.
 */
export const ensureNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isSupported()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    // Legacy Safari only supports the callback signature; fall back, then give up.
    try {
      return await new Promise<NotificationPermission>((resolve) =>
        Notification.requestPermission((p) => resolve(p))
      );
    } catch {
      return Notification.permission;
    }
  }
};

export interface NotifyOptions {
  title: string;
  body?: string;
  /** Dedupe tag so a re-fire replaces rather than stacks (e.g. one per render). */
  tag?: string;
  /** Fire even when the tab is focused. Default false — foreground uses toasts. */
  whenFocused?: boolean;
  /** Invoked when the user clicks the notification (window is focused first). */
  onClick?: () => void;
}

/**
 * Fire a system notification for a backgrounded tab. No-op when the tab is
 * visible (unless whenFocused), when unsupported, or when permission isn't
 * granted. Best-effort — never throws into the caller's render flow.
 */
export const notify = (opts: NotifyOptions): void => {
  if (!isSupported() || Notification.permission !== 'granted') return;
  // Foreground stays toast-only so we never double-notify a watching user.
  if (
    !opts.whenFocused &&
    typeof document !== 'undefined' &&
    document.visibilityState === 'visible'
  ) {
    return;
  }
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.tag,
      icon: '/logo-badge.png',
    });
    n.onclick = () => {
      try {
        window.focus();
      } catch {
        /* focus can throw in some embedded contexts — ignore */
      }
      opts.onClick?.();
      n.close();
    };
  } catch (err) {
    console.warn('[notification-service] notify failed (non-fatal):', err);
  }
};
