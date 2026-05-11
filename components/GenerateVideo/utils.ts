/**
 * "2 min ago" / "yesterday" / "3 days ago" style timestamps for library tiles.
 * Returns at minute granularity below 1 hour, hour granularity below 24h, day granularity below 30d,
 * and falls back to YYYY-MM-DD beyond that.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  if (ms < 0) return 'just now';

  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'just now';

  const min = Math.floor(sec / 60);
  if (min === 1) return '1 min ago';
  if (min < 60) return `${min} min ago`;

  const hr = Math.floor(min / 60);
  if (hr === 1) return '1 hr ago';
  if (hr < 24) return `${hr} hr ago`;

  const day = Math.floor(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 30) return `${day} days ago`;

  return then.toISOString().slice(0, 10);
}
