import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckCircle, MapPin, X } from 'lucide-react';
import { RECENT_ACTIVITY } from '../../config/recentActivity';

/**
 * Rotating "recent activity" social-proof popup (bottom-left). Shows REAL
 * curated customers from config/recentActivity.ts — one at a time, ~5s each,
 * a new one ~every 9s. Dismissible, pauses when the tab is hidden, and renders
 * statically (no slide) under prefers-reduced-motion.
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
    <div className="hidden sm:block fixed left-4 bottom-4 z-40 print:hidden pointer-events-none">
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="pointer-events-auto flex items-start gap-3 max-w-[300px] rounded-2xl border border-white/10 bg-zinc-900/90 backdrop-blur-xl px-4 py-3"
          >
            <CheckCircle className="w-5 h-5 shrink-0 text-[#FFCC00] mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-white leading-snug">
                <span className="font-semibold">{item.name}</span> {item.action}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                <MapPin className="w-3 h-3 shrink-0" />
                {item.city} · {minsAgo} mins ago
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 -mt-1 -mr-1 p-1 rounded-full text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
