import React, { useEffect } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { GlassPanel } from './ui/GlassPanel';
import { GoldButton } from './ui/GoldButton';

type Props = {
  onContinue: () => void;
};

const BillingSuccess: React.FC<Props> = ({ onContinue }) => {
  const { plan_id, status, loading } = useSubscription();
  const activated = !loading && status === 'active' && plan_id !== 'free';

  useEffect(() => {
    // Strip query string so refresh doesn't re-enter this screen forever.
    if (window.history.replaceState) {
      window.history.replaceState({}, '', '/billing/success');
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center p-6">
      <GlassPanel className="w-full max-w-md p-10 text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-full bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center">
          {activated ? (
            <CheckCircle2 className="w-7 h-7 text-[#FFCC00]" />
          ) : (
            <Loader2 className="w-7 h-7 text-[#FFCC00] animate-spin" />
          )}
        </div>

        <p className="text-[10px] font-mono text-[#FFCC00] uppercase tracking-[0.25em] mb-3">
          // {activated ? 'PAYMENT_RECEIVED' : 'ACTIVATING'}
        </p>

        <h2 className="text-2xl font-black uppercase tracking-tight mb-3">
          {activated ? 'You\u2019re in.' : 'Activating your plan\u2026'}
        </h2>

        <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
          {activated ? (
            <>
              Your <span className="text-white font-bold uppercase">{plan_id}</span>{' '}
              plan is now active. Welcome to Grifon.
            </>
          ) : (
            'This usually takes a few seconds. Hang tight — we\u2019re waiting for PayMongo to confirm.'
          )}
        </p>

        {activated && (
          <GoldButton onClick={onContinue} className="w-full justify-center py-3">
            Enter Command Center
          </GoldButton>
        )}
      </GlassPanel>
    </div>
  );
};

export default BillingSuccess;
