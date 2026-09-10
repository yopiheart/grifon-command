import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Loader2, Film, Search, Image as ImageIcon, Layers, Activity } from 'lucide-react';
import { DUR, EASE, reducedMotion } from './motionTokens';
import type { ActiveJob, JobKind } from '../../services/activeJobsService';
import { MAT_PLATE } from './materialTokens';

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
  const reduce = useReducedMotion();
  if (jobs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion(reduce, { duration: DUR.slow, delay })}
      className={`${MAT_PLATE} rounded-2xl p-5 lg:p-6 relative overflow-hidden`}
    >
      {!reduce && <motion.div
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: DUR.ambient.pulse, repeat: Infinity, ease: EASE.inOut }}
        className="absolute inset-0 bg-gradient-to-r from-[#FFCC00]/0 via-[#FFCC00]/5 to-[#FFCC00]/0 pointer-events-none"
      />}

      <div role="status" className="flex items-center gap-2 mb-4 relative z-10">
        <Loader2 className="w-3.5 h-3.5 text-[#FFCC00] motion-safe:animate-spin" />
        <span className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-widest">
          // ACTIVE · {jobs.length} {jobs.length === 1 ? 'JOB' : 'JOBS'}
        </span>
      </div>

      <div className="space-y-2 relative z-10">
        <AnimatePresence initial={false}>
          {jobs.map(job => {
            const Icon = KIND_ICON[job.kind] ?? Activity;
            const pct = typeof job.progress === 'number' && Number.isFinite(job.progress) ? Math.max(0, Math.min(1, job.progress)) : null;
            return (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={reducedMotion(reduce, { duration: DUR.fast })}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white break-words">{job.label}</div>
                  {job.detail && (
                    <div className="text-xs text-on-surface-sublabel mt-0.5 break-words">
                      {job.detail}
                    </div>
                  )}
                  <p className="text-xs text-on-surface-sublabel mt-1">{pct === null ? 'In progress' : `${Math.round(pct * 100)}% reported progress`}</p>
                  {pct !== null ? (
                    <div role="progressbar" aria-label={job.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <motion.div
                        animate={{ width: `${pct * 100}%` }}
                        transition={reducedMotion(reduce, { duration: DUR.slow, ease: EASE.out })}
                        className="h-full bg-gradient-to-r from-[#FFCC00] to-[#FFD93D]"
                      />
                    </div>
                  ) : <div role="progressbar" aria-label={job.label} className="mt-1.5 h-1 rounded-full bg-zinc-800" />}
                </div>
                <Loader2 className="w-3.5 h-3.5 text-on-surface-sublabel motion-safe:animate-spin flex-shrink-0" />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
