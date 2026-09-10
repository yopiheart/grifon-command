import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DUR, reducedMotion } from './motionTokens';
import { Clock, ArrowRight, Film } from 'lucide-react';
import type { RecentItem, RecentWorkKind } from '../../services/recentWorkService';
import { MODULE_IDENTITY } from '../../config/moduleIdentity';
import { MAT_PLATE } from './materialTokens';

// Icons come from the module registry — this file used to keep its own map,
// which had drifted badly: Director AI showed a film strip here and a
// clapperboard in the rail, Render Bay showed exactly the opposite. One
// module, one icon, everywhere.
const iconFor = (moduleId: string): React.ComponentType<{ className?: string }> =>
  MODULE_IDENTITY[moduleId]?.icon ?? Film;

const KIND_LABEL: Record<RecentWorkKind, string> = {
  visit: 'Opened',
  ad: 'Ad activity',
  research: 'Research',
  storyboard: 'Storyboard',
  image: 'Image',
  script: 'Script',
  caption: 'Caption',
};

const formatRelative = (ts: number): string => {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

interface RecentWorkCardProps {
  items: RecentItem[];
  onResume: (item: RecentItem) => void;
  delay?: number;
}

export const RecentWorkCard: React.FC<RecentWorkCardProps> = ({ items, onResume, delay = 0 }) => {
  const reduce = useReducedMotion();
  const TOP_N = 3;
  const top = items.slice(0, TOP_N);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducedMotion(reduce, { duration: DUR.slow, delay })}
      className={`${MAT_PLATE} rounded-2xl p-4 lg:p-5`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">
            Recently used tools
          </span>
        </div>
        {items.length > TOP_N && (
          <span className="text-[10px] font-mono text-on-surface-sublabel uppercase tracking-widest">
            +{items.length - TOP_N} more
          </span>
        )}
      </div>

      <p className="text-xs text-on-surface-sublabel mb-3">These shortcuts open tools. Your saved ad plan appears separately above.</p>
      {top.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-on-surface-sublabel">Your recently used tools will appear here.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {top.map(item => {
            const Icon = iconFor(item.moduleId);
            const isVisit = item.kind === 'visit';
            return (
              <button
                key={item.id}
                onClick={() => onResume(item)}
                aria-label={`Open ${MODULE_IDENTITY[item.moduleId]?.name ?? item.title}`}
                className="w-full min-h-11 flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white break-words leading-tight">{item.title}</div>
                  <div className="text-xs text-on-surface-sublabel mt-0.5">
                    {isVisit ? `Tool opened · ${formatRelative(item.ts)}` : `${KIND_LABEL[item.kind]} · ${formatRelative(item.ts)}`}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-on-surface-sublabel group-hover:text-[#FFCC00] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
