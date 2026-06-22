import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Film, Search, Image as ImageIcon, Layers, Activity, Zap, BellOff, ArrowRight, X } from 'lucide-react';
import type { ActiveJob, JobKind } from '../../services/activeJobsService';

const KIND_ICON: Record<JobKind, React.ComponentType<{ className?: string }>> = {
  video: Film,
  storyboard: Layers,
  research: Search,
  image: ImageIcon,
  generic: Activity,
};

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  jobs: ActiveJob[];
  /** True when the user is running low on their workflow quota. */
  quotaLow?: boolean;
  quotaRemaining?: number;
  onUpgrade?: () => void;
}

/**
 * Notifications popover — closes the async-render loop. Surfaces live render jobs
 * (from activeJobsService) and a real quota-low nudge. Bottom-left popover on
 * desktop (above the sidebar identity), bottom sheet on mobile.
 */
export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  open, onClose, jobs, quotaLow, quotaRemaining, onUpgrade,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const isEmpty = jobs.length === 0 && !quotaLow;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none"
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed z-[76] bg-zinc-900/95 backdrop-blur-xl ring-1 ring-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden
              left-3 right-3 bottom-3 rounded-3xl
              lg:left-24 lg:right-auto lg:bottom-6 lg:w-80 lg:rounded-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-sm font-bold text-white tracking-tight">Notifications</span>
              <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded-full bg-zinc-950 ring-1 ring-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-[60vh] lg:max-h-96 overflow-y-auto custom-scrollbar p-2">
              {isEmpty && (
                <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-950 ring-1 ring-white/[0.06] flex items-center justify-center mb-3">
                    <BellOff className="w-5 h-5 text-zinc-600" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-300">You're all caught up</p>
                  <p className="text-xs text-zinc-500 mt-1">Render updates land here while you work.</p>
                </div>
              )}

              {quotaLow && (
                <button
                  onClick={onUpgrade}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#FFCC00]/[0.07] ring-1 ring-[#FFCC00]/20 hover:bg-[#FFCC00]/[0.12] transition-colors text-left mb-1"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/15 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4 text-[#FFCC00]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white">
                      {typeof quotaRemaining === 'number' ? `${quotaRemaining} workflow${quotaRemaining === 1 ? '' : 's'} left` : 'Running low'}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">Upgrade to keep creating without limits.</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#FFCC00] shrink-0" />
                </button>
              )}

              {jobs.map((job) => {
                const Icon = KIND_ICON[job.kind] ?? Activity;
                return (
                  <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-[#FFCC00]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{job.label}</div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                        {job.detail || 'In progress'}
                      </div>
                    </div>
                    <Loader2 className="w-3.5 h-3.5 text-[#FFCC00] animate-spin shrink-0" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsPanel;
