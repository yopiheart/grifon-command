import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckCircle, MapPin, X } from 'lucide-react';
import { RECENT_ACTIVITY } from '../../config/recentActivity';

const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/**
 * Rotating "recent activity" social-proof popup. Shows REAL curated customers
 * from config/recentActivity.ts — one at a time, ~5s each, a new one ~every 9s.
 *
 * Position: a slim banner at the TOP on mobile (so it never touches the Pay
 * button), bottom-left on desktop. Dismissible, pauses when the tab is hidden,
 * and renders without motion under prefers-reduced-motion.
 */
export const RecentActivityToast: React.FC = () => {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed || RECENT_ACTIVITY.length === 0) return;
    let hideTimer: number | undefined;

    const tick = () => {
      if (document.hidden) return;
      setVisible(true);
      hideTimer = window.setTimeout(() => {
        setVisible(false);
        setIdx((i) => (i + 1) % RECENT_ACTIVITY.length);
      }, 5000);
    };

    const first = window.setTimeout(tick, 3500);
    const interval = window.setInterval(tick, 9000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [dismissed]);

  if (dismissed || RECENT_ACTIVITY.length === 0) return null;

  const item = RECENT_ACTIVITY[idx];
  const minsAgo = 2 + (idx % 6); // varies the "x mins ago" so it reads live

  return (
    <div className="fixed z-40 print:hidden pointer-events-none top-4 left-4 right-4 sm:top-auto sm:bottom-4 sm:right-auto sm:left-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="pointer-events-auto flex items-center gap-3 w-full sm:max-w-[300px] mx-auto rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl px-4 py-3"
          >
            {/* Gold initials avatar with a verified check badge */}
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#FFCC00]/30 bg-gradient-to-br from-[#FFCC00]/25 to-[#FFCC00]/5 text-[11px] font-bold text-[#FFCC00]">
                {initialsOf(item.name)}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900">
                <CheckCircle className="h-3.5 w-3.5 text-[#FFCC00]" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm text-white leading-snug">
                <span className="font-semibold">{item.name}</span> {item.action}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                <MapPin className="h-3 w-3 shrink-0" />
                {item.city} · {minsAgo} mins ago
              </p>
            </div>

            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 -mr-1 p-1 rounded-full text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
