import React from 'react';
import { motion } from 'motion/react';
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
  const top = items.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 lg:p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#FFCC00]" />
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            // RECENT WORK
          </span>
        </div>
        {items.length > 4 && (
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            +{items.length - 4} more
          </span>
        )}
      </div>

      {top.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-zinc-500">No recent work yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Open a module above para magsimula.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {top.map(item => {
            const Icon = MODULE_ICON[item.moduleId] ?? Clock;
            return (
              <button
                key={item.id}
                onClick={() => onResume(item)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-white/5 hover:border-[#FFCC00]/30 hover:bg-zinc-950 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FFCC00]/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#FFCC00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{item.title}</div>
                  <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                    {KIND_LABEL[item.kind]} · {formatRelative(item.ts)}
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
