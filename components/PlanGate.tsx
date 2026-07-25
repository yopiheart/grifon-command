import React from 'react';
import { ChevronLeft, Lock, Sparkles } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { planAtLeast, type PlanId } from '../utils/planGate';
import { GoldButton } from './ui/GoldButton';
import { GlassPanel } from './ui/GlassPanel';

type Props = {
  requires: Exclude<PlanId, 'free'>;
  featureName: string;
  onBack?: () => void;
  onUpgrade?: () => void;
  children: React.ReactNode;
};

export const PlanGate: React.FC<Props> = ({
  requires,
  featureName,
  onBack,
  onUpgrade,
  children,
}) => {
  const { plan_id, loading } = useSubscription();

  if (loading) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  if (planAtLeast(plan_id, requires)) {
    return <>{children}</>;
  }

  const requiredLabel = requires.charAt(0).toUpperCase() + requires.slice(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col items-center p-6">
      <div className="w-full max-w-3xl mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] md:text-xs font-mono text-on-surface-sublabel hover:text-white uppercase tracking-widest transition-colors mb-8 mt-4"
          >
            <ChevronLeft className="w-4 h-4" /> COMMAND CENTER
          </button>
        )}

        <GlassPanel className="p-10 md:p-14 text-center">
          <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#FFCC00]" />
          </div>

          <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-3">
            // {requiredLabel.toUpperCase()}_TIER_REQUIRED
          </p>

          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
            {featureName} is a{' '}
            <span className="text-[#FFCC00]">{requiredLabel}</span> feature
          </h2>

          <p className="text-sm text-zinc-400 max-w-md mx-auto mb-8 leading-relaxed">
            You&apos;re currently on the{' '}
            <span className="text-white font-bold uppercase">{plan_id}</span> plan.
            Upgrade to {requiredLabel} to unlock {featureName.toLowerCase()} and
            everything else the tier includes.
          </p>

          {onUpgrade && (
            <GoldButton onClick={onUpgrade} className="px-8 py-3">
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to {requiredLabel}
            </GoldButton>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

export default PlanGate;
