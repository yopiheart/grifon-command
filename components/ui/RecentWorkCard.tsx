import React from 'react';
import { motion } from 'motion/react';
import { DUR } from './motionTokens';
import { Clock, ArrowRight, Film, Search, Target, Type, Image as ImageIcon, Video, User, Clapperboard, Wand2, Calendar, Scissors, Mic } from 'lucide-react';
import type { RecentItem, RecentWorkKind } from '../../services/recentWorkService';

const MODULE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  creative_director: Film,
  market_research: Search,
  offer_optimizer: Target,
  caption_headline: Type,
  image_editor: ImageIcon,
  cinematic_studio: Video,
  influencer_forge: User,
  generate_video: Clapperboard,
  image_ads: Wand2,
  organic_calendar: Calendar,
  edit_video: Scissors,
  signal_modulator: Mic,
};

const KIND_LABEL: Record<RecentWorkKind, string> = {
  visit: 'Opened',
  ad: 'Ad shipped',
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
  const TOP_N = 3;
  const top = items.slice(0, TOP_N);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.slow, delay }}
      className="bg-zinc-900/70 backdrop-blur-xl rounded-2xl p-4 lg:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            // RECENTLY OPENED
          </span>
        </div>
        {items.length > TOP_N && (
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            +{items.length - TOP_N} more
          </span>
        )}
      </div>

      {top.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-xs text-zinc-500">Open a module above para magsimula.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {top.map(item => {
            const Icon = MODULE_ICON[item.moduleId] ?? Clock;
            const isVisit = item.kind === 'visit';
            return (
              <button
                key={item.id}
                onClick={() => onResume(item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate leading-tight">{item.title}</div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                    {isVisit ? formatRelative(item.ts) : `${KIND_LABEL[item.kind]} · ${formatRelative(item.ts)}`}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-[#FFCC00] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
