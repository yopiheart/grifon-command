import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Film, Search, Image as ImageIcon, Layers, Activity } from 'lucide-react';
import type { ActiveJob, JobKind } from '../../services/activeJobsService';

const KIND_ICON: Record<JobKind, React.ComponentType<{ className?: string }>> = {
  video: Film,
  storyboard: Layers,
  research: Search,
  image: ImageIcon,
  generic: Activity,
};

interface ActiveJobsPanelProps {
  jobs: ActiveJob[];
  delay?: number;
}

export const ActiveJobsPanel: React.FC<ActiveJobsPanelProps> = ({ jobs, delay = 0 }) => {
  if (jobs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-zinc-900/80 backdrop-blur-xl border border-[#FFCC00]/20 rounded-2xl p-5 lg:p-6 relative overflow-hidden"
    >
      <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 bg-gradient-to-r from-[#FFCC00]/0 via-[#FFCC00]/5 to-[#FFCC00]/0 pointer-events-none"
      />

      <div className="flex items-center gap-2 mb-4 relative z-10">
        <Loader2 className="w-3.5 h-3.5 text-[#FFCC00] animate-spin" />
        <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">
          // ACTIVE · {jobs.length} {jobs.length === 1 ? 'JOB' : 'JOBS'}
        </span>
      </div>

      <div className="space-y-2 relative z-10">
        <AnimatePresence initial={false}>
          {jobs.map(job => {
            const Icon = KIND_ICON[job.kind] ?? Activity;
            const pct = typeof job.progress === 'number' ? Math.max(0, Math.min(1, job.progress)) : null;
            return (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-white/5"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{job.label}</div>
                  {job.detail && (
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5 truncate">
                      {job.detail}
                    </div>
                  )}
                  {pct !== null && (
                    <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        animate={{ width: `${pct * 100}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFD93D]"
                      />
                    </div>
                  )}
                </div>
                <Loader2 className="w-3.5 h-3.5 text-zinc-600 animate-spin flex-shrink-0" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
