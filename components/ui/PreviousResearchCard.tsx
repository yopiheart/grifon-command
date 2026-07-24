import React from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { GoldButton } from './GoldButton';

interface PreviousResearchCardProps {
  subject: string;
  savedAtMs: number;
  /** Secondary action — loads the saved report into the module's results view for review. */
  onLoad: () => void;
  /** Primary action — when provided, renders a gold "→ DIRECTOR AI" button alongside VIEW REPORT for 1-click express navigation. */
  onSendToDirector?: () => void;
  onDismiss?: () => void;
  label?: string;
}

function formatRelativeTime(ms: number): string {
  const diffMs = Date.now() - ms;
  if (diffMs < 0) return 'Just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth} month${diffMonth === 1 ? '' : 's'} ago`;
}

export const PreviousResearchCard: React.FC<PreviousResearchCardProps> = ({
  subject,
  savedAtMs,
  onLoad,
  onSendToDirector,
  onDismiss,
  label = 'LAST RESEARCH',
}) => {
  return (
    <div className="relative bg-gradient-to-r from-[#FFCC00]/10 to-zinc-900/80 border border-[#FFCC00]/30 rounded-xl p-4 mb-6 shadow-[0_0_12px_rgba(255,204,0,0.08)]">
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 text-on-surface-sublabel hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-3 flex-wrap pr-6">
        <Sparkles className="w-5 h-5 text-[#FFCC00] shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-[10px] text-[#FFCC00] font-mono uppercase tracking-widest">
            // {label}
          </p>
          <p className="text-sm text-white font-bold truncate mt-0.5">{subject}</p>
          <p className="text-[10px] text-on-surface-sublabel font-mono uppercase tracking-tighter mt-0.5">
            Saved {formatRelativeTime(savedAtMs)} — skip re-typing, reuse it
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <button
            onClick={onLoad}
            className="px-4 py-2 text-xs font-mono uppercase tracking-widest bg-zinc-950 border border-white/10 text-zinc-300 rounded-xl hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors"
          >
            {onSendToDirector ? 'VIEW REPORT' : 'LOAD'}
          </button>
          {onSendToDirector && (
            <GoldButton
              onClick={onSendToDirector}
              className="px-4 py-2 text-xs tracking-widest flex items-center gap-1.5"
            >
              DIRECTOR AI <ArrowRight className="w-3 h-3" />
            </GoldButton>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviousResearchCard;
